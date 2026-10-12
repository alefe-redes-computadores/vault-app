import type { BrainV5Alert, BrainV5Feedback } from "./brain-v5";
import type { InsightFeedbackEntryV4, InsightFeedbackV4 } from "./feedback-v4";
const toLegacy: Record<BrainV5Feedback, InsightFeedbackV4> = {
  useful: "useful", already_knew: "already_knew", not_relevant: "not_relevant",
  review_later: "remind_later", dismissed: "hide",
};
export const toBrainFeedback = (value: InsightFeedbackV4): BrainV5Feedback =>
  value === "hide" ? "dismissed" : value === "remind_later" ? "review_later" : value;
/** Latest known explicit response, scoped to the active person. */
export function mergeExperienceFeedback(personId: string, legacy: InsightFeedbackEntryV4[], ledger: BrainV5Alert[]): InsightFeedbackEntryV4[] {
  const byInsight = new Map<string, InsightFeedbackEntryV4>();
  const add = (entry: InsightFeedbackEntryV4) => {
    if (!entry || entry.personId !== personId || typeof entry.insightId !== "string" || typeof entry.updatedAt !== "string" || !["useful", "already_knew", "not_relevant", "remind_later", "hide"].includes(entry.feedback)) return;
    const previous = byInsight.get(entry.insightId);
    if (!previous || entry.updatedAt >= previous.updatedAt) byInsight.set(entry.insightId, entry);
  };
  const resets = new Map(ledger.filter(item => item.person_id === personId && item.feedback_reset_at).map(item => [item.insight_id, item.feedback_reset_at!]));
  legacy.forEach((entry) => {
    const reset = resets.get(entry.insightId);
    if (!reset || entry.updatedAt > reset) add(entry);
  });
  ledger.forEach((item) => {
    if (!item || item.person_id !== personId || !item.feedback || !toLegacy[item.feedback]) return;
    add({ personId, insightId: item.insight_id, feedback: toLegacy[item.feedback],
      updatedAt: item.feedback_updated_at || item.last_seen_at || item.first_detected_at });
  });
  return [...byInsight.values()];
}
