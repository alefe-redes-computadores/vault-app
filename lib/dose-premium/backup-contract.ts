import {verifyExtendedBackupR7} from './active-receipt-recovery-r7';
import {intentFromQueue,medicationPending,sameStock,sameCount,type PendingItem} from './atomic-envelope';
import {sameClinicalInstant,verifyDoseSnapshotAck,type DoseSnapshot} from './compatibility';
import {observedStockContext,type ScopedStockRow} from './stock-context';
import {acquisitionWire,withdrawalReceiptWire} from './acquisition-wire';
import {sameAcquisition} from './atomic-envelope';
type Row=Record<string,unknown>;
type ScopedRow={id?:string;user_id?:string;person_id?:string};
/** A recovery bundle is evidence, not a replay command. Never repeat debits on import. */
export function validateMacro02Backup(input:{userId:string;persons:readonly ScopedRow[];medications:readonly ScopedStockRow[];doses:readonly Row[];acquisitions:readonly Row[];withdrawals?:readonly Row[];links?:readonly Row[];queue:readonly PendingItem[]}){
 const {userId}=input;if(!userId)throw Error('Backup sem conta.');
 const persons=new Set(input.persons.filter(r=>r.user_id===userId&&r.id).map(r=>r.id));
 const owned=(r:ScopedRow)=>r.user_id===userId&&!!r.person_id&&persons.has(r.person_id)&&!!r.id;
 const meds=new Map(input.medications.filter(owned).map(r=>[r.id!,r]));
 const withdrawals=new Map((input.withdrawals??[]).filter(r=>owned(r as ScopedRow)).map(r=>[String(r.id),r]));
 const doses=new Map(input.doses.filter(r=>owned(r as ScopedRow)).map(r=>[String(r.id),r]));
 const acq=new Map(input.acquisitions.filter(r=>owned(r as ScopedRow)).map(r=>[String(r.id),r]));
 for(const row of input.doses){if(row.user_id!==userId)continue;const protectedFact=['unidade_dose','unidade_dose_rotulo','fonte_unidade','estoque_movimento','farmaco_snapshot'].some(k=>row[k]!=null);if(!protectedFact)continue;const med=meds.get(String(row.medicamento_id));if(!owned(row as ScopedRow)||!med||med.person_id!==row.person_id||!verifyDoseSnapshotAck(row as DoseSnapshot,row as DoseSnapshot))throw Error('Fato histórico protegido inválido no backup.');}
 const pending=input.queue.filter(r=>r.payload&&r.payload.user_id===userId&&(r.payload.macro02_atomic!==undefined||r.payload.macro02_compound!==undefined||r.payload.macro02_metadata!==undefined));
 const queue=pending.filter(r=>r.payload.macro02_atomic!==undefined&&r.payload.macro02_compound===undefined);
 if(pending.some(q=>q.payload.macro02_compound!==undefined||q.payload.macro02_metadata!==undefined))verifyExtendedBackupR7(userId,pending,{medicamentos:input.medications,renovacoes:input.acquisitions,retiradas:input.withdrawals??[],doseLogs:input.doses,a1_prescription_links:input.links??[]});
 const scopes=new Map<string,{user_id:string;person_id:string;medicationId:string}>();const ops=new Set<string>();
 for(const q of queue){const i=intentFromQueue(q)!;const s=i.stockBefore;if(!persons.has(s.person_id)||!meds.has(s.medicationId)||ops.has(i.operationId))throw Error('Intenção sem escopo ou duplicada no backup.');ops.add(i.operationId);scopes.set(s.medicationId,s);}
 for(const scope of scopes.values()){
  const chain=medicationPending(queue,scope),last=chain.at(-1)!,med=meds.get(scope.medicationId)!;
  if(!sameStock(observedStockContext(med,scope),last.stockAfter)||!sameClinicalInstant(med.updated_at,last.stockRevisionAfter)||(last.version===2&&!sameCount(med,last.afterCount)))throw Error('Saldo e fila divergentes no backup.');
  const latest=new Map<string,typeof last>();
  for(const i of chain){if(i.version===1)latest.set((i.after??i.previous)!.id,i);else if(i.acquisition){const row=acq.get(String(i.acquisition.id));if(!row||!sameAcquisition(i.acquisition,acquisitionWire(row)))throw Error('Aquisição e fila divergentes no backup.');if(i.withdrawalId){const w=withdrawals.get(i.withdrawalId);if(!w||!sameAcquisition(i.withdrawalAfter??null,withdrawalReceiptWire(w)))throw Error('Retirada e fila divergentes no backup.');}}}
  for(const [id,i] of latest){if(i.version!==1)continue;const row=doses.get(id);if(i.after===null?!!row:!row||!verifyDoseSnapshotAck(i.after,row as DoseSnapshot))throw Error('Dose e fila divergentes no backup.');}
 }
 return {version:1 as const,user_id:userId,mode:'evidence_only_no_replay' as const,pending:pending.map(q=>({table:q.table,operation:q.operation,chave:q.chave,payload:q.payload})),pendingCount:pending.length};
}
