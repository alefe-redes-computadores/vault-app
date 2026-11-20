/** M1 local-first repository. Only new canonical tables are written here.
 * Legacy tables and CareFlow immutable events remain read-only / untouched.
 * UI cutover is deferred to M2 after full release gates and offline certification. */
import { db } from '@/lib/db';
import { getLocalFirstAuthUser } from '@/lib/supabase/local-auth';
import { enfileirarOperacao, solicitarProcessamentoSync } from '@/lib/sync/enfileirarOperacao';
import type { ExamOrderM1, ExamOrderItemM1, ExamSessionM1, ExamSessionItemM1, ExamItemStatusM1 } from './types';

const validUuid = (s: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const validDay = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`));
const validInstant = (s: string): boolean => /^\d{4}-\d{2}-\d{2}T\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(s) && Number.isFinite(Date.parse(s));
const uuid = (): string => {
  if (typeof crypto === 'undefined' || !crypto.randomUUID) throw Error('UUID seguro indisponível; nenhuma gravação iniciada.');
  return crypto.randomUUID();
};
const trimmed = (raw: string, limit: number): string => raw.trim().slice(0, limit);

async function owner(personId: string): Promise<string> {
  const {data,error} = await getLocalFirstAuthUser();
  const userId = data.user?.id;
  if (error || !userId || !personId) throw Error('Conta e pessoa ativas são obrigatórias.');
  const person = await db.persons.get(personId);
  if (!person || person.user_id !== userId) throw Error('Pessoa não pertence à conta autenticada.');
  return userId;
}

export type NewOrderM1 = {
  personId: string;
  title: string;
  items: readonly string[];
  kind: 'medical_request' | 'standalone';
  requestedOn?: string | null;
  validUntil?: string | null;
  doctorId?: string | null;
  consultationId?: string | null;
  note?: string | null;
  /** Persist once in the UI intent and reuse on retry; never regenerate on lost responses. */
  idempotency?: {orderId: string; itemIds: string[]; linkId?: string};
};

export async function createExamOrderM1(input: NewOrderM1): Promise<string> {
  const userId = await owner(input.personId);
  const names = input.items.map(s => trimmed(s,240));
  if (!trimmed(input.title,240) || !names.length || names.length > 120 || names.some(s => !s))
    throw Error('Informe título e entre 1 e 120 exames confirmados.');
  if (!['standalone','medical_request'].includes(input.kind)) throw Error('Tipo de cadastro inválido.');
  if (input.requestedOn && !validDay(input.requestedOn)) throw Error('Data da solicitação inválida.');
  if (input.validUntil && (!validDay(input.validUntil) || Boolean(input.requestedOn && input.validUntil < input.requestedOn)))
    throw Error('Validade do pedido inválida.');
  if (input.doctorId) {
    const doctor=await db.medicos.get(input.doctorId);
    if (!doctor || doctor.user_id!==userId) throw Error('Médico fora da conta.');
  }
  if (input.consultationId) {
    const c=await db.consultas.get(input.consultationId);
    if (!c || c.user_id!==userId || c.person_id!==input.personId)
      throw Error('Consulta de origem não pertence à pessoa ativa.');
  }
  const intent=input.idempotency;
  if (intent && (!validUuid(intent.orderId) || intent.itemIds.length!==names.length ||
    !intent.itemIds.every(validUuid) || new Set(intent.itemIds).size!==names.length ||
    Boolean(input.consultationId && (!intent.linkId || !validUuid(intent.linkId)))))
    throw Error('Intenção estável de cadastro inválida.');
  const orderId=intent?.orderId||uuid();
  const itemIds=intent?.itemIds||names.map(()=>uuid());
  const linkId=input.consultationId ? intent?.linkId||uuid() : null;
  const now=new Date().toISOString();
  const order: ExamOrderM1={
    id:orderId,user_id:userId,person_id:input.personId,order_kind:input.kind,
    title:trimmed(input.title,240),requested_on:input.requestedOn||null,
    valid_until:input.validUntil||null,doctor_id:input.doctorId||null,
    note:input.note?.trim()||null,source:'human_confirmed',created_at:now,updated_at:now,deleted_at:null,synced:false,
  };
  const rows:ExamOrderItemM1[]=names.map((name,i)=>({
    id:itemIds[i],user_id:userId,person_id:input.personId,order_id:orderId,
    name,status:'pending',collected_at:null,result_received_at:null,result_summary:null,
    result_flag:'unreviewed',result_payload:{},note:null,
    created_at:now,updated_at:now,deleted_at:null,synced:false,
  }));
  await db.transaction('rw',[
    db.persons,db.consultas,db.exam_orders,db.exam_order_items,
    db.consultation_exam_order_links,db.syncQueue,
  ],async()=>{
      const p=await db.persons.get(input.personId);
      if(!p||p.user_id!==userId)throw Error('Pessoa alterada durante o cadastro.');
      if(input.consultationId){
        const c=await db.consultas.get(input.consultationId);
        if(!c||c.user_id!==userId||c.person_id!==input.personId)throw Error('Consulta alterada antes da gravação.');
      }
      const existing=await db.exam_orders.get(orderId);
      if(existing){
        const saved=await db.exam_order_items.where('order_id').equals(orderId).toArray();
        const origin=input.consultationId?await db.consultation_exam_order_links.where('order_id').equals(orderId).toArray():[];
        if(existing.user_id===userId && existing.person_id===input.personId &&
          existing.title===order.title && existing.order_kind===order.order_kind &&
          existing.requested_on===order.requested_on && saved.length===rows.length &&
          rows.every(r=>saved.some(s=>s.id===r.id&&s.name===r.name)) &&
          (!input.consultationId || origin.some(l=>l.consultation_id===input.consultationId&&l.id===linkId))) return;
        throw Error('Identidade de pedido já utilizada com conteúdo diferente.');
      }
      await db.exam_orders.add(order);
      await enfileirarOperacao('exam_orders','add',order,{dispatchSync:false});
      await db.exam_order_items.bulkAdd(rows);
      for(const row of rows)await enfileirarOperacao('exam_order_items','add',row,{dispatchSync:false});
      if(input.consultationId&&linkId){
        const link={id:linkId,user_id:userId,person_id:input.personId,order_id:orderId,
          consultation_id:input.consultationId,role:'origin' as const,note:null,
          created_at:now,updated_at:now,deleted_at:null,synced:false};
        await db.consultation_exam_order_links.add(link);
        await enfileirarOperacao('consultation_exam_order_links','add',link,{dispatchSync:false});
      }
    });
  solicitarProcessamentoSync();
  return orderId;
}

export type NewSessionM1={
  personId:string; orderId:string; itemIds:readonly string[];
  scheduledAt:string; timeZone:string; laboratoryName?:string|null;locationId?:string|null;
  prepMinutes?:number|null;prepInstructions?:string|null;prepConfirmedByUser?:boolean;
  expectedResultAt?:string|null;labProtocolCode?:string|null;labPortalNote?:string|null;
  prepReminderOptIn?:boolean;appointmentReminderOptIn?:boolean;resultReminderOptIn?:boolean;
  idempotency?:{sessionId:string;linkIds:string[]};
};

export async function scheduleExamSessionM1(input:NewSessionM1):Promise<string>{
  const uid=await owner(input.personId);
  if(!validInstant(input.scheduledAt)||!input.timeZone?.trim())throw Error('Agendamento exige data/hora com fuso explícito.');
  try{new Intl.DateTimeFormat('pt-BR',{timeZone:input.timeZone});}catch{throw Error('Fuso horário inválido.');}
  if(input.expectedResultAt&&!validInstant(input.expectedResultAt))throw Error('Previsão de resultado inválida.');
  if(input.prepMinutes!=null&&(!Number.isInteger(input.prepMinutes)||input.prepMinutes<0||input.prepMinutes>10080))
    throw Error('Preparo informado inválido.');
  const ids=[...input.itemIds];
  if(!ids.length||ids.length>120||new Set(ids).size!==ids.length)throw Error('Escolha entre 1 e 120 itens distintos da solicitação.');
  const source=await db.exam_orders.get(input.orderId);
  if(!source||source.user_id!==uid||source.person_id!==input.personId||source.deleted_at)throw Error('Pedido fora do escopo.');
  if(input.locationId){const loc=await db.locais.get(input.locationId);if(!loc||loc.user_id!==uid)throw Error('Local fora da conta.');}
  const intent=input.idempotency;
  if(intent&&(!validUuid(intent.sessionId)||intent.linkIds.length!==ids.length||
    !intent.linkIds.every(validUuid)||new Set(intent.linkIds).size!==ids.length))
    throw Error('Idempotência da sessão inválida.');
  const sessionId=intent?.sessionId||uuid(),linkIds=intent?.linkIds||ids.map(()=>uuid());
  const now=new Date().toISOString();
  const session:ExamSessionM1={
    id:sessionId,user_id:uid,person_id:input.personId,order_id:input.orderId,
    location_id:input.locationId||null,laboratory_name:input.laboratoryName?.trim()||null,
    scheduled_at:input.scheduledAt,timezone_name:input.timeZone,status:'scheduled',
    prep_minutes:input.prepMinutes??null,prep_instructions:input.prepInstructions?.trim()||null,
    prep_confirmed_by_user:input.prepConfirmedByUser===true,
    expected_result_at:input.expectedResultAt||null,
    lab_protocol_code:input.labProtocolCode?.trim()||null,
    lab_portal_note:input.labPortalNote?.trim()||null,
    prep_reminder_opt_in:input.prepReminderOptIn===true,
    appointment_reminder_opt_in:input.appointmentReminderOptIn===true,
    result_reminder_opt_in:input.resultReminderOptIn===true,
    note:null,created_at:now,updated_at:now,deleted_at:null,synced:false,
  };
  await db.transaction('rw',db.exam_orders,db.exam_order_items,db.exam_sessions,
    db.exam_session_items,db.syncQueue,async()=>{
      const order=await db.exam_orders.get(input.orderId);
      if(!order||order.user_id!==uid||order.person_id!==input.personId||order.deleted_at)throw Error('Pedido alterado durante agendamento.');
      const existing=await db.exam_sessions.get(sessionId);
      if(existing){
        const links=await db.exam_session_items.where('session_id').equals(sessionId).toArray();
        if(existing.user_id===uid&&existing.person_id===input.personId&&existing.order_id===input.orderId&&
          existing.status==='scheduled'&&existing.scheduled_at===input.scheduledAt&&existing.timezone_name===input.timeZone&&
          links.length===ids.length&&ids.every(id=>links.some(row=>row.exam_order_item_id===id)))return;
        throw Error('Sessão já existe com conteúdo diferente.');
      }
      for(const itemId of ids){
        const item=await db.exam_order_items.get(itemId);
        if(!item||item.user_id!==uid||item.person_id!==input.personId||item.order_id!==input.orderId||
          item.deleted_at||!['pending','recollection_needed'].includes(item.status))throw Error('Item não está pendente neste pedido.');
        const active=await db.exam_session_items.where('exam_order_item_id').equals(itemId).filter(
          r=>r.user_id===uid&&r.person_id===input.personId&&!r.deleted_at&&['scheduled','collected'].includes(r.status)).first();
        if(active)throw Error('Este exame já tem sessão ativa. Reagende explicitamente preservando o histórico.');
      }
      await db.exam_sessions.add(session);
      await enfileirarOperacao('exam_sessions','add',session,{dispatchSync:false});
      for(let i=0;i<ids.length;i++){
        const id=ids[i];
        const link:ExamSessionItemM1={id:linkIds[i],user_id:uid,person_id:input.personId,order_id:input.orderId,
          session_id:sessionId,exam_order_item_id:id,status:'scheduled',collected_at:null,note:null,
          created_at:now,updated_at:now,deleted_at:null,synced:false};
        await db.exam_session_items.add(link);
        await enfileirarOperacao('exam_session_items','add',link,{dispatchSync:false});
        const item=await db.exam_order_items.get(id);
        if(!item)throw Error('Item ausente durante transação de agendamento.');
        const next:ExamOrderItemM1={...item,status:'scheduled',updated_at:now,synced:false};
        await db.exam_order_items.put(next);
        await enfileirarOperacao('exam_order_items','update',next,{dispatchSync:false});
      }
    });
  solicitarProcessamentoSync();
  return sessionId;
}

/** Explicit factual transition, never inferred from date or OCR. */
export async function updateExamItemStatusM1(
  personId:string,itemId:string,nextStatus:ExamItemStatusM1,
  extra:{collectedAt?:string|null;resultReceivedAt?:string|null;resultSummary?:string|null;manualFlag?:ExamOrderItemM1['result_flag']}={}
):Promise<void>{
  const uid=await owner(personId);
  if(!['pending','scheduled','collected','result_pending','result_received','cancelled','recollection_needed'].includes(nextStatus))
    throw Error('Situação de exame inválida.');
  for(const dt of [extra.collectedAt,extra.resultReceivedAt])if(dt&&!validInstant(dt))throw Error('Data clínica inválida.');
  await db.transaction('rw',db.exam_order_items,db.syncQueue,async()=>{
    const item=await db.exam_order_items.get(itemId);
    if(!item||item.user_id!==uid||item.person_id!==personId||item.deleted_at)throw Error('Exame inexistente nesta pessoa.');
    const next:ExamOrderItemM1={...item,status:nextStatus,
      collected_at:extra.collectedAt===undefined?item.collected_at:extra.collectedAt,
      result_received_at:extra.resultReceivedAt===undefined?item.result_received_at:extra.resultReceivedAt,
      result_summary:extra.resultSummary===undefined?item.result_summary:extra.resultSummary?.trim()||null,
      result_flag:extra.manualFlag??item.result_flag,
      updated_at:new Date().toISOString(),synced:false};
    await db.exam_order_items.put(next);
    await enfileirarOperacao('exam_order_items','update',next,{dispatchSync:false});
  });
  solicitarProcessamentoSync();
}
