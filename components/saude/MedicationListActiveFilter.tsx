"use client";
import type { MedicationListPresentation } from "@/lib/health-intelligence/medication-list-presentation";

/** A single line replaces the ambiguous empty state and tells what is filtered. */
export function MedicationListActiveFilter({view,onClear}:{view:MedicationListPresentation;onClear:()=>void}){
  if(!view.active)return null;
  return <div role="status" aria-live="polite" className="mb-1 flex min-h-11 min-w-0 items-center gap-2">
    <span className="min-w-0 max-w-full break-words line-clamp-2 rounded-full border border-ice/20 bg-ice/[.04] px-3 py-1 text-xs font-semibold text-ink-primary" title={view.title}>{view.title} · {view.countLabel}</span>
    <button type="button" onClick={onClear} className="min-h-11 shrink-0 rounded-xl border border-ice/20 bg-ice/10 px-2.5 text-xs font-semibold text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">× Limpar</button>
  </div>;
}
