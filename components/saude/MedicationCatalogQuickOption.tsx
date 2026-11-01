"use client";

import { memo } from "react";
import { Check, FileSearch } from "lucide-react";
import type { MedicationCatalogQuickSearchResult } from "@/lib/medication-catalog/supabase-provider";

type Props = {
  result: MedicationCatalogQuickSearchResult;
  selected: boolean;
  onSelect: () => void | Promise<void>;
};

/** Apenas apresenta uma referência; hidratação e decisão ficam no formulário. */
export const MedicationCatalogQuickOption = memo(function MedicationCatalogQuickOption({ result, selected, onSelect }: Props) {
  return <button
    type="button"
    aria-pressed={selected}
    aria-label={`Usar referência ${result.canonicalName}`}
    onClick={onSelect}
    className={`flex min-h-14 w-full items-start gap-3 border-b border-surface-border/30 px-3.5 py-3 text-left transition-colors last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-300 motion-reduce:transition-none ${
      selected ? "bg-emerald-400/[0.07]" : "hover:bg-surface/80 active:bg-surface-raised"
    }`}
  >
    <FileSearch size={17} className="mt-0.5 shrink-0 text-violet-300" aria-hidden="true" />
    <span className="min-w-0 flex-1">
      <span className="block break-words text-sm font-semibold leading-snug text-ink-primary">{result.canonicalName}</span>
      <span className="mt-1 block text-[11px] text-ink-muted">{result.referenceType === "substance" ? "Princípio ativo" : "Referência do catálogo"}</span>
    </span>
    {selected ? <span className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.07] px-2 py-1 text-[10px] font-semibold text-emerald-200"><Check size={13} aria-hidden="true"/>Escolhida</span> : null}
  </button>;
});
