import {readDoseUnit,type DoseUnitFields,type DoseUnitCode} from './historical-unit';
import {validInstant,type Scope} from './center-view';
/** Data contract proposed for the existing transactional DoseLog writer. Never a stock writer. */
export type StockUnit=Exclude<DoseUnitCode,'custom'>;
export type StockContext=Scope&{medicationId:string;unit:StockUnit|null;basis:string;balance:number|null};
export type StockReceipt=Scope&{medicationId:string;doseId:string;basis:string;unit:StockUnit;amount:number;appliedAt:string};
export type StockEvidence={state:'unknown'}|{state:'not_applied';reason:'historical_review'|'unknown_quantity'|'unknown_unit'|'unknown_balance'|'incompatible_unit'|'unavailable_basis'|'explicit_no_adjustment'}|{state:'applied';receipt:StockReceipt};
export type DoseIdentity=Scope&{medicationId:string;doseId:string};
export type Conversion={kind:'drops_per_ml';factor:number;source:'documented'|'declared';medicationId:string;basis:string};
export type Decision={kind:'ready';delta:number;next:StockEvidence;message:string}|{kind:'blocked';reason:string};
const units=new Set<StockUnit>(['tablet','capsule','drop','ml','application','inhalation','unit','mg','mcg','g','iu','spray','patch','sachet']);
const positive=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const nonempty=(s:unknown):s is string=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=200;
const sameScope=(a:Scope,b:Scope)=>a.user_id===b.user_id&&a.person_id===b.person_id;
const validIdentity=(x:DoseIdentity)=>[x.user_id,x.person_id,x.medicationId,x.doseId].every(nonempty);
const sameIdentity=(a:DoseIdentity,b:DoseIdentity)=>sameScope(a,b)&&a.medicationId===b.medicationId&&a.doseId===b.doseId;
const blocked=(reason:string):Decision=>({kind:'blocked',reason});
const noMovement=(reason:Extract<StockEvidence,{state:'not_applied'}>['reason']):Decision=>({kind:'ready',delta:0,next:{state:'not_applied',reason},message:'Registro sem movimentação de estoque.'});
export function readStockEvidence(value:unknown):StockEvidence {
  if(value==null)return {state:'unknown'};
  if(typeof value!=='object'||Array.isArray(value))throw Error('Evidência de estoque inválida.');
  const e=value as StockEvidence;
  if(e.state==='unknown'&&Object.keys(e).length===1)return e;
  if(e.state==='not_applied'&&Object.keys(e).length===2&&['historical_review','unknown_quantity','unknown_unit','unknown_balance','incompatible_unit','unavailable_basis','explicit_no_adjustment'].includes(e.reason))return e;
  if(e.state==='applied'&&Object.keys(e).length===2){const r=e.receipt;
    if(r&&Object.keys(r).length===8&&validIdentity(r)&&nonempty(r.basis)&&units.has(r.unit)&&positive(r.amount)&&validInstant(r.appliedAt))return e;
  }
  throw Error('Evidência de estoque inválida.');
}
/** Only explicitly comparable units. No package/form/concentration heuristics. */
export function comparableDebit(quantity:unknown,fields:Partial<DoseUnitFields>,stock:StockContext,conversion?:Conversion):number|null {
  const u=readDoseUnit(fields);if(!positive(quantity)||u.state!=='known'||stock.unit===null||!units.has(stock.unit))return null;
  const code=u.fields.unidade_dose;
  if(code===stock.unit)return quantity;
  if(code==='drop'&&stock.unit==='ml'&&conversion?.kind==='drops_per_ml'&&conversion.medicationId===stock.medicationId&&conversion.basis===stock.basis&&['declared','documented'].includes(conversion.source)&&positive(conversion.factor)){
    const n=quantity/conversion.factor;return positive(n)?n:null;
  }
  return null;
}
/** Basis is the canonical stock lifecycle identity, NOT updated_at or today's date. A reset/reconciliation must invalidate it. */
export function planStockChange(input:{identity:DoseIdentity;stock:StockContext;previous:unknown;wasTaken:boolean;willBeTaken:boolean;quantity?:number|null;unit:Partial<DoseUnitFields>;conversion?:Conversion;adjustStock:boolean;historicalReview?:boolean;requireRegisteredStock?:boolean;asOf:string;factUnchanged?:boolean}):Decision {
  const {identity,stock,wasTaken,willBeTaken,asOf}=input;
  if(!validIdentity(identity)||!sameScope(identity,stock)||identity.medicationId!==stock.medicationId||!validInstant(asOf))return blocked('Escopo ou instante inválido.');
  let prior:StockEvidence;try{prior=readStockEvidence(input.previous)}catch{return blocked('Evidência de estoque inconsistente.');}
  if(prior.state==='applied'&&(!wasTaken||!sameIdentity(prior.receipt,identity)||Date.parse(prior.receipt.appliedAt)>Date.parse(asOf)))return blocked('Recibo de movimentação não corresponde à tomada.');
  if(input.factUnchanged&&wasTaken&&willBeTaken){return {kind:'ready',delta:0,next:prior,message:'Movimentação anterior preservada.'};}
  // Historical corrections never silently debit or restore inventory. If a real debit existed, require explicit reconciliation before clearing the event.
  if(!input.adjustStock||input.historicalReview){
    if(wasTaken&&prior.state==='applied')return blocked('Tomada possui movimentação registrada; revise a relação com o estoque antes da retificação.');
    if(wasTaken&&prior.state==='unknown')return {kind:'ready',delta:0,next:prior,message:'Revisão histórica sem alterar estoque; movimentação anterior desconhecida.'};
    return noMovement(input.historicalReview?'historical_review':'explicit_no_adjustment');
  }
  if(wasTaken&&prior.state==='unknown')return blocked('Movimentação antiga desconhecida; não é seguro restituir ou recalcular o saldo.');
  if(!wasTaken&&!willBeTaken)return noMovement('explicit_no_adjustment');
  const stockUnit=stock.unit;
  const currentBasis=nonempty(stock.basis)&&stockUnit!==null&&units.has(stockUnit);
  if(prior.state==='applied'&&(!currentBasis||prior.receipt.basis!==stock.basis||prior.receipt.unit!==stock.unit))return blocked('O estoque foi alterado ou sua unidade mudou; conciliação explícita necessária.');
  const old=prior.state==='applied'?prior.receipt.amount:0;
  // A historical/no-movement confirmation cannot be turned into an inventory debit by editing its note/quantity.
  if(wasTaken&&willBeTaken&&prior.state==='not_applied')return {kind:'ready',delta:0,next:prior,message:'Revisão preserva a ausência de movimentação original.'};
  if(!willBeTaken){
    if(!old)return noMovement('explicit_no_adjustment');
    if(typeof stock.balance!=='number'||!Number.isFinite(stock.balance)||!Number.isFinite(stock.balance+old))return blocked('Saldo atual não confirmado.');
    return {kind:'ready',delta:-old,next:{state:'not_applied',reason:'explicit_no_adjustment'},message:'Restituição baseada exclusivamente no recibo original.'};
  }
  const reason=!positive(input.quantity)?'unknown_quantity':readDoseUnit(input.unit).state!=='known'?'unknown_unit':!currentBasis?'unavailable_basis':typeof stock.balance!=='number'||!Number.isFinite(stock.balance)?'unknown_balance':null;
  const amount=reason?null:comparableDebit(input.quantity,input.unit,stock,input.conversion);
  if(amount===null){if(old||input.requireRegisteredStock)return blocked('Movimentação não comparável; revisão individual necessária.');return noMovement(reason??'incompatible_unit');}
  const balance=stock.balance!;const delta=amount-old;
  if(stockUnit===null||!Number.isFinite(delta)||!Number.isFinite(balance-delta))return blocked('Movimentação numérica inválida.');
  if(input.requireRegisteredStock&&delta>0&&balance<delta)return blocked('Estoque registrado insuficiente.');
  return {kind:'ready',delta,next:{state:'applied',receipt:{...identity,basis:stock.basis,unit:stockUnit,amount,appliedAt:asOf}},message:'Movimentação planejada; somente o escritor canônico pode confirmá-la.'};
}
