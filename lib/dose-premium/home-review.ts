import {resolveWritableSlot,type ScheduledSlotScope} from './slot-write-guard';
import {verifyDoseSnapshotAck,type DoseSnapshot} from './compatibility';
import {readDoseUnit,declareDoseUnit,unknownDoseUnit,type DoseUnitCode,type DoseUnitFields} from './historical-unit';
import {validDay,validHour} from './center-view';

type ReviewRow=Omit<DoseSnapshot,'id'|'person_id'>&{id?:string;person_id?:string};
export type HomeDoseReview={scope:ScheduledSlotScope;expected:DoseSnapshot|null;blocked:string|null;suggestedQuantity:number|null};
export type HomeDoseDraft={quantity:string;code:DoseUnitCode|null;customLabel:string;unitReviewed:boolean;noStock:boolean};
export type HomeDoseConfirmation={quantity:number;unit:DoseUnitFields;adjustStock:boolean};
const positive=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>0;
/** Collapse only repeated snapshots of the SAME record from overlapping live queries.
 * Distinct rows in a scheduled slot are always reviewed by the existing write guard. */
export function captureHomeDoseReview(scope:ScheduledSlotScope,rows:readonly ReviewRow[],plannedQuantity:unknown):HomeDoseReview{
 const fallback=positive(plannedQuantity)?plannedQuantity:null;
 try {
  if(!scope.user_id||!scope.person_id||!scope.medicamento_id||!validDay(scope.data)||!validHour(scope.horario))throw Error('Contexto da dose indisponível.');
  const candidates=rows.filter(r=>r.user_id===scope.user_id&&r.person_id===scope.person_id&&r.medicamento_id===scope.medicamento_id&&r.data===scope.data&&typeof r.horario==='string'&&r.horario.slice(0,5)===scope.horario&&r.dose_kind!=='sos'&&r.dose_kind!=='extra');
  const unique=new Map<string,DoseSnapshot>();
  for(const row of candidates){if(!row.id||!row.person_id)throw Error('Registro sem identidade verificável.');const snapshot:DoseSnapshot={...row,id:row.id,person_id:row.person_id};const prior=unique.get(row.id);if(prior&&!verifyDoseSnapshotAck(prior,snapshot))throw Error('Dados da dose mudaram durante a leitura. Atualize as pendências.');unique.set(row.id,snapshot);}
  const expected=resolveWritableSlot([...unique.values()],scope)??null;
  if(expected&&!validHour(expected.horario))throw Error('Horário histórico requer revisão individual.');
  if(expected&&(expected.tomado_em||expected.ignorado_em))throw Error('Esta dose já foi revisada.');
  if(expected&&readDoseUnit(expected).state==='invalid')throw Error('Unidade histórica inconsistente. Revise no histórico.');
  return {scope,expected,blocked:null,suggestedQuantity:expected?(positive(expected.quantidade)?expected.quantidade:null):fallback};
 }catch(e){return {scope,expected:null,blocked:e instanceof Error?e.message:'Dose indisponível para revisão.',suggestedQuantity:null};}
}
export function homeReviewKey(review:HomeDoseReview):string{
 const r=review.expected;
 return JSON.stringify([review.scope,r&&[r.id,r.user_id,r.person_id,r.medicamento_id,r.data,r.horario,r.quantidade??null,r.tomado_em??null,r.ignorado_em??null,r.dose_kind??null,r.motivo??null,r.unidade_dose??null,r.unidade_dose_rotulo??null,r.fonte_unidade??null,r.estoque_movimento??null,r.created_at??null,r.updated_at??null],review.blocked,review.suggestedQuantity]);
}
/** Index once for the bounded Home backlog; never scan the complete history per card. */
export function indexHomeReviewRows(rows:readonly ReviewRow[]):Map<string,ReviewRow[]>{
 const groups=new Map<string,ReviewRow[]>();for(const row of rows){if(typeof row.horario!=='string')continue;const key=JSON.stringify([row.user_id,row.person_id,row.medicamento_id,row.data,row.horario.slice(0,5)]);const group=groups.get(key)??[];group.push(row);groups.set(key,group);}return groups;
}
export function rowsForHomeReview(index:ReadonlyMap<string,readonly ReviewRow[]>,scope:ScheduledSlotScope):readonly ReviewRow[]{return index.get(JSON.stringify([scope.user_id,scope.person_id,scope.medicamento_id,scope.data,scope.horario]))??[];}
export function initialHomeDoseDraft(review:HomeDoseReview):HomeDoseDraft{
 const unit=readDoseUnit(review.expected??{});return {quantity:'',code:unit.fields.unidade_dose,customLabel:unit.fields.unidade_dose_rotulo??'',unitReviewed:unit.state==='known',noStock:false};
}
export function prepareHomeDoseConfirmation(review:HomeDoseReview,draft:HomeDoseDraft,older:boolean,bulk:boolean):HomeDoseConfirmation{
 if(review.blocked)throw Error(review.blocked);
 // Explicit quantity; a planned amount is displayed only as a suggestion.
 const value=draft.quantity.trim();if(!/^\d+(?:[.,]\d+)?$/.test(value))throw Error('Informe a quantidade efetivamente administrada.');
 const quantity=Number(value.replace(',','.'));if(!positive(quantity))throw Error('Quantidade inválida.');
 const previous=readDoseUnit(review.expected??{});
 if(previous.state==='invalid')throw Error('Unidade histórica inconsistente.');
 if(previous.state!=='known'&&!draft.unitReviewed)throw Error('Confira a unidade administrada.');
 const unit=previous.state==='known'?previous.fields:draft.code===null?unknownDoseUnit():declareDoseUnit(draft.code,'declared',draft.code==='custom'?draft.customLabel:undefined);
 const adjustStock=!older&&!draft.noStock;
 if(bulk&&draft.noStock)throw Error('Revise individualmente uma tomada sem movimentação de estoque.');
 if(readDoseUnit(unit).state!=='known'&&(bulk||adjustStock))throw Error('Sem unidade confirmada, registre somente o histórico individual.');
 return {quantity,unit,adjustStock};
}
export function assertHomeReviewScope(review:HomeDoseReview,current:{user_id:string;person_id:string},slot:{medicamentoId:string;data:string;horario:string}):void{
 const s=review.scope;if(review.blocked)throw Error(review.blocked);
 if(!current.user_id||!current.person_id||s.user_id!==current.user_id||s.person_id!==current.person_id||s.medicamento_id!==slot.medicamentoId||s.data!==slot.data||s.horario!==slot.horario)throw Error('Pessoa ou dose mudou. Abra uma nova revisão.');
}
