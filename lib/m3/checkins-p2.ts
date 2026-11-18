/** Pós-consulta opt-in, sem backfill de evento antigo, sem registrar atendimento por inferência. */
import {CHECKIN_DAYS_P2,type CheckinDayP2,type EventPolicyRecordP2,type CheckinResponseP2} from './policy-record-p2';
export {CHECKIN_DAYS_P2};
export type {CheckinDayP2};
function datePlus(date:string,offset:number):string|null{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
  const [y,m,d]=date.split('-').map(Number),at=new Date(Date.UTC(y,m-1,d,12));
  if(at.getUTCFullYear()!==y||at.getUTCMonth()!==m-1||at.getUTCDate()!==d)return null;
  at.setUTCDate(at.getUTCDate()+offset);return at.toISOString().slice(0,10);
}
export type DueCheckinP2={id:string;appointmentId:string;day:CheckinDayP2;date:string;time:string;at:Date};
export function checkinInvitationsP2(args:{appointmentId:string;consultDate:string;status:string;policy:EventPolicyRecordP2|null;now:Date;hour?:string}):DueCheckinP2[]{
  const {appointmentId,consultDate,status,policy,now}=args;
  if(!appointmentId||status!=='realizada'||policy?.event_kind!=='checkin'||policy.event_id!==appointmentId||!policy.enabled||!policy.consent_at||!Number.isFinite(now.getTime()))return [];
  const consent=new Date(policy.consent_at);if(!Number.isFinite(consent.getTime()))return [];
  const hour=/^([01]\d|2[0-3]):[0-5]\d$/.test(args.hour||'')?args.hour!:'18:00';
  const out:DueCheckinP2[]=[];
  for(const day of CHECKIN_DAYS_P2){
    const date=datePlus(consultDate,day);if(!date)continue;
    const [y,m,d]=date.split('-').map(Number),[h,mi]=hour.split(':').map(Number);
    const standard=new Date(y,m-1,d,h,mi),previous=policy.checkin_answers?.[day];
    if(!previous&&standard<=consent)continue; // a consulta histórica não ativa lembretes anteriores ao consentimento
    if(previous&&previous.answer!=='adiar')continue;
    let at=standard;
    if(previous?.answer==='adiar'){
      if(!previous.snoozed_until)continue;
      at=new Date(previous.snoozed_until);
    }
    if(!Number.isFinite(at.getTime())||at<=now)continue;
    out.push({id:`${appointmentId}:D${day}`,appointmentId,day,date:`${at.getFullYear()}-${String(at.getMonth()+1).padStart(2,'0')}-${String(at.getDate()).padStart(2,'0')}`,time:`${String(at.getHours()).padStart(2,'0')}:${String(at.getMinutes()).padStart(2,'0')}`,at});
  }
  return out;
}
/** Permite responder depois do convite em uma janela finita (48h), sem retroatividade. */
export function checkinCanAnswerP2(args:{consultDate:string;status:string;consentAt:string|null|undefined;day:CheckinDayP2;now:Date;previous?:CheckinResponseP2}):boolean{
  if(args.status!=='realizada'||!args.consentAt||args.previous&&args.previous.answer!=='adiar')return false;
  const date=datePlus(args.consultDate,args.day);if(!date)return false;
  const [y,m,d]=date.split('-').map(Number),due=new Date(y,m-1,d,18);
  const consent=new Date(args.consentAt);
  if(!Number.isFinite(consent.getTime())||due<=consent)return false;
  const actual=args.previous?.answer==='adiar'&&args.previous.snoozed_until?new Date(args.previous.snoozed_until):due;
  return Number.isFinite(actual.getTime())&&args.now>=actual&&args.now.getTime()-actual.getTime()<=48*3600_000;
}
export const validCheckinAnswerP2=(s:string):s is CheckinResponseP2['answer']=>['reconheci','ja_sabia','dispensar','adiar'].includes(s);
/** One private prompt/day/person maximum. Deterministic, never diagnoses non-response. */
export function dailyCheckinBudgetP2(rows:readonly DueCheckinP2[]):DueCheckinP2[]{
  const dates=new Set<string>();
  return [...rows].sort((a,b)=>a.at.getTime()-b.at.getTime()||a.id.localeCompare(b.id))
    .filter(row=>!dates.has(row.date)&&Boolean(dates.add(row.date)));
}
