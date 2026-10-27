/**
 * V226 — audit of native pending dose alarms, never a sync or clinical action.
 * No medication names are exposed in this diagnostic summary.
 */
export type NativeDoseAgendaSummary = {
  grouped: number;
  individual: number;
  planned: number;
  stockReview: number;
  overdue: number;
  simultaneousIndividualSlots: number;
  total: number;
};

export type PendingNotificationLike = {id: number; extra?: unknown; schedule?: {at?: unknown}};
export type NativeDoseAlarmDetail = {id:number;type:string;date:string|null;time:string|null;target:string;scheduledAt:string|null};
const categories=new Set(["dose_reminder", "dose_planned", "dose_reminder_group", "dose_stock_review", "dose_overdue", "dose_overdue_group"]);
export function summarizeNativeDoseAgenda(notifications: PendingNotificationLike[], personId: string): NativeDoseAgendaSummary {
  const result={grouped:0,individual:0,planned:0,stockReview:0,overdue:0,simultaneousIndividualSlots:0,total:0};
  if(!personId.trim())return result;
  const seenIds=new Set<number>();
  const individualSlots=new Map<string,number>();
  for(const notification of notifications){
    if(!Number.isInteger(notification.id)||seenIds.has(notification.id))continue;
    const extra=(notification.extra && typeof notification.extra==="object")? notification.extra as Record<string,unknown>:null;
    if(!extra||extra.personId!==personId||typeof extra.type!=="string"||!categories.has(extra.type))continue;
    seenIds.add(notification.id);
    result.total+=1;
    switch(extra.type){
      case "dose_reminder_group":result.grouped+=1;break;
      case "dose_reminder":
        result.individual+=1;
        if(typeof extra.data==="string"&&typeof extra.horario==="string"){
          const key=`${extra.data}|${extra.horario}`;individualSlots.set(key,(individualSlots.get(key)||0)+1);
        }
        break;
      case "dose_planned":result.planned+=1;break;
      case "dose_stock_review":result.stockReview+=1;break;
      case "dose_overdue":case "dose_overdue_group":result.overdue+=1;break;
    }
  }
  result.simultaneousIndividualSlots=[...individualSlots.values()].filter(n=>n>1).length;
  return result;
}

const typeLabel:Record<string,string>={dose_reminder:"Dose",dose_planned:"Dose avulsa",dose_reminder_group:"Doses agrupadas",dose_stock_review:"Conferir estoque",dose_overdue:"Dose pendente",dose_overdue_group:"Doses pendentes"};
export function inspectNativeDoseAgenda(notifications: PendingNotificationLike[],personId:string):NativeDoseAlarmDetail[]{
  if(!personId.trim())return [];
  const seen=new Set<number>();
  return notifications.flatMap(notification=>{
    const extra=(notification.extra&&typeof notification.extra==="object")?notification.extra as Record<string,unknown>:null;
    if(!Number.isInteger(notification.id)||seen.has(notification.id)||!extra||extra.personId!==personId||typeof extra.type!=="string"||!categories.has(extra.type))return [];
    seen.add(notification.id);
    const route=typeof extra.targetRoute==="string"&&extra.targetRoute.startsWith("/")&&!extra.targetRoute.startsWith("//")?extra.targetRoute:"/hoje";
    const rawAt=notification.schedule?.at;
    const scheduledAt=rawAt instanceof Date&&!Number.isNaN(rawAt.getTime())?rawAt.toISOString():typeof rawAt==="string"&&!Number.isNaN(Date.parse(rawAt))?new Date(rawAt).toISOString():null;
    return [{id:notification.id,type:typeLabel[extra.type]||"Lembrete",date:typeof extra.data==="string"?extra.data:null,time:typeof extra.horario==="string"?extra.horario:null,target:route,scheduledAt}];
  }).sort((a,b)=>(a.scheduledAt||`${a.date||"9999"}T${a.time||"99:99"}`).localeCompare(b.scheduledAt||`${b.date||"9999"}T${b.time||"99:99"}`));
}
