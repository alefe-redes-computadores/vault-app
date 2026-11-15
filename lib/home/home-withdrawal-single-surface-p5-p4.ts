/** Administrative visibility only. The agenda remains the single actionable
 * surface for an EXACT same-owner withdrawal event. Independent clinical,
 * prescription, inventory and different-event warnings are not suppressed. */
export type WithdrawalAlertP5P4={id:string;kind:string;level:string;href:string};
export type WithdrawalAgendaItemP5P4={id?:string|null};
export function homeAdministrativeWithdrawalAlertsP5P4<T extends WithdrawalAlertP5P4>(
  alerts:readonly T[], displayedWithdrawals:readonly WithdrawalAgendaItemP5P4[],
):T[] {
  const ids=new Set(displayedWithdrawals.map(item=>item.id||'').filter(Boolean));
  if(!ids.size)return [...alerts];
  return alerts.filter(alert=>{
    if(alert.kind!=='sus')return true;
    let parsed:URL;
    try{parsed=new URL(alert.href,'https://vault.local');}catch{return true;}
    if(parsed.origin!=='https://vault.local'||parsed.pathname!=='/saude/retiradas/detalhes')return true;
    const eventId=parsed.searchParams.get('id')||'';
    if(!eventId||!ids.has(eventId))return true;
    // Check both the canonical alert ID and the exact destination. A generic
    // 'urgent' alert with the same href might be a distinct phenomenon.
    return alert.id!==`sus-retirada-${eventId}`;
  });
}

/** Retirada já acionável pela Agenda: ocultar somente CTA operacional idêntica. */
export function continuationWithdrawalAlreadyVisibleP5(
  href:string|null|undefined, displayed:readonly {id?:string|null}[],
):boolean {
  if(!href)return false;
  let url:URL;
  try{url=new URL(href,'https://vault.local');}catch{return false;}
  if(url.origin!=='https://vault.local'||url.pathname!=='/saude/retiradas/detalhes')return false;
  const id=url.searchParams.get('id');
  return Boolean(id && displayed.some(row=>row.id===id));
}
