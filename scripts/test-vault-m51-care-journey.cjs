#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const assert=require('node:assert/strict');const ts=require('typescript');const Module=require('node:module');
const source=p=>fs.readFileSync(p,'utf8');let count=0;
function ok(value,label){assert.ok(value,'M51 '+label);count++;console.log('✓ M51 '+label)}
const paths=[
 'lib/health-intelligence/clinical-relation-visibility.ts',
 'components/saude/TreatmentCareLinks.tsx',
 'components/saude/MedicationJourneySummary.tsx',
 'components/saude/TreatmentVisitBrief.tsx',
 'components/saude/MedicationCareNetworkDetails.tsx',
 'components/saude/MedicationAcquisitionHistoryCard.tsx',
 'components/saude/MedicationPrescriptionCard.tsx',
 'components/saude/TreatmentTimelineRow.tsx',
 'components/saude/MedicationDoseHistoryLink.tsx',
 'components/saude/MedicationDoseEvolutionTimeline.tsx',
 ];
const compile=(p)=>ts.transpileModule(source(p),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const jsx=(type,props)=>({type,props:props||{}});
const icon=()=>null;
const ui={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'lucide-react':new Proxy({}, {get:()=>icon}), 'framer-motion':{motion:{button:'motion.button'}}};
const load=(path,imports={})=>{const m=new Module(path,module);m.require=id=>{if(Object.prototype.hasOwnProperty.call(imports,id))return imports[id];throw Error('M51 unexpected dependency '+id+' from '+path)};m._compile(compile(path),path);return m.exports;};
for(const p of paths){const parsed=ts.createSourceFile(p,source(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(parsed.parseDiagnostics.length===0,'TypeScript parser '+p)}
const rel=load(paths[0]);const full={process:2,withdrawal:3,prescription:1,acquisition:5,planned:2,document:0};
ok(rel.availableRelationKinds(full).join(',')==='process,withdrawal,prescription,acquisition,planned','only recorded relation types appear');
ok(rel.totalRecordedRelations(full)===13,'source totals retain independently recorded event categories');
ok(rel.availableRelationKinds({...full,process:0,acquisition:-1,planned:NaN}).join(',')==='withdrawal,prescription','zero, invalid and negative counts omitted');
ok(rel.relationKindVisible('all','withdrawal')&&rel.relationKindVisible('prescription','prescription')&&!rel.relationKindVisible('prescription','acquisition'),'type filters isolate the requested registered event');
ok(rel.CLINICAL_RELATION_KINDS.length===7&&new Set(rel.CLINICAL_RELATION_KINDS).size===7,'six explicit distinct categories plus all');
const frozen=Object.freeze({...full});rel.availableRelationKinds(frozen);rel.totalRecordedRelations(frozen);ok(frozen.acquisition===5,'filtering does not mutate recorded counts');
const over=Array.from({length:5000},(_,i)=>({kind:i%2?'document':'planned'}));ok(over.filter(x=>rel.relationKindVisible('planned',x.kind)).length===2500,'dense relation collection retains all matching rows');
const treeText=node=>Array.isArray(node)?node.map(treeText).join(' '):node&&typeof node==='object'?treeText(node.props?.children):typeof node==='string'||typeof node==='number'?String(node):'';
const walk=(node,pred,found=[])=>{if(Array.isArray(node))node.forEach(n=>walk(n,pred,found));else if(node&&typeof node==='object'){if(pred(node))found.push(node);walk(node.props?.children,pred,found)}return found};
const reactSlots=[];let cursor=0;
const fakeReact={useState(initial){const i=cursor++;if(!reactSlots[i])reactSlots[i]={value:initial};return [reactSlots[i].value,v=>{reactSlots[i].value=typeof v==='function'?v(reactSlots[i].value):v}]},useRef(initial){return {current:initial}}};
const standIn={...ui,react:fakeReact};
const triage={matchesCareSearch:(term,...values)=>!term||values.some(v=>String(v??'').toLowerCase().includes(term.toLowerCase())),summarizeWithdrawalProgress:()=>({overdue:0,scheduled:1,realized:0,notRealized:0,cancelled:0})};
const care=load(paths[1],{...standIn,
 '@/components/saude/TreatmentLinkedMetrics':{TreatmentLinkedMetrics:()=>null},
 '@/lib/health-supply/types':{SUPPLY_ORIGIN_LABELS:{sus:'SUS'}},
 '@/lib/health-supply/renewal-event':{isPrescriptionOnly:x=>x.kind==='prescription',isFutureAcquisition:x=>x.kind==='planned'},
 '@/lib/health-utils':{getLocalTodayISO:()=> '2026-11-03'},
 '@/lib/health-intelligence/operational-triage':triage,
 '@/lib/health-intelligence/clinical-relation-visibility':rel
 }).TreatmentCareLinks;
const fixture={processes:[{id:'p1',titulo:'Proc-Alfa',origem:'sus',status:'ativo'}],withdrawals:[{id:'w1',medicamento_id:'m1',data:'2026-11-05',status:'agendada'}],renewals:[{id:'rx1',medicamento_id:'m1',kind:'prescription',data:'2026-11-01'},{id:'ac1',medicamento_id:'m1',kind:'acquisition',data:'2026-11-02'},{id:'pl1',medicamento_id:'m1',kind:'planned',data:'2026-11-09'}],documents:[{id:'d1',title:'Doc-Beta',type:'laudo',created_at:'2026-10-31'}],medications:[{id:'m1',nome:'Med-Gama'}]};
const navigate=[];const props={context:fixture,color:'#059669',onNavigate:href=>navigate.push(href)};
function draw(){cursor=0;return care(props)}
let root=draw();ok(treeText(root).includes('Proc-Alfa')&&treeText(root).includes('Doc-Beta'),'initial care view displays recorded processes and documents');
ok(/Todas\s*\(\s*6\s*\)/.test(treeText(root))&&/Receitas\s*\(\s*1\s*\)/.test(treeText(root))&&/Compras planejadas\s*\(\s*1\s*\)/.test(treeText(root)),'six explicit relations counted without merging categories');
const choose=label=>{const b=walk(root,x=>x.type==='button'&&treeText(x).includes(label.split(' (')[0]))[0];assert.ok(b,'M51 missing control '+label);b.props.onClick();root=draw()};
choose('Receitas (1)');ok(!treeText(root).includes('Proc-Alfa')&&!treeText(root).includes('Doc-Beta')&&walk(root,x=>x.props?.title==='Receitas vinculadas').length===1,'category-only view excludes unrelated records');
ok(/1\s+vínculo\(s\) encontrados/.test(treeText(root)),'category filter reflects current visible records');
choose('Limpar filtros');ok(treeText(root).includes('Proc-Alfa')&&treeText(root).includes('Doc-Beta'),'clear restores every event without changing source data');
const search=walk(root,x=>x.type==='input'&&x.props.type==='search')[0];ok(!!search,'search remains available');search.props.onChange({target:{value:'Doc-Beta'}});root=draw();ok(treeText(root).includes('Doc-Beta')&&!treeText(root).includes('Proc-Alfa'),'text search limits visible relationships');
choose('Limpar filtros');ok(fixture.processes[0].titulo==='Proc-Alfa'&&fixture.renewals.length===3&&fixture.documents.length===1,'display never mutates clinical source');
const docButton=walk(root,x=>x.type==='button'&&treeText(x).includes('Doc-Beta'))[0];docButton.props.onClick();ok(navigate[0]==='/saude/documentos/detalhes?id=d1','document navigation retains exact registered ID');
const journey=load(paths[2],{...ui,'@/lib/health-intelligence/medication-journey-signal':{medicationJourneySignal:()=>({tone:'planning',label:'Planejamento',explanation:'Não registra compra'})}}).MedicationJourneySummary;
const snapshot={prescriptions:1,completedAcquisitions:0,plannedAcquisitions:2,pendingWithdrawals:1,overdueWithdrawals:0,latestPrescriptionDate:'2026-11-01',nextPlannedAcquisitionDate:'2026-11-10',nextWithdrawalDate:'2026-11-05'};
root=journey({snapshot,medicationId:'m1',onNavigate:href=>navigate.push(href)});
ok(treeText(root).includes('Compra futura registrada')&&treeText(root).includes('Ainda não é aquisição realizada'),'planned acquisition stays distinct from completed');
ok(treeText(root).includes('Receitas')&&treeText(root).includes('Retiradas'),'evidence sections preserved');
ok(treeText(root).includes('Uma data sem confirmação não comprova'),'no clinical event inferred from missing confirmation');
const jButtons=walk(root,x=>x.type==='button');ok(jButtons.length>=2,'recorded sections remain actionable');
const zero=journey({snapshot:{...snapshot,prescriptions:0,pendingWithdrawals:0,plannedAcquisitions:0},medicationId:'m1'});ok(treeText(zero).includes('Nenhum evento registrado'),'no event does not fabricate a clinical entry');
const visit=load(paths[3],standIn).TreatmentVisitBrief;
const dossier={synopsis:'Registros locais',medications:[{id:'m1'}],symptoms:[],consultations:[{id:'c1'}],documents:[],pendingLocal:1,upcoming:[{id:'c1',data:'2026-11-07',especialidade:'A'},{id:'c2',data:'2026-11-09',especialidade:'B'},{data:'2026-11-10',especialidade:'Sem ID'}]};
cursor=0;root=visit({dossier,color:'#fff',onNavigate:href=>navigate.push(href)});
ok(/Outras consultas vinculadas\s*·\s*2/.test(treeText(root)),'additional consultations stay discoverable');
ok(treeText(root).includes('Consulta vinculada sem destino'),'missing relation ID never fabricates destination');
const second=walk(root,x=>x.type==='button'&&treeText(x).includes('09/11/2026'))[0];ok(!!second,'second linked consultation is actionable');second.props.onClick();ok(navigate.at(-1)==='/saude/consultas/detalhes?id=c2','exact consultation ID navigated');
const network=load(paths[4],{...ui,'@/components/detail/DetailComponents':{DetailInfoRow:({children})=>jsx('div',{children})}}).MedicationCareNetworkDetails;
root=network({doctor:{name:'Dr A',otherMedicationCount:1,id:'dr1'},hospital:{id:'',name:'Sem código',phone:'',address:''},location:null,pharmacy:null,latestPublicAcquisition:null,onNavigate:href=>navigate.push(href),onMap:()=>{},onCall:()=>{},formatDay:x=>x});
ok(treeText(root).includes('Vínculo não confirma atendimento, fornecimento ou retirada'),'network relationships not treated as completed care');
ok(treeText(root).includes('2 referência(s)'),'network displays current linked references without queries');
const acq=load(paths[5],ui).MedicationAcquisitionHistoryCard;
for(const [kind,expected] of [['prescription','não demonstra compra'],['planned','ainda não realizada'],['public','confirme a retirada'],['private','movimentação salva']]){
 root=acq({kind,dateLabel:'03/11/2026',requiresPrescription:false,enabled:true,onOpen:()=>{}});
 ok(treeText(root).includes(expected),'acquisition '+kind+' remains semantically distinct');
}
const rx=load(paths[6],ui).MedicationPrescriptionCard;
root=rx({typeLabel:'Receita',status:'current',issuedAt:'01/11',expiresAt:'01/12',nextAt:'01/12',validityLabel:'Válida até',nextLabel:'Próxima',hasAttachment:false,onPlan:()=>{},onLink:()=>navigate.push('link'),onAttachment:()=>navigate.push('attach'),onReceived:()=>navigate.push('received')});
ok(treeText(root).includes('Vincular um documento não registra seu recebimento'),'linked document and receiving separate');
const linkButton=walk(root,x=>x.type==='button'&&treeText(x).includes('Vincular receita'))[0];linkButton.props.onClick();ok(navigate.at(-1)==='link','document link is still original callback');
const received=walk(root,x=>x.type==='button'&&treeText(x).includes('Registrar receita recebida'))[0];received.props.onClick();ok(navigate.at(-1)==='received','received prescription keeps separate action');
const row=load(paths[7],ui).TreatmentTimelineRow;
root=row({title:'Consulta relacionada',description:'Resumo',date:'03/11/2026',icon:jsx('span'),disabled:true,onOpen:()=>navigate.push('bad')});
ok(root.props.disabled===true&&root.props['aria-label'].includes('sem destino'),'unlinked timeline row cannot masquerade as actionable');
const dose=load(paths[8],ui).MedicationDoseHistoryLink;
root=dose({onOpen:()=>navigate.push('doses')});root.props.onClick();ok(navigate.at(-1)==='doses','dose history maintains existing navigation callback');
const ev=load(paths[9],{...standIn}).MedicationDoseEvolutionTimeline;
cursor=0;root=ev({currentDose:'10mg',history:[{dosagem_antiga:'5mg',data_mudanca:'2026-10-12'}],formatDose:x=>x,formatDay:x=>x});
ok(/1\s+alteração\(ões\)/.test(treeText(root))&&treeText(root).includes('sem avaliar resposta clínica'),'dose timeline does not infer efficacy');
const denseDossier={...dossier,upcoming:Array.from({length:3000},(_,i)=>({id:`visit-${i}`,data:'2026-11-15',especialidade:'Especialidade'}))};
cursor=0;root=visit({dossier:denseDossier,color:'#fff',onNavigate:href=>navigate.push(href)});
ok(walk(root,x=>x.type==='button'&&treeText(x).includes('15/11/2026')).length===7,'very long consultation history mounts one primary and six extra destinations');
const showMore=walk(root,x=>x.type==='button'&&treeText(x).includes('Ver consultas restantes na lista'))[0];
ok(!!showMore,'long relation dossier keeps an explicit navigation to complete list');
showMore.props.onClick();ok(navigate.at(-1)==='/saude/consultas','full consultation route preserved for additional events');
ok(source('scripts/test-v63-release-gate.mjs').includes('scripts/test-vault-m51-care-journey.cjs'),'new safety contract registered in canonical gate');
console.log(`VAULT M51: ${count} structural and behavioral checks approved; no database or medication changes`);
