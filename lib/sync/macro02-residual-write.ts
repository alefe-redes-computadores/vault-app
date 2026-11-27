import type {Table} from 'dexie';
import {db} from '@/lib/db';
import type {SyncQueueItem} from '@/lib/types';
import {RESIDUAL_TABLES,type ResidualSnapshot} from '@/lib/dose-premium/cutover-metadata-batch';
import {runMacro02ResidualTransaction} from '@/lib/dose-premium/cutover-residual-transaction';
import {exactMacro02ValueIdentity} from '@/lib/dose-premium/cutover-storage-codec';
import type {ClinicalWriteAuthority} from '@/lib/dose-premium/dormant-release-authority';
import type {MetadataKind} from '@/lib/dose-premium/cutover-metadata-intent';

/** Preserve the existing transaction exactly for legacy. In Premium the four
 * clinical stores and their ordinary enqueues are captured together. Only
 * validated immutable metadata may replace those new queue entries. */
export function runMacro02ResidualWrite<T>(authority:ClinicalWriteAuthority,uid:string,tables:Table[],run:()=>Promise<T>,preferred?:MetadataKind):Promise<T>{
 if(authority.writer==='legacy')return db.transaction('rw',tables,async()=>{await authority.assertCurrent();const result=await run();await authority.assertCurrent();await authority.assertFinalQueue?.();return result;});
 const protectedNames=new Set<string>([...RESIDUAL_TABLES,'syncQueue']);
 const dependencies=tables.filter(t=>!protectedNames.has(t.name));
 const all=[...new Map([...tables,...RESIDUAL_TABLES.map(t=>db.table(t)),db.syncQueue].map(t=>[t.name,t])).values()];
 let depBefore:string|undefined;
 return runMacro02ResidualTransaction({
  transaction:fn=>db.transaction('rw',all,fn),
  snapshot:async()=>{
   if(depBefore===undefined)depBefore=exactMacro02ValueIdentity(await Promise.all(dependencies.map(t=>t.toArray())));
   const rows=Object.fromEntries(await Promise.all(RESIDUAL_TABLES.map(async t=>[t,await db.table(t).toArray()])));
   return {rows,queue:await db.syncQueue.toArray()} as unknown as ResidualSnapshot;
  },
  assertDependenciesUnchanged:async()=>{if(depBefore!==exactMacro02ValueIdentity(await Promise.all(dependencies.map(t=>t.toArray()))))throw Error('M02_RESIDUAL_DEPENDENCY_MUTATION');},
  removeQueue:async id=>{await db.syncQueue.delete(id);},
  addQueue:async row=>{await db.syncQueue.add(row as unknown as SyncQueueItem);},
  newId:()=>crypto.randomUUID(),now:()=>new Date().toISOString(),
 },authority,uid,run,preferred);
}
