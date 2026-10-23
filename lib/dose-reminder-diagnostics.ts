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

export type PendingNotificationLike = {id: number; extra?: unknown};
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
