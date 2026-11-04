#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
let checks=0;
const ok=(condition,message)=>{assert.ok(condition,'M56: '+message);checks++;};
const files=[
 'components/SelectionModal.tsx','components/saude/HealthRelationPicker.tsx',
 'components/saude/SeletorCidModal.tsx','components/saude/HealthTimePicker.tsx',
 'components/saude/HealthDateTimePicker.tsx','components/saude/TreatmentRelationOption.tsx',
 'lib/forms/selection-search.ts',
];
const read=p=>fs.readFileSync(p,'utf8');
for(const p of files){const sf=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(!sf.parseDiagnostics.length,'parse '+p);}
const compile=p=>ts.transpileModule(read(p),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
function load(p,stubs={}){const m=new Module(p,module);m.require=id=>{if(id in stubs)return stubs[id];throw Error('Unexpected M56 import '+id+' in '+p)};m._compile(compile(p),p);return m.exports;}
const {normalizeSelectionText,filterSelectionItems}=load('lib/forms/selection-search.ts');
const samples=[{id:'a',text:'Consulta médica hospital central'},{id:'b',text:'Receita SUS'},{id:'c',text:'Outro documento'}];
ok(normalizeSelectionText('  Clínica São José  ')==='clinica sao jose','accent-free normalization is predictable');
ok(filterSelectionItems(samples,'',x=>x.text).map(x=>x.id).join(',')==='a,b,c','empty query preserves all IDs and order');
ok(filterSelectionItems(samples,'CENTRAL médica',x=>x.text).map(x=>x.id).join(',')==='a','unordered query tokens match only real metadata');
ok(filterSelectionItems(samples,'receita   sus',x=>x.text)[0]===samples[1],'multiword search preserves item identity');
ok(filterSelectionItems(samples,'nao existe',x=>x.text).length===0,'no fabricated results');
ok(filterSelectionItems(samples,'SUS',x=>x.text).length===1,'filtered query is scoped');
ok(filterSelectionItems(samples,'',x=>x.text)!==samples,'original list is not mutated');
ok(samples[0].text==='Consulta médica hospital central','original texts are untouched');
const jsx=(type,props)=>({type,props:props??{}});
const frag='Fragment';
const runtime={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:frag}};
const Icon=()=>null;
const icons=new Proxy({},{get:()=>Icon});
const motion=new Proxy({},{get:(_,name)=>'motion.'+String(name)});
const el=(type,props={})=>({type,props});
function walk(tree,pred,arr=[]){if(tree==null||typeof tree==='boolean')return arr;if(Array.isArray(tree)){tree.forEach(x=>walk(x,pred,arr));return arr;}if(typeof tree==='object'){if(pred(tree))arr.push(tree);walk(tree.props?.children,pred,arr);}return arr;}
function makeReact(){const states=[],refs=[];let si=0,ri=0;return {reset(){si=0;ri=0},useState(init){const i=si++;if(!(i in states))states[i]=typeof init==='function'?init():init;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},useRef(init){const i=ri++;if(!(i in refs))refs[i]={current:init};return refs[i];},useMemo:fn=>fn(),useEffect:()=>{},memo:fn=>fn,Children:{toArray:x=>Array.isArray(x)?x:x?[x]:[],forEach:(x,fn)=>(Array.isArray(x)?x:[x]).filter(Boolean).forEach(fn)},isValidElement:x=>Boolean(x&&typeof x==='object'&&'props' in x)};}
const input=()=>null,button=()=>null;
function makeSelector(react){const mods={...runtime,react,'framer-motion':{AnimatePresence:'AnimatePresence',motion},'lucide-react':icons,'@/lib/forms/selection-search':{filterSelectionItems},'@/hooks/useModalGuard':{useModalGuard:()=>{}},'@/lib/haptics':{useHapticFeedback:()=>({trigger:()=>{}})},'./ui/Input':{Input:input},'./ui/Button':{Button:button}};return load('components/SelectionModal.tsx',mods).SelectionModal;}
const r=makeReact(),Selector=makeSelector(r);
const rows=Array.from({length:55},(_,i)=>({id:String(i),name:'Nome '+i}));
const selected=[];let closed=0;
const opts={isOpen:true,onClose:()=>closed++,onSelect:item=>selected.push(item.id),items:rows,title:'Selecionar item',renderItem:x=>el('span',{children:x.name}),getItemId:x=>x.id,getItemLabel:x=>x.name};
function render(){r.reset();return Selector(opts)}
let tree=render();
let itemButtons=walk(tree,n=>n.type==='button'&&typeof n.props?.className==='string'&&n.props.className.includes('rounded-[22px]'));
ok(itemButtons.length===24,'first viewport mounts only 24 of 55 real choices');
let more=walk(tree,n=>n.type==='button'&&n.props?.['aria-label']?.startsWith('Mostrar mais opções'))[0];
ok(Boolean(more)&&more.props['aria-label'].includes('31 restantes'),'reveal button reports actual remaining total');
more.props.onClick();tree=render();itemButtons=walk(tree,n=>n.type==='button'&&n.props?.className?.includes('rounded-[22px]'));
ok(itemButtons.length===48,'first reveal adds one page of 24');
more=walk(tree,n=>n.type==='button'&&n.props?.['aria-label']?.startsWith('Mostrar mais opções'))[0];more.props.onClick();tree=render();
itemButtons=walk(tree,n=>n.type==='button'&&n.props?.className?.includes('rounded-[22px]'));
ok(itemButtons.length===55,'second reveal eventually exposes every real option');
ok(!walk(tree,n=>n.type==='button'&&n.props?.['aria-label']?.startsWith('Mostrar mais opções')).length,'reveal control disappears when complete');
itemButtons[54].props.onClick();
ok(selected.join()==='54'&&closed===1,'selection delegates ID and closes exactly once');
const searchField=walk(tree,n=>n.type===input&&n.props?.placeholder==='Buscar...')[0];
ok(searchField&&searchField.props['aria-label']==='Buscar em Selecionar item','search field has named accessible label');
searchField.props.onChange({target:{value:'nome 54'}});tree=render();
itemButtons=walk(tree,n=>n.type==='button'&&n.props?.className?.includes('rounded-[22px]'));
ok(itemButtons.length===1,'search filters real options, even after pagination');
let clear=walk(tree,n=>n.type==='button'&&n.props?.['aria-label']==='Limpar busca')[0];
ok(Boolean(clear),'search exposes an explicit clear action');
clear.props.onClick();tree=render();
ok(walk(tree,n=>n.type==='button'&&n.props?.className?.includes('rounded-[22px]')).length>0,'clearing restores original choices');
const rx=makeReact(),Quick=makeSelector(rx);let attempts=0,quickClosed=0;let success=[];
const qopts={...opts,items:[],enableQuickCreate:true,onQuickCreate:async()=>{attempts++;throw Error('not saved');},onSelect:obj=>success.push(obj),onClose:()=>quickClosed++};
function qrender(){rx.reset();return Quick(qopts)}
let q=qrender();let create=walk(q,n=>n.type==='button'&&n.props?.onClick&&n.props?.children?.props?.children?.includes?.('Novo'))[0];
// The empty-state button calls the exact same handleCreateNew as the footer.
create=walk(q,n=>n.type==='button'&&n.props?.className?.includes('bg-ice/12'))[0];
ok(Boolean(create),'empty state exposes quick-create entry');
create.props.onClick();q=qrender();
let quickName=walk(q,n=>n.type===input&&n.props?.placeholder==='Digite o nome completo...')[0];
ok(Boolean(quickName),'quick-create form remains interactive');
quickName.props.onChange({target:{value:'Teste de vínculo'}});q=qrender();
let form=walk(q,n=>n.type==='form')[0];
(async()=>{
 await form.props.onSubmit({preventDefault(){}});q=qrender();
 quickName=walk(q,n=>n.type===input&&n.props?.placeholder==='Digite o nome completo...')[0];
 ok(attempts===1&&quickClosed===0,'rejected quick-save leaves dialog open and does not claim success');
 ok(Boolean(quickName.props.error)&&quickName.props.value==='Teste de vínculo','save failure is visible and keeps entered text');
 // Retry after an error must be possible.
 qopts.onQuickCreate=async()=>{attempts++;return {id:'created'};};
 q=qrender(); form=walk(q,n=>n.type==='form')[0];await form.props.onSubmit({preventDefault(){}});
 ok(attempts===2&&quickClosed===1&&success[0].id==='created','retry selects real result and closes once');
 // The ref lock stops synchronous double submissions while the save is outstanding.
 const pendingReact=makeReact(),Pending=makeSelector(pendingReact);let pendingCount=0,release;
 const pp={...qopts,onClose:()=>{},onQuickCreate:()=>{pendingCount++;return new Promise(resolve=>{release=resolve;});}};
 function prender(){pendingReact.reset();return Pending(pp)}
 let p=prender();walk(p,n=>n.type==='button'&&n.props?.className?.includes('bg-ice/12'))[0].props.onClick();
 p=prender();walk(p,n=>n.type===input&&n.props?.placeholder==='Digite o nome completo...')[0].props.onChange({target:{value:'Novo'}});
 p=prender();const submit=walk(p,n=>n.type==='form')[0].props.onSubmit;
 const job1=submit({preventDefault(){}}),job2=submit({preventDefault(){}});
 ok(pendingCount===1,'double tap cannot create the same relation twice');
 release({id:'new'});await Promise.all([job1,job2]);
 // Inspect exported JSX of related pickers without database access.
 const relation=read('components/saude/HealthRelationPicker.tsx');
 ok(relation.includes('if (value === undefined) setLocalValue(defaultValue)'),'async defaults reconcile for uncontrolled edit forms');
 ok(relation.includes('data-care-network="bidirectional"'),'bidirectional care metadata contract preserved');
 ok(relation.includes('new Map<string, Medicamento>'),'large medication picker uses a scoped lookup');
 ok(!relation.includes('onKeyDown={event => {'),'relation picker delegates keyboard trap to shared guard');
 ok(relation.includes('item => !item.disabled'),'disabled relations cannot be selected');
 const cid=read('components/saude/SeletorCidModal.tsx');
 ok(cid.includes('Lista de exemplo; não representa um catálogo completo de CID.'),'CID example list is explicitly scoped');
 ok(cid.includes('filterSelectionItems(MOCK_CIDS, busca'),'CID search uses same normalized match');
 ok(cid.includes('Nenhum código encontrado'),'CID reports empty results without inventing matches');
 const date=read('components/saude/HealthDateTimePicker.tsx');
 ok(date.includes('disabled={!date} clearable={false}'),'datetime cannot silently clear the selected date via time reset');
 const hour=read('components/saude/HealthTimePicker.tsx');
 ok(hour.includes('disabled={disabled}')&&hour.includes('clearable && value'),'single time picker remains clearable when allowed');
 const treatment=read('components/saude/TreatmentRelationOption.tsx');
 ok(treatment.includes('break-words')&&!treatment.includes('truncate'),'long treatment identity and condition are not truncated');
 for(const [file,term] of [['components/SelectionModal.tsx','useModalGuard'],['components/saude/HealthRelationPicker.tsx','buildRelationMetadata'],['components/saude/HealthDateTimePicker.tsx','CustomDatePicker'],['components/saude/HealthTimePicker.tsx','HealthRelationPicker']])ok(read(file).includes(term),'existing authority and integration retained: '+file);
 const gate=read('scripts/test-v63-release-gate.mjs');
 ok(gate.includes('test-vault-m56-form-selection.cjs'),'M56 registered in release gate');
 ok(gate.includes('test-vault-m55-progressive-ux.cjs')&&gate.includes('test-vault-m54-dialog-guard.cjs'),'previous M55/M54 gates still required');
 const unsafe=[...files.map(read)].join('\n');
 ok(!/(?:\bdb\.[a-z]+\.put\(|\bsupabase\.from\(|\bfetch\(|\bupdateMedicamento\()/.test(unsafe),'selection presentation never persists clinical data');
 console.log('M56 FORM 360: '+checks+' verificações aprovadas.');
})().catch(error=>{console.error(error);process.exitCode=1});
