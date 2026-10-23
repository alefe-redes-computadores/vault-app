"use client";
import { CalendarDays, Plus, X } from "lucide-react";
import { CustomDatePicker } from "@/components/DatePicker";
import { HealthTimePicker } from "@/components/saude/HealthTimePicker";
import { temporaryCourseSlots, type TemporaryCourse } from "@/lib/health-supply/temporary-course";

export type TemporaryCourseDraft = { enabled: boolean; start: string; days: string; times: string[] };
export const emptyTemporaryCourseDraft: TemporaryCourseDraft = { enabled: false, start: "", days: "", times: [] };

export function readTemporaryCourseDraft(draft: TemporaryCourseDraft): TemporaryCourse | null {
  if (!draft.enabled) return null;
  const course = { start: draft.start, days: Number(draft.days), times: draft.times.filter(Boolean) };
  if (!draft.days.trim() || course.times.length !== draft.times.length) throw new Error("Informe a duração e todos os horários da prescrição.");
  temporaryCourseSlots(course);
  return course;
}

export function TemporaryCourseFields({ value, onChange, existing = false }: {
  value: TemporaryCourseDraft; onChange: (next: TemporaryCourseDraft) => void; existing?: boolean;
}) {
  const patch = (change: Partial<TemporaryCourseDraft>) => onChange({ ...value, ...change });
  return <section className="rounded-[20px] border border-violet-400/20 bg-violet-400/[0.05] p-4">
    <button type="button" onClick={() => patch({ enabled: !value.enabled })} className="flex min-h-11 w-full items-center gap-3 text-left">
      <CalendarDays size={19} className="text-violet-300" />
      <span className="flex-1"><strong className="block text-sm text-ink-primary">Tratamento com prazo definido</strong><small className="text-[11px] text-ink-muted">Ex.: antibiótico por 5, 7 ou 10 dias, conforme a receita.</small></span>
      <span className="text-xs font-bold text-violet-300">{value.enabled ? "Ativo" : existing ? "Cancelar futuros" : "Configurar"}</span>
    </button>
    {value.enabled && <div className="mt-3 space-y-3 border-t border-violet-400/15 pt-3">
      <label className="block text-xs text-ink-secondary">Data de início informada na receita<CustomDatePicker value={value.start} onChange={start => patch({ start })} className="mt-1" /></label>
      <label className="block text-xs text-ink-secondary">Duração em dias<input type="number" inputMode="numeric" min={1} max={30} value={value.days} onChange={event => patch({ days: event.target.value })} placeholder="Informe a duração" className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised p-3 text-ink-primary" /></label>
      <div><p className="text-xs text-ink-secondary">Horários prescritos (até 8 por dia)</p>
        {value.times.map((time, index) => <div key={index} className="mt-2 flex items-center gap-2"><HealthTimePicker value={time} onChange={next => patch({ times: value.times.map((item, i) => i === index ? next : item) })} className="min-w-0 flex-1" /><button type="button" aria-label={`Remover horário ${index + 1}`} onClick={() => patch({ times: value.times.filter((_, i) => i !== index) })} className="min-h-11 min-w-11 rounded-xl border border-surface-border text-ink-muted"><X size={15} className="mx-auto" /></button></div>)}
        <button type="button" disabled={value.times.length >= 8} onClick={() => patch({ times: [...value.times, ""] })} className="mt-2 flex min-h-10 items-center gap-1.5 text-xs font-semibold text-violet-300 disabled:opacity-50"><Plus size={15} /> Adicionar horário</button>
      </div>
      <p className="text-[11px] leading-relaxed text-ink-muted">O Vault agenda somente as doses futuras deste período. O estoque muda apenas ao confirmar a tomada. Corrigir ou cancelar preserva as doses já registradas.</p>
    </div>}
  </section>;
}
