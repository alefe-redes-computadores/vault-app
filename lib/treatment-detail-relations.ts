import { db } from "@/lib/db";

export type TreatmentDetailRelationInput = {
  treatmentId: string;
  userId: string;
  personId: string;
};

const belongsToAccount = <T extends { user_id?: string }>(value: T, userId: string) =>
  value.user_id === userId;

const belongsToPerson = <T extends { user_id?: string; person_id?: string }>(
  value: T,
  userId: string,
  personId: string,
) => value.user_id === userId && value.person_id === personId;

/**
 * Snapshot relacional único do detalhe de tratamento.
 *
 * A leitura do id da URL nunca basta: todas as entidades clínicas exigem a
 * mesma conta e pessoa. Entidades compartilhadas da rede de cuidado (médicos,
 * hospitais e locais) exigem ao menos a conta e só são expostas quando o
 * tratamento ou um medicamento autorizado realmente as referencia.
 */
export async function loadTreatmentDetailRelations(input: TreatmentDetailRelationInput) {
  const treatmentRaw = await db.tratamentos.get(input.treatmentId);
  if (!treatmentRaw || !belongsToPerson(treatmentRaw, input.userId, input.personId)) {
    return null;
  }

  const [medicationsRaw, renewalsRaw, cidsRaw, doctorsRaw, hospitalsRaw, locationsRaw, consultationsRaw, examsRaw, surgeriesRaw, recordsRaw, documentsRaw] = await Promise.all([
    db.medicamentos.where("person_id").equals(input.personId).toArray(),
    db.renovacoes.where("person_id").equals(input.personId).toArray(),
    db.cids.where("person_id").equals(input.personId).toArray(),
    db.medicos.where("user_id").equals(input.userId).toArray(),
    db.hospitais.where("user_id").equals(input.userId).toArray(),
    db.locais.where("user_id").equals(input.userId).toArray(),
    db.consultas.where("person_id").equals(input.personId).toArray(),
    db.exames.where("person_id").equals(input.personId).toArray(),
    db.cirurgias.where("person_id").equals(input.personId).toArray(),
    db.registros_saude.where("person_id").equals(input.personId).toArray(),
    db.documents.where("person_id").equals(input.personId).toArray(),
  ]);

  const medications = medicationsRaw.filter(
    item => belongsToPerson(item, input.userId, input.personId) && item.tratamento_ids?.includes(input.treatmentId),
  );
  const medicationIds = new Set(medications.flatMap(item => item.id ? [item.id] : []));
  const referencedDoctorIds = new Set([
    ...(treatmentRaw.medico_ids || []),
    ...medications.flatMap(item => [item.medico_id, item.medico_descontinuacao_id].filter((id): id is string => Boolean(id))),
  ]);
  const referencedHospitalIds = new Set([
    ...(treatmentRaw.hospital_ids || []),
    ...medications.flatMap(item => item.hospital_id ? [item.hospital_id] : []),
  ]);
  const referencedLocationIds = new Set([
    ...(treatmentRaw.local_ids || []),
    ...medications.flatMap(item => item.local_id ? [item.local_id] : []),
  ]);

  return {
    tratamento: treatmentRaw,
    medicamentos: medications,
    renovacoes: renewalsRaw.filter(item => belongsToPerson(item, input.userId, input.personId) && medicationIds.has(item.medicamento_id)),
    cids: cidsRaw.filter(item => belongsToPerson(item, input.userId, input.personId)),
    medicos: doctorsRaw.filter(item => belongsToAccount(item, input.userId) && Boolean(item.id && referencedDoctorIds.has(item.id))),
    hospitais: hospitalsRaw.filter(item => belongsToAccount(item, input.userId) && Boolean(item.id && referencedHospitalIds.has(item.id))),
    locais: locationsRaw.filter(item => belongsToAccount(item, input.userId) && Boolean(item.id && referencedLocationIds.has(item.id))),
    consultas: consultationsRaw.filter(item => belongsToPerson(item, input.userId, input.personId)),
    exames: examsRaw.filter(item => belongsToPerson(item, input.userId, input.personId)),
    cirurgias: surgeriesRaw.filter(item => belongsToPerson(item, input.userId, input.personId)),
    registros: recordsRaw.filter(item => belongsToPerson(item, input.userId, input.personId)),
    documentos: documentsRaw.filter(item => belongsToPerson(item, input.userId, input.personId)),
  };
}

export type TreatmentDetailRelations = Awaited<ReturnType<typeof loadTreatmentDetailRelations>>;
