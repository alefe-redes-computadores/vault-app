"use client";

import { memo } from "react";
import { ArrowUpRight, CalendarDays, HeartPulse } from "lucide-react";
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
  ctaLabel?: string;
};

/** P14 R3 — Hero da Home isolado. Toda a contagem pertence à Home; leitura apenas. */
export const HomeDailyHero = memo(function HomeDailyHero({
  eyebrow, title, description, color, completed, scheduled, progress, onOpen, ctaLabel = "Abrir rotina",
}: Props) {
  // P15 R5: 0 eventos previstos não produz barra cheia ou taxa de adesão implícita.
  const safeProgress = scheduled > 0 && Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  // R9 R7: visual count cannot exceed the real planned denominator (SOS is separate).
  const safeCompleted = scheduled > 0 && Number.isFinite(scheduled) && Number.isFinite(completed) ? Math.max(0, Math.min(Math.floor(scheduled), Math.floor(completed))) : 0;
  // M131: sem doses pendentes no denominador, o topo não ocupa altura de alerta.
  // Acesso à rotina, texto e progresso permanecem disponíveis.
  const quietRoutine = scheduled <= 0 || safeCompleted >= scheduled;
  return <>
    <button type="button" onClick={onOpen}
      className={`group relative isolate flex ${quietRoutine ? "min-h-[86px]" : "min-h-[104px] min-[380px]:min-h-[116px]"} w-full items-center justify-between gap-2.5 overflow-hidden rounded-t-[22px] bg-[radial-gradient(ellipse_at_94%_0%,rgba(47,227,201,0.16),transparent_52%)] px-3.5 ${quietRoutine ? "pb-2 pt-2" : "pb-2.5 pt-3"} text-left transition-colors hover:bg-surface-raised/40 motion-reduce:transition-none active:bg-surface-raised/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice`}
      aria-label={`${title}. ${ctaLabel}`}>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{color}}><CalendarDays size={14} aria-hidden="true" />{eyebrow}</span>
        <strong className="mt-1 block break-words text-lg sm:text-[22px] font-bold leading-[1.2] tracking-tight text-ink-primary">{title}</strong>
        <span className="mt-1 block max-w-[340px] break-words text-xs leading-snug text-ink-muted">{description}</span>
        <span className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-xl border border-ice/25 bg-ice/[0.085] px-3 text-xs font-bold text-ice transition-colors group-hover:bg-ice/[0.13]">{ctaLabel}<ArrowUpRight size={13} aria-hidden="true" /></span>
      </span>
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl border shadow-sm transition-transform motion-safe:group-active:scale-95" style={{borderColor:`${color}35`,backgroundColor:`${color}14`,color}} aria-hidden="true"><HeartPulse size={19}/></span>
    </button>
    <div className={`border-t border-surface-border/35 bg-surface/25 px-3.5 ${quietRoutine ? "pb-1.5 pt-1.5" : "pb-2.5 pt-2"}`}>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium text-ink-muted">
        <span>Rotina programada de hoje</span><span className="font-mono tabular-nums text-ink-primary">{scheduled > 0 ? `${safeCompleted}/${scheduled}` : "Sem horários"}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised ring-1 ring-inset ring-surface-border/30" role="progressbar" aria-label="Progresso da rotina programada" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeProgress} aria-valuetext={scheduled>0?`${safeCompleted} doses resolvidas de ${scheduled} previstas` : "Sem horários programados"}>
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 transition-[width] duration-300 motion-reduce:transition-none" style={{width:`${safeProgress}%`}} />
      </div>
      <p className="sr-only" role="note">{homeRoutineSummaryNote(scheduled, safeCompleted)}</p>
    </div>
  </>;
});
