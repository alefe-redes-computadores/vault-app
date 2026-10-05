import type { HealthInsight } from "@/lib/health-insights";

const SEVERITY_RANK: Record<string, number> = {
  critica: 0,
  importante: 1,
  atencao: 2,
  informativa: 3,
};

const URGENCY_RANK: Record<string, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
  nenhuma: 3,
};

const CONFIDENCE_RANK: Record<string, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

function score(map: Record<string, number>, value: unknown): number {
  return map[String(value ?? "")] ?? 99;
}

function isEligibleForBehavioralPush(insight: HealthInsight): boolean {
  if (insight.categoria === "agenda") return false;
  if (insight.kind !== "alert" && insight.kind !== "pattern") return false;
  return insight.gravidadeSeguranca === "critica" || insight.gravidadeSeguranca === "importante";
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
    .sort((a, b) => {
      const severity = score(SEVERITY_RANK, a.gravidadeSeguranca) - score(SEVERITY_RANK, b.gravidadeSeguranca);
      if (severity !== 0) return severity;

      const urgency = score(URGENCY_RANK, a.urgencia) - score(URGENCY_RANK, b.urgencia);
      if (urgency !== 0) return urgency;

      const confidence = score(CONFIDENCE_RANK, a.confianca) - score(CONFIDENCE_RANK, b.confianca);
      if (confidence !== 0) return confidence;

      return (b.amostra ?? 0) - (a.amostra ?? 0);
    })
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
