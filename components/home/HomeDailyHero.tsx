"use client";
import { memo, type ReactNode } from "react";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { homeRoutineSummaryNote } from "@/lib/home/routine-summary-note";

type Props = {
  eyebrow: string; title: string; description: string; color: string;
  completed: number; scheduled: number; progress: number;
  onOpen: () => void; onOpenToday?: () => void; ctaLabel?: string;
  indicators?: ReactNode; contextLabel?: string;
};
/** P7: routine summary and its four indicators share one calm visual surface.
 * All values are supplied by the existing Home authorities; no new computations.
 */
export const HomeDailyHero = memo(function HomeDailyHero({
  completed, scheduled, progress, onOpen, onOpenToday, ctaLabel, indicators, title, description,
}: Props) {
  const safeProgress = scheduled > 0 && Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  const safeCompleted = scheduled > 0 && Number.isFinite(scheduled) && Number.isFinite(completed) ? Math.max(0, Math.min(Math.floor(scheduled), Math.floor(completed))) : 0;
  const quietRoutine = scheduled <= 0 || safeCompleted >= scheduled;
  return (
    <div className="overflow-hidden rounded-[22px] bg-surface/55" aria-label="Resumo unificado da rotina">
      <button type="button" onClick={onOpen}
        className={`flex ${quietRoutine ? "min-h-[86px]" : "min-h-[104px]"} w-full items-center justify-between gap-3 px-3.5 py-3 text-left motion-reduce:transition-none active:bg-surface-raised/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice`}
        aria-label={`Rotina programada de hoje: ${scheduled>0?`${safeCompleted} de ${scheduled} doses confirmadas`:"sem horários programados"}. ${ctaLabel || "Abrir Hoje"}`}>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300"><CalendarDays size={14}/>Rotina programada de hoje <span className="font-normal normal-case tracking-normal text-ink-muted">· contínuos</span></span>
          <span className="mt-1 block font-display text-[15px] font-bold leading-tight text-ink-primary">{title}</span>
          <span className="mt-1 block text-[11px] leading-relaxed text-ink-secondary">{description}</span>
          <span className="mt-1 block font-display text-xl font-bold tabular-nums text-ink-primary">{scheduled>0?`${safeCompleted}/${scheduled}`:"Sem horários"}</span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-raised ring-1 ring-inset ring-surface-border/30"
            role="progressbar" aria-label="Progresso da rotina programada" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeProgress}
            aria-valuetext={scheduled>0?`${safeCompleted} doses resolvidas de ${scheduled} previstas`:"Sem horários programados"}>
            <span className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-[width] motion-reduce:transition-none" style={{width:`${safeProgress}%`}}/>
          </span>
          {/* Next scheduled dose stays in Hoje/Medicamentos, never in the routine hero. */}
          <span className="sr-only" role="note">{homeRoutineSummaryNote(scheduled, safeCompleted)} Home: horários de contínuos. Hoje e Medicamentos podem incluir outros tipos de doses programadas. Estes totais têm critérios distintos.</span>
        </span>
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/[.065] text-emerald-300">{scheduled>0 && quietRoutine ? <CheckCircle2 size={22}/> : <CalendarDays size={22}/>}</span>
      </button>
      {indicators}
    </div>
  );
});
