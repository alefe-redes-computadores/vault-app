/** A5: one local-first authority for factual hospitalization episodes. Never writes medicines, doses, surgery or examinations. */
import { db } from '@/lib/db';
import { getLocalFirstAuthUser } from '@/lib/supabase/local-auth';
import { enfileirarOperacao, solicitarProcessamentoSync } from '@/lib/sync/enfileirarOperacao';
import type { A5Base,A5Episode,A5Stay,A5Team,A5Event,A5Relation,A5Discharge,A5Source,A5Status,A5AdmissionKind,A5Unit,A5EventKind,A5Entity,A5RelationRole,A5Disposition,A5Reconciliation,A5Table } from './types';
import { isUuidA5,isCivilDayA5 } from './types';
const stamp=()=>new Date().toISOString();
const uuid=()=>{if(typeof crypto==='undefined'||typeof crypto.randomUUID!=='function')throw Error('Identificador seguro não disponível.');return crypto.randomUUID();};
const str=(v:unknown,max=500)=>typeof v==='string'?v.trim().slice(0,max):'';
const opt=(v:unknown,max=500)=>str(v,max)||null;
const civil=(v:string|null|undefined)=>{if(v&&!isCivilDayA5(v))throw Error('Informe uma data válida.');return v||null;};
const revised=(v:string)=>new Date(Math.max(Date.now(),Date.parse(v)+1)).toISOString();
const allowedSource=['self_report','professional_document','verified_import'] as const;
const allowedStatus=['planned','admitted','on_leave','discharged','cancelled'] as const;
const allowedUnits=['unspecified','emergency','ward','icu','stepdown','surgical','rehabilitation','other'] as const;
const allowedEvent=['admission','transfer_internal','transfer_external','procedure_note','clinical_update','care_note','complication_report','discharge','correction','other'] as const;
const allowedEntities=['cirurgia','consulta','exam_order','tratamento','rehab_program','medicamento'] as const;
const allowedRoles=['origin','during','followup','related','discharge_plan','rehab_referral','medication_history'] as const;
const allowedDispositions=['home','transfer','other_facility','against_advice','death','other','unknown'] as const;
const allowedRecon=['not_reported','pending','patient_reported','documented','not_applicable'] as const;
const ensureIn=<T extends string>(v:T,values:readonly T[],kind:string)=>{if(!values.includes(v))throw Error(`Seleção de ${kind} inválida.`);};
async function ownerA5(personId:string){
 const {data,error}=await getLocalFirstAuthUser(),uid=data.user?.id;
 if(error||!uid||!isUuidA5(personId))throw Error('Selecione uma pessoa e autentique sua conta.');
 const person=await db.persons.get(personId);
 if(person?.user_id!==uid)throw Error('Pessoa não pertence à conta ativa.');
 return uid;
}
function assertOwnedA5(row:{user_id:string;person_id:string;deleted_at:string|null}|undefined,uid:string,pid:string){
 if(!row||row.user_id!==uid||row.person_id!==pid||row.deleted_at)throw Error('Registro indisponível para esta pessoa.');
}
const base=(uid:string,pid:string):A5Base=>{const date=stamp();return {id:uuid(),user_id:uid,person_id:pid,created_at:date,updated_at:date,deleted_at:null,synced:false};};
async function pending(table:A5Table,action:'add'|'update',row:A5Base){await enfileirarOperacao(table,action,row as unknown as Record<string,unknown>,{dispatchSync:false});}
const notify=()=>solicitarProcessamentoSync();
async function episodeOwned(pid:string,episodeId:string,uid:string){
 const episode=await db.hospitalizations_a5.get(episodeId);assertOwnedA5(episode,uid,pid);return episode!;
}
function assertSource(source:A5Source){ensureIn(source,allowedSource,'origem');}
function assertFacilities(hospitalId?:string,localId?:string){
 if(hospitalId&&localId)throw Error('Escolha hospital ou local, nunca dois estabelecimentos ao mesmo tempo.');
 if(hospitalId&&!isUuidA5(hospitalId)||localId&&!isUuidA5(localId))throw Error('Cadastro de estabelecimento inválido.');
}
async function facilityOwned(uid:string,hospitalId?:string,localId?:string){
 assertFacilities(hospitalId,localId);
 if(hospitalId){const x=await db.hospitais.get(hospitalId);if(!x||x.user_id!==uid)throw Error('Hospital de outra conta.');}
 if(localId){const x=await db.locais.get(localId);if(!x||x.user_id!==uid)throw Error('Local de outra conta.');}
}
export async function createHospitalizationA5(input:{personId:string; status:'planned'|'admitted';reason?:string;
 source:A5Source;admissionKind?:A5AdmissionKind;plannedOn?:string;admittedOn?:string;
 hospitalId?:string;localId?:string;note?:string;previousHospitalizationId?:string;}):Promise<string>{
 const uid=await ownerA5(input.personId);assertSource(input.source);await facilityOwned(uid,input.hospitalId,input.localId);
 const plannedOn=civil(input.plannedOn),admittedOn=civil(input.admittedOn);
 if(input.status==='planned'&&admittedOn)throw Error('Internação planejada não é admissão confirmada.');
 if(input.status==='admitted'&&plannedOn)throw Error('Registre a admissão real separadamente da data prevista.');
 if(!['planned','admitted'].includes(input.status))throw Error('Estado inicial inválido.');
 if(input.previousHospitalizationId)await episodeOwned(input.personId,input.previousHospitalizationId,uid);
 const row:A5Episode={...base(uid,input.personId),reason:opt(input.reason,400),reason_source:input.source,
  admission_kind:input.admissionKind||'unknown',status:input.status,
  planned_admission_on:input.status==='planned'?plannedOn:null,planned_admission_at:null,
  admitted_on:input.status==='admitted'?admittedOn:null,admitted_at:null,
  discharged_on:null,discharged_at:null,timezone_name:null,hospital_id:input.hospitalId||null,
  local_id:input.localId||null,facility_name_snapshot:null,
  previous_hospitalization_id:input.previousHospitalizationId||null,note:opt(input.note,1500)};
 await db.transaction('rw',[db.hospitalizations_a5,db.syncQueue],async()=>{await db.hospitalizations_a5.add(row);await pending('hospitalizations_a5','add',row);});notify();return row.id;
}
export async function updateHospitalizationA5(input:{personId:string;id:string;reason?:string;note?:string;plannedOn?:string|null;
 status?:A5Status;admittedOn?:string|null;}):Promise<void>{
 const uid=await ownerA5(input.personId);let updated=false;
 await db.transaction('rw',[db.hospitalizations_a5,db.syncQueue],async()=>{
  const row=await episodeOwned(input.personId,input.id,uid);
  if(input.status){ensureIn(input.status,allowedStatus,'estado');
   if(['discharged','cancelled'].includes(row.status))throw Error('Episódio encerrado não pode ser reaberto automaticamente.');
   if(input.status==='discharged')throw Error('Use a ação específica de saída para registrar a alta.');
   if(input.status==='cancelled'&&row.status!=='planned')throw Error('Só planejamento não iniciado pode ser cancelado.');
   if(input.status==='planned'&&row.status!=='planned')throw Error('Não transformar admissão em planejamento.');
  }
  const next:A5Episode={...row,
   reason:input.reason===undefined?row.reason:opt(input.reason,400),
   note:input.note===undefined?row.note:opt(input.note,1500),
   status:input.status??row.status,
   planned_admission_on:input.plannedOn===undefined?row.planned_admission_on:civil(input.plannedOn),
   admitted_on:input.admittedOn===undefined?row.admitted_on:civil(input.admittedOn),
   updated_at:revised(row.updated_at),synced:false};
  if(next.status==='planned'&&(next.admitted_on||next.discharged_on))throw Error('Planejamento não pode conter admissão real.');
  if(next.status==='cancelled')next.planned_admission_on=row.planned_admission_on;
  await db.hospitalizations_a5.put(next);await pending('hospitalizations_a5','update',next);updated=true;
 });if(updated)notify();
}
export async function addHospitalizationStayA5(input:{personId:string;hospitalizationId:string;unitType:A5Unit;
 source:A5Source;enteredOn?:string;leftOn?:string;hospitalId?:string;localId?:string;
 ward?:string;room?:string;bed?:string;note?:string;}):Promise<string>{
 const uid=await ownerA5(input.personId);assertSource(input.source);ensureIn(input.unitType,allowedUnits,'setor');
 await facilityOwned(uid,input.hospitalId,input.localId);
 const entered=civil(input.enteredOn),left=civil(input.leftOn);
 if(entered&&left&&left<entered)throw Error('Saída anterior à entrada do setor.');
 const row:A5Stay={...base(uid,input.personId),hospitalization_id:input.hospitalizationId,
  hospital_id:input.hospitalId||null,local_id:input.localId||null,unit_type:input.unitType,
  ward_label:opt(input.ward,160),room_label:opt(input.room,80),bed_label:opt(input.bed,80),
  entered_on:entered,entered_at:null,left_on:left,left_at:null,timezone_name:null,
  source:input.source,note:opt(input.note,1000)};
 await db.transaction('rw',[db.hospitalizations_a5,db.hospitalization_stays_a5,db.syncQueue],async()=>{
  await episodeOwned(input.personId,input.hospitalizationId,uid);
  await db.hospitalization_stays_a5.add(row);await pending('hospitalization_stays_a5','add',row);
 });notify();return row.id;
}
export async function finishHospitalizationStayA5(input:{personId:string;id:string;leftOn:string}):Promise<void>{
 const uid=await ownerA5(input.personId);const left=civil(input.leftOn);if(!left)throw Error('Informe a data declarada de saída do setor.');
 await db.transaction('rw',[db.hospitalization_stays_a5,db.syncQueue],async()=>{
  const old=await db.hospitalization_stays_a5.get(input.id);assertOwnedA5(old,uid,input.personId);
  if(!old||old.left_on)throw Error('Permanência já encerrada.');
  if(old.entered_on&&left<old.entered_on)throw Error('Data de saída anterior à entrada.');
  const row={...old,left_on:left,updated_at:revised(old.updated_at),synced:false};
  await db.hospitalization_stays_a5.put(row);await pending('hospitalization_stays_a5','update',row);
 });notify();
}
export async function assignHospitalizationTeamA5(input:{personId:string;hospitalizationId:string;
 professionalId:string;role:string;source:A5Source;stayId?:string;startedOn?:string;endedOn?:string;note?:string;}):Promise<string>{
 const uid=await ownerA5(input.personId);assertSource(input.source);const role=str(input.role,120);
 if(!role||!isUuidA5(input.professionalId))throw Error('Profissional e função são obrigatórios.');
 const started=civil(input.startedOn),ended=civil(input.endedOn);if(started&&ended&&ended<started)throw Error('Período de equipe inválido.');
 const row:A5Team={...base(uid,input.personId),hospitalization_id:input.hospitalizationId,
  professional_id:input.professionalId,stay_id:input.stayId||null,role,
  started_on:started,ended_on:ended,source:input.source,note:opt(input.note,1000)};
 await db.transaction('rw',[db.hospitalizations_a5,db.hospitalization_stays_a5,db.medicos,db.hospitalization_team_a5,db.syncQueue],async()=>{
  await episodeOwned(input.personId,input.hospitalizationId,uid);
  const pro=await db.medicos.get(input.professionalId);if(!pro||pro.user_id!==uid)throw Error('Profissional não pertence à conta.');
  if(input.stayId){const stay=await db.hospitalization_stays_a5.get(input.stayId);assertOwnedA5(stay,uid,input.personId);
   if(stay?.hospitalization_id!==input.hospitalizationId)throw Error('Setor pertence a outra internação.');}
  await db.hospitalization_team_a5.add(row);await pending('hospitalization_team_a5','add',row);
 });notify();return row.id;
}
export async function recordHospitalizationEventA5(input:{personId:string;hospitalizationId:string;kind:A5EventKind;
 summary:string;source:A5Source;occurredOn?:string;stayId?:string;professionalId?:string;correctsEventId?:string;}):Promise<string>{
 const uid=await ownerA5(input.personId);assertSource(input.source);ensureIn(input.kind,allowedEvent,'tipo do fato');
 const summary=str(input.summary,1000);if(!summary)throw Error('Descreva o fato documentado.');
 if((input.kind==='correction')!==Boolean(input.correctsEventId))throw Error('Correção exige vínculo com o evento original.');
 const row:A5Event={...base(uid,input.personId),hospitalization_id:input.hospitalizationId,
  stay_id:input.stayId||null,kind:input.kind,summary,occurred_on:civil(input.occurredOn),
  occurred_at:null,timezone_name:null,source:input.source,
  source_professional_id:input.professionalId||null,corrects_event_id:input.correctsEventId||null};
 await db.transaction('rw',[db.hospitalizations_a5,db.hospitalization_stays_a5,db.hospitalization_events_a5,db.medicos,db.syncQueue],async()=>{
  await episodeOwned(input.personId,input.hospitalizationId,uid);
  if(input.stayId){const stay=await db.hospitalization_stays_a5.get(input.stayId);assertOwnedA5(stay,uid,input.personId);
   if(stay?.hospitalization_id!==input.hospitalizationId)throw Error('Setor de outra internação.');}
  if(input.professionalId){const pro=await db.medicos.get(input.professionalId);if(!pro||pro.user_id!==uid)throw Error('Profissional indisponível.');}
  if(input.correctsEventId){const previous=await db.hospitalization_events_a5.get(input.correctsEventId);assertOwnedA5(previous,uid,input.personId);
   if(previous?.hospitalization_id!==input.hospitalizationId)throw Error('Evento original de outra internação.');}
  await db.hospitalization_events_a5.add(row);await pending('hospitalization_events_a5','add',row);
 });notify();return row.id;
}
async function targetA5(type:A5Entity,id:string){
 switch(type){
  case 'cirurgia':return await db.cirurgias.get(id);
  case 'consulta':return await db.consultas.get(id);
  case 'exam_order':return await db.exam_orders.get(id);
  case 'tratamento':return await db.tratamentos.get(id);
  case 'rehab_program':return await db.rehab_programs_m5.get(id);
  case 'medicamento':return await db.medicamentos.get(id);
 }
}
export async function relateHospitalizationA5(input:{personId:string;hospitalizationId:string;
 entityType:A5Entity;entityId:string;role:A5RelationRole;source:A5Source;note?:string;}):Promise<string>{
 const uid=await ownerA5(input.personId);assertSource(input.source);
 ensureIn(input.entityType,allowedEntities,'área vinculada');ensureIn(input.role,allowedRoles,'finalidade');
 if(!isUuidA5(input.entityId))throw Error('Selecione um cadastro existente.');
 const row:A5Relation={...base(uid,input.personId),hospitalization_id:input.hospitalizationId,
  entity_type:input.entityType,entity_id:input.entityId,relation_role:input.role,source:input.source,note:opt(input.note,1000)};
 await db.transaction('rw',[db.hospitalizations_a5,db.cirurgias,db.consultas,db.exam_orders,db.tratamentos,db.rehab_programs_m5,db.medicamentos,db.hospitalization_relations_a5,db.syncQueue],async()=>{
  await episodeOwned(input.personId,input.hospitalizationId,uid);
  const entity=await targetA5(input.entityType,input.entityId) as {user_id?:string;person_id?:string;deleted_at?:string|null}|undefined;
  if(!entity||entity.user_id!==uid||entity.person_id!==input.personId||entity.deleted_at)throw Error('Vínculo fora da conta/pessoa selecionada.');
  const same=await db.hospitalization_relations_a5.where('hospitalization_id').equals(input.hospitalizationId).toArray();
  if(same.some(x=>!x.deleted_at&&x.user_id===uid&&x.person_id===input.personId&&x.entity_type===input.entityType&&x.entity_id===input.entityId&&x.relation_role===input.role))throw Error('Este vínculo já existe.');
  await db.hospitalization_relations_a5.add(row);await pending('hospitalization_relations_a5','add',row);
 });notify();return row.id;
}
export async function unlinkHospitalizationA5(input:{personId:string;id:string}):Promise<void>{
 const uid=await ownerA5(input.personId);
 await db.transaction('rw',[db.hospitalization_relations_a5,db.syncQueue],async()=>{
  const old=await db.hospitalization_relations_a5.get(input.id);assertOwnedA5(old,uid,input.personId);
  const row={...old!,deleted_at:revised(old!.updated_at),updated_at:revised(old!.updated_at),synced:false};
  await db.hospitalization_relations_a5.put(row);await pending('hospitalization_relations_a5','update',row);
 });notify();
}
export async function registerHospitalizationDischargeA5(input:{personId:string;hospitalizationId:string;
 disposition:A5Disposition;source:A5Source;dischargedOn?:string;summary?:string;instructions?:string;
 warningSigns?:string;followupPlan?:string;reconciliation?:A5Reconciliation;reviewedOn?:string;note?:string;}):Promise<string>{
 const uid=await ownerA5(input.personId);assertSource(input.source);ensureIn(input.disposition,allowedDispositions,'destino');
 const recon=input.reconciliation||'not_reported';ensureIn(recon,allowedRecon,'revisão de medicamentos');
 const ended=civil(input.dischargedOn),reviewed=civil(input.reviewedOn);let id='';
 await db.transaction('rw',[db.hospitalizations_a5,db.hospitalization_discharge_a5,db.syncQueue],async()=>{
  const ep=await episodeOwned(input.personId,input.hospitalizationId,uid);
  if(['planned','cancelled','discharged'].includes(ep.status))throw Error('Alta exige uma internação iniciada e ainda aberta.');
  if(ended&&ep.admitted_on&&ended<ep.admitted_on)throw Error('Alta anterior à admissão informada.');
  const prior=await db.hospitalization_discharge_a5.where('hospitalization_id').equals(ep.id).toArray();
  if(prior.some(x=>!x.deleted_at&&x.user_id===uid&&x.person_id===input.personId))throw Error('Já existe um registro de alta ativo.');
  const row:A5Discharge={...base(uid,input.personId),hospitalization_id:ep.id,disposition:input.disposition,
   source:input.source,summary:opt(input.summary,2500),instructions:opt(input.instructions,2500),
   warning_signs:opt(input.warningSigns,1000),followup_plan:opt(input.followupPlan,1500),
   medication_reconciliation_status:recon,reviewed_on:reviewed,note:opt(input.note,1000)};
  const next:A5Episode={...ep,status:'discharged',discharged_on:ended,discharged_at:null,
   updated_at:revised(ep.updated_at),synced:false};
  await db.hospitalizations_a5.put(next);await pending('hospitalizations_a5','update',next);
  await db.hospitalization_discharge_a5.add(row);await pending('hospitalization_discharge_a5','add',row);
  id=row.id;
 });notify();return id;
}
