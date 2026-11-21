/** M4 P2: CAS remoto, sem upsert cego ou DELETE. Conflito preserva a fila. */
import { supabase } from '@/lib/supabase/client';
import type { SyncQueueItem } from '@/lib/types';
import { SURGERY_CONSULTATION_ROLES_M4P2 } from './surgery-links-p2';
const COLUMNS=['id','user_id','person_id','cirurgia_id','consulta_id','role','note','created_at','updated_at','deleted_at'] as const;
const validUuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function same(a:Record<string,unknown>,b:Record<string,unknown>){return COLUMNS.every(k=>{if(k.endsWith('_at')&&typeof a[k]==='string'&&typeof b[k]==='string') {const x=Date.parse(String(a[k])),y=Date.parse(String(b[k]));if(Number.isFinite(x)&&Number.isFinite(y))return x===y;}return a[k]===b[k];});}
export async function syncSurgeryConsultationLinkM4P2(item:SyncQueueItem,authenticatedUserId:string):Promise<void>{
 if(item.table!=='surgery_consultation_links_m4'||item.operation==='delete')throw Error('M4 P2: operação física rejeitada.');
 const raw=item.payload;
 if(!validUuid(raw.id)||!validUuid(raw.person_id)||!validUuid(raw.cirurgia_id)||!validUuid(raw.consulta_id)||
    raw.user_id!==authenticatedUserId||!SURGERY_CONSULTATION_ROLES_M4P2.some(r=>r.id===raw.role)||
    typeof raw.created_at!=='string'||typeof raw.updated_at!=='string'||!Number.isFinite(Date.parse(raw.updated_at))||
    COLUMNS.some(k=>raw[k]===undefined))throw Error('M4 P2: payload fora do escopo ou incompleto.');
 const row=Object.fromEntries(COLUMNS.map(k=>[k,raw[k]])) as Record<string,unknown>;
 const client=supabase.from('surgery_consultation_links_m4');
 const lookup=()=>client.select('*').eq('id',String(row.id)).eq('user_id',authenticatedUserId)
   .eq('person_id',String(row.person_id)).maybeSingle();
 let remote=await lookup();if(remote.error)throw Error(`M4 P2 consulta: ${remote.error.message}`);
 if(!remote.data){
  const added=await client.insert(row);if(!added.error)return;
  if(added.error.code!=='23505')throw Error(`M4 P2 insert: ${added.error.message}`);
  remote=await lookup();if(remote.error||!remote.data)throw Error('M4 P2: ID já existente fora do escopo.');
 }
 const old=remote.data as Record<string,unknown>;
 if(same(old,row))return;
 if(['user_id','person_id','cirurgia_id','consulta_id','role','created_at'].some(k=>old[k]!==row[k]))
   throw Error('M4 P2: identidade do vínculo divergiu; revisão manual necessária.');
 const oldTime=Date.parse(String(old.updated_at||'')),newTime=Date.parse(String(row.updated_at));
 if(!Number.isFinite(oldTime)||oldTime>=newTime)throw Error('M4 P2: alteração concorrente; fila mantida para revisão.');
 if(old.deleted_at!==null&&row.deleted_at===null)throw Error('M4 P2: reativação implícita bloqueada.');
 const changed=await client.update({note:row.note,deleted_at:row.deleted_at,updated_at:row.updated_at})
   .eq('id',String(row.id)).eq('user_id',authenticatedUserId).eq('person_id',String(row.person_id))
   .eq('updated_at',String(old.updated_at)).select('id');
 if(changed.error||changed.data?.length!==1)throw Error('M4 P2: conflito de atualização; não sobrescrever.');
}
