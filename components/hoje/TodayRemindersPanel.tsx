"use client";

import { Bell, ChevronRight, Clock3 } from "lucide-react";
import type { HealthReminderRule } from "@/lib/health-reminders/types";
import { isSafeLocalActionHref } from "@/lib/navigation/safe-action-href";

type Reminder = Pick<HealthReminderRule, "id" | "title" | "time" | "target_route">;

type Props = {
  reminders: readonly Reminder[];
  onNavigate: (route: string) => void;
};

/** M1: presentational only, without subscription, timers or modification to reminder rules. */
export function TodayRemindersPanel({ reminders, onNavigate }: Props) {
  if (reminders.length === 0) return null;
  return (
    <section className="vault-deferred space-y-3.5" aria-label="Lembretes de saúde do dia">
      <header className="flex items-center justify-between gap-2 rounded-2xl border border-surface-border/45 bg-surface-raised/35 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] text-emerald-300" aria-hidden="true">
            <Bell size={17}/>
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold text-ink-primary">Lembretes do dia</h2>
            <p className="text-[10px] text-ink-muted">Agenda pessoal · não mede adesão</p>
          </div>
        </div>
        <span className="rounded-full border border-surface-border/65 bg-surface px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-ink-primary" aria-label={`${reminders.length} lembrete(s) programado(s)`}>
          {reminders.length}
        </span>
      </header>
      <ol className="space-y-1.5" aria-label="Lembretes em ordem de horário">
        {reminders.map((reminder) => (
          <li key={reminder.id} className="min-w-0">
            <button type="button" disabled={!isSafeLocalActionHref(reminder.target_route)}
              onClick={() => { if (isSafeLocalActionHref(reminder.target_route)) onNavigate(reminder.target_route); }}
              aria-label={`${reminder.title}, às ${reminder.time}. ${isSafeLocalActionHref(reminder.target_route) ? "Abrir ação do lembrete" : "Destino indisponível"}`}
              className="flex min-h-[72px] w-full items-center gap-3.5 rounded-2xl border border-surface-border/60 bg-surface/85 px-3.5 py-3 text-left transition-[background-color,border-color] hover:border-emerald-300/25 hover:bg-surface-raised/50 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
              <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-400/15 bg-emerald-400/[.06] px-2.5 py-2 text-[11px] font-bold tabular-nums text-emerald-200"><Clock3 size={13} aria-hidden="true"/>{reminder.time}</span>
              <span className="min-w-0 flex-1">
                <strong className="block break-words text-xs font-semibold leading-snug text-ink-primary line-clamp-2" title={reminder.title}>{reminder.title}</strong>
                <span className="mt-0.5 block text-[10px] text-ink-muted">{isSafeLocalActionHref(reminder.target_route) ? "Abrir lembrete · registro manual" : "Destino indisponível · revise o lembrete"}</span>
              </span>
              <ChevronRight size={15} className="shrink-0 text-ink-muted" aria-hidden="true"/>
            </button>
          </li>
        ))}
      </ol>
      <p className="px-1 text-[10px] leading-relaxed text-ink-faint">Lembretes não confirmam dose tomada, aquisição ou retirada.</p>
    </section>
  );
}
