/** M5 MACRO2 — all writes on the existing M5 authority, never duplicate clinical facts. */
import { db } from '@/lib/db';
import { getLocalFirstAuthUser } from '@/lib/supabase/local-auth';
import { enfileirarOperacao, solicitarProcessamentoSync } from '@/lib/sync/enfileirarOperacao';
import type { RehabMilestoneM5, RehabModalityM5, RehabProgramM5, RehabSessionM5 } from './types';
import { validUuidM5, validLocalDateM5 } from './types';

const stamp=()=>new Date().toISOString();
const uuid=()=>crypto.randomUUID();
const clean=(value:unknown,max=1500)=>typeof value==='string'?value.trim().slice(0,max):'';
const next=(old:string)=>new Date(Math.max(Date.now(),Date.parse(old)+1)).toISOString();
const modalities:readonly RehabModalityM5[]=['motor_physiotherapy','occupational_therapy','hydrotherapy','speech_therapy','neurological','cardiopulmonary','other'];
async function scope(personId:string){
 const {data,error}=await getLocalFirstAuthUser();const uid=data.user?.id;
 if(error||!uid||!validUuidM5(personId))throw Error('Entre na conta e selecione uma pessoa.');
 const person=await db.persons.get(personId);
 if(!person||person.user_id!==uid)throw Error('Pessoa não pertence à conta.');
 return uid;
}
const assertScope=(row:{user_id:string;person_id:string;deleted_at?:string|null}|undefined,uid:string,pid:string)=>{
 if(!row||row.user_id!==uid||row.person_id!==pid||row.deleted_at)throw Error('Registro não pertence à pessoa selecionada ou foi removido.');
};
const queue=async(table:'rehab_programs_m5'|'rehab_sessions_m5'|'rehab_milestones_m5',operation:'add'|'update',row:Record<string,unknown>)=>
 enfileirarOperacao(table,operation,row,{dispatchSync:false});
const finish=()=>solicitarProcessamentoSync();

/** Save explicit classification without touching treatment/dose/history. */
export async function setRehabProgramContextM5(input:{personId:string;programId:string;modality:RehabModalityM5|null;
 primaryProfessionalId?:string|null;primaryFacilityId?:string|null;bodyRegion?:string|null;laterality?:RehabProgramM5['laterality']}){
 const uid=await scope(input.personId);
 if(input.modality!==null&&!modalities.includes(input.modality))throw Error('Modalidade inválida.');
 await db.transaction('rw',[db.rehab_programs_m5,db.medicos,db.locais,db.syncQueue],async()=>{
  const old=await db.rehab_programs_m5.get(input.programId);assertScope(old,uid,input.personId);
  if(old!.status==='completed'||old!.status==='interrupted')throw Error('Ciclo encerrado não pode ser alterado sem revisão.');
  if(input.primaryProfessionalId){const p=await db.medicos.get(input.primaryProfessionalId);if(!p||p.user_id!==uid)throw Error('Profissional não pertence à conta.');}
  if(input.primaryFacilityId){const l=await db.locais.get(input.primaryFacilityId);if(!l||l.user_id!==uid)throw Error('Clínica não pertence à conta.');}
  const row:RehabProgramM5={...old!,modality:input.modality,primary_professional_id:input.primaryProfessionalId||null,
   primary_facility_id:input.primaryFacilityId||null,body_region:input.bodyRegion===undefined?old!.body_region:clean(input.bodyRegion,100)||null,
   laterality:input.laterality===undefined?old!.laterality:input.laterality,
   updated_at:next(old!.updated_at),synced:false};
  await db.rehab_programs_m5.put(row);await queue('rehab_programs_m5','update',row as unknown as Record<string,unknown>);
 });finish();
}
/** Completion/discharge is a separate, auditable human declaration. */
export async function closeRehabProgramM5(input:{personId:string;programId:string;kind:'discharge'|'interruption';
 date:string;summary:string}){
 const uid=await scope(input.personId),summary=clean(input.summary,2000);
 if(!validLocalDateM5(input.date)||!summary)throw Error('Data civil e resumo factual obrigatórios.');
 await db.transaction('rw',[db.rehab_programs_m5,db.syncQueue],async()=>{
  const old=await db.rehab_programs_m5.get(input.programId);assertScope(old,uid,input.personId);
  if(old!.status==='completed'||old!.status==='interrupted')throw Error('Ciclo já finalizado. Não altere fatos anteriores.');
  if(old!.start_date&&input.date<old!.start_date)throw Error('Data anterior ao início do programa.');
  const row:RehabProgramM5={...old!,status:input.kind==='discharge'?'completed':'interrupted',
   discharged_at:input.kind==='discharge'?input.date:null,discharge_summary:input.kind==='discharge'?summary:null,
   interruption_reason:input.kind==='interruption'?summary:null,
   updated_at:next(old!.updated_at),synced:false};
  await db.rehab_programs_m5.put(row);await queue('rehab_programs_m5','update',row as unknown as Record<string,unknown>);
 });finish();
}
/** Pain is optional; null means not declared. Never calculate improvement or new diagnosis. */
export async function recordRehabSessionEvolutionM5(input:{personId:string;sessionId:string;
 proceduresNotes?:string|null;functionalNotes?:string|null;painBefore?:number|null;painAfter?:number|null;
 professionalId?:string|null;reminderOptIn?:boolean}){
 const uid=await scope(input.personId);
 const pain=(v:number|null|undefined)=>v==null?null:Number.isInteger(v)&&v>=0&&v<=10?v:NaN;
 if(Number.isNaN(pain(input.painBefore))||Number.isNaN(pain(input.painAfter)))throw Error('Dor deve ser número inteiro entre 0 e 10.');
 await db.transaction('rw',[db.rehab_sessions_m5,db.medicos,db.syncQueue],async()=>{
  const old=await db.rehab_sessions_m5.get(input.sessionId);assertScope(old,uid,input.personId);
  if(old!.status!=='performed')throw Error('Registre a realização explicitamente antes da evolução da sessão.');
  if(input.professionalId){const pro=await db.medicos.get(input.professionalId);if(!pro||pro.user_id!==uid)throw Error('Profissional fora da conta.');}
  const row:RehabSessionM5={...old!,procedures_notes:input.proceduresNotes===undefined?old!.procedures_notes||null:clean(input.proceduresNotes,2000)||null,
   functional_notes:input.functionalNotes===undefined?old!.functional_notes||null:clean(input.functionalNotes,2000)||null,
   pain_before:input.painBefore===undefined?old!.pain_before??null:pain(input.painBefore),
   pain_after:input.painAfter===undefined?old!.pain_after??null:pain(input.painAfter),
   professional_id:input.professionalId===undefined?old!.professional_id||null:input.professionalId||null,
   reminder_opt_in:input.reminderOptIn===undefined?old!.reminder_opt_in??false:input.reminderOptIn,
   updated_at:next(old!.updated_at),synced:false};
  await db.rehab_sessions_m5.put(row);await queue('rehab_sessions_m5','update',row as unknown as Record<string,unknown>);
 });finish();
}
/** Opt-in on a future appointment, without changing performed/missed/cancelled facts. */
export async function setRehabReminderOptInM5(personId:string,sessionId:string,enabled:boolean){
 const uid=await scope(personId);
 await db.transaction('rw',[db.rehab_sessions_m5,db.syncQueue],async()=>{
  const old=await db.rehab_sessions_m5.get(sessionId);assertScope(old,uid,personId);
  if(!['scheduled','confirmed'].includes(old!.status)&&enabled)throw Error('Somente sessão agendada aceita lembrete.');
  const row:RehabSessionM5={...old!,reminder_opt_in:enabled,updated_at:next(old!.updated_at),synced:false};
  await db.rehab_sessions_m5.put(row);await queue('rehab_sessions_m5','update',row as unknown as Record<string,unknown>);
 });finish();
}
export async function createRehabMilestoneM5(input:{personId:string;programId:string;sessionId?:string|null;
 kind:RehabMilestoneM5['kind'];source:RehabMilestoneM5['source'];recordedAt:string;notes:string;
 professionalId?:string|null;consultationId?:string|null;examOrderId?:string|null}):Promise<string>{
 const uid=await scope(input.personId),notes=clean(input.notes,2000);
 const at=new Date(input.recordedAt);
 if(!Number.isFinite(at.getTime())||!notes)throw Error('Data/hora e descrição factual são obrigatórias.');
 if(at.getTime()>Date.now()+5*60*1000)throw Error('Marco factual não pode ter data futura.');
 if(!['reassessment','reported_progress','clinical_clearance','exam_referral','functional_discharge'].includes(input.kind))throw Error('Tipo de marco inválido.');
 if(!['professional_reported','self_reported'].includes(input.source))throw Error('Origem do relato inválida.');
 if(input.source==='self_reported'&&input.professionalId)throw Error('Relato próprio não deve ser atribuído a profissional.');
 let result='';
 await db.transaction('rw',[db.rehab_programs_m5,db.rehab_sessions_m5,db.medicos,db.consultas,db.exam_orders,db.rehab_milestones_m5,db.syncQueue],async()=>{
  const parent=await db.rehab_programs_m5.get(input.programId);assertScope(parent,uid,input.personId);
  if(input.sessionId){const sess=await db.rehab_sessions_m5.get(input.sessionId);assertScope(sess,uid,input.personId);
   if(sess!.program_id!==input.programId)throw Error('Sessão não pertence ao ciclo.');}
  if(input.professionalId){const pro=await db.medicos.get(input.professionalId);if(!pro||pro.user_id!==uid)throw Error('Profissional fora da conta.');}
  if(input.consultationId){const c=await db.consultas.get(input.consultationId);if(!c||c.user_id!==uid||c.person_id!==input.personId)throw Error('Consulta fora da pessoa.');}
  if(input.examOrderId){const e=await db.exam_orders.get(input.examOrderId);assertScope(e,uid,input.personId);}
  const t=stamp(),row:RehabMilestoneM5={id:uuid(),user_id:uid,person_id:input.personId,program_id:input.programId,
   session_id:input.sessionId||null,kind:input.kind,source:input.source,recorded_at:at.toISOString(),notes,
   professional_id:input.professionalId||null,consultation_id:input.consultationId||null,
   exam_order_id:input.examOrderId||null,created_at:t,updated_at:t,deleted_at:null,synced:false};
  await db.rehab_milestones_m5.add(row);await queue('rehab_milestones_m5','add',row as unknown as Record<string,unknown>);result=row.id;
 });finish();return result;
}
export async function retireRehabMilestoneM5(personId:string,milestoneId:string){
 const uid=await scope(personId);let changed=false;
 await db.transaction('rw',[db.rehab_milestones_m5,db.syncQueue],async()=>{
  const old=await db.rehab_milestones_m5.get(milestoneId);assertScope(old,uid,personId);
  if(!old||old.deleted_at)return;
  const row:RehabMilestoneM5={...old,deleted_at:stamp(),updated_at:next(old.updated_at),synced:false};
  await db.rehab_milestones_m5.put(row);await queue('rehab_milestones_m5','update',row as unknown as Record<string,unknown>);changed=true;
 });if(changed)finish();
}
