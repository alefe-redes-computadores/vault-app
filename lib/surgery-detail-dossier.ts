import { db } from "@/lib/db";

export type SurgeryDetailDossierInput = {
  surgeryId: string;
  userId: string;
  personId: string;
};

const ownedPerson = <T extends { user_id?: string; person_id?: string }>(item: T, input: SurgeryDetailDossierInput) =>
  item.user_id === input.userId && item.person_id === input.personId;

const ownedAccount = <T extends { user_id?: string }>(item: T | undefined, userId: string) =>
  item?.user_id === userId ? item : undefined;

/** One reactive, account/person-authorized dossier for the surgery detail. */
export async function loadSurgeryDetailDossier(input: SurgeryDetailDossierInput) {
  const surgery = await db.cirurgias.get(input.surgeryId);
  if (!surgery || !ownedPerson(surgery, input)) return null;

  const treatmentIds = new Set(surgery.tratamento_ids || []);
  const cidIds = new Set(surgery.cid_ids || []);
  const [doctorRaw, hospitalRaw, locationRaw, treatmentsRaw, cidsRaw, medicationsRaw, examsRaw] = await Promise.all([
    surgery.medico_id ? db.medicos.get(surgery.medico_id) : undefined,
    surgery.hospital_id ? db.hospitais.get(surgery.hospital_id) : undefined,
    surgery.local_id ? db.locais.get(surgery.local_id) : undefined,
    treatmentIds.size ? db.tratamentos.where("id").anyOf([...treatmentIds]).toArray() : [],
    cidIds.size ? db.cids.where("id").anyOf([...cidIds]).toArray() : [],
    db.medicamentos.where("person_id").equals(input.personId).toArray(),
    db.exames.where("person_id").equals(input.personId).toArray(),
  ]);

  const tratamentos = treatmentsRaw.filter(item => ownedPerson(item, input));
  const authorizedTreatmentIds = new Set(tratamentos.flatMap(item => item.id ? [item.id] : []));
  const intersectsTreatment = (ids?: string[]) => ids?.some(id => authorizedTreatmentIds.has(id)) === true;

  return {
    cirurgia: surgery,
    medico: ownedAccount(doctorRaw, input.userId),
    hospital: ownedAccount(hospitalRaw, input.userId),
    local: ownedAccount(locationRaw, input.userId),
    tratamentos,
    cids: cidsRaw.filter(item => ownedPerson(item, input)),
    medicamentos: medicationsRaw.filter(item => ownedPerson(item, input) && intersectsTreatment(item.tratamento_ids)),
    exames: examsRaw.filter(item => ownedPerson(item, input) && intersectsTreatment(item.tratamento_ids)),
  };
}

export type SurgeryDetailDossier = Awaited<ReturnType<typeof loadSurgeryDetailDossier>>;
