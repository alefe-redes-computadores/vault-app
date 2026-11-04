"use client";

import { CheckCircle2, Circle, Droplet, MinusCircle } from "lucide-react";

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
  return <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 py-1.5 text-xs leading-snug"
    aria-label={`Hoje: ${today.label}. Estoque: ${stockLabel}. ${stockDetail}`}
    title={`${today.detail} · ${stockDetail}`}>
    <span className={`inline-flex min-h-8 min-w-0 items-center gap-1.5 rounded-xl border border-surface-border/55 bg-surface-raised/45 px-2.5 py-1 font-semibold ${today.tone}`}>
      {doseOutcome==="ignored"?<MinusCircle size={12} className="shrink-0"/>:doseOutcome==="completed"?<CheckCircle2 size={12} className="shrink-0"/>:<Circle size={11} className="shrink-0"/>}
      <span className="min-w-0 break-words">{today.label}</span>
    </span>
    <span className={`inline-flex min-h-8 min-w-0 items-center gap-1.5 rounded-xl border border-surface-border/55 bg-surface-raised/45 px-2.5 py-1 font-semibold ${tone}`}>
      <Droplet size={11} className="shrink-0"/>
      <span className="min-w-0 break-words">{stockLabel}</span>
    </span>
    {(stockTone === "empty" || stockTone === "unknown" || stockTone === "low") && stockDetail.trim() && stockDetail.trim() !== stockLabel.trim() ? (
      <span className="w-full break-words text-[11px] leading-snug text-ink-muted" role="note">{stockDetail}</span>
    ) : null}
  </div>;
}
