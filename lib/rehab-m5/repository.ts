/** VAULT M5-REAB: local-first, person-scoped writes; never infer performed/rehabilitated. */
import { db } from '@/lib/db';
import { getLocalFirstAuthUser } from '@/lib/supabase/local-auth';
import { enfileirarOperacao, solicitarProcessamentoSync } from '@/lib/sync/enfileirarOperacao';
import type { RehabProgramM5, RehabProgramStatus, RehabTeamM5, RehabSessionM5,
 RehabSessionMode, RehabSessionStatus, RehabOriginM5, RehabOriginType,
 RehabSessionEventM5, RehabSessionTeamM5 } from './types';
import { validUuidM5, validLocalDateM5 } from './types';

const id=()=>{if(typeof crypto==='undefined'||!crypto.randomUUID)throw Error('Identificador seguro indisponível.');return crypto.randomUUID();};
const text=(value:unknown,limit=500)=>typeof value==='string'?value.trim().slice(0,limit):'';
const now=()=>new Date().toISOString();
function nextTimestamp(previous:string):string{
 const old=Date.parse(previous),current=Date.now();
 return new Date(Number.isFinite(old)?Math.max(current,old+1):current).toISOString();
}
async function owner(personId:string){
 const {data,error}=await getLocalFirstAuthUser();const uid=data.user?.id;
 if(error||!uid||!validUuidM5(personId))throw Error('Autenticação e pessoa válidas são obrigatórias.');
 const person=await db.persons.get(personId);
 if(person?.user_id!==uid)throw Error('Pessoa não pertence à conta autenticada.');
 return uid;
}
const assertOwned=(row:{user_id:string;person_id?:string}|undefined|null,uid:string,person:string)=>{
 if(!row||row.user_id!==uid||(row.person_id!==undefined&&row.person_id!==person))throw Error('Registro fora da pessoa/conta ativa.');
};
const checkDate=(d:string|null|undefined)=>{if(d&&!validLocalDateM5(d))throw Error('Data civil inválida.');};
const change=<T extends {id:string;updated_at:string;synced?:boolean}>(row:T):T=>({...row,updated_at:nextTimestamp(row.updated_at),synced:false});
async function queue(table:Parameters<typeof enfileirarOperacao>[0],operation:'add'|'update',row:Record<string,unknown>){
 await enfileirarOperacao(table,operation,row,{dispatchSync:false});
}
function notify(){solicitarProcessamentoSync();}
export async function createRehabProgramM5(input:{personId:string;title:string;specialty?:string;functionalGoal?:string;bodyRegion?:string;
 laterality?:RehabProgramM5['laterality'];startDate?:string;expectedEndDate?:string}):Promise<string>{
 const uid=await owner(input.personId),title=text(input.title,120);
 if(!title)throw Error('Informe o nome do programa.');checkDate(input.startDate);checkDate(input.expectedEndDate);
 if(input.startDate&&input.expectedEndDate&&input.expectedEndDate<input.startDate)throw Error('Término antes do início.');
 const stamp=now();const row:RehabProgramM5={id:id(),user_id:uid,person_id:input.personId,
  title,specialty:text(input.specialty,100)||null,functional_goal:text(input.functionalGoal,1000)||null,
  body_region:text(input.bodyRegion,100)||null,laterality:input.laterality||null,
  status:'planned',start_date:input.startDate||null,expected_end_date:input.expectedEndDate||null,
  created_at:stamp,updated_at:stamp,deleted_at:null,synced:false};
 await db.transaction('rw',db.rehab_programs_m5,db.syncQueue,async()=>{
  await db.rehab_programs_m5.add(row);await queue('rehab_programs_m5','add',row as unknown as Record<string,unknown>);
 });notify();return row.id;
}
export async function updateRehabProgramM5(input:{personId:string;id:string;title?:string;functionalGoal?:string;
 specialty?:string;status?:RehabProgramStatus;expectedEndDate?:string|null}):Promise<void>{
 const uid=await owner(input.personId);let changed=false;
 await db.transaction('rw',db.rehab_programs_m5,db.syncQueue,async()=>{
  const old=await db.rehab_programs_m5.get(input.id);assertOwned(old,uid,input.personId);
  if(!old||old.deleted_at)throw Error('Programa indisponível.');
  const next=change({...old,title:input.title===undefined?old.title:text(input.title,120),
   functional_goal:input.functionalGoal===undefined?old.functional_goal:text(input.functionalGoal,1000)||null,
   specialty:input.specialty===undefined?old.specialty:text(input.specialty,100)||null,
   status:input.status??old.status,
   expected_end_date:input.expectedEndDate===undefined?old.expected_end_date:input.expectedEndDate});
  if(!next.title)throw Error('Título obrigatório.');checkDate(next.expected_end_date);
  if(next.start_date&&next.expected_end_date&&next.expected_end_date<next.start_date)throw Error('Datas inconsistentes.');
  await db.rehab_programs_m5.put(next);await queue('rehab_programs_m5','update',next as unknown as Record<string,unknown>);changed=true;
 });if(changed)notify();
}
export async function assignRehabProfessionalM5(input:{personId:string;programId:string;professionalId:string;role:string}):Promise<string>{
 const uid=await owner(input.personId);let result='',changed=false;
 if(!validUuidM5(input.professionalId)||!text(input.role,80))throw Error('Profissional e papel obrigatórios.');
 await db.transaction('rw',db.rehab_programs_m5,db.medicos,db.rehab_program_team_m5,db.syncQueue,async()=>{
  const program=await db.rehab_programs_m5.get(input.programId),pro=await db.medicos.get(input.professionalId);
  assertOwned(program,uid,input.personId);if(!pro||pro.user_id!==uid||!program||program.deleted_at)throw Error('Equipe fora da conta.');
  const team=await db.rehab_program_team_m5.where('program_id').equals(input.programId).toArray();
  const existing=team.find(r=>!r.deleted_at&&r.user_id===uid&&r.person_id===input.personId&&r.professional_id===input.professionalId&&r.role===input.role);
  if(existing){result=existing.id;return;}
  const stamp=now();const row:RehabTeamM5={id:id(),user_id:uid,person_id:input.personId,
   program_id:input.programId,professional_id:input.professionalId,role:text(input.role,80),start_date:null,end_date:null,
   created_at:stamp,updated_at:stamp,deleted_at:null,synced:false};
  await db.rehab_program_team_m5.add(row);await queue('rehab_program_team_m5','add',row as unknown as Record<string,unknown>);result=row.id;changed=true;
 });if(changed)notify();return result;
}
export async function scheduleRehabSessionM5(input:{personId:string;programId:string;scheduledAt:string;timezone:string;
 mode:RehabSessionMode;localId?:string;hospitalId?:string;placeNote?:string;notes?:string}):Promise<string>{
 const uid=await owner(input.personId);const d=new Date(input.scheduledAt);
 if(!Number.isFinite(d.getTime())||!/^[-_A-Za-z]+\/[A-Za-z_\/]+$|^UTC$/.test(input.timezone))throw Error('Data/hora ou fuso inválidos.');
 if(input.localId&&input.hospitalId)throw Error('Escolha clínica ou hospital, não ambos.');
 if((input.mode==='home')&&(input.localId||input.hospitalId))throw Error('Domicílio não deve inventar clínica/hospital.');
 let result='';
 await db.transaction('rw',[db.rehab_programs_m5,db.locais,db.hospitais,db.rehab_sessions_m5,db.rehab_session_events_m5,db.syncQueue],async()=>{
  const program=await db.rehab_programs_m5.get(input.programId);assertOwned(program,uid,input.personId);
  if(!program||program.deleted_at)throw Error('Programa não existe.');
  if(input.localId){const local=await db.locais.get(input.localId);if(!local||local.user_id!==uid)throw Error('Local fora da conta.');}
  if(input.hospitalId){const hospital=await db.hospitais.get(input.hospitalId);if(!hospital||hospital.user_id!==uid)throw Error('Hospital fora da conta.');}
  const stamp=now();const row:RehabSessionM5={id:id(),user_id:uid,person_id:input.personId,program_id:input.programId,
   scheduled_at:d.toISOString(),timezone:input.timezone,status:'scheduled',mode:input.mode,
   local_id:input.localId||null,hospital_id:input.hospitalId||null,place_note:text(input.placeNote,240)||null,notes:text(input.notes,500)||null,
   created_at:stamp,updated_at:stamp,deleted_at:null,synced:false};
  const event:RehabSessionEventM5={id:id(),user_id:uid,person_id:input.personId,session_id:row.id,
   action:'scheduled',from_at:null,to_at:row.scheduled_at,from_status:null,to_status:'scheduled',note:null,
   created_at:stamp,updated_at:stamp,deleted_at:null,synced:false};
  await db.rehab_sessions_m5.add(row);await db.rehab_session_events_m5.add(event);
  await queue('rehab_sessions_m5','add',row as unknown as Record<string,unknown>);
  await queue('rehab_session_events_m5','add',event as unknown as Record<string,unknown>);result=row.id;
 });notify();return result;
}
export async function changeRehabSessionM5(input:{personId:string;id:string;status?:RehabSessionStatus;scheduledAt?:string;note?:string}):Promise<void>{
 const uid=await owner(input.personId);let done=false;
 await db.transaction('rw',db.rehab_sessions_m5,db.rehab_session_events_m5,db.syncQueue,async()=>{
  const old=await db.rehab_sessions_m5.get(input.id);assertOwned(old,uid,input.personId);
  if(!old||old.deleted_at)throw Error('Sessão indisponível.');
  if(old.status==='performed'&&input.scheduledAt)throw Error('Sessão realizada não pode ser remarcada.');
  if(input.status&&input.scheduledAt)throw Error('Altere status ou remarcação em ações separadas.');
  const date=input.scheduledAt?new Date(input.scheduledAt):null;
  if(date&&!Number.isFinite(date.getTime()))throw Error('Nova data/hora inválida.');
  if(date&&date.toISOString()===old.scheduled_at)return;
  if(input.status===old.status&&!date)return;
  if(!date&&!input.status)throw Error('Selecione uma alteração explícita.');
  const stamp=nextTimestamp(old.updated_at);const next:RehabSessionM5={...old,status:input.status||old.status,
   scheduled_at:date?.toISOString()||old.scheduled_at,updated_at:stamp,synced:false};
  const event:RehabSessionEventM5={id:id(),user_id:uid,person_id:input.personId,session_id:old.id,
   action:date?'rescheduled':'status_changed',from_at:old.scheduled_at,to_at:next.scheduled_at,
   from_status:old.status,to_status:next.status,note:text(input.note,500)||null,
   created_at:stamp,updated_at:stamp,deleted_at:null,synced:false};
  await db.rehab_sessions_m5.put(next);await db.rehab_session_events_m5.add(event);
  await queue('rehab_sessions_m5','update',next as unknown as Record<string,unknown>);
  await queue('rehab_session_events_m5','add',event as unknown as Record<string,unknown>);done=true;
 });if(done)notify();
}
export async function addRehabSessionProfessionalM5(input:{personId:string;sessionId:string;teamId:string}):Promise<string>{
 const uid=await owner(input.personId);let result='',changed=false;
 await db.transaction('rw',db.rehab_sessions_m5,db.rehab_program_team_m5,db.rehab_session_team_m5,db.syncQueue,async()=>{
  const session=await db.rehab_sessions_m5.get(input.sessionId),team=await db.rehab_program_team_m5.get(input.teamId);
  assertOwned(session,uid,input.personId);assertOwned(team,uid,input.personId);
  if(!session||!team||session.deleted_at||team.deleted_at||session.program_id!==team.program_id)throw Error('Equipe não pertence à sessão.');
  const all=await db.rehab_session_team_m5.where('session_id').equals(session.id).toArray();
  const found=all.find(x=>!x.deleted_at&&x.user_id===uid&&x.person_id===input.personId&&x.program_team_id===team.id);
  if(found){result=found.id;return;}
  const stamp=now();const row:RehabSessionTeamM5={id:id(),user_id:uid,person_id:input.personId,session_id:session.id,
   program_team_id:team.id,created_at:stamp,updated_at:stamp,deleted_at:null,synced:false};
  await db.rehab_session_team_m5.add(row);await queue('rehab_session_team_m5','add',row as unknown as Record<string,unknown>);result=row.id;changed=true;
 });if(changed)notify();return result;
}
export async function addRehabOriginM5(input:{personId:string;programId:string;type:RehabOriginType;originId:string;note?:string}):Promise<string>{
 const uid=await owner(input.personId);let result='',changed=false;
 if(!validUuidM5(input.originId)||!['consulta','cirurgia','tratamento'].includes(input.type))throw Error('Vínculo de origem inválido.');
 await db.transaction('rw',[db.rehab_programs_m5,db.consultas,db.cirurgias,db.tratamentos,db.rehab_origin_links_m5,db.syncQueue],async()=>{
  const program=await db.rehab_programs_m5.get(input.programId);assertOwned(program,uid,input.personId);
  if(!program||program.deleted_at)throw Error('Programa indisponível.');
  const target=input.type==='consulta'?await db.consultas.get(input.originId):input.type==='cirurgia'?await db.cirurgias.get(input.originId):await db.tratamentos.get(input.originId);
  assertOwned(target,uid,input.personId);
  // Legacy rows with missing person_id cannot establish an explicit clinical origin.
  if(!target||target.person_id!==input.personId)throw Error('Origem sem pessoa comprovada.');
  const all=await db.rehab_origin_links_m5.where('program_id').equals(program.id).toArray();
  const found=all.find(x=>!x.deleted_at&&x.user_id===uid&&x.person_id===input.personId&&x.origin_type===input.type&&x.origin_id===input.originId);
  if(found){result=found.id;return;}
  const stamp=now();const row:RehabOriginM5={id:id(),user_id:uid,person_id:input.personId,program_id:program.id,
   origin_type:input.type,origin_id:input.originId,note:text(input.note,300)||null,
   created_at:stamp,updated_at:stamp,deleted_at:null,synced:false};
  await db.rehab_origin_links_m5.add(row);await queue('rehab_origin_links_m5','add',row as unknown as Record<string,unknown>);result=row.id;changed=true;
 });if(changed)notify();return result;
}
export async function unlinkRehabOriginM5(personId:string,id:string){
 const uid=await owner(personId);let changed=false;
 await db.transaction('rw',db.rehab_origin_links_m5,db.syncQueue,async()=>{
  const old=await db.rehab_origin_links_m5.get(id);assertOwned(old,uid,personId);
  if(!old||old.deleted_at)return;
  const next=change({...old,deleted_at:nextTimestamp(old.updated_at)});await db.rehab_origin_links_m5.put(next);
  await queue('rehab_origin_links_m5','update',next as unknown as Record<string,unknown>);changed=true;
 });if(changed)notify();
}
