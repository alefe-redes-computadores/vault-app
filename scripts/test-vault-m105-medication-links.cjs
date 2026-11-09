'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
let checks=0;
function ok(value, message){assert.ok(value, 'M105: '+message);checks++;}
const src=fs.readFileSync('lib/sync/medication-treatment-reconciliation-m105.ts','utf8');
const js=ts.transpileModule(src,{fileName:'medication-treatment-reconciliation-m105.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};
new Function('module','exports',js)(mod,mod.exports);
const plan=mod.exports.planMedicationTreatmentReconciliationM105;
const meds=[
 {id:'a',user_id:'owner',person_id:'person-a',synced:true,tratamento_ids:['t1']},
 {id:'b',user_id:'owner',person_id:'person-b',synced:true,tratamento_ids:['t2']},
 {id:'c',user_id:'stranger',person_id:'person-c',synced:true,tratamento_ids:['secret']},
 {id:'d',user_id:'owner',person_id:'person-a',synced:false,tratamento_ids:['offline']},
 {id:'e',user_id:'owner',person_id:'person-a',synced:true,tratamento_ids:['pending']},
 {id:'f',user_id:'owner',person_id:'person-a',synced:true,tratamento_ids:[]},
 {id:'g',user_id:'owner',person_id:'',synced:true,tratamento_ids:['not-owned']},
 {user_id:'owner',person_id:'person-a',synced:true,tratamento_ids:['orphan']}
];
const base={ownerId:'owner',medications:meds,pendingIds:new Set(['e'])};
const first=plan({...base,remoteRelations:[{medicamento_id:'a',tratamento_id:'t1'},{medicamento_id:'b',tratamento_id:'t3'},{medicamento_id:'c',tratamento_id:'attack'},{medicamento_id:'d',tratamento_id:'t4'},{medicamento_id:'e',tratamento_id:'t5'}]});
ok(first.updates.length===1,'only one eligible change');
ok(first.updates[0].id==='b','positive update for own other person');
ok(first.updates[0].personId==='person-b','owner/person identity retained');
ok(JSON.stringify(first.updates[0].tratamentoIds)==='["t3"]','remote relation replaces old positive link');
ok(first.needConfirmation.includes('a')===false,'positive current link not candidate');
ok(first.needConfirmation.includes('c')===false,'cross owner ignored');
ok(first.needConfirmation.includes('d')===false,'unsynced local protected');
ok(first.needConfirmation.includes('e')===false,'pending local protected');
ok(first.needConfirmation.includes('g')===false,'missing person rejected');
ok(first.updates.every(x=>x.id),'missing ID is never scheduled for update');
ok(first.needConfirmation.every(Boolean),'missing ID is never scheduled for confirmation');
const empty=plan({...base,remoteRelations:[]});
ok(empty.updates.length===0,'first empty remote snapshot does not remove any links');
ok(empty.needConfirmation.includes('a')&&empty.needConfirmation.includes('b'),'empty snapshot requests confirmation');
const verified=plan({...base,remoteRelations:[],confirmedEmptyIds:new Set(['a'])});
ok(verified.updates.length===1&&verified.updates[0].id==='a','confirmed last-link removal applied');
ok(verified.updates[0].tratamentoIds.length===0,'confirmed last link becomes explicit empty array');
ok(verified.needConfirmation.includes('b'),'unconfirmed other person remains preserved');
const transient=plan({...base,remoteRelations:[{medicamento_id:'a',tratamento_id:'new'}],confirmedEmptyIds:new Set(['b'])});
ok(transient.updates.some(x=>x.id==='a'&&x.tratamentoIds[0]==='new'),'new link wins after transient empty read');
ok(transient.updates.some(x=>x.id==='b'&&x.tratamentoIds.length===0),'separately verified empty can clear');
const dup=plan({...base,remoteRelations:[{medicamento_id:'a',tratamento_id:'t2'},{medicamento_id:'a',tratamento_id:'t2'},{medicamento_id:'a',tratamento_id:'t1'}]});
ok(dup.updates.find(x=>x.id==='a').tratamentoIds.join(',')==='t1,t2','deduplicates and sorts links');
const invalid=plan({...base,remoteRelations:[{medicamento_id:'a',tratamento_id:''},{medicamento_id:'a',tratamento_id:3},{medicamento_id:'z',tratamento_id:'t'}]});
ok(invalid.updates.length===0,'invalid and foreign rows never change local links');
ok(invalid.needConfirmation.includes('a'),'invalid rows cannot authoritatively clear');
ok(meds[0].tratamento_ids[0]==='t1','pure planner never mutates input');
ok(plan({...base,remoteRelations:[],confirmedEmptyIds:new Set(['f'])}).updates.length===0,'unchanged empty remains unchanged');
const pull=fs.readFileSync('lib/sync/pull.ts','utf8');
ok(pull.includes('planMedicationTreatmentReconciliationM105'),'real pull integrates planner');
ok(pull.includes('hasPendingOperation("medicamentos"'),'M75 legacy pending protection preserved');
ok(pull.includes('.in("medicamento_id", batch)'),'secondary targeted remote confirmation');
ok(pull.includes('db.transaction("rw", [db.medicamentos, db.syncQueue]'),'atomic local owner/pending recheck');
ok(pull.includes('recordPullTable("medicamento_tratamentos"'),'relation failures become visible diagnostics');
ok(pull.includes('current.user_id !== userId || current.person_id !== update.personId'),'owner checked at write boundary');
const med=fs.readFileSync('app/saude/medicamentos/page.tsx','utf8');
ok(med.indexOf('aria-label="Progresso das doses programadas de hoje"')<med.indexOf('<MedicationFilterBar value='),'progress appears above filters');
ok(med.includes('setQuickDoseMedId(med.id!)'),'quick medication action preserved');
ok(med.includes('medsSOS.map(renderCard)')&&med.includes('isTemporary'),'SOS and temporary medication remain distinct');
ok(med.includes('MedicationRestockAction')&&med.includes('MedicationOperationalStrip'),'stock and dose card authorities preserved');
const more=fs.readFileSync('app/mais/page.tsx','utf8');
ok(more.includes('useVaultSyncRuntime'),'Mais uses global sync authority');
ok(more.includes('syncRuntime.phase === "synced"'),'Mais only claims current sync when confirmed');
console.log('VAULT M105: '+checks+' verificacoes hermeticas de vinculos, dono e interface aprovadas.');
