import type { HealthInsightContext } from "@/lib/health-insights";
import { buildCautiousAssociations } from "./cautious-associations";
import { buildCareForecast, daysSinceLastCompletedConsultation, type CareForecast } from "./care-forecast";
import { buildCareReadiness, type CareReadinessPortfolio } from "./care-readiness";

export type BrainCarePlanLane = "now" | "prepare" | "discuss" | "observe";
export type BrainCarePlanEvidence = "recorded" | "projected" | "association" | "missing_data";
export type BrainCarePlanItem = {
  id: string;
  lane: BrainCarePlanLane;
  evidenceKind: BrainCarePlanEvidence;
  title: string;
  reason: string;
  evidence: string[];
  href: string;
  medicationId?: string;
  priorityScore: number;
  priorityReasons: string[];
  confidence: "high" | "moderate" | "limited";
};
export type BrainCarePlan = {
  ownerKey: string;
  generatedFor: string;
  items: BrainCarePlanItem[];
  focus: BrainCarePlanItem[];
  counts: Record<BrainCarePlanLane, number>;
  nextConsultation: string | null;
  daysSinceConsultation: number | null;
  projectedCost30d: number;
  projectedCostCoverage30d: number;
  note: string;
  decision: BrainCarePlanItem | null;
};

const laneRank: Record<BrainCarePlanLane, number> = { now: 0, prepare: 1, discuss: 2, observe: 3 };
const laneScore: Record<BrainCarePlanLane, number> = { now: 80, prepare: 55, discuss: 35, observe: 20 };
const evidenceScore: Record<BrainCarePlanEvidence, number> = { recorded: 15, projected: 9, association: 5, missing_data: 0 };
const validDay = (value?: string | null) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10)));

function explain(item: Omit<BrainCarePlanItem, "priorityScore" | "priorityReasons" | "confidence">): BrainCarePlanItem {
  const reasons = [
    item.lane === "now" ? "prazo atual ou vencido" : item.lane === "prepare" ? "próxima etapa previsível" : item.lane === "discuss" ? "assunto para decisão compartilhada" : "dado que melhora a leitura",
    item.evidenceKind === "recorded" ? "baseado em registro" : item.evidenceKind === "projected" ? "baseado em projeção identificada" : item.evidenceKind === "association" ? "associação temporal cautelosa" : "depende de informação ausente",
  ];
  const sample = Math.min(5, item.evidence.filter(Boolean).length);
  const priorityScore = Math.min(100, laneScore[item.lane] + evidenceScore[item.evidenceKind] + sample);
  const confidence = item.evidenceKind === "recorded" && sample >= 2 ? "high" : item.evidenceKind === "missing_data" || sample === 0 ? "limited" : "moderate";
  return { ...item, priorityScore, priorityReasons: reasons, confidence };
}

/**
 * Read-only care plan. It joins operational facts, projections and cautious
 * associations while preserving their authority. It never marks care as
 * completed and never turns missing records into a clinical failure.
 */
export function buildBrainCarePlan(
  context: HealthInsightContext,
  forecast: CareForecast = buildCareForecast(context),
  readiness: CareReadinessPortfolio = buildCareReadiness(context, forecast.generatedFor, forecast),
): BrainCarePlan {
  const items: BrainCarePlanItem[] = forecast.actions.map(action => explain({
    id: `action:${action.id}`,
    lane: action.lane === "now" ? "now" : action.lane === "review_data" ? "observe" : "prepare",
    evidenceKind: action.lane === "review_data" ? "missing_data" : action.kind === "stock_projection" ? "projected" : "recorded",
    title: action.title,
    reason: action.reason,
    evidence: action.evidence,
    href: action.href,
    medicationId: action.medicationId,
  }));

  const medicationAlreadyPlanned = new Set(items.flatMap(item => item.medicationId ? [item.medicationId] : []));
  for (const entry of readiness.items) {
    if (medicationAlreadyPlanned.has(entry.medicationId) || entry.state === "ready") continue;
    items.push(explain({
      id: `readiness:${entry.medicationId}`,
      lane: entry.state === "overdue" ? "now" : entry.state === "unknown" ? "observe" : "prepare",
      evidenceKind: entry.state === "unknown" ? "missing_data" : "recorded",
      title: `${entry.medicationName}: ${entry.headline.toLocaleLowerCase("pt-BR")}`,
      reason: entry.missing.length ? `Ainda falta: ${entry.missing.join(" e ")}.` : "A próxima etapa está registrada, mas ainda não foi concluída.",
      evidence: entry.evidence,
      href: entry.href,
      medicationId: entry.medicationId,
    }));
  }

  const associations = context.userId ? buildCautiousAssociations({
    records: context.registrosSaude,
    userId: context.userId,
    personId: context.personId,
    today: forecast.generatedFor,
    days: 30,
  }) : [];
  for (const association of associations.slice(0, 2)) {
    items.push(explain({
      id: `association:${association.id}`,
      lane: "discuss",
      evidenceKind: "association",
      title: "Padrão para conversar na próxima consulta",
      reason: `${association.message} É uma associação temporal, não prova causa nem efeito de tratamento.`,
      evidence: [`${association.pairedDays} dias comparáveis`, `Coeficiente descritivo ${association.coefficient}`],
      href: "/saude/registros/relatorio",
    }));
  }

  const nextConsultation = context.consultas
    .filter(item => item.person_id === context.personId && item.status !== "cancelada" && validDay(item.data) && item.data >= forecast.generatedFor)
    .sort((a, b) => a.data.localeCompare(b.data))[0] ?? null;
  const sinceConsultation = daysSinceLastCompletedConsultation(context, forecast.generatedFor);
  if (nextConsultation) {
    items.push(explain({
      id: `consultation:${nextConsultation.id || nextConsultation.data}`,
      lane: "prepare",
      evidenceKind: "recorded",
      title: "Preparar a próxima consulta",
      reason: `Consulta registrada para ${nextConsultation.data}. Reúna mudanças, dúvidas, documentos e o período desde a última consulta.`,
      evidence: [sinceConsultation ? `${sinceConsultation} dias desde a última consulta realizada` : "Sem consulta realizada anterior identificada"],
      href: "/saude/registros/relatorio",
    }));
  }

  const unique = new Map<string, BrainCarePlanItem>();
  for (const item of items) {
    const key = item.medicationId ? `${item.lane}:${item.medicationId}` : item.id;
    if (!unique.has(key)) unique.set(key, item);
  }
  const ordered = [...unique.values()].sort((a, b) => laneRank[a.lane] - laneRank[b.lane] || b.priorityScore - a.priorityScore || a.title.localeCompare(b.title, "pt-BR"));
  const counts: Record<BrainCarePlanLane, number> = { now: 0, prepare: 0, discuss: 0, observe: 0 };
  ordered.forEach(item => { counts[item.lane] += 1; });
  const month = forecast.windows.find(window => window.days === 30)!;
  return {
    ownerKey: `${context.userId || "local"}:${context.personId || "active"}`,
    generatedFor: forecast.generatedFor,
    items: ordered,
    focus: ordered.slice(0, 4),
    counts,
    nextConsultation: nextConsultation?.data ?? null,
    daysSinceConsultation: sinceConsultation,
    projectedCost30d: month.plannedKnownCost + month.expectedRefillCost,
    projectedCostCoverage30d: month.expectedRefillCostCoverage,
    note: "Plano orientativo baseado somente no que foi registrado. Projeções e associações aparecem identificadas e não substituem avaliação profissional.",
    decision: ordered[0] ?? null,
  };
}
