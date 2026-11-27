import {cutoverCanonical} from './cutover-recovery';
import {MACRO02_R3_REMOTE_COLUMNS,exactMacro02ValueIdentity} from './cutover-storage-codec';
import {parseMacro02MetadataIntent,type MetadataChange,type MetadataIntent,type MetadataTable,type MetadataKind} from './cutover-metadata-intent';

export const RESIDUAL_TABLES=['doseLogs','medicamentos','renovacoes','retiradas'] as const;
type Row=Record<string,unknown>;
type Rows=Record<MetadataTable,readonly Row[]>;
export type ResidualSnapshot={rows:Rows;queue:readonly Row[]};
function fail(reason:string):never{throw Error('M02_RESIDUAL_'+reason);}
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const same=(a:unknown,b:unknown)=>exactMacro02ValueIdentity(a)===exactMacro02ValueIdentity(b);
const byId=(rows:readonly Row[])=>{const out=new Map<string,Row>();for(const r of rows){if(!uuid(r.id)||out.has(r.id))fail('ROW_ID');out.set(r.id,r);}return out;};
// These defaults are taken from the existing ordinary sync serializers, not
// inferred from a medicine name, historical dose, or stock quantity.
const nullableDateFields=new Set(['data_receita','proxima_renovacao','lembrete_receita_data','estoque_data_referencia','data_retorno_sus','data_descontinuacao','data_aquisicao','data_proxima_retirada','validade_produto']);
const defaults:Partial<Record<MetadataTable,Record<string,unknown>>>={
 medicamentos:{lembrete_receita_modo:'automatico',macro02_stock_managed:false,medico:'',tipo_receita:'comum',tipo_uso:'continuo',status:'ativo',estoque_horarios:[],cores:[],historico_dosagens:[],cid_ids:[],tratamento_ids:[]},
 renovacoes:{a3_location_changes:[],exige_nova_receita:false},
 retiradas:{a3_location_changes:[],reagendamentos:[],exige_nova_receita:false},
};
export function projectResidualMetadataRow(table:MetadataTable,r:Row):Row{
 const fields=MACRO02_R3_REMOTE_COLUMNS[table].split(',').filter(k=>k!=='synced');
 const allowed=new Set([...fields,'synced',...(table==='medicamentos'?['cid_id','laboratorio_etiqueta']:[])]);
 if(Object.keys(r).some(k=>!allowed.has(k)))fail('UNMAPPED_COLUMN');
 // Only local-only known columns may be left outside the wire. The batch below
 // rejects changes to either of them; they are not silently lost on a write.
 const out:Row={};for(const k of fields){let v=r[k];if(v===undefined){const d=defaults[table];v=d&&Object.hasOwn(d,k)?d[k]:null;}
  if(nullableDateFields.has(k)&&v==='')v=null;out[k]=v;
 }
 cutoverCanonical(out);return out;
}
const rowKind=(table:MetadataTable,a:Row|null,b:Row|null,preferred?:MetadataKind):MetadataKind=>{
 if(table==='doseLogs')return 'planned-dose';
 if(table==='medicamentos')return !a?'medication-create':preferred==='medication-discontinue'?'medication-discontinue':'medication-metadata';
 if(table==='renovacoes')return !a?'prescription-create':!b?'prescription-delete':'prescription-edit';
 if(a&&b&&a.renovacao_realizada_id==null&&b.renovacao_realizada_id!=null)return 'withdrawal-link-receipt';
 if(a&&b&&a.status==='realizada'&&b.status==='realizada')return 'withdrawal-annotate';
 return 'withdrawal-plan';
};
/** Scope is independently checked again by the future server writer. A valid
 * metadata row is not permission to mutate it from an unrelated route. */
function assertRouteScope(changes:readonly MetadataChange[],preferred:MetadataKind|undefined){
 if(!preferred)return; // pure harness; production repositories pass an explicit route
 const allowed:Readonly<Record<MetadataKind,readonly MetadataKind[]>>={
  'planned-dose':['planned-dose'],'medication-create':['medication-create'],'medication-discontinue':['medication-discontinue'],'medication-metadata':['medication-metadata'],
  'prescription-create':['prescription-create','withdrawal-plan','medication-metadata'],
  'prescription-edit':['prescription-edit','withdrawal-plan','medication-metadata'],
  'prescription-delete':['prescription-delete','withdrawal-plan'],
  'withdrawal-plan':['withdrawal-plan','withdrawal-annotate','medication-metadata'],
  'withdrawal-annotate':['withdrawal-annotate'],'withdrawal-link-receipt':['withdrawal-link-receipt'],'acquisition-unquantified':['acquisition-unquantified'],
 };
 if(changes.some(c=>!allowed[preferred].includes(c.kind)))fail('ROUTE_SCOPE');
 const primary=changes.filter(c=>c.kind===preferred||preferred==='withdrawal-plan'&&c.kind==='withdrawal-annotate');
 if(!primary.length)fail('ROUTE_PRIMARY');
 if(preferred.startsWith('prescription-')&&primary.length!==1)fail('ROUTE_PRIMARY');
 for(const c of changes){
  if(c.kind==='medication-metadata'&&preferred!=='medication-metadata'){
   if(!c.before||!c.after||Object.keys(c.after).some(k=>!['data_retorno_sus','updated_at'].includes(k)&&!same(c.before![k],c.after![k])))fail('ROUTE_MEDICATION_FIELD');
   const matching=primary.some(p=>[p.before,p.after].some(r=>r?.medicamento_id===c.after!.id));
   if(!matching)fail('ROUTE_MEDICATION_SCOPE');
  }
  if(c.kind==='withdrawal-plan'&&preferred.startsWith('prescription-')){
   const rx=(primary[0].after??primary[0].before)!;
   if([c.before,c.after].some(r=>r&&(r.medicamento_id!==rx.medicamento_id||r.renovacao_origem_id!==rx.id)))fail('ROUTE_WITHDRAWAL_SCOPE');
  }
 }
}
export function buildMacro02ResidualBatch(before:ResidualSnapshot,after:ResidualSnapshot,input:{uid:string;epoch:string;operationId:string;preferred?:MetadataKind}){
 const changes:MetadataChange[]=[],expected=new Map<string,{table:MetadataTable;before:Row|null;after:Row|null}>();
 const priorQueue=byId(before.queue),nextQueue=byId(after.queue),uid=input.uid;
 // The residual writer cannot mutate or coalesce an existing outbox item.
 // This protects atomic stock chains and any unrelated clinical writer.
 for(const [id,q] of priorQueue){const next=nextQueue.get(id);if(!next||!same(q,next))fail('PRIOR_QUEUE_CHANGED');}
 const newQueue=[...nextQueue].filter(([id])=>!priorQueue.has(id)).map(([,q])=>q);
 const beforeIndex=Object.fromEntries(RESIDUAL_TABLES.map(t=>[t,byId(before.rows[t])])) as Record<MetadataTable,Map<string,Row>>;
 const afterIndex=Object.fromEntries(RESIDUAL_TABLES.map(t=>[t,byId(after.rows[t])])) as Record<MetadataTable,Map<string,Row>>;
 for(const table of RESIDUAL_TABLES){const aRows=beforeIndex[table],bRows=afterIndex[table];for(const id of new Set([...aRows.keys(),...bRows.keys()])){
  const a=aRows.get(id)??null,b=bRows.get(id)??null;if(same(a,b))continue;
  if(a&&a.user_id!==uid||b&&b.user_id!==uid)fail('FOREIGN_ROW');
  if(table==='medicamentos'&&['cid_id','laboratorio_etiqueta'].some(k=>!same(a?.[k],b?.[k])))fail('LOCAL_ONLY_MUTATION');
  const wa=a?projectResidualMetadataRow(table,a):null,wb=b?projectResidualMetadataRow(table,b):null;
  if(same(wa,wb))fail('NON_FACTUAL_LOCAL_ONLY_WRITE');
  if(b?.synced!==false&&b!==null)fail('LOCAL_SYNC_MARKER');
  const kind=rowKind(table,wa,wb,input.preferred);
  let receipt:Row|undefined;
  if(kind==='withdrawal-link-receipt'){
   const rid=String(wb?.renovacao_realizada_id),r=beforeIndex.renovacoes.get(rid);
   if(!r||!same(r,afterIndex.renovacoes.get(rid)))fail('RECEIPT_CHANGED');
   receipt=projectResidualMetadataRow('renovacoes',r);
  }
  changes.push({table,kind,before:wa,after:wb,...(receipt?{receipt}:{})});
  expected.set(`${table}:${id}`,{table,before:a,after:b});
 }}
 // Every changed row must have its own newly produced ordinary queue entry;
 // no other table, foreign row, unqueued change or overwritten intent is allowed.
 for(const q of newQueue){if(typeof q.chave!=='string')fail('QUEUE_KEY');const entry=expected.get(q.chave);const payload=q.payload as Row|undefined;
  if(!entry||!payload||q.table!==entry.table||payload.user_id!==uid||payload.id!==(entry.after??entry.before)?.id||payload.person_id!==(entry.after??entry.before)?.person_id||payload.macro02_atomic!==undefined||payload.macro02_metadata!==undefined)fail('QUEUE_SCOPE');
  const operation=entry.before?entry.after?'update':'delete':'add';if(q.operation!==operation)fail('QUEUE_OPERATION');
  if(entry.after&&!same(projectResidualMetadataRow(entry.table,payload),projectResidualMetadataRow(entry.table,entry.after)))fail('QUEUE_POSTIMAGE');
  expected.delete(q.chave);
 }
 if(expected.size)fail('UNQUEUED_ROW');
 if(!changes.length){if(newQueue.length)fail('UNEXPECTED_QUEUE');return null;}
 const persons=new Set(changes.map(c=>(c.after??c.before)?.person_id));if(persons.size!==1)fail('CROSS_PERSON_BATCH');
 // At this stage an existing clinical intent cannot share a medication with
 // the batch. No conversion, replay or automatic receipt acknowledgement.
 const meds=new Set(changes.flatMap(c=>[c.before,c.after].filter((r):r is Row=>!!r).map(r=>c.table==='medicamentos'?r.id:r.medicamento_id)));
 for(const q of before.queue){if(!RESIDUAL_TABLES.includes(q.table as MetadataTable))continue;const p=q.payload as Row|undefined;
  if(!p||typeof p.user_id!=='string')fail('UNKNOWN_PENDING');if(p.user_id!==uid)continue;
  if(p.macro02_metadata!==undefined||p.macro02_atomic!==undefined||meds.has(q.table==='medicamentos'?p.id:p.medicamento_id)||q.operation==='delete'&&q.table!=='medicamentos')fail('CLINICAL_PENDING');
 }
 assertRouteScope(changes,input.preferred);
 const intent=parseMacro02MetadataIntent({format:'macro02-metadata-r3',account_id:uid,epoch:input.epoch,operation_id:input.operationId,changes});
 return {intent,removeQueueIds:newQueue.map(q=>String(q.id))};
}
export function residualMetadataQueueKey(intent:MetadataIntent){return `macro02-metadata:${intent.operation_id}`;}
