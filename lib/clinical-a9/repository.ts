/** A9 single writer: historical corrections, account/person scope, no duplicate procedure catalog. */
import {db} from '@/lib/db';
import {getLocalTodayISO} from '@/lib/health-utils';
import {getLocalFirstAuthUser} from '@/lib/supabase/local-auth';
import {enfileirarOperacao,solicitarProcessamentoSync} from '@/lib/sync/enfileirarOperacao';
import {validUuidA8} from '@/lib/vaccination-a8/types';
import {validDayA9,type A9Procedure,type A9Sensitivity,type A9Base,type A9Source,type A9ProcedureState,type A9SensitivityType,type A9Certainty,type A9Severity,type A9RelatedType} from './types';
const newId=()=>{if(!globalThis.crypto?.randomUUID)throw Error('Identificador seguro indisponível');return crypto.randomUUID();};
const tidy=(v:unknown,n:number):string=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
async function owner(personId:string):Promise<string>{const {data,error}=await getLocalFirstAuthUser(),uid=data.user?.id||'';
 if(error||!validUuidA8(uid)||!validUuidA8(personId))throw Error('Entre na conta e escolha uma pessoa');
 const p=await db.persons.get(personId);if(!p||p.user_id!==uid)throw Error('Pessoa fora da conta atual');return uid;}
const base=(uid:string,pid:string,source:A9Source):A9Base=>{const at=new Date().toISOString();return{id:newId(),user_id:uid,person_id:pid,created_at:at,updated_at:at,deleted_at:null,synced:false,kind:'entry',corrects_event_id:null,source,note:null};};
const sourceValid=(v:A9Source)=>{if(v!=='self_report'&&v!=='professional_document')throw Error('Fonte do registro inválida');};
type Entity='medicos'|'locais'|'consultas'|'rehab_sessions_m5'|'medicamentos'|'vaccination_events_a8'|'procedure_events_a9';
async function validateLink(id:string|null|undefined,table:Entity,uid:string,pid:string){if(!id)return;if(!validUuidA8(id))throw Error('ID de vínculo inválido');
 const row=await db[table].get(id) as {user_id:string;person_id?:string|null;deleted_at?:string|null}|undefined;
 if(!row||row.user_id!==uid||(table!=='medicos'&&table!=='locais'&&row.person_id!==pid)||row.deleted_at)throw Error('Vínculo não pertence à pessoa e conta selecionadas');}
export type ProcedureInputA9={personId:string;title:string;category:A9Procedure['category'];state:Exclude<A9ProcedureState,'void'>;day:string;source:A9Source;note?:string|null;professionalId?:string|null;locationId?:string|null;consultationId?:string|null;rehabSessionId?:string|null;correctsId?:string|null};
export async function saveProcedureA9(v:ProcedureInputA9):Promise<string>{
 const title=tidy(v.title,180);if(!title)throw Error('Informe o procedimento');if(!['ambulatory','dressing','other'].includes(v.category))throw Error('Categoria inválida');
 if(!['planned','performed','not_performed'].includes(v.state)||!validDayA9(v.day))throw Error('Estado e data inválidos');
 if(v.state==='performed'&&v.day>getLocalTodayISO())throw Error('Data futura não comprova realização; registre planejamento');
 sourceValid(v.source);const uid=await owner(v.personId);
 await validateLink(v.professionalId,'medicos',uid,v.personId);await validateLink(v.locationId,'locais',uid,v.personId);
 await validateLink(v.consultationId,'consultas',uid,v.personId);await validateLink(v.rehabSessionId,'rehab_sessions_m5',uid,v.personId);
 const prev=v.correctsId?await db.procedure_events_a9.get(v.correctsId):undefined;
 if(v.correctsId&&(!prev||prev.user_id!==uid||prev.person_id!==v.personId||prev.kind==='void'))throw Error('Registro anterior fora do escopo');
 const row:A9Procedure={...base(uid,v.personId,v.source),kind:prev?'amendment':'entry',corrects_event_id:prev?.id||null,
  title,category:v.category,effective_status:v.state,planned_on:v.state==='planned'?v.day:null,performed_on:v.state==='planned'?null:v.day,
  professional_id:v.professionalId||null,location_id:v.locationId||null,consultation_id:v.consultationId||null,rehab_session_id:v.rehabSessionId||null,note:tidy(v.note,3000)||null};
 await db.transaction('rw',[db.persons,db.procedure_events_a9,db.syncQueue],async()=>{
  const p=await db.persons.get(v.personId);if(!p||p.user_id!==uid)throw Error('Pessoa alterada durante o salvamento');
  if(prev&&await db.procedure_events_a9.where('corrects_event_id').equals(prev.id).first())throw Error('Registro já retificado. Reabra o histórico');
  await db.procedure_events_a9.add(row);await enfileirarOperacao('procedure_events_a9','add',row,{dispatchSync:false});
 });solicitarProcessamentoSync();return row.id;
}
export type SensitivityInputA9={personId:string;type:A9SensitivityType;agent:string;certainty:A9Certainty;severity:A9Severity;day:string;source:A9Source;note?:string|null;relatedType?:A9RelatedType|null;relatedId?:string|null;professionalId?:string|null;correctsId?:string|null};
export async function saveSensitivityA9(v:SensitivityInputA9):Promise<string>{
 const agent=tidy(v.agent,180);if(!agent||!validDayA9(v.day)||v.day>getLocalTodayISO())throw Error('Informe substância/evento e data válida');
 if(!['allergy','intolerance','reaction'].includes(v.type)||!['suspected','documented_by_professional'].includes(v.certainty)||!['unknown','mild','moderate','severe'].includes(v.severity))throw Error('Classificação inválida');
 sourceValid(v.source);if(v.certainty==='documented_by_professional'&&v.source!=='professional_document')throw Error('Comprovação profissional precisa ter origem documental');
 if(Boolean(v.relatedType)!==Boolean(v.relatedId))throw Error('Selecione tipo e ID do vínculo juntos');const uid=await owner(v.personId);
 if(v.relatedType){const table:Entity=v.relatedType==='medication'?'medicamentos':v.relatedType==='vaccination_event'?'vaccination_events_a8':'procedure_events_a9';if(!['medication','vaccination_event','procedure_event'].includes(v.relatedType))throw Error('Tipo de vínculo inválido');await validateLink(v.relatedId,table,uid,v.personId);}
 await validateLink(v.professionalId,'medicos',uid,v.personId);
 const prev=v.correctsId?await db.sensitivity_events_a9.get(v.correctsId):undefined;
 if(v.correctsId&&(!prev||prev.user_id!==uid||prev.person_id!==v.personId||prev.kind==='void'))throw Error('Relato anterior fora do escopo');
 const row:A9Sensitivity={...base(uid,v.personId,v.source),kind:prev?'amendment':'entry',corrects_event_id:prev?.id||null,
  sensitivity_type:v.type,agent_label:agent,certainty:v.certainty,severity:v.severity,reported_on:v.day,
  related_type:v.relatedType||null,related_id:v.relatedId||null,professional_id:v.professionalId||null,note:tidy(v.note,3000)||null};
 await db.transaction('rw',[db.persons,db.sensitivity_events_a9,db.syncQueue],async()=>{
  const p=await db.persons.get(v.personId);if(!p||p.user_id!==uid)throw Error('Pessoa alterada durante o salvamento');
  if(prev&&await db.sensitivity_events_a9.where('corrects_event_id').equals(prev.id).first())throw Error('Relato já retificado');
  await db.sensitivity_events_a9.add(row);await enfileirarOperacao('sensitivity_events_a9','add',row,{dispatchSync:false});
 });solicitarProcessamentoSync();return row.id;
}
/** Logical void is another event; the original remains available for audit. */
export async function voidA9(v:{personId:string;table:'procedure_events_a9'|'sensitivity_events_a9';eventId:string;reason:string}):Promise<string>{
 const uid=await owner(v.personId),reason=tidy(v.reason,3000);if(!reason)throw Error('Informe o motivo da retificação');
 if(v.table==='procedure_events_a9'){
  const prev=await db.procedure_events_a9.get(v.eventId);if(!prev||prev.user_id!==uid||prev.person_id!==v.personId||prev.kind==='void')throw Error('Fato fora do perfil');
  const row:A9Procedure={...prev,...base(uid,v.personId,'self_report'),kind:'void',corrects_event_id:prev.id,effective_status:'void',planned_on:null,performed_on:null,note:reason};
  await db.transaction('rw',[db.procedure_events_a9,db.syncQueue],async()=>{if(await db.procedure_events_a9.where('corrects_event_id').equals(prev.id).first())throw Error('Fato já retificado');await db.procedure_events_a9.add(row);await enfileirarOperacao('procedure_events_a9','add',row,{dispatchSync:false});});solicitarProcessamentoSync();return row.id;
 }
 const prev=await db.sensitivity_events_a9.get(v.eventId);if(!prev||prev.user_id!==uid||prev.person_id!==v.personId||prev.kind==='void')throw Error('Relato fora do perfil');
 const row:A9Sensitivity={...prev,...base(uid,v.personId,prev.source),kind:'void',corrects_event_id:prev.id,note:reason};
 await db.transaction('rw',[db.sensitivity_events_a9,db.syncQueue],async()=>{if(await db.sensitivity_events_a9.where('corrects_event_id').equals(prev.id).first())throw Error('Relato já retificado');await db.sensitivity_events_a9.add(row);await enfileirarOperacao('sensitivity_events_a9','add',row,{dispatchSync:false});});solicitarProcessamentoSync();return row.id;
}
