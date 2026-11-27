import {MACRO02_CLINICAL_BACKUP_TABLES} from './clinical-backup-evidence';
import {countMacro02Pending} from './authority-session';
import type {PendingItem} from './atomic-envelope';

/** Activation lab contract. This module does not issue clinical write grants,
 * change the R2 fence, dispatch queues or enable the Premium selectors.
 * A future authenticated server snapshot adapter must establish the fence,
 * completeness and canonical local row representation before calling it. */
type Row = Record<string, unknown>;
export const CUTOVER_TABLES = [...MACRO02_CLINICAL_BACKUP_TABLES, 'medicamento_tratamentos'] as const;
export type CutoverTable = typeof CUTOVER_TABLES[number];
const tables = new Set<string>(CUTOVER_TABLES);
const isRow = (v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const id = (v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=256&&v===v.trim();
function fail(reason:string):never { throw Error('MACRO02_CUTOVER_'+reason); }
/** Exact JSON representation, including explicit null vs missing. Reject values
 * that JSON.stringify would silently change or drop. No device wall clock. */
export function cutoverCanonical(value:unknown):string {
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value)&&!Object.is(value,-0))return JSON.stringify(value);
 if(Array.isArray(value)){if(Object.keys(value).length!==value.length||Object.getOwnPropertySymbols(value).length)fail('NON_JSON');for(let i=0;i<value.length;i++)if(!Object.prototype.hasOwnProperty.call(value,i))fail('NON_JSON');return '['+value.map(cutoverCanonical).join(',')+']';}
 if(!isRow(value)||Object.getOwnPropertySymbols(value).length)fail('NON_JSON');
 return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+cutoverCanonical(value[k])).join(',')+'}';
}
export type CutoverRows = Record<CutoverTable,readonly Row[]>;
export type CutoverLocal = Readonly<{account_id:string;rows:CutoverRows;queue:readonly Row[];omitted_unowned_count:number;unscoped_rows_count:number;external_dependency_queue_count:number}>;
type Indexed = Map<CutoverTable,Map<string,Row>>;
const same=(a:unknown,b:unknown)=>cutoverCanonical(a)===cutoverCanonical(b);
const personTables=new Set(['medicamentos','renovacoes','retiradas','doseLogs','tratamentos','cids','fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos','a1_treatment_phases','a1_prescription_links','a1_supply_locations']);
const refs:Readonly<Record<string,CutoverTable>>={medicamento_id:'medicamentos',renovacao_origem_id:'renovacoes',renovacao_realizada_id:'renovacoes',renovacao_anterior_id:'renovacoes',renovacao_atual_id:'renovacoes',retirada_id:'retiradas',medico_id:'medicos',profissional_id:'medicos',farmacia_id:'farmacias',hospital_id:'hospitais',local_id:'locais',tratamento_id:'tratamentos',cid_id:'cids',fornecimento_id:'fornecimentos',processo_id:'fornecimentos',fornecimento_ciclo_id:'fornecimento_ciclos',ciclo_id:'fornecimento_ciclos',documento_id:'documents',document_id:'documents',medico_descontinuacao_id:'medicos',substituido_por_id:'medicamentos'};
/** Every table must be represented, including empty tables. Missing old
 * dependencies remain blockers; do not generate replacement rows or people. */
function indexRows(uid:string,raw:unknown):{index:Indexed;missing:number} {
 if(!id(uid)||!isRow(raw)||Object.keys(raw).length!==CUTOVER_TABLES.length)fail('TABLE_SCOPE');
 const index:Indexed=new Map();
 for(const table of CUTOVER_TABLES){
  const rows=raw[table];if(!Array.isArray(rows))fail('TABLE_MISSING');const m=new Map<string,Row>();
  for(const r of rows){if(!isRow(r))fail('ROW_ID');
   // A remote join row may have only its two existing endpoints. Use their
   // pair for comparison; retain the original row, never manufacture its ID.
   let key:string;
   if(table==='medicamento_tratamentos'){if(r.user_id!=null&&r.user_id!==uid)fail('ROW_SCOPE');if(!id(r.medicamento_id)||!id(r.tratamento_id)||r.id!=null&&!id(r.id))fail('LINK_SCOPE');key=JSON.stringify([r.medicamento_id,r.tratamento_id]);}
   else {if(!id(r.id))fail('ROW_ID');if(r.user_id!==uid)fail('ROW_SCOPE');key=r.id;}
   if(m.has(key))fail('ROW_ID');cutoverCanonical(r);m.set(key,r);
  }index.set(table,m);
 }
 let missing=0;const people=index.get('persons')!,pairs=new Set<string>();
 for(const [table,rows] of index){for(const r of rows.values()){
  if(table==='medicamento_tratamentos'){
   if(!id(r.medicamento_id)||!id(r.tratamento_id))fail('LINK_SCOPE');
   const med=index.get('medicamentos')!.get(r.medicamento_id),t=index.get('tratamentos')!.get(r.tratamento_id),pair=JSON.stringify([r.medicamento_id,r.tratamento_id]);
   if(pairs.has(pair))fail('DUPLICATE_LINK');pairs.add(pair);
   if(!med||!t){missing++;continue;}if(med.person_id!==t.person_id)fail('CROSS_PERSON');continue;
  }
  if(table!=='persons'&&r.person_id!=null){if(!id(r.person_id))fail('PERSON_ID');if(!people.has(r.person_id))missing++;}
  if(personTables.has(table)&&!id(r.person_id))missing++;
  const listRefs:Readonly<Record<string,CutoverTable>>=table==='medicamentos'?{tratamento_ids:'tratamentos',cid_ids:'cids'}:table==='tratamentos'?{medicamento_ids:'medicamentos',cid_ids:'cids',medico_ids:'medicos',hospital_ids:'hospitais',local_ids:'locais'}:{};
  for(const [field,target] of Object.entries(listRefs)){const values=r[field];if(values==null)continue;if(!Array.isArray(values)||values.some(v=>!id(v))||new Set(values).size!==values.length)fail('REFERENCE_LIST');for(const v of values){const linked=index.get(target)!.get(v);if(!linked){missing++;continue;}if(personTables.has(target)&&r.person_id!=null&&linked.person_id!=null&&r.person_id!==linked.person_id)fail('CROSS_PERSON');}}
  for(const [field,target] of Object.entries(refs)){const v=r[field];if(v==null||v==='')continue;if(!id(v))fail('REFERENCE_ID');const linked=index.get(target)!.get(v);if(!linked){missing++;continue;}if(personTables.has(table)&&personTables.has(target)&&r.person_id!=null&&linked.person_id!=null&&r.person_id!==linked.person_id)fail('CROSS_PERSON');}
 }}return {index,missing};
}
function queueIndex(local:CutoverLocal){
 if(![local.omitted_unowned_count,local.unscoped_rows_count,local.external_dependency_queue_count].every(n=>Number.isSafeInteger(n)&&n>=0)||!Array.isArray(local.queue))fail('QUEUE_SCOPE');
 const seen=new Set<string>(),keys=new Set<string>(),pending:PendingItem[]=[];
 for(const q of local.queue){
  if(!isRow(q)||!id(q.id)||seen.has(q.id)||!id(q.chave)||keys.has(q.chave)||typeof q.table!=='string'||!tables.has(q.table)||!['add','update','delete'].includes(String(q.operation))||!isRow(q.payload)||q.payload.user_id!==local.account_id||!id(q.payload.id))fail('QUEUE_SCOPE');
  if(q.payload.macro02_atomic===undefined&&q.chave!==`${q.table}:${q.payload.id}`)fail('QUEUE_KEY');
  cutoverCanonical(q);seen.add(q.id);keys.add(q.chave);pending.push({table:q.table,chave:q.chave,operation:String(q.operation),payload:q.payload});
 }return {pending,counts:countMacro02Pending(pending,local.account_id)};
}
function orderedRows(index:Indexed):CutoverRows {
 return Object.fromEntries(CUTOVER_TABLES.map(table=>[table,[...index.get(table)!.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,r])=>r)])) as unknown as CutoverRows;
}
export function cutoverLocalIdentity(local:CutoverLocal):string {
 const data=indexRows(local.account_id,local.rows);queueIndex(local);
 return cutoverCanonical({account_id:local.account_id,rows:orderedRows(data.index),queue:[...local.queue].sort((a,b)=>String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0),omitted_unowned_count:local.omitted_unowned_count,unscoped_rows_count:local.unscoped_rows_count,external_dependency_queue_count:local.external_dependency_queue_count});
}
export type FencedSnapshotWire=Readonly<{version:1;account_id:string;fence_id:string;epoch:string;complete:true;rows:CutoverRows}>;
/** Trust boundary: the caller must obtain wire from an authenticated RPC with
 * a server-enforced snapshot fence. The current R2 RPC cannot supply this.
 * A plain JSON file or an ordinary pull is not such an RPC. */
export function inspectMacro02Cutover(local:CutoverLocal,wire:unknown,expected:{account_id:string;fence_id:string;epoch:string}){
 if(!isRow(wire)||wire.version!==1||wire.complete!==true||!id(expected.account_id)||!id(expected.fence_id)||!id(expected.epoch)||local.account_id!==expected.account_id||wire.account_id!==expected.account_id||wire.fence_id!==expected.fence_id||wire.epoch!==expected.epoch)fail('FENCE');
 const l=indexRows(local.account_id,local.rows),r=indexRows(local.account_id,wire.rows),q=queueIndex(local);
 const counts={legacy:q.counts.legacy,premium:q.counts.premium,unclassified:q.counts.unclassified,dependency:q.pending.length-q.counts.legacy-q.counts.premium-q.counts.unclassified};
 let localOnly=0,remoteOnly=0,divergent=0,equal=0,unsyncedRows=0;
 for(const table of CUTOVER_TABLES){const a=l.index.get(table)!,b=r.index.get(table)!;for(const [key,row] of a){if(row.synced===false)unsyncedRows++;if(!b.has(key))localOnly++;else if(same(row,b.get(key)))equal++;else divergent++;}for(const key of b.keys())if(!a.has(key))remoteOnly++;}
 // A matching row is not an ACK. A missing row is not authorization to replay,
 // including delete intents. Preserve original queue bytes and identifiers.
 const intents=q.pending.map(item=>{const remote=r.index.get(item.table as CutoverTable)!.get(String(item.payload.id));
  const status=item.operation==='delete'?(remote?'delete_conflict':'delete_absence_unproven'):remote?(same(item.payload,remote)?'equal_at_fence_not_ack':'divergent_at_fence'):'absent_at_fence_not_replay';
  return {chave:item.chave,status} as const;
 });
 const blockers:string[]=[];
 if(local.omitted_unowned_count)blockers.push('UNOWNED_QUEUE');if(local.unscoped_rows_count)blockers.push('UNSCOPED_ROWS');if(local.external_dependency_queue_count)blockers.push('EXTERNAL_DEPENDENCY_QUEUE');if(q.pending.length)blockers.push('PENDING_QUEUE');
 if(unsyncedRows)blockers.push('UNSYNCED_ROWS');if(l.missing||r.missing)blockers.push('MISSING_DEPENDENCY');if(localOnly)blockers.push('LOCAL_ONLY');if(remoteOnly)blockers.push('REMOTE_ONLY');if(divergent)blockers.push('DIVERGENT_ROWS');
 return {counts:{...counts,omittedUnowned:local.omitted_unowned_count,unscopedRows:local.unscoped_rows_count,externalDependencyQueue:local.external_dependency_queue_count,localOnly,remoteOnly,divergent,equal,unsyncedRows,missingDependencies:l.missing+r.missing},blockers,intents,localMatchesFence:!blockers.length,allowsActivation:false as const,allowsReplay:false as const,allowsAck:false as const};
}

/** Conservative add-only recovery candidate: a backup row must equal the exact
 * authoritative fenced row; no local existing row is overwritten or deleted.
 * Pending intents, local-only rows, conflicts and incomplete relationships
 * stop recovery. No operational write permission is issued by this planner. */
export function planMacro02FencedRecovery(local:CutoverLocal,backup:CutoverLocal,wire:unknown,expected:{account_id:string;fence_id:string;epoch:string}){
 const live=inspectMacro02Cutover(local,wire,expected),archived=inspectMacro02Cutover(backup,wire,expected);
 if(live.blockers.some(b=>b!=='REMOTE_ONLY'&&b!=='MISSING_DEPENDENCY')||archived.blockers.length)fail('RECOVERY_CONFLICT');
 const a=indexRows(local.account_id,local.rows),b=indexRows(backup.account_id,backup.rows);
 // All dependencies must be valid in the final exact backup/remote state.
 const adds:{table:CutoverTable;row:Row}[]=[];
 for(const table of CUTOVER_TABLES)for(const [key,row] of b.index.get(table)!)if(!a.index.get(table)!.has(key)){if(table==='medicamento_tratamentos'&&!id(row.id))fail('LOCAL_LINK_ID_REQUIRED');adds.push({table,row:JSON.parse(cutoverCanonical(row)) as Row});}
 return {adds,expectedBefore:cutoverLocalIdentity(local),expectedAfter:cutoverLocalIdentity(backup),allowsLiveRestore:false as const,allowsReplay:false as const};
}
