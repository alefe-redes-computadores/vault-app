/** Idempotent push via the existing outbox. No parallel sync engine. */
import {supabase} from '@/lib/supabase/client';
import type {SyncQueueItem} from '@/lib/types';
import {CONTINUITY_TABLES_A7M5,validUuidContinuity,type ContinuityTableA7M5} from './types';
const COMMON=['id','user_id','person_id','created_at','updated_at','deleted_at'] as const;
const FIELDS:Record<ContinuityTableA7M5,readonly string[]>={
 surgical_intents_a7m5:[...COMMON,'title','status','source','source_consultation_id','source_professional_id','linked_surgery_id','note','corrects_intent_id'],
 surgery_evidence_links_a7m5:[...COMMON,'surgery_id','target_type','target_id','stage','source','note','action','corrects_link_id']
};
const same=(a:Record<string,unknown>,b:Record<string,unknown>,fields:readonly string[])=>fields.every(f=>
 f.endsWith('_at')&&typeof a[f]==='string'&&typeof b[f]==='string'?
 Date.parse(a[f])===Date.parse(b[f]):a[f]===b[f]);
const refTable=(type:unknown):SyncQueueItem['table']|null=>type==='procedure_event_a9'?'procedure_events_a9':
 type==='exam_order'?'exam_orders':type==='medication'?'medicamentos':type==='health_record'?'registros_saude':null;
export async function pendingContinuityDependencyA7M5(item:SyncQueueItem,pending:(table:SyncQueueItem['table'],id:string)=>Promise<boolean>):Promise<string|null>{
 if(!CONTINUITY_TABLES_A7M5.includes(item.table as ContinuityTableA7M5))return null;
 const fields:Array<[string,SyncQueueItem['table']]> = item.table==='surgical_intents_a7m5'?
  [['source_consultation_id','consultas'],['source_professional_id','medicos'],['linked_surgery_id','cirurgias'],['corrects_intent_id','surgical_intents_a7m5']]:
  [['surgery_id','cirurgias'],['corrects_link_id','surgery_evidence_links_a7m5']];
 if(item.table==='surgery_evidence_links_a7m5'){
  const t=refTable(item.payload.target_type);if(t)fields.push(['target_id',t]);
 }
 for(const [field,table] of fields){const id=item.payload[field];if(validUuidContinuity(id)&&await pending(table,id))return `${table}:${id}`;}
 return null;
}
export async function syncContinuityA7M5(item:SyncQueueItem,uid:string):Promise<void>{
 const table=item.table as ContinuityTableA7M5;
 if(!CONTINUITY_TABLES_A7M5.includes(table)||item.operation!=='add')throw Error('A7/M5: vínculo imutável exige inclusão');
 const fields=FIELDS[table],raw=item.payload;
 if(raw.user_id!==uid||!validUuidContinuity(raw.id)||!validUuidContinuity(raw.person_id)||fields.some(f=>raw[f]===undefined))throw Error('A7/M5: payload incompleto');
 const row=Object.fromEntries(fields.map(f=>[f,raw[f]])) as Record<string,unknown>;
 const api=supabase.from(table);const inserted=await api.insert(row);
 if(!inserted.error)return;
 if(inserted.error.code!=='23505')throw Error('A7/M5: erro no push '+inserted.error.message);
 const prior=await api.select('*').eq('id',String(raw.id)).eq('user_id',uid).eq('person_id',String(raw.person_id)).maybeSingle();
 if(prior.error||!prior.data||!same(prior.data as Record<string,unknown>,row,fields))throw Error('A7/M5: conflito não idempotente; nenhuma sobrescrita');
}
