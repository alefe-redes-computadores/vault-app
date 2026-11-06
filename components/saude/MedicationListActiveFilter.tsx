"use client";
import type { MedicationListPresentation } from "@/lib/health-intelligence/medication-list-presentation";

/** A single line replaces the ambiguous empty state and tells what is filtered. */
export function MedicationListActiveFilter({view,onClear}:{view:MedicationListPresentation;onClear:()=>void}){
  if(!view.active)return null;
  return <div role="status" aria-live="polite" className="mb-2 flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-xl border border-ice/15 bg-ice/[0.035] px-3 py-1.5">
    <span className="min-w-0 text-xs text-ink-secondary"><strong className="block max-w-full break-words line-clamp-2 text-ink-primary" title={view.title}>{view.title}</strong><span className="block break-words text-ink-muted">{view.countLabel}</span></span>
    <button type="button" onClick={onClear} className="min-h-11 shrink-0 rounded-xl border border-ice/20 bg-ice/10 px-2.5 text-xs font-semibold text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Limpar filtros</button>
  </div>;
}
