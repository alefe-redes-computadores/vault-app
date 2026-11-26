"use client";
import { DOSE_UNITS, declareDoseUnit, unknownDoseUnit, type DoseUnitCode, type DoseUnitFields } from '@/lib/dose-premium/historical-unit';
export type UnitDraft={code:DoseUnitCode|null;customLabel:string};
/** Controlled form. Unit selection is explicit; no reading of current stock or presentation. */
export function unitDraftSnapshot(draft:UnitDraft):DoseUnitFields {
  return draft.code===null?unknownDoseUnit():declareDoseUnit(draft.code,'declared',draft.code==='custom'?draft.customLabel:undefined);
}
export function DoseHistoricalUnitField({value,onChange,disabled=false}:{value:UnitDraft;onChange:(v:UnitDraft)=>void;disabled?:boolean}){
  const options: {code:DoseUnitCode|null;label:string}[]=[{code:null,label:'Não informada'},...Object.entries(DOSE_UNITS).map(([code,labels])=>({code:code as DoseUnitCode,label:labels[0]})),{code:'custom',label:'Outra unidade'}];
  return <fieldset disabled={disabled} className="min-w-0 space-y-2"><legend className="text-sm font-semibold text-ink-primary">Unidade administrada</legend><p className="text-xs text-ink-muted">Informe a unidade do evento. Não é a concentração ou a unidade do estoque.</p><div className="flex flex-wrap gap-2">{options.map(option=><button key={option.code??'unknown'} type="button" aria-pressed={value.code===option.code} onClick={()=>onChange({...value,code:option.code})} className={`min-h-11 rounded-xl border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${value.code===option.code?'border-emerald-300/50 bg-emerald-300/10 text-emerald-200':'border-surface-border bg-surface text-ink-primary'}`}>{option.label}</button>)}</div>{value.code==='custom'&&<label className="block space-y-1 text-xs text-ink-muted">Unidade informada<input value={value.customLabel} onChange={e=>onChange({...value,customLabel:e.target.value})} maxLength={50} className="block min-h-11 w-full rounded-xl border border-surface-border bg-void px-3 text-base text-ink-primary" /></label>}</fieldset>;
}
