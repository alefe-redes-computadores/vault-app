"use client";
import { Clock, X } from "lucide-react";
import { HealthRelationPicker } from "./HealthRelationPicker";
import { useHapticFeedback } from "@/lib/haptics";

export function HealthTimePicker({value, onChange, className = ""}: {value: string; onChange: (value: string) => void; className?: string}) {
  const {trigger} = useHapticFeedback();
  const [hour = "", minute = ""] = value.split(":");
  return <div className={`${className} flex items-center gap-2 rounded-2xl border border-surface-border bg-surface-raised px-3 py-1`}>
    <Clock size={16} className="shrink-0 text-ink-muted" />
    <HealthRelationPicker compact title="Selecionar hora" value={hour} onValueChange={next => onChange(`${next}:${minute || "00"}`)} className="min-w-0 flex-1 bg-transparent text-sm text-ink-primary">
      <option value="" disabled>Hora</option>
      {Array.from({length:24},(_,i)=>String(i).padStart(2,"0")).map(h=><option key={h} value={h}>{h}</option>)}
    </HealthRelationPicker>
    <span className="text-ink-muted">:</span>
    <HealthRelationPicker compact title="Selecionar minuto" value={minute} onValueChange={next => onChange(`${hour || "00"}:${next}`)} className="min-w-0 flex-1 bg-transparent text-sm text-ink-primary">
      <option value="" disabled>Min</option>
      {Array.from({length:60},(_,i)=>String(i).padStart(2,"0")).map(m=><option key={m} value={m}>{m}</option>)}
    </HealthRelationPicker>
    {value ? <button type="button" aria-label="Limpar horário" className="flex h-11 w-8 shrink-0 items-center justify-center text-ink-muted" onClick={()=>{trigger("vibrate");onChange("");}}><X size={15}/></button> : null}
  </div>;
}
