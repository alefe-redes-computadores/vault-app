import { db } from "@/lib/db";
export async function getSupplyOverview(userId: string, personId: string) {
  if (!userId || !personId) return null;
  const [
    processos,
    ciclos,
    itens,
    documentos,
    meds,
    withdrawals,
    files,
    renewals,
  ] = await Promise.all([
    db.fornecimentos
      .where("person_id")
      .equals(personId)
      .filter((x) => x.user_id === userId)
      .toArray(),
    db.fornecimento_ciclos
      .where("person_id")
      .equals(personId)
      .filter((x) => x.user_id === userId)
      .toArray(),
    db.fornecimento_itens
      .where("person_id")
      .equals(personId)
      .filter((x) => x.user_id === userId)
      .toArray(),
    db.fornecimento_documentos
      .where("person_id")
      .equals(personId)
      .filter((x) => x.user_id === userId)
      .toArray(),
    db.medicamentos
      .where("person_id")
      .equals(personId)
      .filter((x) => x.user_id === userId)
      .toArray(),
    db.retiradas
      .where("person_id")
      .equals(personId)
      .filter((x) => x.user_id === userId)
      .toArray(),
    db.documents
      .where("person_id")
      .equals(personId)
      .filter((x) => x.user_id === userId)
      .toArray(),
    db.renovacoes
      .where("person_id")
      .equals(personId)
      .filter((x) => x.user_id === userId)
      .toArray(),
  ]);
  return {
    data: { processos, ciclos, itens, documentos },
    meds,
    withdrawals,
    files,
    renewals,
  };
}
