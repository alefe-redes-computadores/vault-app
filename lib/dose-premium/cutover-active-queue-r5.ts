import {compoundFromQueueR6} from './cutover-compound-r6';
import {intentFromQueue,type PendingItem} from './atomic-envelope';
import {countMacro02Pending} from './authority-session';
import {metadataIntentFromQueue} from './cutover-metadata-transport-r5';
import {parseMacro02Enrollment,type Enrollment} from './cutover-enrollment-authority';
const uuid=(x:unknown):x is string=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x);
const protectedTable=(t:string)=>['doseLogs','medicamentos','renovacoes','retiradas'].includes(t);
export function requireMacro02AtomicEpoch(epoch:unknown):string{if(!uuid(epoch))throw Error('M02_R5_ATOMIC_EPOCH_REQUIRED');return epoch;}
/** The R2 classifier remains unchanged for archived receipts. R5 accepts only
 * immutable intents already bound to the authenticated current epoch. A legacy
 * outbox or a missing epoch must not be silently adopted into Premium. */
export function countMacro02ActivePending(rows:readonly PendingItem[],uid:string,epoch:string){
 let legacy=0,premium=0,unclassified=0;
 for(const row of rows){
  if(!protectedTable(row.table))continue;
  if(!row.payload||typeof row.payload.user_id!=='string'||!row.payload.user_id){unclassified++;continue;}
  if(row.payload.user_id!==uid)continue;
  try{
   if(row.payload.macro02_compound!==undefined){const c=compoundFromQueueR6(row);if(!c||c.account_id!==uid||c.epoch!==epoch)throw Error('scope');premium++;continue;}
   if(row.payload.macro02_metadata!==undefined){const i=metadataIntentFromQueue(row);if(!i||i.account_id!==uid||i.epoch!==epoch)throw Error('scope');premium++;continue;}
   if(row.payload.macro02_atomic!==undefined){const i=intentFromQueue(row);if(!i||i.stockBefore.user_id!==uid||requireMacro02AtomicEpoch(row.payload.macro02_epoch)!==epoch)throw Error('scope');premium++;continue;}
   const old=countMacro02Pending([row],uid);legacy+=old.legacy;unclassified+=old.unclassified+old.premium;
  }catch{unclassified++;}
 }
 return {legacy,premium,unclassified};
}
export function allowMacro02QueueR5(enrollment:Enrollment,item:PendingItem,rows:readonly PendingItem[],uid:string){
 const e=parseMacro02Enrollment(enrollment,uid);
 if(!protectedTable(item.table)||item.payload.user_id!==uid)return false;
 if(e.state==='legacy'){const p=countMacro02Pending(rows,uid);return p.legacy>0&&!p.premium&&!p.unclassified&&!item.payload.macro02_atomic&&!item.payload.macro02_metadata;}
 if(e.state!=='premium'||!e.epoch)return false;
 const p=countMacro02ActivePending(rows,uid,e.epoch);
 return !p.legacy&&!p.unclassified&&p.premium>0&&countMacro02ActivePending([item],uid,e.epoch).premium===1;
}
