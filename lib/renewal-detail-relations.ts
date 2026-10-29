import { db } from "@/lib/db";

export type RenewalDetailRelationInput = {
  renewalId: string;
  userId: string;
  personId: string;
};

const ownedByPerson = <T extends { user_id?: string; person_id?: string }>(
  item: T | undefined,
  userId: string,
  personId: string,
) => Boolean(item && item.user_id === userId && item.person_id === personId);

const ownedByAccount = <T extends { user_id?: string }>(item: T | undefined, userId: string) =>
  Boolean(item && item.user_id === userId);

/** One authorized reactive graph for a prescription/acquisition detail page. */
export async function loadRenewalDetailRelations(input: RenewalDetailRelationInput) {
  const renewal = await db.renovacoes.get(input.renewalId);
  if (!renewal || !ownedByPerson(renewal, input.userId, input.personId)) return null;

  const [medicationRaw, doctorRaw, pharmacyRaw, hospitalRaw, locationRaw, documentRaw, historyRaw, withdrawalsRaw] = await Promise.all([
    db.medicamentos.get(renewal.medicamento_id),
    renewal.medico_id ? db.medicos.get(renewal.medico_id) : undefined,
    renewal.farmacia_id ? db.farmacias.get(renewal.farmacia_id) : undefined,
    renewal.hospital_id ? db.hospitais.get(renewal.hospital_id) : undefined,
    renewal.local_id ? db.locais.get(renewal.local_id) : undefined,
    renewal.document_id ? db.documents.get(renewal.document_id) : undefined,
    db.renovacoes.where("medicamento_id").equals(renewal.medicamento_id).toArray(),
    db.retiradas.where("person_id").equals(input.personId).toArray(),
  ]);

  return {
    renovacao: renewal,
    medicamento: ownedByPerson(medicationRaw, input.userId, input.personId) ? medicationRaw : undefined,
    medico: ownedByAccount(doctorRaw, input.userId) ? doctorRaw : undefined,
    farmacia: ownedByAccount(pharmacyRaw, input.userId) ? pharmacyRaw : undefined,
    hospital: ownedByAccount(hospitalRaw, input.userId) ? hospitalRaw : undefined,
    local: ownedByAccount(locationRaw, input.userId) ? locationRaw : undefined,
    documento: ownedByPerson(documentRaw, input.userId, input.personId) ? documentRaw : undefined,
    historico: historyRaw
      .filter(item => item.id !== input.renewalId && ownedByPerson(item, input.userId, input.personId))
      .sort((a, b) => (b.data_aquisicao || b.data || "").localeCompare(a.data_aquisicao || a.data || ""))
      .slice(0, 5),
    retiradas: withdrawalsRaw.filter(item =>
      ownedByPerson(item, input.userId, input.personId) &&
      (item.renovacao_origem_id === input.renewalId || item.renovacao_realizada_id === input.renewalId)
    ),
  };
}

export type RenewalDetailRelations = Awaited<ReturnType<typeof loadRenewalDetailRelations>>;
