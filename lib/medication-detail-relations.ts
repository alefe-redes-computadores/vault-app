import { db } from "@/lib/db";

export type MedicationDetailRelationInput = {
  medicationId: string;
  userId: string;
  personId: string;
  doctorId?: string | null;
  discontinuationDoctorId?: string | null;
  hospitalId?: string | null;
  locationId?: string | null;
  pharmacyId?: string | null;
  documentId?: string | null;
  treatmentIds?: string[] | null;
  cidIds?: string[] | null;
};

export const hasMedicationRelationAuthority = (
  value: { user_id?: string; person_id?: string } | undefined,
  userId: string,
  personId?: string
) => Boolean(value && value.user_id === userId && (!personId || value.person_id === personId));

const owned = <T extends { user_id?: string; person_id?: string }>(
  value: T | undefined,
  userId: string,
  personId?: string
) => hasMedicationRelationAuthority(value, userId, personId) ? value : undefined;

/**
 * Uma única projeção reativa alimenta todas as relações do detalhe.
 * Eventos globais exigem a conta; eventos clínicos exigem conta e pessoa.
 */
export async function loadMedicationDetailRelations(input: MedicationDetailRelationInput) {
  const treatmentIds = [...new Set(input.treatmentIds || [])].filter(Boolean);
  const cidIds = [...new Set(input.cidIds || [])].filter(Boolean);
  const [doctorRaw, discontinuationDoctorRaw, hospitalRaw, locationRaw, pharmacyRaw, documentRaw, doseRows, treatmentRows, cidRows, pharmacyRows] = await Promise.all([
    input.doctorId ? db.medicos.get(input.doctorId) : undefined,
    input.discontinuationDoctorId ? db.medicos.get(input.discontinuationDoctorId) : undefined,
    input.hospitalId ? db.hospitais.get(input.hospitalId) : undefined,
    input.locationId ? db.locais.get(input.locationId) : undefined,
    input.pharmacyId ? db.farmacias.get(input.pharmacyId) : undefined,
    input.documentId ? db.documents.get(input.documentId) : undefined,
    db.doseLogs.where("medicamento_id").equals(input.medicationId).toArray(),
    treatmentIds.length ? db.tratamentos.where("id").anyOf(treatmentIds).toArray() : [],
    cidIds.length ? db.cids.where("id").anyOf(cidIds).toArray() : [],
    db.farmacias.where("user_id").equals(input.userId).toArray(),
  ]);

  const farmaciasMap = new Map(pharmacyRows.map(item => [item.id, item.nome]));
  return {
    medico: owned(doctorRaw, input.userId),
    medicoDescontinuacao: owned(discontinuationDoctorRaw, input.userId),
    hospital: owned(hospitalRaw, input.userId),
    local: owned(locationRaw, input.userId),
    farmacia: owned(pharmacyRaw, input.userId),
    documento: owned(documentRaw, input.userId, input.personId),
    doseLogs: doseRows.filter(item => item.user_id === input.userId && item.person_id === input.personId),
    tratamentos: treatmentRows.filter(item => item.user_id === input.userId && item.person_id === input.personId),
    cids: cidRows.filter(item => item.user_id === input.userId && item.person_id === input.personId),
    farmaciasMap,
  };
}

export type MedicationDetailRelations = Awaited<ReturnType<typeof loadMedicationDetailRelations>>;
