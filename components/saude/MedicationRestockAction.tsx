"use client";
import { PackagePlus } from "lucide-react";

/** Opens the existing acquisition flow; it does not write stock or create a drug. */
export function MedicationRestockAction({ name, onOpen, label = "Repor estoque", tone = "neutral" }: { name: string; onOpen: () => void; label?: string; tone?: "amber"|"neutral" }) {
  return <button type="button" onClick={event => { event.preventDefault(); event.stopPropagation(); onOpen(); }}
    aria-label={`${label} de ${name}`}
    className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 motion-reduce:transition-none ${tone==="amber"?"border-amber-400/35 bg-amber-400/[.10] text-amber-300 focus-visible:outline-amber-300":"border-surface-border/60 bg-surface-raised/40 text-ink-secondary hover:bg-surface-raised focus-visible:outline-emerald-300"}`}>
    <PackagePlus size={14} aria-hidden="true" /> {label}
  </button>;
}
