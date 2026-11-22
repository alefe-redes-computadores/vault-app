/* A8 FINAL + A9 360: structural / factual / negative scope tests; no live health data. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('typescript');let checks=0;
function ok(test,message){checks++;assert.ok(test,message);}
const read=p=>fs.readFileSync(p,'utf8');
function moduleFromTS(path){const source=read(path);const body=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};vm.runInNewContext(body,{exports:m.exports,module:m,require:(key)=>{throw Error('Pure test prohibits dependency '+key);},Date,Set,Map,Array,Object,Number,String,Boolean,RegExp}, {filename:path});return m.exports;}
const a9=moduleFromTS('lib/clinical-a9/types.ts');
for(const [value,expected] of [['2026-02-29',false],['2024-02-29',true],['2026-11-22',true],['2026-13-01',false],['2026-01-00',false],['23/11/2026',false]])ok(a9.validDayA9(value)===expected,'valid civil day '+value);
for(const [value,expected] of [['22112026','2026-11-22'],['22/11/2026','2026-11-22'],['2026-11-22','2026-11-22'],['31/02/2026',null],['abc',null]])ok(a9.ptToDayA9(value)===expected,'pt civil date '+value);
const base={user_id:'u1',person_id:'p1',deleted_at:null,kind:'entry'};
const rows=[{...base,id:'a',created_at:'2026-01-01T00:00:00Z',corrects_event_id:null},{...base,id:'b',created_at:'2026-01-02T00:00:00Z',corrects_event_id:'a',kind:'amendment'},
 {...base,id:'c',created_at:'2026-01-03T00:00:00Z',corrects_event_id:'b',kind:'void'},
 {...base,id:'other-user',user_id:'u2',created_at:'2026-01-03T00:00:00Z',corrects_event_id:null},
 {...base,id:'other-person',person_id:'p2',created_at:'2026-01-03T00:00:00Z',corrects_event_id:null}];
ok(a9.currentFactsA9(rows,'u1','p1').length===1,'correction chain closed');
ok(a9.activeFactsA9(rows,'u1','p1').length===0,'void not active');
ok(a9.currentFactsA9(rows,'u2','p1').length===1,'another account isolated');
ok(a9.currentFactsA9(rows,'u1','p2').length===1,'another person isolated');

// Deterministic matrix of two accounts x two persons: no cross-scope aggregation.
for(const user of ['account-a','account-b'])for(const person of ['person-1','person-2']){
 const matrix=[];for(const u of ['account-a','account-b'])for(const pid of ['person-1','person-2'])for(let n=0;n<4;n++)matrix.push({id:u+'-'+pid+'-'+n,user_id:u,person_id:pid,kind:'entry',source:'self_report',note:null,corrects_event_id:null,deleted_at:null,created_at:'2026-11-21T10:00:00Z',updated_at:'2026-11-21T10:00:00Z'});
 const own=a9.activeFactsA9(matrix,user,person);ok(own.length===4,'matrix 2x2 exact size '+user+person);
 ok(own.every(x=>x.user_id===user&&x.person_id===person),'matrix no cross tenant '+user+person);
 const revision={...own[0],id:'revision-'+user+'-'+person,kind:'amendment',corrects_event_id:own[0].id,created_at:'2026-11-22T10:00:00Z'};
 const revised=a9.activeFactsA9([...matrix,revision],user,person);ok(revised.length===4&&!revised.some(x=>x.id===own[0].id)&&revised.some(x=>x.id===revision.id),'matrix revision scope '+user+person);
 const voided={...revision,id:'void-'+user+'-'+person,kind:'void',corrects_event_id:revision.id,created_at:'2026-11-22T11:00:00Z'};
 ok(a9.activeFactsA9([...matrix,revision,voided],user,person).length===3,'matrix void scope '+user+person);
}
for(const yyyy of [2020,2021,2024,2026,2030,2100,2400])for(const m of [1,2,4,6,9,11,12]){
 const last=new Date(Date.UTC(yyyy,m,0)).getUTCDate();let day=String(yyyy)+'-'+String(m).padStart(2,'0')+'-'+String(last).padStart(2,'0');
 ok(a9.validDayA9(day),'calendar last day '+day);ok(!a9.validDayA9(day.slice(0,8)+String(last+1).padStart(2,'0')),'calendar rejects overflow '+day);
}
for(const [p,parts] of Object.entries({
 'lib/db/index.ts':['this.version(57)','procedure_events_a9','sensitivity_events_a9','[user_id+person_id]'],
 'lib/types.ts':['"procedure_events_a9"','"sensitivity_events_a9"'],
 'lib/sync/pull.ts':["remoteTable:'procedure_events_a9'","remoteTable:'sensitivity_events_a9'"],
 'hooks/useSyncQueue.ts':['syncA9','pendingA9Dependency','markRecordSyncedIfCurrent(db.procedure_events_a9','markRecordSyncedIfCurrent(db.sensitivity_events_a9'],
 'lib/clinical-a9/repository.ts':['db.transaction','enfileirarOperacao','p.user_id','getLocalFirstAuthUser','corrects_event_id'],
 'lib/clinical-a9/sync.ts':['insert(row)','maybeSingle()','pendingA9Dependency'],
 'lib/clinical-exams-m3/policy.ts':["'procedure_event'","'sensitivity_event'"],
 'lib/clinical-exams-m3/repository.ts':['db.procedure_events_a9','db.sensitivity_events_a9'],
 'lib/sync/dependency-order.ts':['procedure_events_a9','sensitivity_events_a9'],
 'lib/health-hub/r5.ts':['/saude/vacinas','/saude/procedimentos','/saude/reacoes'],
 'components/saude/ClinicalEntitySearch360.tsx':['setCount(c=>c+24)','results.slice(0,count)','onSelect','min-h-11'],
 'components/saude/VaccinationA8Workspace.tsx':['[user_id+person_id]','ClinicalEntitySearch360','Vincular comprovante','setDeepEventId'],
 'components/saude/ClinicalReverseA8A9.tsx':['[user_id+person_id]','ClinicalReverseA8A9'],
 'lib/m3/medical-dossier-p3.ts':['procedures_a9','sensitivities_a9','activeFactsA9','Associação temporal não determina causalidade'],
 'app/saude/careflow/modo-medico/page.tsx':['clinicalA9:','scopeKey,procedures:[]','scopeKey,a4Facts,surgical,vaccination,a9'],
 'app/page.tsx':['A9ReadOnlySummary360 context="home"'],
 'app/hoje/page.tsx':['A9ReadOnlySummary360 context="today"'],
 'app/saude/careflow/page.tsx':['A9ReadOnlySummary360 context="careflow"'],
 'components/saude/A9ClinicalWorkspace.tsx':['ClinicalEntitySearch360','inFlight.current','A9_PROCEDURE_LABEL','A9_SENSITIVITY_LABEL','registerClinicalAssetM3','min-h-11'],
 'app/saude/procedimentos/page.tsx':['A9ClinicalWorkspace'],
 'app/saude/reacoes/page.tsx':['A9ClinicalWorkspace']
 }))for(const part of parts)ok(read(p).includes(part),'Contract '+p+' -> '+part);

for(const p of ['components/saude/ClinicalReverseSensitivityA9.tsx','components/saude/ClinicalReverseProcedureA9.tsx']){
 ok(read(p).includes("[user_id+person_id]"),'reverse scoped before read '+p);
 ok(read(p).includes('activeFactsA9'),'reverse current factual only '+p);
 ok(read(p).includes('min-h-11'),'reverse actionable 44px '+p);
}
for(const p of ['app/saude/medicamentos/detalhes/page.tsx','app/saude/consultas/detalhes/page.tsx','components/saude/RehabM5Workspace.tsx','components/saude/VaccinationA8Workspace.tsx'])
 ok(read(p).includes('ClinicalReverse'),'backlinks exist in '+p);

const sql=read('supabase/migrations/20261122154822_vault_a9_procedures_sensitivities_360.sql');
for(const word of ['FORCE ROW LEVEL SECURITY','INSERT TO authenticated','SELECT TO authenticated','public.persons(id,user_id)','public.vault_validate_clinical_asset_link_m1','vault_a9_guard_sensitivity','procedure_events_a9','sensitivity_events_a9','corrects_event_id','REVOKE ALL'])ok(sql.includes(word),'SQL '+word);
const testGate=read('scripts/test-v63-release-gate.mjs');ok(testGate.includes('test-vault-a8-a9-integrated-360.cjs'),'test in V63');
console.log('VAULT_A8_FINAL_A9_CONTRATOS_OK | '+checks+' verificações herméticas; sem rede/sem dados reais');
