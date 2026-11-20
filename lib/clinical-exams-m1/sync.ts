/** M1: guarded, idempotent upload of canonical exam metadata; file bytes have a separate lifecycle.
 * Cross-device stale snapshots fail closed; no physical DELETE or blind upsert. */
import type { SyncQueueItem } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { isClinicalExamTableM1, type ClinicalExamTableM1 } from './types';

const COLUMNS: Record<ClinicalExamTableM1, readonly string[]> = {
  exam_orders:['id','user_id','person_id','order_kind','title','requested_on','valid_until','doctor_id','note','source','created_at','updated_at','deleted_at'],
  exam_order_items:['id','user_id','person_id','order_id','name','status','collected_at','result_received_at','result_summary','result_flag','result_payload','note','created_at','updated_at','deleted_at'],
  exam_sessions:['id','user_id','person_id','order_id','location_id','laboratory_name','scheduled_at','timezone_name','status','prep_minutes','prep_instructions','prep_confirmed_by_user','expected_result_at','lab_protocol_code','lab_portal_note','prep_reminder_opt_in','appointment_reminder_opt_in','result_reminder_opt_in','note','created_at','updated_at','deleted_at'],
  exam_session_items:['id','user_id','person_id','order_id','session_id','exam_order_item_id','status','collected_at','note','created_at','updated_at','deleted_at'],
  clinical_assets:['id','user_id','person_id','sha256','filename','mime_type','size_bytes','storage_bucket','storage_path','upload_status','uploaded_at','created_at','updated_at','deleted_at'],
  clinical_asset_links:['id','user_id','person_id','asset_id','entity_type','entity_id','role','note','created_at','updated_at','deleted_at'],
  consultation_exam_order_links:['id','user_id','person_id','order_id','consultation_id','role','note','created_at','updated_at','deleted_at'],
};

function stable(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw.map(stable);
  if (raw && typeof raw === 'object') return Object.fromEntries(
    Object.entries(raw as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
  return raw;
}
function sameField(column:string, a:unknown,b:unknown):boolean {
  if (column.endsWith('_at') && typeof a==='string' && typeof b==='string') {
    const x=Date.parse(a),y=Date.parse(b);
    if(Number.isFinite(x)&&Number.isFinite(y))return x===y;
  }
  return JSON.stringify(stable(a??null))===JSON.stringify(stable(b??null));
}
function sameRow(table:ClinicalExamTableM1, remote:Record<string,unknown>, local:Record<string,unknown>):boolean {
  return COLUMNS[table].every(c=>sameField(c,remote[c],local[c]));
}
export async function syncClinicalExamM1(item:SyncQueueItem, authenticatedUserId:string):Promise<void>{
  if (!isClinicalExamTableM1(item.table))throw Error('Tabela não reconhecida pela M1.');
  const table=item.table;
  if(item.operation==='delete')throw Error('M1 exige tombstone; DELETE físico bloqueado.');
  const raw=item.payload;
  if(typeof raw.id!=='string'||typeof raw.user_id!=='string'||typeof raw.person_id!=='string'||
     raw.user_id!==authenticatedUserId || !raw.person_id)throw Error('Escopo do registro M1 inválido.');
  if(typeof raw.updated_at!=='string'||!Number.isFinite(Date.parse(raw.updated_at)))
    throw Error('Versão M1 sem timestamp válido.');
  if(COLUMNS[table].some(field=>raw[field]===undefined))
    throw Error('Payload M1 incompleto; não enviar snapshot parcial.');
  const row=Object.fromEntries(COLUMNS[table].map(field=>[field,raw[field]])) as Record<string,unknown>;
  const client=supabase.from(table);
  const read=async()=>client.select('*').eq('id',String(raw.id)).eq('user_id',String(raw.user_id))
    .eq('person_id',String(raw.person_id)).maybeSingle();
  let found=await read();
  if(found.error)throw Error(`M1 ${table} lookup: ${found.error.message}`);
  let remote=(found.data as Record<string,unknown>|null);
  if(item.operation==='add'&&!remote){
    const {error}=await client.insert(row);
    if(!error)return;
    if(error.code!=='23505')throw Error(`M1 ${table} insert: ${error.message}`);
    found=await read();
    if(found.error)throw Error(`M1 ${table} retry lookup: ${found.error.message}`);
    remote=found.data as Record<string,unknown>|null;
  }
  if(!remote){
    // An UPDATE must never create a phantom row after an out-of-order offline retry.
    throw Error(`M1 ${table}: versão remota inexistente; fila preservada.`);
  }
  if(sameRow(table,remote,row))return; // Same intent retried after lost response.
  if(item.operation==='add')throw Error(`M1 ${table}: UUID existente com conteúdo diferente; conflito preservado.`);
  const remoteAt=Date.parse(String(remote.updated_at)), nextAt=Date.parse(String(row.updated_at));
  if(!Number.isFinite(remoteAt)||nextAt<=remoteAt)
    throw Error(`M1 ${table}: conflito de versão; revisão necessária sem sobrescrever outro dispositivo.`);
  // Optimistic CAS: if another device updated the record, update zero rows and keep queue.
  const update=await client.update(row).eq('id',String(raw.id))
    .eq('user_id',authenticatedUserId).eq('person_id',String(raw.person_id))
    .eq('updated_at',String(remote.updated_at)).select('id');
  if(update.error)throw Error(`M1 ${table} update: ${update.error.message}`);
  if(!update.data?.length)throw Error(`M1 ${table}: concorrência detectada, fila preservada.`);
}
