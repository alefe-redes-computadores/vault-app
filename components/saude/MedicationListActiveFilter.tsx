"use client";
import type { MedicationListPresentation } from "@/lib/health-intelligence/medication-list-presentation";

/** A single line replaces the ambiguous empty state and tells what is filtered. */
export function MedicationListActiveFilter({view,onClear}:{view:MedicationListPresentation;onClear:()=>void}){
  if(!view.active)return null;
  return <div role="status" aria-live="polite" className="mb-2 flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-xl border border-ice/15 bg-ice/[0.035] px-3 py-1.5">
    <span className="min-w-0 text-[11px] text-ink-secondary"><strong className="block truncate text-ink-primary">{view.title}</strong><span className="text-ink-muted">{view.countLabel}</span></span>
    <button type="button" onClick={onClear} className="min-h-9 shrink-0 rounded-lg border border-ice/20 bg-ice/10 px-2.5 text-[10px] font-semibold text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Limpar filtros</button>
  </div>;
}
