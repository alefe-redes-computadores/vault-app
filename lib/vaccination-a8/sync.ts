/** CAS and immutable vaccination evidence. No alternate sync engine. */
import {supabase} from '@/lib/supabase/client';
import type {SyncQueueItem} from '@/lib/types';
import {A8_TABLES,validUuidA8,type A8Table} from './types';
const BASE=['id','user_id','person_id','created_at','updated_at','deleted_at'] as const;
const FIELDS:Record<A8Table,readonly string[]>={
 vaccination_courses_a8:[...BASE,'vaccine_name','scheme_note'],
 vaccination_events_a8:[...BASE,'course_id','kind','effective_kind','planned_on','administered_on',
   'dose_number','manufacturer','lot','source','source_professional_id','source_location_id','note','corrects_event_id'],
};
const equal=(a:Record<string,unknown>,b:Record<string,unknown>,keys:readonly string[])=>keys.every(key=>{
 if(key.endsWith('_at')&&typeof a[key]==='string'&&typeof b[key]==='string')return Date.parse(a[key])===Date.parse(b[key]);
 return a[key]===b[key];
});
export async function pendingVaccinationA8Dependency(item:SyncQueueItem,pending:(table:SyncQueueItem['table'],id:string)=>Promise<boolean>){
 if(!A8_TABLES.includes(item.table as A8Table))return null;
 for(const [field,table] of [['course_id','vaccination_courses_a8'],['source_professional_id','medicos'],['source_location_id','locais'],['corrects_event_id','vaccination_events_a8']] as const){
  const id=item.payload[field];if(validUuidA8(id)&&await pending(table,id))return `${table}:${id}`;
 }return null;
}
export async function syncVaccinationA8(item:SyncQueueItem,uid:string):Promise<void>{
 const table=item.table as A8Table;if(!A8_TABLES.includes(table)||item.operation==='delete')throw Error('A8: operação inválida.');
 const raw=item.payload,fields=FIELDS[table];
 if(!validUuidA8(raw.id)||!validUuidA8(raw.person_id)||raw.user_id!==uid||
  (table==='vaccination_events_a8'&&!validUuidA8(raw.course_id))||
  fields.some(f=>raw[f]===undefined)||!Number.isFinite(Date.parse(String(raw.created_at)))||
  !Number.isFinite(Date.parse(String(raw.updated_at))))throw Error('A8: dados incompletos ou fora de escopo.');
 const row=Object.fromEntries(fields.map(k=>[k,raw[k]])) as Record<string,unknown>;
 const client=supabase.from(table);
 const lookup=()=>client.select('*').eq('id',String(row.id)).eq('user_id',uid).eq('person_id',String(row.person_id)).maybeSingle();
 let old=await lookup();if(old.error)throw Error('A8 consulta: '+old.error.message);
 if(!old.data){const inserted=await client.insert(row);if(!inserted.error)return;
  if(inserted.error.code!=='23505')throw Error('A8 inclusão: '+inserted.error.message);
  old=await lookup();if(old.error||!old.data)throw Error('A8: colisão fora do escopo.');}
 const before=old.data as Record<string,unknown>;
 if(equal(before,row,fields))return;
 if(table==='vaccination_events_a8')throw Error('A8: fatos imutáveis; retifique com novo ID.');
 if(!equal(before,row,['id','user_id','person_id','vaccine_name','scheme_note','created_at']))throw Error('A8: dados canônicos da vacina divergentes.');
 if(before.deleted_at!==null||typeof row.deleted_at!=='string'||row.deleted_at===null)throw Error('A8: série só aceita encerramento por tombstone.');
 if(Date.parse(String(row.updated_at))<=Date.parse(String(before.updated_at)))throw Error('A8: conflito concorrente; preservar fila.');
 const update=await client.update({deleted_at:row.deleted_at,updated_at:row.updated_at})
  .eq('id',String(row.id)).eq('user_id',uid).eq('person_id',String(row.person_id))
  .eq('updated_at',String(before.updated_at)).select('id');
 if(update.error||update.data?.length!==1)throw Error('A8: atualização concorrente recusada.');
}
