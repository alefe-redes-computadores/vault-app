/** Only canonical A8 writer. M144 legacy remains unmodified/read-only. */
import {db} from '@/lib/db';
import {getLocalTodayISO} from '@/lib/health-utils';
import {getLocalFirstAuthUser} from '@/lib/supabase/local-auth';
import {enfileirarOperacao,solicitarProcessamentoSync} from '@/lib/sync/enfileirarOperacao';
import {validCivilDayA8,validUuidA8,type A8Base,type A8Course,type A8Event,type A8EffectiveKind,type A8Kind,type A8Source,type A8Table} from './types';
const stamp=()=>new Date().toISOString();
const id=()=>{if(!globalThis.crypto?.randomUUID)throw Error('Identificador seguro indisponível.');return crypto.randomUUID();};
const text=(value:unknown,max:number)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
async function scope(personId:string){
 const {data,error}=await getLocalFirstAuthUser();const uid=data.user?.id;
 if(error||!uid||!validUuidA8(personId))throw Error('Entre na conta e escolha uma pessoa.');
 const person=await db.persons.get(personId);if(!person||person.user_id!==uid)throw Error('Pessoa fora da conta atual.');
 return uid;
}
const base=(uid:string,pid:string):A8Base=>{const now=stamp();return {id:id(),user_id:uid,person_id:pid,created_at:now,updated_at:now,deleted_at:null,synced:false};};
async function queue(table:A8Table,operation:'add'|'update',row:A8Base){
 await enfileirarOperacao(table,operation,row as unknown as Record<string,unknown>,{dispatchSync:false});
}
export async function createVaccinationCourseA8(input:{personId:string;name:string;schemeNote?:string|null}):Promise<string>{
 const name=text(input.name,160),note=text(input.schemeNote,1600)||null;
 if(!name)throw Error('Informe o nome da vacina.');
 const uid=await scope(input.personId);const row:A8Course={...base(uid,input.personId),vaccine_name:name,scheme_note:note};
 await db.transaction('rw',[db.persons,db.vaccination_courses_a8,db.syncQueue],async()=>{
  const p=await db.persons.get(input.personId);if(!p||p.user_id!==uid)throw Error('Pessoa alterada durante o cadastro.');
  await db.vaccination_courses_a8.add(row);await queue('vaccination_courses_a8','add',row);
 });solicitarProcessamentoSync();return row.id;
}
export async function recordVaccinationA8(input:{personId:string;courseId:string;kind:'plan'|'dose';day:string;
 doseNumber?:number|null;manufacturer?:string|null;lot?:string|null;source:A8Source;
 sourceProfessionalId?:string|null;sourceLocationId?:string|null;note?:string|null;correctsEventId?:string|null;}):Promise<string>{
 if(!validCivilDayA8(input.day))throw Error('Informe uma data civil válida.');
 if(input.kind!=='plan'&&input.kind!=='dose')throw Error('Estado de vacinação inválido.');
 if(input.kind==='dose'&&input.day>getLocalTodayISO())throw Error('Aplicação informada não pode ter data futura. Registre como planejamento.');
 if(input.doseNumber!=null&&(!Number.isInteger(input.doseNumber)||input.doseNumber<1||input.doseNumber>99))throw Error('Número de dose inválido.');
 if(!['self_report','professional_document'].includes(input.source))throw Error('Fonte não reconhecida.');
 const uid=await scope(input.personId);
 const course=await db.vaccination_courses_a8.get(input.courseId);
 if(!course||course.user_id!==uid||course.person_id!==input.personId||course.deleted_at)throw Error('Vacina fora do perfil ativo.');
 if(input.sourceProfessionalId){const med=await db.medicos.get(input.sourceProfessionalId);if(!med||med.user_id!==uid)throw Error('Profissional fora da conta.');}
 if(input.sourceLocationId){const place=await db.locais.get(input.sourceLocationId);if(!place||place.user_id!==uid)throw Error('Unidade de saúde fora da conta.');}
 const target=input.correctsEventId?await db.vaccination_events_a8.get(input.correctsEventId):null;
 if(input.correctsEventId&&(!target||target.user_id!==uid||target.person_id!==input.personId||target.course_id!==input.courseId||target.deleted_at))
  throw Error('Registro de origem não pertence a esta pessoa.');
 const kind:A8Kind=target?'amendment':input.kind;const effective_kind:A8EffectiveKind=input.kind;
 const row:A8Event={...base(uid,input.personId),course_id:input.courseId,kind,effective_kind,
  planned_on:input.kind==='plan'?input.day:null,administered_on:input.kind==='dose'?input.day:null,
  dose_number:input.doseNumber??null,manufacturer:text(input.manufacturer,160)||null,lot:text(input.lot,100)||null,
  source:input.source,source_professional_id:input.sourceProfessionalId||null,source_location_id:input.sourceLocationId||null,note:text(input.note,2500)||null,
  corrects_event_id:target?.id||null};
 await db.transaction('rw',[db.persons,db.vaccination_courses_a8,db.vaccination_events_a8,db.medicos,db.locais,db.syncQueue],async()=>{
  const p=await db.persons.get(input.personId);const c=await db.vaccination_courses_a8.get(input.courseId);
  if(!p||p.user_id!==uid||!c||c.user_id!==uid||c.person_id!==input.personId||c.deleted_at)throw Error('Pessoa ou vacina mudou antes de salvar.');
  if(target){const nowTarget=await db.vaccination_events_a8.get(target.id);
   if(!nowTarget||nowTarget.user_id!==uid||nowTarget.person_id!==input.personId||nowTarget.course_id!==input.courseId||nowTarget.deleted_at)throw Error('Fato original não disponível.');
   const already=await db.vaccination_events_a8.where('corrects_event_id').equals(target.id).first();
   if(already)throw Error('Registro já retificado. Reabra o histórico antes de continuar.');}
  await db.vaccination_events_a8.add(row);await queue('vaccination_events_a8','add',row);
 });solicitarProcessamentoSync();return row.id;
}
/** Explicit negation event, not deletion of historical doses. */
export async function voidVaccinationEventA8(input:{personId:string;eventId:string;note:string}):Promise<string>{
 const uid=await scope(input.personId);const target=await db.vaccination_events_a8.get(input.eventId);
 if(!target||target.user_id!==uid||target.person_id!==input.personId||target.deleted_at)throw Error('Registro não encontrado neste perfil.');
 const current=await db.vaccination_events_a8.where('course_id').equals(target.course_id).toArray();
 if(current.some(e=>e.user_id===uid&&e.person_id===input.personId&&!e.deleted_at&&e.corrects_event_id===target.id))throw Error('Registro já foi retificado; atualize a tela.');
 const note=text(input.note,2500);if(!note)throw Error('Informe o motivo da retificação.');
 const row:A8Event={...base(uid,input.personId),course_id:target.course_id,kind:'void',effective_kind:'void',
  planned_on:null,administered_on:null,dose_number:null,manufacturer:null,lot:null,
  source:'self_report',source_professional_id:null,source_location_id:null,note,corrects_event_id:target.id};
 await db.transaction('rw',[db.vaccination_events_a8,db.syncQueue],async()=>{
  const previous=await db.vaccination_events_a8.get(target.id);
  if(!previous||previous.user_id!==uid||previous.person_id!==input.personId||previous.deleted_at)throw Error('Registro original indisponível.');
  await db.vaccination_events_a8.add(row);await queue('vaccination_events_a8','add',row);
 });solicitarProcessamentoSync();return row.id;
}
export async function retireVaccinationCourseA8(input:{personId:string;courseId:string}):Promise<void>{
 const uid=await scope(input.personId);let changed=false;
 await db.transaction('rw',[db.vaccination_courses_a8,db.syncQueue],async()=>{
  const prev=await db.vaccination_courses_a8.get(input.courseId);
  if(!prev||prev.user_id!==uid||prev.person_id!==input.personId)throw Error('Vacina fora da pessoa ativa.');
  if(prev.deleted_at)return;
  const now=new Date(Math.max(Date.now(),Date.parse(prev.updated_at)+1)).toISOString();
  const row:A8Course={...prev,deleted_at:now,updated_at:now,synced:false};
  await db.vaccination_courses_a8.put(row);await queue('vaccination_courses_a8','update',row);changed=true;
 });if(changed)solicitarProcessamentoSync();
}
