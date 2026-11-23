/** A11: relatório de observações; evento agendado NÃO prova notificação entregue. */
export type A11NotificationEvidence={
  id:string;user_id:string;person_id:string;plannedAt:string|null;
  scheduled:boolean;observedDelivery:boolean;permission:'granted'|'denied'|'unknown';
  optIn:boolean;quietHoursAcknowledged:boolean;
};
export function auditA11Notifications(rows:readonly A11NotificationEvidence[],userId:string,personId:string){
 if(!userId||!personId)throw Error('Escopo de notificação obrigatório');
 const ids=new Set<string>();let planned=0,scheduled=0,observed=0,unverified=0,contradictions=0;
 for(const row of rows){
  if(!row.id||row.user_id!==userId||row.person_id!==personId)throw Error('Notificação de outra pessoa/conta');
  if(ids.has(row.id))throw Error('Notificação duplicada por ID');ids.add(row.id);
  if(row.plannedAt)planned++;
  if(row.scheduled)scheduled++;
  if(row.observedDelivery)observed++;
  if(row.observedDelivery&&!row.scheduled)contradictions++;
  if(row.scheduled&&(!row.optIn||row.permission!=='granted'))contradictions++;
  if(!row.observedDelivery)unverified++;
 }
 return {planned,scheduled,observed,unverified,contradictions,
  physicalEvidenceRequired:true,ready:false as const};
}
