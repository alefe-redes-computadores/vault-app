'use strict';
// Actual source, synthetic scoped treatment records. This test does not claim native or production sync.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let context={scope:{userId:'account',personId:'person'},records:[]},n=0;
const react={createContext:()=>({Provider:'Provider'}),useContext:()=>context,useMemo:fn=>fn(),useState:()=>{throw Error('unexpected editor invocation')},useRef:()=>{throw Error('unexpected editor invocation')}};
const icons=new Proxy({}, {get:(o,k)=>o[k]??(o[k]=function Icon(){})});
const jsx=(type,props)=>({type,props});const cache=new Map();
function load(p){if(cache.has(p))return cache.get(p);const out=ts.transpileModule(read(p),{fileName:p,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});assert.equal(out.diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,p);const m={exports:{}};new Function('require','module','exports',out.outputText)(id=>{
 if(id==='react')return react;if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};if(id==='lucide-react')return icons;
 if(id==='dexie-react-hooks'||id==='@/hooks/useAuth'||id==='@/hooks/useActivePersonId'||id==='@/lib/db')return {};
 if(id==='@/lib/repositories/tratamentos')return {tratamentosRepository:{}};
 if(id.startsWith('@/lib/'))return load(id.slice(2)+'.ts');if(id.startsWith('.'))return load(path.normalize(path.join(path.dirname(p),id+'.ts')));throw Error('Unexpected import '+id);
},m,m.exports);cache.set(p,m.exports);return m.exports;}
const authority=load('lib/health-profile/treatment-preferences-r03.ts'),ui=load('components/saude/TreatmentIdentityR03.tsx');
const a={id:'a',nome:'Mesmo nome',user_id:'account',person_id:'person',cor:'#112233',visual_icon:'brain',visual_icon_revision:2,visual_icon_operation_id:'10000000-0000-4000-8000-000000000001',visual_icon_updated_at:'2026-11-26T12:00:00Z'};
const b={...a,id:'b',cor:'#445566',visual_icon:'heart'};const other={...a,id:'other',person_id:'other',cor:'#CC0000',visual_icon:'pill'};
const foreign={...a,id:'foreign',user_id:'foreign',cor:'#000000'};
const set=records=>context={scope:{userId:'account',personId:'person'},records};const color=e=>ui.useTreatmentIdentityColorResolverR03()(e);const icon=e=>ui.TreatmentIdentityIconR03({entity:e});
function check(label,fn){fn();console.log('H05_H06_PASS',++n,label)}
set([a,b,other,foreign]);
check('same-name IDs resolve independently, projected colors are ignored',()=>{assert.equal(color({id:'a',cor:'#FFFFFF'}),'#112233');assert.equal(color({id:'b'}),'#445566');assert.equal(icon({id:'a'}).props['data-vault-treatment-icon'],'brain');assert.equal(icon({id:'b'}).props['data-vault-treatment-icon'],'heart');});
check('foreign person/account, absent ID and name-only fail closed',()=>{for(const entity of [{id:'other'},{id:'foreign'},{id:'a',person_id:'other'},{id:'a',user_id:'foreign'},{nome:'Mesmo nome',cor:'#FF0000'},{id:'missing',cor:'#FF0000'}]){assert.equal(color(entity),null);assert.equal(icon(entity).props['data-vault-treatment-icon'],'unassigned');assert.equal(icon(entity).props['data-vault-treatment-id'],undefined);}});
check('duplicate scoped ID fails closed',()=>{set([a,{...a,cor:'#FF0000'}]);assert.equal(color({id:'a'}),null);assert.equal(icon({id:'a'}).props['data-vault-treatment-icon'],'unassigned');});
check('pending icon and current color update from same scoped record without name change',()=>{const intent=authority.makeVisualIntentR03(a,'moon',2,'10000000-0000-4000-8000-000000000002');const next={...a,cor:'#16A34A',visual_identity_pending:intent};set([next,b]);assert.equal(color(a),'#16A34A');const rendered=icon(a);assert.equal(rendered.props['data-vault-treatment-icon'],'moon');assert.equal(rendered.props['data-vault-treatment-pending'],'pending');assert.equal(rendered.props.style.color,'#16A34A');assert.equal(color(b),'#445566');});
check('confirmed new revision and stale projection cannot change displayed identity',()=>{const next={...a,cor:'#16A34A',visual_icon:'unassigned',visual_icon_expanded:'moon',visual_icon_revision:3,visual_icon_operation_id:'10000000-0000-4000-8000-000000000002',visual_icon_updated_at:'2026-11-27T12:00:00Z'};set([next,b]);assert.equal(color(a),'#16A34A');assert.equal(icon(a).props['data-vault-treatment-icon'],'moon');assert.equal(icon(a).props['data-vault-treatment-revision'],3);});
check('all changed current color consumers use same authority',()=>{for(const p of ['app/page.tsx','app/saude/medicamentos/page.tsx','app/saude/tratamentos/page.tsx','app/saude/tratamentos/detalhes/page.tsx','components/saude/TreatmentRelationOption.tsx','components/saude/MedicationSheet360R3.tsx'])assert(read(p).includes('useTreatmentIdentityColorResolverR03'),p);assert(read('app/page.tsx').includes('entity={primaryMedicationCareOpportunity.treatmentId?{id:primaryMedicationCareOpportunity.treatmentId}:null}'));assert(!read('app/page.tsx').includes('const linked=tratamentos.find((t:any)=>Boolean(match)'));});
check('H05 opt-in only; all real links and optional counters retained',()=>{const detail=read('app/saude/tratamentos/detalhes/page.tsx'),nav=read('components/saude/ClinicalSectionNav.tsx'),css=read('app/globals.css');for(const id of ['visao','medicamentos','rede','linha','financeiro'])assert(detail.includes(`id:"tratamento-${id}"`));assert(detail.includes('priorityCount={5} alignTreatmentTabs'));assert(detail.includes('data-vault-h05-stats'));assert(nav.includes('alignTreatmentTabs&&compactFive?item.id:undefined'));assert(nav.includes('item.badge!==undefined&&item.badge!==null?'));assert(css.includes('grid-template-rows: 24px minmax(2.4em, auto) 20px'));assert(css.includes('[data-vault-h05-stats] > div'));});
check('H06 canonical P7 Home uses both explicit relation directions with owner scope',()=>{
 const links=load('lib/health-intelligence/medication-treatment-links-p7.ts');
 const m={id:'med',user_id:'account',person_id:'person',tratamento_ids:['b','foreign','other']};
 const m2={id:'med',user_id:'account',person_id:'other',tratamento_ids:[]};
 const missing={id:'med',user_id:'account',tratamento_ids:['a']};
 const records=[{...a,medicamento_ids:['med']},b,{...foreign,medicamento_ids:['med']},{...other,medicamento_ids:['med']}];
 const out=links.indexMedicationCareLinksP7([m,m2,missing],records);
 assert.deepEqual(out.get(m).map(x=>x.id),['a','b']);assert.deepEqual(out.get(m2).map(x=>x.id),['other']);assert.equal(out.has(missing),false);
 const opportunities=read('lib/health-intelligence/medication-care-opportunities.ts');
 assert(opportunities.includes('indexMedicationCareLinksP7(medicamentos, tratamentos)'));
 assert(opportunities.includes('treatmentLinksByMedication.get(medicamento) ?? []'));
 assert(opportunities.includes('indexed.get(JSON.stringify([medicamento.user_id, medicamento.person_id, id]))'));
 assert(opportunities.includes('indexed.delete(key); ambiguous.add(key)'));
 assert(opportunities.includes('entry.order < active.order'));
});
check('H05 narrow metrics center wrapped labels, preserving equal tracks',()=>{const css=read('app/globals.css');assert(/\[data-vault-h05-stats\] > div > div:first-child > span \{[^}]*align-self: center;/.test(css));assert(css.includes('[data-vault-h05-stats] > div { padding-inline: 6px; }'));});
console.log('H05_H06_DIRECTED_PASS='+n);
