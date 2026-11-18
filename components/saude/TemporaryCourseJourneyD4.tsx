"use client";
import type { DoseLog, Medicamento } from "@/lib/types";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { buildCourseJourneyD4, courseJourneyCaptionD4 } from "@/lib/clinical/temporary-course-journey-d4";

/** Somente apresentação; não cria eventos, não altera estoque ou prescription. */
export function TemporaryCourseJourneyD4({med, personId, courseKey, today, doseLogs}: {
  med: Medicamento; personId: string; courseKey: string; today: string; doseLogs: DoseLog[];
}) {
  if (!med.id || !med.user_id || med.person_id !== personId) return null;
  const journey = buildCourseJourneyD4({
    userId: med.user_id, personId, medicationId: med.id,
    courseKey, today, logs: doseLogs,
  });
  if (!journey) return null;
  return <div className="mt-2 rounded-xl border border-violet-300/15 bg-violet-300/[0.035] p-2.5" aria-label="Acompanhamento do período informado">
    <div className="flex items-start gap-2 text-[11px] font-semibold text-violet-200">
      <CalendarDays size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{courseJourneyCaptionD4(journey)}</span>
    </div>
    <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
      {journey.scheduled} horário(s) registrado(s): {journey.confirmed} tomada(s) confirmada(s), {journey.ignored} ignorada(s), {journey.todayPending} sem decisão hoje, {journey.earlierPending} de dias anteriores e {journey.futurePending} futuro(s).
    </p>
    {journey.warning && <p role="status" className="mt-1 flex items-start gap-1 text-[10px] text-amber-200"><AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true"/>{journey.warning}</p>}
    <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Contagem de dias é calendário, não adesão. Sem horários em aberto não significa tratamento concluído.</p>
  </div>;
}
