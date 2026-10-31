"use client";

import { memo } from "react";
import { ListChecks } from "lucide-react";

type Props = {
  count: number;
  processing: boolean;
  disabled: boolean;
  onClick: () => void;
};

/** P14 R4 — Ação visual apenas. A autoridade de lote, estoque e idempotência fica no Hoje. */
export const TodayBatchAction = memo(function TodayBatchAction({count,processing,disabled,onClick}:Props){
  if (count < 2) return null;
  return <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.055] p-2.5" aria-label="Revisão de doses em lote">
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300" aria-hidden="true"><ListChecks size={17}/></span>
    <div className="min-w-0 flex-1">
      <strong className="block text-xs font-semibold text-ink-primary">{count} doses para revisar</strong>
      <span className="block text-[10px] leading-snug text-ink-muted">Somente vencidas ou para agora; SOS e futuras ficam de fora.</span>
    </div>
    <button type="button" disabled={disabled} onClick={onClick}
      className="min-h-11 shrink-0 rounded-xl bg-emerald-400 px-3 text-[11px] font-bold text-void active:scale-[.98] disabled:cursor-wait disabled:opacity-50">
      {processing ? "Registrando..." : "Tomar todas"}
    </button>
  </div>;
});
