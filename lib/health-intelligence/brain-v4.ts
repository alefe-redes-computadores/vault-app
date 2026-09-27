import {
  gerarInsightsSaude,
  type HealthInsight,
  type HealthInsightContext,
} from "@/lib/health-insights";
import {
  buildCanonicalClinicalTimeline,
  type ClinicalTimelineEvent,
} from "@/lib/health-intelligence/clinical-timeline-v4";
import {
  buildEvidenceLedgerV4,
  type EvidenceLedgerV4,
} from "@/lib/health-intelligence/evidence-ledger-v4";
import {
  assessInsightConfidenceV4,
  type ConfidenceAssessmentV4,
} from "@/lib/health-intelligence/confidence-engine-v4";
import {
  buildLongitudinalSignalsV4,
  type LongitudinalSignalV4,
} from "@/lib/health-intelligence/longitudinal-v4";

export type BrainV4InsightAudit = {
  insightId: string;
  ledger: EvidenceLedgerV4;
  confidence: ConfidenceAssessmentV4;
};

export type BrainV4Snapshot = {
  version: "4.0-shadow";
  generatedFor: string;
  timeline: ClinicalTimelineEvent[];
  insightAudits: BrainV4InsightAudit[];
  longitudinalSignals: LongitudinalSignalV4[];
  metrics: {
    timelineEvents: number;
    insightsAudited: number;
    lowCoverageInsights: number;
    confidenceDisagreements: number;
    shadowSignals: number;
  };
};

export type BrainV4ReplayPoint = {
  date: string;
  insightCount: number;
  timelineEventCount: number;
  shadowSignalCount: number;
  confidenceDisagreements: number;
};

export function buildBrainV4Snapshot(
  context: HealthInsightContext,
  insights: HealthInsight[]
): BrainV4Snapshot {
  const timeline = buildCanonicalClinicalTimeline(context);
  const insightAudits = insights.map((insight) => {
    const ledger = buildEvidenceLedgerV4(insight, timeline);
    return {
      insightId: insight.id,
      ledger,
      confidence: assessInsightConfidenceV4(insight, ledger),
    };
  });
  const longitudinalSignals = buildLongitudinalSignalsV4(context, timeline);

  return {
    version: "4.0-shadow",
    generatedFor: context.hoje || new Date().toISOString().slice(0, 10),
    timeline,
    insightAudits,
    longitudinalSignals,
    metrics: {
      timelineEvents: timeline.length,
      insightsAudited: insightAudits.length,
      lowCoverageInsights: insightAudits.filter((item) =>
        item.ledger.coverageRatio !== null && item.ledger.coverageRatio < 0.25
      ).length,
      confidenceDisagreements: insightAudits.filter((item) =>
        item.confidence.current !== item.confidence.proposed
      ).length,
      shadowSignals: longitudinalSignals.length,
    },
  };
}

function onOrBefore(value: unknown, date: string): boolean {
  const raw = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return true;
  return raw.slice(0, 10) <= date;
}

function scopeContextForReplay(
  context: HealthInsightContext,
  date: string
): HealthInsightContext {
  return {
    ...context,
    hoje: date,
    doseLogs: context.doseLogs.filter((item) => onOrBefore(item.tomado_em || item.data, date)),
    registrosSaude: context.registrosSaude.filter((item) => onOrBefore(item.data, date)),
    consultas: context.consultas.filter((item) => onOrBefore(item.data, date)),
    exames: context.exames.filter((item) => {
      const raw = item as typeof item & { data?: string; data_exame?: string };
      return onOrBefore(raw.data_exame || raw.data, date);
    }),
    retiradas: context.retiradas.filter((item) => {
      const raw = item as typeof item & { data_retirada?: string; data_agendada?: string; data?: string };
      return onOrBefore(raw.data_retirada || raw.data_agendada || raw.data, date);
    }),
    renovacoes: context.renovacoes.filter((item) => {
      const raw = item as typeof item & { data_renovacao?: string; data_receita?: string; data?: string };
      return onOrBefore(raw.data_renovacao || raw.data_receita || raw.data, date);
    }),
  };
}

export function replayBrainV4(
  context: HealthInsightContext,
  days = 90,
  stepDays = 7
): BrainV4ReplayPoint[] {
  const end = new Date(`${context.hoje || new Date().toISOString().slice(0, 10)}T12:00:00`);
  const safeDays = Math.max(1, Math.min(365, Math.floor(days)));
  const safeStep = Math.max(1, Math.floor(stepDays));
  const points: BrainV4ReplayPoint[] = [];

  for (let offset = safeDays; offset >= 0; offset -= safeStep) {
    const cursor = new Date(end);
    cursor.setDate(cursor.getDate() - offset);
    const date = cursor.toISOString().slice(0, 10);
    const replayContext = scopeContextForReplay(context, date);
    const insights = gerarInsightsSaude(replayContext);
    const snapshot = buildBrainV4Snapshot(replayContext, insights);
    points.push({
      date,
      insightCount: insights.length,
      timelineEventCount: snapshot.metrics.timelineEvents,
      shadowSignalCount: snapshot.metrics.shadowSignals,
      confidenceDisagreements: snapshot.metrics.confidenceDisagreements,
    });
  }

  return points;
}
