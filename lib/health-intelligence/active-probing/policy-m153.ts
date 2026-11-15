import { preferenceAllows, withinFrequencyLimit } from "./core";
import type { ActiveProbe, ActiveProbePreferences } from "./types";

/**
 * Projecao PURA e conservadora. Somente consentimento explicito permite candidatos.
 * Frequencia = ate duas novas perguntas por titular/pessoa nos ultimos sete dias.
 * Idempotencia primeiro, para a mesma visita nao gastar duas cotas.
 */
export function selectConsentGatedProbes(
  candidates: readonly ActiveProbe[], existing: readonly ActiveProbe[],
  preferences: ActiveProbePreferences, userId: string, personId: string,
  now: string, limit = 2,
): ActiveProbe[] {
  if (!userId || !personId || !preferences.enabled || preferences.consentVersion < 1 || !Number.isFinite(Date.parse(now))) return [];
  const ledger = existing.filter(row => row.user_id === userId && row.person_id === personId);
  const seen = new Set(ledger.map(row => row.idempotency_key));
  const accepted: ActiveProbe[] = [];
  for (const row of candidates) {
    if (row.user_id !== userId || row.person_id !== personId || !row.idempotency_key ||
      !preferenceAllows(row.trigger_type, preferences) || seen.has(row.idempotency_key)) continue;
    if (!withinFrequencyLimit(ledger, userId, personId, now, limit)) break;
    seen.add(row.idempotency_key);
    const next = { ...row, consent_version: preferences.consentVersion };
    accepted.push(next); ledger.push(next);
  }
  return accepted;
}
