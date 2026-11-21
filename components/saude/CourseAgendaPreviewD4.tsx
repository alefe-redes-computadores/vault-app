"use client";
import { useEffect, useState } from "react";
import { Bell, CalendarDays, AlertTriangle, ChevronDown, ShieldCheck } from "lucide-react";
import type { Medicamento, DoseLog } from "@/lib/types";
import { buildCourseAgendaPreviewD4 } from "@/lib/clinical/course-agenda-preview-d4";

/** Previa: nunca afirma que o Android agendou o aviso. Nao acessa native notifications. */
export function CourseAgendaPreviewD4({ med, personId, courseKey, today, doseLogs }: {
  med: Medicamento; personId: string; courseKey: string; today: string; doseLogs: DoseLog[];
}) {
  const [clock, setClock] = useState<{ day: string; time: string } | null>(null);
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock({
        day: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`,
        time: `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`,
      });
    };
    updateClock();
    const timer = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(timer);
  }, [med.id, personId, courseKey, today]);
  if (!med.id || !med.user_id || med.person_id !== personId || !clock) return null;
  const agenda = buildCourseAgendaPreviewD4({ userId: med.user_id, personId,
    medicationId: med.id, courseKey, today: clock.day, localTime: clock.time,
    logs: doseLogs, context: med.contexto_clinico_m1 });
  if (!agenda) return null;
  return <details className="group mt-2 rounded-xl border border-sky-300/20 bg-sky-300/[0.035] p-2.5" aria-label="Prévia de agenda e lembretes">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs font-semibold text-sky-200">
      <CalendarDays size={16} aria-hidden="true"/>Próximos horários e lembretes
      <ChevronDown size={15} aria-hidden="true" className="ml-auto text-ink-muted transition-transform group-open:rotate-180"/>
    </summary>
    <div className="mt-2 space-y-2 text-[11px] text-ink-muted">
      <p>{agenda.futureInWindow} horário(s) ainda sem decisão nos próximos {agenda.windowDays} dias; {agenda.futureBeyondWindow} além da janela.</p>
      {agenda.next.length ? <ol className="space-y-1.5" aria-label="Próximos horários registrados">{agenda.next.map(slot =>
        <li key={slot.key} className="flex min-h-8 items-center gap-2 rounded-lg border border-surface-border/50 px-2 py-1.5">
          <Bell size={13} aria-hidden="true"/><span>{slot.date.split("-").reverse().join("/")} às {slot.time}</span>
        </li>)}</ol> : <p>Nenhum horário futuro encontrado nesta janela.</p>}
      <p>{agenda.alreadyDue} horário(s) anteriores sem decisão; {agenda.settled} com tomada ou ignorado registrado.</p>
      {agenda.warning && <p role="status" className="flex items-start gap-1.5 text-amber-200">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true"/>{agenda.warning}
      </p>}
      <p className="flex items-start gap-1.5"><ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden="true"/>
        Esta é uma prévia dos horários registrados, não uma confirmação de aviso agendado. Lembretes dependem das preferências, permissões do aparelho e reconciliação nativa; nada é criado ou cancelado aqui.
      </p>
    </div>
  </details>;
}
