"use client";

import { CheckCircle2, Circle, Package, MinusCircle } from "lucide-react";

type StockTone = "empty" | "low" | "known" | "unknown";
type DoseOutcome = "ignored" | "completed" | "unconfirmed";
type Props = {
  today: { label: string; detail: string; tone: string };
  stockLabel: string;
  stockDetail: string;
  stockTone: StockTone;
  doseOutcome: DoseOutcome;
};

/** P14 R6 — UI-only summary: never interprets a dose as taken or changes stock. */
export function MedicationOperationalStrip({today,stockLabel,stockDetail,stockTone,doseOutcome}:Props) {
  const tone=stockTone==="empty"?"text-coral":stockTone==="low"?"text-amber-400":stockTone==="unknown"?"text-ink-muted":"text-emerald-400";
  return <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-surface-border/25 pt-1 text-[10px] leading-snug"
    aria-label={`Hoje: ${today.label}. Estoque: ${stockLabel}. ${stockDetail}`}
    title={`${today.detail} · ${stockDetail}`}>
    <span className={`flex min-h-6 min-w-0 items-center gap-1 font-semibold ${today.tone}`}>
      {doseOutcome==="ignored"?<MinusCircle size={12} className="shrink-0"/>:doseOutcome==="completed"?<CheckCircle2 size={12} className="shrink-0"/>:<Circle size={11} className="shrink-0"/>}
      <span className="min-w-0 truncate">{today.label}</span>
    </span>
    <span aria-hidden="true" className="h-3 w-px bg-surface-border/60" />
    <span className={`flex min-h-6 min-w-0 items-center gap-1 font-semibold ${tone}`}>
      <Package size={12} className="shrink-0"/>
      <span className="min-w-0 truncate">{stockLabel}</span>
    </span>
    {(stockTone === "empty" || stockTone === "unknown" || stockTone === "low") && stockDetail.trim() && stockDetail.trim() !== stockLabel.trim() ? (
      <span className="basis-full truncate text-[10px] text-ink-muted" role="note">{stockDetail}</span>
    ) : null}
  </div>;
}
