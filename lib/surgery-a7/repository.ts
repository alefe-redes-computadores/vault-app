/** A7: sole surgical-journey writer. Canonical `cirurgias` remains the procedure identity. */
import {db} from '@/lib/db';
import {getLocalFirstAuthUser} from '@/lib/supabase/local-auth';
import {enfileirarOperacao,solicitarProcessamentoSync} from '@/lib/sync/enfileirarOperacao';
import {A7_EVENT_LABEL,A7_STAGE_FOR_KIND,A7_TOPICS_BY_STAGE,validDayA7,validUuidA7,type A7Topic,type A7Base,type A7Event,type A7EventKind,type A7Source,type A7Stage,type A7Table,type A7Team} from './types';
const stamp=()=>new Date().toISOString();
const freshId=()=>{if(typeof crypto==='undefined'||typeof crypto.randomUUID!=='function')throw Error('Identificador seguro indisponível.');return crypto.randomUUID();};
const clean=(s:unknown,max:number)=>typeof s==='string'?s.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
const sourceOptions:readonly A7Source[]=['self_report','professional_document'];
const kindOptions:readonly A7EventKind[]=['preparation_note','procedure_note','recovery_note','return_note','correction'];
const stageOptions:readonly A7Stage[]=['pre','procedure','post','return'];
async function scope(personId:string){
 const {data,error}=await getLocalFirstAuthUser();const uid=data.user?.id;
 if(error||!uid||!validUuidA7(personId))throw Error('Conta e pessoa autenticadas são necessárias.');
 const person=await db.persons.get(personId);if(person?.user_id!==uid)throw Error('Pessoa fora da conta atual.');
 return uid;
}
async function ownedSurgery(uid:string,pid:string,sid:string){
 if(!validUuidA7(sid))throw Error('Identificador de cirurgia inválido.');
 const surgery=await db.cirurgias.get(sid);
 if(!surgery||surgery.user_id!==uid||surgery.person_id!==pid)throw Error('Cirurgia não pertence à pessoa ativa.');
 return surgery;
}
async function ownedProfessional(uid:string,id:string){
 if(!validUuidA7(id))throw Error('Selecione um profissional válido.');
 const professional=await db.medicos.get(id);
 if(!professional||professional.user_id!==uid)throw Error('Profissional de outra conta.');
 return professional;
}
const record=(uid:string,pid:string,sid:string):A7Base=>{const now=stamp();return {id:freshId(),user_id:uid,person_id:pid,cirurgia_id:sid,created_at:now,updated_at:now,deleted_at:null,synced:false};};
const enqueue=async(table:A7Table,action:'add'|'update',row:A7Base)=>{
 await enfileirarOperacao(table,action,row as unknown as Record<string,unknown>,{dispatchSync:false});
};
export async function addSurgeryJourneyEventA7(input:{personId:string;surgeryId:string;kind:A7EventKind;source:A7Source;title:string;description:string;occurredOn?:string|null;professionalId?:string|null;correctsEventId?:string|null;topic?:A7Topic|null;}):Promise<string>{
 if(!kindOptions.includes(input.kind)||!sourceOptions.includes(input.source))throw Error('Natureza ou origem do registro inválida.');
 const title=clean(input.title,170),description=clean(input.description,4000);
 if(!title||!description)throw Error('Informe título e descrição do fato registrado.');
 const day=input.occurredOn||null;if(day&&!validDayA7(day))throw Error('Data do fato inválida.');
 if(input.kind==='correction'&&!input.correctsEventId||input.kind!=='correction'&&input.correctsEventId)throw Error('Retificação exige referência ao fato original.');
 const uid=await scope(input.personId);await ownedSurgery(uid,input.personId,input.surgeryId);
 if(input.professionalId)await ownedProfessional(uid,input.professionalId);
 const target=input.correctsEventId?await db.surgery_journey_events_a7.get(input.correctsEventId):null;
 if(input.kind==='correction'&&(!target||target.user_id!==uid||target.person_id!==input.personId||target.cirurgia_id!==input.surgeryId||target.deleted_at||target.kind==='correction'))throw Error('Fato original fora desta cirurgia.');
 const stage:A7Stage=target?.stage||(A7_STAGE_FOR_KIND[input.kind]);
 if(!stageOptions.includes(stage))throw Error('Etapa inválida.');
 const topic=target?(target.topic??null):(input.topic??null);
 if(topic&&!A7_TOPICS_BY_STAGE[stage].includes(topic))throw Error('Tema incompatível com a etapa informada');
 const row:A7Event={...record(uid,input.personId,input.surgeryId),stage,kind:input.kind,source:input.source,occurred_on:day,topic,
  title,description,source_professional_id:input.professionalId||null,corrects_event_id:target?.id||null};
 await db.transaction('rw',[db.persons,db.cirurgias,db.medicos,db.surgery_journey_events_a7,db.syncQueue],async()=>{
  await ownedSurgery(uid,input.personId,input.surgeryId);
  if(input.professionalId)await ownedProfessional(uid,input.professionalId);
  if(target){const still=await db.surgery_journey_events_a7.get(target.id);if(!still||still.user_id!==uid||still.person_id!==input.personId||still.cirurgia_id!==input.surgeryId||still.deleted_at)throw Error('Fato original não disponível.');}
  await db.surgery_journey_events_a7.add(row);await enqueue('surgery_journey_events_a7','add',row);
 });
 solicitarProcessamentoSync();return row.id;
}
export async function linkSurgeryTeamA7(input:{personId:string;surgeryId:string;professionalId:string;role:string;source:A7Source;note?:string|null}):Promise<string>{
 if(!sourceOptions.includes(input.source))throw Error('Origem inválida.');const role=clean(input.role,120);if(!role)throw Error('Informe a função documentada.');
 const uid=await scope(input.personId);await ownedSurgery(uid,input.personId,input.surgeryId);await ownedProfessional(uid,input.professionalId);
 let id='',changed=false;
 await db.transaction('rw',[db.persons,db.cirurgias,db.medicos,db.surgery_team_a7,db.syncQueue],async()=>{
  await ownedSurgery(uid,input.personId,input.surgeryId);await ownedProfessional(uid,input.professionalId);
  const all=await db.surgery_team_a7.where('cirurgia_id').equals(input.surgeryId).toArray();
  const same=all.find(row=>row.user_id===uid&&row.person_id===input.personId&&!row.deleted_at&&row.professional_id===input.professionalId&&row.role.toLocaleLowerCase('pt-BR')===role.toLocaleLowerCase('pt-BR'));
  if(same){id=same.id;return;}
  const row:A7Team={...record(uid,input.personId,input.surgeryId),professional_id:input.professionalId,role,source:input.source,note:clean(input.note,1200)||null};
  await db.surgery_team_a7.add(row);await enqueue('surgery_team_a7','add',row);id=row.id;changed=true;
 });if(changed)solicitarProcessamentoSync();return id;
}
export async function unlinkSurgeryTeamA7(input:{personId:string;teamId:string}):Promise<void>{
 const uid=await scope(input.personId);if(!validUuidA7(input.teamId))throw Error('Vínculo inválido.');let changed=false;
 await db.transaction('rw',[db.surgery_team_a7,db.syncQueue],async()=>{
  const old=await db.surgery_team_a7.get(input.teamId);
  if(!old||old.user_id!==uid||old.person_id!==input.personId)throw Error('Vínculo fora da pessoa ativa.');
  if(old.deleted_at)return;
  const now=new Date(Math.max(Date.now(),Date.parse(old.updated_at)+1)).toISOString();
  const next:A7Team={...old,deleted_at:now,updated_at:now,synced:false};
  await db.surgery_team_a7.put(next);await enqueue('surgery_team_a7','update',next);changed=true;
 });if(changed)solicitarProcessamentoSync();
}
export {A7_EVENT_LABEL};
