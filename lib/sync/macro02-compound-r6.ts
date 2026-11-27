import {db} from '@/lib/db';
import {supabase} from '@/lib/supabase/client';
import type {SyncQueueItem} from '@/lib/types';
import {compoundFromQueueR6,compoundQueueAnchorR6,checkCompoundLocalDeltaR6,compoundPostimagesR6,projectCompoundRow,assertCompoundAckR6,exactCompoundQueueUnchanged,type CompoundIntentR6,type CompoundLocalSnapshotR6} from '@/lib/dose-premium/cutover-compound-r6';
import {cutoverCanonical} from '@/lib/dose-premium/cutover-recovery';
import {sameAcquisition,medicationPending} from '@/lib/dose-premium/atomic-envelope';
import type {ClinicalWriteAuthority} from '@/lib/dose-premium/dormant-release-authority';
export const compoundTablesR6=['medicamentos','renovacoes','retiradas','a1_prescription_links'] as const;
export async function captureCompoundLocalR6():Promise<CompoundLocalSnapshotR6>{
 return {rows:Object.fromEntries(await Promise.all(compoundTablesR6.map(async t=>[t,await db.table(t).toArray()]))),queue:await db.syncQueue.toArray()} as unknown as CompoundLocalSnapshotR6;
}
/** Caller owns a Dexie rw transaction containing all four stores and outbox. */
export async function stageCompoundR6(c:CompoundIntentR6,before:CompoundLocalSnapshotR6,authority:ClinicalWriteAuthority){
 await authority.assertCurrent();if(authority.writer!=='premium'||authority.epoch!==c.epoch)throw Error('M02_COMPOUND_AUTHORITY');
 const after=await captureCompoundLocalR6(),remove=checkCompoundLocalDeltaR6(c,before,after),anchor=compoundQueueAnchorR6(c);
 // Same key must never be coalesced or overwritten. Old queue bytes survive.
 if(await db.syncQueue.where('chave').equals(anchor.chave).first())throw Error('M02_COMPOUND_QUEUE_EXISTS');
 for(const id of remove)await db.syncQueue.delete(id);
 const stamp=new Date().toISOString(),id=crypto.randomUUID();
 await db.syncQueue.add({...anchor,id,created_at:stamp,updated_at:stamp,retry_count:0,failed:false} as SyncQueueItem);
 const item=await db.syncQueue.get(id);if(!item||!exactCompoundQueueUnchanged(item,anchor)||!compoundFromQueueR6(item))throw Error('M02_COMPOUND_QUEUE_READBACK');
 await authority.assertCurrent();await authority.assertFinalQueue?.();
}
async function withSession<T>(uid:string,run:(guard:()=>void,account:()=>Promise<string|null>)=>Promise<T>):Promise<T>{
 let invalid=false;const {data:{subscription}}=supabase.auth.onAuthStateChange(e=>{if(e!=='INITIAL_SESSION')invalid=true;});
 const guard=()=>{if(invalid)throw Error('M02_COMPOUND_SESSION');};const account=async()=>{guard();const {data,error}=await supabase.auth.getUser();guard();return error?null:data.user?.id??null;};
 try{if(await account()!==uid)throw Error('M02_COMPOUND_AUTH');return await run(guard,account);}finally{invalid=true;subscription.unsubscribe();}
}
export async function sendCompoundR6(item:SyncQueueItem,uid:string){const c=compoundFromQueueR6(item);if(!c||c.account_id!==uid)throw Error('M02_COMPOUND_SCOPE');return withSession(uid,async(guard,account)=>{const {data,error}=await supabase.rpc('vault_macro02_commit_compound_r6',{p_intent:c});guard();if(error)throw Error('M02_COMPOUND_REMOTE_UNAVAILABLE');if(await account()!==uid)throw Error('M02_COMPOUND_ACCOUNT');return assertCompoundAckR6(c,data);});}
/** The exact compound receipt is the only authority to clear this queue item.
 * Do not mark a single child as synced if another child's postimage changed. */
export async function finalizeCompoundR6(item:SyncQueueItem,ack:unknown){
 const c=compoundFromQueueR6(item);if(!c||!item.id)throw Error('M02_COMPOUND_SCOPE');assertCompoundAckR6(c,ack);
 return withSession(c.account_id,(guard)=>db.transaction('rw',[...compoundTablesR6.map(t=>db.table(t)),db.syncQueue,db.persons],async()=>{
  guard();const current=await db.syncQueue.get(item.id!);if(!current||current.updated_at!==item.updated_at||!exactCompoundQueueUnchanged(current,item))return false;
  const person=await db.persons.get(String(c.medication_before.person_id));if(!person||person.user_id!==c.account_id)throw Error('M02_COMPOUND_PERSON');
  if(c.stock){const chain=medicationPending(await db.syncQueue.toArray(),c.stock.stockBefore);if(chain.length!==1||chain[0].operationId!==c.stock.operationId)throw Error('M02_COMPOUND_CHAIN');}
  const images=compoundPostimagesR6(c);
  for(const x of images){guard();const row=await db.table(x.table).get(x.id);if(x.row===null){if(row!==undefined)throw Error('M02_COMPOUND_DELETE_CHANGED');continue;}
   if(!row||row.user_id!==c.account_id||row.person_id!==c.medication_before.person_id)throw Error('M02_COMPOUND_LOCAL_SCOPE');
   const projected=projectCompoundRow(x.table,row);if(c.stock?.withdrawalId===x.id&&x.table==='retiradas'){if(!sameAcquisition(x.row,projected))throw Error('M02_COMPOUND_WITHDRAWAL_CHANGED');}
   else if(cutoverCanonical(projected)!==cutoverCanonical(x.row))throw Error('M02_COMPOUND_POSTIMAGE_CHANGED');
  }
  for(const x of images){guard();if(x.row!==null&&await db.table(x.table).update(x.id,{synced:true})!==1)throw Error('M02_COMPOUND_MARK');}
  guard();await db.syncQueue.delete(item.id!);guard();return true;
 }));
}
