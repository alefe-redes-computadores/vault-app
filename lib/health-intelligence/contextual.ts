import type { HealthInsight } from "@/lib/health-insights";

export type HealthInsightEntityType =
  | "medicamento" | "tratamento" | "consulta" | "exame"
  | "retirada" | "renovacao" | "registro";

const urgency = { alta: 0, media: 1, baixa: 2, nenhuma: 3 } as const;
const confidence = { alta: 0, media: 1, baixa: 2 } as const;

// VAULT_CONTEXTUAL_BRAIN_V57
export function selectContextualHealthInsights(
  insights: HealthInsight[],
  entityType: HealthInsightEntityType,
  entityId?: string | null,
  limit = 3
): HealthInsight[] {
  const id = entityId?.trim();
  if (!id) return [];
  return insights
    .filter((item) => item.entidadeTipo === entityType && item.entidadeId === id)
    .sort((a,b) =>
      urgency[a.urgencia] - urgency[b.urgencia] ||
      confidence[a.confianca] - confidence[b.confianca] ||
      b.amostra - a.amostra)
    .slice(0, Math.max(1, limit));
}
