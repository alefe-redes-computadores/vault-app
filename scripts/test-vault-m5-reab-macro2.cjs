/* M5 MACRO2: behavioural regression. No cloud access, no mutation of real clinical data. */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),ts=require('typescript');
const path=require('path'); const R=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(R,p),'utf8');
let checks=0;const ok=(expr,msg)=>{assert.ok(expr,msg);checks++;};
function load(p,mocks={}){
 const compiled=ts.transpileModule(read(p),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
 const errors=(compiled.diagnostics||[]).filter(e=>e.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,`${p}: ${errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join('; ')}`);checks++;
 const exports={},module={exports}; const ctx={module,exports,require:s=>{if(s in mocks)return mocks[s];throw Error('unexpected module '+s+' in '+p)},Date,Set,Map,Math,Number,String,Boolean,Object,Array,Error,Promise,Intl,console,crypto:require('node:crypto').webcrypto};
 vm.runInNewContext(compiled.outputText,ctx,{filename:p,timeout:3000});return module.exports;
}
const id=(v)=>String(v).padStart(8,'0')+'-0000-4000-a000-000000000001';
const U=id(1),P=id(2),Q=id(3),PR=id(4),SS=id(5),OR=id(6),PRO=id(7),C=id(8),OTHER=id(9);
const make=(id,props={})=>({id,user_id:U,person_id:P,created_at:'2026-11-20T12:00:00Z',updated_at:'2026-11-20T12:00:00Z',deleted_at:null,...props});
const program=make(PR,{title:'Reabilitação declarada',status:'active',start_date:'2026-11-20'});
const session=make(SS,{program_id:PR,scheduled_at:'2026-11-21T13:00:00Z',status:'scheduled',reminder_opt_in:false});
const proj=load('lib/rehab-m5/projection.ts');
const input={userId:U,personId:P,programs:[program],sessions:[session],today:'2026-11-21'};
// Preserve the six original M5 tables for M5 MACRO1 regression; macro2 extends, never replaces.
const legacyTypes=load('lib/rehab-m5/types.ts');
ok(legacyTypes.REHAB_TABLES_M5.length===6,'original six M5 tables unchanged');
ok(legacyTypes.REHAB_ALL_TABLES_M5.length===7,'one additive milestone table');
ok(legacyTypes.REHAB_ALL_TABLES_M5.filter(v=>v==='rehab_milestones_m5').length===1,'single canonical milestone authority');

process.env.TZ='America/Sao_Paulo';
ok(proj.localDayRehabM5('2026-11-21')==='2026-11-21','date-only civil day not shifted by UTC');
ok(proj.localDayRehabM5('invalid')==='', 'invalid instant not assigned a calendar day');
ok(proj.rehabDueSessionsM5(input).length===1,'future scheduled session on calendar day');
ok(proj.rehabDueSessionsM5({...input,personId:Q}).length===0,'isolated other person');
ok(proj.rehabDueSessionsM5({...input,sessions:[{...session,status:'performed'}]}).length===0,'performed is not scheduled');
ok(proj.rehabDueSessionsM5({...input,sessions:[{...session,status:'missed'}]}).length===0,'missed not scheduled');
ok(proj.rehabDueSessionsM5({...input,sessions:[{...session,status:'cancelled'}]}).length===0,'cancelled not scheduled');
ok(proj.rehabReverseProgramsM5({userId:U,personId:P,originType:'cirurgia',originId:C,programs:[program],origins:[]}).length===0,'never infer a surgical link from dates');
ok(proj.rehabReverseProgramsM5({userId:U,personId:P,originType:'cirurgia',originId:C,programs:[program],origins:[make(OR,{program_id:PR,origin_type:'cirurgia',origin_id:C})]}).length===1,'explicit surgical link only');
ok(proj.rehabReverseProgramsM5({userId:U,personId:P,originType:'cirurgia',originId:C,programs:[program],origins:[make(OR,{program_id:PR,origin_type:'cirurgia',origin_id:C,deleted_at:'2026-11-21T14:00:00Z'})]}).length===0,'tombstone hides reverse links');
const facts=proj.rehabFactsM5({userId:U,personId:P,programs:[program],sessions:[session],milestones:[make(OTHER,{program_id:PR,kind:'reassessment',source:'self_reported',recorded_at:'2026-11-21T15:00:00Z',notes:'Registro sem melhora presumida'})]});
ok(facts.length===3,'facts include program, session and explicit milestone');
ok(facts.every(f=>f.personId===P&&f.programId===PR),'single person and program scope');
ok(proj.rehabFactsM5({...input,milestones:[]}).length===2,'no milestones invented from scheduled sessions');
ok(proj.rehabFactsM5({...input,programs:[{...program,deleted_at:'2026-11-21T12:00:00Z'}],milestones:[]}).length===0,'deleted program has no projected facts');
ok(proj.rehabFactsM5({...input,programs:[{...program,person_id:Q}],milestones:[]}).length===0,'foreign person data not projected');

const put=new Map([[PR,program],[SS,{...session,status:'performed'}]]),records=[];
const table=(rows=put)=>({get:async k=>rows.get(k),put:async row=>{rows.set(row.id,row)},add:async row=>{if(rows.has(row.id))throw Error('duplicate');rows.set(row.id,row)}});
const personRows=new Map([[P,{id:P,user_id:U}]]),doctorRows=new Map([[PRO,{id:PRO,user_id:U}]]);
const db={persons:table(personRows),rehab_programs_m5:table(put),rehab_sessions_m5:table(put),rehab_milestones_m5:table(new Map()),medicos:table(doctorRows),locais:table(new Map()),consultas:table(new Map()),exam_orders:table(new Map()),syncQueue:table(new Map()),transaction:async(_mode,_tables,cb)=>cb()};
const macro2=load('lib/rehab-m5/macro2.ts',{
 '@/lib/db':{db},'@/lib/supabase/local-auth':{getLocalFirstAuthUser:async()=>({data:{user:{id:U}},error:null})},
 '@/lib/sync/enfileirarOperacao':{enfileirarOperacao:async(table,op,row)=>records.push({table,op,row}),solicitarProcessamentoSync:()=>{}},
 './types':{validUuidM5:()=>true,validLocalDateM5:d=>/^\d{4}-\d{2}-\d{2}$/.test(d)}
});
(async()=>{
 await assert.rejects(macro2.closeRehabProgramM5({personId:P,programId:PR,kind:'discharge',date:'2026-11-21',summary:''}),/resumo factual/);checks++;
 await assert.rejects(macro2.recordRehabSessionEvolutionM5({personId:P,sessionId:SS,painBefore:11}),/Dor deve/);checks++;
 await macro2.recordRehabSessionEvolutionM5({personId:P,sessionId:SS,proceduresNotes:'Mobilidade declarada',painBefore:0,painAfter:null});
 ok(put.get(SS).pain_before===0&&put.get(SS).pain_after===null,'zero is explicit; absent pain remains null');
 await macro2.createRehabMilestoneM5({personId:P,programId:PR,kind:'reassessment',source:'self_reported',recordedAt:'2026-11-21T12:00:00Z',notes:'Relato informado'});
 ok(records.some(e=>e.table==='rehab_milestones_m5'&&e.op==='add'),'milestone shares M5 outbox');
 await macro2.closeRehabProgramM5({personId:P,programId:PR,kind:'discharge',date:'2026-11-21',summary:'Alta informada'});
 ok(put.get(PR).status==='completed'&&put.get(PR).discharge_summary==='Alta informada','declared discharge only');
 await assert.rejects(macro2.closeRehabProgramM5({personId:P,programId:PR,kind:'discharge',date:'2026-11-22',summary:'Outra'}),/já finalizado/);checks++;
 ok(!records.some(e=>e.table==='dose_logs'||e.table==='medicamentos'),'no dose/medication writes');
 for(const file of [
  'lib/rehab-m5/types.ts','lib/rehab-m5/repository.ts','lib/rehab-m5/sync.ts','lib/rehab-m5/notifications.ts',
  'components/saude/RehabM5PremiumSections.tsx','components/saude/RehabM5ReverseLinks.tsx',
  'components/saude/RehabM5ClinicalDocuments.tsx','components/saude/RehabM5NotificationReconciler.tsx','components/saude/RehabM5AgendaStrip.tsx',
  'components/saude/RehabM5Workspace.tsx']){
  const out=ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.Preserve},reportDiagnostics:true});
  assert.equal((out.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,'Syntax '+file);checks++;
 }
 const m5sync=read('lib/rehab-m5/sync.ts');
for(const col of ['modality','primary_professional_id','primary_facility_id','discharged_at','discharge_summary','interruption_reason',
 'procedures_notes','functional_notes','pain_before','pain_after','professional_id','reminder_opt_in',
 'recorded_at','consultation_id','exam_order_id'])ok(m5sync.includes(`'${col}'`),'Sync payload field '+col);
ok(m5sync.includes('REHAB_ALL_TABLES_M5.includes(table)'), 'push recognizes milestone table');
const schema=read('lib/rehab-m5/types.ts');
ok(schema.includes("'interrupted'"),'interruption separate from completion');
// FIX2 semantic guards: changes must not narrow the valid queue key to the old six.
const queueRunner=read('hooks/useSyncQueue.ts');
ok(queueRunner.includes('REHAB_ALL_TABLES_M5.includes(key)'),'seven-table union accepted by sync queue');
ok(!queueRunner.includes('REHAB_TABLES_M5.includes(key)'),'no six-table includes against seven-table type');
const programRepository=read('lib/rehab-m5/repository.ts');
ok(programRepository.includes("if((old.status==='completed'||old.status==='interrupted')&&input.status)"),'terminal program status transition blocked without TS2367');

const clientRepo=read('lib/rehab-m5/macro2.ts');
ok(!clientRepo.includes('db.doseLogs.')&&!clientRepo.includes('db.medicamentos.'),'M5 macro2 does not mutate medications or dose logs');

const sql=read('supabase/migrations/20261121160000_m5_reabilitacao_macro2_premium.sql');
 for(const key of ['rehab_milestones_m5','clinical_asset_links','vault_validate_clinical_asset_link_m1','rehab_programs_m5_status_check','pain_before','pain_after','reminder_opt_in'])ok(sql.includes(key),'SQL has '+key);
 console.log(`M5 MACRO2 BEHAVIOR: ${checks} contracts OK. No real DB writes; TypeScript full repo must run in checkout.`);
})().catch(e=>{console.error(e);process.exitCode=1});
