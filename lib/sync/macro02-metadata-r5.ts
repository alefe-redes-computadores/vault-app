import {db} from '@/lib/db';
import {supabase} from '@/lib/supabase/client';
import type {SyncQueueItem} from '@/lib/types';
import {metadataIntentFromQueue,assertMacro02MetadataAck,finalizeMacro02MetadataReceipt,type MetadataAckR5} from '@/lib/dose-premium/cutover-metadata-transport-r5';
import {RESIDUAL_TABLES} from '@/lib/dose-premium/cutover-metadata-batch';

async function withSession<T>(uid:string,run:(guard:()=>void,account:()=>Promise<string|null>)=>Promise<T>):Promise<T>{
 let invalid=false;const {data:{subscription}}=supabase.auth.onAuthStateChange(e=>{if(e!=='INITIAL_SESSION')invalid=true;});
 const guard=()=>{if(invalid)throw Error('M02_METADATA_SESSION_CHANGED');};
 const account=async()=>{guard();const {data,error}=await supabase.auth.getUser();guard();return error?null:data.user?.id??null;};
 try{if(await account()!==uid)throw Error('M02_METADATA_AUTH');return await run(guard,account);}finally{invalid=true;subscription.unsubscribe();}
}
/** New endpoint only. No ordinary row upsert or legacy fallback. */
export async function sendMacro02MetadataR5(item:SyncQueueItem,uid:string):Promise<MetadataAckR5>{
 if(item.payload.macro02_compound!==undefined)throw Error("M02_COMPOUND_TRANSPORT_REQUIRED");
 const intent=metadataIntentFromQueue(item);if(!intent||intent.account_id!==uid)throw Error('M02_METADATA_SCOPE');
 return withSession(uid,async(guard,account)=>{
  const {data,error}=await supabase.rpc('vault_macro02_commit_metadata_r5',{p_intent:intent});guard();
  if(error)throw Error('M02_METADATA_REMOTE_UNAVAILABLE');
  if(await account()!==uid)throw Error('M02_METADATA_ACCOUNT_CHANGED');guard();
  return assertMacro02MetadataAck(intent,data);
 });
}
export async function finalizeMacro02MetadataR5(item:SyncQueueItem,ack:unknown):Promise<boolean>{
 if(item.payload.macro02_compound!==undefined)throw Error("M02_COMPOUND_FINALIZE_REQUIRED");
 const intent=metadataIntentFromQueue(item);if(!intent)throw Error('M02_METADATA_INTENT');
 return withSession(intent.account_id,(guard,account)=>finalizeMacro02MetadataReceipt({
  assertSession:guard,authenticatedAccount:account,
  transaction:run=>db.transaction('rw',[db.syncQueue,...RESIDUAL_TABLES.map(t=>db.table(t))],run),
  queue:id=>db.syncQueue.get(id),row:(t,id)=>db.table(t).get(id),
  markSynced:async(t,id)=>{if(await db.table(t).update(id,{synced:true})!==1)throw Error('M02_METADATA_LOCAL_MARK');},
  removeQueue:async id=>{await db.syncQueue.delete(id);},
 },item,ack));
}
