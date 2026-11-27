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
  compact?: boolean;
  flowLayoutH01?: boolean;
};

/** P14 R6 — UI-only summary: never interprets a dose as taken or changes stock. */
export function MedicationOperationalStrip({today,stockLabel,stockDetail,stockTone,doseOutcome,compact=false,flowLayoutH01=false}:Props) {
  const tone=stockTone==="empty"?"text-coral":stockTone==="low"?"text-amber-400":stockTone==="unknown"?"text-ink-muted":"text-emerald-400";
  const redundantEmptyDetail = stockTone === "empty" && /^(?:[≈~=]\s*)?0\s+(?:dose|doses|unidade|unidades)\b/i.test(stockDetail.trim());
  const repeatedEmptyStatusH01 = flowLayoutH01 && stockTone === "empty" && /^(?:sem estoque|estoque zerado|saldo registrado zerado)[.!]?$/i.test(stockDetail.trim());
  const showStockDetail = !compact && !redundantEmptyDetail && !repeatedEmptyStatusH01 && (stockTone === "empty" || stockTone === "unknown" || stockTone === "low") && !!stockDetail.trim() && stockDetail.trim() !== stockLabel.trim();
  return <div data-vault-h01-operational-strip={flowLayoutH01?"true":undefined} className={flowLayoutH01 ? (compact ? "mt-0 grid min-w-0 gap-0 text-[11px] leading-tight" : "mt-0 grid min-w-0 gap-1 text-xs leading-snug") : (compact ? "mt-0 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0 border-t-0 pt-0 text-[10px] leading-[1.05rem]" : "mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0 border-t-0 pt-0 text-[10px] leading-snug")}
    aria-label={`Hoje: ${today.label}. Estoque: ${stockLabel}. ${stockDetail}`}
    title={`${today.detail} · ${stockDetail}`}>
    <span data-vault-h01-dose={flowLayoutH01?"true":undefined} className={`flex min-w-0 items-center gap-1 font-semibold ${compact ? "min-h-[18px]" : "min-h-6"} ${today.tone}`}>
      {doseOutcome==="ignored"?<MinusCircle size={12} className="shrink-0"/>:doseOutcome==="completed"?<CheckCircle2 size={12} className="shrink-0"/>:<Circle size={11} className="shrink-0"/>}
      <span className="min-w-0 whitespace-normal break-words">{today.label}</span>
    </span>
    {!flowLayoutH01 && !compact && <span aria-hidden="true" className="h-3 w-px bg-surface-border/60" />}
    <span data-vault-h01-stock={flowLayoutH01?"true":undefined} className={`flex min-w-0 items-center gap-1 font-semibold ${compact ? "min-h-[18px]" : "min-h-6"} ${tone}`}>
      <Package size={12} className="shrink-0"/>
      <span className="min-w-0 whitespace-normal break-words">{stockLabel}{flowLayoutH01 && showStockDetail ? <span className="block font-normal text-[10px] text-ink-muted" role="note">{stockDetail}</span> : null}</span>
      {!flowLayoutH01 && showStockDetail ? <span className="min-w-0 whitespace-normal break-words text-[10px] font-normal text-ink-muted" role="note">· {stockDetail}</span> : null}
    </span>
  </div>;
}
