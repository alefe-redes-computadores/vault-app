"use client";

import { useMemo } from "react";
import { CalendarRange, ChevronRight, Clock3 } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildUpcomingDoseAgenda, type UpcomingDoseItem } from "@/lib/health-intelligence/upcoming-dose-agenda";

const dayLabel = (item: UpcomingDoseItem) => item.dayOffset === 0 ? "Hoje" : item.dayOffset === 1 ? "Amanhã" : new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${item.date}T12:00:00Z`));

export function UpcomingDoseAgenda({ context, onNavigate, compact = false }: { context: HealthInsightContext | null | undefined; onNavigate: (href: string) => void; compact?: boolean }) {
  const agenda = useMemo(() => context ? buildUpcomingDoseAgenda(context) : null, [context]);
  if (!agenda || (!agenda.today.length && !agenda.future.length)) return null;
  const visible = [...agenda.today, ...agenda.future].slice(0, compact ? 2 : 4);
  return <section aria-label="Próximas doses programadas" className="rounded-2xl border border-violet-300/20 bg-violet-300/[.035] p-3">
    <div className="flex items-start gap-2.5"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-300/10 text-violet-200"><CalendarRange size={16}/></span><span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Agenda de doses</strong><span className="mt-0.5 block text-[9px] leading-relaxed text-ink-muted">Hoje e próximos {agenda.horizonDays} dias, somente a partir de horários realmente programados.</span></span><span className="rounded-full border border-violet-300/15 px-2 py-1 text-[8px] text-violet-200">{agenda.today.length + agenda.future.length}</span></div>
    <div className="mt-3 space-y-1.5">{visible.map(item => <button key={item.key} type="button" onClick={() => onNavigate(item.href)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border/60 bg-surface/65 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><Clock3 size={13} className={item.dayOffset === 0 ? "text-ice" : "text-violet-300"}/><span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-ink-primary">{item.medicationName}</strong><span className="text-[8px] text-ink-muted">{dayLabel(item)} · {item.time}</span></span><ChevronRight size={13} className="text-ink-faint"/></button>)}</div>
    <p className="mt-2 text-[8px] leading-relaxed text-ink-faint">Dose futura é planejamento: não aparece como atrasada, tomada ou ignorada antes do dia. {agenda.hiddenAfterHorizon ? `${agenda.hiddenAfterHorizon} horário(s) posterior(es) continuam preservados fora deste resumo.` : ""}</p>
  </section>;
}
