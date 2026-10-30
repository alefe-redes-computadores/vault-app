"use client";
import { Clock, X } from "lucide-react";
import { HealthRelationPicker } from "./HealthRelationPicker";
import { useHapticFeedback } from "@/lib/haptics";

// V235: sem recriar 84 opções em cada render dos formulários de cuidado.
const HOURS = Array.from({length:24}, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({length:60}, (_, i) => String(i).padStart(2, "0"));

export function HealthTimePicker({value, onChange, className = ""}: {value: string; onChange: (value: string) => void; className?: string}) {
  const {trigger} = useHapticFeedback();
  const [hour = "", minute = ""] = value.split(":");
  return <div className={`${className} flex min-h-12 items-center gap-2 rounded-2xl border border-surface-border/70 bg-surface-raised px-3 py-1.5 focus-within:border-ice/50 focus-within:ring-2 focus-within:ring-ice/10`}>
    <Clock size={16} className="shrink-0 text-ink-muted" />
    <HealthRelationPicker compact title="Selecionar hora" value={hour} onValueChange={next => onChange(`${next}:${minute || "00"}`)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-primary">
      <option value="" disabled>Hora</option>
      {HOURS.map(h=><option key={h} value={h}>{h}</option>)}
    </HealthRelationPicker>
    <span className="text-ink-muted">:</span>
    <HealthRelationPicker compact title="Selecionar minuto" value={minute} onValueChange={next => onChange(`${hour || "00"}:${next}`)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-primary">
      <option value="" disabled>Min</option>
      {MINUTES.map(m=><option key={m} value={m}>{m}</option>)}
    </HealthRelationPicker>
    {value ? <button type="button" aria-label="Limpar horário" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice" onClick={()=>{trigger("vibrate");onChange("");}}><X size={15}/></button> : null}
  </div>;
}
