"use client";
import { ChevronDown, Info } from "lucide-react";

/** Explains simultaneous read-only counts; never merges medication/dose authorities. */
export function MedicationScopeReconciliation({ listActiveCount, brainActiveCount }: {
  listActiveCount: number;
  brainActiveCount: number;
}) {
  if (!Number.isFinite(listActiveCount) || !Number.isFinite(brainActiveCount) || listActiveCount === brainActiveCount) return null;
  return <div className="mt-1.5 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] p-2 text-[10px] leading-relaxed text-amber-100" role="status">
    <p className="flex items-start gap-1.5"><Info size={13} className="mt-0.5 shrink-0" aria-hidden="true"/><span className="min-w-0 flex-1">Lista: {listActiveCount} ativos · Brain: {brainActiveCount} acompanhados. Há diferença de escopo ou atualização; confira antes de interpretar os totais.</span></p>
    <details className="group mt-1 text-ink-muted">
      <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 font-semibold text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">Por que os números podem variar?<ChevronDown size={13} className="transition-transform group-open:rotate-180 motion-reduce:transition-none"/></summary>
      <p className="pb-1">A lista, os estados do Brain e as doses programadas têm critérios próprios. Confira a pessoa ativa, a sincronização e os medicamentos SOS. A diferença não significa erro clínico e nenhum registro foi alterado.</p>
    </details>
  </div>;
}
