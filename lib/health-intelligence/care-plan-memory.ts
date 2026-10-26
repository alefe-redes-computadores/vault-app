import type { BrainCarePlan } from "./care-plan";

export type CarePlanMemory = { fingerprint: string; decisionId: string | null; score: number; savedAt: string };
export type CarePlanChange = { kind: "first" | "stable" | "changed" | "escalated" | "resolved"; label: string };

export const carePlanFingerprint = (plan: BrainCarePlan) => plan.items.map(item => `${item.id}:${item.lane}:${item.priorityScore}`).sort().join("|");
export const carePlanMemoryKey = (ownerKey: string) => `vault_brain_care_plan_v64:${ownerKey}`;
export function snapshotCarePlan(plan: BrainCarePlan): CarePlanMemory {
  return { fingerprint: carePlanFingerprint(plan), decisionId: plan.decision?.id ?? null, score: plan.decision?.priorityScore ?? 0, savedAt: new Date().toISOString() };
}
export function compareCarePlan(previous: CarePlanMemory | null, plan: BrainCarePlan): CarePlanChange {
  const current = snapshotCarePlan(plan);
  if (!previous) return { kind: "first", label: "Primeira leitura deste plano" };
  if (previous.fingerprint === current.fingerprint) return { kind: "stable", label: "Sem mudança relevante desde a última leitura" };
  if (!current.decisionId && previous.decisionId) return { kind: "resolved", label: "A prioridade anterior saiu do plano atual" };
  if (current.score > previous.score) return { kind: "escalated", label: "A prioridade aumentou com novos registros" };
  return { kind: "changed", label: "O plano mudou com novos registros" };
}
