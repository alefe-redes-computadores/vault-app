"use client";

import { Bell, ChevronRight, Clock3 } from "lucide-react";
import type { HealthReminderRule } from "@/lib/health-reminders/types";

type Reminder = Pick<HealthReminderRule, "id" | "title" | "time" | "target_route">;

type Props = {
  reminders: readonly Reminder[];
  onNavigate: (route: string) => void;
};

/** M1: presentational only, without subscription, timers or modification to reminder rules. */
export function TodayRemindersPanel({ reminders, onNavigate }: Props) {
  if (reminders.length === 0) return null;
  return (
    <section className="vault-deferred space-y-2.5" aria-label="Lembretes de saúde do dia">
      <header className="flex items-center justify-between gap-2 rounded-xl px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ice/10 text-ice" aria-hidden="true">
            <Bell size={17}/>
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold text-ink-primary">Lembretes do dia</h2>
            <p className="text-[10px] text-ink-muted">Agenda pessoal · não mede adesão</p>
          </div>
        </div>
        <span className="rounded-full border border-ice/20 bg-ice/10 px-2.5 py-1 font-mono text-[10px] font-bold tabular-nums text-ice" aria-label={`${reminders.length} lembrete(s) programado(s)`}>
          {reminders.length}
        </span>
      </header>
      <ol className="space-y-1.5" aria-label="Lembretes em ordem de horário">
        {reminders.map((reminder) => (
          <li key={reminder.id}>
            <button type="button" onClick={() => onNavigate(reminder.target_route)}
              aria-label={`${reminder.title}, às ${reminder.time}. Abrir ação do lembrete`}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-ice/20 bg-surface/75 px-3 py-2.5 text-left transition-[background-color,transform] active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
              <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ice/10 px-2 py-1.5 text-[11px] font-semibold tabular-nums text-ice"><Clock3 size={13} aria-hidden="true"/>{reminder.time}</span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-xs font-semibold text-ink-primary">{reminder.title}</strong>
                <span className="mt-0.5 block text-[10px] text-ink-muted">Abrir lembrete · registro manual</span>
              </span>
              <ChevronRight size={15} className="shrink-0 text-ice" aria-hidden="true"/>
            </button>
          </li>
        ))}
      </ol>
      <p className="px-1 text-[10px] leading-relaxed text-ink-faint">Lembretes não confirmam dose tomada, aquisição ou retirada.</p>
    </section>
  );
}
