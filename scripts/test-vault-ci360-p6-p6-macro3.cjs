'use strict';
/** CI360/P6-P6: behavioral proofs of fail-closed, person-scoped, factual projection. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const ROOT=process.cwd();
const name='lib/health-intelligence/brain-clinical-review-p6.ts';
const src=fs.readFileSync(path.join(ROOT,name),'utf8');
const ui=fs.readFileSync(path.join(ROOT,'components/saude/BrainClinicalReviewMacro3.tsx'),'utf8');
const consoleSource=fs.readFileSync(path.join(ROOT,'components/saude/BrainV7UniversalConsole.tsx'),'utf8');
const gate=fs.readFileSync(path.join(ROOT,'scripts/test-v63-release-gate.mjs'),'utf8');
let checks=0;
function ok(value,message){assert.ok(value,message);checks++}
function equal(x,y,message){assert.deepEqual(x,y,message);checks++}
const transpile=(content,file,jsx=false)=>{
 const result=ts.transpileModule(content,{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,...(jsx?{jsx:ts.JsxEmit.ReactJSX}:{})}});
 equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length||0,0,`Sintaxe ${file}`);
 return result.outputText;
};
const code=transpile(src,name);
transpile(ui,'BrainClinicalReviewMacro3.tsx',true);
// Test-only stock adapter: confirms policy around the canonical stock contract.
// Real getClinicalStockSnapshot is used in app and global TypeScript / release contracts.
const mockStock=(med)=>({state:typeof med.estoque_quantidade==='number'?(med.estoque_quantidade<0?'negative':med.estoque_quantidade===0?'empty':'available'):'unknown',
 registeredQuantity:med.estoque_quantidade??null,hasReliableDoseEstimate:Number.isFinite(med._mockDays),daysRemaining:Number.isFinite(med._mockDays)?med._mockDays:null});
const m=new Module(path.join(ROOT,name),module);m.filename=path.join(ROOT,name);m.paths=module.paths;
m.require=function(dep){if(dep==='@/lib/health-intelligence/clinical-stock')return {getClinicalStockSnapshot:mockStock};return require(dep)};
m._compile(code,m.filename);
const {buildBrainClinicalReviewP6,brainClinicalReturnBriefP6}=m.exports;
const DAY='2026-11-18',UID='user-one',PID='person-one';
const medicine=(id,rest={})=>({id,user_id:UID,person_id:PID,nome:id,dosagem:'10 mg',medico:'',data_receita:'',proxima_renovacao:'',tipo_uso:'continuo',...rest});
const base=(rest={})=>({userId:UID,personId:PID,todayISO:DAY,nowISO:'2026-11-18T23:00:00-03:00',medications:[medicine('a')],doseLogs:[],records:[],consultations:[],withdrawals:[],...rest});
const record=(id,day,n,value,rest={})=>({id,user_id:UID,person_id:PID,data:day,categoria:'sintoma',tipo:'dor',nome:'Dor',registro_chave:'dor',intensidade:value,horario:'12:00',...rest});
const log=(id,rest={})=>({id,user_id:UID,person_id:PID,medicamento_id:'a',data:DAY,horario:'10:00',tomado_em:'2026-11-18T10:00:00-03:00',...rest});
let z=buildBrainClinicalReviewP6(base());equal(z.state,'ready');equal(z.medicationCount,1);equal(z.documented.confirmedTaken30d,0);equal(z.documented.recordDays30d,0);equal(z.dataQuality,'limited');
equal(buildBrainClinicalReviewP6(base({userId:'',medications:[medicine('a')]})).state,'unavailable');
equal(buildBrainClinicalReviewP6(base({todayISO:'2026-02-31'})).state,'unavailable');
equal(buildBrainClinicalReviewP6(base({nowISO:'invalid'})).state,'unavailable');
equal(buildBrainClinicalReviewP6(base({doseLogs:[log('future',{tomado_em:'2026-11-18T23:30:00-03:00'})]})).documented.confirmedTaken30d,0);
equal(buildBrainClinicalReviewP6(base({medications:[medicine('a',{user_id:'foreign'})]})).medicationCount,0);
equal(buildBrainClinicalReviewP6(base({medications:[medicine('a'),medicine('a')]})).medicationCount,1);
let x=buildBrainClinicalReviewP6(base({doseLogs:[log('taken'),log('planned',{dose_kind:'planned'}),log('ignored',{tomado_em:undefined,ignorado_em:'2026-11-18T12:00:00-03:00'}),log('conflict',{ignorado_em:'2026-11-18T12:00:00-03:00'}),log('bad',{tomado_em:'invalid'}),log('foreign',{user_id:'other'})]}));
equal(x.documented.confirmedTaken30d,1);equal(x.documented.explicitlyIgnored30d,1);equal(x.documented.plannedExcluded,1);equal(x.documented.conflictLogsExcluded,1);equal(x.documented.missingClockExcluded,1);equal(x.documented.doseDays30d,1);
equal(buildBrainClinicalReviewP6(base({doseLogs:[log('sos',{dose_kind:'sos'}),log('extra',{dose_kind:'extra'})]})).documented.rescueTaken30d,2);
equal(buildBrainClinicalReviewP6(base({doseLogs:[log('unscoped',{medicamento_id:'other'})]})).documented.confirmedTaken30d,0);
const s=buildBrainClinicalReviewP6(base({medications:[medicine('a',{estoque_quantidade:null}),medicine('b',{estoque_quantidade:0}),medicine('c',{estoque_quantidade:9,_mockDays:5}),medicine('d',{estoque_quantidade:3,_mockDays:1,tipo_uso:'sos'})]}));
equal(s.stock.find(m=>m.medicationId==='a').state,'unknown');equal(s.stock.find(m=>m.medicationId==='a').estimatedDays,null);
equal(s.stock.find(m=>m.medicationId==='b').attention,true);equal(s.stock.find(m=>m.medicationId==='c').estimatedDays,5);
equal(s.stock.find(m=>m.medicationId==='d').estimatedDays,null);equal(s.stock.find(m=>m.medicationId==='d').attention,false);
const consultation=(id,rest={})=>({id,user_id:UID,person_id:PID,status:'realizada',data:'2026-11-16',especialidade:'Clínica',medicamento_ids:['a'],orientacao_profissional:'Registrado pelo paciente; conferir.',...rest});
const c=buildBrainClinicalReviewP6(base({consultations:[consultation('ok'),consultation('wrong-person',{person_id:'other'}),consultation('wrong-med',{medicamento_ids:['zzz']}),consultation('pending',{status:'agendada'}),consultation('no-link',{medicamento_ids:undefined})]}));
equal(c.consultations.length,1);equal(c.consultations[0].id,'ok');ok(c.consultations[0].href.includes('consultas/detalhes?id=ok'));
const changes=[{dosagem_antiga:'5 mg',data_mudanca:'2026-11-10',medico_responsavel:'Prescritor relatado'}];
const records=[record('a1','2026-11-07','dor',4),record('a2','2026-11-08','dor',5),record('a3','2026-11-09','dor',6),record('b1','2026-11-11','dor',8),record('b2','2026-11-12','dor',7),record('b3','2026-11-13','dor',9)];
const tt=buildBrainClinicalReviewP6(base({medications:[medicine('a',{historico_dosagens:changes})],records}));
equal(tt.changes.length,1);equal(tt.changes[0].axes[0].beforeDays,3);equal(tt.changes[0].axes[0].afterDays,3);equal(tt.changes[0].axes[0].beforeAverage,5);equal(tt.changes[0].axes[0].afterAverage,8);equal(tt.changes[0].axes[0].descriptiveDelta,3);equal(tt.changes[0].axes[0].scope,'person_context');
const sparse=buildBrainClinicalReviewP6(base({medications:[medicine('a',{historico_dosagens:changes})],records:records.slice(0,4)}));
equal(sparse.changes[0].evidenceState,'insufficient_observations');equal(sparse.changes[0].axes[0].descriptiveDelta,null);
const linked=buildBrainClinicalReviewP6(base({medications:[medicine('a',{historico_dosagens:changes})],records:records.map(x=>({...x,medicamento_id:'a'}))}));
equal(linked.changes[0].axes[0].scope,'linked');
const inappropriate=buildBrainClinicalReviewP6(base({medications:[medicine('a',{historico_dosagens:changes})],records:records.map(x=>({...x,user_id:'other'}))}));
equal(inappropriate.changes[0].axes.length,0);
let sourceInput=base({medications:[medicine('a',{historico_dosagens:changes})],records});const before=JSON.stringify(sourceInput);buildBrainClinicalReviewP6(sourceInput);equal(JSON.stringify(sourceInput),before,'Nao modifica registros de entrada');
const brief=brainClinicalReturnBriefP6(tt);ok(brief.includes('SEM CAUSALIDADE'));ok(brief.includes('5/10'));ok(!/dose sugerida|sua dose deve/i.test(brief));
ok(consoleSource.includes('buildBrainClinicalReviewP6('),'Brain V7 incorpora a projeção única');
ok(consoleSource.includes('<BrainClinicalReviewMacro3 review={clinicalReviewP6}/>'),'A tela Brain existente integra card');
ok(consoleSource.includes('brainClinicalReturnBriefP6('),'O dossiê/PDF preserva seção contextual');
ok(consoleSource.includes("db.consultas.where('[user_id+person_id]')"),'Consultas indexadas por titular');
ok(consoleSource.includes("db.retiradas.where('[user_id+person_id]')"),'Retiradas indexadas por titular');
ok(gate.includes('test-vault-ci360-p6-p6-macro3.cjs'),'V63 executa contratos da Macro3');
ok(ui.includes('não validam um protocolo de resgate'),'SOS não cria posologia');
ok(!src.includes('safeUpdateMedicamento')&&!src.includes('enfileirarOperacao')&&!src.includes('supabase.from('),'Motor somente leitura');
console.log(`CI360 P6/P6 MACRO3: ${checks} verificações dirigidas OK (sintaxe, escopo, evidência, estoque, SOS, consultas e dossiê)`);
