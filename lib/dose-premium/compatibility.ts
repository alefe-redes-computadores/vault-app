import {readPharmaceuticalSnapshot,samePharmaceuticalSnapshot,type PharmaceuticalSnapshot} from './pharmaceutical-snapshot';
import {readDoseUnit,preserveUnitForOrdinaryWrite,type DoseUnitFields} from './historical-unit';
import {readStockEvidence,type StockEvidence} from './stock-evidence';
import {validDay,validHour,validInstant} from './center-view';
/** Proposed transport guard. No new table, network call, sync queue, or writer. */
export type DoseSnapshot=Partial<DoseUnitFields>&{id:string;user_id:string;person_id:string;medicamento_id:string;data:string;horario:string;quantidade?:number|null;tomado_em?:string|null;ignorado_em?:string|null;dose_kind?:'scheduled'|'sos'|'extra'|'planned'|null;motivo?:string|null;estoque_movimento?:StockEvidence|null;farmaco_snapshot?:PharmaceuticalSnapshot|null;created_at?:string|null;updated_at?:string|null};
const ids=['id','user_id','person_id','medicamento_id','data','horario'] as const;
const facts=['quantidade','tomado_em','ignorado_em','dose_kind'] as const;
/** PostgreSQL timestamptz serialization is not a different clinical instant. */
export function sameClinicalInstant(a:unknown,b:unknown):boolean {
  if(a==null||b==null)return a==null&&b==null;
  if(!validInstant(a)||!validInstant(b))return false;
  const micro=(v:string)=>{const fraction=/\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/.exec(v)?.[1]??'';return fraction.padEnd(6,'0').slice(3);};
  return Date.parse(a)===Date.parse(b)&&micro(a)===micro(b);
}
const sameFact=(k:typeof facts[number],a:unknown,b:unknown)=>k==='tomado_em'||k==='ignorado_em'?sameClinicalInstant(a,b):nullable(a)===nullable(b);
const unitKeys=['unidade_dose','unidade_dose_rotulo','fonte_unidade'] as const;
const own=(x:object,k:string)=>Object.prototype.hasOwnProperty.call(x,k);
const nullable=(v:unknown)=>v==null?null:v;
const validQuantity=(v:unknown)=>v==null||(typeof v==='number'&&Number.isFinite(v)&&v>0);
function validate(row:DoseSnapshot){
  if(ids.some(k=>typeof row[k]!=='string'||!row[k].trim())||!validDay(row.data)||!validHour(row.horario)||!validQuantity(row.quantidade))throw Error('Identidade ou quantidade inválida.');
  if(row.tomado_em!=null&&!validInstant(row.tomado_em)||row.ignorado_em!=null&&!validInstant(row.ignorado_em)||row.tomado_em&&row.ignorado_em)throw Error('Evidência temporal inválida.');
  readPharmaceuticalSnapshot(row.farmaco_snapshot,row);
  if(row.dose_kind!=null&&!['scheduled','sos','extra','planned'].includes(row.dose_kind))throw Error('Origem inválida.');
}
function checkReceipt(row:DoseSnapshot,e:StockEvidence){if(e.state==='applied'){const r=e.receipt;if(!row.tomado_em||r.user_id!==row.user_id||r.person_id!==row.person_id||r.medicationId!==row.medicamento_id||r.doseId!==row.id)throw Error('Recibo incompatível com o evento.');}}
/** Old APK sends explicit old fields. If protected facts differ, fail closed; no silent erasure or stock recalculation. */
export function mergeLegacyDoseUpdate(previous:DoseSnapshot,patch:Partial<DoseSnapshot>):DoseSnapshot {
  validate(previous);if(ids.some(k=>own(patch,k)&&patch[k]!==previous[k]))throw Error('Identidade histórica não pode ser substituída.');
  const priorUnit=readDoseUnit(previous);if(priorUnit.state==='invalid')throw Error('Unidade histórica inconsistente.');
  const stock=readStockEvidence(previous.estoque_movimento);checkReceipt(previous,stock);
  const protectedFact=priorUnit.state==='known'||stock.state!=='unknown'||previous.farmaco_snapshot!=null;
  if(own(patch,'farmaco_snapshot')&&!samePharmaceuticalSnapshot(previous.farmaco_snapshot,patch.farmaco_snapshot,previous))throw Error('Snapshot farmacêutico exige escritor compatível.');
  if(protectedFact&&facts.some(k=>own(patch,k)&&!sameFact(k,patch[k],previous[k])))throw Error('Cliente legado não pode alterar fato protegido; atualize o aplicativo.');
  // Never accept an unverified receipt from a legacy payload, even if it resembles the old one.
  if(own(patch,'estoque_movimento')&&patch.estoque_movimento!=null)throw Error('Recibo exige escritor compatível.');
  const fields=preserveUnitForOrdinaryWrite(previous,patch);
  if(unitKeys.some(k=>fields[k]!==priorUnit.fields[k]))throw Error('Unidade exige escritor compatível.');
  const merged={...previous,...patch,...priorUnit.fields,estoque_movimento:previous.estoque_movimento??null};validate(merged);return merged;
}
/** Only a server response of the requested clinical payload confirms new-field delivery. */
export function verifyDoseSnapshotAck(expected:DoseSnapshot,received:DoseSnapshot):boolean{
  try{validate(expected);validate(received);if((expected.created_at!=null&&!sameClinicalInstant(expected.created_at,received.created_at))||(expected.updated_at!=null&&!sameClinicalInstant(expected.updated_at,received.updated_at))||ids.some(k=>expected[k]!==received[k])||facts.some(k=>!sameFact(k,expected[k],received[k]))||nullable(expected.motivo)!==nullable(received.motivo)||!samePharmaceuticalSnapshot(expected.farmaco_snapshot,received.farmaco_snapshot,expected))return false;
    const a=readDoseUnit(expected),b=readDoseUnit(received);if(a.state==='invalid'||b.state==='invalid'||a.state!==b.state||unitKeys.some(k=>a.fields[k]!==b.fields[k]))return false;
    const x=readStockEvidence(expected.estoque_movimento),y=readStockEvidence(received.estoque_movimento);checkReceipt(expected,x);checkReceipt(received,y);if(x.state!==y.state)return false;
    if(x.state==='applied'&&y.state==='applied'){const l=x.receipt,r=y.receipt;return l.user_id===r.user_id&&l.person_id===r.person_id&&l.medicationId===r.medicationId&&l.doseId===r.doseId&&l.basis===r.basis&&l.unit===r.unit&&l.amount===r.amount&&sameClinicalInstant(l.appliedAt,r.appliedAt);}
    return x.state==='not_applied'&&y.state==='not_applied'?x.reason===y.reason:true;
  }catch{return false;}
}
