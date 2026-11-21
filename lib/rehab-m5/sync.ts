/** M5-REAB: server CAS on the canonical queue; no second client sync engine. */
import { supabase } from '@/lib/supabase/client';
import type { SyncQueueItem } from '@/lib/types';
import { REHAB_TABLES_M5, validUuidM5, type RehabTableM5 } from './types';
const COMMON=['id','user_id','person_id','created_at','updated_at','deleted_at'] as const;
const FIELDS:Record<RehabTableM5,readonly string[]>={
 rehab_programs_m5:[...COMMON,'title','specialty','functional_goal','body_region','laterality','status','start_date','expected_end_date'],
 rehab_program_team_m5:[...COMMON,'program_id','professional_id','role','start_date','end_date'],
 rehab_sessions_m5:[...COMMON,'program_id','scheduled_at','timezone','status','mode','local_id','hospital_id','place_note','notes'],
 rehab_session_team_m5:[...COMMON,'session_id','program_team_id'],
 rehab_origin_links_m5:[...COMMON,'program_id','origin_type','origin_id','note'],
 rehab_session_events_m5:[...COMMON,'session_id','action','from_at','to_at','from_status','to_status','note'],
};
const IDENTITIES:Record<RehabTableM5,readonly string[]>={
 rehab_programs_m5:['id','user_id','person_id','created_at'],
 rehab_program_team_m5:['id','user_id','person_id','created_at','program_id','professional_id','role'],
 rehab_sessions_m5:['id','user_id','person_id','created_at','program_id'],
 rehab_session_team_m5:['id','user_id','person_id','created_at','session_id','program_team_id'],
 rehab_origin_links_m5:['id','user_id','person_id','created_at','program_id','origin_type','origin_id'],
 rehab_session_events_m5:['id','user_id','person_id','created_at','session_id','action','from_at','to_at','from_status','to_status','note'],
};
function same(a:Record<string,unknown>,b:Record<string,unknown>,fields:readonly string[]){return fields.every(k=>{
 if(k.endsWith('_at')&&typeof a[k]==='string'&&typeof b[k]==='string'){
  const x=Date.parse(String(a[k])),y=Date.parse(String(b[k]));if(Number.isFinite(x)&&Number.isFinite(y))return x===y;
 }
 return a[k]===b[k];
});}
export async function syncRehabM5(item:SyncQueueItem,userId:string):Promise<void>{
 const table=item.table as RehabTableM5;
 if(!REHAB_TABLES_M5.includes(table)||item.operation==='delete')throw Error('M5 REAB: operação física proibida.');
 const raw=item.payload as Record<string,unknown>,keys=FIELDS[table];
 if(!validUuidM5(raw.id)||!validUuidM5(raw.person_id)||raw.user_id!==userId||
   keys.some(k=>raw[k]===undefined)||typeof raw.created_at!=='string'||typeof raw.updated_at!=='string'||
   !Number.isFinite(Date.parse(raw.created_at))||!Number.isFinite(Date.parse(raw.updated_at)))
  throw Error('M5 REAB: payload inválido ou fora de conta/pessoa.');
 const row=Object.fromEntries(keys.map(k=>[k,raw[k]])) as Record<string,unknown>;
 // The query is protected by SQL RLS and composite foreign keys.
 const client=supabase.from(table);
 const lookup=()=>client.select('*').eq('id',String(row.id)).eq('user_id',userId).eq('person_id',String(row.person_id)).maybeSingle();
 let remote=await lookup();if(remote.error)throw Error(`M5 REAB consulta: ${remote.error.message}`);
 if(!remote.data){
  const insert=await client.insert(row);
  if(!insert.error)return;
  if(insert.error.code!=='23505')throw Error(`M5 REAB insert: ${insert.error.message}`);
  remote=await lookup();if(remote.error||!remote.data)throw Error('M5 REAB: ID já existente fora do escopo.');
 }
 const previous=remote.data as Record<string,unknown>;
 if(same(previous,row,keys))return; // Replay confirmed, including after a lost response.
 if(IDENTITIES[table].some(k=>!same(previous,row,[k])))throw Error('M5 REAB: identidade divergente; revisão manual.');
 if(table==='rehab_session_events_m5')throw Error('M5 REAB: eventos de agenda são imutáveis.');
 if(previous.deleted_at!==null&&row.deleted_at===null)throw Error('M5 REAB: tombstone não pode ressuscitar.');
 const before=Date.parse(String(previous.updated_at||'')),after=Date.parse(String(row.updated_at));
 if(!Number.isFinite(before)||before>=after)throw Error('M5 REAB: atualização concorrente; fila preservada.');
 const delta=Object.fromEntries(keys.filter(k=>!IDENTITIES[table].includes(k)).map(k=>[k,row[k]]));
 const updated=await client.update(delta).eq('id',String(row.id)).eq('user_id',userId)
  .eq('person_id',String(row.person_id)).eq('updated_at',String(previous.updated_at)).select('id');
 if(updated.error||updated.data?.length!==1)throw Error('M5 REAB: compare-and-swap recusou sobrescrita.');
}
