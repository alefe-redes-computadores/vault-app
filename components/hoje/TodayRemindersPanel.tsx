"use client";

import { Bell, ChevronRight, Clock3 } from "lucide-react";
import type { HealthReminderRule } from "@/lib/health-reminders/types";
import { isSafeLocalActionHref } from "@/lib/navigation/safe-action-href";
import { useProgressiveReveal } from "@/hooks/useProgressiveReveal";

type Reminder = Pick<HealthReminderRule, "id" | "title" | "time" | "target_route">;

type Props = {
  reminders: readonly Reminder[];
  onNavigate: (route: string) => void;
};

/** M1: presentational only, without subscription, timers or modification to reminder rules. */
export function TodayRemindersPanel({ reminders, onNavigate }: Props) {
  const reveal = useProgressiveReveal(reminders.map(item => item.id).join("\u001f"), reminders.length, 3, 4);
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
            <p className="text-xs text-ink-muted">Agenda pessoal · não mede adesão</p>
          </div>
        </div>
        <span className="rounded-full border border-surface-border/65 bg-surface px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-ink-primary" aria-label={`${reminders.length} lembrete(s) programado(s)`}>
          {reminders.length}
        </span>
      </header>
      <ol id="today-reminders-list" className="space-y-1.5" aria-label="Lembretes em ordem de horário">
        {reminders.slice(0, reveal.visible).map((reminder) => {
          const safeRoute = isSafeLocalActionHref(reminder.target_route);
          return <li key={reminder.id} className="min-w-0">
            <button type="button" disabled={!isSafeLocalActionHref(reminder.target_route)}
              onClick={() => { if (safeRoute) onNavigate(reminder.target_route); }}
              aria-label={`${reminder.title}, às ${reminder.time}. ${safeRoute ? "Abrir ação do lembrete" : "Destino indisponível"}`}
              className="flex min-h-[60px] w-full items-center gap-3 rounded-2xl border border-surface-border/60 bg-surface/85 px-3 py-2.5 text-left transition-[background-color,border-color] hover:border-emerald-300/25 hover:bg-surface-raised/50 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
              <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-400/15 bg-emerald-400/[.06] px-2.5 py-2 text-[11px] font-bold tabular-nums text-emerald-200"><Clock3 size={13} aria-hidden="true"/>{reminder.time}</span>
              <span className="min-w-0 flex-1">
                <strong className="block break-words text-[13px] font-semibold leading-snug text-ink-primary line-clamp-2" title={reminder.title}>{reminder.title}</strong>
                <span className="mt-0.5 block text-xs text-ink-muted">{safeRoute ? "Abrir lembrete · registro manual" : "Destino indisponível · revise o lembrete"}</span>
              </span>
              <ChevronRight size={15} className="shrink-0 text-ink-muted" aria-hidden="true"/>
            </button>
          </li>;
        })}
      </ol>
      {(reveal.remaining > 0 || reveal.expanded) && <div className="flex flex-wrap gap-2" aria-label="Navegação dos lembretes">
        {reveal.remaining > 0 && <button type="button" onClick={reveal.showMore} aria-controls="today-reminders-list" aria-expanded={reveal.expanded} className="min-h-11 flex-1 rounded-xl border border-emerald-400/20 bg-emerald-400/[.055] px-3 text-[11px] font-semibold text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Ver mais {reveal.nextCount} lembrete{reveal.nextCount === 1 ? "" : "s"}</button>}
        {reveal.expanded && <button type="button" onClick={reveal.collapse} aria-controls="today-reminders-list" className="min-h-11 rounded-xl border border-surface-border/60 px-3 text-[11px] font-semibold text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Recolher</button>}
      </div>}
      {reveal.remaining > 0 && <p className="text-xs text-ink-muted" role="status">{reveal.remaining} lembrete{reveal.remaining === 1 ? "" : "s"} ainda {reveal.remaining === 1 ? "disponível" : "disponíveis"} nesta lista.</p>}
      <p className="px-1 text-xs leading-relaxed text-ink-muted">Lembretes não confirmam dose tomada, aquisição ou retirada.</p>
    </section>
  );
}
