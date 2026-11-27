import {CUTOVER_TABLES,cutoverLocalIdentity,type CutoverRows,type CutoverLocal,type CutoverTable} from './cutover-recovery';
type Row=Record<string,unknown>;
const isRow=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v===v.trim();
const clinical=new Set<string>(CUTOVER_TABLES);
/** Capture all clinical dependencies and the original queue in ONE read
 * transaction. Unknown ownership blocks admission; never export foreign data.
 * The host must supply real transactional reads and a session generation guard.
 * No user data is logged and no authority is issued. */
export async function captureMacro02LocalCutover(host:{
 transaction<T>(run:()=>Promise<T>):Promise<T>;
 readTable(table:CutoverTable|'syncQueue'):Promise<readonly unknown[]>;
 assertSession():void;
 validateLocal?:(local:CutoverLocal)=>void;
 /** Operational cutover also holds on any outside-account-dependency queue;
  * an unknown/unowned item cannot prove that a frozen image is complete. */
 requireAllQueueDependenciesClear?:boolean;
},uid:string):Promise<CutoverLocal>{
 if(!text(uid))throw Error('MACRO02_CUTOVER_ACCOUNT');
 host.assertSession();
 return host.transaction(async()=>{
  host.assertSession();
  const entries=await Promise.all(CUTOVER_TABLES.map(async t=>[t,await host.readTable(t)] as const));
  const all=new Map(entries),queue=await host.readTable('syncQueue');host.assertSession();
  let unscoped_rows_count=0,omitted_unowned_count=0,external_dependency_queue_count=0;
  const scoped=new Map<CutoverTable,Row[]>(),owners=new Map<CutoverTable,Map<string,string>>();
  for(const table of CUTOVER_TABLES){if(table==='medicamento_tratamentos')continue;
   const rows:Row[]=[],map=new Map<string,string>();owners.set(table,map);scoped.set(table,rows);
   const raw=all.get(table);if(!Array.isArray(raw))throw Error('MACRO02_CUTOVER_LOCAL_TABLE');
   for(const r of raw){if(!isRow(r)||!text(r.user_id)||!text(r.id)){unscoped_rows_count++;continue;}if(map.has(r.id))throw Error('MACRO02_CUTOVER_LOCAL_DUPLICATE');map.set(r.id,r.user_id);if(r.user_id===uid)rows.push(r);}
  }
  const links:Row[]=[];scoped.set('medicamento_tratamentos',links);
  const rawLinks=all.get('medicamento_tratamentos');if(!Array.isArray(rawLinks))throw Error('MACRO02_CUTOVER_LOCAL_TABLE');
  for(const r of rawLinks){
   if(!isRow(r)||!text(r.medicamento_id)||!text(r.tratamento_id)){unscoped_rows_count++;continue;}
   const m=owners.get('medicamentos')!.get(r.medicamento_id),t=owners.get('tratamentos')!.get(r.tratamento_id);
   if(m===uid&&t===uid&&(r.user_id==null||r.user_id===uid)&&text(r.id))links.push(r);
   else if(!m||!t||m!==t||r.user_id!=null&&r.user_id!==m||m===uid&&!text(r.id))unscoped_rows_count++;
  }
  const original:Row[]=[];
  if(!Array.isArray(queue))throw Error('MACRO02_CUTOVER_LOCAL_QUEUE');
  for(const q of queue){
   if(!isRow(q)||!text(q.table)){omitted_unowned_count++;continue;}
   const special=q.table==='tratamento_visual_identity'||host.requireAllQueueDependenciesClear===true&&!clinical.has(q.table);if(!clinical.has(q.table)&&!special)continue;
   if(!isRow(q.payload)||!text(q.payload.user_id)){omitted_unowned_count++;continue;}
   if(q.payload.user_id!==uid)continue;
   if(special){external_dependency_queue_count++;continue;}
   original.push(q);
  }
  const local:CutoverLocal={account_id:uid,rows:Object.fromEntries(scoped) as unknown as CutoverRows,queue:original,omitted_unowned_count,unscoped_rows_count,external_dependency_queue_count};
  // Validate shape, scope and canonical representation while the same
  // transaction is active. Never replace or serialize unknown values silently.
  (host.validateLocal??cutoverLocalIdentity)(local);host.assertSession();return local;
 });
}
