/** A7: additive canonical outbox; events immutable, team links tombstoned with CAS. */
import {supabase} from '@/lib/supabase/client';
import type {SyncQueueItem} from '@/lib/types';
import {A7_TABLES,validUuidA7,type A7Table} from './types';
const COMMON=['id','user_id','person_id','cirurgia_id','created_at','updated_at','deleted_at'] as const;
const FIELDS:Record<A7Table,readonly string[]>={
 surgery_journey_events_a7:[...COMMON,'stage','kind','source','occurred_on','title','description','source_professional_id','corrects_event_id'],
 surgery_team_a7:[...COMMON,'professional_id','role','source','note']
};
const SAME=(left:Record<string,unknown>,right:Record<string,unknown>,keys:readonly string[])=>keys.every(k=>{
 if(k.endsWith('_at')&&typeof left[k]==='string'&&typeof right[k]==='string'){
  const a=Date.parse(left[k]),b=Date.parse(right[k]);if(Number.isFinite(a)&&Number.isFinite(b))return a===b;
 }
 return left[k]===right[k];
});
export async function pendingSurgeryA7Dependency(item:SyncQueueItem,hasPending:(table:SyncQueueItem['table'],id:string)=>Promise<boolean>):Promise<string|null>{
 if(!A7_TABLES.includes(item.table as A7Table))return null;
 for(const [field,table] of [['cirurgia_id','cirurgias'],['professional_id','medicos'],['source_professional_id','medicos'],['corrects_event_id','surgery_journey_events_a7']] as const){
  const id=item.payload[field];if(typeof id==='string'&&validUuidA7(id)&&await hasPending(table,id))return `${table}:${id}`;
 }return null;
}
export async function syncSurgeryA7(item:SyncQueueItem,uid:string):Promise<void>{
 const table=item.table as A7Table;if(!A7_TABLES.includes(table)||item.operation==='delete')throw Error('A7: operação inválida.');
 const raw=item.payload,fields=FIELDS[table];
 if(!validUuidA7(raw.id)||!validUuidA7(raw.person_id)||!validUuidA7(raw.cirurgia_id)||raw.user_id!==uid||
  fields.some(f=>raw[f]===undefined)||typeof raw.created_at!=='string'||typeof raw.updated_at!=='string'||
  !Number.isFinite(Date.parse(raw.created_at))||!Number.isFinite(Date.parse(raw.updated_at)))throw Error('A7: dados incompletos ou não autorizados.');
 const row=Object.fromEntries(fields.map(k=>[k,raw[k]])) as Record<string,unknown>;
 const client=supabase.from(table);
 const lookup=()=>client.select('*').eq('id',String(row.id)).eq('user_id',uid).eq('person_id',String(row.person_id)).maybeSingle();
 let old=await lookup();if(old.error)throw Error(`A7 consulta: ${old.error.message}`);
 if(!old.data){const inserted=await client.insert(row);if(!inserted.error)return;
  if(inserted.error.code!=='23505')throw Error(`A7 inclusão: ${inserted.error.message}`);
  old=await lookup();if(old.error||!old.data)throw Error('A7: ID colidiu com registro fora do escopo.');}
 const before=old.data as Record<string,unknown>;
 if(SAME(before,row,fields))return;
 if(table==='surgery_journey_events_a7')throw Error('A7: fatos cirúrgicos são históricos imutáveis; faça uma retificação.');
 if(!SAME(before,row,['id','user_id','person_id','cirurgia_id','professional_id','role','source','created_at']))throw Error('A7: identidade da equipe divergente.');
 if(before.deleted_at!==null&&row.deleted_at===null)throw Error('A7: não ressuscitar vínculo apagado.');
 if(typeof row.deleted_at!=='string'||before.deleted_at!==null)throw Error('A7: equipe apenas permite desvincular.');
 const a=Date.parse(String(before.updated_at||'')),b=Date.parse(String(row.updated_at));
 if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)throw Error('A7: conflito concorrente, fila preservada.');
 const updated=await client.update({deleted_at:row.deleted_at,updated_at:row.updated_at})
  .eq('id',String(row.id)).eq('user_id',uid).eq('person_id',String(row.person_id)).eq('updated_at',String(before.updated_at)).select('id');
 if(updated.error||updated.data?.length!==1)throw Error('A7: atualização concorrente recusada.');
}
