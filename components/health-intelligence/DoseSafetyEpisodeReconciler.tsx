"use client";
/** M95: complete canonical Brain V5 dose-quantity episodes outside the Alerts route. */
import { useEffect } from "react";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useAuth } from "@/hooks/useAuth";
import { useSharedHealthIntelligence as useHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { brainV5AlertLedgerRepository } from "@/lib/repositories/brainV5AlertLedger";

export function DoseSafetyEpisodeReconciler() {
  const {user} = useAuth();
  const {activePersonId} = useActivePersonId();
  const health = useHealthIntelligence({includeAudit:false});
  useEffect(() => {
    if (!user?.id || !activePersonId || health.isLoading || health.error ||
        health.context?.personId !== activePersonId) return;
    const episodes = health.insights.filter(item => item.id.startsWith("quantidade-confirmada-"));
    void brainV5AlertLedgerRepository.reconcileDoseSafetyEpisodes(user.id, activePersonId, episodes)
      .catch(() => { /* The original dose remains saved; no fabricated success. */ });
  }, [user?.id, activePersonId, health.isLoading, health.error, health.context, health.insights]);
  return null;
}
