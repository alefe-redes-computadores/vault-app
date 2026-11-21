/** A5 Sync: reuses the canonical queue; exact per-table fields, owner checks and compare-and-swap. */
import { supabase } from '@/lib/supabase/client';
import type { SyncQueueItem } from '@/lib/types';
import { A5_TABLES, isUuidA5, type A5Table } from './types';
const COMMON=['id','user_id','person_id','created_at','updated_at','deleted_at'] as const;
export const A5_SYNC_FIELDS:Record<A5Table,readonly string[]>={
 hospitalizations_a5:[...COMMON,'reason','reason_source','admission_kind','status','planned_admission_on','planned_admission_at','admitted_on','admitted_at','discharged_on','discharged_at','timezone_name','hospital_id','local_id','facility_name_snapshot','previous_hospitalization_id','note'],
 hospitalization_stays_a5:[...COMMON,'hospitalization_id','hospital_id','local_id','unit_type','ward_label','room_label','bed_label','entered_on','entered_at','left_on','left_at','timezone_name','source','note'],
 hospitalization_team_a5:[...COMMON,'hospitalization_id','professional_id','stay_id','role','started_on','ended_on','source','note'],
 hospitalization_events_a5:[...COMMON,'hospitalization_id','stay_id','kind','summary','occurred_on','occurred_at','timezone_name','source','source_professional_id','corrects_event_id'],
 hospitalization_relations_a5:[...COMMON,'hospitalization_id','entity_type','entity_id','relation_role','source','note'],
 hospitalization_discharge_a5:[...COMMON,'hospitalization_id','disposition','source','summary','instructions','warning_signs','followup_plan','medication_reconciliation_status','reviewed_on','note'],
};
const IDENTITIES:Record<A5Table,readonly string[]>={
 hospitalizations_a5:['id','user_id','person_id','created_at','previous_hospitalization_id'],
 hospitalization_stays_a5:['id','user_id','person_id','created_at','hospitalization_id'],
 hospitalization_team_a5:['id','user_id','person_id','created_at','hospitalization_id','professional_id','stay_id'],
 hospitalization_events_a5:A5_SYNC_FIELDS.hospitalization_events_a5.filter(k=>!['updated_at','deleted_at'].includes(k)),
 hospitalization_relations_a5:['id','user_id','person_id','created_at','hospitalization_id','entity_type','entity_id','relation_role'],
 hospitalization_discharge_a5:['id','user_id','person_id','created_at','hospitalization_id'],
};
const isSame=(a:Record<string,unknown>,b:Record<string,unknown>,keys:readonly string[])=>keys.every(k=>{
 if((k.endsWith('_at')||k==='created_at'||k==='updated_at')&&typeof a[k]==='string'&&typeof b[k]==='string'){
  const x=Date.parse(a[k]),y=Date.parse(b[k]);if(Number.isFinite(x)&&Number.isFinite(y))return x===y;
 }
 return a[k]===b[k];
});
const PARENT_TABLES:Partial<Record<A5Table,ReadonlyArray<[string,SyncQueueItem['table']]>>>={
 hospitalizations_a5:[['hospital_id','hospitais'],['local_id','locais'],['previous_hospitalization_id','hospitalizations_a5']],
 hospitalization_stays_a5:[['hospitalization_id','hospitalizations_a5'],['hospital_id','hospitais'],['local_id','locais']],
 hospitalization_team_a5:[['hospitalization_id','hospitalizations_a5'],['professional_id','medicos'],['stay_id','hospitalization_stays_a5']],
 hospitalization_events_a5:[['hospitalization_id','hospitalizations_a5'],['stay_id','hospitalization_stays_a5'],['source_professional_id','medicos'],['corrects_event_id','hospitalization_events_a5']],
 hospitalization_relations_a5:[['hospitalization_id','hospitalizations_a5']],
 hospitalization_discharge_a5:[['hospitalization_id','hospitalizations_a5']],
};
const TARGET_TABLE:Record<string,SyncQueueItem['table']>={
 cirurgia:'cirurgias',consulta:'consultas',exam_order:'exam_orders',tratamento:'tratamentos',rehab_program:'rehab_programs_m5',medicamento:'medicamentos',
};
/** A5: deferral only; caller raises SyncDependencyDeferredError to keep queue item intact. */
export async function pendingA5Dependency(item:SyncQueueItem,hasPending:(table:SyncQueueItem['table'],id:string)=>Promise<boolean>):Promise<string|null>{
 const key=item.table as A5Table;if(!A5_TABLES.includes(key))return null;
 for(const [field,table] of PARENT_TABLES[key]||[]){const id=item.payload[field];
  if(typeof id==='string'&&isUuidA5(id)&&await hasPending(table,id))return `${table}:${id}`;
 }
 if(key==='hospitalization_relations_a5'){
  const table=TARGET_TABLE[String(item.payload.entity_type||'')],id=item.payload.entity_id;
  if(table&&typeof id==='string'&&isUuidA5(id)&&await hasPending(table,id))return `${table}:${id}`;
 }
 return null;
}
export async function syncHospitalizationA5(item:SyncQueueItem,uid:string):Promise<void>{
 const table=item.table as A5Table;
 if(!A5_TABLES.includes(table)||item.operation==='delete')throw Error('A5: operação física inválida.');
 const raw=item.payload,keys=A5_SYNC_FIELDS[table];
 if(!isUuidA5(raw.id)||!isUuidA5(raw.person_id)||raw.user_id!==uid||
    keys.some(k=>raw[k]===undefined)||typeof raw.created_at!=='string'||typeof raw.updated_at!=='string'||
    !Number.isFinite(Date.parse(raw.created_at))||!Number.isFinite(Date.parse(raw.updated_at)))
  throw Error('A5: payload incompleto ou fora da pessoa/conta.');
 const row=Object.fromEntries(keys.map(k=>[k,raw[k]])) as Record<string,unknown>;
 const client=supabase.from(table);
 const fetch=()=>client.select('*').eq('id',String(row.id)).eq('user_id',uid).eq('person_id',String(row.person_id)).maybeSingle();
 let found=await fetch();if(found.error)throw Error(`A5 consulta: ${found.error.message}`);
 if(!found.data){
  const insert=await client.insert(row);if(!insert.error)return;
  if(insert.error.code!=='23505')throw Error(`A5 inclusão: ${insert.error.message}`);
  found=await fetch();if(found.error||!found.data)throw Error('A5: registro existente em escopo inacessível.');
 }
 const previous=found.data as Record<string,unknown>;
 if(isSame(previous,row,keys))return;
 if(!isSame(previous,row,IDENTITIES[table]))throw Error('A5: identidade factual divergente; revisão manual.');
 if(table==='hospitalization_events_a5')throw Error('A5: evento clínico é append-only.');
 if(previous.deleted_at!==null&&row.deleted_at===null)throw Error('A5: registro apagado não ressuscita.');
 const before=Date.parse(String(previous.updated_at||'')),after=Date.parse(String(row.updated_at));
 if(!Number.isFinite(before)||!Number.isFinite(after)||after<=before)throw Error('A5: conflito de versão, fila mantida.');
 const delta=Object.fromEntries(keys.filter(k=>!IDENTITIES[table].includes(k)).map(k=>[k,row[k]]));
 const update=await client.update(delta).eq('id',String(row.id)).eq('user_id',uid).eq('person_id',String(row.person_id))
  .eq('updated_at',String(previous.updated_at)).select('id');
 if(update.error||update.data?.length!==1)throw Error('A5: compare-and-swap recusou escrita concorrente.');
}
