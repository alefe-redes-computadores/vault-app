import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";
import type {
  BrainV4Snapshot,
  BrainV4ReplayPoint,
} from "@/lib/health-intelligence/brain-v4";
import type { ClinicalTimelineEvent } from "@/lib/health-intelligence/clinical-timeline-v4";

export type BrainBriefItem = {
  id: string;
  title: string;
  detail: string;
  tone: "attention" | "observation" | "neutral";
  insightId?: string;
};

export type BrainDailyBriefing = {
  date: string;
  headline: string;
  items: BrainBriefItem[];
  quiet: boolean;
};

export type BrainWeeklyReview = {
  from: string;
  to: string;
  eventCount: number;
  activeDays: number;
  doseEvents: number;
  healthRecords: number;
  appointments: number;
  exams: number;
  pickups: number;
  signals: number;
  summary: string[];
};

export type BrainHealthV4 = {
  status: "learning" | "observing" | "consistent";
  timelineEvents: number;
  insightsAudited: number;
  shadowSignals: number;
  lowCoverageInsights: number;
  confidenceDisagreements: number;
  replayPoints: number;
  notes: string[];
};

export type InsightExplanationV4 = {
  insightId: string;
  periodLabel: string;
  sampleLabel: string;
  coverageLabel: string;
  confidenceLabel: string;
  evidence: string[];
  sources: string[];
  missingData: string[];
  nearbyEvents: number;
  limitation: string;
};

export type ConsultationPrepV4 = {
  generatedAt: string;
  periodDays: number;
  currentTreatments: string[];
  medicationCount: number;
  adherence: {
    scheduled: number;
    taken: number;
    ignored: number;
    percentage: number | null;
  };
  sosExtra: {
    count: number;
    activeDays: number;
  };
  healthRecords: {
    count: number;
    activeDays: number;
    recurringSubjects: string[];
  };
  recentEvents: Array<{
    date: string;
    label: string;
    type: string;
  }>;
  importantInsights: Array<{
    id: string;
    title: string;
    confidence: string;
    sample: number;
  }>;
  questionsToRemember: string[];
  dataQuality: string[];
};

const DAY = 86_400_000;

function dayMs(value: string): number {
  return new Date(`${value.slice(0, 10)}T12:00:00`).getTime();
}

function daysAgo(date: string, today: string): number {
  return Math.floor((dayMs(today) - dayMs(date)) / DAY);
}

function inWindow(event: ClinicalTimelineEvent, today: string, days: number): boolean {
  const age = daysAgo(event.date, today);
  return age >= 0 && age < days;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function referenceDate(
  context: HealthInsightContext,
  snapshot: BrainV4Snapshot
): string {
  if (context.hoje) return context.hoje;

  const latestTimelineDate = snapshot.timeline.at(-1)?.date;
  if (latestTimelineDate) return latestTimelineDate;

  return new Date().toISOString().slice(0, 10);
}

export function buildDailyBriefingV4(
  context: HealthInsightContext,
  insights: HealthInsight[],
  snapshot: BrainV4Snapshot
): BrainDailyBriefing {
  const today = referenceDate(context, snapshot);
  const items: BrainBriefItem[] = [];

  for (const insight of insights.slice(0, 3)) {
    items.push({
      id: `insight:${insight.id}`,
      title: insight.titulo,
      detail: insight.mensagem,
      tone: insight.urgencia === "alta" ? "attention" : "observation",
      insightId: insight.id,
    });
  }

  const todayEvents = snapshot.timeline.filter((event) => event.date === today);
  if (todayEvents.length > 0 && items.length < 4) {
    items.push({
      id: "today-events",
      title: `${todayEvents.length} evento${todayEvents.length === 1 ? "" : "s"} registrado${todayEvents.length === 1 ? "" : "s"} hoje`,
      detail: "O Vault já incorporou esses dados à leitura longitudinal.",
      tone: "neutral",
    });
  }

  const strongShadow = snapshot.longitudinalSignals
    .filter((signal) => signal.confidenceScore >= 70)
    .slice(0, 1);

  for (const signal of strongShadow) {
    if (items.length >= 4) break;
    items.push({
      id: signal.id,
      title: signal.kind === "trend" ? "Tendência em observação" : "Padrão longitudinal em observação",
      detail: signal.evidence[0] ?? "Há um sinal longitudinal sendo acompanhado.",
      tone: "observation",
    });
  }

  return {
    date: today,
    headline: items.length
      ? "O que merece contexto hoje"
      : "Sem sinal prioritário com evidência suficiente hoje",
    items,
    quiet: items.length === 0,
  };
}

export function buildWeeklyReviewV4(
  context: HealthInsightContext,
  snapshot: BrainV4Snapshot
): BrainWeeklyReview {
  const today = referenceDate(context, snapshot);
  const events = snapshot.timeline.filter((event) => inWindow(event, today, 7));
  const count = (type: ClinicalTimelineEvent["type"]) =>
    events.filter((event) => event.type === type).length;
  const activeDays = new Set(events.map((event) => event.date)).size;
  const signals = snapshot.longitudinalSignals.filter((signal) => signal.confidenceScore >= 55).length;
  const summary: string[] = [];

  if (events.length) summary.push(`${events.length} eventos clínicos entraram no histórico em ${activeDays} dia(s).`);
  if (count("dose")) summary.push(`${count("dose")} registros de dose compõem a leitura da semana.`);
  if (count("health_record")) summary.push(`${count("health_record")} registros de saúde ajudam a contextualizar sintomas e rotina.`);
  if (signals) summary.push(`${signals} sinal(is) longitudinal(is) permanecem em observação no motor V4.`);
  if (!summary.length) summary.push("Ainda há poucos eventos recentes para produzir uma revisão semanal útil.");

  return {
    from: new Date(dayMs(today) - 6 * DAY).toISOString().slice(0, 10),
    to: today,
    eventCount: events.length,
    activeDays,
    doseEvents: count("dose"),
    healthRecords: count("health_record"),
    appointments: count("appointment"),
    exams: count("exam"),
    pickups: count("pickup"),
    signals,
    summary,
  };
}

export function buildBrainHealthV4(
  snapshot: BrainV4Snapshot,
  replay: BrainV4ReplayPoint[]
): BrainHealthV4 {
  const status: BrainHealthV4["status"] =
    snapshot.metrics.timelineEvents >= 50 && replay.length >= 6
      ? "consistent"
      : snapshot.metrics.timelineEvents >= 10
        ? "observing"
        : "learning";

  const notes: string[] = [];
  if (snapshot.metrics.lowCoverageInsights) notes.push(`${snapshot.metrics.lowCoverageInsights} insight(s) têm cobertura temporal baixa.`);
  if (snapshot.metrics.confidenceDisagreements) notes.push(`${snapshot.metrics.confidenceDisagreements} insight(s) têm confiança V4 diferente da classificação atual.`);
  if (!snapshot.metrics.shadowSignals) notes.push("Nenhum sinal longitudinal novo atingiu amostra mínima no momento.");
  if (!notes.length) notes.push("O motor possui cobertura suficiente para continuar aprendendo sem sinal estrutural relevante.");

  return {
    status,
    timelineEvents: snapshot.metrics.timelineEvents,
    insightsAudited: snapshot.metrics.insightsAudited,
    shadowSignals: snapshot.metrics.shadowSignals,
    lowCoverageInsights: snapshot.metrics.lowCoverageInsights,
    confidenceDisagreements: snapshot.metrics.confidenceDisagreements,
    replayPoints: replay.length,
    notes,
  };
}

export function buildConsultationPrepV4(
  context: HealthInsightContext,
  insights: HealthInsight[],
  snapshot: BrainV4Snapshot,
  periodDays = 30
): ConsultationPrepV4 {
  const today = referenceDate(context, snapshot);
  const timeline = snapshot.timeline.filter((event) => inWindow(event, today, periodDays));
  const doseEvents = timeline.filter((event) => event.type === "dose");
  const scheduled = doseEvents.filter((event) => event.facts.doseKind === "scheduled");
  const taken = scheduled.filter((event) => event.facts.tomada === true);
  const ignored = scheduled.filter((event) => event.facts.ignorada === true);
  const sosExtra = doseEvents.filter((event) => event.facts.doseKind === "sos" || event.facts.doseKind === "extra");
  const records = timeline.filter((event) => event.type === "health_record");

  const recurringSubjects = snapshot.longitudinalSignals
    .filter((signal) => ["trend", "persistence", "recurrence"].includes(signal.kind))
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 5)
    .map((signal) => signal.subject);

  const importantInsights = [...insights]
    .sort((a, b) => {
      const urgency: Record<HealthInsight["urgencia"], number> = {
        alta: 3,
        media: 2,
        baixa: 1,
        nenhuma: 0,
      };
      return (urgency[b.urgencia] ?? 0) - (urgency[a.urgencia] ?? 0) || b.amostra - a.amostra;
    })
    .slice(0, 5)
    .map((insight) => ({
      id: insight.id,
      title: insight.titulo,
      confidence: insight.confianca,
      sample: insight.amostra,
    }));

  const questionsToRemember: string[] = [];
  if (sosExtra.length) questionsToRemember.push("Quero revisar o padrão de uso de doses SOS/extra e em quais situações elas ocorreram.");
  if (recurringSubjects.length) questionsToRemember.push("Quero comentar os registros que apareceram repetidamente no meu histórico recente.");
  if (ignored.length) questionsToRemember.push("Quero revisar as doses programadas que não foram registradas como tomadas.");
  if (importantInsights.length) questionsToRemember.push("Quero conferir se as mudanças percebidas no meu histórico têm relevância para meu acompanhamento.");
  if (!questionsToRemember.length) questionsToRemember.push("Quero revisar se houve alguma mudança importante desde a última consulta.");

  const dataQuality = unique(
    snapshot.insightAudits.flatMap((audit) => audit.ledger.missingData)
  ).slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    periodDays,
    currentTreatments: context.tratamentos
      .filter((item) => {
        const raw = item as typeof item & { status?: string; nome?: string };
        return !raw.status || !["finalizado", "encerrado", "cancelado"].includes(String(raw.status).toLowerCase());
      })
      .map((item) => (item as typeof item & { nome?: string }).nome || "Tratamento")
      .slice(0, 10),
    medicationCount: context.medicamentos.length,
    adherence: {
      scheduled: scheduled.length,
      taken: taken.length,
      ignored: ignored.length,
      percentage: scheduled.length ? Math.round((taken.length / scheduled.length) * 100) : null,
    },
    sosExtra: {
      count: sosExtra.length,
      activeDays: new Set(sosExtra.map((event) => event.date)).size,
    },
    healthRecords: {
      count: records.length,
      activeDays: new Set(records.map((event) => event.date)).size,
      recurringSubjects,
    },
    recentEvents: [...timeline]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 12)
      .map((event) => ({ date: event.date, label: event.label, type: event.type })),
    importantInsights,
    questionsToRemember,
    dataQuality,
  };
}


// VAULT_BRAIN_V4_EXPLAINABILITY
export function buildInsightExplanationV4(
  insight: HealthInsight,
  snapshot: BrainV4Snapshot
): InsightExplanationV4 | null {
  const audit = snapshot.insightAudits.find(
    (candidate) => candidate.insightId === insight.id
  );

  if (!audit) return null;

  const { ledger, confidence } = audit;

  return {
    insightId: insight.id,
    periodLabel:
      ledger.periodDays !== null
        ? `${ledger.periodDays} dias analisados`
        : "Período definido pelo contexto disponível",
    sampleLabel: `${ledger.sampleSize} item(ns) na amostra`,
    coverageLabel:
      ledger.coverageRatio === null
        ? "Cobertura temporal não estruturada"
        : `${Math.round(ledger.coverageRatio * 100)}% de cobertura temporal`,
    confidenceLabel:
      confidence.current === confidence.proposed
        ? `Confiança ${confidence.current} · V4 concorda com a classificação atual`
        : `Confiança atual ${confidence.current} · V4 observa ${confidence.proposed} em shadow mode`,
    evidence: ledger.evidence,
    sources: ledger.provenance,
    missingData: ledger.missingData,
    nearbyEvents: ledger.timelineEventCount,
    limitation:
      "O Vault descreve padrões e relações temporais dos dados registrados. Isso não demonstra causalidade nem substitui avaliação profissional.",
  };
}
