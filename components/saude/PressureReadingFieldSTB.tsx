"use client";
import { useId } from "react";
import { Gauge } from "lucide-react";
import { parsePressureDraft } from "@/lib/health/pressure-input";

/** One controlled pressure draft; no local persistence, writers or inferred diagnosis. */
export function PressureReadingFieldSTB({value,onChange,disabled=false,autoFocus=false}:{
  value:string;onChange:(value:string)=>void;disabled?:boolean;autoFocus?:boolean;
}) {
  const id=useId(), helpId=`${id}-help`, previewId=`${id}-preview`;
  const parsed=parsePressureDraft(value);
  const invalid=Boolean(value.trim())&&!parsed;
  return <div className="min-w-0 space-y-2 rounded-2xl border border-sky-300/20 bg-sky-300/[.035] p-3">
    <label htmlFor={id} className="flex items-center gap-2 text-xs font-semibold text-sky-200"><Gauge size={17} className="shrink-0" aria-hidden="true"/>Pressão arterial (mmHg)</label>
    <input id={id} type="text" inputMode="text" autoComplete="off" spellCheck={false} autoFocus={autoFocus} disabled={disabled} value={value}
      onChange={event=>onChange(event.target.value)} onBlur={()=>{if(parsed&&value!==parsed.display)onChange(parsed.display);}}
      aria-invalid={invalid} aria-describedby={`${helpId} ${previewId}`} placeholder="Ex.: 120/80 ou 14/9"
      className={`min-h-12 w-full min-w-0 rounded-xl border bg-surface-raised px-3 text-center text-lg font-bold tabular-nums text-ink-primary outline-none focus-visible:ring-2 disabled:opacity-50 ${invalid?"border-coral/60 focus-visible:ring-coral/30":"border-surface-border focus-visible:ring-sky-300/30"}`}/>
    <p id={helpId} className="text-[11px] leading-relaxed text-ink-muted">Primeiro a sistólica, depois a diastólica. Ex.: 120/80 ou 14/9. Confira o valor completo antes de salvar.</p>
    <div id={previewId} aria-live="polite" className="min-h-10">
      {parsed?<div className="rounded-xl border border-sky-300/20 bg-surface px-3 py-2"><span className="block text-[10px] text-ink-muted">{parsed.abbreviated?"Interpretado como · valor que será salvo":"Valor que será salvo"}</span><div className="my-2 grid grid-cols-2 gap-2 text-center"><div className="min-w-0 rounded-lg bg-sky-300/[.045] p-2"><span className="block text-[11px] text-sky-200">Sistólica</span><strong className="block text-2xl font-bold tabular-nums text-sky-300">{parsed.systolic}</strong><span className="text-[10px] text-ink-muted">mmHg</span></div><div className="min-w-0 rounded-lg bg-emerald-300/[.045] p-2"><span className="block text-[11px] text-emerald-200">Diastólica</span><strong className="block text-2xl font-bold tabular-nums text-emerald-300">{parsed.diastolic}</strong><span className="text-[10px] text-ink-muted">mmHg</span></div></div><strong className="mt-0.5 block border-t border-surface-border/60 pt-2 text-center text-base font-bold tabular-nums text-ink-primary">{parsed.display} mmHg</strong></div>:invalid?<p className="text-xs font-medium text-coral">Confira o valor. Use duas medidas válidas na mesma escala, sem outros caracteres.</p>:<p className="text-xs text-ink-muted">O valor em mmHg aparecerá aqui.</p>}
    </div>
  </div>;
}
