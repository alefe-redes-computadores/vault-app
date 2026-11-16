/** M153 P7.1-B — autoridade de leitura de uma retirada exata e da pessoa ativa. */
export type WithdrawalLinkStateP71B = "none" | "active" | "completed" | "review";
export type WithdrawalOwnerP71B = { id?:string|null; user_id?:string|null; person_id?:string|null };
export type WithdrawalEntryP71B = {
  id?:string|null; medicamento_id?:string|null;
  user_id?:string|null;person_id?:string|null;
  status:string; realizada_em?:string|null;renovacao_realizada_id?:string|null;
};
export type WithdrawalLinkDecisionP71B = {state:WithdrawalLinkStateP71B;eventId:string|null};
/** Nunca adivinha titular, não cria ciclo e não altera estoque. */
export function classifyWithdrawalLinkP71B(
  href:string|null|undefined,
  med:WithdrawalOwnerP71B,
  withdrawals:readonly WithdrawalEntryP71B[],
):WithdrawalLinkDecisionP71B {
  const raw=/^\/saude\/retiradas\/detalhes\?id=([^&#]+)/.exec(href||"")?.[1];
  if(!raw)return {state:"none",eventId:null};
  let eventId:string;
  try { eventId=decodeURIComponent(raw); } catch {return {state:"review",eventId:null};}
  if(!eventId||!med.id||!med.user_id||!med.person_id)return {state:"review",eventId};
  const row=withdrawals.find(item=>item.id===eventId&&item.medicamento_id===med.id&&
    item.user_id===med.user_id&&item.person_id===med.person_id);
  if(!row)return {state:"review",eventId};
  // Cancelado/não realizado nunca prova retirada efetiva.
  if(row.status==="cancelada"||row.status==="nao_realizada")return {state:"review",eventId};
  if(row.status==="realizada"||Boolean(row.realizada_em||row.renovacao_realizada_id))
    return {state:"completed",eventId};
  if(row.status==="agendada")return {state:"active",eventId};
  return {state:"review",eventId};
}
