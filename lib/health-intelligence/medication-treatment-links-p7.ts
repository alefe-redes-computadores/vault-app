/** M153 P7 — relações explícitas; nenhuma relação é inferida por nome, data ou CID. */
import type { Medicamento, Tratamento } from "@/lib/types";
import { normalizeTreatmentColorR03 } from "@/lib/health-profile/treatment-preferences-r03";

type MedicationRefP7 = Pick<Medicamento, "id" | "user_id" | "person_id" | "tratamento_ids">;
type TreatmentRefP7 = Pick<Tratamento, "id" | "user_id" | "person_id" | "nome" | "cor" | "medicamento_ids">;
export type MedicationTreatmentChipP7 = { id: string; nome: string; cor: string | null };

export function safeTreatmentColorP7(value: unknown): string | null {
  return normalizeTreatmentColorR03(value);
}

export function indexMedicationTreatmentsP7(input: {
  userId?: string | null;
  personId?: string | null;
  medications: readonly MedicationRefP7[];
  treatments: readonly TreatmentRefP7[];
}): Map<string, MedicationTreatmentChipP7[]> {
  const result = new Map<string, MedicationTreatmentChipP7[]>();
  const { userId, personId } = input;
  if (!userId || !personId) return result;
  const ownedMedications = new Map<string, MedicationRefP7>();
  for (const medication of input.medications) {
    if (medication.id && medication.user_id === userId && medication.person_id === personId) {
      ownedMedications.set(medication.id, medication);
    }
  }
  const seen = new Set<string>();
  for (const treatment of input.treatments) {
    if (!treatment.id || treatment.user_id !== userId || treatment.person_id !== personId) continue;
    const linkedIds = new Set(treatment.medicamento_ids || []);
    for (const [id, medication] of ownedMedications) {
      if (!linkedIds.has(id) && !(medication.tratamento_ids || []).includes(treatment.id)) continue;
      const relationKey = JSON.stringify([id, treatment.id]);
      if (seen.has(relationKey)) continue;
      seen.add(relationKey);
      const list = result.get(id) || [];
      list.push({ id: treatment.id, nome: treatment.nome, cor: safeTreatmentColorP7(treatment.cor) });
      result.set(id, list);
    }
  }
  return result;
}

/** Home continuity uses exactly the same explicit scoped relationships as medication chips.
 * Group once per owner/person, never link across people or infer from names. */
export function indexMedicationCareLinksP7(
  medications: readonly Medicamento[], treatments: readonly Tratamento[]
): Map<Medicamento, MedicationTreatmentChipP7[]> {
  const result = new Map<Medicamento, MedicationTreatmentChipP7[]>();
  const groups = new Map<string, {userId: string; personId: string; medications: Medicamento[]; treatments: Tratamento[]}>();
  for (const medication of medications) {
    if (!medication.id || !medication.user_id || !medication.person_id) continue;
    const key = JSON.stringify([medication.user_id, medication.person_id]);
    let group = groups.get(key);
    if (!group) {
      group = {userId: medication.user_id, personId: medication.person_id, medications: [], treatments: []};
      groups.set(key, group);
    }
    group.medications.push(medication);
  }
  for (const treatment of treatments) {
    if (!treatment.id || !treatment.user_id || !treatment.person_id) continue;
    groups.get(JSON.stringify([treatment.user_id, treatment.person_id]))?.treatments.push(treatment);
  }
  for (const group of groups.values()) {
    const links = indexMedicationTreatmentsP7(group);
    for (const medication of group.medications) if (medication.id) result.set(medication, links.get(medication.id) ?? []);
  }
  return result;
}
