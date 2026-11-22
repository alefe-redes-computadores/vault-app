"use client";

import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { resolveMedicationTimeDraftM4P2 } from "@/lib/medications/time-draft-m4p2";

export function normalizeHealthTimeDraft(raw: string): string | null {
  return resolveMedicationTimeDraftM4P2(raw);
}

/** Campo único: aceita 1500/15:00 e só normaliza quando a edição termina. */
export function HealthTimePicker({ value, onChange, className = "", disabled = false, clearable = true }: {
  value: string; onChange: (value: string) => void; className?: string; disabled?: boolean; clearable?: boolean;
}) {
  const { trigger } = useHapticFeedback();
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const normalized = normalizeHealthTimeDraft(draft);
    if (normalized === null) { setInvalid(Boolean(draft.trim())); return; }
    setInvalid(false); setDraft(normalized);
    if (normalized !== value) { onChange(normalized); trigger("vibrate"); }
  };

  return <fieldset disabled={disabled} aria-label="Horário em formato de 24 horas; editar e confirmar" className={`${className} flex min-h-12 min-w-0 items-center gap-2 rounded-2xl border bg-surface-raised px-3 py-1.5 focus-within:ring-2 disabled:opacity-50 ${invalid ? "border-coral/70 focus-within:ring-coral/20" : "border-surface-border/70 focus-within:border-ice/50 focus-within:ring-ice/20"}`}>
    <Clock size={16} className="shrink-0 text-ink-muted" aria-hidden="true"/>
    <input type="text" inputMode="numeric" autoComplete="off" aria-label="Horário. Exemplo: 15:00" aria-invalid={invalid} placeholder="HH:MM" maxLength={5} className="h-11 min-w-0 flex-1 bg-transparent text-center text-sm font-semibold tabular-nums text-ink-primary outline-none placeholder:text-ink-faint" value={draft} onChange={event=>{setInvalid(false);const next=event.target.value.replace(/[^\d:]/g,"").slice(0,5);setDraft(next);onChange(next);}} onBlur={commit} onKeyDown={event=>{if(event.key==="Enter")event.currentTarget.blur();}}/>
    {clearable&&(draft||value)?<button type="button" aria-label="Limpar horário" onClick={()=>{setDraft("");setInvalid(false);onChange("");trigger("vibrate");}} className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted focus-visible:ring-2 focus-visible:ring-ice"><X size={15}/></button>:null}
  </fieldset>;
}
