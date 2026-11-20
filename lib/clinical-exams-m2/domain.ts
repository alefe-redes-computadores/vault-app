/** M2 canonical projections. Facts only; dates do not imply collection or results. */
import type { ExamOrderM1, ExamOrderItemM1, ExamSessionM1, ExamSessionItemM1 } from '@/lib/clinical-exams-m1/types';

export type ExamWorkspaceM2 = {
  order: ExamOrderM1;
  items: ExamOrderItemM1[];
  sessions: Array<{ session: ExamSessionM1; links: ExamSessionItemM1[] }>;
  pending: number;
  scheduled: number;
  collected: number;
  resulted: number;
};
export function projectExamWorkspaceM2(
  orders:readonly ExamOrderM1[],items:readonly ExamOrderItemM1[],sessions:readonly ExamSessionM1[],
  links:readonly ExamSessionItemM1[],userId:string,personId:string
):ExamWorkspaceM2[]{
  if(!userId||!personId)return [];
  const owned=(v:{user_id:string;person_id:string;deleted_at:string|null})=>v.user_id===userId&&v.person_id===personId&&!v.deleted_at;
  return orders.filter(owned).map(order=>{
    const ownItems=items.filter(row=>owned(row)&&row.order_id===order.id);
    const ids=new Set(ownItems.map(x=>x.id));
    const ownSessions=sessions.filter(row=>owned(row)&&row.order_id===order.id).map(session=>({
      session,links:links.filter(link=>owned(link)&&link.session_id===session.id&&ids.has(link.exam_order_item_id))
    }));
    return {
      order,items:ownItems,sessions:ownSessions,
      pending:ownItems.filter(x=>x.status==='pending'||x.status==='recollection_needed').length,
      scheduled:ownItems.filter(x=>x.status==='scheduled').length,
      collected:ownItems.filter(x=>x.status==='collected'||x.status==='result_pending').length,
      resulted:ownItems.filter(x=>x.status==='result_received').length,
    };
  }).sort((a,b)=>b.order.created_at.localeCompare(a.order.created_at));
}

export type ExamReminderKindM2='prep'|'session'|'result';
export type ExamReminderPlanM2={key:string;sessionId:string;kind:ExamReminderKindM2;at:number;title:string;targetRoute:string};
export function planExamRemindersM2(
  rows:readonly ExamWorkspaceM2[], now:number=Date.now(),
):ExamReminderPlanM2[]{
  const notices:ExamReminderPlanM2[]=[];
  for(const row of rows)for(const {session,links} of row.sessions){
    if(session.deleted_at||!['scheduled','completed'].includes(session.status))continue;
    const live=links.filter(l=>l.status==='scheduled'||l.status==='collected');
    if(!live.length)continue;
    const scheduled=Date.parse(session.scheduled_at);
    if(!Number.isFinite(scheduled))continue;
    const base={sessionId:session.id,targetRoute:`/saude/exames/pedidos?id=${encodeURIComponent(row.order.id)}&sessao=${encodeURIComponent(session.id)}`};
    const add=(kind:ExamReminderKindM2,at:number,title:string)=>{
      if(at>now && Number.isFinite(at))notices.push({...base,kind,at,key:`${row.order.user_id}:${row.order.person_id}:${session.id}:${kind}`,title});
    };
    const pending=live.filter(l=>l.status==='scheduled').length;
    if(pending>0&&session.status==='scheduled'){
      if(session.appointment_reminder_opt_in)add('session',scheduled,`Exames agendados · ${session.laboratory_name||'Sessão confirmada'}`);
      if(session.prep_reminder_opt_in && session.prep_confirmed_by_user &&
        session.prep_minutes!=null && Number.isInteger(session.prep_minutes) &&
        session.prep_minutes>=0 && session.prep_instructions?.trim())
          add('prep',scheduled-session.prep_minutes*60_000,'Preparo informado para exames');
    }
    const pendingResults=live.some(l=>{
      const item=row.items.find(x=>x.id===l.exam_order_item_id);
      return item && (item.status==='collected'||item.status==='result_pending');
    });
    // A forecast never becomes a factual result, and a session with all results received has no result alarm.
    if(session.result_reminder_opt_in&&session.expected_result_at&&pendingResults)
      add('result',Date.parse(session.expected_result_at),'Previsão de disponibilização de laudos');
  }
  const ordered=notices.sort((a,b)=>a.at-b.at||a.key.localeCompare(b.key));
  const grouped:ExamReminderPlanM2[]=[];
  // Doze can throttle alarms inside a 9-minute window. One user-facing notice for
  // very close categories of the SAME session, without suppressing other sessions.
  for(const notice of ordered){
    const same=grouped.find(x=>x.sessionId===notice.sessionId && Math.abs(x.at-notice.at)<9*60_000);
    if(same){
      same.title='Preparo / sessão de exames · alertas agrupados';
      same.key= `${same.key}+${notice.kind}`;
      continue;
    }
    grouped.push({...notice});
  }
  return grouped;
}

export function localCivilToIsoM2(value:string):string{
  // HTML datetime-local intentionally uses device's civil timezone; reject DST gaps.
  if(!/^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('Informe data e horário válidos.');
  const d=new Date(value);
  if(!Number.isFinite(d.getTime()))throw Error('Data fora do calendário.');
  const pad=(n:number)=>String(n).padStart(2,'0');
  const round=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if(round!==value)throw Error('Horário inexistente no fuso deste aparelho.');
  return d.toISOString();
}
export function displayCivilM2(value:string):string{
  const d=new Date(value);
  return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Data não informada';
}
export function validPrepSourceM2(value:string):boolean{return ['laboratorio','profissional','documento'].includes(value);}
export function prepSourceNoteM2(value:string,notes:string):string{
  if(!validPrepSourceM2(value))throw Error('Informe a origem real do preparo.');
  const labels:Record<string,string>={laboratorio:'laboratório',profissional:'profissional de saúde',documento:'documento do pedido'};
  return `Fonte declarada do preparo: ${labels[value]}.${notes.trim()?` Observação: ${notes.trim().slice(0,400)}`:''}`;
}
