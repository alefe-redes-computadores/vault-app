#!/usr/bin/env node
'use strict';
/** A7/M5 generic, source-based checks. No network, real patient data, writes or fake clinical writer. */
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
let checks=0;const ok=(value,msg)=>{assert.ok(value,msg);checks++};
const eq=(a,b,msg)=>{assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),msg);checks++};
const fail=(fn,re,msg)=>{assert.throws(fn,re,msg);checks++};
const read=p=>fs.readFileSync(p,'utf8');
function load(file,modules={}){
 const src=read(file),ast=ts.createSourceFile(file,src,ts.ScriptTarget.ES2022,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 eq(ast.parseDiagnostics.length,0,'TypeScript sintaticamente válido: '+file);
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};vm.runInNewContext(js,{exports,require:name=>{if(modules[name])return modules[name];throw Error('Dependência não autorizada: '+name)},Date,Set,Map,Number,Math,Error,String,Object,RegExp,console}, {filename:file});return exports;
}
const typeFile='lib/surgery-continuity-a7m5/types.ts',types=load(typeFile);
const context=load('lib/surgery-continuity-a7m5/context.ts');
const projection=load('lib/surgery-continuity-a7m5/projection.ts',{'./types':types,'./context':context});
const a7types=load('lib/surgery-a7/types.ts');
const recurrence=load('lib/rehab-m5/recurrence-a7m5.ts',{
 '@/lib/db':{db:{}},'@/lib/supabase/local-auth':{getLocalFirstAuthUser:()=>{throw Error('não executar writer no contrato hermético')}},
 './repository':{scheduleRehabSessionM5:()=>{throw Error('não executar writer no contrato hermético')}},'@/lib/surgery-a7/types':a7types});
const uid='11111111-1111-4111-8111-111111111111',pid='22222222-2222-4222-8222-222222222222',otherUid='33333333-3333-4333-8333-333333333333',otherPid='44444444-4444-4444-8444-444444444444';
const sid='55555555-5555-4555-8555-555555555555';
const surgical=['routine_consultation','non_surgical_procedure','surgery_intent','planned_surgery','documented_surgery','rehab_program'];
for(const situation of ['routine_consultation','non_surgical_procedure'])for(const documented of [false,true])for(const linked of [false,true]){
 const actions=context.contextualActionsA7M5({situation,hasExplicitSurgeryLink:linked,hasDocumentedOperation:documented,hasKnownPlan:true,hasLinkedReturn:false,hasLinkedRehab:false,hasScheduledReturn:false});eq(actions.length,0,'consulta comum / endoscopia sem vínculo não sugere cirurgia');}
const base={hasExplicitSurgeryLink:true,hasDocumentedOperation:false,hasKnownPlan:false,hasLinkedReturn:false,hasLinkedRehab:false,hasScheduledReturn:false};
const intent=context.contextualActionsA7M5({...base,situation:'surgery_intent',hasKnownPlan:true});eq(intent.map(x=>x.key),['review_intent'],'encaminhamento sem cirurgia real sugere apenas revisão');
eq(context.contextualActionsA7M5({...base,situation:'surgery_intent'}).length,0,'sem indicação documental nenhuma ação');
eq(context.contextualActionsA7M5({...base,situation:'planned_surgery'}).map(x=>x.key),['review_pre'],'cirurgia planejada não gera alta');
eq(context.contextualActionsA7M5({...base,situation:'planned_surgery',hasExplicitSurgeryLink:false}).length,0,'sem cirurgia explícita nada');
eq(context.contextualActionsA7M5({...base,situation:'documented_surgery',hasDocumentedOperation:true}).map(x=>x.key),['link_return'],'retorno é possibilidade não fato');
eq(context.contextualActionsA7M5({...base,situation:'documented_surgery',hasDocumentedOperation:true,hasLinkedReturn:true,hasLinkedRehab:true}).map(x=>x.key),['open_return','open_rehab'],'reab e retorno só se vínculos');
eq(context.contextualActionsA7M5({...base,situation:'rehab_program',hasLinkedRehab:false}).length,0,'programa ausente não sugere reabilitação');
ok(context.contextualActionsA7M5({...base,situation:'rehab_program',hasLinkedRehab:true})[0]?.key==='review_rehab','programa real permite revisar');
for(const status of ['requested','under_review','scheduled','withdrawn'])ok(types.STATUS_LABEL_A7M5[status]?.length>4,'status legível');
for(const target of ['procedure_event_a9','exam_order','medication','health_record'])ok(types.TARGET_LABEL_A7M5[target]?.length>3,'alvo semanticamente rotulado');
for(const stage of ['pre','procedure','post','return'])ok(types.STAGE_LABEL_A7M5[stage]?.length>3,'etapa tem texto sem enum');
const baseRecord={user_id:uid,person_id:pid,id:uid,created_at:'2026-11-22T15:00:00Z',updated_at:'2026-11-22T15:00:00Z',deleted_at:null};
const intentOne={...baseRecord,status:'requested',title:'Procedimento informado',corrects_intent_id:null};
const intentTwo={...baseRecord,id:pid,corrects_intent_id:uid,status:'under_review',created_at:'2026-11-22T15:01:00Z'};
const foreignIntent={...baseRecord,id:sid,user_id:otherUid,person_id:otherPid};
eq(types.currentIntentsA7M5([intentOne,intentTwo,foreignIntent],uid,pid).map(x=>x.id),[pid],'revisões sem duplicar e sem misturar titular');
eq(types.currentIntentsA7M5([intentOne,intentTwo,foreignIntent],otherUid,otherPid).map(x=>x.id),[sid],'cross-account invisível');
const linkOne={...baseRecord,id:uid,surgery_id:sid,action:'link',corrects_link_id:null,target_type:'exam_order',target_id:pid,stage:'pre'};
const linkTwo={...baseRecord,id:pid,surgery_id:sid,action:'unlink',corrects_link_id:uid,target_type:'exam_order',target_id:pid,stage:'pre'};
const otherSurgery={...baseRecord,id:otherPid,surgery_id:otherPid,action:'link',corrects_link_id:null,target_type:'medication',target_id:pid,stage:'post'};
eq(types.activeEvidenceA7M5([linkOne,linkTwo,otherSurgery],uid,pid,sid).length,0,'desvinculado não permanece ativo');
eq(types.activeEvidenceA7M5([linkOne,otherSurgery],uid,pid,sid).map(x=>x.id),[uid],'vínculo ativo só mesma cirurgia');
eq(types.activeEvidenceA7M5([linkOne],uid,otherPid,sid).length,0,'isolamento por pessoa');
eq(types.activeEvidenceA7M5([linkOne],otherUid,pid,sid).length,0,'isolamento por conta');
const fact={id:pid,user_id:uid,person_id:pid,label:'Laudo da pessoa',route:'/saude/exames/pedidos?id='+pid,status:'registrado'};
const related=projection.projectSurgicalContinuityA7M5({uid,pid,surgeryId:sid,status:'agendada',intents:[intentOne,intentTwo],links:[linkOne],facts:{exam_order:[fact]}});
eq(related.evidence.length,1,'relacionamento existente exibido');eq(related.evidence[0].targetId,pid,'ID do fato preservado');eq(related.contextual.map(x=>x.key),['review_pre'],'sem fato operatório só etapa planejada');
const foreign=projection.projectSurgicalContinuityA7M5({uid,pid,surgeryId:sid,intents:[foreignIntent],links:[linkOne],facts:{exam_order:[{...fact,person_id:otherPid}]}});eq(foreign.evidence.length,0,'não exibe laudo de outra pessoa');
const consultation=projection.projectSurgicalContinuityA7M5({uid,pid,intents:[],links:[],facts:{}});eq(consultation.contextual.length,0,'consulta isolada não vira cirúrgica');
for(const day of ['2026-11-23','2026-02-28','2028-02-29'])ok(a7types.validDayA7(day),'data civil válida');
for(const day of ['2026-02-30','2026-13-11','not-a-date'])ok(!a7types.validDayA7(day),'data impossível rejeitada');
const slots=recurrence.expandRehabSlotsA7M5({startDay:'2026-11-23',endDay:'2026-11-29',clock:'09:00',weekdays:[1,3,5]});eq(slots.length,3,'reabilitação 3 vezes na semana por escolha do usuário');eq(slots[0],'2026-11-23T09:00:00','hora local exata não realizada');
eq(recurrence.expandRehabSlotsA7M5({startDay:'2026-11-23',endDay:'2026-11-23',clock:'10:30',weekdays:[1]}).length,1,'sessão pontual sem cirurgia');
fail(()=>recurrence.expandRehabSlotsA7M5({startDay:'2026-11-23',endDay:'2026-11-22',weekdays:[1],clock:'08:00'}),/intervalo/,'intervalo invertido');
fail(()=>recurrence.expandRehabSlotsA7M5({startDay:'2026-11-23',endDay:'2027-04-01',weekdays:[1],clock:'08:00'}),/91 dias/,'intervalo excessivo');
fail(()=>recurrence.expandRehabSlotsA7M5({startDay:'2026-11-23',endDay:'2026-11-29',weekdays:[-1],clock:'08:00'}),/semana/,'dia inválido');
fail(()=>recurrence.expandRehabSlotsA7M5({startDay:'2026-11-23',endDay:'2026-11-29',weekdays:[1],clock:'25:00'}),/horário/,'hora inválida');
fail(()=>recurrence.expandRehabSlotsA7M5({startDay:'2026-11-23',endDay:'2026-11-23',weekdays:[0],clock:'08:00'}),/Não há datas|data/,'sem datas no período não agenda nada');
const sources=['app/saude/cirurgias/page.tsx','lib/surgery-continuity-a7m5/repository.ts','lib/surgery-continuity-a7m5/sync.ts','components/saude/SurgeryJourneyA7.tsx','components/saude/SurgicalIntentPanelA7M5.tsx','components/saude/SurgeryEvidencePanelA7M5.tsx','components/saude/ClinicalFactDocumentsA7M5.tsx','components/saude/RehabRecurringPlannerA7M5.tsx','lib/rehab-m5/recurrence-a7m5.ts','hooks/useSyncQueue.ts','lib/sync/pull.ts','lib/db/index.ts','lib/sync/dependency-order.ts','lib/surgery-a7/types.ts','lib/surgery-a7/repository.ts','lib/surgery-a7/sync.ts','lib/clinical-exams-m3/repository.ts','lib/clinical-exams-m3/policy.ts','scripts/test-v63-release-gate.mjs'];
for(const file of sources)ok(fs.existsSync(file),'arquivo obrigatório presente: '+file);
for(const file of sources.filter(x=>/\.tsx?$/.test(x))){const src=read(file),ast=ts.createSourceFile(file,src,ts.ScriptTarget.ES2022,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);eq(ast.parseDiagnostics.length,0,'AST sem sintaxe errada: '+file)}
const repo=read('lib/surgery-continuity-a7m5/repository.ts'),sync=read('lib/surgery-continuity-a7m5/sync.ts'),sql=read('supabase/migrations/20261122172023_vault_a7_m5_continuity_360.sql');
for(const token of ['db.transaction','enfileirarOperacao','assertId','user_id','person_id','corrects','source','target_type'])ok(repo.includes(token),'writer protegido: '+token);
for(const token of ['23505','same(','insert(','user_id','person_id','pendingContinuityDependencyA7M5'])ok(sync.includes(token),'sync idempotente: '+token);
for(const token of ['ENABLE ROW LEVEL SECURITY','FORCE ROW LEVEL SECURITY','CREATE POLICY','auth.uid()','FOREIGN KEY','surgical_intents_a7m5','surgery_evidence_links_a7m5','clinical_asset_links','vault_validate_clinical_asset_link_m1','surgery_event','rehab_milestone'])ok(sql.includes(token),'SQL proteção: '+token);
for(const k of ['procedure_event_a9','exam_order','medication','health_record'])ok(sql.includes("WHEN '"+k+"'"),'alvo de FK polimórfica auditado: '+k);
const db=read('lib/db/index.ts');ok(db.includes('this.version(58).stores'),'Dexie v58 aditiva');

const dbAst=ts.createSourceFile('lib/db/index.ts',db,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS),lastStores=new Map();
function readStores(node){
 if(ts.isCallExpression(node)&&node.expression.getText(dbAst).endsWith('.stores')&&ts.isObjectLiteralExpression(node.arguments[0])){
  for(const prop of node.arguments[0].properties)if(ts.isPropertyAssignment(prop)&&ts.isStringLiteral(prop.initializer))lastStores.set(prop.name.getText(dbAst).replace(/[\"']/g,''),prop.initializer.text);
 }
 ts.forEachChild(node,readStores);
}readStores(dbAst);
const scopedTables=['cirurgias','consultas','surgery_consultation_links_m4','tratamentos','documents','exam_orders','consultation_exam_order_links','rehab_programs_m5','rehab_origin_links_m5','rehab_sessions_m5','rehab_milestones_m5','clinical_assets','clinical_asset_links','surgery_journey_events_a7','surgery_team_a7','hospitalizations_a5','hospitalization_relations_a5','hospitalization_events_a5','hospitalization_discharge_a5','hospitalization_team_a5','hospitalization_stays_a5','registros_saude','medicamentos','surgical_intents_a7m5','surgery_evidence_links_a7m5'];
for(const table of scopedTables)ok(lastStores.get(table)?.includes('[user_id+person_id]'),'leitura por índice conta+pessoa disponível: '+table);
const rootSurgery=read('app/saude/cirurgias/page.tsx');ok(rootSurgery.includes('/saude/cirurgias/encaminhamentos')&&rootSurgery.includes('/saude/cirurgias/jornada')&&rootSurgery.includes('activePersonId'), 'acesso permanente inclusive sem cirurgia cadastrada');
const gate=read('scripts/test-v63-release-gate.mjs');ok(gate.includes('scripts/test-vault-a7-m5-clinical-continuity-360.cjs'),'gate V63 conserva contrato A7/M5');
console.log(`A7_M5_CONTINUIDADE_TEST_OK | ${checks} verificações | contratos funcionais, isolamento e integridade`);
