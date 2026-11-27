import {cutoverCanonical} from './cutover-recovery';
import {exactMacro02ValueIdentity} from './cutover-storage-codec';
import {projectResidualMetadataRow,residualMetadataQueueKey} from './cutover-metadata-batch';
import {parseMacro02MetadataIntent,type MetadataIntent,type MetadataTable} from './cutover-metadata-intent';
import type {PendingItem} from './atomic-envelope';

type Row=Record<string,unknown>;
export type MetadataAckR5=Readonly<{format:'macro02-metadata-ack-r5';account_id:string;epoch:string;operation_id:string;request:MetadataIntent;committed:true}>;
const record=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v);
const fail=(s:string):never=>{throw Error('M02_METADATA_TRANSPORT_'+s);};
export const isMacro02Metadata=(q:PendingItem)=>q.payload.macro02_metadata!==undefined;
export function metadataIntentFromQueue(q:PendingItem):MetadataIntent|null{
 if(!isMacro02Metadata(q))return null;
 const p=q.payload,i=parseMacro02MetadataIntent(p.macro02_metadata),first=i.changes[0],r=(first.after??first.before)!;
 if(q.operation!=='update'||q.chave!==residualMetadataQueueKey(i)||q.table!==first.table||p.user_id!==i.account_id||p.person_id!==r.person_id||p.id!==r.id||p.macro02_atomic!==undefined)return fail('QUEUE_SCOPE');
 return i;
}
export function assertMacro02MetadataAck(i:MetadataIntent,raw:unknown):MetadataAckR5{
 if(!record(raw)||Object.keys(raw).sort().join(',')!=='account_id,committed,epoch,format,operation_id,request'||raw.format!=='macro02-metadata-ack-r5'||raw.account_id!==i.account_id||raw.epoch!==i.epoch||raw.operation_id!==i.operation_id||raw.committed!==true||cutoverCanonical(raw.request)!==cutoverCanonical(i))return fail('ACK_SCOPE');
 // The original envelope must be the exact persisted receipt, not an HTTP
 // success flag, a count, a newly generated operation ID or a partial echo.
 return JSON.parse(cutoverCanonical(raw)) as MetadataAckR5;
}
export type MetadataQueueRow=PendingItem&{id?:string;updated_at?:string};
export type MetadataFinalizeHost={
 assertSession:()=>void;
 authenticatedAccount:()=>Promise<string|null>;
 transaction:<T>(fn:()=>Promise<T>)=>Promise<T>;
 queue:(id:string)=>Promise<MetadataQueueRow|undefined>;
 row:(table:MetadataTable,id:string)=>Promise<Row|undefined>;
 markSynced:(table:MetadataTable,id:string)=>Promise<void>;
 removeQueue:(id:string)=>Promise<void>;
};
/** An ACK for a batch may never mark only its anchor, remove a changed
 * intention, erase a newer write, or turn another account into a success. */
export async function finalizeMacro02MetadataReceipt(host:MetadataFinalizeHost,item:MetadataQueueRow,raw:unknown):Promise<boolean>{
 const intent=metadataIntentFromQueue(item);if(!intent||!item.id)return fail('INTENT');
 assertMacro02MetadataAck(intent,raw);host.assertSession();
 if(await host.authenticatedAccount()!==intent.account_id)return fail('ACCOUNT');host.assertSession();
 return host.transaction(async()=>{
  host.assertSession();const current=await host.queue(item.id!);
  if(!current||current.chave!==item.chave||current.table!==item.table||current.operation!==item.operation||current.updated_at!==item.updated_at||exactMacro02ValueIdentity(current.payload)!==exactMacro02ValueIdentity(item.payload))return false;
  for(const c of intent.changes){
   host.assertSession();const expected=c.after,id=String((expected??c.before)!.id),row=await host.row(c.table,id);
   if(expected===null){if(row!==undefined)return fail('LOCAL_DELETE_CHANGED');continue;}
   if(!row||row.user_id!==intent.account_id||row.person_id!==expected.person_id||cutoverCanonical(projectResidualMetadataRow(c.table,row))!==cutoverCanonical(expected))return fail('LOCAL_POSTIMAGE_CHANGED');
  }
  // No writes before every row of the batch has been verified.
  for(const c of intent.changes){host.assertSession();if(c.after!==null)await host.markSynced(c.table,String(c.after.id));}
  host.assertSession();await host.removeQueue(item.id!);host.assertSession();return true;
 });
}
