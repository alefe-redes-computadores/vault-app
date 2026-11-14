"use client";
import { medicationListProvenanceM150P3, type ListProvenanceInputM150P3 } from "@/lib/medications/medication-list-provenance-m150-p3";

/** One compact line; separate factual sources are never merged in the database. */
export function MedicationProvenanceLineM150P3(props: ListProvenanceInputM150P3) {
  const summary = medicationListProvenanceM150P3(props);
  if (!summary.text) return null;
  return <span data-medication-provenance="compact" title={summary.evidence}
    aria-label={summary.evidence} className="block min-w-0 max-w-full truncate text-[10px] font-medium leading-snug text-ink-secondary">
    {summary.text}
  </span>;
}
