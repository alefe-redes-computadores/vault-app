/** Existing outbox only; idempotent insert and zero full-table upserts. */
import {supabase} from '@/lib/supabase/client';
import {validUuidA8} from '@/lib/vaccination-a8/types';
import {A9_TABLES,type A9Table} from './types';
import type {SyncQueueItem} from '@/lib/types';
const COMMON=['id','user_id','person_id','kind','source','note','corrects_event_id','created_at','updated_at','deleted_at'] as const;
const FIELDS:Record<A9Table,readonly string[]>={
 procedure_events_a9:[...COMMON,'title','category','effective_status','planned_on','performed_on','professional_id','location_id','consultation_id','rehab_session_id'],
 sensitivity_events_a9:[...COMMON,'sensitivity_type','agent_label','certainty','severity','reported_on','related_type','related_id','professional_id']};
export async function pendingA9Dependency(item:SyncQueueItem,pending:(table:SyncQueueItem['table'],id:string)=>Promise<boolean>){
 if(!A9_TABLES.includes(item.table as A9Table))return null;const p=item.payload;
 const refs:Array<[string,SyncQueueItem['table']]>=[['professional_id','medicos']];
 if(item.table==='procedure_events_a9')refs.push(['location_id','locais'],['consultation_id','consultas'],['rehab_session_id','rehab_sessions_m5'],['corrects_event_id','procedure_events_a9']);
 else {refs.push(['corrects_event_id','sensitivity_events_a9']);const t=p.related_type==='medication'?'medicamentos':p.related_type==='vaccination_event'?'vaccination_events_a8':p.related_type==='procedure_event'?'procedure_events_a9':null;if(t)refs.push(['related_id',t]);}
 for(const [field,table] of refs){const id=p[field];if(validUuidA8(id)&&await pending(table,id))return `${table}:${id}`;}return null;
}
const equals=(a:Record<string,unknown>,b:Record<string,unknown>,keys:readonly string[])=>keys.every(k=>k.endsWith('_at')&&typeof a[k]==='string'&&typeof b[k]==='string'?Date.parse(a[k])===Date.parse(b[k]):a[k]===b[k]);
export async function syncA9(item:SyncQueueItem,uid:string){
 const table=item.table as A9Table;if(!A9_TABLES.includes(table)||item.operation!=='add')throw Error('A9: evento imutável obrigatório');
 const raw=item.payload,fields=FIELDS[table];if(!validUuidA8(raw.id)||!validUuidA8(raw.person_id)||raw.user_id!==uid||fields.some(k=>raw[k]===undefined))throw Error('A9: payload incompleto ou fora do escopo');
 const row=Object.fromEntries(fields.map(k=>[k,raw[k]])) as Record<string,unknown>;const client=supabase.from(table);
 const inserted=await client.insert(row);if(!inserted.error)return;
 if(inserted.error.code!=='23505')throw Error('A9: inserção '+inserted.error.message);
 const old=await client.select('*').eq('id',String(raw.id)).eq('user_id',uid).eq('person_id',String(raw.person_id)).maybeSingle();
 if(old.error||!old.data||!equals(old.data as Record<string,unknown>,row,fields))throw Error('A9: colisão não idempotente ou fora do escopo');
}
