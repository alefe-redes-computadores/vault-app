import type { HealthInsight } from "@/lib/health-insights";
import { brainDecisionLane, compareBrainSignals } from "@/lib/health-intelligence/brain-next";

function isEligibleForBehavioralPush(insight: HealthInsight): boolean {
  if (insight.categoria === "agenda") return false;
  if (insight.kind !== "alert" && insight.kind !== "pattern") return false;
  return brainDecisionLane(insight) === "now" &&
    (insight.gravidadeSeguranca === "critica" || insight.gravidadeSeguranca === "importante");
}

// VAULT_INSIGHT_NOTIFICATION_POLICY_V57
// VAULT_INSIGHT_NOTIFICATION_POLICY_V61_FINAL
export function rankHealthInsightNotificationCandidates(
  insights: HealthInsight[],
  limit = 5
): HealthInsight[] {
  const safeLimit = Math.max(1, Math.floor(limit));

  return [...insights]
    .filter(isEligibleForBehavioralPush)
    .sort(compareBrainSignals)
    .slice(0, safeLimit);
}

/** Compatibilidade com consumidores anteriores à V61. */
export function selectHealthInsightNotificationCandidate(
  insights: HealthInsight[]
): HealthInsight | null {
  return rankHealthInsightNotificationCandidates(insights, 1)[0] ?? null;
}

/**
 * VAULT_INSIGHT_EXACT_ENTRY_V1
 *
 * Uma notificação comportamental representa o próprio Insight. Portanto o
 * primeiro destino é a Central com o card exato aberto. O link contextual do
 * insight continua disponível dentro do sheet em "Abrir contexto".
 */
export function getHealthInsightNotificationRoute(insight: HealthInsight): string {
  const insightId = insight.id?.trim();
  return insightId
    ? `/inteligencia/alertas?insight=${encodeURIComponent(insightId)}`
    : "/inteligencia/alertas";
}
