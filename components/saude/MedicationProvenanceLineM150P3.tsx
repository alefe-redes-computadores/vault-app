"use client";
import { medicationListProvenanceM150P3, type ListProvenanceInputM150P3 } from "@/lib/medications/medication-list-provenance-m150-p3";
import { MedicationProvenanceBadge } from "@/components/saude/MedicationProvenanceBadge";

/** One accessible manufacturer chip + neutral origin/dose. No stock inference. */
export function MedicationProvenanceLineM150P3(props: ListProvenanceInputM150P3) {
  const summary = medicationListProvenanceM150P3(props);
  if (!summary.text) return null;
  const latest = (props.latestManufacturer || "").trim();
  const declared = (props.declaredManufacturer || "").trim();
  const manufacturer = latest || declared;
  const suffix = manufacturer && summary.text.startsWith(manufacturer)
    ? summary.text.slice(manufacturer.length).replace(/^\s*·\s*/, "")
    : summary.text;
  return <span data-medication-provenance="compact" title={summary.evidence}
    aria-label={summary.evidence} className="flex min-w-0 max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium leading-snug text-ink-secondary">
    {manufacturer ? <MedicationProvenanceBadge name={manufacturer} source={latest ? "ultima_aquisicao" : "etiqueta"} /> : null}
    {suffix ? <span className="min-w-0 max-w-full break-words">{suffix}</span> : null}
  </span>;
}
