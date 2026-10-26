import type { BrainCarePlan, BrainCarePlanEvidence, BrainCarePlanLane } from "./care-plan";

export type CarePlanMemory = { version: 2; fingerprint: string; decisionId: string | null; decisionTitle: string | null; evidenceKind: BrainCarePlanEvidence | null; lane: BrainCarePlanLane | null; score: number; savedAt: string };
export type CarePlanChange = { kind: "first" | "stable" | "changed" | "escalated" | "resolved"; label: string; previousDecisionTitle?: string | null; currentDecisionTitle?: string | null };
export type CarePlanHistoryEntry = CarePlanChange & { id: string; savedAt: string; score: number; evidenceKind: BrainCarePlanEvidence | null };

const laneRank: Record<BrainCarePlanLane, number> = { now: 4, prepare: 3, discuss: 2, observe: 1 };
const validEvidence = new Set<BrainCarePlanEvidence>(["recorded", "projected", "association", "missing_data"]);
const validLane = new Set<BrainCarePlanLane>(["now", "prepare", "discuss", "observe"]);
export const carePlanFingerprint = (plan: BrainCarePlan) => plan.items.map(item => `${item.id}:${item.lane}:${item.evidenceKind}:${item.priorityScore}:${item.dueDate || ""}:${item.supplyRoute || ""}:${item.relatedCount}`).sort().join("|");
export const carePlanMemoryKey = (ownerKey: string) => `vault_brain_care_plan_v65:${ownerKey}`;
export const carePlanHistoryKey = (ownerKey: string) => `vault_brain_care_plan_history_v67:${ownerKey}`;
export const CARE_PLAN_HISTORY_EVENT = "vault:care-plan-history-updated";
export function snapshotCarePlan(plan: BrainCarePlan): CarePlanMemory {
  return { version: 2, fingerprint: carePlanFingerprint(plan), decisionId: plan.decision?.id ?? null, decisionTitle: plan.decision?.title ?? null, evidenceKind: plan.decision?.evidenceKind ?? null, lane: plan.decision?.lane ?? null, score: plan.decision?.priorityScore ?? 0, savedAt: new Date().toISOString() };
}
export function parseCarePlanMemory(value: unknown): CarePlanMemory | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<CarePlanMemory>;
  if (typeof row.fingerprint !== "string" || !Number.isFinite(row.score) || typeof row.savedAt !== "string") return null;
  if (row.lane != null && !validLane.has(row.lane)) return null;
  if (row.evidenceKind != null && !validEvidence.has(row.evidenceKind)) return null;
  return { version: 2, fingerprint: row.fingerprint, decisionId: typeof row.decisionId === "string" ? row.decisionId : null, decisionTitle: typeof row.decisionTitle === "string" ? row.decisionTitle : null, evidenceKind: row.evidenceKind ?? null, lane: row.lane ?? null, score: Number(row.score), savedAt: row.savedAt };
}
export function readCarePlanMemory(ownerKey: string): CarePlanMemory | null {
  if (typeof window === "undefined") return null;
  try { return parseCarePlanMemory(JSON.parse(window.localStorage.getItem(carePlanMemoryKey(ownerKey)) || "null")); } catch { return null; }
}
export function writeCarePlanMemory(plan: BrainCarePlan): void {
  if (typeof window === "undefined") return;
  try {
    const previous = readCarePlanMemory(plan.ownerKey), current = snapshotCarePlan(plan), change = compareCarePlan(previous, plan);
    window.localStorage.setItem(carePlanMemoryKey(plan.ownerKey), JSON.stringify(current));
    if (change.kind !== "stable") {
      const history = readCarePlanHistory(plan.ownerKey);
      const entry: CarePlanHistoryEntry = { ...change, id: `${current.savedAt}:${current.decisionId || "none"}`, savedAt: current.savedAt, score: current.score, evidenceKind: current.evidenceKind };
      const deduped = history[0]?.kind === entry.kind && history[0]?.currentDecisionTitle === entry.currentDecisionTitle && history[0]?.score === entry.score ? history.slice(1) : history;
      window.localStorage.setItem(carePlanHistoryKey(plan.ownerKey), JSON.stringify([entry, ...deduped].slice(0, 12)));
      window.dispatchEvent(new CustomEvent(CARE_PLAN_HISTORY_EVENT, { detail: { ownerKey: plan.ownerKey } }));
    }
  } catch { /* memória auxiliar não interrompe o cuidado */ }
}
export function readCarePlanHistory(ownerKey: string): CarePlanHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try { const value=JSON.parse(window.localStorage.getItem(carePlanHistoryKey(ownerKey))||"[]"), cutoff=Date.now()-180*24*60*60*1000; return Array.isArray(value)?value.filter((item):item is CarePlanHistoryEntry=>Boolean(item&&typeof item.id==="string"&&typeof item.savedAt==="string"&&Date.parse(item.savedAt)>=cutoff&&typeof item.label==="string"&&["first","changed","escalated","resolved"].includes(item.kind))).slice(0,12):[]; } catch { return []; }
}
export function formatCarePlanHistory(items: readonly CarePlanHistoryEntry[], limit=5): string {
  if (!items.length) return "";
  return ["Mudanças recentes acompanhadas pelo Brain:", ...items.slice(0,limit).map(item=>`• ${item.label}${item.currentDecisionTitle?`: ${item.currentDecisionTitle}`:""} (${new Date(item.savedAt).toLocaleDateString("pt-BR")})`), "Histórico descritivo do aplicativo; não representa diagnóstico nem evolução clínica confirmada."].join("\n");
}
export function compareCarePlan(previous: CarePlanMemory | null, plan: BrainCarePlan): CarePlanChange {
  const current = snapshotCarePlan(plan);
  if (!previous) return { kind: "first", label: "Primeira leitura deste plano", currentDecisionTitle: current.decisionTitle };
  if (previous.fingerprint === current.fingerprint) return { kind: "stable", label: "Sem mudança relevante desde a última leitura", previousDecisionTitle: previous.decisionTitle, currentDecisionTitle: current.decisionTitle };
  if (!current.decisionId && previous.decisionId) return { kind: "resolved", label: "A prioridade anterior saiu do plano atual", previousDecisionTitle: previous.decisionTitle, currentDecisionTitle: null };
  const laneEscalated = Boolean(current.lane && previous.lane && laneRank[current.lane] > laneRank[previous.lane]);
  if (current.score > previous.score || laneEscalated) return { kind: "escalated", label: "A prioridade aumentou com novos registros", previousDecisionTitle: previous.decisionTitle, currentDecisionTitle: current.decisionTitle };
  return { kind: "changed", label: "O plano mudou com novos registros", previousDecisionTitle: previous.decisionTitle, currentDecisionTitle: current.decisionTitle };
}

/** Push só para fato registrado atual; projeção, associação e dado ausente ficam dentro do app. */
export function carePlanChangeAllowsPush(change: CarePlanChange, plan: BrainCarePlan): boolean {
  return (change.kind === "first" || change.kind === "escalated") && plan.decision?.lane === "now" && plan.decision.evidenceKind === "recorded" && plan.decision.confidence !== "limited";
}
