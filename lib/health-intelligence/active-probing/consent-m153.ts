import type { ActiveProbePreferences } from "./types";

/** Configuracoes opt-in locais por titular e pessoa. Nunca inferir consentimento. */
export const ACTIVE_PROBE_DEFAULT_PREFS: Readonly<ActiveProbePreferences> = Object.freeze({
  enabled: false, manufacturer: false, confirmedSos: false,
  temporaryCourse: false, fourAxes: false, consentVersion: 0,
});
const PREFIX = "vault:m153:brain-probing-consent:v1:";

function key(userId: string, personId: string): string | null {
  if (!userId.trim() || !personId.trim()) return null;
  return `${PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(personId)}`;
}

export function loadActiveProbePreferences(userId: string, personId: string): ActiveProbePreferences {
  const storageKey = key(userId, personId);
  if (!storageKey || typeof window === "undefined") return ACTIVE_PROBE_DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return ACTIVE_PROBE_DEFAULT_PREFS;
    const item: unknown = JSON.parse(raw);
    if (!item || typeof item !== "object") return ACTIVE_PROBE_DEFAULT_PREFS;
    const record = item as Record<string, unknown>;
    if (record.user_id !== userId || record.person_id !== personId || record.consentVersion !== 1 || record.enabled !== true)
      return ACTIVE_PROBE_DEFAULT_PREFS;
    const preferences: ActiveProbePreferences = {
      enabled: true, manufacturer: record.manufacturer === true,
      confirmedSos: record.confirmedSos === true, temporaryCourse: record.temporaryCourse === true,
      fourAxes: record.fourAxes === true, consentVersion: 1,
    };
    return preferences.manufacturer || preferences.confirmedSos || preferences.temporaryCourse || preferences.fourAxes
      ? preferences : ACTIVE_PROBE_DEFAULT_PREFS;
  } catch { return ACTIVE_PROBE_DEFAULT_PREFS; }
}

export function saveActiveProbePreferences(userId: string, personId: string, requested: ActiveProbePreferences): ActiveProbePreferences {
  const storageKey = key(userId, personId);
  if (!storageKey || typeof window === "undefined") throw new Error("Pessoa ativa indisponível.");
  const categories = {
    manufacturer: requested.manufacturer === true,
    confirmedSos: requested.confirmedSos === true,
    temporaryCourse: requested.temporaryCourse === true,
    fourAxes: requested.fourAxes === true,
  };
  const active = requested.enabled === true && Object.values(categories).some(Boolean);
  const preferences: ActiveProbePreferences = active
    ? { enabled: true, ...categories, consentVersion: 1 }
    : { ...ACTIVE_PROBE_DEFAULT_PREFS };
  // Unica escrita: preferencia local por owner/person. Nenhuma linha clinica alterada.
  if (active) window.localStorage.setItem(storageKey, JSON.stringify({
    ...preferences, user_id: userId, person_id: personId, confirmed_at: new Date().toISOString(),
  }));
  else window.localStorage.removeItem(storageKey);
  return preferences;
}
