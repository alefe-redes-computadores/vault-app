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
  return <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-violet-300/10 bg-violet-300/[0.035] px-2.5 py-2 text-[10px] leading-relaxed text-ink-muted" role="note">
    <Info size={13} className="mt-0.5 shrink-0 text-violet-200" aria-hidden="true"/>
    <span>
      <strong className="mr-1 text-violet-200">{clarity.label}.</strong>
      {source === "brain" ? "Prioridade sugerida pelo Brain a partir do contexto disponível. " : "Etapa calculada a partir dos registros disponíveis. "}
      {available ? `${safeCount} ${safeCount === 1 ? "descrição disponível" : "descrições disponíveis"} para conferência. ` : "Nenhuma evidência detalhada foi informada nesta etapa. "}
      {routeRecorded ? "A origem registrada não comprova retirada, compra concluída nem validade da receita." : "Origem do fornecimento ainda não comprovada nesta visão."}
      {stageNote ? ` ${stageNote}` : ""}
      <span className="block pt-1 text-ink-faint">{clarity.explanation}</span>
    </span>
  </p>;
}
