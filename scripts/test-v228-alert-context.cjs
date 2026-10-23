#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(rel){const full=path.join(root,rel),code=fs.readFileSync(full,'utf8');const transpiled=ts.transpileModule(code,{fileName:full,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});const issues=(transpiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);assert.deepEqual(issues,[]);const mod=new Module(full,module);mod.filename=full;mod._compile(transpiled.outputText,full);return mod.exports;}
const policy=load('lib/health-intelligence/medication-alert-policy.ts');
const med=(id,stock,use='sos')=>({id,person_id:'person',user_id:'account',nome:'SOS',tipo_uso:use,estoque_quantidade:stock,status:'ativo'});
const withdrawal=(id,date,opts={})=>({id,medicamento_id:'m1',person_id:'person',user_id:'account',status:'agendada',data:date,...opts});
let d=policy.decideMedicationAlerts({medication:med('m1',70),withdrawals:[withdrawal('a','2026-10-01')],today:'2026-10-22'});
assert.equal(d.withdrawalOverdue,true);assert.equal(d.focus,'withdrawal');assert.equal(d.showStock,false);assert.equal(d.showPrescription,false);assert.match(d.explanation,/70 unidade/);
assert.equal(policy.decideMedicationAlerts({medication:med('m1',0),today:'2026-10-22'}).showStock,false,'SOS stock may be quiet');
assert.equal(policy.decideMedicationAlerts({medication:med('m1',70,'continuo'),today:'2026-10-22'}).showStock,true,'scheduled safety not suppressed');
assert.equal(policy.decideMedicationAlerts({medication:med('m1',0,'continuo'),withdrawals:[withdrawal('a','2026-10-01')],today:'2026-10-22'}).showStock,true,'empty scheduled stock still visible');
assert.equal(policy.decideMedicationAlerts({medication:med('m1',70),withdrawals:[withdrawal('foreign','2026-10-01',{person_id:'other'})],today:'2026-10-22'}).withdrawal,null);
assert.equal(policy.decideMedicationAlerts({medication:med('m1',70),withdrawals:[withdrawal('foreign','2026-10-01',{user_id:'other'})],today:'2026-10-22'}).withdrawal,null);
assert.equal(policy.decideMedicationAlerts({medication:med('m1',70),withdrawals:[withdrawal('done','2026-10-01',{status:'realizada'})],today:'2026-10-22'}).withdrawal,null);
assert.equal(policy.decideMedicationAlerts({medication:med('m1',70),withdrawals:[withdrawal('bad','2026-02-30')],today:'2026-10-22'}).withdrawal,null);
const store=new Map();global.window={localStorage:{getItem:(k)=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},dispatchEvent:()=>{}};global.Event=class{constructor(type){this.type=type}};
assert.equal(policy.setMedicationAlertPrefs(med('m1',70),{stock:true,prescription:false}),true);
assert.deepEqual(policy.getMedicationAlertPrefs(med('m1',70)),{stock:true,prescription:false});
assert.equal(policy.getMedicationAlertPrefs({...med('m1',70),person_id:'other'}).stock,false,'no cross person leakage');
assert.equal(policy.getMedicationAlertPrefs({...med('m1',70),user_id:'other'}).stock,false,'no cross account leakage');
assert.equal(policy.getMedicationAlertPrefs(med('m2',70)).stock,false,'no cross medication leakage');
assert.equal(policy.decideMedicationAlerts({medication:med('m1',0),today:'2026-10-22'}).showStock,true,'SOS opted in');
for(const file of ['components/MedicamentosNotifications.tsx','lib/health-intelligence/medication-care-opportunities.ts','lib/notifications.ts','app/page.tsx','app/saude/medicamentos/detalhes/page.tsx']){
 if(!fs.existsSync(path.join(root,file)))continue;
 const src=fs.readFileSync(path.join(root,file),'utf8');
 assert.match(src,/medication-alert-policy|MedicationAlertPreferences/,`integration missing in ${file}`);
}
console.log('V228 ALERT POLICY OK: SOS 70 tablets, overdue withdrawal priority, empty scheduled stock, explicit permissions, ownership, date validity, native/UI integration');
