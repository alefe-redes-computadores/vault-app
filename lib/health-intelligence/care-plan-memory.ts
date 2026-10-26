import type { BrainCarePlan, BrainCarePlanEvidence, BrainCarePlanLane } from "./care-plan";

export type CarePlanMemory = { version: 2; fingerprint: string; decisionId: string | null; decisionTitle: string | null; evidenceKind: BrainCarePlanEvidence | null; lane: BrainCarePlanLane | null; score: number; savedAt: string };
export type CarePlanChange = { kind: "first" | "stable" | "changed" | "escalated" | "resolved"; label: string; previousDecisionTitle?: string | null; currentDecisionTitle?: string | null };

const laneRank: Record<BrainCarePlanLane, number> = { now: 4, prepare: 3, discuss: 2, observe: 1 };
const validEvidence = new Set<BrainCarePlanEvidence>(["recorded", "projected", "association", "missing_data"]);
const validLane = new Set<BrainCarePlanLane>(["now", "prepare", "discuss", "observe"]);
export const carePlanFingerprint = (plan: BrainCarePlan) => plan.items.map(item => `${item.id}:${item.lane}:${item.evidenceKind}:${item.priorityScore}`).sort().join("|");
export const carePlanMemoryKey = (ownerKey: string) => `vault_brain_care_plan_v65:${ownerKey}`;
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
  try { window.localStorage.setItem(carePlanMemoryKey(plan.ownerKey), JSON.stringify(snapshotCarePlan(plan))); } catch { /* memória auxiliar não interrompe o cuidado */ }
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
