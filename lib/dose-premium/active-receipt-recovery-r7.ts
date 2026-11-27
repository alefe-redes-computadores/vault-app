import {compoundFromQueueR6,assertCompoundAckR6,compoundPostimagesR6,projectCompoundRow} from './cutover-compound-r6';
import {metadataIntentFromQueue,assertMacro02MetadataAck} from './cutover-metadata-transport-r5';
import {projectResidualMetadataRow} from './cutover-metadata-batch';
import {intentFromQueue,assertAtomicAck,sameAcquisition,medicationPending,type PendingItem} from './atomic-envelope';
import {cutoverCanonical} from './cutover-recovery';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const fail=(s:string):never=>{throw Error('M02_R7_RECOVERY_'+s);};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
export function recoveryOperationR7(q:PendingItem,uid:string){
 if(q.payload.user_id!==uid)return fail('ACCOUNT');
 const c=compoundFromQueueR6(q);if(c)return {kind:'compound' as const,id:c.operation_id,epoch:c.epoch,request:c,ack:(r:unknown)=>assertCompoundAckR6(c,r)};
 const m=metadataIntentFromQueue(q);if(m)return {kind:'metadata' as const,id:m.operation_id,epoch:m.epoch,request:m,ack:(r:unknown)=>assertMacro02MetadataAck(m,r)};
 const a=intentFromQueue(q);if(!a||a.stockBefore.user_id!==uid)return fail('INTENT');
 return {kind:'atomic' as const,id:a.operationId,epoch:uuid(q.payload.macro02_epoch)?q.payload.macro02_epoch:null,request:a,ack:(r:unknown)=>assertAtomicAck(a,r)};
}
export function activeReceiptRequestR7(rows:readonly PendingItem[],uid:string,epoch:string){
 const ops=rows.map(q=>recoveryOperationR7(q,uid));
 if(!uuid(epoch)||ops.length>512||ops.some(x=>x.epoch!==epoch)||new Set(ops.map(x=>x.id)).size!==ops.length)return fail('EPOCH_OR_IDS');
 return ops.map(x=>x.id);
}
/** Validate every non-atomic terminal row and ensure no overlapping intents
 * are quietly merged. Original queues and row data remain unchanged. */
export function verifyExtendedBackupR7(uid:string,queue:readonly PendingItem[],rows:Readonly<Record<string,readonly object[]>>){
 const seen=new Set<string>(), scopes=new Set<string>();
 for(const q of queue){const op=recoveryOperationR7(q,uid);if(seen.has(op.id))return fail('DUPLICATE');seen.add(op.id);
  if(op.kind==='compound'){
   const c=op.request, scope=String(c.medication_before.id);if(scopes.has(scope)||queue.some(other=>other!==q&&other.payload.user_id===uid&&(other.table==='medicamentos'?other.payload.id:other.payload.medicamento_id)===scope))return fail('COMPOUND_OVERLAP');scopes.add(scope);
   for(const id of [c.operation_id,...c.metadata.map(m=>m.operation_id),...(c.stock?[c.stock.operationId]:[])]){if(id!==op.id){if(seen.has(id))return fail('DUPLICATE_CHILD');seen.add(id);}}
   for(const x of compoundPostimagesR6(c)){const found=(rows[x.table]??[]).filter((r)=>record(r)&&r.id===x.id);if(x.row===null){if(found.length)return fail('DELETE');continue;}if(found.length!==1||!record(found[0])||found[0].user_id!==uid)return fail('ROW');const p=projectCompoundRow(x.table,found[0]);if(c.stock?.withdrawalId===x.id&&x.table==='retiradas'){if(!sameAcquisition(x.row,p))return fail('WITHDRAWAL');}else if(cutoverCanonical(p)!==cutoverCanonical(x.row))return fail('POSTIMAGE');}
  }else if(op.kind==='metadata')for(const c of op.request.changes){const id=(c.after??c.before)!.id,found=(rows[c.table]??[]).filter(r=>record(r)&&r.id===id);if(c.after===null){if(found.length)return fail('DELETE');continue;}if(found.length!==1||!record(found[0])||found[0].user_id!==uid||cutoverCanonical(projectResidualMetadataRow(c.table,found[0]))!==cutoverCanonical(c.after))return fail('POSTIMAGE');}
 }
}
export function classifyActiveBackupR7(uid:string,epoch:string,queue:readonly PendingItem[],raw:unknown){
 const ids=activeReceiptRequestR7(queue,uid,epoch),ops=queue.map(q=>recoveryOperationR7(q,uid));
 const fence=`m02-active-receipts-r7:${uid}:${epoch}`;
 if(!record(raw)||raw.account_id!==uid||raw.fence_id!==fence||raw.complete!==true||!Array.isArray(raw.rows)||raw.rows.length!==ids.length)return fail('LEDGER');
 const status=new Map<string,string>();
 for(const r of raw.rows){if(!record(r)||typeof r.operation_id!=='string'||!ids.includes(r.operation_id)||status.has(r.operation_id))return fail('SCOPE');const op=ops[ids.indexOf(r.operation_id)];if(r.status==='committed'){if(cutoverCanonical(r.request)!==cutoverCanonical(op.request))return fail('REQUEST');op.ack(r.ack);}else if(r.status!=='absent_at_fence'||'request'in r||'ack'in r)return fail('STATUS');status.set(r.operation_id,r.status);}
 const atomic=queue.filter((_,i)=>ops[i].kind==='atomic');for(const q of atomic){const a=intentFromQueue(q)!;let absent=false;for(const x of medicationPending(atomic,a.stockBefore)){if(status.get(x.operationId)==='absent_at_fence')absent=true;else if(absent)return fail('NON_CAUSAL');}}
 return {confirmed:ids.filter(id=>status.get(id)==='committed'),pendingNeedsRemoteState:queue.filter((_,i)=>status.get(ids[i])==='absent_at_fence'),firstMissing:[],requiresRemoteStateVerification:true as const,allowsMutation:false as const};
}
