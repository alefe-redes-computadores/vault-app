import type { Renovacao } from "@/lib/types";

/**
 * P15 R9 R5: one-pass, owner-scoped, read-only index. Legacy events without
 * person_id remain visible ONLY under the same account, mirroring R4 behavior;
 * an event from another person with an explicit person_id is never inherited.
 */
export function indexOwnedReadinessRenewals(
  events: readonly Renovacao[],
  personId: string,
  accountId: string,
): Map<string, Renovacao[]> {
  const index = new Map<string, Renovacao[]>();
  if (!personId || !accountId) return index;
  for (const event of events) {
    if (!event.medicamento_id || event.user_id !== accountId || (event.person_id && event.person_id !== personId)) continue;
    const bucket = index.get(event.medicamento_id) ?? [];
    bucket.push(event);
    index.set(event.medicamento_id, bucket);
  }
  return index;
}
