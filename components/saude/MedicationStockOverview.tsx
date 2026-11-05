"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Info, Package } from "lucide-react";
import { useDismissibleDetails } from "@/hooks/useDismissibleDetails";

type Props = {
  statusLabel: string;
  statusColor: string;
  statusBackground: string;
  statusIcon: ReactNode;
  quantity: number;
  unit: string;
  equivalentMl: number | null;
  negative: boolean;
  registeredBalance: number | null;
  sos: boolean;
  daysRemaining: number | null;
  dosesAvailable: number | null;
  hasStockProjection: boolean;
  doseEstimatePossible: boolean;
  doseQuantity: number | null;
  referenceDay: string;
  dropsConversionMissing: boolean;
  formatWarning?: string | null;
  formatQuantity: (value: number) => string;
};

/** P15 R5: apresentação exclusivamente de leitura. O dossiê mantém toda a autoridade de estoque. */
export function MedicationStockOverview({
  statusLabel, statusColor, statusBackground, statusIcon, quantity, unit,
  equivalentMl, negative, registeredBalance, sos, daysRemaining,
  dosesAvailable, hasStockProjection, doseEstimatePossible, doseQuantity,
  referenceDay, dropsConversionMissing, formatWarning, formatQuantity,
}: Props) {
  const detailsRef = useDismissibleDetails();
  return (
    <div className="rounded-[18px] bg-surface p-3.5" aria-label="Resumo do estoque informado">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            <Package size={14} aria-hidden="true" /> Estoque Atual
          </p>
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase ${statusColor} ${statusBackground}`}>
            {statusIcon}{statusLabel}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <p className={`font-display text-2xl font-bold tabular-nums ${statusColor}`}>
            {formatQuantity(quantity)}
          </p>
          <span className="min-w-0 break-words text-sm font-medium text-ink-secondary">{unit}</span>
          {equivalentMl !== null && (
            <span className="text-xs text-ink-faint">≈ {formatQuantity(equivalentMl)} ml</span>
          )}
        </div>
        {formatWarning && <p role="note" className="mt-2 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.055] px-3 py-2 text-[11px] leading-relaxed text-amber-200"><Info size={14} className="mt-0.5 shrink-0" aria-hidden="true"/><span>{formatWarning} O saldo numérico não foi convertido.</span></p>}
        {negative && registeredBalance !== null && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-coral/20 bg-coral/10 p-3" role="status">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-coral" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-coral/90">
              Os registros de uso ultrapassaram o saldo informado. O saldo interno é{" "}
              <b>{formatQuantity(registeredBalance)} {unit}</b>. Revise o estoque físico para reconciliar o valor.
            </p>
          </div>
        )}
        {!sos && daysRemaining !== null && (
          <p className="mt-2 text-xs text-ink-muted">
            Estimativa: <b className="text-ink-primary">{daysRemaining} dia{daysRemaining === 1 ? "" : "s"}</b> na rotina configurada
          </p>
        )}
        {sos && dosesAvailable !== null && (
          <p className="mt-2 text-xs text-ink-muted">
            Aproximadamente <b className="text-ink-primary">{formatQuantity(dosesAvailable)}</b>{" "}
            dose{dosesAvailable === 1 ? "" : "s"} pela configuração atual.
          </p>
        )}
        {hasStockProjection && !doseEstimatePossible && quantity > 0 && (
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            O saldo está registrado, mas faltam dados para estimar quantas doses ele representa.
          </p>
        )}
      </div>
      <details ref={detailsRef} className="group mt-3 border-t border-surface-border/50 text-[11px] text-ink-muted">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-2.5 font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
          Origem do saldo e cálculo <span aria-hidden="true" className="text-ink-muted group-open:rotate-180">▾</span>
        </summary>
        <div className="flex flex-col gap-1.5 pb-2 sm:flex-row sm:justify-between">
          <span>Quantidade por dose: <b className="text-ink-primary">{doseQuantity !== null ? `${formatQuantity(doseQuantity)} ${unit}` : "Não configurada"}</b></span>
          <span>Saldo informado em: <b className="text-ink-primary">{referenceDay}</b></span>
        </div>
      </details>
      {dropsConversionMissing && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-surface-raised p-3">
          <Info size={13} className="mt-0.5 shrink-0 text-ice" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-ink-muted">
            Gotas por ml não está configurado. O Vault não fará conversão automática entre gotas e ml.
          </p>
        </div>
      )}
    </div>
  );
}
