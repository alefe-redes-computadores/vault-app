export interface SafetyPlan {
  warningSigns: string;
  copingSteps: string;
  reasonsToStay: string;
  trustedPeople: string;
  professionalContacts: string;
  saferEnvironment: string;
  updatedAt: string;
}
export const EMPTY_SAFETY_PLAN: SafetyPlan = {
  warningSigns: "",
  copingSteps: "",
  reasonsToStay: "",
  trustedPeople: "",
  professionalContacts: "",
  saferEnvironment: "",
  updatedAt: "",
};

function storageKey(personId: string): string {
  return `vault:safety-plan:v1:${personId}`;
}

export function readSafetyPlan(personId?: string | null): SafetyPlan {
  if (!personId || typeof window === "undefined") return EMPTY_SAFETY_PLAN;
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(personId)) || "null");
    return parsed && typeof parsed === "object"
      ? { ...EMPTY_SAFETY_PLAN, ...parsed }
      : EMPTY_SAFETY_PLAN;
  } catch {
    return EMPTY_SAFETY_PLAN;
  }
}

export function saveSafetyPlan(personId: string, plan: SafetyPlan): SafetyPlan {
  if (!personId) throw new Error("Pessoa ativa não identificada.");
  const next = { ...plan, updatedAt: new Date().toISOString() };
  localStorage.setItem(storageKey(personId), JSON.stringify(next));
  return next;
}
