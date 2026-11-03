"use client";

import { ShieldCheck } from "lucide-react";
import type { BrainCarePlanItem } from "@/lib/health-intelligence/care-plan";

const evidenceLabel: Record<BrainCarePlanItem["evidenceKind"], string> = {
  recorded: "Registro existente", projected: "Estimativa identificada",
  association: "Associação temporal", missing_data: "Informação ausente",
};
const confidenceLabel: Record<BrainCarePlanItem["confidence"], string> = {
  high: "alta", moderate: "moderada", limited: "limitada",
};
const limitations: Record<BrainCarePlanItem["evidenceKind"], string> = {
  recorded: "Confirme o dado na origem antes de concluir a ação.",
  projected: "Uma previsão não representa compra, dose ou retirada realizada.",
  association: "Coincidência temporal não comprova causa ou efeito clínico.",
  missing_data: "Ausência de registro não comprova que o evento não ocorreu.",
};

/** One accessible explanation pattern shared across every operational presentation. */
export function VaultBrainEvidence({ item, compact = false }: { item: BrainCarePlanItem; compact?: boolean }) {
  return <details className="group border-t border-surface-border/40">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-left text-[11px] font-semibold text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
      <ShieldCheck size={14} className="text-violet-200" aria-hidden="true" />
      <span className="flex-1">Por que esta sugestão?</span>
      <span className="text-[10px] text-ink-faint">{evidenceLabel[item.evidenceKind]}</span>
    </summary>
    <div className="space-y-2 px-3 pb-3 text-[11px] leading-relaxed text-ink-muted">
      <p>{limitations[item.evidenceKind]}</p>
      <p>Confiança {confidenceLabel[item.confidence]} · prioridade operacional {item.priorityScore}. Uma sugestão não executa registros automaticamente.</p>
      {item.evidence.length > 0 && <ul className="list-disc space-y-1 pl-4">{item.evidence.slice(0, compact ? 3 : 6).map((evidence, i) => <li key={`${i}:${evidence}`}>{evidence}</li>)}</ul>}
      {item.dueDate ? <p>Data de referência: {item.dueDate.split("-").reverse().join("/")}</p> : null}
    </div>
  </details>;
}
