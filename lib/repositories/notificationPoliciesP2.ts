import {db} from '@/lib/db';
import {getLocalFirstAuthUser} from '@/lib/supabase/local-auth';
import {enfileirarOperacao,solicitarProcessamentoSync} from '@/lib/sync/enfileirarOperacao';
import {deterministicPolicyIdP2,eventScopeP2,normalizePolicyP2} from '@/lib/m3/policy-record-p2';
import {validCheckinAnswerP2,checkinCanAnswerP2} from '@/lib/m3/checkins-p2';
import type {EventKindP2,EventPolicyRecordP2,EventPolicyValueP2,CheckinDayP2,CheckinAnswerP2} from '@/lib/m3/policy-record-p2';
import {EVENT_POLICY_CHANGED_P2} from '@/lib/m3/policy-record-p2';

async function assertOwner(personId:string):Promise<string>{
  const {data,error}=await getLocalFirstAuthUser();
  if(error||!data.user)throw Error('Entre na sua conta para editar as preferências.');
  const userId=data.user.id;
  const person=await db.persons.get(personId);
  if(!person||person.user_id!==userId)throw Error('Pessoa não pertence à conta autenticada.');
  return userId;
}
/** Auth + titular + identidade CANÔNICA: não registrar preferências para IDs inexistentes/estrangeiros. */
async function assertEventForOwner(uid:string,pid:string,kind:EventKindP2,id:string){
  const table=kind==='consulta'||kind==='checkin'?db.consultas:
    kind==='cirurgia'?db.cirurgias:
    kind==='exame'||kind==='retorno'?db.exames:
    kind==='retirada'?db.retiradas:db.renovacoes;
  const row=await table.get(id) as {user_id?:string;person_id?:string;status?:string;data:string}|undefined;
  if(!row||row.user_id!==uid||row.person_id!==pid)throw Error('Compromisso não pertence à pessoa autenticada.');
  return row;
}
function changed():void{
  if(typeof window==='undefined')return;
  window.dispatchEvent(new Event(EVENT_POLICY_CHANGED_P2));
  window.dispatchEvent(new Event('vault:health-reminders-reconcile'));
}
function ensureShape(row:EventPolicyRecordP2,uid:string,pid:string,kind:EventKindP2,id:string){
  if(row.user_id!==uid||row.person_id!==pid||row.event_kind!==kind||row.event_id!==id)throw Error('Conflito de identidade de política; nenhuma gravação executada.');
}
export const notificationPoliciesRepositoryP2={
  async forPerson(personId:string):Promise<EventPolicyRecordP2[]>{
    const uid=await assertOwner(personId);
    return (await db.notification_policies_p2.where('[user_id+person_id]').equals([uid,personId]).toArray())
      .filter(row=>row.user_id===uid&&row.person_id===personId);
  },
  async update(personId:string,kind:EventKindP2,eventId:string,value:EventPolicyValueP2):Promise<void>{
    const uid=await assertOwner(personId);const safe=normalizePolicyP2(value);
    if(!eventScopeP2({userId:uid,personId,kind,id:eventId}))throw Error('Compromisso inválido.');
    await assertEventForOwner(uid,personId,kind,eventId);
    const id=await deterministicPolicyIdP2(uid,personId,kind,eventId);
    const current=await db.notification_policies_p2.get(id);
    if(current)ensureShape(current,uid,personId,kind,eventId);
    const at=new Date().toISOString();
    const row:EventPolicyRecordP2={id,user_id:uid,person_id:personId,event_kind:kind,event_id:eventId,
      enabled:safe.enabled,offsets:safe.offsets,custom_at:safe.custom_at,
      consent_at:current?.consent_at??null,checkin_answers:current?.checkin_answers??{},
      created_at:current?.created_at??at,updated_at:at,synced:false};
    await db.transaction('rw',[db.notification_policies_p2,db.syncQueue],async()=>{
      await db.notification_policies_p2.put(row);
      await enfileirarOperacao('notification_policies_p2',current?'update':'add',row,{dispatchSync:false});
    });
    solicitarProcessamentoSync();changed();
  },
  async setCheckinConsent(personId:string,consultId:string,enabled:boolean):Promise<void>{
    const uid=await assertOwner(personId);const kind='checkin';
    const consultation=await assertEventForOwner(uid,personId,'checkin',consultId);
    if(consultation.status!=='realizada')throw Error('Acompanhamento só pode ser ativado para consulta concluída.');
    const id=await deterministicPolicyIdP2(uid,personId,kind,consultId);
    const current=await db.notification_policies_p2.get(id);
    if(current)ensureShape(current,uid,personId,kind,consultId);
    // Never turn re-enable into new consent that silently restores old prompts.
    const now=new Date().toISOString();
    const row:EventPolicyRecordP2={id,user_id:uid,person_id:personId,event_kind:kind,event_id:consultId,
      enabled,offsets:[0],custom_at:null,consent_at:enabled?(current?.consent_at??now):current?.consent_at??null,
      checkin_answers:current?.checkin_answers??{},created_at:current?.created_at??now,updated_at:now,synced:false};
    await db.transaction('rw',[db.notification_policies_p2,db.syncQueue],async()=>{
      await db.notification_policies_p2.put(row);
      await enfileirarOperacao('notification_policies_p2',current?'update':'add',row,{dispatchSync:false});
    });
    solicitarProcessamentoSync();changed();
  },
  async answerCheckin(personId:string,consultId:string,day:CheckinDayP2,answer:CheckinAnswerP2):Promise<void>{
    if(![1,3,10].includes(day)||!validCheckinAnswerP2(answer))throw Error('Resposta não reconhecida.');
    const uid=await assertOwner(personId);const id=await deterministicPolicyIdP2(uid,personId,'checkin',consultId);
    const current=await db.notification_policies_p2.get(id);
    if(!current||!current.enabled)throw Error('Ative o acompanhamento voluntário antes de responder.');
    ensureShape(current,uid,personId,'checkin',consultId);
    const consultation=await assertEventForOwner(uid,personId,'checkin',consultId);
    // O status é opcional no contrato histórico; só uma conclusão REAL autoriza a resposta.
    if(consultation.status!=='realizada')throw Error('Consulta não concluída; resposta pós-consulta bloqueada.');
    const now=new Date(),at=now.toISOString();
    if(!checkinCanAnswerP2({consultDate:consultation.data,status:consultation.status,consentAt:current.consent_at,day,now,previous:current.checkin_answers?.[day]}))
      throw Error('Este convite ainda não está disponível ou sua janela terminou.');
    const delayed=answer==='adiar'?new Date(now.getTime()+24*3600_000).toISOString():null;
    const row={...current,checkin_answers:{...current.checkin_answers,[day]:{answer,at,snoozed_until:delayed}},updated_at:at,synced:false};
    await db.transaction('rw',[db.notification_policies_p2,db.syncQueue],async()=>{
      await db.notification_policies_p2.put(row);
      await enfileirarOperacao('notification_policies_p2','update',row,{dispatchSync:false});
    });
    solicitarProcessamentoSync();changed();
  },
};
