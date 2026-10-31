#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
const src=fs.readFileSync('lib/home/pending-dose-projection.ts','utf8');
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const m=new Module('projection',module);
// Real dose-slot authority, transpiled as a pure module.
const authority=new Module('authority',module);
authority._compile(ts.transpileModule(fs.readFileSync('lib/dose-slot-authority.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'authority');
m.require=id=>{
 if(id==='@/lib/dose-slot-authority')return authority.exports;
 if(id==='@/lib/medication-availability')return {hasKnownEmptyMedicationStock:med=>Number(med.estoque_quantidade)===0};
 if(id==='@/lib/pending-dose-backlog')return {buildPendingDoseBacklog:()=>[]};
 return require(id);
};
m._compile(js,'projection');
const {buildHomePendingDoseProjection}=m.exports;
const base={userId:'u',personId:'p',today:'2026-10-30',yesterday:'2026-10-29',currentTime:'23:05',plannedEarlier:[],yesterdayLogs:[],todayLogs:[],reviewLogs:[]};
const med=id=>({id,user_id:'u',person_id:'p',nome:id,formato:'comprimido',cores:['#34d399'],tipo_uso:'sos',estoque_quantidade:0});
const planned=(id,kind='planned',extra={})=>({id:'log-'+id,user_id:'u',person_id:'p',medicamento_id:id,dose_kind:kind,data:'2026-10-30',horario:'23:00',tomado_em:null,ignorado_em:null,...extra});
const meds=[med('sos-a'),med('sos-b'),med('sos-sem-plano')];
let p=buildHomePendingDoseProjection({...base,medications:meds,reviewLogs:[planned('sos-a'),planned('sos-b')]});
assert.deepEqual(p.map(x=>x.medicamentoId),['sos-a','sos-b'],'dois SOS 23h preservados individualmente');
assert(p.every(x=>x.stockUnavailable),'aviso de saldo preservado sem criar estoque');
assert(!p.some(x=>x.medicamentoId==='sos-sem-plano'),'SOS sem plano nao vira dose obrigatoria');
p=buildHomePendingDoseProjection({...base,medications:meds,reviewLogs:[planned('sos-a'),planned('sos-b','scheduled')]});
assert.equal(p.length,2,'slot SOS explicitamente registrado com dose_kind scheduled incluido');
p=buildHomePendingDoseProjection({...base,medications:meds,reviewLogs:[planned('sos-a'),planned('sos-b', 'planned',{tomado_em:'2026-10-30T23:01:00Z'})]});
assert.deepEqual(p.map(x=>x.medicamentoId),['sos-a'],'dose tomada nao continua pendente');
p=buildHomePendingDoseProjection({...base,medications:meds,reviewLogs:[planned('sos-a'),planned('sos-b','planned',{person_id:'outro'})]});
assert.deepEqual(p.map(x=>x.medicamentoId),['sos-a'],'isolamento entre pessoas');
p=buildHomePendingDoseProjection({...base,currentTime:'22:59',medications:meds,reviewLogs:[planned('sos-a'),planned('sos-b')]});
assert.equal(p.length,0,'nao antecipa dose futura');
p=buildHomePendingDoseProjection({...base,medications:meds,reviewLogs:[planned('sos-a'),planned('sos-a')]});
assert.equal(p.length,1,'idempotencia de mesmo slot');
const navSource=fs.readFileSync('lib/notification-dose-navigation.ts','utf8');
const nav=new Module('nav',module);nav._compile(ts.transpileModule(navSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'nav');
const resolve=nav.exports.resolveDoseNotificationDestination;
assert.equal(resolve('dose_overdue_group'),'/?open=pending-doses');
assert.equal(resolve('dose_overdue'),'/?open=pending-doses');
assert.equal(resolve('dose_reminder_group'),'/hoje?focus=doses');
assert.equal(resolve('dose_planned'),'/hoje?focus=doses');
assert.equal(resolve('health_event'),null,'evento clinico conserva seu proprio destino');
const provider=fs.readFileSync('components/Providers.tsx','utf8');
const home=fs.readFileSync('app/page.tsx','utf8');
const today=fs.readFileSync('app/hoje/page.tsx','utf8');
assert(provider.includes('resolveDoseNotificationDestination(data.type)'),'listener cold-start reutiliza destino unico');
assert(home.includes('setModalPendenciasAberto(true)'),'modal abre sem confirmar');
assert(today.includes('focusDoseQueue')&&today.includes('getElementById("hoje-doses")'),'Hoje foca doses');
for (const file of ['components/Providers.tsx','app/page.tsx','app/hoje/page.tsx','lib/home/pending-dose-projection.ts','lib/notification-dose-navigation.ts']) {
 const source=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(sf.parseDiagnostics.length,0,`${file}: parse TSX/TS ${sf.parseDiagnostics.map(x=>x.messageText)}`);
}
console.log('✓ P7: 2 SOS 23h, slot resolvido, futuro, dono, idempotencia, roteamento e parse OK');
