"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { MedicationCareOpportunity } from "@/lib/health-intelligence/medication-care-opportunities";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";

type Props = {
  items: readonly MedicationCareOpportunity[];
  onNavigate: (href: string) => void;
};

/** Secondary operational queue: real medication identity and evidence, no extra fetches. */
export function MedicationCareOpportunityQueue({ items, onNavigate }: Props) {
  if (items.length === 0) return null;
  return (
    <details className="group mt-3 overflow-hidden rounded-2xl border border-surface-border/60 bg-surface/70">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-ink-primary">Mais {items.length} medicamento{items.length === 1 ? "" : "s"} para acompanhar</span>
          <span className="mt-0.5 block text-[11px] text-ink-muted">Outras ações de estoque, receita, compra e retirada</span>
        </span>
        <ChevronDown size={17} aria-hidden="true" className="shrink-0 text-ice transition-transform group-open:rotate-180" />
      </summary>
      <ul className="space-y-2 border-t border-surface-border/40 p-2.5">
        {items.map((item) => (
          <li key={item.id} className="overflow-hidden rounded-xl border border-surface-border/50 bg-surface-raised/55">
            <button type="button" onClick={() => onNavigate(item.medicationHref)}
              className="flex min-h-12 w-full items-center gap-2.5 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-void/50" aria-hidden="true">
                <MedicationFormatIcon formato={item.formato} cores={item.cores} size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-xs text-ink-primary">{item.medicamentoNome}</strong>
                <span className="mt-0.5 block truncate text-[11px] text-ink-muted">{item.careStageLabel}{item.treatmentName ? ` · ${item.treatmentName}` : ""}</span>
              </span>
              <ChevronRight size={15} className="shrink-0 text-ink-faint" aria-hidden="true" />
            </button>
            <div className="flex items-center justify-between gap-2 border-t border-surface-border/35 px-3 py-2">
              <span className={`min-w-0 text-[10px] ${item.level === "urgent" ? "text-coral" : item.level === "attention" ? "text-amber-300" : "text-ice"}`}>
                {item.level === "urgent" ? "Atenção prioritária" : item.level === "attention" ? "Atenção" : "Planejamento"}
              </span>
              <button type="button" onClick={() => onNavigate(item.actionHref)}
                className="min-h-10 shrink-0 rounded-lg border border-ice/25 bg-ice/[0.08] px-3 text-[11px] font-bold text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
                {item.actionLabel}
              </button>
            </div>
            {item.evidence.length > 0 && (
              <details className="border-t border-surface-border/30 px-3 py-1.5">
                <summary className="min-h-9 cursor-pointer py-2 text-[10px] font-semibold text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Por que esta ação aparece?</summary>
                <ul className="space-y-1 pb-2 text-[10px] leading-relaxed text-ink-muted">
                  {Array.from(new Set(item.evidence.map(value => value.trim()).filter(Boolean))).slice(0, 3).map((evidence, index) => (
                    <li key={`${item.id}-evidence-${index}`} className="flex gap-2"><span aria-hidden="true" className="text-ice">•</span><span>{evidence}</span></li>
                  ))}
                </ul>
                <p className="pb-1 text-[9px] text-ink-faint">Evidências de registros, não confirmação de tomada, compra ou retirada.</p>
              </details>
            )}
          </li>
        ))}
      </ul>
      <p className="px-3 pb-2 text-[10px] leading-relaxed text-ink-muted">Receita registrada, aquisição realizada e retirada concluída são eventos diferentes. A validade documental deve ser conferida.</p>
    </details>
  );
}
