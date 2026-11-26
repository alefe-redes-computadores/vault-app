import type { CanonicalDb } from './storage-dexie';
import type { AckPort,VitalAck } from './cloud-transport';
import { vitalAckId,vitalTable } from './cloud-transport';
import { requireId, requireScope, fail } from './validation';
/** Private sync metadata in the existing VaultDB. Not a second queue. No personal payload is duplicated. */
export function createVitalAckPort(db:CanonicalDb,authenticatedUser:()=>Promise<string|null>):AckPort{
 async function execute<T>(key:string,mode:'r'|'rw',fn:(table:ReturnType<CanonicalDb['table']>)=>Promise<T>){
  const [user_id,person_id,tableName,row_id,...extra]=key.split(':');const s=requireScope({user_id,person_id});requireId(row_id);
  if(extra.length||!vitalTable(tableName)||key!==vitalAckId(tableName,s,row_id)||await authenticatedUser()!==s.user_id)fail('Recibo fora da conta.');
  const persons=db.table('persons'),acks=db.table('vital_sync_ack');
  return db.transaction(mode,[persons,acks],async()=>{const p=await persons.get(s.person_id);if(!p||p.user_id!==s.user_id)fail('Pessoa fora da conta.');return fn(acks);});
 }
 return {read:key=>execute(key,'r',async t=>(await t.get(key)) as VitalAck|undefined),write:row=>execute(row.id,'rw',async t=>{if(!vitalTable(row.table)||row.id!==vitalAckId(row.table,requireScope(row),requireId(row.row_id)))fail('Recibo inválido.');const old=await t.get(row.id) as VitalAck|undefined;if(old?.revision!=null&&(row.revision==null||row.revision<old.revision||row.revision===old.revision&&row.fingerprint!==old.fingerprint))fail('Recibo de sincronização obsoleto.');await t.put(row as unknown as Record<string,unknown>);})};
}
