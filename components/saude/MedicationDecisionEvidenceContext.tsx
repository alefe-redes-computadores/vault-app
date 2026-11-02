"use client";

import { Info } from "lucide-react";
import { medicationStageGuidance } from "@/lib/health-intelligence/medication-stage-guidance";
import { medicationEvidenceClarity } from "@/lib/health-intelligence/medication-evidence-clarity";

/** Read-only disclosure. A route, document or future event never certifies supply, stock or prescription validity. */
export function MedicationDecisionEvidenceContext({ source, routeRecorded, evidenceCount, stage }: {
  source: "brain" | "record";
  routeRecorded: boolean;
  evidenceCount: number;
  stage?: string;
}) {
  const available = Number.isFinite(evidenceCount) && evidenceCount > 0;
  const stageNote = medicationStageGuidance(stage);
  const safeCount = Number.isSafeInteger(evidenceCount) ? Math.max(0, evidenceCount) : 0;
  const clarity = medicationEvidenceClarity(source, safeCount, routeRecorded);
  return <p className="mt-3 flex items-start gap-3 rounded-2xl border border-surface-border/55 bg-surface-raised/40 px-3.5 py-3.5 text-[11px] leading-relaxed text-ink-muted" role="note">
    <Info size={13} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true"/>
    <span>
      <strong className="mr-1 text-ink-primary">{clarity.label}.</strong>
      {source === "brain" ? "Prioridade sugerida pelo Brain a partir do contexto disponível. " : "Etapa calculada a partir dos registros disponíveis. "}
      {available ? `${safeCount} ${safeCount === 1 ? "descrição disponível" : "descrições disponíveis"} para conferência. ` : "Nenhuma evidência detalhada foi informada nesta etapa. "}
      {routeRecorded ? "A origem registrada não comprova retirada, compra concluída nem validade da receita." : "Origem do fornecimento ainda não comprovada nesta visão."}
      {stageNote ? ` ${stageNote}` : ""}
      <span className="block pt-1 text-ink-faint">{clarity.explanation}</span>
    </span>
  </p>;
}
