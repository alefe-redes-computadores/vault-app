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
  return <div className="mt-1.5 grid min-w-0 grid-cols-1 gap-1.5 py-0.5 text-[11px] leading-snug min-[320px]:grid-cols-2"
    aria-label={`Hoje: ${today.label}. Estoque: ${stockLabel}. ${stockDetail}`}
    title={`${today.detail} · ${stockDetail}`}>
    <span className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl border border-surface-border/55 bg-surface-raised/55 px-2.5 py-1.5 font-semibold ${today.tone}`}>
      {doseOutcome==="ignored"?<MinusCircle size={12} className="shrink-0"/>:doseOutcome==="completed"?<CheckCircle2 size={12} className="shrink-0"/>:<Circle size={11} className="shrink-0"/>}
      <span className="min-w-0 break-words">{today.label}</span>
    </span>
    <span className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl border border-surface-border/55 bg-surface-raised/55 px-2.5 py-1.5 font-semibold ${tone}`}>
      <Package size={12} className="shrink-0"/>
      <span className="min-w-0 break-words">{stockLabel}</span>
    </span>
    {(stockTone === "empty" || stockTone === "unknown" || stockTone === "low") && stockDetail.trim() && stockDetail.trim() !== stockLabel.trim() ? (
      <span className="min-w-0 break-words text-[11px] leading-relaxed text-ink-muted min-[320px]:col-span-2" role="note">{stockDetail}</span>
    ) : null}
  </div>;
}
