"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useSharedHealthIntelligence as useHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { db } from "@/lib/db";
import { brainV5Counters, brainV5DecisionBrief, brainV5Journeys, rankBrainV5, type BrainV5Alert, type BrainV5Feedback, type BrainV5State } from "@/lib/health-intelligence/brain-v5";
import { brainV5AlertLedgerRepository as repo } from "@/lib/repositories/brainV5AlertLedger";
import { buildBrainPortfolio } from "@/lib/health-intelligence/brain-portfolio";
import { calibrateBrain } from "@/lib/health-intelligence/brain-calibration";
export function useBrainV5Alerts() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const health = useHealthIntelligence({ includeAudit: false });
  const [error, setError] = useState<string | null>(null);
  const settings = useLiveQuery(() => user?.id ? db.settings.where("user_id").equals(user.id).first() : undefined, [user?.id]) as ({ user_id?: string; brain_v5_alert_ledger?: BrainV5Alert[] } | undefined);
  const stored = useMemo(() => settings?.user_id === user?.id && Array.isArray(settings?.brain_v5_alert_ledger) ? settings!.brain_v5_alert_ledger! : [], [settings, user?.id]);
  const scoped = useMemo(() => activePersonId ? stored.filter((item) => item.person_id === activePersonId) : [], [stored, activePersonId]);
  useEffect(() => {
    if (!user?.id || !activePersonId || health.isLoading || health.error || health.context?.personId !== activePersonId) return;
    let cancelled = false;
    repo.reconcile(user.id, activePersonId, health.insights)
      .then(() => { if (!cancelled) setError(null); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a memória."); });
    return () => { cancelled = true; };
  }, [user?.id, activePersonId, health.isLoading, health.error, health.context?.personId, health.insights, stored]);
  const perform = useCallback(async (action: () => Promise<BrainV5Alert[]>) => {
    try { const result = await action(); setError(null); return result; }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar sua resposta."); return []; }
  }, []);
  const ranked = useMemo(() => rankBrainV5(scoped), [scoped]);
  const brief = useMemo(() => brainV5DecisionBrief(scoped), [scoped]);
  const journeys = useMemo(() => brainV5Journeys(scoped), [scoped]);
  const portfolio = useMemo(() => buildBrainPortfolio(scoped), [scoped]);
  const calibration = useMemo(() => calibrateBrain(scoped), [scoped]);
  const feedback = useCallback((key: string, value: BrainV5Feedback) => user?.id && activePersonId ? perform(() => repo.feedback(user.id, activePersonId, key, value)) : Promise.resolve([]), [user?.id, activePersonId, perform]);
  const state = useCallback((key: string, value: BrainV5State) => user?.id && activePersonId ? perform(() => repo.state(user.id, activePersonId, key, value)) : Promise.resolve([]), [user?.id, activePersonId, perform]);
  const seen = useCallback((key: string) => user?.id && activePersonId ? perform(() => repo.markSeen(user.id, activePersonId, key)) : Promise.resolve([]), [user?.id, activePersonId, perform]);
  const feedbackMany = useCallback((keys: readonly string[], value: BrainV5Feedback) => user?.id && activePersonId ? perform(() => repo.feedbackMany(user.id, activePersonId, keys, value)) : Promise.resolve([]), [user?.id, activePersonId, perform]);
  const stateMany = useCallback((keys: readonly string[], value: BrainV5State) => user?.id && activePersonId ? perform(() => repo.stateMany(user.id, activePersonId, keys, value)) : Promise.resolve([]), [user?.id, activePersonId, perform]);
  const seenMany = useCallback((keys: readonly string[]) => user?.id && activePersonId ? perform(() => repo.markSeenMany(user.id, activePersonId, keys)) : Promise.resolve([]), [user?.id, activePersonId, perform]);
  const snoozeMany = useCallback((keys: readonly string[], until: string) => user?.id && activePersonId ? perform(() => repo.snoozeMany(user.id, activePersonId, keys, until)) : Promise.resolve([]), [user?.id, activePersonId, perform]);
  return { records: scoped, ranked, journeys, portfolio, calibration, brief, counters: brainV5Counters(scoped), feedback, feedbackMany, state, stateMany, seen, seenMany, snoozeMany, error: error || health.error,
    isLoading: health.isLoading || Boolean(user?.id && settings === undefined) };
}
