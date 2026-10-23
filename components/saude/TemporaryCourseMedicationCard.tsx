"use client";
import { CalendarClock, ChevronRight, CheckCircle2 } from "lucide-react";
import type { Medicamento, DoseLog } from "@/lib/types";
import { temporaryCourseSummaries } from "@/lib/health-intelligence/temporary-course-insights";

export function TemporaryCourseMedicationCard({ med, doseLogs, personId, today, onEdit }: {
  med: Medicamento; doseLogs: DoseLog[]; personId: string; today: string; onEdit: () => void;
}) {
  if (!med.id || !med.user_id || med.person_id !== personId) return null;
  const courses = temporaryCourseSummaries({ personId, userId: med.user_id, hoje: today,
    medicamentos: [{ ...med, person_id: personId }],
    doseLogs: doseLogs.filter(log => log.person_id === personId && log.user_id === med.user_id)
      .map(log => ({ ...log, person_id: personId })) }, true);
  if (!courses.length) return null;
  const open = courses.reduce((sum, item) => sum + item.pending + item.overdue, 0);
  return <section aria-label="Tratamento com prazo definido" className="rounded-[20px] border border-violet-400/20 bg-violet-400/[0.055] p-3.5">
    <div className="flex items-center gap-2 text-violet-200"><CalendarClock size={18} /><h3 className="text-sm font-bold">Tratamento com prazo definido</h3></div>
    <p className="mt-1 text-[11px] text-ink-muted">Períodos e horários registrados por você. O Vault não define a duração da prescrição.</p>
    <div className="mt-3 space-y-2">{courses.slice(0, 3).map(item => <div key={item.key} className="rounded-xl border border-surface-border/50 bg-surface/70 px-3 py-2.5">
      <p className="font-mono text-[11px] text-ink-primary">{item.from.split("-").reverse().join("/")} → {item.through.split("-").reverse().join("/")}</p>
      <p className="mt-1 text-[10px] text-ink-muted">{item.pending} em aberto · {item.overdue} de dias anteriores · {item.taken} tomadas · {item.ignored} ignoradas</p>
    </div>)}</div>
    {med.status === "ativo" ? <button type="button" onClick={onEdit} className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-violet-400/25 bg-violet-400/10 px-3 text-left text-xs font-semibold text-violet-200">Ajustar período e horários <ChevronRight size={16}/></button>
      : <p className="mt-2 flex items-center gap-1.5 text-[10px] text-ink-muted"><CheckCircle2 size={13}/> Medicamento fora da rotina ativa; histórico preservado.</p>}
    {open === 0 && <p className="mt-2 text-[10px] text-emerald-300">Nenhum horário deste período permanece em aberto.</p>}
  </section>;
}
