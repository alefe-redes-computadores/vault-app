/**
 * M70: diagnostic-only relational projection. CID overlap NEVER silently
 * writes treatment_ids or changes the medication's clinical authority.
 */
import type { Medicamento, Tratamento } from "@/lib/types";

export type TreatmentLinkReview = {
  confirmed: Medicamento[];
  reverseLegacy: Medicamento[];
  cidCandidates: Medicamento[];
};

export function inspectTreatmentMedicationLinks(
  treatment: Tratamento,
  medications: readonly Medicamento[],
): TreatmentLinkReview {
  const result: TreatmentLinkReview = { confirmed: [], reverseLegacy: [], cidCandidates: [] };
  if (!treatment.id || !treatment.user_id || !treatment.person_id) return result;
  const cidIds = new Set(treatment.cid_ids || []);
  const reverseIds = new Set(treatment.medicamento_ids || []);
  for (const medication of medications) {
    if (!medication.id || medication.user_id !== treatment.user_id || medication.person_id !== treatment.person_id) continue;
    if (medication.tratamento_ids?.includes(treatment.id)) {
      result.confirmed.push(medication);
    } else if (reverseIds.has(medication.id)) {
      result.reverseLegacy.push(medication);
    } else if (cidIds.size > 0 && [...new Set([...(medication.cid_ids || []), medication.cid_id || ""])].some(id => cidIds.has(id))) {
      result.cidCandidates.push(medication);
    }
  }
  return result;
}
