import {cutoverCanonical} from './cutover-recovery';
import {exactMacro02ValueIdentity,MACRO02_R3_REMOTE_COLUMNS} from './cutover-storage-codec';
import {projectResidualMetadataRow,residualMetadataQueueKey} from './cutover-metadata-batch';
import {parseMacro02MetadataIntent,type MetadataIntent,type MetadataChange} from './cutover-metadata-intent';
import {parseStockAtomicIntent,atomicQueueKey,intentFromQueue,sameCount,sameStock,assertAtomicAck,type StockAtomicIntent,type PendingItem} from './atomic-envelope';
import {observedStockContext} from './stock-context';
import {validInstant} from './center-view';
import {medicationAcquisitionFields} from './acquisition-wire';

type Row=Record<string,unknown>;
export type CompoundTable='medicamentos'|'renovacoes'|'retiradas'|'a1_prescription_links';
export type CompoundIntentR6=Readonly<{
 format:'macro02-compound-r6';account_id:string;epoch:string;operation_id:string;
 kind:'adjustment'|'acquisition'|'acquisition-unquantified'|'prescription';medication_before:Row;medication_after:Row;
 stock:StockAtomicIntent|null;metadata:readonly MetadataIntent[];link:Row|null;
}>;
const uuid=(x:unknown):x is string=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x);
const plain=(x:unknown):x is Row=>!!x&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const same=(a:unknown,b:unknown)=>cutoverCanonical(a)===cutoverCanonical(b);
const fail=(s:string):never=>{throw Error('M02_COMPOUND_'+s);};
const columns=(t:CompoundTable)=>MACRO02_R3_REMOTE_COLUMNS[t].split(',');
const shape=(r:Row,t:CompoundTable)=>Object.keys(r).sort().join(',')===columns(t).sort().join(',');
const owner=(r:Row,uid:string,pid:unknown)=>uuid(r.id)&&r.user_id===uid&&r.person_id===pid;
export function projectCompoundRow(t:CompoundTable,row:Row):Row{
 if(t!=='a1_prescription_links')return projectResidualMetadataRow(t,row);
 const fields=columns(t);if(Object.keys(row).some(k=>k!=='synced'&&!fields.includes(k)))return fail('LINK_COLUMNS');
 const out=Object.fromEntries(fields.map(k=>[k,row[k]??null]));cutoverCanonical(out);return out;
}
/** Exact row expected after the existing stock writer, before its companion
 * metadata writer. No recalculation, no assumed unit, no fabricated cycle. */
export function stockIntermediateR6(before:Row,stock:StockAtomicIntent):Row{
 const s=stock.stockBefore,scope={user_id:s.user_id,person_id:s.person_id,medicationId:s.medicationId};
 if(before.id!==s.medicationId||before.user_id!==s.user_id||before.person_id!==s.person_id||!sameCount(before,stock.beforeCount)||!sameStock(observedStockContext(before,scope),s))return fail('STOCK_PREIMAGE');
 const countKeys=['estoque_quantidade','estoque_unidade_medida','estoque_gotas_por_ml','estoque_ml_total','estoque_data_referencia','estoque_unidade_por_dose','estoque_ciclo_id','updated_at'].sort().join(',');
 if(Object.keys(stock.beforeCount).sort().join(',')!==countKeys||Object.keys(stock.afterCount).sort().join(',')!==countKeys)return fail('COUNT_SHAPE');
 const result={...before,...stock.afterCount,...(stock.medicationPatch??{}),macro02_stock_managed:true};
 if(!sameCount(result,stock.afterCount)||!sameStock(observedStockContext(result,scope),stock.stockAfter))return fail('STOCK_POSTIMAGE');return result;
}
/** Each companion is independently authorized by R4. The compound layer adds
 * the cross-row scope and causal binding missing from independent RPC calls. */
export function parseMacro02CompoundR6(raw:unknown):CompoundIntentR6{
 if(!plain(raw)||Object.keys(raw).sort().join(',')!=='account_id,epoch,format,kind,link,medication_after,medication_before,metadata,operation_id,stock'||raw.format!=='macro02-compound-r6'||!uuid(raw.account_id)||!uuid(raw.epoch)||!uuid(raw.operation_id)||!['adjustment','acquisition','acquisition-unquantified','prescription'].includes(String(raw.kind))||!plain(raw.medication_before)||!plain(raw.medication_after)||!Array.isArray(raw.metadata)||raw.metadata.length>3)return fail('SHAPE');
 const uid=raw.account_id,ep=raw.epoch,a=raw.medication_before,b=raw.medication_after,pid=a.person_id,mid=a.id;
 if(!uuid(pid)||!owner(a,uid,pid)||!owner(b,uid,pid)||a.id!==b.id||!shape(a,'medicamentos')||!shape(b,'medicamentos')||!validInstant(a.updated_at)||!validInstant(b.updated_at)||a.created_at!==b.created_at)return fail('MEDICATION_SCOPE');
 const ids=new Set([raw.operation_id]);const stock=raw.stock===null?null:parseStockAtomicIntent(raw.stock);
 if(stock){if(ids.has(stock.operationId)||stock.stockBefore.user_id!==uid||stock.stockBefore.person_id!==pid||stock.stockBefore.medicationId!==mid)return fail('STOCK_SCOPE');ids.add(stock.operationId);}
 const metadata=raw.metadata.map(v=>{const x=parseMacro02MetadataIntent(v);if(x.account_id!==uid||x.epoch!==ep||ids.has(x.operation_id)||x.changes.length!==1)return fail('METADATA_SCOPE');ids.add(x.operation_id);const c=x.changes[0],r=(c.after??c.before)!;if(!owner(r,uid,pid)|| (c.table==='medicamentos'?r.id:r.medicamento_id)!==mid)return fail('METADATA_ROW_SCOPE');return x;});
 const changes=metadata.map(x=>x.changes[0]);
 let link:Row|null=null;
 if(raw.link!==null){if(!plain(raw.link)||!shape(raw.link,'a1_prescription_links')||!owner(raw.link,uid,pid)||raw.link.medicamento_id!==mid||!uuid(raw.link.renovacao_anterior_id)||!uuid(raw.link.renovacao_atual_id)||raw.link.renovacao_anterior_id===raw.link.renovacao_atual_id||!['renovacao','substituicao'].includes(String(raw.link.tipo))||raw.link.origem!=='relato_pessoal'||raw.link.deleted_at!==null||!validInstant(raw.link.created_at)||!validInstant(raw.link.updated_at)||raw.link.created_at!==raw.link.updated_at||raw.link.observacoes!==null&&(typeof raw.link.observacoes!=='string'||raw.link.observacoes.length>1000))return fail('LINK');link=raw.link;}
 if(raw.kind==='adjustment'){
  if(stock?.mode!=='adjustment'||link||changes.length>1)return fail('ADJUSTMENT_SHAPE');const intermediate=stockIntermediateR6(a,stock);
  if(changes.length){const c=changes[0];if(c.table!=='medicamentos'||c.kind!=='medication-metadata'||!same(c.before,intermediate)||!same(c.after,b))return fail('ADJUSTMENT_METADATA');}
  else if(!same(intermediate,b))return fail('ADJUSTMENT_POSTIMAGE');
 }else if(raw.kind==='acquisition'){
  if(stock?.mode!=='acquisition'||link||changes.length>1||!same(stockIntermediateR6(a,stock),b))return fail('ACQUISITION_POSTIMAGE');
  if(changes.length){const c=changes[0];if(c.table!=='retiradas'||c.kind!=='withdrawal-plan'||!stock.acquisition)return fail('ACQUISITION_PLAN');const rx=stock.acquisition;
   for(const r of [c.before,c.after])if(r&&(r.renovacao_origem_id!==rx.id||r.id===stock.withdrawalId))return fail('ACQUISITION_PLAN_SCOPE');
   if(c.after){const target=rx.tipo_aquisicao==='sus'?(rx.data_proxima_retirada??rx.data_retorno_sus):null;if(!target||c.after.data!==target||c.after.tipo!=='sus'||c.after.status!=='agendada')return fail('ACQUISITION_PLAN_DATE');}
  }
 }else if(raw.kind==='acquisition-unquantified'){
  if(stock||link||changes.length<1||changes.length>3||changes[0].table!=='renovacoes'||changes[0].kind!=='acquisition-unquantified')return fail('UNQUANTIFIED_SHAPE');
  const rx=changes[0].after!;const permitted=[...medicationAcquisitionFields,'updated_at'];
  if(Object.keys(b).some(k=>!permitted.includes(k as typeof permitted[number])&&!same(a[k],b[k])))return fail('UNQUANTIFIED_STOCK_OR_FIELD');
  let seenMed=false,seenPlan=false;
  for(const c of changes.slice(1)){
   if(c.table==='medicamentos'){if(seenMed||seenPlan||c.kind!=='medication-metadata'||!same(c.before,a)||!same(c.after,b))return fail('UNQUANTIFIED_MED');seenMed=true;}
   else {if(seenPlan||c.table!=='retiradas'||c.kind!=='withdrawal-plan')return fail('UNQUANTIFIED_PLAN');seenPlan=true;for(const r of [c.before,c.after])if(r&&r.renovacao_origem_id!==rx.id)return fail('UNQUANTIFIED_PLAN_SCOPE');if(c.after&&(rx.tipo_aquisicao!=='sus'||c.after.data!==(rx.data_proxima_retirada??rx.data_retorno_sus)||c.after.tipo!=='sus'||c.after.status!=='agendada'))return fail('UNQUANTIFIED_PLAN_DATE');}
  }
  if(!seenMed&&!same(a,b))return fail('UNQUANTIFIED_POSTIMAGE');
 }else{
  if(stock||changes.length<1||changes.length>2||changes[0].table!=='renovacoes'||changes[0].kind!=='prescription-create')return fail('PRESCRIPTION_SHAPE');
  const rx=changes[0].after!;
  if(link&&link.renovacao_atual_id!==rx.id)return fail('PRESCRIPTION_LINK_SCOPE');
  if(changes.length===2){const c=changes[1];if(c.table!=='medicamentos'||c.kind!=='medication-metadata'||!same(c.before,a)||!same(c.after,b))return fail('PRESCRIPTION_MEDICATION');
   // A pure prescription may update its own canonical reference, not stock,
   // pharmacy, acquisition or an unrelated treatment.
   const permitted=['data_receita','document_id','medico_id','medico','proxima_renovacao','lembrete_receita_modo','lembrete_receita_data','updated_at'];
   if(Object.keys(b).some(k=>!permitted.includes(k)&&!same(a[k],b[k])))return fail('PRESCRIPTION_FIELD');
  }else if(!same(a,b))return fail('PRESCRIPTION_POSTIMAGE');
  if(b.data_receita!==rx.data||b.medico_id!==rx.medico_id)return fail('PRESCRIPTION_REFERENCE');
 }
 return JSON.parse(cutoverCanonical(raw)) as CompoundIntentR6;
}
export function makeMacro02CompoundR6(input:{kind:CompoundIntentR6['kind'];uid:string;epoch:string;before:Row;after:Row;stock?:StockAtomicIntent;rx?:Row;withdrawal?:{before:Row|null;after:Row|null};link?:Row;newId:()=>string}):CompoundIntentR6{
 const a=projectCompoundRow('medicamentos',input.before),b=projectCompoundRow('medicamentos',input.after),stock=input.stock??null,metadata:MetadataIntent[]=[];
 const push=(c:MetadataChange)=>metadata.push(parseMacro02MetadataIntent({format:'macro02-metadata-r3',account_id:input.uid,epoch:input.epoch,operation_id:input.newId(),changes:[c]}));
 if(input.kind==='prescription'||input.kind==='acquisition-unquantified'){if(!input.rx)return fail('PRESCRIPTION_MISSING');push({table:'renovacoes',kind:input.kind==='prescription'?'prescription-create':'acquisition-unquantified',before:null,after:projectCompoundRow('renovacoes',input.rx)});}
 const intermediate=stock?stockIntermediateR6(a,stock):a;
 if(!same(intermediate,b))push({table:'medicamentos',kind:'medication-metadata',before:intermediate,after:b});
 if(input.withdrawal){const w=input.withdrawal;push({table:'retiradas',kind:'withdrawal-plan',before:w.before?projectCompoundRow('retiradas',w.before):null,after:w.after?projectCompoundRow('retiradas',w.after):null});}
 return parseMacro02CompoundR6({format:'macro02-compound-r6',account_id:input.uid,epoch:input.epoch,operation_id:input.newId(),kind:input.kind,medication_before:a,medication_after:b,stock,metadata,link:input.link?projectCompoundRow('a1_prescription_links',input.link):null});
}
export function compoundFromQueueR6(item:PendingItem):CompoundIntentR6|null{
 const p=item.payload;if(p.macro02_compound===undefined)return null;
 const c=parseMacro02CompoundR6(p.macro02_compound);
 if(p.user_id!==c.account_id||p.person_id!==c.medication_before.person_id||item.operation!=='update')return fail('QUEUE_SCOPE');
 if(c.stock){if(p.macro02_metadata!==undefined||p.macro02_epoch!==c.epoch||!same(intentFromQueue(item),c.stock)||item.chave!==atomicQueueKey(c.stock))return fail('QUEUE_STOCK');}
 else {const a=c.metadata[0],r=a.changes[0].after!;if(p.macro02_atomic!==undefined||p.id!==r.id||item.table!=='renovacoes'||item.chave!==residualMetadataQueueKey(a)||!same(p.macro02_metadata,a))return fail('QUEUE_METADATA');}
 return c;
}
export function compoundPostimagesR6(c:CompoundIntentR6):{table:CompoundTable;id:string;row:Row|null}[]{
 const map=new Map<string,{table:CompoundTable;id:string;row:Row|null}>();
 const put=(table:CompoundTable,id:unknown,row:Row|null)=>{if(!uuid(id))return fail('POSTIMAGE_ID');map.set(`${table}:${id}`,{table,id,row});};
 put('medicamentos',c.medication_after.id,c.medication_after);
 if(c.stock?.acquisition)put('renovacoes',c.stock.acquisition.id,c.stock.acquisition);
 if(c.stock?.withdrawalAfter)put('retiradas',c.stock.withdrawalId,c.stock.withdrawalAfter);
 for(const m of c.metadata)for(const x of m.changes){if(x.table==='doseLogs')return fail('POSTIMAGE_TABLE');put(x.table,(x.after??x.before)!.id,x.after);}
 if(c.link)put('a1_prescription_links',c.link.id,c.link);
 return [...map.values()];
}
export function assertCompoundAckR6(c:CompoundIntentR6,raw:unknown){
 if(!plain(raw)||Object.keys(raw).sort().join(',')!=='account_id,committed,epoch,format,metadata,operation_id,request,stock'||raw.format!=='macro02-compound-ack-r6'||raw.account_id!==c.account_id||raw.epoch!==c.epoch||raw.operation_id!==c.operation_id||raw.committed!==true||!same(raw.request,c)||!Array.isArray(raw.metadata)||raw.metadata.length!==c.metadata.length)return fail('ACK');
 if(c.stock)assertAtomicAck(c.stock,raw.stock);else if(raw.stock!==null)return fail('ACK_STOCK');
 for(let i=0;i<c.metadata.length;i++){const a=raw.metadata[i],m=c.metadata[i];if(!plain(a)||a.format!=='macro02-metadata-ack-r5'||a.account_id!==c.account_id||a.epoch!==c.epoch||a.operation_id!==m.operation_id||a.committed!==true||!same(a.request,m))return fail('ACK_METADATA');}
 return raw;
}
export function exactCompoundQueueUnchanged(a:PendingItem,b:PendingItem){return a.chave===b.chave&&a.table===b.table&&a.operation===b.operation&&exactMacro02ValueIdentity(a.payload)===exactMacro02ValueIdentity(b.payload);}

export type CompoundLocalSnapshotR6={rows:Readonly<Record<CompoundTable,readonly Row[]>>;queue:readonly (PendingItem&{id?:string;updated_at?:string})[]};
const index=(r:readonly Row[])=>{const m=new Map<string,Row>();for(const x of r){if(!uuid(x.id)||m.has(x.id))return fail('LOCAL_ID');m.set(x.id,x);}return m;};
/** Verify the complete local transaction before changing the queue. The only
 * partial wire is the certified withdrawal completion; all other columns on
 * that row must retain the exact preimage. */
export function checkCompoundLocalDeltaR6(c:CompoundIntentR6,before:CompoundLocalSnapshotR6,after:CompoundLocalSnapshotR6){
 const expected=new Map<string,{before:Row|null;after:Row|null;table:CompoundTable;partial?:boolean}>();
 const put=(t:CompoundTable,id:unknown,a:Row|null,b:Row|null,partial=false)=>{if(!uuid(id))return fail('DELTA_ID');expected.set(t+':'+id,{before:a,after:b,table:t,partial});};
 put('medicamentos',c.medication_before.id,c.medication_before,c.medication_after);
 if(c.stock?.acquisition)put('renovacoes',c.stock.acquisition.id,null,c.stock.acquisition);
 if(c.stock?.withdrawalAfter)put('retiradas',c.stock.withdrawalId,c.stock.withdrawalBefore??null,c.stock.withdrawalAfter,true);
 for(const m of c.metadata)for(const x of m.changes){if(x.table==='doseLogs')return fail('DELTA_TABLE');if(x.table!=='medicamentos')put(x.table,(x.after??x.before)!.id,x.before,x.after);}
 if(c.link)put('a1_prescription_links',c.link.id,null,c.link);
 const compare=(t:CompoundTable,r:Row|null,w:Row|null)=>r===null||w===null?r===w:same(projectCompoundRow(t,r),w);
 for(const table of ['medicamentos','renovacoes','retiradas','a1_prescription_links'] as const){
  const old=index(before.rows[table]),fresh=index(after.rows[table]);
  for(const id of new Set([...old.keys(),...fresh.keys()])){
   const a=old.get(id)??null,b=fresh.get(id)??null,e=expected.get(table+':'+id);
   if(!e){if(exactMacro02ValueIdentity(a)!==exactMacro02ValueIdentity(b))return fail('UNEXPECTED_LOCAL_WRITE');continue;}
   if(e.partial){if(!a||!b||!e.before||!e.after)return fail('WITHDRAWAL_LOCAL');const wa=projectCompoundRow(table,a),wb=projectCompoundRow(table,b);if(Object.keys(e.before).some(k=>!same(wa[k],e.before![k]))||!same({...wa,...e.after},wb))return fail('WITHDRAWAL_LOCAL');}
   else if(!compare(table,a,e.before)||!compare(table,b,e.after))return fail('LOCAL_POSTIMAGE');
   if(b&&b.synced!==false&&exactMacro02ValueIdentity(a)!==exactMacro02ValueIdentity(b))return fail('LOCAL_SYNC_MARKER');
   if(table==='medicamentos'&&['cid_id','laboratorio_etiqueta'].some(k=>exactMacro02ValueIdentity(a?.[k])!==exactMacro02ValueIdentity(b?.[k])))return fail('LOCAL_ONLY');
   expected.delete(table+':'+id);
  }
 }
 if(expected.size)return fail('MISSING_LOCAL_ROW');
 const prior=new Map(before.queue.map(q=>[q.id,q])),fresh=new Map(after.queue.map(q=>[q.id,q]));
 if(prior.size!==before.queue.length||fresh.size!==after.queue.length||prior.has(undefined)||fresh.has(undefined))return fail('QUEUE_ID');
 for(const [id,q] of prior){const next=fresh.get(id);if(!next||exactMacro02ValueIdentity(q)!==exactMacro02ValueIdentity(next))return fail('PRIOR_QUEUE_CHANGED');}
 // Only the existing A1 and planning helpers may have created ordinary queue
 // entries. They are removed atomically before the single compound is added.
 const expectedQueue=new Map<string,{table:CompoundTable;before:Row|null;after:Row|null}>();
 for(const m of c.metadata)for(const x of m.changes)if(x.table==='retiradas')expectedQueue.set('retiradas:'+String((x.after??x.before)!.id),{table:'retiradas',before:x.before,after:x.after});
 if(c.link)expectedQueue.set('a1_prescription_links:'+String(c.link.id),{table:'a1_prescription_links',before:null,after:c.link});
 const removeIds:string[]=[];
 for(const [id,q] of fresh){if(prior.has(id))continue;const e=expectedQueue.get(q.chave);if(!e||q.table!==e.table||q.payload.user_id!==c.account_id||q.payload.person_id!==c.medication_before.person_id||q.payload.id!==(e.after??e.before)!.id||q.operation!==(e.before?e.after?'update':'delete':'add')||q.payload.macro02_atomic!==undefined||q.payload.macro02_metadata!==undefined||q.payload.macro02_compound!==undefined||e.after&&!same(projectCompoundRow(e.table,q.payload),e.after))return fail('UNEXPECTED_NEW_QUEUE');expectedQueue.delete(q.chave);removeIds.push(id!);}
 if(expectedQueue.size)return fail('MISSING_NEW_QUEUE');return removeIds;
}
/** Build the existing queue anchor without creating a second queue or changing
 * historical operation identity. The transport must send the complete compound. */
export function compoundQueueAnchorR6(c:CompoundIntentR6):PendingItem{
 const mid=c.medication_before.id,pid=c.medication_before.person_id;
 if(c.stock){const table=c.stock.mode==='acquisition'?'renovacoes':'medicamentos',id=c.stock.mode==='acquisition'?c.stock.acquisition!.id:mid;
  return {table,operation:'update',chave:atomicQueueKey(c.stock),payload:{id,user_id:c.account_id,person_id:pid,...(table==='renovacoes'?{medicamento_id:mid}:{}),macro02_atomic:c.stock,macro02_epoch:c.epoch,macro02_compound:c}};
 }
 const anchor=c.metadata[0],id=anchor.changes[0].after!.id;
 return {table:'renovacoes',operation:'update',chave:residualMetadataQueueKey(anchor),payload:{id,user_id:c.account_id,person_id:pid,medicamento_id:mid,macro02_metadata:anchor,macro02_compound:c}};
}
