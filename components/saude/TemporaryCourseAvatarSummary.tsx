"use client";
import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { temporaryCourseSummaries } from "@/lib/health-intelligence/temporary-course-insights";

/** Evidence next to the Avatar, without adding geometry or guessing symptoms. */
export function TemporaryCourseAvatarSummary({ context, onNavigate }: { context: HealthInsightContext | null | undefined; onNavigate: (href: string) => void }) {
  const courses = useMemo(() => context ? temporaryCourseSummaries(context) : [], [context]);
  if (!courses.length) return null;
  return <section aria-label="Tratamentos temporários registrados" className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.05] p-3">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-primary"><CalendarClock size={16} className="text-violet-300" /> Rotina temporária registrada</h3>
    <div className="mt-2 space-y-2">{courses.slice(0, 2).map(item => <button key={item.key} type="button" onClick={() => onNavigate(`/saude/medicamentos/detalhes?id=${encodeURIComponent(item.medicamentoId)}`)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl bg-surface-raised px-3 text-left text-xs text-ink-primary"><span className="min-w-0 truncate font-semibold">{item.nome}</span><span className="shrink-0 text-[10px] text-violet-300">{item.pending} em aberto · {item.overdue} anterior(es)</span></button>)}</div>
    <p className="mt-2 text-[10px] text-ink-muted">Somente horários informados. O Avatar não deduz sintomas, diagnóstico ou dispositivos de apoio.</p>
  </section>;
}
