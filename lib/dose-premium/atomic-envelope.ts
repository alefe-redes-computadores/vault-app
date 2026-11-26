import { verifyDoseSnapshotAck,sameClinicalInstant,type DoseSnapshot } from './compatibility';
import { readStockEvidence,type StockContext,type StockUnit } from './stock-evidence';
import { validDay, validInstant } from './center-view';
import { acquisitionFields, medicationAcquisitionFields, withdrawalReceiptFields } from './acquisition-wire';
import { captureStockCount, cycleIdentity, explicitStockUnit, stockFieldsChanged, type StockCountSnapshot } from './stock-cycle';
export type AtomicIntent={version:1;operationId:string;previous:DoseSnapshot|null;after:DoseSnapshot|null;stockBefore:StockContext;stockAfter:StockContext;stockRevisionBefore:string|null;stockRevisionAfter:string|null;stockReferenceAfter:string|null;delta:number;predecessor:string|null;sequence:number};
export type DoseAtomicAck={version:1;operationId:string;dose:DoseSnapshot|null;stock:StockContext;stockRevision:string|null;stockReference:string|null;deleted:boolean};
/** Count and acquisition use the same causal chain and ledger as dose writes. */
export type StockAtomicIntent={version:2;operationId:string;mode:'count'|'acquisition'|'adjustment';previous:null;after:null;stockBefore:StockContext;stockAfter:StockContext;stockRevisionBefore:string|null;stockRevisionAfter:string|null;stockReferenceAfter:string|null;predecessor:string|null;sequence:number;beforeCount:StockCountSnapshot;afterCount:StockCountSnapshot;acquisition:Record<string,unknown>|null;countedCurrentStock:number|null;initialStockQuantity:number|null;medicationPatch?:Record<string,unknown>;withdrawalId?:string|null;withdrawalBefore?:Record<string,unknown>|null;withdrawalAfter?:Record<string,unknown>|null};
export type MedicationAtomicIntent=AtomicIntent|StockAtomicIntent;
export type StockAtomicAck={version:2;operationId:string;stock:StockContext;stockRevision:string|null;stockReference:string|null;stockSnapshot:StockCountSnapshot;acquisition:Record<string,unknown>|null;medicationPatch?:Record<string,unknown>;withdrawal?:Record<string,unknown>|null};
export type AtomicAck=DoseAtomicAck|StockAtomicAck;
export type PendingItem={table:string;operation:string;chave:string;payload:Record<string,unknown>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const units=new Set<StockUnit>(['tablet','capsule','drop','ml','application','inhalation','unit','mg','mcg','g','iu','spray','patch','sachet']);
const isRecord=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const validRevision=(x:unknown)=>x===null||validInstant(x);
const validReference=(x:unknown)=>x===null||typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
const stockValid=(s:unknown):s is StockContext=>isRecord(s)&&['user_id','person_id','medicationId'].every(k=>typeof s[k]==='string'&&Boolean(s[k]))&&typeof s.basis==='string'&&(s.basis===''||uuid.test(s.basis))&&(s.unit===null||units.has(s.unit as StockUnit))&&(s.balance===null||typeof s.balance==='number'&&Number.isFinite(s.balance));
export const sameStock=(a:StockContext,b:StockContext)=>a.user_id===b.user_id&&a.person_id===b.person_id&&a.medicationId===b.medicationId&&a.basis===b.basis&&a.unit===b.unit&&Object.is(a.balance,b.balance);
function scopedDose(d:DoseSnapshot|null,s:StockContext){return d===null||d.user_id===s.user_id&&d.person_id===s.person_id&&d.medicamento_id===s.medicationId&&verifyDoseSnapshotAck(d,d);}
const sameIdentity=(a:DoseSnapshot,b:DoseSnapshot)=>a.id===b.id&&a.user_id===b.user_id&&a.person_id===b.person_id&&a.medicamento_id===b.medicamento_id&&a.data===b.data&&a.horario===b.horario;
/** Immutable queue intention; these are not remotely trusted receipts. */
export function parseAtomicIntent(value:unknown):AtomicIntent{
 if(!isRecord(value))throw Error('Intenção de dose inválida.');const v=value as unknown as AtomicIntent;
 if(v.version!==1||typeof v.operationId!=='string'||!uuid.test(v.operationId)||!Number.isSafeInteger(v.sequence)||v.sequence<1||(v.predecessor!==null&&(typeof v.predecessor!=='string'||!uuid.test(v.predecessor)||v.predecessor===v.operationId))||!stockValid(v.stockBefore)||!stockValid(v.stockAfter)||!Number.isFinite(v.delta)||!validRevision(v.stockRevisionBefore)||!validRevision(v.stockRevisionAfter)||!validReference(v.stockReferenceAfter))throw Error('Envelope de dose inconsistente.');
 const a=v.stockBefore,b=v.stockAfter;if(!sameStock({...a,balance:b.balance},b)||a.balance===null&&v.delta!==0||!Object.is(a.balance===null?null:a.balance-v.delta,b.balance))throw Error('Saldo acoplado divergente.');
 if(v.previous===null&&v.after===null||!scopedDose(v.previous,a)||!scopedDose(v.after,a)||v.previous&&v.after&&!sameIdentity(v.previous,v.after))throw Error('Dose fora da identidade do envelope.');
 if(v.delta!==0&&(!a.basis||a.unit===null))throw Error('Movimentação exige ciclo comprovado.');
 // A delta is never accepted merely because it matches the two balances.
 const prior=readStockEvidence(v.previous?.estoque_movimento),next=readStockEvidence(v.after?.estoque_movimento);
 if(v.delta!==0){
  const oldAmount=prior.state==='applied'?prior.receipt.amount:0,newAmount=next.state==='applied'?next.receipt.amount:0;
  for(const e of [prior,next])if(e.state==='applied'&&(e.receipt.basis!==a.basis||e.receipt.unit!==a.unit))throw Error('Recibo pertence a outro ciclo.');
  if(Math.abs((newAmount-oldAmount)-v.delta)>Number.EPSILON*Math.max(1,Math.abs(newAmount),Math.abs(oldAmount))*4)throw Error('Movimentação não corresponde aos recibos.');
 }
 return v;
}
const countKeys=['estoque_quantidade','estoque_unidade_medida','estoque_gotas_por_ml','estoque_ml_total','estoque_data_referencia','estoque_unidade_por_dose','estoque_ciclo_id','updated_at'] as const;
export function sameCount(a:StockCountSnapshot,b:StockCountSnapshot){const x=captureStockCount(a),y=captureStockCount(b);return countKeys.every(k=>k==='updated_at'?sameClinicalInstant(x[k],y[k]):Object.is(x[k],y[k]));}
function countMatches(count:unknown,stock:StockContext,revision:string|null){if(!isRecord(count)||!countKeys.every(k=>Object.prototype.hasOwnProperty.call(count,k)))return false;const r=count as StockCountSnapshot;return (r.estoque_quantidade??null)===stock.balance&&(cycleIdentity(r.estoque_ciclo_id)??'')===stock.basis&&explicitStockUnit(r.estoque_unidade_medida)===stock.unit&&sameClinicalInstant(r.updated_at??null,revision);}
export function parseStockAtomicIntent(value:unknown):StockAtomicIntent{
 if(!isRecord(value))throw Error('Intenção de estoque inválida.');const v=value as unknown as StockAtomicIntent;
 if(v.version!==2||!uuid.test(v.operationId)||!Number.isSafeInteger(v.sequence)||v.sequence<1||(v.predecessor!==null&&(!uuid.test(v.predecessor)||v.predecessor===v.operationId))||!stockValid(v.stockBefore)||!stockValid(v.stockAfter)||!validRevision(v.stockRevisionBefore)||!validInstant(v.stockRevisionAfter)||!validReference(v.stockReferenceAfter)||v.previous!==null||v.after!==null)throw Error('Envelope de estoque inconsistente.');
 const a=v.stockBefore,b=v.stockAfter;if(a.user_id!==b.user_id||a.person_id!==b.person_id||a.medicationId!==b.medicationId||(v.mode!=='adjustment'&&a.unit!==b.unit)||!countMatches(v.beforeCount,a,v.stockRevisionBefore)||!countMatches(v.afterCount,b,v.stockRevisionAfter)||v.afterCount.estoque_data_referencia!==v.stockReferenceAfter||(v.mode!=='adjustment'&&!validDay(v.stockReferenceAfter??''))||(v.stockReferenceAfter!==null&&!validDay(v.stockReferenceAfter))||(b.balance!==null&&b.balance<0))throw Error('Contagem fora do escopo ou saldo inválido.');
 if(v.mode!=='adjustment')for(const k of ['estoque_unidade_medida','estoque_gotas_por_ml','estoque_ml_total','estoque_unidade_por_dose'] as const)if(v.beforeCount[k]!==v.afterCount[k])throw Error('Contagem não pode alterar unidade ou conversão.');
 const fresh=()=>b.unit!==null?!!b.basis&&b.basis!==a.basis:b.basis==='';
 const amount=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 if(v.mode==='count'){if(v.medicationPatch&&Object.keys(v.medicationPatch).length||v.withdrawalId!=null||v.withdrawalBefore!=null||v.withdrawalAfter!=null||v.acquisition!==null||!amount(v.countedCurrentStock)||v.countedCurrentStock!==b.balance||v.initialStockQuantity!==null||!fresh())throw Error('Nova contagem sem ciclo explícito.');}
 else if(v.mode==='adjustment'){
  if(v.acquisition!==null||v.countedCurrentStock!==null||v.initialStockQuantity!==null||v.withdrawalId!=null||v.withdrawalBefore!=null||v.withdrawalAfter!=null||v.medicationPatch&&Object.keys(v.medicationPatch).length||b.basis!==''||!stockFieldsChanged(v.beforeCount,v.afterCount))throw Error('Ajuste exige invalidação do ciclo e mudança comprovada, sem simular contagem.');
  for(const k of ['estoque_gotas_por_ml','estoque_ml_total','estoque_unidade_por_dose'] as const){const x=v.afterCount[k];if(x!=null&&(!amount(x)||x===0))throw Error('Conversão de estoque inválida.');}
 }
 else if(v.mode==='acquisition'){
  const r=v.acquisition;if(!isRecord(v.medicationPatch)||Object.keys(v.medicationPatch).some(k=>!(medicationAcquisitionFields as readonly string[]).includes(k))||v.withdrawalId!=null&&!uuid.test(v.withdrawalId)||!isRecord(r)||!acquisitionFields.every(k=>Object.prototype.hasOwnProperty.call(r,k))||Object.keys(r).length!==acquisitionFields.length||typeof r.id!=='string'||!r.id||r.user_id!==a.user_id||r.person_id!==a.person_id||r.medicamento_id!==a.medicationId||!amount(r.quantidade)||r.quantidade<=0||typeof r.data_aquisicao!=='string'||!validDay(r.data_aquisicao))throw Error('Aquisição sem fato e escopo comprovados.');
  if(v.withdrawalId!=null){const w=v.withdrawalBefore,z=v.withdrawalAfter;const scoped=(q:unknown)=>isRecord(q)&&withdrawalReceiptFields.every(k=>Object.prototype.hasOwnProperty.call(q,k))&&Object.keys(q).length===withdrawalReceiptFields.length&&q.id===v.withdrawalId&&q.user_id===a.user_id&&q.person_id===a.person_id&&q.medicamento_id===a.medicationId;if(!w||!z||!scoped(w)||!scoped(z)||!['agendada','realizada'].includes(String(w.status))||w.renovacao_realizada_id!=null||z.status!=='realizada'||z.renovacao_realizada_id!==r.id||z.quantidade_retirada!==r.quantidade||!validInstant(z.realizada_em)||!sameClinicalInstant(z.updated_at,v.stockRevisionAfter))throw Error('Retirada sem confirmação causal.');}else if(v.withdrawalBefore!=null||v.withdrawalAfter!=null)throw Error('Retirada fora do envelope.');
  if(v.countedCurrentStock!==null){if(!amount(v.countedCurrentStock)||v.initialStockQuantity!==null||b.balance!==v.countedCurrentStock||!fresh())throw Error('Contagem na aquisição inconsistente.');}
  else if(a.balance===null){if(v.initialStockQuantity===null){if(b.balance!==null||b.basis!=='')throw Error('Aquisição sem saldo não pode inventar contagem.');}else if(!amount(v.initialStockQuantity)||b.balance!==v.initialStockQuantity+r.quantidade||!fresh())throw Error('Saldo inicial não comprovado.');}
  else if(v.initialStockQuantity!==null||b.balance!==a.balance+r.quantidade||b.basis!==a.basis)throw Error('Aquisição aditiva alterou o ciclo ou o saldo indevidamente.');
 }else throw Error('Operação de estoque não suportada.');return v;
}
export function parseMedicationIntent(value:unknown):MedicationAtomicIntent{return isRecord(value)&&value.version===2?parseStockAtomicIntent(value):parseAtomicIntent(value);}
export const atomicQueueKey=(v:MedicationAtomicIntent)=>v.version===1?`doseLogs:${(v.after??v.previous)!.id}:macro02:${v.operationId}`:`${v.mode==='acquisition'?'renovacoes':'medicamentos'}:${v.mode==='acquisition'?v.acquisition!.id:v.stockBefore.medicationId}:macro02:${v.operationId}`;
export function intentFromQueue(item:PendingItem):MedicationAtomicIntent|null {
 if(item.payload.macro02_atomic===undefined)return null;
 const intent=parseMedicationIntent(item.payload.macro02_atomic),s=intent.stockBefore;
 const entity=intent.version===1?(intent.after??intent.previous)!:intent.mode==='acquisition'?intent.acquisition!:{id:s.medicationId,user_id:s.user_id,person_id:s.person_id};
 const table=intent.version===1?'doseLogs':intent.mode==='acquisition'?'renovacoes':'medicamentos';
 if(item.table!==table||item.operation!=='update'||item.chave!==atomicQueueKey(intent)||item.payload.id!==entity.id||item.payload.user_id!==s.user_id||item.payload.person_id!==s.person_id||(table!=='medicamentos'&&item.payload.medicamento_id!==s.medicationId))throw Error('Identidade da intenção divergente.');
 return intent;
}
export function medicationPending(rows:readonly PendingItem[],scope:{user_id:string;person_id:string;medicationId:string}):MedicationAtomicIntent[]{
 const intents:MedicationAtomicIntent[]=[];
 for(const row of rows){if(row.payload.macro02_atomic===undefined||row.payload.user_id!==scope.user_id||row.payload.person_id!==scope.person_id||(row.table==='medicamentos'?row.payload.id:row.payload.medicamento_id)!==scope.medicationId)continue;intents.push(intentFromQueue(row)!);}
 intents.sort((a,b)=>a.sequence-b.sequence);
 for(let i=1;i<intents.length;i++)if(intents[i].sequence!==intents[i-1].sequence+1||intents[i].predecessor!==intents[i-1].operationId||!sameStock(intents[i].stockBefore,intents[i-1].stockAfter)||!sameClinicalInstant(intents[i].stockRevisionBefore,intents[i-1].stockRevisionAfter))throw Error('Fila de estoque perdeu continuidade; preserve as intenções.');
 return intents;
}
export function nextAtomicPosition(rows:readonly PendingItem[],stock:StockContext,revision:string|null){
 const intents=medicationPending(rows,stock),last=intents.at(-1);
 if(last&&(!sameStock(last.stockAfter,stock)||!sameClinicalInstant(last.stockRevisionAfter,revision)))throw Error('Saldo mudou durante uma intenção pendente. Revise antes de continuar.');
 return {sequence:last?last.sequence+1:1,predecessor:last?.operationId??null};
}
export function assertAtomicAck(intent:MedicationAtomicIntent,received:unknown):AtomicAck{
 if(!isRecord(received))throw Error('Resposta atômica ausente.');
 if(intent.version===2){const r=received as unknown as StockAtomicAck;if(r.version!==2||r.operationId!==intent.operationId||!stockValid(r.stock)||!sameStock(r.stock,intent.stockAfter)||!sameClinicalInstant(r.stockRevision,intent.stockRevisionAfter)||r.stockReference!==intent.stockReferenceAfter||!countMatches(r.stockSnapshot,r.stock,r.stockRevision)||!sameCount(r.stockSnapshot,intent.afterCount)||!sameAcquisition(intent.acquisition,r.acquisition)||!sameAcquisition(intent.medicationPatch??{},r.medicationPatch??{})||!sameAcquisition(intent.withdrawalAfter??null,r.withdrawal??null))throw Error('Estoque e aquisição não confirmados integralmente pela nuvem.');return r;}
 const r=received as unknown as DoseAtomicAck;
 if(r.version!==1||r.operationId!==intent.operationId||r.deleted!==(intent.after===null)||!stockValid(r.stock)||!sameStock(r.stock,intent.stockAfter)||!sameClinicalInstant(r.stockRevision,intent.stockRevisionAfter)||r.stockReference!==intent.stockReferenceAfter||(intent.after===null?r.dose!==null:!r.dose||!verifyDoseSnapshotAck(intent.after,r.dose)))throw Error('Dose e estoque não confirmados integralmente pela nuvem.');
 return r;
}

/** Compare the wire projection, allowing only PostgreSQL timestamp serialization differences. */
export function sameAcquisition(expected:Record<string,unknown>|null,actual:unknown):boolean{
 if(expected===null)return actual===null;if(!isRecord(actual))return false;
 const equal=(a:unknown,b:unknown):boolean=>{if(a==null||b==null)return a==null&&b==null;if(Array.isArray(a))return Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>equal(x,b[i]));if(isRecord(a))return isRecord(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>equal(a[k],b[k]));return Object.is(a,b);};
 return Object.entries(expected).every(([k,v])=>k==='created_at'||k==='updated_at'||k==='realizada_em'?sameClinicalInstant(v,actual[k]):equal(v,actual[k]));
}
