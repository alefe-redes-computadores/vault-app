"use client";
import { CalendarDays, Plus, X } from "lucide-react";
import { CustomDatePicker } from "@/components/DatePicker";
import { HealthTimePicker } from "@/components/saude/HealthTimePicker";
import { temporaryCourseEnd, temporaryCourseSlots, temporaryCourseTotals, type TemporaryCourse } from "@/lib/health-supply/temporary-course";

export type TemporaryCourseDraft = {
  enabled: boolean;
  mode: "times" | "interval";
  start: string;
  days: string;
  times: string[];
  firstTime: string;
  intervalHours: string;
  quantityPerDose: string;
};
export const emptyTemporaryCourseDraft: TemporaryCourseDraft = {
  enabled: false, mode: "times", start: "", days: "", times: [], firstTime: "", intervalHours: "", quantityPerDose: "",
};

export function readTemporaryCourseDraft(draft: TemporaryCourseDraft): TemporaryCourse | null {
  if (!draft.enabled) return null;
  const mode = draft.mode || "times";
  const course: TemporaryCourse = mode === "interval"
    ? { start: draft.start, days: Number(draft.days), times: [], firstDoseAt: `${draft.start}T${draft.firstTime || ""}`, intervalHours: Number(draft.intervalHours), quantityPerDose: Number(draft.quantityPerDose) }
    : { start: draft.start, days: Number(draft.days), times: draft.times.filter(Boolean), quantityPerDose: Number(draft.quantityPerDose) };
  if (!draft.days.trim() || !draft.quantityPerDose.trim() ||
      (mode === "times" && course.times!.length !== draft.times.length) ||
      (mode === "interval" && (!(draft.firstTime || "").trim() || !(draft.intervalHours || "").trim()))) {
    throw new Error("Informe duração, quantidade por dose e a frequência exatamente como consta na prescrição.");
  }
  temporaryCourseSlots(course);
  return course;
}

export function TemporaryCourseFields({ value, onChange }: {
  value: TemporaryCourseDraft; onChange: (next: TemporaryCourseDraft) => void; existing?: boolean;
}) {
  const patch = (change: Partial<TemporaryCourseDraft>) => onChange({ ...value, ...change });
  const mode = value.mode || "times";
  let summary: { end: string; doses: number; units?: number } | null = null;
  try {
    const course = readTemporaryCourseDraft(value);
    if (course) {
      const totals = temporaryCourseTotals(course);
      summary = { end: temporaryCourseEnd(course), doses: totals.plannedDoses, units: totals.plannedUnits };
    }
  } catch { /* O formulário incompleto ainda não possui resumo. */ }
  const missing = value.enabled ? [!value.start ? "data de início" : null, !value.days.trim() ? "duração" : null, !value.quantityPerDose.trim() ? "quantidade por dose" : null,
    mode === "times" && (!value.times.length || value.times.some(time => !time.trim())) ? "horários" : null,
    mode === "interval" && !(value.firstTime || "").trim() ? "horário da primeira dose" : null,
    mode === "interval" && !(value.intervalHours || "").trim() ? "intervalo entre doses" : null,
  ].filter((item): item is string => Boolean(item)) : [];
  return <section className="rounded-[20px] border border-violet-400/20 bg-violet-400/[0.05] p-4">
    <div className="flex min-h-11 w-full items-center gap-3 text-left">
      <CalendarDays size={19} className="text-violet-300" />
      <span className="flex-1"><strong className="block text-sm text-ink-primary">Tratamento com prazo definido</strong><small className="text-[11px] text-ink-muted">Ex.: antibiótico por 5, 7 ou 10 dias, conforme a receita.</small></span>
      <span className="text-xs font-bold text-violet-300">Plano prescrito</span>
    </div>
    {value.enabled && <div className="mt-3 space-y-3 border-t border-violet-400/15 pt-3">
      <label className="block text-xs text-ink-secondary">Data de início informada na receita<CustomDatePicker value={value.start} onChange={start => patch({ start })} className="mt-1" /></label>
      <label className="block text-xs text-ink-secondary">Duração em dias<input aria-label="Duração do tratamento em dias" type="number" inputMode="numeric" min={1} max={30} value={value.days} onChange={event => patch({ days: event.target.value })} placeholder="Informe a duração" className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised p-3 text-ink-primary" /></label>
      <label className="block text-xs text-ink-secondary">Quantidade a cada dose<input aria-label="Quantidade prescrita a cada dose" type="number" inputMode="decimal" min={0.01} max={1000} step="any" value={value.quantityPerDose} onChange={event => patch({ quantityPerDose: event.target.value })} placeholder="Ex.: 1 comprimido" className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised p-3 text-ink-primary" /></label>
      <div className="grid grid-cols-2 gap-2" aria-label="Forma da frequência prescrita">
        <button type="button" aria-pressed={mode === "times"} onClick={() => patch({ mode: "times" })} className={`min-h-11 rounded-xl border px-3 text-xs font-semibold ${mode === "times" ? "border-violet-300/50 bg-violet-300/10 text-violet-200" : "border-surface-border text-ink-muted"}`}>Horários definidos</button>
        <button type="button" aria-pressed={mode === "interval"} onClick={() => patch({ mode: "interval" })} className={`min-h-11 rounded-xl border px-3 text-xs font-semibold ${mode === "interval" ? "border-violet-300/50 bg-violet-300/10 text-violet-200" : "border-surface-border text-ink-muted"}`}>A cada X horas</button>
      </div>
      {mode === "times" && <div><p className="text-xs text-ink-secondary">Horários prescritos (até 8 por dia)</p>
        {value.times.map((time, index) => <div key={index} className="mt-2 flex items-center gap-2"><HealthTimePicker value={time} onChange={next => patch({ times: value.times.map((item, i) => i === index ? next : item) })} className="min-w-0 flex-1" /><button type="button" aria-label={`Remover horário ${index + 1}`} onClick={() => patch({ times: value.times.filter((_, i) => i !== index) })} className="min-h-11 min-w-11 rounded-xl border border-surface-border text-ink-muted"><X size={15} className="mx-auto" /></button></div>)}
        <button type="button" disabled={value.times.length >= 8} onClick={() => patch({ times: [...value.times, ""] })} className="mt-2 flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-violet-300 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><Plus size={15} /> Adicionar horário</button>
      </div>}
      {mode === "interval" && <div className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-violet-400/15 bg-void/25 p-3 sm:grid-cols-2">
        <label className="block min-w-0 text-xs text-ink-secondary">Primeira dose<HealthTimePicker value={value.firstTime} onChange={firstTime => patch({ firstTime })} className="mt-1 w-full" /></label>
        <label className="block min-w-0 text-xs text-ink-secondary">A cada quantas horas<input aria-label="Intervalo prescrito em horas" type="number" inputMode="numeric" min={1} max={24} value={value.intervalHours} onChange={event => patch({ intervalHours: event.target.value })} placeholder="Ex.: 8" className="mt-1 min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-ink-primary" /></label>
        <p className="text-[10px] leading-relaxed text-ink-muted sm:col-span-2">O intervalo começa na primeira dose informada e atravessa a meia-noite quando necessário. O Vault não converte “3 vezes ao dia” em “a cada 8 horas”.</p>
      </div>}
      {missing.length > 0 && <p role="status" className="rounded-xl border border-violet-400/20 bg-void/30 px-3 py-2 text-[11px] leading-relaxed text-violet-200">Para visualizar o plano, informe: {missing.join(", ")}.</p>}
      {missing.length === 0 && !summary && <p role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.045] px-3 py-2 text-[11px] leading-relaxed text-amber-200">Revise os valores e horários informados. O plano só será calculado quando estiver válido.</p>}
      {summary && <div className="rounded-xl border border-violet-400/15 bg-void/35 p-3 text-xs text-ink-secondary"><strong className="text-violet-200">Plano calculado</strong><p className="mt-1">Até {summary.end.split("-").reverse().join("/")} · {summary.doses} dose(s){summary.units !== undefined ? ` · ${summary.units} unidade(s) previstas` : ""}</p></div>}
      <p className="text-[11px] leading-relaxed text-ink-muted">O Vault agenda somente as doses futuras deste período. O estoque muda apenas ao confirmar a tomada. Corrigir ou cancelar preserva as doses já registradas.</p>
    </div>}
  </section>;
}
