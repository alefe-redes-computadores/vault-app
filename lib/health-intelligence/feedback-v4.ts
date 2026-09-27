import type { HealthInsight } from "@/lib/health-insights";

export type InsightFeedbackV4 =
  | "useful"
  | "not_relevant"
  | "already_knew"
  | "remind_later"
  | "hide";

export type InsightFeedbackEntryV4 = {
  personId: string;
  insightId: string;
  feedback: InsightFeedbackV4;
  updatedAt: string;
};

const PREFIX = "vault:brain-v4:feedback:";

function key(personId: string): string {
  return `${PREFIX}${personId}`;
}

export function readInsightFeedbackV4(personId: string): InsightFeedbackEntryV4[] {
  if (typeof window === "undefined" || !personId) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key(personId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeInsightFeedbackV4(
  personId: string,
  insightId: string,
  feedback: InsightFeedbackV4
): InsightFeedbackEntryV4[] {
  if (typeof window === "undefined" || !personId || !insightId) return [];
  const current = readInsightFeedbackV4(personId);
  const entry: InsightFeedbackEntryV4 = {
    personId,
    insightId,
    feedback,
    updatedAt: new Date().toISOString(),
  };
  const next = [...current.filter((item) => item.insightId !== insightId), entry];
  localStorage.setItem(key(personId), JSON.stringify(next.slice(-200)));
  window.dispatchEvent(new CustomEvent("vault:brain-v4:feedback", { detail: entry }));
  return next;
}


// VAULT_BRAIN_V4_RELEVANCE_LEARNING
// Feedback altera somente a ordem/visibilidade da experiência.
// Não modifica evidência, confiança clínica, gravidade ou elegibilidade para push.
export function selectExperienceInsightsV4(
  insights: HealthInsight[],
  feedbackEntries: InsightFeedbackEntryV4[],
  limit = 5
): HealthInsight[] {
  const feedback = new Map(
    feedbackEntries.map((entry) => [entry.insightId, entry.feedback])
  );

  const relevanceAdjustment = (insight: HealthInsight): number => {
    switch (feedback.get(insight.id)) {
      case "useful":
        return 30;
      case "already_knew":
        return -8;
      case "not_relevant":
        return -35;
      case "remind_later":
        return -18;
      case "hide":
        return -1000;
      default:
        return 0;
    }
  };

  const urgency: Record<string, number> = {
    alta: 300,
    media: 200,
    baixa: 100,
    nenhuma: 0,
  };

  const confidence: Record<string, number> = {
    alta: 30,
    media: 20,
    baixa: 10,
  };

  return [...insights]
    .filter((insight) => feedback.get(insight.id) !== "hide")
    .sort((a, b) => {
      const scoreA =
        (urgency[a.urgencia] ?? 0) +
        (confidence[a.confianca] ?? 0) +
        Math.min(30, a.amostra ?? 0) +
        relevanceAdjustment(a);

      const scoreB =
        (urgency[b.urgencia] ?? 0) +
        (confidence[b.confianca] ?? 0) +
        Math.min(30, b.amostra ?? 0) +
        relevanceAdjustment(b);

      return scoreB - scoreA;
    })
    .slice(0, Math.max(1, Math.floor(limit)));
}
