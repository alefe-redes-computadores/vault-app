#!/usr/bin/env node
'use strict';
/** P5 P2 — read-only behavioral fixtures; never touches user, database or network. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
const path=require('node:path');
const read=p=>fs.readFileSync(p,'utf8');
let n=0; const ok=(name,fn)=>{fn();n++;console.log(`P5 P2 ${String(n).padStart(2,'0')}: ${name} OK`)};
function transpile(file){
 const source=read(file);
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,'Sintaxe: '+file);
 return ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
}
function load(file,imports=()=>({})){
 const mod=new Module(path.resolve(file),module);
 mod.require=id=>imports(id);
 mod._compile(transpile(file),path.resolve(file));
 return mod.exports;
}
const clinic='components/saude/M144ClinicalPanel.tsx';
const safety='lib/health-intelligence/medication-safety.ts';
const presentation='lib/health-intelligence/medication-care-decision.ts';
const detail='app/saude/medicamentos/detalhes/page.tsx';
const timeline='lib/today/build-timeline-items.ts';
const card='lib/health-intelligence/medication-card-action.ts';
for(const p of [clinic,safety,presentation,detail,timeline,card,'components/PendingDosesModal.tsx','app/hoje/page.tsx'])
 ok('AST/TSX '+p,()=>transpile(p));
const ui=read(clinic);
ok('A05: Percepções não assusta com diagnóstico genérico',()=>{
 assert(ui.includes('Este formulário registra percepções pessoais, sem calcular interações ou diagnosticar riscos.'));
 assert(!ui.includes('Risco serotoninérgico, convulsivo, sedativo, renal e gastrointestinal exige revisão'));
 assert(ui.includes("save({tag:'risk_benefit'"));
});
const med=(id,name)=>({id,nome:name,user_id:'u',person_id:'p',status:'ativo',tipo_uso:'continuo',estoque_unidade_medida:'comprimidos',estoque_unidade_por_dose:1,estoque_horarios:['08:00']});
const tramal=med('tramal','Tramal 50 mg'),clonazepam=med('clona','Clonazepam 2 mg'),pristiq=med('pristiq','Pristiq 50 mg'),metadona=med('meth','Metadona');
function log(medication,kind='sos',day='2026-11-14',extra={}){
 return {id:'dose-'+medication.id,medicamento_id:medication.id,person_id:'p',user_id:'u',dose_kind:kind,
         data:day,horario:'19:00',tomado_em:day+'T19:00:00',quantidade:1,...extra};
}
const risk=load(safety,id=>{
 if(id.includes('dose-quantity-safety'))return {assessDoseQuantitySafety:()=>({level:'normal'})};
 if(id.includes('medication-longitudinal-risk'))return {buildMedicationLongitudinalRiskInsights:()=>[]};
 if(id.includes('brain-v52-context'))return {buildBrainV52ContextInsights:()=>[]};
 throw Error('Import inesperado em safety: '+id);
}).buildMedicationSafetyInsights;
const insights=(medicamentos,doseLogs)=>risk({userId:'u',personId:'p',hoje:'2026-11-14',medicamentos,doseLogs,tratamentos:[],renovacoes:[],registrosSaude:[]});
const has=(list,key)=>list.some(x=>x.id===key);
ok('A06: Tramal SOS confirmado + clonazepam confirma triagem opioide/SNC',()=>{
 const a=insights([tramal,clonazepam],[log(tramal),log(clonazepam,'scheduled')]);
 const x=a.find(x=>x.id==='seguranca-opioide-depressores-tramal');
 assert(x&&x.fontesExternas.some(y=>y.url?.includes('ccb3e0f9'))&&x.evidencias.some(y=>y.includes('Clonazepam')));
 assert.match(x.mensagem,/risco de sedação/);assert(!/diagnosticad[oa]/.test(x.mensagem));
});
ok('A06: Tramal SOS confirmado + Pristiq produz triagem serotoninérgica',()=>{
 const a=insights([tramal,pristiq],[log(tramal),log(pristiq,'scheduled')]);
 const x=a.find(x=>x.id==='seguranca-tramadol-serotonergicos-tramal');
 assert(x&&x.gravidadeSeguranca==='importante'&&x.evidencias.some(y=>y.includes('Pristiq')));
 assert.match(x.mensagem,/não afirma que uma reação ocorreu/);
});
ok('A06: SOS ignorado não vira tomada nem interação',()=>{
 const ignored={...log(tramal),tomado_em:undefined,ignorado_em:'2026-11-14T19:02:00'};
 const a=insights([tramal,clonazepam,pristiq],[ignored,log(clonazepam,'scheduled'),log(pristiq,'scheduled')]);
 assert(!a.some(x=>x.id.startsWith('seguranca-tramadol')||x.id==='seguranca-opioide-depressores-tramal'));
});
ok('A06: SOS planejado sem confirmação não vira uso real',()=>{
 const planned={...log(tramal,'sos'),tomado_em:undefined};
 const a=insights([tramal,pristiq],[planned,log(pristiq,'scheduled')]);
 assert(!has(a,'seguranca-tramadol-serotonergicos-tramal'));
});
ok('A06: log antigo (>24h) e log de outra pessoa não contam',()=>{
 const old=log(tramal,'sos','2026-11-12');
 const foreign={...log(tramal),id:'foreign',person_id:'x',user_id:'u'};
 for(const own of [old,foreign]){
  const a=insights([tramal,clonazepam,pristiq],[own,log(clonazepam,'scheduled'),log(pristiq,'scheduled')]);
  assert(!has(a,'seguranca-opioide-depressores-tramal'));
  assert(!has(a,'seguranca-tramadol-serotonergicos-tramal'));
 }
});
ok('A06: outros opioides não ocultam SOS documentado de Tramal',()=>{
 const a=insights([metadona,tramal,clonazepam],[log(metadona,'scheduled'),log(tramal),log(clonazepam,'scheduled')]);
 assert(has(a,'seguranca-opioide-depressores-tramal'));
});
ok('A06: nome parecido não vira tramadol por inferência',()=>{
 const fake=med('fake','Tramalina desconhecida');
 const a=insights([fake,clonazepam],[log(fake),log(clonazepam,'scheduled')]);
 assert(!has(a,'seguranca-opioide-depressores-fake'));
});
const tone=load(presentation).medicationCarePresentation;
ok('A07: atraso administrativo e prazo alto não são emergência clínica',()=>{
 assert.equal(tone({stage:'withdrawal_overdue'},null).tone,'attention');
 assert.equal(tone({stage:'withdrawal_overdue'},'alta').tone,'attention');
 assert.equal(tone({stage:'prescription_needed'},'alta').tone,'attention');
 assert.equal(tone({stage:'acquisition_planned'},'alta').tone,'planning');
 assert.equal(tone({stage:'stable'},'nenhuma').tone,'stable');
});
ok('A07: risco independente explícito mantém possibilidade de alarme clínico',()=>{
 assert.equal(tone({stage:'prescription_needed'},'alta',true).tone,'critical');
 assert(read(detail).includes('brainCareAction?.lane === "now" ? "border-amber-400/25'));
 assert(read(detail).includes('carePresentation.actionClass'));
});
const resolve=load(card).resolveMedicationCardAction;
ok('A01: receita clínica sugerida não abre Cofre Pessoal',()=>{
 const decision={stage:'stable',actionHref:'/saude/medicamentos/detalhes?id=clona',actionLabel:'Ver medicamento',explanation:'Sem alerta'};
 const wrong={href:'/documentos',label:'Vincular ou preparar receita',description:'Anexar receita clínica'};
 const next=resolve(decision,wrong,null);
 assert.equal(next.href,'/saude/renovacao');
 assert.notEqual(next.href,'/documentos');
});
ok('A01: receita com ID canônico conserva destino específico',()=>{
 const decision={stage:'prescription_needed',actionHref:'/saude/renovacao/nova-receita?medicamento_id=clona',actionLabel:'Planejar receita',explanation:'Conferir documento'};
 const result=resolve(decision,{href:'/documentos',label:'Anexar receita',description:''},null);
 assert.equal(result.href,decision.actionHref);
});
ok('A01: comando legítimo de documentos pessoais permanece intocado',()=>{
 const d={stage:'stable',actionHref:'',actionLabel:'',explanation:''};
 const personal={href:'/documentos',label:'Abrir RG',description:'Documento pessoal'};
 assert.equal(resolve(d,personal,null),personal);
 const personalAttachment={href:'/documentos',label:'Anexar RG',description:'Documento pessoal'};
 assert.equal(resolve(d,personalAttachment,null),personalAttachment);
});
const build=load(timeline,id=>{
 if(id==='@/lib/dose-slot-authority')return {buildDoseSlotIndex:()=>new Map(),resolveDoseSlot:()=>({state:'absent'})};
 if(id==='@/lib/today/acquisition-date-index')return {earliestAcquisitionByMedication:()=>new Map()};
 if(id==='@/lib/health-utils')return {getDaysUntil:()=>null};
 if(id==='@/lib/health-intelligence/clinical-stock')return {getClinicalStockSnapshot:()=>({info:{quantidadeRestante:null},registeredQuantity:null})};
 if(id==='@/lib/health-insights')return {analisarComportamentoUso:()=>null,isReceitaAtualVencida:()=>false,sugerirRenovacao:()=>({deveRenovar:false,mensagem:'',urgencia:'nenhuma'})};
 throw Error('Import inesperado em timeline '+id);
}).buildTodayTimelineItems;
const timelineArgs=(day,logs)=>({medicamentos:[{...med('cerumin','Cerumin'),tipo_uso:'por_periodo',estoque_horarios:[]}],
 doseLogs:logs,medicos:[],tratamentos:[],farmacias:[],hospitais:[],historicoDoses:[],registros:[],renovacoes:[],dataSelecionada:day,isHoje:day==='2026-11-14',userId:'u',personId:'p'});
const cerumin={id:'dose-cerumin',user_id:'u',person_id:'p',medicamento_id:'cerumin',dose_kind:'planned',motivo:'Tratamento temporário · Cerumin',data:'2026-11-15',horario:'08:00'};
ok('A30: Cerumin de amanhã nunca aparece nas doses de hoje',()=>{
 const a=build(timelineArgs('2026-11-14',[cerumin]));
 assert(!a.some(x=>x.logId==='dose-cerumin'));
});
ok('A30: Cerumin futuro permanece visível no próprio dia planejado',()=>{
 const a=build(timelineArgs('2026-11-15',[cerumin]));
 assert(a.some(x=>x.logId==='dose-cerumin'&&x.scheduleOrigin==='temporary_course'&&x.tomada===false));
});
ok('A30: curso de outra pessoa é excluído sem alterar o log',()=>{
 const foreign={...cerumin,person_id:'other',id:'foreign'};
 assert(!build(timelineArgs('2026-11-15',[foreign])).some(x=>x.logId==='foreign'));
 assert.equal(foreign.person_id,'other');
});
ok('A32: modal mantém todos os hooks antes do retorno por isOpen',()=>{
 const s=read('components/PendingDosesModal.tsx');
 const idx=s.indexOf('  if (\n    !isOpen\n  ) {');
 assert(idx>0,'modal precisa manter retorno guardado visível');
 const prefix=s.slice(0,idx),after=s.slice(idx);
 for(const hook of ['useState(', 'useEffect(', 'useMemo(', 'useRef(']){
  assert(prefix.includes(hook));assert(!after.includes(hook),'hook após retorno condicional: '+hook);
 }
 assert(s.includes('const resolutionLock = useRef(false)'));
 assert(s.includes('await onResolveDose(dose, {kind:"ignored", motivo:"sem_estoque"})'));
});
ok('A01/A32: fluxo de receitas/doses original continua em Hoje',()=>{
 const today=read('app/hoje/page.tsx');
 assert(today.includes('router.push(evento.actionHref)'));
 assert(today.includes('await marcarComoIgnorada')||today.includes('marcarComoIgnorada('));
 assert(read('app/page.tsx').includes('<PendingDosesModal'));
 assert(read('lib/health-intelligence/prescription-planning.ts').includes('/saude/renovacao/nova-receita'));
});
ok('Gate P5 P2 registrado uma única vez e P5 P1 preservado',()=>{
 const g=read('scripts/test-v63-release-gate.mjs');
 assert.equal(g.split('"scripts/test-vault-m150-p5-p2.cjs"').length,2);
 assert(g.includes('"scripts/test-vault-m150-p5-p1.cjs"'));
});
console.log(`M150 P5 P2: ${n} verificações direcionadas aprovadas. A32 exige reprodução no Android antes de encerrar o incidente.`);
