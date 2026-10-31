import type { Medicamento, Renovacao } from "@/lib/types";

/** Strict read-only owner boundary for medication-level decisions. */
export function ownedMedicationRenewals(
  rows: readonly Renovacao[],
  medication: Pick<Medicamento,"id"|"user_id"|"person_id">,
): Renovacao[] {
  if (!medication.id || !medication.user_id || !medication.person_id) return [];
  return rows.filter(row=>row.medicamento_id===medication.id &&
    row.user_id===medication.user_id && row.person_id===medication.person_id);
}
