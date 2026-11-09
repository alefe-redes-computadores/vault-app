/** VAULT M100 P1 — classificação familiar LOCAL e descritiva, nunca autorização clínica. */
export const VAULT_FAMILY_PROFILE_EVENT_M100 = "vault:m100-family-profile-changed";
const STORAGE_KEY_M100 = "vault_m100_local_family_profiles_v1";
export type FamilyRelationM100 = "nao_informado" | "titular" | "filho_filha" | "pai_mae" | "conjuge" | "familiar" | "outra";
export type FamilyRoutineM100 = "nao_informado" | "organizo" | "acompanho";
export type LocalFamilyProfileM100 = { relation: FamilyRelationM100; routine: FamilyRoutineM100 };
export const EMPTY_FAMILY_PROFILE_M100: LocalFamilyProfileM100 = { relation: "nao_informado", routine: "nao_informado" };
export const FAMILY_RELATIONS_M100: ReadonlyArray<{ value: FamilyRelationM100; label: string }> = [
  { value: "nao_informado", label: "Não informado" },
  { value: "titular", label: "Meu perfil" },
  { value: "filho_filha", label: "Filho(a)" },
  { value: "pai_mae", label: "Pai / mãe" },
  { value: "conjuge", label: "Companheiro(a)" },
  { value: "familiar", label: "Outro familiar" },
  { value: "outra", label: "Outra relação" },
];
export const FAMILY_ROUTINES_M100: ReadonlyArray<{ value: FamilyRoutineM100; label: string }> = [
  { value: "nao_informado", label: "Não informado" },
  { value: "organizo", label: "Organizo a rotina no meu VAULT" },
  { value: "acompanho", label: "Acompanho este perfil no meu VAULT" },
];
const relationSet = new Set<string>(FAMILY_RELATIONS_M100.map(item => item.value));
const routineSet = new Set<string>(FAMILY_ROUTINES_M100.map(item => item.value));
const scoped = (userId: string, personId: string): string | null => {
  if (!userId || !personId || userId.length > 160 || personId.length > 160) return null;
  return `${encodeURIComponent(userId)}:${encodeURIComponent(personId)}`;
};
function parseStored(): Record<string, LocalFamilyProfileM100> {
  if (typeof window === "undefined") return {};
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY_M100) || "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: Record<string, LocalFamilyProfileM100> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>).slice(0, 250)) {
      if (key.length > 700 || !value || typeof value !== "object" || Array.isArray(value)) continue;
      const item = value as Record<string, unknown>;
      if (!relationSet.has(String(item.relation)) || !routineSet.has(String(item.routine))) continue;
      out[key] = {relation: item.relation as FamilyRelationM100, routine: item.routine as FamilyRoutineM100};
    }
    return out;
  } catch { return {}; }
}
export function getFamilyProfileM100(userId: string, personId: string): LocalFamilyProfileM100 {
  const key = scoped(userId, personId);
  return key ? parseStored()[key] ?? EMPTY_FAMILY_PROFILE_M100 : EMPTY_FAMILY_PROFILE_M100;
}
export function familyRelationLabelM100(relation: FamilyRelationM100): string {
  return FAMILY_RELATIONS_M100.find(item => item.value === relation)?.label ?? "Não informado";
}
export function setFamilyProfileM100(userId: string, personId: string, profile: LocalFamilyProfileM100): boolean {
  const key = scoped(userId, personId);
  if (!key || typeof window === "undefined" || !relationSet.has(profile.relation) || !routineSet.has(profile.routine)) return false;
  try {
    const all = parseStored();
    if (profile.relation === "nao_informado" && profile.routine === "nao_informado") delete all[key];
    else all[key] = { relation: profile.relation, routine: profile.routine };
    if (Object.keys(all).length > 250) return false;
    window.localStorage.setItem(STORAGE_KEY_M100, JSON.stringify(all));
    window.dispatchEvent(new Event(VAULT_FAMILY_PROFILE_EVENT_M100));
    return true;
  } catch { return false; }
}
export function clearFamilyProfileM100(userId: string, personId: string): boolean {
  return setFamilyProfileM100(userId, personId, EMPTY_FAMILY_PROFILE_M100);
}
/** Classificação local NÃO dá consentimento, papel legal ou permissão remota. */
export const FAMILY_PROFILE_REMOTE_ACCESS_M100 = false as const;
