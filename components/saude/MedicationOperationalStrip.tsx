"use client";

import { CheckCircle2, Circle, Droplet, MinusCircle } from "lucide-react";

type StockTone = "empty" | "low" | "known";
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
  const tone=stockTone==="empty"?"text-coral":stockTone==="low"?"text-amber-400":"text-emerald-400";
  return <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-surface-border/25 bg-void/20 px-2 py-1 text-[10px] leading-snug"
    aria-label={`Hoje: ${today.label}. Estoque: ${stockLabel}. ${stockDetail}`}
    title={`${today.detail} · ${stockDetail}`}>
    <span className={`inline-flex min-w-0 items-center gap-1 font-semibold ${today.tone}`}>
      {doseOutcome==="ignored"?<MinusCircle size={12} className="shrink-0"/>:doseOutcome==="completed"?<CheckCircle2 size={12} className="shrink-0"/>:<Circle size={11} className="shrink-0"/>}
      <span className="min-w-0 break-words">{today.label}</span>
    </span>
    <span className="text-ink-faint" aria-hidden="true">·</span>
    <span className={`inline-flex min-w-0 items-center gap-1 font-semibold ${tone}`}>
      <Droplet size={11} className="shrink-0"/>
      <span className="min-w-0 break-words">{stockLabel}</span>
    </span>
  </div>;
}
