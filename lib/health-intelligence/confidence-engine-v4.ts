import type { HealthInsight } from "@/lib/health-insights";
import type { EvidenceLedgerV4 } from "@/lib/health-intelligence/evidence-ledger-v4";

export type ConfidenceAssessmentV4 = {
  current: HealthInsight["confianca"];
  proposed: HealthInsight["confianca"];
  score: number;
  reasons: string[];
  shadowOnly: true;
};

function label(score: number): HealthInsight["confianca"] {
  if (score >= 70) return "alta";
  if (score >= 42) return "media";
  return "baixa";
}

export function assessInsightConfidenceV4(
  insight: HealthInsight,
  ledger: EvidenceLedgerV4
): ConfidenceAssessmentV4 {
  const sampleScore = Math.min(35, Math.log2(Math.max(1, ledger.sampleSize) + 1) * 10);
  const coverageScore = ledger.coverageRatio === null ? 8 : ledger.coverageRatio * 30;
  const sourceScore = Math.min(20, ledger.provenance.length * 5);
  const evidenceScore = Math.min(15, ledger.evidence.length * 3);
  const penalty = Math.min(30, ledger.missingData.length * 10);
  const score = Math.max(0, Math.min(100, Math.round(sampleScore + coverageScore + sourceScore + evidenceScore - penalty)));

  const reasons = [
    `Amostra: ${ledger.sampleSize}`,
    ledger.coverageRatio === null
      ? "Cobertura temporal: não estruturada"
      : `Cobertura temporal: ${Math.round(ledger.coverageRatio * 100)}%`,
    `Proveniência: ${ledger.provenance.length} fonte(s)`,
    `Evidências estruturadas: ${ledger.evidence.length}`,
    ...(ledger.missingData.length ? ledger.missingData : ["Sem lacuna estrutural relevante detectada."]),
  ];

  return {
    current: insight.confianca,
    proposed: label(score),
    score,
    reasons,
    shadowOnly: true,
  };
}
