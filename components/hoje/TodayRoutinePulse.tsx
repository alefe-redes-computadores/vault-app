"use client";

import { memo } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

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
  return (
    <div className="mt-2 rounded-xl border border-surface-border/40 bg-surface-raised/50 px-3 py-2" aria-label={isFuturo ? "Resumo de doses previstas" : "Resumo da rotina registrada"}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-semibold">
          <span className={isFuturo ? "inline-flex items-center gap-1 text-ice" : "inline-flex items-center gap-1 text-coral"}>
            <AlertTriangle size={12} aria-hidden="true" />{pendingText}
          </span>
          {!isFuturo && <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 size={12} aria-hidden="true" />{completed} concluída{completed === 1 ? "" : "s"}</span>}
          {!isFuturo && ignored > 0 && <span className="inline-flex items-center gap-1 text-ink-muted"><XCircle size={12} aria-hidden="true" />{ignored} ignorada{ignored === 1 ? "" : "s"}</span>}
        </div>
        <div className="shrink-0 text-right">
          <strong className="font-mono text-sm font-bold tabular-nums text-ice">{isFuturo ? projected : `${safePercentage}%`}</strong>
          <span className="ml-1 text-[9px] text-ink-faint">{isFuturo ? "previstas" : "rotina"}</span>
        </div>
      </div>
      {!isFuturo && recorded > 0 && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-void/60" role="progressbar" aria-label="Progresso de doses registradas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safePercentage}>
          <div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${safePercentage}%` }} />
        </div>
      )}
    </div>
  );
});
