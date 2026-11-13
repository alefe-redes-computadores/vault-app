'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; };
const routes = [];
const haptics = [];
const ref = { current: { open: true } };
const jsx = { jsx: (type, props) => ({ type, props: props || {} }), jsxs: (type, props) => ({ type, props: props || {} }), Fragment: 'fragment' };
const icons = new Proxy({}, { get: (_, name) => `icon-${String(name)}` });
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
  assert.equal(result.diagnostics.length, 0, file);
  const mod = new Module(path.resolve(file), module);
  mod.require = id => {
    if (id === 'react') return { memo: f => f, useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useEffect: () => {} };
    if (id === 'react/jsx-runtime') return jsx;
    if (id === 'lucide-react') return icons;
    if (id === 'next/navigation') return { useRouter: () => ({ push: href => routes.push(href) }) };
    if (id === '@/lib/haptics') return { useHapticFeedback: () => ({ trigger: kind => haptics.push(kind) }) };
    if (id === '@/hooks/useDismissibleDetails') return { useDismissibleDetails: () => ref };
    if (id === '@/components/saude/ClinicalDisclosure') return { ClinicalDisclosure: props => jsx.jsx('section', { ...props, children: props.defaultOpen ? (typeof props.children === 'function' ? props.children() : props.children) : null }) };
    if (id.startsWith('@/')) {
      const local = id.slice(2);
      return load(fs.existsSync(`${local}.tsx`) ? `${local}.tsx` : `${local}.ts`);
    }
    return require(id);
  };
  mod._compile(result.outputText, path.resolve(file));
  cache.set(file, mod.exports);
  return mod.exports;
}
function expand(value) {
  if (Array.isArray(value)) return value.map(expand);
  if (!value || typeof value !== 'object') return value;
  if (typeof value.type === 'function') return expand(value.type(value.props));
  return { ...value, props: { ...value.props, children: expand(value.props.children) } };
}
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === 'object' ? [value, ...nodes(value.props.children)] : [];
const text = value => Array.isArray(value) ? value.map(text).join(' ') : value && typeof value === 'object' ? text(value.props.children) : value == null ? '' : String(value);
const { HomeCommandCenter } = load('components/home/HomeCommandCenter.tsx');
const center = expand(HomeCommandCenter({ gastoMes: 20, diferencaMes: -2, totalRede: 3 }));
const primary = nodes(center).filter(n => n.type === 'button' && /^(Medicamentos|Retiradas de medicamentos|Fornecimento SUS e documentos)/.test(text(n).trim()));
check(primary.length === 3, 'Operational routes stay mounted and navigable in their documented sections');
primary.forEach(n => n.props.onClick());
assert.deepEqual(routes, ['/saude/medicamentos', '/saude/retiradas', '/saude/fornecimento']); checks++;
check(haptics.length === 3, 'Every operational route retains haptic feedback');
check(nodes(center).some(n => n.props.id === 'home-organizacao'), 'Organization anchor preserved');
const { HomeClinicalAreaTile } = load('components/home/HomeClinicalAreaTile.tsx');
const tile = HomeClinicalAreaTile({ label: 'Consulta', description: 'Agenda', path: '/saude/consultas', Icon: 'icon-calendar', tone: 'border-violet-400/20 bg-violet-400/[0.06] text-violet-300', onNavigate: href => routes.push(href) });
check(tile.props.className.includes('bg-violet-400/[0.06]') && tile.props.className.includes('border-violet-400/20'), 'M132 keeps both canonical area background and border without recoloring the icon');
check(nodes(tile).some(n => n.props.className?.includes('text-violet-300')), 'Identity color remains on the icon');
check(!nodes(tile).some(n => n.props.className?.includes('border-current')), 'No inherited white icon outline');
tile.props.onClick(); check(routes.at(-1) === '/saude/consultas', 'Card preserves exact destination');
const { HomeDailyHero } = load('components/home/HomeDailyHero.tsx');
for (const [scheduled, completed, progress, expected] of [[0,0,100,0],[5,2,40,40],[5,9,200,100],[5,0,NaN,0]]) {
  let opened = 0;
  const hero = HomeDailyHero({ eyebrow:'Ação agora', title:'Doses para revisar', description:'Histórico registrado', color:'#ff6b57', scheduled, completed, progress, ctaLabel:'Revisar doses', onOpen:()=>opened++ });
  const bar = nodes(hero).find(n => n.props.role === 'progressbar');
  check(bar.props['aria-valuenow'] === expected, 'Progress preserves bounded canonical input');
  check(text(hero).includes(scheduled ? `${Math.min(completed,scheduled)}/${scheduled}` : 'Sem horários'), 'Count never asserts false completion');
  const action = nodes(hero).find(n => n.type === 'button'); action.props.onClick();
  check(opened === 1 && action.props['aria-label'].includes('Revisar doses'), 'Hero uses explicit review action and delegates without writing');
}
const { HomeAttentionRail } = load('components/home/HomeAttentionRail.tsx');
const alerts = [{id:'one'}, {id:'two'}, {id:'three'}];
let toggled = 0;
for (const expanded of [false,true]) {
  const tree = HomeAttentionRail({ alerts, expanded, description:'Prioridades', onToggle:()=>toggled++, renderAlert: a => jsx.jsx('article',{children:a.id}) });
  check(nodes(tree).filter(n=>n.type==='article').length === (expanded?3:1), 'Alert order and progressive disclosure preserved');
  const toggle = nodes(tree).find(n=>n.type==='button'); toggle.props.onClick();
  check(toggle.props['aria-expanded'] === expanded, 'Alert toggle exposes current state');
}
check(toggled===2, 'Expand and collapse delegate to Home');
const { HomeSectionNav } = load('components/home/HomeSectionNav.tsx');
const oldDocument=global.document, oldWindow=global.window;
let scrolled=0;
try {
  global.document={getElementById:()=>({scrollIntoView:()=>scrolled++})};
  global.window={requestAnimationFrame:f=>f(),matchMedia:()=>({matches:true})};
  const nav=HomeSectionNav({hasAttention:true,hasBrain:true});
  check(nodes(nav).find(n=>n.type==='summary').props.className.includes('min-h-11'), 'Compact Areas retains 44px target');
  nodes(nav).find(n=>n.type==='button').props.onClick();
  check(scrolled===1&&!ref.current.open, 'Areas closes before scrolling under reduced motion');
  check(nodes(HomeSectionNav({hasAttention:false,hasBrain:false})).filter(n=>n.type==='button').length===2, 'Unavailable sections do not produce broken shortcuts');
} finally { global.document=oldDocument;global.window=oldWindow; }
const home=fs.readFileSync('app/page.tsx','utf8');
check(home.indexOf('<HomeSectionNav') < home.indexOf('<section className="mx-auto max-w-3xl'), 'Areas lives in the header before the body');
check(home.includes('"Revisar doses"')&&home.includes('setModalPendenciasAberto(true)'), 'Pending action still opens canonical modal');
check(!home.includes('scale-[0.8]')&&!home.includes('zoom:'), 'No artificial global scaling introduced');
console.log(`HOME HARMONY: ${checks} behavior, routes, accessibility and clinical presentation checks passed.`);
