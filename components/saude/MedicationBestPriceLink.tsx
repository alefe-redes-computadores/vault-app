"use client";

import { Award, ChevronRight } from "lucide-react";

/** A historical purchase comparison is not a current or guaranteed retail price. */
export function MedicationBestPriceLink({mean, purchases, label, onOpen}:{mean:number;purchases:number;label:string;onOpen:()=>void}) {
  if(!Number.isFinite(mean) || mean < 0 || !Number.isFinite(purchases) || purchases <= 0) return null;
  return <button type="button" onClick={onOpen}
    aria-label="Ver aquisições usadas no cálculo do melhor preço médio"
    className="flex min-h-12 w-full items-center gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-left transition-colors active:bg-emerald-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
    <Award size={16} className="shrink-0 text-emerald-400" aria-hidden="true"/>
    <span className="min-w-0 flex-1 text-xs leading-relaxed text-ink-primary" title="Menor média registrada entre as aquisições realizadas. Não é cotação atual.">
      {label} <strong className="text-emerald-400">R$ {mean.toFixed(2).replace(".",",")}</strong>
      <span className="text-ink-muted"> · {purchases} compra{purchases===1?"":"s"} no histórico</span>
    </span>
    <ChevronRight size={15} className="shrink-0 text-emerald-400" aria-hidden="true"/>
  </button>;
}
