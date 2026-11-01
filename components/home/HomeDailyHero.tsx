"use client";

import { memo } from "react";
import { CalendarDays, HeartPulse } from "lucide-react";
import { homeRoutineSummaryNote } from "@/lib/home/routine-summary-note";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  color: string;
  completed: number;
  scheduled: number;
  progress: number;
  onOpen: () => void;
};

/** P14 R3 — Hero da Home isolado. Toda a contagem pertence à Home; leitura apenas. */
export const HomeDailyHero = memo(function HomeDailyHero({
  eyebrow, title, description, color, completed, scheduled, progress, onOpen,
}: Props) {
  // P15 R5: 0 eventos previstos não produz barra cheia ou taxa de adesão implícita.
  const safeProgress = scheduled > 0 && Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  // R9 R7: visual count cannot exceed the real planned denominator (SOS is separate).
  const safeCompleted = scheduled > 0 && Number.isFinite(scheduled) && Number.isFinite(completed) ? Math.max(0, Math.min(Math.floor(scheduled), Math.floor(completed))) : 0;
  return <>
    <button type="button" onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 px-4 pb-2 pt-4 text-left transition-colors motion-reduce:transition-none active:bg-surface-raised/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
      aria-label={`${title}. Abrir página Hoje`}>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{color}}><CalendarDays size={14} aria-hidden="true" />{eyebrow}</span>
        <strong className="mt-1 block text-lg font-semibold leading-snug text-ink-primary">{title}</strong>
        <span className="mt-1 block max-w-[280px] line-clamp-2 text-[11px] leading-relaxed text-ink-muted">{description}</span>
      </span>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border" style={{borderColor:`${color}35`,backgroundColor:`${color}14`,color}} aria-hidden="true"><HeartPulse size={19}/></span>
    </button>
    <div className="px-4 pb-3">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] text-ink-muted">
        <span>Rotina programada</span><span className="font-mono tabular-nums text-ink-primary">{scheduled > 0 ? `${safeCompleted}/${scheduled}` : "Sem horários"}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised" role="progressbar" aria-label="Progresso da rotina programada" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeProgress} aria-valuetext={scheduled>0?`${safeCompleted} doses resolvidas de ${scheduled} previstas` : "Sem horários programados"}>
        <div className="h-full rounded-full bg-gradient-to-r from-ice to-emerald-400 transition-[width] duration-300 motion-reduce:transition-none" style={{width:`${safeProgress}%`}} />
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-ink-muted" role="note">{homeRoutineSummaryNote(scheduled, safeCompleted)}</p>
    </div>
  </>;
});
