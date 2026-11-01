import type { Medicamento } from "@/lib/types";

/** R9 R7: account + active profile are both required when known. Read-only, stable order. */
export function medicationsForOwner<T extends Pick<Medicamento,"user_id"|"person_id">>(
  records: readonly T[] | null | undefined,
  personId: string | null | undefined,
  accountId: string | null | undefined,
): T[] {
  if (!records || !personId) return [];
  return records.filter(medication =>
    medication.person_id === personId && (!accountId || medication.user_id === accountId));
}
