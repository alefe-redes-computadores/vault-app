import type { HealthInsight } from "@/lib/health-insights";

const severity = {
  critica: 0,
  importante: 1,
  atencao: 2,
  informativa: 3,
} as const;

const urgency = {
  alta: 0,
  media: 1,
  baixa: 2,
  nenhuma: 3,
} as const;

const confidence = {
  alta: 0,
  media: 1,
  baixa: 2,
} as const;

function severityRank(
  value: HealthInsight["gravidadeSeguranca"]
): number {
  return severity[value || "informativa"];
}

function urgencyRank(
  value: HealthInsight["urgencia"]
): number {
  return urgency[value];
}

function confidenceRank(
  value: HealthInsight["confianca"]
): number {
  return confidence[value];
}

// VAULT_INSIGHT_NOTIFICATION_POLICY_V57
// VAULT_INSIGHT_NOTIFICATION_POLICY_V61
export function rankHealthInsightNotificationCandidates(
  insights: HealthInsight[]
): HealthInsight[] {
  return insights
      .filter(
        (item) =>
          item.categoria !== "agenda" &&
          (item.kind === "alert" || item.kind === "pattern") &&
          (item.gravidadeSeguranca === "importante" ||
            item.gravidadeSeguranca === "critica")
      )
      .sort(
        (a, b) =>
          severityRank(a.gravidadeSeguranca) -
            severityRank(b.gravidadeSeguranca) ||
          urgencyRank(a.urgencia) -
            urgencyRank(b.urgencia) ||
          confidenceRank(a.confianca) -
            confidenceRank(b.confianca) ||
          b.amostra - a.amostra
      );
}

export function selectHealthInsightNotificationCandidate(
  insights: HealthInsight[]
): HealthInsight | null {
  return rankHealthInsightNotificationCandidates(insights)[0] || null;
}

export function getHealthInsightNotificationCooldownMs(
  insight: HealthInsight
): number {
  if (
    insight.gravidadeSeguranca === "critica" ||
    insight.urgencia === "alta"
  ) {
    return 6 * 60 * 60 * 1000;
  }

  if (insight.kind === "pattern") {
    return 48 * 60 * 60 * 1000;
  }

  return 24 * 60 * 60 * 1000;
}

export function getHealthInsightNotificationRoute(
  insight: HealthInsight
): string {
  const link = insight.link?.trim();

  if (link?.startsWith("/")) {
    return link;
  }

  return "/inteligencia";
}

export function getHealthInsightNotificationPriority(
  insight: HealthInsight
): number {
  return (
    severityRank(insight.gravidadeSeguranca) * 100 +
    urgencyRank(insight.urgencia) * 10 +
    confidenceRank(insight.confianca)
  );
}
