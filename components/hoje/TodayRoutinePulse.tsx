"use client";

import { memo } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import { todayTemporalGuidance } from "@/lib/today/today-temporal-guidance";

type Props = {
  isHoje: boolean;
  isPassado: boolean;
  isFuturo: boolean;
  pending: number;
  unconfirmed: number;
  completed: number;
  ignored: number;
  recorded: number;
  projected: number;
  percentage: number;
};

/** P14 R3 — Resumo visual puro. Nenhuma mutação de doses, estoque ou sync. */
export const TodayRoutinePulse = memo(function TodayRoutinePulse({
  isHoje, isPassado, isFuturo, pending, unconfirmed, completed, ignored, recorded, projected, percentage,
}: Props) {
  // Previsão e registro não são a mesma autoridade clínica.
  const pendingText = isHoje
    ? `${pending} pendente${pending === 1 ? "" : "s"}`
    : `${unconfirmed} ${isPassado ? "sem confirmação" : "previstas"}`;
  const safePercentage = Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 0;
  const temporalGuidance = todayTemporalGuidance({ isFuturo, isPassado, recorded, unconfirmed });
  return (
    <div className="mt-2 rounded-2xl border border-surface-border/40 bg-surface-raised/50 px-3.5 py-3" data-temporal-authority={isFuturo ? "projected" : isPassado ? "historical" : "today"} aria-live="polite" aria-atomic="true" aria-label={isFuturo ? "Resumo de doses previstas" : "Resumo da rotina registrada"}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold">
          <span className={isFuturo ? "inline-flex items-center gap-1 text-violet-300" : isPassado ? "inline-flex items-center gap-1 text-ink-muted" : pending > 0 ? "inline-flex items-center gap-1 text-amber-300" : "inline-flex items-center gap-1 text-emerald-300"}>
            {isHoje ? <AlertTriangle size={12} aria-hidden="true" /> : <CalendarDays size={12} aria-hidden="true" />}{pendingText}
          </span>
          {!isFuturo && <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 size={12} aria-hidden="true" />{completed} concluída{completed === 1 ? "" : "s"}</span>}
          {!isFuturo && ignored > 0 && <span className="inline-flex items-center gap-1 text-ink-muted"><XCircle size={12} aria-hidden="true" />{ignored} ignorada{ignored === 1 ? "" : "s"}</span>}
        </div>
        <div className="shrink-0 text-right">
          <strong className={`font-mono text-sm font-bold tabular-nums ${isFuturo ? "text-violet-300" : "text-ink-primary"}`}>{isFuturo ? projected : isPassado && recorded===0 ? "—" : `${safePercentage}%`}</strong>
          <span className="ml-1 text-[11px] text-ink-muted">{isFuturo ? "previstas" : isPassado && recorded===0 ? "sem registros" : "rotina"}</span>
        </div>
      </div>
      <span className="sr-only">{isFuturo ? "Planejamento futuro não significa dose tomada." : isPassado ? "Sem confirmação histórica não significa dose ignorada." : "Doses ignoradas e pendentes não contam como tomadas."}</span>
      {temporalGuidance && <p className="mt-2 text-[11px] leading-relaxed text-ink-muted" role="note">{temporalGuidance}</p>}
      {!isFuturo && recorded > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-void/60" role="progressbar" aria-label="Progresso de doses registradas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safePercentage} aria-valuetext={`${completed} concluídas, ${ignored} ignoradas, ${unconfirmed} sem confirmação`}>
          <div className="h-full rounded-full bg-emerald-400 transition-[width] motion-reduce:transition-none" style={{ width: `${safePercentage}%` }} />
        </div>
      )}
    </div>
  );
});
