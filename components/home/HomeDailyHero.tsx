"use client";

import { memo, type ReactNode } from "react";
import { homeRoutineSummaryNote } from "@/lib/home/routine-summary-note";

type Props = {
  eyebrow: string; title: string; description: string; color: string;
  completed: number; scheduled: number; progress: number;
  onOpen: () => void; onOpenToday?: () => void; ctaLabel?: string;
  indicators?: ReactNode; contextLabel?: string;
};

/** UI360 R4: linha compacta e indicadores abertos no mesmo container do evento.
 * Rotina, SOS e agenda mantêm as autoridades anteriores; é apenas apresentação.
 */
export const HomeDailyHero = memo(function HomeDailyHero({
  completed, scheduled, progress, onOpen, ctaLabel, indicators, title, description,
}: Props) {
  const safeProgress = scheduled > 0 && Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  const safeCompleted = scheduled > 0 && Number.isFinite(scheduled) && Number.isFinite(completed)
    ? Math.max(0, Math.min(Math.floor(scheduled), Math.floor(completed))) : 0;
  return <div data-vault-ui360-r4-routine aria-label="Resumo unificado da rotina">
    <button type="button" onClick={onOpen}
      className="block min-h-[75px] w-full px-3.5 py-3 text-left transition-colors active:bg-surface-raised/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
      aria-label={`Rotina programada de hoje: ${scheduled > 0 ? `${safeCompleted} de ${scheduled} doses confirmadas` : "sem horários programados"}. ${ctaLabel || "Revisar doses"}`}>
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 text-[11px] font-semibold text-ink-secondary">Rotina programada de hoje <span className="font-normal text-ink-muted">· contínuos</span></span>
        <strong className="shrink-0 font-display text-base font-bold tabular-nums text-ink-primary">{scheduled > 0 ? `${safeCompleted}/${scheduled}` : "Sem horários"}</strong>
      </span>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-raised ring-1 ring-inset ring-surface-border/30"
        role="progressbar" aria-label="Progresso da rotina programada" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={safeProgress} aria-valuetext={scheduled > 0 ? `${safeCompleted} doses resolvidas de ${scheduled} previstas` : "Sem horários programados"}>
        <span className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-[width] motion-reduce:transition-none" style={{width:`${safeProgress}%`}}/>
      </span>
      <span className="sr-only" role="note">{title}. {description}. {homeRoutineSummaryNote(scheduled, safeCompleted)}
        Home: horários de contínuos. Hoje e Medicamentos podem ter denominadores diferentes. SOS fora da meta.
      </span>
    </button>
    {indicators}
  </div>;
});
