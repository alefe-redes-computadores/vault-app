#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
let checks = 0;
const ok = (condition, description) => { assert.ok(condition, 'M49: ' + description); checks++; console.log('✓ M49 ' + description); };
const read = file => fs.readFileSync(file, 'utf8');
const paths = [
 'components/list/ListSearch.tsx', 'components/list/ListFilters.tsx', 'components/list/ListSort.tsx',
 'components/home/HomeSectionNav.tsx', 'components/saude/MedicationListActiveFilter.tsx',
 'components/saude/ClinicalSectionNav.tsx', 'components/hoje/TodayBatchAction.tsx',
 'components/hoje/TodayRemindersPanel.tsx', 'components/hoje/TodayDateNavigation.tsx',
 'lib/navigation/safe-action-href.ts',
];
for(const file of paths){
 const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(parsed.parseDiagnostics.length===0,'TypeScript parser '+file);
}
const [search,filters,sort,home,active,clinical,batch,reminders,date,safety]=paths.map(read);
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('scripts/test-vault-m49-list-navigation.cjs')&&gate.includes('scripts/test-vault-m48-mobile-stability.cjs'),'release gate includes M49 and preserves M48');
ok(search.includes('if (!expanded) {')&&search.includes('aria-label="Abrir busca"')&&search.includes('>Buscar</span>')&&search.includes('Ativo · {value}'),'collapsed search shows retained active filter');
ok(search.includes('requestAnimationFrame')&&search.includes('cancelAnimationFrame'),'search focus no longer depends on arbitrary timer');
ok(search.includes('focusOnExpand.current')&&search.includes('aria-label={placeholder}'),'search retains intentional focus and accessible name');
ok(search.includes('if (value && showClear) onChange(""); else setExpanded(false);'),'Escape either clears or collapses per caller policy');
ok(search.includes('inputRef.current?.focus({ preventScroll: true })'),'clear preserves stable keyboard focus');
ok(filters.includes('aria-controls={open ? panelId : undefined}')&&filters.includes('id={panelId}'),'list filter trigger references its visible dialog');
ok(filters.includes('document.body.style.overflow = previous')&&filters.includes('document.removeEventListener("keydown", onEscape)'),'list filter releases body lock and listeners');
ok(filters.includes('const focusable = Array.from')&&filters.includes('event.shiftKey'),'filter dialog maintains keyboard focus loop');
ok(filters.includes('overscroll-contain')&&filters.includes('[&_button]:min-h-11'),'filter sheet can scroll and has large touch targets');
ok(sort.includes('"ArrowDown", "ArrowUp", "Home", "End"')&&sort.includes('choices[index]?.focus'),'sort is navigable by arrow keys and Home/End');
ok(sort.includes('const index = event.key === "Home" ? 0')&&sort.includes('% choices.length'),'sort keyboard navigation wraps around');
ok(sort.includes('if (disabled) setIsOpen(false)'),'disabled sort dialog cannot remain active');
ok(sort.includes('aria-controls={isOpen ? dialogId : undefined}')&&sort.includes('id={dialogId} role="dialog"'),'sort trigger associates with its dialog');
ok(sort.includes('document.body.style.overflow = previous')&&sort.includes('window.cancelAnimationFrame(frame)'),'sort cleanup preserves scroll and animation lifecycle');
ok(home.includes('useDismissibleDetails()')&&home.includes('detailsRef.current.open = false'),'Home navigation collapses after selection');
ok(home.includes('document.getElementById(id)')&&home.includes('target.scrollIntoView'),'Home destinations require actual rendered sections');
ok(home.includes('window.matchMedia?.')&&home.includes('min-h-11'),'Home respects reduced motion and 44px touch targets');
ok(active.includes('line-clamp-2')&&active.includes('break-words'),'medicine filter identity not cut to one line');
ok(active.includes('view.countLabel')&&active.includes('onClear'),'medicine filter keeps count and reset');
ok(clinical.includes('aria-label={item.badge!==undefined')&&clinical.includes('aria-current={active?"location":undefined}'),'clinical navigation announces destination counts and active section');
ok(clinical.includes('dispatchEvent(new Event("vault:reveal-clinical-section"))'),'clinical deep-link reveal contract retained');
ok(batch.includes('flex flex-wrap')&&batch.includes('w-full shrink-0')&&batch.includes('sm:w-auto'),'batch review fits narrow mobile widths');
ok(batch.includes('disabled={disabled}')&&batch.includes('aria-busy={processing}'),'batch operation/processing authority unchanged');
ok(reminders.includes('disabled={!isSafeLocalActionHref(reminder.target_route)}'),'malformed reminder destinations become unavailable');
ok(reminders.includes('onNavigate(reminder.target_route)')&&reminders.includes('registro manual'),'valid reminder destinations preserve original navigation and manual status');
ok(date.includes('type="date"')&&date.includes('aria-current={isHoje ? "date" : undefined}'),'native date input and selected day accessibility retained');

const compiled=(file,jsx=ts.JsxEmit.None)=>ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx}}).outputText;
const load=(file,mocks={},jsx=ts.JsxEmit.ReactJSX)=>{
 const mod=new Module(file,module);
 mod.require=id=>{if(Object.prototype.hasOwnProperty.call(mocks,id))return mocks[id];throw Error('M49 unexpected import '+id+' from '+file);};
 mod._compile(compiled(file,jsx),file);return mod.exports;
};
const {isSafeLocalActionHref:safe}=load('lib/navigation/safe-action-href.ts',{},ts.JsxEmit.None);
for(const path of ['/','/hoje','/hoje?focus=doses&status=pendentes','/saude/medicamentos/detalhes?id=m1','/saude/retiradas#pendente']) ok(safe(path),'safe reminder route '+path);
for(const path of ['https://evil.invalid','javascript:alert(1)','//evil.invalid/path','/\\evil.invalid','/%2Fevil.invalid','/%5cevil','/hoje\u0000x','/hoje\nxy','/%NOTHEX']) ok(!safe(path),'unsafe reminder route blocked '+JSON.stringify(path));
ok(!safe(null)&&!safe(undefined)&&!safe('')&&!safe('/a'.repeat(1100)),'invalid/missing/oversized destinations fail closed');
const jsx=(type,props)=>({type,props:props||{}});
const icons=new Proxy({}, {get(){return ()=>null;}});
const runtime={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'lucide-react':icons};
const flatten=(tree,list=[])=>{
 if(Array.isArray(tree)){for(const item of tree)flatten(item,list);return list;}
 if(tree&&typeof tree==='object'&&'type' in tree){list.push(tree);flatten(tree.props?.children,list);}
 return list;
};
const Reminder=load('components/hoje/TodayRemindersPanel.tsx',{
 ...runtime,'@/lib/navigation/safe-action-href':{isSafeLocalActionHref:safe}
}).TodayRemindersPanel;
const visited=[];
const rendered=Reminder({reminders:[{id:'ok',title:'Consulta',time:'09:00',target_route:'/saude/consultas'},{id:'bad',title:'Inseguro',time:'10:00',target_route:'javascript:alert(1)'}],onNavigate:v=>visited.push(v)});
const buttons=flatten(rendered).filter(x=>x.type==='button');
ok(buttons.length===2&&buttons[0].props.disabled===false,'valid reminder remains tappable');
ok(buttons[1].props.disabled===true,'unsafe reminder visibly disabled');
buttons.forEach(b=>b.props.onClick());
ok(visited.length===1&&visited[0]==='/saude/consultas','only valid original route reaches navigation');

// Exercise actual ListSearch in a simulated committed hook sequence: external
// value is retained but the presentation may collapse when clear is disabled.
let slots=[],idx=0,query='SOS';
const fakeReact={
 useState(initial){const n=idx++;if(!(n in slots)) slots[n]=typeof initial==='function'?initial():initial;return [slots[n],update=>{slots[n]=typeof update==='function'?update(slots[n]):update;}];},
 useRef(initial){const n=idx++;if(!(n in slots))slots[n]={current:initial};return slots[n]},
 useEffect(){},useId(){return 'm49-search-id';},
};
const Search=load('components/list/ListSearch.tsx',{
 ...runtime,react:fakeReact,'@/components/ui/Input':{Input:'input'}
}).ListSearch;
const renderSearch=()=>{idx=0;return Search({value:query,onChange:value=>{query=value;},showClear:false,placeholder:'Buscar medicamento'});};
let output=renderSearch();let close=flatten(output).find(x=>x.props?.['aria-label']==='Fechar busca');
ok(Boolean(close),'search offers a close action even when caller disables clearing');
close.props.onClick();output=renderSearch();
ok(flatten(output).some(x=>x.props?.['aria-label']==='Abrir busca'),'search can collapse with retained nonempty query');
ok(query==='SOS','closing filter presentation does not silently clear search value');

// Render HomeSectionNav without DOM or real hooks: the active disclosure
// must close before navigation, and an absent target must not scroll.
const disclosure={current:{open:true}},scrolled=[];
const Home=load('components/home/HomeSectionNav.tsx',{
 ...runtime,'@/hooks/useDismissibleDetails':{useDismissibleDetails:()=>disclosure}
}).HomeSectionNav;
const oldDocument=global.document,oldWindow=global.window;
try {
 global.document={getElementById:id=>id==='home-agora'?{scrollIntoView:opts=>scrolled.push({id,opts})}:null};
 global.window={requestAnimationFrame:fn=>{fn();return 1},matchMedia:()=>({matches:false})};
 const tree=Home({hasAttention:true,hasBrain:true});
 const links=flatten(tree).filter(x=>x.type==='button');
 links[0].props.onClick();
 ok(disclosure.current.open===false&&scrolled[0].id==='home-agora','Home closes nav before scrolling to rendered section');
 disclosure.current.open=true;
 links[2].props.onClick();
 ok(disclosure.current.open===true&&scrolled.length===1,'absent Home destination never changes navigation state');
} finally {global.document=oldDocument;global.window=oldWindow;}
console.log(`VAULT M49: ${checks} checks passed; no clinical writes or invented speed benchmark`);
