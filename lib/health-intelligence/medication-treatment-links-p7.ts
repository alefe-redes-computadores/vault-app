/** M153 P7 — relações explícitas; nenhuma relação é inferida por nome, data ou CID. */
import type { Medicamento, Tratamento } from "@/lib/types";

type MedicationRefP7 = Pick<Medicamento, "id" | "user_id" | "person_id" | "tratamento_ids">;
type TreatmentRefP7 = Pick<Tratamento, "id" | "user_id" | "person_id" | "nome" | "cor" | "medicamento_ids">;
export type MedicationTreatmentChipP7 = { id: string; nome: string; cor: string | null };

export function safeTreatmentColorP7(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const color = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : null;
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
