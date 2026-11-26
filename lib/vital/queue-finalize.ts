import type {CanonicalDb,CanonicalTable} from './storage-dexie';
import {vitalTable,vitalWireRow,vitalPayload,vitalAckId,vitalFingerprint} from './cloud-transport';
import {requireId,requireScope,own,fail} from './validation';
export type VitalQueueItem={id?:string;chave:string;table:string;operation:string;updated_at:string;payload:Record<string,unknown>};
type Queue=Omit<CanonicalTable,'where'>&{delete(id:string):PromiseLike<unknown>;where(index:string):{equals(key:string):{toArray():PromiseLike<Record<string,unknown>[]>}}};
const canonical=(v:unknown):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
/** Atomically remove only the acknowledged queue revision and mark its row synced. */
export async function finalizeVitalQueue(db:CanonicalDb,item:VitalQueueItem,uid:string):Promise<boolean>{
 if(!vitalTable(item.table)||item.operation==='delete'||!item.id)fail('Operação Vital inválida.');
 const table=item.table,scope=requireScope({user_id:uid,person_id:String(item.payload.person_id??'')}),sent=vitalWireRow(table,item.payload,scope);
 requireId(item.id);if(item.chave!==`${table}:${sent.id}`)fail('Chave de fila inválida.');
 const fingerprint=await vitalFingerprint(table,sent,scope);
 const queue=db.table('syncQueue') as unknown as Queue,rows=db.table(table),acks=db.table('vital_sync_ack'),persons=db.table('persons');
 return db.transaction('rw',[queue as unknown as CanonicalTable,rows,acks,persons],async()=>{
  const person=await persons.get(scope.person_id);if(person?.user_id!==uid)fail('Pessoa fora da conta.');
  const current=await queue.get(item.id!);if(!current||current.updated_at!==item.updated_at||current.operation!==item.operation||current.chave!==item.chave||current.table!==table)return false;
  if(canonical(vitalPayload(table,vitalWireRow(table,current.payload,scope),scope))!==canonical(vitalPayload(table,sent,scope)))return false;
  const ack=await acks.get(vitalAckId(table,scope,sent.id));if(!ack||!own(ack as any,scope)||ack.revision!==sent.revision||ack.fingerprint!==fingerprint||ack.pending_revision!==null)fail('Servidor não confirmou a revisão enviada.');
  const row=await rows.get(sent.id);if(!row||canonical(vitalPayload(table,vitalWireRow(table,row,scope),scope))!==canonical(vitalPayload(table,sent,scope)))return false;
  const entries=await queue.where('chave').equals(item.chave).toArray();if(entries.length!==1||entries[0].id!==item.id)return false;
  await rows.put({...row,synced:true});await queue.delete(item.id!);return true;
 });
}
