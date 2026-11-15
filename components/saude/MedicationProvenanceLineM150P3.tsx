"use client";
import { medicationListProvenanceM150P3, type ListProvenanceInputM150P3 } from "@/lib/medications/medication-list-provenance-m150-p3";
import { medicationProvenanceChipsP5P4 } from "@/lib/medications/medication-provenance-chips-p5-p4";
import { MedicationProvenanceBadge } from "@/components/saude/MedicationProvenanceBadge";

/** One manufacturer chip plus separate acquisition and scheduled-dose chips.
 * Origin is a cadastro/historical clue, never proof of present physical supply. */
export function MedicationProvenanceLineM150P3(props: ListProvenanceInputM150P3) {
  const summary = medicationListProvenanceM150P3(props);
  if (!summary.text) return null;
  const latest = (props.latestManufacturer || "").trim();
  const declared = (props.declaredManufacturer || "").trim();
  const manufacturer = latest || declared;
  const chips = medicationProvenanceChipsP5P4(props);
  const originTone = chips.origin?.tone==='public'
    ? 'border-sky-400/30 bg-sky-400/[.08] text-sky-300'
    : chips.origin?.tone==='private'
      ? 'border-amber-400/30 bg-amber-400/[.08] text-amber-300'
      : 'border-surface-border/70 bg-surface-raised/50 text-ink-secondary';
  return <span data-medication-provenance="compact" title={summary.evidence}
    aria-label={summary.evidence} className="flex min-w-0 max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] font-medium leading-snug text-ink-secondary">
    {manufacturer ? <MedicationProvenanceBadge name={manufacturer} source={latest ? "ultima_aquisicao" : "etiqueta"} /> : null}
    {chips.origin ? <span data-acquisition-origin={chips.origin.tone} className={`inline-flex min-h-6 max-w-full items-center rounded-full border px-2.5 py-0.5 font-semibold ${originTone}`} title={summary.evidence}>{chips.origin.label}</span> : null}
    {chips.dose ? <span data-dose-kind="scheduled" className="inline-flex min-h-6 max-w-full items-center rounded-full border border-orange-400/25 bg-orange-400/[.07] px-2.5 py-0.5 font-semibold text-orange-300" title="Dose cadastrada; não comprova tomada">{chips.dose.label}</span> : null}
  </span>;
}
