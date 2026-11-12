"use client";

import { useId, useMemo, useState } from "react";
import { Check, Factory } from "lucide-react";
import { manufacturerSuggestionsM129, recognizedManufacturerM129 } from "@/lib/medications/manufacturer-catalog-m129";

/** Pesquisa local, sem select nativo nem comunicação externa. */
export function ManufacturerFieldM129({ value, onChange, label = "Laboratório / fabricante", placeholder = "Ex.: Prati-Donaduzzi", maxLength = 120 }: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => manufacturerSuggestionsM129(value, 6), [value]);
  const known = recognizedManufacturerM129(value);
  return <div className="relative min-w-0">
    <label htmlFor={id} className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink-primary"><Factory size={15} className="text-violet-300"/>{label}</label>
    <input id={id} type="text" inputMode="text" autoComplete="off" maxLength={maxLength} value={value}
      onChange={event => {onChange(event.target.value);setOpen(true);}}
      onFocus={() => setOpen(true)}
      onBlur={() => {window.setTimeout(() => setOpen(false), 120);}}
      onKeyDown={event => {if(event.key === "Escape")setOpen(false);}}
      aria-expanded={open} aria-controls={`${id}-suggestions`}
      placeholder={placeholder} className="min-h-12 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary outline-none focus:border-violet-400"/>
    {known && <p className="mt-1 text-[11px] text-emerald-300">Nome reconhecido: {known.label}</p>}
    {open && suggestions.length > 0 && <div id={`${id}-suggestions`} role="group" aria-label="Sugestões de laboratórios" className="relative z-20 mt-1 max-h-64 space-y-0.5 overflow-y-auto rounded-xl border border-surface-border bg-surface p-1 shadow-xl">
      {suggestions.map(item => <button key={item.label} type="button" onMouseDown={event => event.preventDefault()} onClick={() => {onChange(item.label);setOpen(false);}}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-primary hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        <span className="flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{backgroundColor:item.color}}/><span className="truncate">{item.label}</span></span>
        {known?.label === item.label && <Check size={14} className="shrink-0 text-emerald-300"/>}
      </button>)}
    </div>}
    <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Não encontrou? Digite exatamente o fabricante da embalagem. A lista não comprova registro na Anvisa.</p>
  </div>;
}
