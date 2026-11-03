"use client";
import { PackagePlus } from "lucide-react";

/** Opens the existing acquisition flow; it does not write stock or create a drug. */
export function MedicationRestockAction({ name, onOpen, label = "Repor estoque" }: { name: string; onOpen: () => void; label?: string }) {
  return <button type="button" onClick={event => { event.preventDefault(); event.stopPropagation(); onOpen(); }}
    aria-label={`${label} de ${name}`}
    className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-surface-border/60 bg-surface-raised/40 px-2.5 text-[11px] font-semibold text-ink-secondary transition-colors hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 motion-reduce:transition-none">
    <PackagePlus size={14} aria-hidden="true" /> {label}
  </button>;
}
