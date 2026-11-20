/** M2: exact, person-scoped, transactional session lifecycle. No physical DELETE. */
import { db } from '@/lib/db';
import { getLocalFirstAuthUser } from '@/lib/supabase/local-auth';
import { enfileirarOperacao, solicitarProcessamentoSync } from '@/lib/sync/enfileirarOperacao';
import { scheduleExamSessionM1, type NewSessionM1 } from '@/lib/clinical-exams-m1/repository';
import type { ExamOrderItemM1, ExamSessionM1, ExamSessionItemM1, ConsultationExamOrderLinkM1 } from '@/lib/clinical-exams-m1/types';
import { validPrepSourceM2, prepSourceNoteM2 } from './domain';

const uuid=()=>crypto.randomUUID();
async function scope(personId:string):Promise<string>{
  const {data,error}=await getLocalFirstAuthUser();
  const user=data.user?.id;
  if(error||!user||!personId)throw Error('Identifique sua conta e pessoa ativa.');
  const person=await db.persons.get(personId);
  if(!person||person.user_id!==user)throw Error('Pessoa não pertence à conta autenticada.');
  return user;
}
const stamp=()=>new Date().toISOString();
const activeLink=(l:ExamSessionItemM1)=>!l.deleted_at&&['scheduled','collected'].includes(l.status);
const isDate=(v:string)=>/^\d{4}-\d{2}-\d{2}T/.test(v)&&Number.isFinite(Date.parse(v));

export async function scheduleExamSessionM2(input:NewSessionM1 & {
  prepSource?:'laboratorio'|'profissional'|'documento'|''; prepSourceNote?:string;
}):Promise<string>{
  const hasPrep=Boolean(input.prepInstructions?.trim())||input.prepMinutes!=null;
  if(hasPrep){
    if(!validPrepSourceM2(input.prepSource||'')||!input.prepInstructions?.trim()||!input.prepConfirmedByUser)
      throw Error('Preparo só é permitido com orientação real, fonte identificada e confirmação.');
  }
  if(input.prepReminderOptIn&&input.prepMinutes==null)throw Error('Informe o preparo antes de ativar seu aviso.');
  // Keep one single Dexie transaction from M1; provenance lives in prep_instructions
  // until M3 introduces a structured schema migration, with no partial commits.
  const provenance=hasPrep&&input.prepSource
    ? `${prepSourceNoteM2(input.prepSource,input.prepSourceNote||'')}\n${input.prepInstructions||''}`
    : input.prepInstructions;
  return scheduleExamSessionM1({...input,prepInstructions:provenance});
}

export type ExamMarkM2={itemId:string;action:'collected'|'recollection_needed'|'missed'|'cancelled'};
export async function recordExamSessionProgressM2(personId:string,sessionId:string,changes:readonly ExamMarkM2[]):Promise<void>{
  const uid=await scope(personId);
  if(!changes.length||new Set(changes.map(x=>x.itemId)).size!==changes.length)throw Error('Selecione exames distintos.');
  await db.transaction('rw',[db.exam_sessions,db.exam_session_items,db.exam_order_items,db.syncQueue],async()=>{
    const session=await db.exam_sessions.get(sessionId);
    if(!session||session.user_id!==uid||session.person_id!==personId||session.deleted_at||session.status==='cancelled')throw Error('Sessão indisponível.');
    const now=stamp();
    for(const change of changes){
      const link=await db.exam_session_items.where('session_id').equals(sessionId).filter(
        l=>l.user_id===uid&&l.person_id===personId&&l.exam_order_item_id===change.itemId&&!l.deleted_at).first();
      if(!link||!activeLink(link)||link.status==='collected')throw Error('Somente exames ainda agendados podem mudar de situação.');
      const item=await db.exam_order_items.get(change.itemId);
      if(!item||item.deleted_at||item.order_id!==session.order_id||item.user_id!==uid||item.person_id!==personId||item.status!=='scheduled')
        throw Error('Exame não pertence ao pedido ou já mudou de estado.');
      const nextLink:ExamSessionItemM1={...link,status:change.action,collected_at:change.action==='collected'?now:null,updated_at:now,synced:false};
      const nextStatus:ExamOrderItemM1['status']=change.action==='collected'?'collected':change.action==='missed'?'recollection_needed':change.action;
      const nextItem:ExamOrderItemM1={...item,status:nextStatus,collected_at:change.action==='collected'?now:item.collected_at,updated_at:now,synced:false};
      await db.exam_session_items.put(nextLink);
      await enfileirarOperacao('exam_session_items','update',nextLink,{dispatchSync:false});
      await db.exam_order_items.put(nextItem);
      await enfileirarOperacao('exam_order_items','update',nextItem,{dispatchSync:false});
    }
    // Session completion records only the end of the session; it does not manufacture results.
    const links=await db.exam_session_items.where('session_id').equals(sessionId).toArray();
    if(links.filter(l=>!l.deleted_at).every(l=>l.status!=='scheduled')&&session.status==='scheduled'){
      const nextSession:ExamSessionM1={...session,status:'completed',updated_at:now,synced:false};
      await db.exam_sessions.put(nextSession);
      await enfileirarOperacao('exam_sessions','update',nextSession,{dispatchSync:false});
    }
  });
  solicitarProcessamentoSync();
  if(typeof window!=='undefined')window.dispatchEvent(new Event('vault:health-reminders-reconcile'));
}

export async function cancelExamSessionM2(personId:string,sessionId:string):Promise<void>{
  const uid=await scope(personId);
  await db.transaction('rw',[db.exam_sessions,db.exam_session_items,db.exam_order_items,db.syncQueue],async()=>{
    const s=await db.exam_sessions.get(sessionId);
    if(!s||s.user_id!==uid||s.person_id!==personId||s.deleted_at||s.status!=='scheduled')throw Error('Sessão já encerrada ou ausente.');
    const now=stamp();
    const links=await db.exam_session_items.where('session_id').equals(sessionId).toArray();
    for(const link of links.filter(l=>!l.deleted_at&&l.status==='scheduled')){
      const item=await db.exam_order_items.get(link.exam_order_item_id);
      if(!item||item.user_id!==uid||item.person_id!==personId||item.order_id!==s.order_id||item.status!=='scheduled')throw Error('Vínculo de exame alterado; cancelamento bloqueado.');
      const nl:ExamSessionItemM1={...link,status:'cancelled',updated_at:now,synced:false};
      const ni:ExamOrderItemM1={...item,status:'pending',updated_at:now,synced:false};
      await db.exam_session_items.put(nl); await enfileirarOperacao('exam_session_items','update',nl,{dispatchSync:false});
      await db.exam_order_items.put(ni); await enfileirarOperacao('exam_order_items','update',ni,{dispatchSync:false});
    }
    const hadCollected=links.some(l=>!l.deleted_at&&l.status==='collected');
    const ns:ExamSessionM1={...s,status:hadCollected?'completed':'cancelled',updated_at:now,synced:false};
    await db.exam_sessions.put(ns); await enfileirarOperacao('exam_sessions','update',ns,{dispatchSync:false});
  });
  solicitarProcessamentoSync();
  if(typeof window!=='undefined')window.dispatchEvent(new Event('vault:health-reminders-reconcile'));
}

/** Rebooking is an explicit new session, never a date overwrite; previous facts remain. */
export async function rescheduleExamSessionM2(personId:string,oldId:string,newInput:NewSessionM1):Promise<string>{
  const uid=await scope(personId);
  const old=await db.exam_sessions.get(oldId);
  if(newInput.idempotency?.sessionId){
    const existing=await db.exam_sessions.get(newInput.idempotency.sessionId);
    if(existing&&old&&existing.user_id===uid&&existing.person_id===personId&&existing.order_id===newInput.orderId&&
       existing.scheduled_at===newInput.scheduledAt&&old.status!=='scheduled'){
      const saved=await db.exam_session_items.where('session_id').equals(existing.id).toArray();
      if(saved.length===newInput.itemIds.length&&newInput.itemIds.every(id=>saved.some(l=>l.exam_order_item_id===id)))return existing.id;
      throw Error('A intenção de remarcação não confere com os exames anteriores.');
    }
  }
  if(!old||old.user_id!==uid||old.person_id!==personId||old.deleted_at||old.status!=='scheduled'||old.order_id!==newInput.orderId)
    throw Error('Sessão original não permite remarcação.');
  const links=await db.exam_session_items.where('session_id').equals(oldId).filter(l=>l.status==='scheduled'&&!l.deleted_at).toArray();
  if(!links.length||links.length!==newInput.itemIds.length||!newInput.itemIds.every(id=>links.some(l=>l.exam_order_item_id===id)))
    throw Error('A remarcação deve selecionar os mesmos itens ainda agendados.');
  // Prepare the new session first, but do not mutate the old record on validation failures.
  // The single Dexie transaction below preserves FK ordering and all previous links.
  if(!isDate(newInput.scheduledAt)||!newInput.timeZone?.trim())throw Error('Data e fuso inválidos.');
  try{new Intl.DateTimeFormat('pt-BR',{timeZone:newInput.timeZone});}catch{throw Error('Fuso horário inválido.');}
  const sessionId=newInput.idempotency?.sessionId||uuid();
  const ids=newInput.idempotency?.linkIds||links.map(()=>uuid());
  if(ids.length!==links.length||new Set(ids).size!==ids.length)throw Error('IDs de remarcação inválidos.');
  const now=stamp();
  const nextSession:ExamSessionM1={...old,id:sessionId,scheduled_at:newInput.scheduledAt,timezone_name:newInput.timeZone,
    laboratory_name:newInput.laboratoryName??old.laboratory_name,location_id:newInput.locationId??old.location_id,
    prep_minutes:newInput.prepMinutes??null,prep_instructions:newInput.prepInstructions||null,
    prep_confirmed_by_user:newInput.prepConfirmedByUser===true,expected_result_at:newInput.expectedResultAt||null,
    lab_protocol_code:newInput.labProtocolCode||null,lab_portal_note:newInput.labPortalNote||null,
    prep_reminder_opt_in:newInput.prepReminderOptIn===true,
    appointment_reminder_opt_in:newInput.appointmentReminderOptIn===true,
    result_reminder_opt_in:newInput.resultReminderOptIn===true,
    status:'scheduled',created_at:now,updated_at:now,synced:false};
  await db.transaction('rw',[db.exam_sessions,db.exam_session_items,db.exam_order_items,db.syncQueue],async()=>{
    const existing=await db.exam_sessions.get(sessionId);
    if(existing)throw Error('Identidade da nova sessão já utilizada; conferir antes de repetir.');
    const current=await db.exam_sessions.get(oldId);
    if(!current||current.status!=='scheduled'||current.updated_at!==old.updated_at)throw Error('Sessão modificada durante remarcação.');
    // A previous collected link must remain collected and is never rescheduled.
    const fresh=await db.exam_session_items.where('session_id').equals(oldId).toArray();
    if(links.some(link=>!fresh.some(row=>row.id===link.id&&row.status==='scheduled')))throw Error('Itens alterados durante a remarcação.');
    for(const [i,link] of links.entries()){
      const item=await db.exam_order_items.get(link.exam_order_item_id);
      if(!item||item.status!=='scheduled'||item.person_id!==personId||item.user_id!==uid)throw Error('Exame indisponível para remarcar.');
      const prior:ExamSessionItemM1={...link,status:'cancelled',updated_at:now,synced:false};
      await db.exam_session_items.put(prior);await enfileirarOperacao('exam_session_items','update',prior,{dispatchSync:false});
      const nl:ExamSessionItemM1={...link,id:ids[i],session_id:sessionId,status:'scheduled',collected_at:null,created_at:now,updated_at:now,synced:false};
      await db.exam_session_items.add(nl);await enfileirarOperacao('exam_session_items','add',nl,{dispatchSync:false});
    }
    await db.exam_sessions.add(nextSession);await enfileirarOperacao('exam_sessions','add',nextSession,{dispatchSync:false});
    const completed=await db.exam_session_items.where('session_id').equals(oldId).filter(l=>!l.deleted_at&&l.status==='collected').count();
    const closed:ExamSessionM1={...old,status:completed?'completed':'cancelled',updated_at:now,synced:false};
    await db.exam_sessions.put(closed);await enfileirarOperacao('exam_sessions','update',closed,{dispatchSync:false});
  });
  solicitarProcessamentoSync();
  if(typeof window!=='undefined')window.dispatchEvent(new Event('vault:health-reminders-reconcile'));
  return sessionId;
}

export async function recordExamResultM2(personId:string,itemId:string,summary:string,receivedAt:string):Promise<void>{
  const uid=await scope(personId);
  if(!summary.trim()||!isDate(receivedAt))throw Error('Informe resultado factual e data válida.');
  await db.transaction('rw',db.exam_order_items,db.syncQueue,async()=>{
    const item=await db.exam_order_items.get(itemId);
    if(!item||item.user_id!==uid||item.person_id!==personId||item.deleted_at||
      !['collected','result_pending'].includes(item.status))throw Error('Este exame ainda não registra coleta/realização confirmada.');
    const next:ExamOrderItemM1={...item,status:'result_received',result_received_at:receivedAt,
      result_summary:summary.trim().slice(0,2000),updated_at:stamp(),synced:false};
    await db.exam_order_items.put(next);await enfileirarOperacao('exam_order_items','update',next,{dispatchSync:false});
  });
  solicitarProcessamentoSync();
  if(typeof window!=='undefined')window.dispatchEvent(new Event('vault:health-reminders-reconcile'));
}

export async function linkExamReviewConsultationM2(personId:string,orderId:string,consultationId:string):Promise<string>{
  const uid=await scope(personId);
  const order=await db.exam_orders.get(orderId),consult=await db.consultas.get(consultationId);
  if(!order||order.user_id!==uid||order.person_id!==personId||order.deleted_at||
    !consult||consult.user_id!==uid||consult.person_id!==personId)throw Error('Consulta e pedido não pertencem à mesma pessoa.');
  const previous=await db.consultation_exam_order_links.where('order_id').equals(orderId)
    .filter(x=>!x.deleted_at&&x.consultation_id===consultationId&&x.role==='review').first();
  if(previous)return previous.id;
  const now=stamp();const row:ConsultationExamOrderLinkM1={id:uuid(),user_id:uid,person_id:personId,order_id:orderId,
    consultation_id:consultationId,role:'review',note:null,created_at:now,updated_at:now,deleted_at:null,synced:false};
  let finalId=row.id;
  await db.transaction('rw',[db.exam_orders,db.consultas,db.consultation_exam_order_links,db.syncQueue],async()=>{
    const currentOrder=await db.exam_orders.get(orderId),currentConsult=await db.consultas.get(consultationId);
    if(!currentOrder||currentOrder.user_id!==uid||currentOrder.person_id!==personId||currentOrder.deleted_at||
      !currentConsult||currentConsult.user_id!==uid||currentConsult.person_id!==personId)throw Error('Vínculo mudou durante o cadastro.');
    const again=await db.consultation_exam_order_links.where('order_id').equals(orderId)
      .filter(x=>!x.deleted_at&&x.consultation_id===consultationId&&x.role==='review').first();
    if(again){finalId=again.id;return;}
    await db.consultation_exam_order_links.add(row);
    await enfileirarOperacao('consultation_exam_order_links','add',row,{dispatchSync:false});
  });
  solicitarProcessamentoSync();return finalId;
}
