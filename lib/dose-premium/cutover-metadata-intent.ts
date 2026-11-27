import {cutoverCanonical} from './cutover-recovery';
import {MACRO02_R3_REMOTE_COLUMNS} from './cutover-storage-codec';
import {validDay as isDay,validHour as isHour,validInstant} from './center-view';
import {explicitStockUnit} from './stock-cycle';

type Row=Record<string,unknown>;
export type MetadataTable='doseLogs'|'medicamentos'|'renovacoes'|'retiradas';
export type MetadataKind='planned-dose'|'medication-create'|'medication-discontinue'|'medication-metadata'|'acquisition-unquantified'|'prescription-create'|'prescription-edit'|'prescription-delete'|'withdrawal-plan'|'withdrawal-annotate'|'withdrawal-link-receipt';
export type MetadataChange=Readonly<{table:MetadataTable;kind:MetadataKind;before:Row|null;after:Row|null;receipt?:Row}>;
export type MetadataIntent=Readonly<{format:'macro02-metadata-r3';account_id:string;epoch:string;operation_id:string;changes:readonly MetadataChange[]}>;
const uuid=(x:unknown):x is string=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x);
const plain=(x:unknown):x is Row=>!!x&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
function fail(s:string):never{throw Error('M02_METADATA_'+s);}
const validDay=(x:unknown):x is string=>typeof x==='string'&&isDay(x);
const validHour=(x:unknown):x is string=>typeof x==='string'&&isHour(x);
const same=(a:unknown,b:unknown)=>cutoverCanonical(a??null)===cutoverCanonical(b??null);
const quantity=(v:unknown)=>v==null||typeof v==='number'&&Number.isFinite(v)&&v>0;
const missing=(r:Row,keys:readonly string[])=>keys.every(k=>r[k]==null);
const changed=(a:Row,b:Row)=>[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>!same(a[k],b[k]));
const only=(a:Row,b:Row,fields:readonly string[])=>{if(changed(a,b).some(k=>!fields.includes(k)))fail('PROTECTED_FIELD');};
const samePrefix=(before:unknown,after:unknown)=>{if(before!=null&&!Array.isArray(before)||after!=null&&!Array.isArray(after))return false;const a=(before??[]) as unknown[],b=(after??[]) as unknown[];return a.length<=b.length&&a.every((r,i)=>same(r,b[i]));};
const plannedDose=(r:Row)=>r.dose_kind==='planned'&&missing(r,['tomado_em','ignorado_em','unidade_dose','unidade_dose_rotulo','fonte_unidade','estoque_movimento','farmaco_snapshot'])&&validDay(r.data)&&validHour(r.horario)&&quantity(r.quantidade);
const purePrescription=(r:Row)=>missing(r,['data_aquisicao','tipo_aquisicao','quantidade','preco','lote','validade_produto']);
const unresolvedWithdrawal=(r:Row)=>['agendada','cancelada','nao_realizada'].includes(String(r.status))&&missing(r,['renovacao_realizada_id','quantidade_retirada','realizada_em'])&&validDay(r.data)&&(r.horario==null||validHour(r.horario))&&quantity(r.quantidade_prevista);
const scope=(r:Row,uid:string)=>{if(!uuid(r.id)||r.user_id!==uid||!uuid(r.person_id))fail('SCOPE');};
const medicationFields=['nome','dosagem','medico','farmacia','medico_id','farmacia_id','hospital_id','local_id','document_id','data_receita','proxima_renovacao','observacoes','tipo_receita','lembrete_receita_modo','lembrete_receita_data','tipo_uso','tipo_aquisicao','data_retorno_sus','forma_farmaceutica','cor_principal','cor_secundaria','status','estoque_horarios','formato','cores','motivo_descontinuacao','medico_descontinuacao_id','medico_descontinuacao_nome','substituido_por_id','data_descontinuacao','preco','historico_dosagens','catalog_snapshot','contexto_clinico_m1','cid_ids','tratamento_ids','updated_at'];
const discontinuation=['status','data_descontinuacao','motivo_descontinuacao','medico_descontinuacao_id','medico_descontinuacao_nome','substituido_por_id','updated_at'];
const rxFields=['data','document_id','medico_id','farmacia_id','hospital_id','local_id','observacoes','data_proxima_retirada','data_retorno_sus','exige_nova_receita','anexo_url','a3_location_snapshot','a3_location_changes','updated_at'];
const withdrawalFields=['data','horario','tipo','status','medico_id','farmacia_id','hospital_id','local_id','medicamento_nome','medicamento_dosagem','quantidade_prevista','exige_nova_receita','observacoes','reagendamentos','fornecimento_id','fornecimento_ciclo_id','a3_location_snapshot','a3_location_changes','updated_at'];
function validateRow(table:MetadataTable,r:Row,uid:string){
 scope(r,uid);if(table!=='medicamentos'&&!uuid(r.medicamento_id))fail('MEDICATION_SCOPE');
 // Wire columns only. Local synced is not a remote fact/ACK or a CAS input.
 const allowed=MACRO02_R3_REMOTE_COLUMNS[table].split(',').filter(k=>k!=='synced');
 if(Object.keys(r).sort().join(',')!==allowed.sort().join(','))fail('ROW_COLUMNS');
 if(!validInstant(r.updated_at)||r.created_at!=null&&!validInstant(r.created_at))fail('REVISION');
 cutoverCanonical(r);
}
/** These predicates cover the non-factual part of the eleven residual paths.
 * They never issue authority, apply a write, recalculate stock, or authorize
 * an acquisition erasure. SQL must independently validate full scope, exact
 * preimage, references and ledger, rather than trusting this client parser. */
export function validateMacro02MetadataChange(change:MetadataChange,uid:string):void{
 if(!plain(change)||!['doseLogs','medicamentos','renovacoes','retiradas'].includes(change.table)||(!change.before&&!change.after))fail('CHANGE_SHAPE');
 const {table,kind,before:a,after:b}=change;
 if(a)validateRow(table,a,uid);if(b)validateRow(table,b,uid);
 if(a&&b){if(['id','user_id','person_id','created_at',...(table==='medicamentos'||kind==='withdrawal-plan'?[]:['medicamento_id'])].some(k=>!same(a[k],b[k])))fail('IDENTITY');if(Date.parse(String(b.updated_at))<Date.parse(String(a.updated_at)))fail('REVISION');}
 if(kind!=='withdrawal-link-receipt'&&change.receipt!==undefined)fail('UNEXPECTED_RECEIPT');
 switch(kind){
  case 'planned-dose':
   if(table!=='doseLogs'||a&&!plannedDose(a)||b&&!plannedDose(b))fail('DOSE_FACT');
   if(a&&b)only(a,b,['quantidade','motivo','observacoes','updated_at']);return;
  case 'medication-create':
   if(table!=='medicamentos'||a||!b||b.estoque_ciclo_id!=null||b.macro02_stock_managed!==false||typeof b.nome!=='string'||!b.nome.trim()||typeof b.dosagem!=='string'||!b.dosagem.trim())fail('MED_CREATE');
   if(b.estoque_quantidade!=null&&(typeof b.estoque_quantidade!=='number'||!Number.isFinite(b.estoque_quantidade)||b.estoque_quantidade<0||b.estoque_quantidade>0&&!explicitStockUnit(b.estoque_unidade_medida)))fail('INITIAL_STOCK');return;
  case 'medication-discontinue':
   if(table!=='medicamentos'||!a||!b||b.status!=='descontinuado'||!validDay(b.data_descontinuacao)||typeof b.motivo_descontinuacao!=='string'||!b.motivo_descontinuacao.trim())fail('DISCONTINUE');only(a,b,discontinuation);return;
  case 'medication-metadata':
   if(table!=='medicamentos'||!a||!b)fail('MED_METADATA');only(a,b,medicationFields);return;
  case 'acquisition-unquantified':
   if(table!=='renovacoes'||a||!b||b.quantidade!==null||!validDay(b.data)||!validDay(b.data_aquisicao)||!['comprado','sus','gratuito'].includes(String(b.tipo_aquisicao))||b.preco!==null&&(typeof b.preco!=='number'||!Number.isFinite(b.preco)||b.preco<0))fail('ACQUISITION_UNKNOWN_QUANTITY');return;
  case 'prescription-create':
   if(table!=='renovacoes'||a||!b||!purePrescription(b)||!validDay(b.data))fail('PRESCRIPTION_CREATE');return;
  case 'prescription-edit':
   if(table!=='renovacoes'||!a||!b)fail('RX_EDIT');
   // Existing acquisitions keep their factual identity, quantity and date.
   // Historical site snapshots may be appended only by the A3 policy, not here.
   if(!purePrescription(a)||!purePrescription(b))only(a,b,['observacoes','anexo_url','document_id','updated_at']);
   else {only(a,b,rxFields);if(!validDay(b.data))fail('PRESCRIPTION_DATE');if(!samePrefix(a.a3_location_changes,b.a3_location_changes))fail('A3_HISTORY');}return;
  case 'prescription-delete':
   if(table!=='renovacoes'||!a||b||!purePrescription(a))fail('ACQUISITION_CORRECTION_REQUIRED');return;
  case 'withdrawal-plan':
   if(table!=='retiradas'||a&&!unresolvedWithdrawal(a)||b&&!unresolvedWithdrawal(b))fail('WITHDRAWAL_FACT');
   if(a&&b){const reassign=a.medicamento_id!==b.medicamento_id;if(reassign&&(a.status!=='agendada'||b.status!=='agendada'||!missing(a,['renovacao_origem_id','fornecimento_id','fornecimento_ciclo_id'])||!missing(b,['renovacao_origem_id','fornecimento_id','fornecimento_ciclo_id'])))fail('WITHDRAWAL_REASSIGN');only(a,b,reassign?[...withdrawalFields,'medicamento_id']:withdrawalFields);if(!samePrefix(a.reagendamentos,b.reagendamentos)||!samePrefix(a.a3_location_changes,b.a3_location_changes))fail('WITHDRAWAL_HISTORY');}return;
  case 'withdrawal-annotate':
   if(table!=='retiradas'||!a||!b||a.status!=='realizada'||b.status!=='realizada')fail('WITHDRAWAL_ANNOTATE');only(a,b,['observacoes','updated_at']);return;
  case 'withdrawal-link-receipt':{
   const r=change.receipt;
   if(table!=='retiradas'||!a||!b||!r||!['agendada','realizada'].includes(String(a.status))||a.renovacao_realizada_id!=null||b.status!=='realizada')fail('WITHDRAWAL_LINK');
   validateRow('renovacoes',r,uid);
   if(r.person_id!==a.person_id||r.medicamento_id!==a.medicamento_id||!validDay(r.data_aquisicao)||typeof r.quantidade!=='number'||!quantity(r.quantidade)||r.id!==b.renovacao_realizada_id||r.quantidade!==b.quantidade_retirada||!validInstant(b.realizada_em)||a.realizada_em!=null&&!same(a.realizada_em,b.realizada_em)||a.tipo==='sus'&&r.tipo_aquisicao!=='sus')fail('RECEIPT_SCOPE');
   // Server also requires receipt already persisted and not linked elsewhere.
   // No medication balance, acquisition mutation or new debit belongs here.
   only(a,b,['status','renovacao_realizada_id','quantidade_retirada','realizada_em','updated_at']);return;
  }
  default:return fail('KIND');
 }
}
export function parseMacro02MetadataIntent(raw:unknown):MetadataIntent{
 if(!plain(raw)||Object.keys(raw).sort().join(',')!=='account_id,changes,epoch,format,operation_id'||raw.format!=='macro02-metadata-r3'||!uuid(raw.account_id)||!uuid(raw.epoch)||!uuid(raw.operation_id)||!Array.isArray(raw.changes)||!raw.changes.length||raw.changes.length>512)return fail('INTENT');
 const uid=raw.account_id,seen=new Set<string>();
 for(const value of raw.changes){if(!plain(value)||!Object.keys(value).every(k=>['table','kind','before','after','receipt'].includes(k))||!Object.prototype.hasOwnProperty.call(value,'before')||!Object.prototype.hasOwnProperty.call(value,'after')||value.before!==null&&!plain(value.before)||value.after!==null&&!plain(value.after))return fail('CHANGE_SHAPE');
  const c=value as unknown as MetadataChange;validateMacro02MetadataChange(c,uid);const key=c.table+':'+(c.after??c.before)!.id;if(seen.has(key))return fail('DUPLICATE_ROW');seen.add(key);
 }
 return JSON.parse(cutoverCanonical(raw)) as MetadataIntent;
}
