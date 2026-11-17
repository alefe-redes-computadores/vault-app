/** CI360 M2 / Metadona P0 — exact owner/cycle/day reconciliation; read-only. */
import type { Retirada, Medicamento } from '@/lib/types';
export type WithdrawalConflictM2={status:'review'; medicationId:string;cycleId:string;date:string;pendingId:string;completedIds:string[]};
const isOpenWithdrawal=(r:Retirada)=>r.status==='agendada'&&!r.realizada_em&&!r.renovacao_realizada_id;
const isCompleted=(r:Retirada)=>r.status==='realizada'||Boolean(r.realizada_em||r.renovacao_realizada_id);
const same=(a:Retirada,b:Retirada)=>Boolean(a.user_id&&a.person_id&&a.medicamento_id&&a.fornecimento_ciclo_id&&b.fornecimento_ciclo_id)&&
  a.user_id===b.user_id&&a.person_id===b.person_id&&a.medicamento_id===b.medicamento_id&&
  a.fornecimento_ciclo_id===b.fornecimento_ciclo_id&&a.data===b.data;
/** A same-day identical-cycle record marked completed is evidence of a conflict, NOT proof of arbitrary other-day closure. */
export function conflictingWithdrawalM2(row:Retirada,rows:readonly Retirada[]):WithdrawalConflictM2|null{
  if(!row.id||!row.fornecimento_ciclo_id||!isOpenWithdrawal(row))return null;
  const completed=rows.filter(other=>other.id!==row.id&&same(row,other)&&isCompleted(other)&&Boolean(other.id));
  return completed.length?{status:'review',medicationId:row.medicamento_id,cycleId:row.fornecimento_ciclo_id,date:row.data,pendingId:row.id,completedIds:completed.map(r=>r.id!)}:null;
}
export function availableWithdrawalsM2(rows:readonly Retirada[]):Retirada[]{
  return rows.filter(row=>isOpenWithdrawal(row)&&!conflictingWithdrawalM2(row,rows));
}
export function withdrawalConflictsM2(rows:readonly Retirada[]):WithdrawalConflictM2[]{
  return rows.map(row=>conflictingWithdrawalM2(row,rows)).filter((x):x is WithdrawalConflictM2=>Boolean(x));
}
export function withdrawalConflictForMedicationM2(med:Pick<Medicamento,'id'|'user_id'|'person_id'>,rows:readonly Retirada[]):WithdrawalConflictM2|null{
  if(!med.id||!med.user_id||!med.person_id)return null;
  return withdrawalConflictsM2(rows).find(x=>rows.some(r=>r.id===x.pendingId&&r.user_id===med.user_id&&r.person_id===med.person_id&&r.medicamento_id===med.id))||null;
}
export function contextualWithdrawalHrefM2<T extends {href:string;title?:string;reason?:string;medicationId?:string|null}>(action:T|null|undefined,
  med:readonly Pick<Medicamento,'id'|'user_id'|'person_id'>[],rows:readonly Retirada[]):T|null|undefined{
  if(!action||!/\/saude\/retiradas\/(?:detalhes|nova)/i.test(action.href))return action;
  const medication=med.find(m=>m.id&&m.id===action.medicationId);
  const conflict=medication?withdrawalConflictForMedicationM2(medication,rows):null;
  if(!conflict)return action;
  return {...action,href:`/saude/retiradas?review=${encodeURIComponent(conflict.pendingId)}`,
    title:'Conferir vínculo de retirada',reason:'Há retirada concluída e outra agendada para o mesmo ciclo e dia. Conferir antes de agir; nenhum registro foi alterado.'} as T;
}
