"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/db";
import type { HealthInsight } from "@/lib/health-insights";
import type { BrainV5Alert } from "@/lib/health-intelligence/brain-v5";
import { readInsightFeedbackV4, writeInsightFeedbackV4, type InsightFeedbackV4 } from "@/lib/health-intelligence/feedback-v4";
import { mergeExperienceFeedback, toBrainFeedback } from "@/lib/health-intelligence/experience-feedback";
import { brainV5AlertLedgerRepository } from "@/lib/repositories/brainV5AlertLedger";
export function useHealthExperienceFeedback(personId: string | null | undefined, insights: HealthInsight[]) {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const settings = useLiveQuery(() => user?.id ? db.settings.where("user_id").equals(user.id).first() : undefined, [user?.id]) as ({ user_id?: string; brain_v5_alert_ledger?: BrainV5Alert[] } | undefined);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === "vault:brain-v4:feedback:" + personId) refresh();
    };
    window.addEventListener("vault:brain-v4:feedback", refresh);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("vault:brain-v4:feedback", refresh);
      window.removeEventListener("storage", storage);
    };
  }, [personId]);
  const feedback = useMemo(() => personId ? mergeExperienceFeedback(personId,
    readInsightFeedbackV4(personId), settings?.user_id === user?.id ? settings?.brain_v5_alert_ledger || [] : []) : [], [personId, settings, revision, user?.id]);
  const sendFeedback = useCallback(async (insight: HealthInsight, value: InsightFeedbackV4) => {
    if (!personId || !user?.id) throw new Error("Selecione a pessoa ativa antes de avaliar.");
    if (!insights.includes(insight)) throw new Error("O histórico mudou. Reabra a análise para avaliar.");
    await brainV5AlertLedgerRepository.feedbackForInsight(user.id, personId, insight, toBrainFeedback(value));
    writeInsightFeedbackV4(personId, insight.id, value);
  }, [personId, user?.id, insights]);
  return { feedback, sendFeedback };
}
