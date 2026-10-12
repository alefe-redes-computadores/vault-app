import { db, safeAddSettings, safeUpdateSettings } from "@/lib/db";
import { enfileirarOperacao, solicitarProcessamentoSync } from "@/lib/sync/enfileirarOperacao";
import type { AppSettings } from "@/lib/types";
import type { HealthInsight } from "@/lib/health-insights";
import { brainV5Key, reconcileBrainV5, type BrainV5Alert, type BrainV5Feedback, type BrainV5State } from "@/lib/health-intelligence/brain-v5";
type Settings = AppSettings & { brain_v5_alert_ledger?: BrainV5Alert[] };
const get = async (userId: string) => await db.settings.where("user_id").equals(userId).first() as Settings | undefined;
/** Read, reconcile and queue atomically, using the latest persisted feedback. */
async function updateLedger(userId: string, transform: (current: BrainV5Alert[]) => BrainV5Alert[]) {
  if (!userId) throw new Error("Conta não identificada.");
  let changed = false;
  const result = await db.transaction("rw", [db.settings, db.syncQueue], async () => {
    const old = await get(userId);
    const current = Array.isArray(old?.brain_v5_alert_ledger) ? old!.brain_v5_alert_ledger! : [];
    const next = transform(current);
    if (JSON.stringify(next) === JSON.stringify(current)) return current;
    const now = new Date().toISOString();
    let id: string;
    if (old) {
      id = old.id;
      await safeUpdateSettings(id, { brain_v5_alert_ledger: next, updated_at: now, synced: false } as Partial<Settings>);
    } else {
      // safeAddSettings generates the ID: queue the actual saved row.
      id = await safeAddSettings({ user_id: userId, brain_v5_alert_ledger: next } as Settings);
    }
    const saved = await db.settings.get(id) as Settings | undefined;
    if (!saved) throw new Error("Não foi possível salvar a memória do cérebro.");
    await enfileirarOperacao("settings", old ? "update" : "add", saved, { dispatchSync: false });
    changed = true;
    return next;
  });
  if (changed) solicitarProcessamentoSync();
  return result;
}
type Patch = Partial<Pick<BrainV5Alert, "state" | "feedback" | "feedback_updated_at" | "last_seen_at" | "resolved_at">>;
const mutate = (userId: string, personId: string, key: string, patch: Patch) => updateLedger(userId, (all) => {
  const now = new Date().toISOString();
  return all.map((item) => item.person_id === personId && item.key === key
    ? { ...item, ...patch, last_seen_at: patch.last_seen_at ?? item.last_seen_at ?? now } : item);
});
export const brainV5AlertLedgerRepository = {
  async getAll(userId: string) { const settings = await get(userId); return settings?.brain_v5_alert_ledger || []; },
  reconcile(userId: string, personId: string, insights: HealthInsight[]) {
    return updateLedger(userId, (current) => reconcileBrainV5(personId, insights, current));
  },
  mutate,
  markSeen(userId: string, personId: string, key: string) { return mutate(userId, personId, key, { last_seen_at: new Date().toISOString() }); },
  feedback(userId: string, personId: string, key: string, feedback: BrainV5Feedback) {
    return mutate(userId, personId, key, { feedback, feedback_updated_at: new Date().toISOString(), state: feedback === "review_later" ? "monitoring" : "acknowledged" });
  },
  feedbackForInsight(userId: string, personId: string, insight: HealthInsight, feedback: BrainV5Feedback) {
    return updateLedger(userId, (all) => {
      const key = brainV5Key(personId, insight);
      const previous = all.filter((item) => item.person_id === personId && item.key === key);
      const entry = reconcileBrainV5(personId, [insight], previous)[0];
      return [...all.filter((item) => item.key !== key), { ...entry, feedback,
        feedback_updated_at: new Date().toISOString(), state: feedback === "review_later" ? "monitoring" as const : "acknowledged" as const }];
    });
  },
  state(userId: string, personId: string, key: string, state: BrainV5State) {
    return mutate(userId, personId, key, { state, resolved_at: state === "resolved" ? new Date().toISOString() : undefined });
  },
};
