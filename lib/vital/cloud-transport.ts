/** Transport invoked ONLY by the existing SyncQueue. No scheduler, no second outbox. */
import { TABLES, type TableName, type Row, type Scope, type VitalTables } from './model';
import { requireScope, requireId, own, fail, instant } from './validation';
import { decideVitalSync } from './sync-contract';
import {validateVitalWireShape} from './wire-validation';
const common=['id','user_id','person_id','created_at','updated_at','deleted_at','revision'] as const;
const specific:Record<TableName,readonly string[]>={
 vital_audit:['target_table','target_id','previous_revision','reason','previous'],
 vital_exercises:['name','kind','region','equipment','aliases','favorite','active'],
 vital_foods:['name','favorite','active','notes'],
 vital_workout_sessions:['day','title','modality','custom_modality','status','started_at','ended_at','duration_seconds','active_seconds','pause_seconds','duration_source','location_id','location_label','plan_version_id','rehab_program_id','notes','items','clock'],
 vital_training_checkins:['day','status','reason'],
 vital_training_plans:['name','starts_on','ends_on'],
 vital_training_plan_versions:['plan_id','version','effective_on','status','plan_name','items','goal'],
 vital_nutrition_plans:['name','starts_on','ends_on','professional_id'],
 vital_nutrition_plan_versions:['plan_id','version','effective_on','status','plan_name','professional_id','modality_ids','modalities','custom_modality','rules','targets','origin','notes'],
 vital_nutrition_modalities:['name','description','aliases','category','identity_id','active'],
 vital_meals:['day','time','kind','custom_label','plan_version_id','items','notes'],
 vital_nutrition_checkins:['day','status','energy','satiety','adaptation','daily_totals','daily_source'],
 vital_exercise_favorites:['exercise_id'],
};
export const vitalTable=(name:unknown):name is TableName=>typeof name==='string'&&TABLES.includes(name as TableName);
export function vitalRemoteFields(table:TableName){if(!vitalTable(table))fail('Tabela Vital desconhecida.');return [...common,...specific[table]];}
function normalized(value:unknown):unknown{
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'&&Number.isFinite(value))return value;
 if(Array.isArray(value))return value.map(normalized);
 if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalized((value as Record<string,unknown>)[k])]));}
 return fail('Payload Vital não serializável.');
}
const date=(v:unknown)=>instant(v)??fail('Timestamp Vital inválido.');
export function vitalWireRow<K extends TableName>(table:K,raw:unknown,scope:Scope):VitalTables[K]{
 const s=requireScope(scope);if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Registro Vital inválido.');const r=raw as Record<string,unknown>;
 const fields=vitalRemoteFields(table);if(fields.some(k=>!Object.hasOwn(r,k)||r[k]===undefined))fail('Payload Vital incompleto.');
 if(Object.keys(r).some(k=>k!=='synced'&&!fields.includes(k)))fail('Campo Vital não autorizado.');
 if(r.user_id!==s.user_id||r.person_id!==s.person_id)fail('Registro Vital fora da conta/pessoa.');
 requireId(r.id);if(!Number.isSafeInteger(r.revision)||Number(r.revision)<1)fail('Revisão Vital inválida.');
 const result=Object.fromEntries(fields.map(k=>[k,normalized(r[k])]));
 for(const key of ['created_at','updated_at','deleted_at','started_at','ended_at'])if(Object.hasOwn(result,key))result[key]=result[key]===null&&['deleted_at','started_at','ended_at'].includes(key)?null:date(result[key]);
 if(String(result.updated_at)<String(result.created_at)||result.deleted_at!==null&&String(result.deleted_at)>String(result.updated_at))fail('Cronologia Vital inválida.');
 validateVitalWireShape(table,result);
 return {...result,synced:false} as unknown as VitalTables[K];
}
export function vitalPayload<K extends TableName>(table:K,row:VitalTables[K],scope:Scope):Record<string,unknown>{const {synced,...wire}=vitalWireRow(table,row,scope);return wire;}
export async function vitalFingerprint<K extends TableName>(table:K,row:VitalTables[K],scope:Scope):Promise<string>{const bytes=new TextEncoder().encode(JSON.stringify(normalized(vitalPayload(table,row,scope))));const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
export type VitalAck=Scope&{id:string;table:TableName;row_id:string;revision:number|null;fingerprint:string|null;pending_revision:number|null;pending_fingerprint:string|null};
export const VITAL_ACK_STORE='id, user_id, person_id, [user_id+person_id], table, row_id';
export const vitalAckId=(table:TableName,scope:Scope,id:string)=>`${scope.user_id}:${scope.person_id}:${table}:${id}`;
export interface AckPort {read(key:string):Promise<VitalAck|undefined>;write(row:VitalAck):Promise<void>;}
export interface VitalRemote {
 get(table:TableName,scope:Scope,id:string):Promise<unknown|null>;
 insert(table:TableName,payload:Record<string,unknown>):Promise<unknown>;
 cas(table:TableName,scope:Scope,id:string,expectedRevision:number,payload:Record<string,unknown>):Promise<unknown|null>;
 page(table:TableName,scope:Scope,afterId:string|null,limit:number):Promise<unknown[]>;
}
export class VitalSyncConflict extends Error {constructor(message='Conflito de sincronização Vital. Registro local preservado.'){super(message);this.name='VitalSyncConflict';}}
const immutable=(table:TableName)=>table==='vital_audit'||table.endsWith('_versions');
function emptyAck(table:TableName,s:Scope,id:string):VitalAck{return {...s,id:vitalAckId(table,s,id),table,row_id:id,revision:null,fingerprint:null,pending_revision:null,pending_fingerprint:null};}
function validAck(a:VitalAck,table:TableName,s:Scope,id:string){if(!own(a,s)||a.id!==vitalAckId(table,s,id)||a.row_id!==id||a.table!==table)throw new VitalSyncConflict('Recibo fora do escopo.');for(const [revision,digest] of [[a.revision,a.fingerprint],[a.pending_revision,a.pending_fingerprint]] as const){if(revision===null?digest!==null:!Number.isSafeInteger(revision)||revision<1||typeof digest!=='string'||!/^[0-9a-f]{64}$/.test(digest))throw new VitalSyncConflict('Recibo inválido.');}}
/** Canonical queue must serialize the entity and retain the operation until this returns an ACK.
 *  Durable intent precedes I/O, so a lost response followed by a new local edit is recoverable.
 *  Do not call from a React effect or independently of the canonical queue. */
export async function pushVital<K extends TableName>(deps:{remote:VitalRemote;acks:AckPort},table:K,scope:Scope,raw:unknown):Promise<VitalAck>{
 const s=requireScope(scope),local=vitalWireRow(table,raw,s),id=local.id,localHash=await vitalFingerprint(table,local,s);
 let ack=await deps.acks.read(vitalAckId(table,s,id))??emptyAck(table,s,id);validAck(ack,table,s,id);
 const rawRemote=await deps.remote.get(table,s,id),remote=rawRemote===null?null:vitalWireRow(table,rawRemote,s);
 if(remote){
  if(remote.id!==id)throw new VitalSyncConflict('Identidade remota divergente.');
  const hash=await vitalFingerprint(table,remote,s);
  if(remote.revision===local.revision&&hash===localHash){ack={...ack,revision:local.revision,fingerprint:localHash,pending_revision:null,pending_fingerprint:null};await deps.acks.write(ack);return ack;}
  if(ack.pending_revision===remote.revision&&ack.pending_fingerprint===hash){ack={...ack,revision:remote.revision,fingerprint:hash,pending_revision:null,pending_fingerprint:null};await deps.acks.write(ack);}
  if(ack.revision!==remote.revision||ack.fingerprint!==hash)throw new VitalSyncConflict();
  if(immutable(table))throw new VitalSyncConflict('Versão ou auditoria imutável.');
 }
 const decision=decideVitalSync(s,local,remote,ack.revision);
 if(decision==='conflict'||decision==='already_acknowledged')throw new VitalSyncConflict();
 if(ack.pending_revision!==null&&ack.pending_revision>local.revision)throw new VitalSyncConflict('Operação local obsoleta.');
 if(ack.pending_revision===local.revision&&ack.pending_fingerprint!==localHash)throw new VitalSyncConflict('Mesmo número de revisão com conteúdos distintos.');
 ack={...ack,pending_revision:local.revision,pending_fingerprint:localHash};await deps.acks.write(ack);
 const payload=vitalPayload(table,local,s);
 // On compare-and-swap update only mutable data; immutable identities remain server-side.
 const {id:_id,user_id:_u,person_id:_p,created_at:_c,...delta}=payload;
 const returned=decision==='insert'?await deps.remote.insert(table,payload):await deps.remote.cas(table,s,id,remote!.revision,delta);
 if(returned===null)throw new VitalSyncConflict('Compare-and-swap recusado.');
 const saved=vitalWireRow(table,returned,s);
 if(saved.id!==id||saved.revision!==local.revision||await vitalFingerprint(table,saved,s)!==localHash)throw new VitalSyncConflict('Resposta do servidor não confirma o registro enviado.');
 const done={...ack,revision:local.revision,fingerprint:localHash,pending_revision:null,pending_fingerprint:null};await deps.acks.write(done);return done;
}
/** Stable keyset pagination. No partial results advertised as complete. */
export async function pullVitalRows<K extends TableName>(remote:VitalRemote,table:K,scope:Scope,limit=250,maxPages=400):Promise<VitalTables[K][]>{
 const s=requireScope(scope);if(!Number.isSafeInteger(limit)||limit<1||limit>1000||!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>1000)fail('Limite de leitura inválido.');
 let after:string|null=null;const rows:VitalTables[K][]=[];
 for(let i=0;i<maxPages;i++){const page=await remote.page(table,s,after,limit);if(!Array.isArray(page)||page.length>limit)throw new VitalSyncConflict('Página remota inválida.');for(const raw of page){const row=vitalWireRow(table,raw,s);if(after!==null&&row.id<=after)throw new VitalSyncConflict('Paginação remota não avançou.');after=row.id;rows.push({...row,synced:true});}// A PostgREST deployment can cap page size below the requested limit.
 // Only an empty page proves exhaustion; a short page is not a server ACK of completeness.
 if(page.length===0)return rows;}
 throw new VitalSyncConflict('Leitura Vital excedeu o limite seguro; não consolidar resultados parciais.');
}
/** Caller holds the canonical DB transaction; queue/pending local wins over remote. */
export function decideVitalPull<K extends TableName>(table:K,scope:Scope,local:VitalTables[K]|null,remoteRaw:unknown,hasPending:boolean):'accept'|'same'|'preserve_local'|'conflict'{
 const remote=vitalWireRow(table,remoteRaw,scope);if(!local)return hasPending?'conflict':'accept';const old=vitalWireRow(table,local,scope);if(old.id!==remote.id||old.created_at!==remote.created_at)return 'conflict';const same=JSON.stringify(normalized(vitalPayload(table,old,scope)))===JSON.stringify(normalized(vitalPayload(table,remote,scope)));if(same)return hasPending?'preserve_local':'same';if(hasPending||!local.synced)return 'preserve_local';if(old.deleted_at&&!remote.deleted_at||immutable(table)||remote.revision<=old.revision)return 'conflict';return 'accept';
}
