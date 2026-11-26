/** DoseLog snapshot: administered quantity, never presentation, concentration or stock conversion. */
export const DOSE_UNITS = {
  tablet: ['comprimido', 'comprimidos'], capsule: ['cápsula', 'cápsulas'],
  drop: ['gota', 'gotas'], ml: ['mL', 'mL'], application: ['aplicação', 'aplicações'],
  inhalation: ['inalação', 'inalações'], unit: ['unidade', 'unidades'],
  mg: ['mg', 'mg'], mcg: ['mcg', 'mcg'], g: ['g', 'g'], iu: ['UI', 'UI'],
  spray: ['jato', 'jatos'], patch: ['adesivo', 'adesivos'], sachet: ['sachê', 'sachês'],
} as const;
export type DoseUnitCode = keyof typeof DOSE_UNITS | 'custom';
export type DoseUnitSource = 'declared' | 'documented';
export type DoseUnitFields = { unidade_dose: DoseUnitCode | null; unidade_dose_rotulo: string | null; fonte_unidade: DoseUnitSource | null };
export const unknownDoseUnit = (): DoseUnitFields => ({ unidade_dose:null, unidade_dose_rotulo:null, fonte_unidade:null });
export function declareDoseUnit(code: DoseUnitCode, source: DoseUnitSource, label?: string): DoseUnitFields {
  if (source !== 'declared' && source !== 'documented') throw Error('Origem da unidade não confirmada.');
  if (code === 'custom') {
    const name = label?.trim();
    if (!name || [...name].length > 50 || /[\u0000-\u001f\u007f-\u009f]/u.test(name)) throw Error('Informe uma unidade válida.');
    return { unidade_dose:code, unidade_dose_rotulo:name, fonte_unidade:source };
  }
  if (!Object.prototype.hasOwnProperty.call(DOSE_UNITS,code) || label != null) throw Error('Unidade inválida.');
  return { unidade_dose:code, unidade_dose_rotulo:null, fonte_unidade:source };
}
export type UnitRead = { state:'known'|'unknown'|'invalid'; fields:DoseUnitFields };
export function readDoseUnit(row: Partial<DoseUnitFields>): UnitRead {
  const {unidade_dose:code, unidade_dose_rotulo:label, fonte_unidade:source}=row;
  if (code == null && label == null && source == null) return {state:'unknown',fields:unknownDoseUnit()};
  try {
    if (code == null || source == null || (code !== 'custom' && label != null) || (code === 'custom' && label !== label?.trim())) throw Error('Snapshot incompleto.');
    return {state:'known',fields:declareDoseUnit(code,source,label ?? undefined)};
  } catch { return {state:'invalid',fields:unknownDoseUnit()}; }
}
export function describeHistoricalDose(row: Partial<DoseUnitFields> & {quantidade?:number|null}):string {
  const n=row.quantidade, unit=readDoseUnit(row);
  if(typeof n!=='number'||!Number.isFinite(n)||n<=0)return 'Quantidade não informada';
  const q=n.toLocaleString('pt-BR',{maximumSignificantDigits:21});
  if(unit.state==='invalid')return `Quantidade registrada: ${q} · unidade requer revisão`;
  if(unit.state==='unknown')return `Quantidade registrada: ${q} · unidade não informada`;
  const f=unit.fields, code=f.unidade_dose!;
  return `${q} ${code==='custom'?f.unidade_dose_rotulo:DOSE_UNITS[code][n===1?0:1]}`;
}
const unitKeys=['unidade_dose','unidade_dose_rotulo','fonte_unidade'] as const;
const same=(a:DoseUnitFields,b:DoseUnitFields)=>unitKeys.every(k=>a[k]===b[k]);
/** Review policy only. Ordinary writes preserve known snapshots; no silent correction of facts. */
export function preserveUnitForOrdinaryWrite(previous:Partial<DoseUnitFields>, patch:Partial<DoseUnitFields>):DoseUnitFields {
  const old=readDoseUnit(previous), supplied=unitKeys.filter(k=>Object.prototype.hasOwnProperty.call(patch,k));
  if(old.state==='invalid')throw Error('Unidade histórica inconsistente; revisão necessária.');
  if(!supplied.length)return old.fields;
  if(supplied.length!==3)throw Error('Snapshot parcial de unidade.');
  const next=readDoseUnit(patch);
  if(next.state==='invalid')throw Error('Snapshot inválido.');
  if(next.state==='unknown')return old.fields; // legacy nulls must not erase existing evidence
  if(old.state==='known'&&!same(old.fields,next.fields))throw Error('Retificação explícita necessária.');
  return next.fields;
}
/** Only prepares a reviewed change, never persists or adjusts stock. Canonical writer/audit handoff required. */
export function prepareUnitCorrection(previous:Partial<DoseUnitFields>, next:DoseUnitFields, reason:string) {
  if(!reason.trim()||reason.trim().length>500)throw Error('Informe o motivo da retificação.');
  if(!unitKeys.every(k=>Object.prototype.hasOwnProperty.call(next,k)))throw Error('Snapshot completo obrigatório.');
  const reviewed=readDoseUnit(next);if(reviewed.state==='invalid')throw Error('Unidade inválida.');
  return {previous:{...previous},next:reviewed.fields,reason:reason.trim()};
}

/** Label for consumers that need quantity and unit separately. No inferred unit. */
export function historicalDoseUnitLabel(row:Partial<DoseUnitFields>&{quantidade?:number|null}):string {
 const unit=readDoseUnit(row);if(unit.state!=='known')return unit.state==='invalid'?'· unidade requer revisão':'· unidade não informada';
 const f=unit.fields,code=f.unidade_dose!;return code==='custom'?f.unidade_dose_rotulo!:DOSE_UNITS[code][row.quantidade===1?0:1];
}

export type HistoricalQuantityRow=Partial<DoseUnitFields>&{quantidade?:number|null};
export function historicalUnitKey(row:HistoricalQuantityRow):string|null {
 const unit=readDoseUnit(row);if(unit.state!=='known')return null;
 return JSON.stringify([unit.fields.unidade_dose,unit.fields.unidade_dose_rotulo]);
}
/** Group amounts only within a single documented unit. Retain the number of unknown events. */
export function summarizeHistoricalQuantities(rows:readonly HistoricalQuantityRow[]){
 const groups=new Map<string,{key:string;quantity:number;count:number;fields:DoseUnitFields}>();let unknown=0;
 for(const row of rows){const key=historicalUnitKey(row),q=row.quantidade;if(key===null||typeof q!=='number'||!Number.isFinite(q)||q<=0){unknown++;continue;}
  const old=groups.get(key);if(old&&!Number.isFinite(old.quantity+q)){unknown+=old.count+1;groups.delete(key);continue;}
  groups.set(key,{key,quantity:(old?.quantity??0)+q,count:(old?.count??0)+1,fields:readDoseUnit(row).fields});}
 const values=[...groups.values()].map(group=>({...group,label:describeHistoricalDose({...group.fields,quantidade:group.quantity})}));
 return {groups:values,unknown,complete:rows.length>0&&unknown===0&&values.length===1,comparable:values.length===1?values[0]:null};
}
