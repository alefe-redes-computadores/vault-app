/** One writer for relationships only; surgery/A9/M5 clinical facts retain their own writers. */
import {db} from '@/lib/db';
import {getLocalFirstAuthUser} from '@/lib/supabase/local-auth';
import {enfileirarOperacao,solicitarProcessamentoSync} from '@/lib/sync/enfileirarOperacao';
import {activeEvidenceA7M5,cleanContinuity,validUuidContinuity,
 type ContinuityBase,type SurgicalIntentA7M5,type SurgicalIntentStatus,type SurgeryEvidenceLinkA7M5,
 type ContinuitySource,type EvidenceTarget,type SurgicalStage} from './types';
const newId=()=>{if(!globalThis.crypto?.randomUUID)throw Error('Identificador seguro indisponível');return crypto.randomUUID();};
const base=(uid:string,pid:string):ContinuityBase=>{
 const at=new Date().toISOString();return {id:newId(),user_id:uid,person_id:pid,created_at:at,updated_at:at,deleted_at:null,synced:false};
};
const allowedSource=(x:ContinuitySource)=>x==='self_report'||x==='professional_document';
const assertId=(id:string)=>{if(!validUuidContinuity(id))throw Error('Identificador clínico inválido');};
async function owner(pid:string){assertId(pid);const {data,error}=await getLocalFirstAuthUser();const uid=data.user?.id||'';if(error||!validUuidContinuity(uid))throw Error('Faça login para registrar vínculos');
 const person=await db.persons.get(pid);if(person?.user_id!==uid)throw Error('Pessoa diferente da conta selecionada');return uid;
}
/**
 * Dexie aceita entidades legadas cujo id é opcional na tipagem (Medicamento,
 * RegistroSaude), mesmo quando a chave primária persistida é obrigatória.
 * A fronteira é unknown; a posse é validada em runtime ANTES do cast para T.
 * PromiseLike suporta o PromiseExtended de todas as Table<T> sem variância falsa.
 */
type OwnedRecordA7M5={id?:string|null;user_id?:string|null;person_id?:string|null;deleted_at?:string|null};
async function owns<T extends OwnedRecordA7M5=OwnedRecordA7M5>(
 table:{get(id:string):PromiseLike<unknown>},id:string,uid:string,pid:string,personScoped=true):Promise<T>{
 assertId(id);
 const raw:unknown=await table.get(id);
 if(!raw||typeof raw!=='object')throw Error('Vínculo ausente ou fora da conta/pessoa');
 const x=raw as OwnedRecordA7M5;
 if(x.id!==id||x.user_id!==uid||(personScoped&&x.person_id!==pid)||x.deleted_at)
  throw Error('Vínculo ausente ou fora da conta/pessoa');
 return raw as T;
}
const statusList:readonly SurgicalIntentStatus[]=['requested','under_review','scheduled','withdrawn'];
export type SaveIntentA7M5={personId:string;title:string;status:SurgicalIntentStatus;source:ContinuitySource;note?:string;
 consultationId?:string|null;professionalId?:string|null;linkedSurgeryId?:string|null;correctsId?:string|null};
/** A consulted person never implicitly gets an intent: this API runs on explicit user submit. */
export async function saveSurgicalIntentA7M5(input:SaveIntentA7M5):Promise<string>{
 const uid=await owner(input.personId),title=cleanContinuity(input.title,180);
 if(!title||!statusList.includes(input.status)||!allowedSource(input.source))throw Error('Informações do encaminhamento inválidas');
 if(input.status==='scheduled'&&!input.linkedSurgeryId)throw Error('Vincule uma cirurgia real antes de indicar agendamento');
 if(input.consultationId)await owns(db.consultas,input.consultationId,uid,input.personId);
 if(input.professionalId)await owns(db.medicos,input.professionalId,uid,input.personId,false);
 if(input.linkedSurgeryId)await owns(db.cirurgias,input.linkedSurgeryId,uid,input.personId);
 const old=input.correctsId?await owns<SurgicalIntentA7M5>(db.surgical_intents_a7m5,input.correctsId,uid,input.personId):null;
 const row:SurgicalIntentA7M5={...base(uid,input.personId),title,status:input.status,source:input.source,
  source_consultation_id:input.consultationId||null,source_professional_id:input.professionalId||null,
  linked_surgery_id:input.linkedSurgeryId||null,note:cleanContinuity(input.note,2500)||null,corrects_intent_id:old?.id||null};
 await db.transaction('rw',[db.persons,db.consultas,db.medicos,db.cirurgias,db.surgical_intents_a7m5,db.syncQueue],async()=>{
  const person=await db.persons.get(input.personId);if(person?.user_id!==uid)throw Error('Titular alterado durante o salvamento');
  if(input.consultationId)await owns(db.consultas,input.consultationId,uid,input.personId);
  if(input.professionalId)await owns(db.medicos,input.professionalId,uid,input.personId,false);
  if(input.linkedSurgeryId)await owns(db.cirurgias,input.linkedSurgeryId,uid,input.personId);
  if(old){await owns(db.surgical_intents_a7m5,old.id,uid,input.personId);
   if(await db.surgical_intents_a7m5.where('corrects_intent_id').equals(old.id).first())throw Error('Encaminhamento já foi atualizado; reabra o registro');}
  await db.surgical_intents_a7m5.add(row);
  await enfileirarOperacao('surgical_intents_a7m5','add',row,{dispatchSync:false});
 });solicitarProcessamentoSync();return row.id;
}
const targets:Record<EvidenceTarget,'procedure_events_a9'|'exam_orders'|'medicamentos'|'registros_saude'>={
 procedure_event_a9:'procedure_events_a9',exam_order:'exam_orders',medication:'medicamentos',health_record:'registros_saude'};
const stages:readonly SurgicalStage[]=['pre','procedure','post','return'];
export type LinkEvidenceA7M5={personId:string;surgeryId:string;targetType:EvidenceTarget;targetId:string;stage:SurgicalStage;source:ContinuitySource;note?:string};
export async function linkEvidenceToSurgeryA7M5(input:LinkEvidenceA7M5):Promise<string>{
 const uid=await owner(input.personId);if(!targets[input.targetType]||!stages.includes(input.stage)||!allowedSource(input.source))throw Error('Tipo de vínculo inválido');
 await owns(db.cirurgias,input.surgeryId,uid,input.personId);
 const table=db[targets[input.targetType]];
 await owns(table,input.targetId,uid,input.personId);
 let result='';let created=false;
 await db.transaction('rw',[db.persons,db.cirurgias,table,db.surgery_evidence_links_a7m5,db.syncQueue],async()=>{
  await owns(db.cirurgias,input.surgeryId,uid,input.personId);await owns(table,input.targetId,uid,input.personId);
  const existing=await db.surgery_evidence_links_a7m5.where('[user_id+person_id+surgery_id]').equals([uid,input.personId,input.surgeryId]).toArray();
  const active=activeEvidenceA7M5(existing,uid,input.personId,input.surgeryId)
   .find(x=>x.target_type===input.targetType&&x.target_id===input.targetId);
  if(active){result=active.id;return;}
  const row:SurgeryEvidenceLinkA7M5={...base(uid,input.personId),surgery_id:input.surgeryId,
   target_type:input.targetType,target_id:input.targetId,stage:input.stage,source:input.source,
   note:cleanContinuity(input.note,1000)||null,action:'link',corrects_link_id:null};
  await db.surgery_evidence_links_a7m5.add(row);
  await enfileirarOperacao('surgery_evidence_links_a7m5','add',row,{dispatchSync:false});
  result=row.id;created=true;
 });if(created)solicitarProcessamentoSync();return result;
}
export async function unlinkEvidenceA7M5(input:{personId:string;linkId:string;reason:string}):Promise<string>{
 const uid=await owner(input.personId),reason=cleanContinuity(input.reason,1000);if(!reason)throw Error('Informe o motivo do desvínculo');
 const old=await owns<SurgeryEvidenceLinkA7M5>(db.surgery_evidence_links_a7m5,input.linkId,uid,input.personId);
 if(old.action!=='link')throw Error('Registro não está ativo');
 const row:SurgeryEvidenceLinkA7M5={...base(uid,input.personId),surgery_id:old.surgery_id,
  target_type:old.target_type,target_id:old.target_id,stage:old.stage,source:'self_report',
  note:reason,action:'unlink',corrects_link_id:old.id};
 await db.transaction('rw',[db.surgery_evidence_links_a7m5,db.syncQueue],async()=>{
  await owns(db.surgery_evidence_links_a7m5,old.id,uid,input.personId);
  if(await db.surgery_evidence_links_a7m5.where('corrects_link_id').equals(old.id).first())throw Error('Vínculo já encerrado');
  await db.surgery_evidence_links_a7m5.add(row);
  await enfileirarOperacao('surgery_evidence_links_a7m5','add',row,{dispatchSync:false});
 });solicitarProcessamentoSync();return row.id;
}
