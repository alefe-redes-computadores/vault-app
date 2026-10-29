import { db } from "@/lib/db";

export type ConsultationDetailDossierInput = { consultationId: string; userId: string; personId: string };
const ownedPerson = <T extends { user_id?: string; person_id?: string }>(item: T, input: ConsultationDetailDossierInput) => item.user_id === input.userId && item.person_id === input.personId;
const ownedAccount = <T extends { user_id?: string }>(item: T | undefined, userId: string) => item?.user_id === userId ? item : undefined;

export async function loadConsultationDetailDossier(input: ConsultationDetailDossierInput) {
  const consulta = await db.consultas.get(input.consultationId);
  if (!consulta || !ownedPerson(consulta, input)) return null;
  const [doctorRaw, hospitalRaw, locationRaw, treatmentsRaw, cidsRaw, medicationsRaw, examsRaw] = await Promise.all([
    consulta.medico_id ? db.medicos.get(consulta.medico_id) : undefined,
    consulta.hospital_id ? db.hospitais.get(consulta.hospital_id) : undefined,
    consulta.local_id ? db.locais.get(consulta.local_id) : undefined,
    db.tratamentos.where("person_id").equals(input.personId).toArray(),
    db.cids.where("person_id").equals(input.personId).toArray(),
    db.medicamentos.where("person_id").equals(input.personId).toArray(),
    db.exames.where("person_id").equals(input.personId).toArray(),
  ]);
  return {
    consulta,
    medico: ownedAccount(doctorRaw, input.userId),
    hospital: ownedAccount(hospitalRaw, input.userId),
    local: ownedAccount(locationRaw, input.userId),
    tratamentos: treatmentsRaw.filter(item => ownedPerson(item, input)),
    cids: cidsRaw.filter(item => ownedPerson(item, input)),
    medicamentos: medicationsRaw.filter(item => ownedPerson(item, input)),
    exames: examsRaw.filter(item => ownedPerson(item, input)),
  };
}
