"use client";

import { AlertTriangle, Bell, CalendarDays, ChevronDown, ChevronRight, Clock3, Pill } from "lucide-react";
import type { VisualAgendaOverview, VisualAgendaRow } from "@/lib/today/agenda-overview";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";

type Destination = VisualAgendaRow["destination"];
export function TodayAgendaOverview({ overview, overdueWithdrawals, remindersCount, onJump, onJumpDose, onOpenWithdrawals }: {
  overview: VisualAgendaOverview;
  overdueWithdrawals: number;
  remindersCount: number;
  onJump: (section: Destination) => void;
  onJumpDose?: (time: string) => void;
  onOpenWithdrawals: () => void;
}) {
  const kindIcon = { dose: Pill, reminder: Bell, appointment: CalendarDays } as const;
  return <section aria-label="Atenção do dia e agenda em ordem de horário" className="rounded-[20px] border border-ice/15 bg-gradient-to-b from-ice/[.055] to-surface/75 p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><h2 className="font-display text-base font-bold text-ink-primary">Atenção do dia</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">Pendências e próximos horários, sem misturar confirmações.</p></div>
      <Clock3 size={18} className="mt-0.5 shrink-0 text-ice" aria-hidden="true"/>
    </div>
    {(overview.dueDoseCount > 0 || overdueWithdrawals > 0) ? <div className="mt-3 grid gap-2 min-[350px]:grid-cols-2">
      {overdueWithdrawals > 0 && <button type="button" onClick={onOpenWithdrawals} className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-coral/25 bg-coral/[.075] px-3 text-left text-xs font-semibold text-coral focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        <span className="flex items-center gap-2"><AlertTriangle size={16} aria-hidden="true"/>{overdueWithdrawals} retirada{overdueWithdrawals === 1 ? "" : "s"} atrasada{overdueWithdrawals === 1 ? "" : "s"}</span><ChevronRight size={15} aria-hidden="true"/>
      </button>}
      {overview.dueDoseCount > 0 && <button type="button" onClick={() => onJump("hoje-doses")} className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[.075] px-3 text-left text-xs font-semibold text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        <span className="flex items-center gap-2"><Pill size={15} aria-hidden="true"/>{overview.dueDoseCount} dose{overview.dueDoseCount === 1 ? "" : "s"} para revisar</span><ChevronRight size={15} aria-hidden="true"/>
      </button>}
    </div> : <p className="mt-2 text-xs text-ink-secondary">Nenhuma retirada atrasada ou dose pendente identificada neste resumo. Confira os demais compromissos abaixo.</p>}
    <div className="mt-3 border-t border-surface-border/40 pt-2.5">
      <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-bold text-ink-primary">Agenda por horário</h3>{overview.nextUpcoming ? <button type="button" onClick={()=>overview.nextUpcoming?.kind === "dose" && onJumpDose ? onJumpDose(overview.nextUpcoming!.time) : onJump(overview.nextUpcoming!.destination)} className="min-h-11 shrink-0 rounded-lg border border-ice/20 bg-ice/[.055] px-2 text-xs font-semibold tabular-nums text-ice" aria-label={`Ir para o próximo horário às ${overview.nextUpcoming.time}`}>Próximo · {overview.nextUpcoming.time}</button> : <span className="text-xs text-ink-muted">Prévia · todos os tipos</span>}</div>
      {/* M106: alertas urgentes e próximo evento permanecem visíveis. */}
      <details className="group mt-2 rounded-xl border border-surface-border/35 bg-surface/25 px-2.5">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
          <span>Ver horários do dia{overview.rows.length > 0 ? ` · ${overview.rows.length} na prévia` : ""}</span>
          <ChevronDown size={15} aria-hidden="true" className="shrink-0 text-ink-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"/>
        </summary>
        <div className="border-t border-surface-border/30 pb-2 pt-1">
      {overview.rows.length > 0 ? <ol className="mt-2 space-y-1" aria-label="Horários combinados em ordem cronológica">
        {overview.rows.map((item, index) => {
          const Icon = kindIcon[item.kind];
          return <li key={`${item.kind}-${item.destination}-${item.time}-${index}`}>
            <button type="button" onClick={() => item.kind === "dose" && onJumpDose ? onJumpDose(item.time) : onJump(item.destination)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border/40 bg-surface/60 px-2.5 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
              <span className="w-12 shrink-0 font-mono text-xs font-semibold tabular-nums text-ice">{item.time}</span>
              {item.kind === "dose" ? <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-surface-raised" aria-hidden="true"><MedicationFormatIcon formato={item.formato} cores={item.cores} size={16}/></span> : <Icon size={14} className="shrink-0 text-ink-muted" aria-hidden="true"/>}
              <span className="min-w-0 flex-1"><strong className="block truncate text-xs font-semibold text-ink-primary">{item.title}</strong><span className="block truncate text-xs text-ink-muted">{item.context}</span></span>
              <ChevronRight size={14} className="shrink-0 text-ink-muted" aria-hidden="true"/>
            </button>
          </li>;
        })}
      </ol> : <p className="mt-2 text-xs text-ink-muted">Nenhum evento com horário definido para mostrar nesta prévia.</p>}
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">
        {overview.hiddenCount > 0 ? `Mais ${overview.hiddenCount} evento(s) com horário nas seções abaixo. ` : ""}
        {overview.untimedAppointments > 0 ? `${overview.untimedAppointments} compromisso(s) sem horário ficam na seção própria. ` : ""}
        Doses, lembretes e compromissos mantêm suas ações e estados independentes.
      </p>
        </div>
      </details>
      {remindersCount > 0 && <button type="button" onClick={() => onJump("hoje-agenda")} className="mt-1 min-h-11 text-xs font-semibold text-emerald-300 underline underline-offset-2">Ver todos os lembretes</button>}
    </div>
  </section>;
}
