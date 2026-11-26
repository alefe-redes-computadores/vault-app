import type { CanonicalDb,CanonicalTable } from './storage-dexie';
import type { Scope,TableName,VitalTables } from './model';
import { decideVitalPull,vitalFingerprint,vitalWireRow,vitalAckId,type VitalAck,VitalSyncConflict } from './cloud-transport';
import { fail,requireScope,own } from './validation';
type QueueTable=Omit<CanonicalTable,'where'>&{where(index:'chave'):{equals(key:string):{toArray():PromiseLike<Record<string,unknown>[]>}}};
/** Used by the canonical full pull and realtime consumer; does not run a separate pull loop.
 * Acknowledgement and local write are atomic. Fingerprints are computed before the IndexedDB transaction. */
export function createVitalPullStore(db:CanonicalDb,authenticatedUser:()=>Promise<string|null>){
 return async function merge<K extends TableName>(table:K,rawScope:Scope,remoteRaw:unknown):Promise<'accept'|'same'|'preserve_local'|'conflict'>{
  const scope=requireScope(rawScope);if(await authenticatedUser()!==scope.user_id)fail('Conta da importação mudou.');
  const remote=vitalWireRow(table,remoteRaw,scope),fingerprint=await vitalFingerprint(table,remote,scope);
  if(await authenticatedUser()!==scope.user_id)fail('Conta da importação mudou.');
  const persons=db.table('persons'),rows=db.table(table),acks=db.table('vital_sync_ack'),queue=db.table('syncQueue') as unknown as QueueTable;
  return db.transaction('rw',[persons,rows,acks,queue as unknown as CanonicalTable],async()=>{
   const person=await persons.get(scope.person_id);if(person?.user_id!==scope.user_id)fail('Pessoa fora da conta.');
   const local=await rows.get(remote.id) as VitalTables[K]|undefined;if(local&&!own(local,scope))throw new VitalSyncConflict('Identidade local fora da conta/pessoa.');
   const pending=await queue.where('chave').equals(`${table}:${remote.id}`).toArray();
   const ackId=vitalAckId(table,scope,remote.id),old=await acks.get(ackId) as VitalAck|undefined;
   if(old&&(!own(old,scope)||old.table!==table||old.row_id!==remote.id))throw new VitalSyncConflict('Recibo local incompatível.');
   if(old?.revision!=null&&(old.revision>remote.revision||(old.revision===remote.revision&&old.fingerprint!==fingerprint)))return 'conflict';
   if(old?.pending_revision!=null)return 'preserve_local';
   const decision=decideVitalPull(table,scope,local??null,remote,Boolean(pending.length));
   if(decision==='accept'||decision==='same'){
    // An existing unsynced record with no queue is not silently declared synchronized.
    if(local&&!local.synced)return 'preserve_local';
    const ack:VitalAck={...scope,id:ackId,table,row_id:remote.id,revision:remote.revision,fingerprint,pending_revision:null,pending_fingerprint:null};
    await rows.put({...remote,synced:true} as unknown as Record<string,unknown>);
    await acks.put(ack as unknown as Record<string,unknown>);
   }
   return decision;
  });
 };
}
