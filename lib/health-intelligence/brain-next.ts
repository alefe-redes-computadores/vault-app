import type { HealthInsight } from "@/lib/health-insights";

export type BrainDecisionLane = "now" | "next" | "follow_up" | "review_data";
export type BrainDomain = "medication" | "care" | "wellbeing" | "administrative" | "data";
export type BrainActionability = "direct" | "guided" | "observe";
export type BrainEvidenceQuality = "strong" | "moderate" | "limited";

export type BrainPriorityFactors = {
  severity: number;
  urgency: number;
  evidence: number;
  actionability: number;
  dataQualityPenalty: number;
  total: number;
};

export type BrainSignalSemantics = {
  schemaVersion: 1;
  lane: BrainDecisionLane;
  domain: BrainDomain;
  actionability: BrainActionability;
  evidenceQuality: BrainEvidenceQuality;
  factors: BrainPriorityFactors;
};

const severityScore: Record<string, number> = { critica: 420, importante: 300, atencao: 180, informativa: 60 };
const urgencyScore: Record<string, number> = { alta: 180, media: 110, baixa: 45, nenhuma: 0 };
const confidenceScore: Record<string, number> = { alta: 100, media: 60, baixa: 20 };

function boundedCoverage(insight: HealthInsight): number | null {
  const coverage = insight.coberturaDias;
  if (!coverage || coverage.total <= 0) return null;
  return Math.max(0, Math.min(1, coverage.observados / coverage.total));
}

function meaningfulUnique(values: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values ?? []) {
    const clean = value.trim().replace(/\s+/g, " ");
    const key = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

export function brainMeaningfulEvidence(insight: Pick<HealthInsight, "evidencias" | "fontesInternas">) {
  return { evidence: meaningfulUnique(insight.evidencias), sources: meaningfulUnique(insight.fontesInternas) };
}

export function brainEvidenceQuality(insight: HealthInsight): BrainEvidenceQuality {
  const coverage = boundedCoverage(insight);
  const meaningful = brainMeaningfulEvidence(insight);
  const evidenceCount = meaningful.evidence.length;
  const sourceCount = meaningful.sources.length;
  if (insight.kind === "data_quality" || insight.confianca === "baixa" || (coverage !== null && coverage < .25)) return "limited";
  if (insight.confianca === "alta" && evidenceCount > 0 && sourceCount > 0 && (coverage === null || coverage >= .5)) return "strong";
  return "moderate";
}

export function brainActionability(insight: HealthInsight): BrainActionability {
  if (insight.link && insight.acaoSegura) return "direct";
  if (insight.link || insight.acaoSegura) return "guided";
  return "observe";
}

export function brainDomain(insight: HealthInsight): BrainDomain {
  if (insight.kind === "data_quality" || insight.categoria === "dados") return "data";
  if (["adesao", "uso_sos", "estoque", "renovacao", "rotina"].includes(insight.categoria)) return "medication";
  if (["tratamento", "historico"].includes(insight.categoria)) return "care";
  if (insight.categoria === "sintomas") return "wellbeing";
  return "administrative";
}

export function brainPriorityFactors(insight: HealthInsight): BrainPriorityFactors {
  const quality = brainEvidenceQuality(insight);
  const actionability = brainActionability(insight);
  const severity = severityScore[insight.gravidadeSeguranca ?? "informativa"] ?? 60;
  const urgency = urgencyScore[insight.urgencia] ?? 0;
  const evidence = confidenceScore[insight.confianca] + Math.min(40, Math.max(0, insight.amostra || 0) * 2);
  const action = actionability === "direct" ? 80 : actionability === "guided" ? 45 : 10;
  const dataQualityPenalty = quality === "limited" ? 170 : quality === "moderate" ? 35 : 0;
  return { severity, urgency, evidence, actionability: action, dataQualityPenalty,
    total: severity + urgency + evidence + action - dataQualityPenalty };
}

export function brainDecisionLane(insight: HealthInsight): BrainDecisionLane {
  const quality = brainEvidenceQuality(insight);
  if (insight.kind === "data_quality" || quality === "limited") return "review_data";
  const severity = insight.gravidadeSeguranca ?? "informativa";
  if ((severity === "critica" || severity === "importante") && insight.urgencia === "alta") return "now";
  if (insight.urgencia === "alta" || insight.urgencia === "media" || insight.kind === "alert" || insight.categoria === "agenda") return "next";
  return "follow_up";
}

export function brainSignalSemantics(insight: HealthInsight): BrainSignalSemantics {
  return { schemaVersion: 1, lane: brainDecisionLane(insight), domain: brainDomain(insight),
    actionability: brainActionability(insight), evidenceQuality: brainEvidenceQuality(insight),
    factors: brainPriorityFactors(insight) };
}

export function compareBrainSignals(a: HealthInsight, b: HealthInsight): number {
  const aa = brainSignalSemantics(a), bb = brainSignalSemantics(b);
  const laneRank: Record<BrainDecisionLane, number> = { now: 4, next: 3, follow_up: 2, review_data: 1 };
  return laneRank[bb.lane] - laneRank[aa.lane] || bb.factors.total - aa.factors.total || a.id.localeCompare(b.id);
}
