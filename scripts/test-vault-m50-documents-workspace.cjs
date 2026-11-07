#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ts=require('typescript');
const Module=require('node:module');
const read=f=>fs.readFileSync(f,'utf8');
const files=[
  'components/DocumentTypeSelector.tsx',
  'components/saude/MedicationAdditionalFormatsSheet.tsx',
  'components/saude/ClinicalDisclosure.tsx',
  'components/saude/ClinicalCollectionGroup.tsx',
  'components/saude/ClinicalListSummary.tsx',
  'components/list/ListPageHeader.tsx',
  'components/galeria/DocumentViewer.tsx',
  'components/DocumentList.tsx',
  'lib/documents/document-type-search.ts',
];
let count=0;
function ok(value,description){assert.ok(value,'M50 '+description);console.log('✓ M50 '+description);count++;}
for(const file of files){
  const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(ast.parseDiagnostics.length===0,`TSX/TS parse ${file}`);
}
const [selector,formats,disclosure,collection,summary,header,viewer,list,search]=files.map(read);
ok(selector.includes('filterDocumentTypeOptions(DOCUMENT_TYPES, search)')&&selector.includes('maxLength={80}')&&selector.includes('visibleTypes.map((type)'), 'document search is bounded and only filters the visible catalog');
ok(selector.includes('onChange(type.id);\n                      onClose();'), 'selecting a type still delegates to the original form, then closes');
ok(selector.includes('aria-modal="true"')&&selector.includes('role="dialog"')&&selector.includes('aria-labelledby="vault-document-type-title"'), 'document selector remains an accessible modal');
ok(selector.includes('document.body.style.overflow = "hidden"')&&selector.includes('document.body.style.overflow = previousOverflow'), 'document selector restores scroll lock');
ok(selector.includes('event.key === "Escape"')&&selector.includes('event.shiftKey && document.activeElement === first'), 'document selector keyboard Escape and Tab trapped');
ok(selector.includes('previousOverflow')&&selector.includes('if (prior?.isConnected) prior.focus({ preventScroll: true })'), 'document selector restores user focus');
ok(selector.includes('overflow-y-auto overscroll-contain')&&selector.includes('safe-area-inset-bottom')&&selector.includes('92dvh'), 'document selector fits keyboard and small displays');
ok(selector.includes('Nenhum tipo encontrado.')&&selector.includes('aria-pressed={isSelected}'), 'document selector announces empty results and selection');
const expectedTypes=['rg','cpf','cnh','certificado','receita','prontuario','documento_sus','lme','laudo','encaminhamento','consulta','cirurgia','outro'];
const parsedIds=[...selector.matchAll(/\{ id: "([a-z_]+)", label:/g)].map(m=>m[1]);
assert.deepEqual(parsedIds,expectedTypes);ok(true,'all 13 original document categories and order preserved');
ok(formats.includes('document.body.style.overflow = "hidden"')&&formats.includes('document.body.style.overflow = previousOverflow'), 'additional medication formats restore body overflow');
ok(formats.includes('event.key === "Escape"')&&formats.includes('event.shiftKey && document.activeElement === first'), 'medication formats keyboard Escape and Tab guarded');
ok(formats.includes('onSelect(item.id); onClose();')&&formats.includes('MEDICATION_ADDITIONAL_FORMATS.map'), 'medication formats keep existing catalog and form authority');
ok(formats.includes('max-h-[min(88dvh,700px)]')&&formats.includes('safe-area-inset-bottom'), 'medication formats adapt to device viewport');
ok(disclosure.includes('if (hash === id) setOpen(true)')&&disclosure.includes('"hashchange"')&&disclosure.includes('vault:reveal-clinical-section'), 'clinical disclosure deep-link and explicit section reveal retained');
ok(disclosure.includes('typeof children === "function" ? children() : children')&&disclosure.includes('{open && ('), 'clinical disclosure content remains lazy');
ok(disclosure.includes('aria-expanded={open}')&&disclosure.includes('aria-controls={`${id}-panel`}')&&disclosure.includes('aria-describedby={descriptionId}'), 'clinical disclosure exposes its controls and summary');
ok(disclosure.includes('role="region" aria-labelledby={headingId}'), 'clinical disclosure panel labelled for screen readers');
ok(collection.includes('if(count===0)return null')&&collection.includes('forceOpen||open'), 'empty groups hidden and forced-open groups preserved');
ok(collection.includes('vault:reveal-clinical-section')&&collection.includes('hashchange'), 'clinical list groups reveal from navigation and deep links');
ok(collection.includes('typeof children==="function"?children(progressiveList?shown:undefined):children')&&collection.includes('visible?<div')&&collection.includes('remaining>0&&<button'), 'clinical list group remains lazy and progressively bounded');
ok(collection.includes('className="mt-0.5 block line-clamp-2 break-words'), 'clinical group description readable on narrow phones');
ok(summary.includes('divide-x divide-surface-border')&&summary.includes('metrics.map('), 'clinical summary preserves metric and separator identity');
ok(summary.includes('metrics.length <= 1 ? "grid-cols-1"')&&summary.includes('metrics.length === 2 ? "grid-cols-2"')&&summary.includes('metrics.length === 3 ? "grid-cols-3"'), 'clinical metric layout adapts from one to several real metrics');
ok(header.includes('safeReturnTarget(')&&header.includes('router.replace(')&&header.includes('trigger("vibrate")'), 'shared header keeps contextual back route and haptics');
ok(header.includes('flex-wrap items-start justify-between')&&header.includes('max-w-full shrink-0 flex-wrap'), 'shared header avoids toolbar overflows');
ok(viewer.includes('role="dialog"')&&viewer.includes('aria-modal="true"')&&viewer.includes('aria-label={`Visualizar documento: ${item.title}`}'), 'gallery preview accessible as named modal');
ok(viewer.includes('event.key === "Escape"')&&viewer.includes('event.shiftKey && document.activeElement === first'), 'gallery closes by Escape and traps keyboard focus');
ok(viewer.includes('document.body.style.overflow = previousOverflow')&&viewer.includes('if (previous?.isConnected) previous.focus'), 'gallery restores scroll and focus');
ok(viewer.includes('"_blank", "noopener,noreferrer"'), 'gallery PDF link opens without reverse tab access');
ok(viewer.includes('Math.min(Math.max(1,')&&viewer.includes('initialPinch.current.dist'), 'gallery original 1–4x pinch authority preserved');
ok(list.includes('role="list"')&&list.includes('role="listitem"')&&list.includes('DocumentCard'), 'document list offers accessible grouping and unchanged record card');
ok(list.includes('onFavoriteToggle={onFavoriteToggle}')&&list.includes('personName ? personName(doc)'), 'document list preserves favorite and person callbacks');
ok(!/(\bsupabase\b|\bdb\.|fetch\(|\.put\(|\.insert\(|\.delete\()/.test([selector,formats,disclosure,collection,summary,header,viewer,list,search].join('\n')), 'presentation changes do not query or mutate clinical database');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('scripts/test-vault-m50-documents-workspace.cjs')&&gate.includes('scripts/test-vault-m49-list-navigation.cjs'), 'M49 and M50 stay together in canonical release gate');

// Compile and execute real local normalization, then filter the exact catalog shape.
const compile=(f,jsx=ts.JsxEmit.None)=>ts.transpileModule(read(f),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx,esModuleInterop:true}}).outputText;
function load(file,stubs={}){
 const m=new Module(file,module);m.filename=file;m.paths=module.paths;
 m.require=id=>{if(Object.prototype.hasOwnProperty.call(stubs,id))return stubs[id];throw Error('M50 unexpected runtime import '+id+' in '+file)};
 m._compile(compile(file,file.endsWith('.tsx')?ts.JsxEmit.ReactJSX:ts.JsxEmit.None),file);
 return m.exports;
}
const normalize=load('lib/local-search.ts').normalizeLocalSearch;
const filter=load('lib/documents/document-type-search.ts',{'@/lib/local-search':{normalizeLocalSearch:normalize}}).filterDocumentTypeOptions;
const catalog=[
 {id:'rg',label:'RG',description:'Registro Geral'},
 {id:'cpf',label:'CPF',description:'Cadastro de Pessoa Física'},
 {id:'receita',label:'Receita',description:'Receitas médicas'},
 {id:'lme',label:'LME',description:'Solicitação de medicamentos SUS'},
 {id:'sus',label:'Fornecimento SUS',description:'Formulários e comprovantes'},
 {id:'laudo',label:'Laudo',description:'Laudos e exames'},
];
ok(filter(catalog,'').length===catalog.length&&filter(catalog,'')!==catalog, 'blank search retains all exact options without mutation');
ok(filter(catalog,'receita').map(x=>x.id).join(',')==='receita', 'search finds selected document type name');
ok(filter(catalog,'medicas').map(x=>x.id).join(',')==='receita', 'accent-free search works on document description');
ok(filter(catalog,'medicamentos sus').map(x=>x.id).join(',')==='lme', 'multi-word search joins metadata without inventing categories');
ok(filter(catalog,'fornecimento sus').map(x=>x.id).join(',')==='sus', 'document search preserves qualified SUS type');
ok(filter(catalog,'nao-existe').length===0, 'unknown query never invents a document type');
ok(filter(catalog,'cpf')[0]===catalog[1], 'document search keeps identity and the original order');
ok(filter(catalog,'LAUDO')[0]===catalog[5], 'document search is case-insensitive');

// JSX mock executes the REAL presentational functions without browser, DB or React runtime.
const jsx=(type,props)=>({type,props:props||{}});
const react={useState:initial=>[initial,()=>{}],useRef:value=>({current:value}),useEffect:()=>{},useMemo:fn=>fn()};
const motion=new Proxy({}, {get:(_,key)=>`motion.${String(key)}`});
const Icon=()=>null;
const icons=new Proxy({}, {get:()=>Icon});
const runtime={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},react,'framer-motion':{motion,AnimatePresence:'AnimatePresence'},'lucide-react':icons};
const components=load('components/DocumentTypeSelector.tsx',{...runtime,'@/lib/documents/document-type-search':{filterDocumentTypeOptions:filter}});
const chosen=[];const sel=components.DocumentTypeSelector({selected:'rg',isOpen:true,onChange:id=>chosen.push(id),onClose:()=>chosen.push('close')});
function walk(node,visit){if(node===null||node===undefined)return;if(Array.isArray(node)){node.forEach(x=>walk(x,visit));return;}if(typeof node==='object'){visit(node);walk(node.props?.children,visit)}}
const buttons=[];walk(sel,n=>{if(n.type==='motion.div'||n.type==='button')buttons.push(n)});
const options=[];walk(sel,n=>{if(n.type==='button'&&n.props?.['aria-pressed']!==undefined)options.push(n)});
ok(options.length===13, 'rendered selector retains all thirteen document choices');
ok(options.filter(n=>n.props['aria-pressed']).length===1, 'rendered selector marks precisely one selected type');
options[4].props.onClick();
ok(chosen.join(',')==='receita,close', 'document selection invokes the exact original callback then closes once');
const summaryUi=load('components/saude/ClinicalListSummary.tsx',runtime).ClinicalListSummary;
const fakeMetrics=n=>Array.from({length:n},(_,i)=>({label:`C${i}`,value:i}));
for(const [n,cls] of [[1,'grid-cols-1'],[2,'grid-cols-2'],[3,'grid-cols-3'],[5,'grid-cols-2 sm:grid-cols-4']]){
 let tree=summaryUi({icon:Icon,eyebrow:'Cuidado',title:'Resumo',metrics:fakeMetrics(n)});
 const grids=[];walk(tree,node=>{if(node.props?.className?.includes('divide-x'))grids.push(node)});
 ok(grids.length===1&&grids[0].props.className.includes(cls),`actual metric JSX uses ${cls} for ${n} entries`);
}
const disclosureUi=load('components/saude/ClinicalDisclosure.tsx',{...runtime}).ClinicalDisclosure;
let evaluated=0;const collapsed=disclosureUi({id:'abc',title:'ABC',description:'Conteúdo',icon:null,children:()=>{evaluated++;return 'details'}});
ok(evaluated===0, 'collapsed clinical disclosure does not mount heavy content');
const expanded=disclosureUi({id:'abc',title:'ABC',description:'Conteúdo',icon:null,defaultOpen:true,children:()=>{evaluated++;return 'details'}});
ok(evaluated===1, 'expanded clinical disclosure mounts children once');
const groups=load('components/saude/ClinicalCollectionGroup.tsx',{...runtime}).ClinicalCollectionGroup;
let groupMount=0;const props={id:'grupo',title:'Grupo',description:'Item clínico',count:3,icon:Icon,children:()=>{groupMount++;return 'content'}};
groups(props);ok(groupMount===0,'collapsed clinical collection never mounts list rows');
groups({...props,forceOpen:true});ok(groupMount===1,'forced-open group preserves the user navigation target');
ok(groups({...props,count:0})===null,'zero-item clinical group remains absent');
console.log('VAULT M50:',count,'checks approved; no clinical records or writes changed');
