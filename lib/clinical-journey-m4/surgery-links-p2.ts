/** M4 P2: ligações humanas entre Consultas e Cirurgias canônicas; tombstones, sem inferência de datas. */
import { db } from '@/lib/db';
import { getLocalFirstAuthUser } from '@/lib/supabase/local-auth';
import { enfileirarOperacao, solicitarProcessamentoSync } from '@/lib/sync/enfileirarOperacao';

export type SurgeryConsultationRoleM4P2='preoperative'|'postoperative'|'return_visit'|'supporting';
export type SurgeryConsultationLinkM4P2={
  id:string;user_id:string;person_id:string;cirurgia_id:string;consulta_id:string;
  role:SurgeryConsultationRoleM4P2;note:string|null;created_at:string;updated_at:string;
  deleted_at:string|null;synced?:boolean;
};
export const SURGERY_CONSULTATION_ROLES_M4P2: readonly {id:SurgeryConsultationRoleM4P2;label:string}[]=[
 {id:'preoperative',label:'Preparação / pré-operatório'},
 {id:'postoperative',label:'Pós-operatório'},
 {id:'return_visit',label:'Retorno'},
 {id:'supporting',label:'Consulta relacionada'},
] as const;
const roles=new Set<string>(SURGERY_CONSULTATION_ROLES_M4P2.map(x=>x.id));
const uuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const makeId=()=>{if(typeof crypto==='undefined'||!crypto.randomUUID)throw Error('Identificador seguro indisponível.');return crypto.randomUUID();};
async function owner(personId:string):Promise<string>{
 const {data,error}=await getLocalFirstAuthUser();const uid=data.user?.id;
 if(error||!uid||!uuid(personId))throw Error('Conta e pessoa autenticadas são obrigatórias.');
 const person=await db.persons.get(personId);
 if(!person||person.user_id!==uid)throw Error('Pessoa fora da conta autenticada.');
 return uid;
}
export async function linkSurgeryConsultationM4P2(input:{personId:string;cirurgiaId:string;consultaId:string;role:SurgeryConsultationRoleM4P2;note?:string|null}):Promise<string>{
 const {personId,cirurgiaId,consultaId,role}=input;
 if(!uuid(cirurgiaId)||!uuid(consultaId)||!roles.has(role))throw Error('Seleção clínica inválida.');
 const uid=await owner(personId);let result='';let changed=false;
 await db.transaction('rw',db.persons,db.cirurgias,db.consultas,db.surgery_consultation_links_m4,db.syncQueue,async()=>{
  const person=await db.persons.get(personId),s=await db.cirurgias.get(cirurgiaId),c=await db.consultas.get(consultaId);
  if(person?.user_id!==uid||s?.user_id!==uid||s.person_id!==personId||c?.user_id!==uid||c.person_id!==personId)
   throw Error('Cirurgia ou consulta não pertence à pessoa ativa.');
  const all=await db.surgery_consultation_links_m4.where('cirurgia_id').equals(cirurgiaId).toArray();
  const live=all.find(row=>!row.deleted_at&&row.user_id===uid&&row.person_id===personId&&row.consulta_id===consultaId&&row.role===role);
  if(live){result=live.id;return;}
  const now=new Date().toISOString();const row:SurgeryConsultationLinkM4P2={id:makeId(),user_id:uid,person_id:personId,
   cirurgia_id:cirurgiaId,consulta_id:consultaId,role,note:input.note?.trim().slice(0,500)||null,
   created_at:now,updated_at:now,deleted_at:null,synced:false};
  await db.surgery_consultation_links_m4.add(row);
  await enfileirarOperacao('surgery_consultation_links_m4','add',row,{dispatchSync:false});
  result=row.id;changed=true;
 });
 if(changed)solicitarProcessamentoSync();
 return result;
}
export async function unlinkSurgeryConsultationM4P2(input:{personId:string;id:string}):Promise<void>{
 const uid=await owner(input.personId);if(!uuid(input.id))throw Error('Vínculo inválido.');let changed=false;
 await db.transaction('rw',db.surgery_consultation_links_m4,db.syncQueue,async()=>{
  const old=await db.surgery_consultation_links_m4.get(input.id);
  if(!old||old.user_id!==uid||old.person_id!==input.personId)throw Error('Vínculo não pertence à pessoa ativa.');
  if(old.deleted_at)return;
  const now=new Date().toISOString();const next={...old,deleted_at:now,updated_at:now,synced:false};
  await db.surgery_consultation_links_m4.put(next);
  await enfileirarOperacao('surgery_consultation_links_m4','update',next,{dispatchSync:false});changed=true;
 });
 if(changed)solicitarProcessamentoSync();
}
