import {classifyActiveBackupR7} from './active-receipt-recovery-r7';
/** Receipt verification contract: classify the original operation IDs against a complete,
 * authenticated server ledger snapshot. No Dexie mutation or network replay.
 * An explicit absence is NOT an ACK and is NOT permission to overwrite local or
 * remote state. The production adapter must establish/hold a server fence,
 * verify remote dependencies and predecessor facts, then restore atomically.
 */
import {assertAtomicAck,intentFromQueue,medicationPending,type PendingItem,type MedicationAtomicIntent} from './atomic-envelope';
import {validateMacro02Backup} from './backup-contract';
type BackupState=Parameters<typeof validateMacro02Backup>[0];
type ReceiptEvidence=Readonly<{operation_id:string;status:'committed';request:unknown;ack:unknown}|{operation_id:string;status:'absent_at_fence'}>;
export type LedgerSnapshot=Readonly<{account_id:string;fence_id:string;complete:true;rows:readonly ReceiptEvidence[]}>;
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function canonical(v:unknown):string {
 if(v===null||typeof v==='boolean'||typeof v==='string')return JSON.stringify(v);
 if(typeof v==='number'&&Number.isFinite(v))return JSON.stringify(v);
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(record(v))return '{'+Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
 throw Error('MACRO02_LEDGER_NON_JSON');
}
export function classifyMacro02RestoreIntents(backup:BackupState,remote:unknown,expectedFence:string){
 if(!expectedFence||!record(remote)||remote.account_id!==backup.userId||remote.fence_id!==expectedFence||remote.complete!==true||!Array.isArray(remote.rows))throw Error('MACRO02_LEDGER_UNVERIFIED');
 const prefix=`m02-active-receipts-r7:${backup.userId}:`;
 if(expectedFence.startsWith(prefix)){validateMacro02Backup(backup);return classifyActiveBackupR7(backup.userId,expectedFence.slice(prefix.length),backup.queue,remote);}
 if(backup.queue.some(q=>q.payload.macro02_compound!==undefined||q.payload.macro02_metadata!==undefined))throw Error('MACRO02_COMPOUND_RECEIPT_REQUIRED');
 const exact=backup.queue.map(q=>{const intent=intentFromQueue(q);if(!intent||intent.stockBefore.user_id!==backup.userId)throw Error('MACRO02_RESTORE_QUEUE_SCOPE');return {q,intent};});
 const verified=validateMacro02Backup(backup);if(verified.pendingCount!==exact.length)throw Error('MACRO02_RESTORE_QUEUE_INCOMPLETE');
 const ids=new Map(exact.map(x=>[x.intent.operationId,x]));if(ids.size!==exact.length)throw Error('MACRO02_RESTORE_DUPLICATE');
 const ledger=new Map<string,ReceiptEvidence>();
 for(const r of remote.rows){
  if(!record(r)||typeof r.operation_id!=='string'||!ids.has(r.operation_id)||ledger.has(r.operation_id))throw Error('MACRO02_LEDGER_SCOPE_OR_DUPLICATE');
  if(r.status==='committed'){
   const i=ids.get(r.operation_id)!.intent;
   if(canonical(r.request)!==canonical(i))throw Error('MACRO02_LEDGER_REQUEST_MISMATCH');
   assertAtomicAck(i,r.ack);
   ledger.set(r.operation_id,{operation_id:r.operation_id,status:'committed',request:r.request,ack:r.ack});
  }else if(r.status==='absent_at_fence'&&!('ack' in r)&&!('request' in r))ledger.set(r.operation_id,{operation_id:r.operation_id,status:r.status});
  else throw Error('MACRO02_LEDGER_STATUS_UNKNOWN');
 }
 if(ledger.size!==ids.size)throw Error('MACRO02_LEDGER_INCOMPLETE');
 const confirmed:string[]=[],pendingNeedsRemoteState:PendingItem[]=[],firstMissing:MedicationAtomicIntent[]=[];
 const groups=new Map<string,MedicationAtomicIntent>();
 for(const {intent} of exact){const s=intent.stockBefore;groups.set(JSON.stringify([s.user_id,s.person_id,s.medicationId]),intent);}
 for(const first of groups.values()){
  let absent=false;
  for(const i of medicationPending(verified.pending,first.stockBefore)){
   const r=ledger.get(i.operationId)!;
   if(r.status==='committed'){
    if(absent)throw Error('MACRO02_LEDGER_NON_CAUSAL');
    confirmed.push(i.operationId);
   }else{
    if(!absent)firstMissing.push(i);
    absent=true;pendingNeedsRemoteState.push(ids.get(i.operationId)!.q);
   }
  }
 }
 if(confirmed.length+pendingNeedsRemoteState.length!==exact.length)throw Error('MACRO02_RESTORE_CHAIN_INCOMPLETE');
 return {confirmed,pendingNeedsRemoteState,firstMissing,requiresRemoteStateVerification:true as const,allowsMutation:false as const};
}
