import type { HealthInsight } from "@/lib/health-insights";
import type { ClinicalTimelineEvent } from "@/lib/health-intelligence/clinical-timeline-v4";

export type EvidenceLedgerV4 = {
  insightId: string;
  periodDays: number | null;
  sampleSize: number;
  observedDays: number | null;
  totalDays: number | null;
  coverageRatio: number | null;
  internalSources: string[];
  evidence: string[];
  timelineEventCount: number;
  relevantEventTypes: string[];
  missingData: string[];
  provenance: string[];
};

export function buildEvidenceLedgerV4(
  insight: HealthInsight,
  timeline: ClinicalTimelineEvent[]
): EvidenceLedgerV4 {
  const coverage = insight.coberturaDias;
  const ratio = coverage && coverage.total > 0
    ? Math.min(1, Math.max(0, coverage.observados / coverage.total))
    : null;

  const relevant = timeline.filter((event) => {
    if (insight.entidadeId && (event.entityId === insight.entidadeId || event.relatedEntityIds.includes(insight.entidadeId))) return true;
    if (insight.categoria === "uso_sos" || insight.categoria === "adesao") return event.type === "dose";
    if (insight.categoria === "sintomas") return event.type === "health_record" || event.type === "dose";
    if (insight.categoria === "renovacao") return event.type === "renewal" || event.type === "pickup";
    if (insight.categoria === "agenda") return ["appointment", "exam", "pickup"].includes(event.type);
    return false;
  });

  const missingData: string[] = [];
  if ((insight.amostra ?? 0) < 3 && insight.kind === "pattern") missingData.push("Amostra pequena para um padrão longitudinal.");
  if (ratio !== null && ratio < 0.25) missingData.push("Cobertura temporal baixa no período analisado.");
  if (!(insight.fontesInternas?.length)) missingData.push("Insight legado sem fontes internas estruturadas.");
  if (!(insight.evidencias?.length)) missingData.push("Insight legado sem evidências estruturadas.");

  return {
    insightId: insight.id,
    periodDays: insight.periodoDias ?? null,
    sampleSize: Math.max(0, insight.amostra ?? 0),
    observedDays: coverage?.observados ?? null,
    totalDays: coverage?.total ?? insight.periodoDias ?? null,
    coverageRatio: ratio,
    internalSources: Array.from(new Set(insight.fontesInternas ?? [])),
    evidence: Array.from(new Set(insight.evidencias ?? [])),
    timelineEventCount: relevant.length,
    relevantEventTypes: Array.from(new Set(relevant.map((event) => event.type))),
    missingData,
    provenance: Array.from(new Set([
      ...(insight.fontesInternas ?? []),
      ...relevant.map((event) => event.source),
    ])),
  };
}
