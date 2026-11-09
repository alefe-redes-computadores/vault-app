/** Plano pessoal voluntário. Armazenamento local não é criptografado: não compartilhar o aparelho desbloqueado. */
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
  warningSigns: "", copingSteps: "", reasonsToStay: "", trustedPeople: "",
  professionalContacts: "", saferEnvironment: "", updatedAt: "",
};
const FIELDS = ["warningSigns", "copingSteps", "reasonsToStay", "trustedPeople", "professionalContacts", "saferEnvironment"] as const;
// Apenas para migração CONSCIENTE; nunca carregar automaticamente a chave legada sem escopo de conta.
function storageKey(personId: string): string {
  return `vault:safety-plan:v1:${personId}`;
}
const validScope = (personId?: string | null, userId?: string | null) => Boolean(
  typeof personId === "string" && personId.trim() && personId.length <= 256 &&
  typeof userId === "string" && userId.trim() && userId.length <= 256
);
function ownerKey(personId: string, userId: string): string {
  return `vault:safety-plan:v2:${encodeURIComponent(userId)}:${encodeURIComponent(personId)}`;
}
function parsePlan(value: unknown): SafetyPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  if (FIELDS.some(field => entry[field] !== undefined && typeof entry[field] !== "string")) return null;
  if (entry.updatedAt !== undefined && typeof entry.updatedAt !== "string") return null;
  return {
    warningSigns: entry.warningSigns as string || "",
    copingSteps: entry.copingSteps as string || "",
    reasonsToStay: entry.reasonsToStay as string || "",
    trustedPeople: entry.trustedPeople as string || "",
    professionalContacts: entry.professionalContacts as string || "",
    saferEnvironment: entry.saferEnvironment as string || "",
    updatedAt: entry.updatedAt as string || "",
  };
}
function freshEmpty(): SafetyPlan { return {...EMPTY_SAFETY_PLAN}; }
export function hasScopedSafetyPlan(personId?: string | null, userId?: string | null): boolean {
  if (typeof window === "undefined" || !validScope(personId,userId)) return false;
  try { return localStorage.getItem(ownerKey(personId!,userId!)) !== null; }
  catch { return false; }
}
export function hasLegacySafetyPlan(personId?: string | null): boolean {
  if (typeof window === "undefined" || !personId || personId.length > 256) return false;
  try { return localStorage.getItem(storageKey(personId)) !== null; }
  catch { return false; }
}
/** Nenhum dado v1 é exibido automaticamente: não havia identificação do usuário naquela chave. */
export function readSafetyPlan(personId?: string | null, userId?: string | null): SafetyPlan {
  if (typeof window === "undefined" || !validScope(personId,userId)) return freshEmpty();
  try {
    const raw = localStorage.getItem(ownerKey(personId!,userId!));
    return raw ? parsePlan(JSON.parse(raw)) ?? freshEmpty() : freshEmpty();
  } catch { return freshEmpty(); }
}
export function saveSafetyPlan(personId: string, plan: SafetyPlan, userId?: string | null): SafetyPlan {
  if (typeof window === "undefined" || !validScope(personId,userId)) throw Error("Conta e pessoa devem estar identificadas.");
  const next = parsePlan(plan);
  if (!next) throw Error("Plano inválido para salvar.");
  next.updatedAt = new Date().toISOString();
  localStorage.setItem(ownerKey(personId,userId!),JSON.stringify(next));
  return next;
}
/** Só deve ser chamada após confirmação explícita do usuário de que o arquivo v1 é seu. */
export function importLegacySafetyPlan(personId: string, userId?: string | null): SafetyPlan | null {
  if (typeof window === "undefined" || !validScope(personId,userId)) return null;
  if (hasScopedSafetyPlan(personId,userId)) return null; // nunca sobrescrever um plano atual
  try {
    const raw = localStorage.getItem(storageKey(personId));
    if (!raw || raw.length > 150000) return null;
    const plan = parsePlan(JSON.parse(raw));
    if (!plan) return null;
    const destination = ownerKey(personId,userId!);
    const encoded = JSON.stringify(plan);
    localStorage.setItem(destination, encoded);
    if (localStorage.getItem(destination) !== encoded) return null;
    // Remove a antiga chave sem conta apenas depois de confirmar a cópia nova.
    try { localStorage.removeItem(storageKey(personId)); } catch { /* cópia v2 foi gravada */ }
    return plan;
  } catch { return null; }
}
