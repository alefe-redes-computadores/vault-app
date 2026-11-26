/** Host integration for the existing VaultDB and existing SyncQueue. Requires registered stores before mounting. */
import { db } from '@/lib/db';
import { getLocalFirstAuthUser } from '@/lib/supabase/local-auth';
import { supabase } from '@/lib/supabase/client';
import { enfileirarOperacao,solicitarProcessamentoSync } from '@/lib/sync/enfileirarOperacao';
import type { SyncQueueItem } from '@/lib/types';
import { createVitalStorage,type CanonicalDb } from '@/lib/vital/storage-dexie';
import { createVitalDraftStorage } from '@/lib/vital/drafts';
import { createVitalAckPort } from '@/lib/vital/ack-dexie';
import { createVitalPullStore } from '@/lib/vital/pull-dexie';
import { createSupabaseVitalTransport,type SupabaseVitalClient } from '@/lib/vital/supabase-transport';
import { pushVital,pullVitalRows,vitalPayload,vitalWireRow,vitalTable } from '@/lib/vital/cloud-transport';
import { VitalRepository } from '@/lib/vital/repository';
import { type Scope,type TableName } from '@/lib/vital/model';
import { requireScope } from '@/lib/vital/validation';
import {vitalDependencies,vitalEarlierVersion} from '@/lib/vital/dependencies';
import {finalizeVitalQueue} from '@/lib/vital/queue-finalize';
// Structural ports bind the existing instances. No new IndexedDB/Supabase client.
const canonicalDb=db as unknown as CanonicalDb;
const localUser=async()=>{const {data,error}=await getLocalFirstAuthUser();return error?null:data.user?.id??null;};
// Scope check uses local session to avoid two auth network roundtrips per page.
// Each real remote request still requires a valid token and server RLS; queue invokes after server auth.
const transport=createSupabaseVitalTransport(supabase as unknown as SupabaseVitalClient,localUser);
const acks=createVitalAckPort(canonicalDb,localUser);
const merge=createVitalPullStore(canonicalDb,localUser);
function canonicalJson(value:unknown):string{return JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
/** Anti-echo suppression in existing enfileirarOperacao may return without enqueueing.
 * Verify canonical queue row inside the very same Dexie transaction; failure rolls back the save. */
export function createCanonicalVitalRuntime(activeScope:()=>Scope|null){
 const storage=createVitalStorage({db:canonicalDb,authenticatedUser:localUser,activeScope,async enqueue(table,operation,row,options){
  await enfileirarOperacao(table as SyncQueueItem['table'],operation,row,options);
  const entry=await db.syncQueue.where('chave').equals(`${table}:${row.id}`).first();
  if(!entry||entry.operation==='delete'||entry.table!==table)throw Error('Fila não confirmou a gravação local. Tente novamente.');
  const scope=requireScope({user_id:String(row.user_id),person_id:String(row.person_id)});
  if(canonicalJson(vitalPayload(table,vitalWireRow(table,entry.payload,scope),scope))!==canonicalJson(vitalPayload(table,vitalWireRow(table,row,scope),scope)))throw Error('Fila não preservou a revisão salva.');
 },dispatch:solicitarProcessamentoSync});
 const repo=new VitalRepository(storage);
 return {repo,restoreBackup:(scope:Scope,raw:unknown)=>repo.restoreBackup(scope,raw,transport),drafts:createVitalDraftStorage({db:canonicalDb,authenticatedUser:localUser,activeScope})};
}
export const VITAL_SYNC_PRIORITY:readonly TableName[]=['vital_exercises','vital_foods','vital_nutrition_modalities','vital_training_plans','vital_nutrition_plans','vital_training_plan_versions','vital_nutrition_plan_versions','vital_workout_sessions','vital_meals','vital_training_checkins','vital_nutrition_checkins','vital_exercise_favorites','vital_audit'];
/** Canonical processor calls this for one queue item, before removing the queue item. */
export async function syncCanonicalVital(item:SyncQueueItem,uid:string){
 if(!vitalTable(item.table)||item.operation==='delete')throw Error('Operação Vital inválida.');
 const s=requireScope({user_id:uid,person_id:String(item.payload.person_id??'')});if(item.payload.user_id!==uid||await localUser()!==uid)throw Error('Conta Vital divergente.');
 const p=await db.persons.get(s.person_id);if(!p||p.user_id!==uid)throw Error('Pessoa fora da conta.');
 return pushVital({remote:transport,acks},item.table,s,item.payload);
}
/** Full canonical pull after persons; no independent timer, no new sync engine. */
export async function pullCanonicalVital(uid:string){
 if(await localUser()!==uid)throw Error('Conta Vital divergente.');
 const people=await db.persons.where('user_id').equals(uid).toArray();
 let conflicts=0,imported=0,preserved=0,failed=0;
 for(const person of people){if(person.user_id!==uid||!person.id)continue;const s=requireScope({user_id:uid,person_id:person.id});for(const table of VITAL_SYNC_PRIORITY){
  try{const rows=await pullVitalRows(transport,table,s);for(const row of rows){const result=await merge(table,s,row);if(result==='conflict')conflicts++;else if(result==='preserve_local')preserved++;else if(result==='accept')imported++;}}catch{failed++;}
 }}
 if(conflicts||failed)throw Error(`Vital: ${conflicts} conflitos preservados; ${failed} leituras incompletas.`);
 return {imported,preserved,conflicts};
}
/** Canonical realtime routes only Vital rows here, never generic put. */
export async function mergeCanonicalVitalRealtime(table:string,uid:string,raw:unknown,eventType:string){
 if(!vitalTable(table)||eventType==='DELETE'||!raw||typeof raw!=='object')throw Error('Evento Vital inválido.');
 const r=raw as Record<string,unknown>;if(r.user_id!==uid)throw Error('Evento fora da conta.');
 return merge(table,requireScope({user_id:uid,person_id:String(r.person_id??'')}),raw);
}

/** Called by the existing queue, using its deferred-error type at the call site. */
export async function pendingCanonicalVitalDependency(item:SyncQueueItem):Promise<string|null>{
 if(!vitalTable(item.table))return null;
 for(const dep of vitalDependencies(item.table,item.payload)){
  if(await db.syncQueue.where('chave').equals(`${dep.table}:${dep.id}`).first())return `${dep.table}:${dep.id}`;
 }
 if(item.table.endsWith('_plan_versions')){
  const entries=await db.syncQueue.where('table').equals(item.table).toArray();
  const prev=vitalEarlierVersion(item.table,item.payload,entries);
  if(prev)return `${prev.table}:${String(prev.payload.id)}`;
 }
 return null;
}
export async function finalizeCanonicalVital(item:SyncQueueItem):Promise<boolean>{
 const uid=await localUser();if(!uid)throw Error('Conta não autenticada.');
 return finalizeVitalQueue(canonicalDb,item,uid);
}
