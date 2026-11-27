import {buildMacro02ResidualBatch,residualMetadataQueueKey,type ResidualSnapshot} from './cutover-metadata-batch';
import type {MetadataKind} from './cutover-metadata-intent';
import type {ClinicalWriteAuthority} from './dormant-release-authority';

type Row=Record<string,unknown>;
/** No network, no background dispatch, and no ordinary outbox remains after
 * a successful Premium transaction. This is a local preparation contract;
 * the authenticated server writer still needs independent certification. */
export async function runMacro02ResidualTransaction<T>(host:{
 transaction(run:()=>Promise<T>):Promise<T>;
 snapshot():Promise<ResidualSnapshot>;
 assertDependenciesUnchanged():Promise<void>;
 removeQueue(id:string):Promise<void>;
 addQueue(row:Row):Promise<void>;
 newId():string;
 now():string;
},authority:ClinicalWriteAuthority,uid:string,run:()=>Promise<T>,preferred?:MetadataKind):Promise<T>{
 if(authority.writer==='legacy')return host.transaction(async()=>{await authority.assertCurrent();const result=await run();await authority.assertCurrent();await authority.assertFinalQueue?.();return result;});
 const epoch=authority.epoch;
 if(!epoch||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(epoch))throw Error('M02_RESIDUAL_EPOCH_REQUIRED');
 return host.transaction(async()=>{
  await authority.assertCurrent();const before=await host.snapshot();
  const result=await run();await authority.assertCurrent();
  const after=await host.snapshot();await host.assertDependenciesUnchanged();
  const batch=buildMacro02ResidualBatch(before,after,{uid,epoch,operationId:host.newId(),preferred});
  if(batch){
   for(const id of batch.removeQueueIds)await host.removeQueue(id);
   const anchor=batch.intent.changes[0],row=(anchor.after??anchor.before)!;
   const t=host.now();
   await host.addQueue({id:host.newId(),chave:residualMetadataQueueKey(batch.intent),table:anchor.table,operation:'update',payload:{id:row.id,user_id:uid,person_id:row.person_id,macro02_metadata:batch.intent},created_at:t,updated_at:t,retry_count:0,failed:false});
  }
  await authority.assertCurrent();await authority.assertFinalQueue?.();return result;
 });
}
