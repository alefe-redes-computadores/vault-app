// lib/health-intelligence/context.ts

import { db } from "@/lib/db";

import type {
  HealthInsightContext,
  PersonScoped,
} from "@/lib/health-insights";

function scopeToPerson<
  T extends {
    person_id?: string;
    user_id?: string;
  },
>(
  items: T[],
  personId: string,
  userId?: string
): Array<PersonScoped<T>> {
  return items
    .filter(
      (item) =>
        item.person_id ===
        personId && (!userId || item.user_id === userId)
    )
    .map(
      (item) => ({
        ...item,
        person_id:
          personId,
      })
    );
}

export async function loadHealthInsightContext(
  personId: string,
  hoje?: string,
  userId?: string
): Promise<HealthInsightContext> {
  const safePersonId =
    personId.trim();

  if (
    !safePersonId
  ) {
    throw new Error(
      "Pessoa do contexto clínico não identificada."
    );
  }

  const [
    medicamentos,
    doseLogs,
    renovacoes,
    tratamentos,
    registrosSaude,
    consultas,
    exames,
    cirurgias,
    cids,
    documentos,
    retiradas,
    processos,ciclos,itens,vinculos,
  ] =
    await db.transaction("r", [db.persons, db.medicamentos, db.doseLogs, db.renovacoes, db.tratamentos, db.registros_saude, db.consultas, db.exames, db.cirurgias, db.cids, db.documents, db.retiradas, db.fornecimentos, db.fornecimento_ciclos, db.fornecimento_itens, db.fornecimento_documentos], async () => {
  if (userId) {
    const person = await db.persons.get(safePersonId);
    if (person?.user_id !== userId) throw new Error("Pessoa não pertence à conta atual.");
  }

    return Promise.all([
      db.medicamentos
        .where("person_id")
        .equals(safePersonId)
        .toArray(),

      db.doseLogs
        .where("person_id")
        .equals(safePersonId)
        .toArray(),

      db.renovacoes
        .where("person_id")
        .equals(safePersonId)
        .toArray(),

      db.tratamentos
        .where("person_id")
        .equals(safePersonId)
        .toArray(),

      db.registros_saude
        .where("person_id")
        .equals(safePersonId)
        .toArray(),

      db.consultas
        .where("person_id")
        .equals(safePersonId)
        .toArray(),

      db.exames
        .where("person_id")
        .equals(safePersonId)
        .toArray(),

      db.cirurgias
        .where("person_id")
        .equals(safePersonId)
        .toArray(),

      db.cids
        .where("person_id")
        .equals(safePersonId)
        .toArray(),

      db.documents
        .where("person_id")
        .equals(safePersonId)
        .toArray(),

      db.retiradas
        .where("person_id")
        .equals(safePersonId)
        .toArray(),
      db.fornecimentos.where("person_id").equals(safePersonId).toArray(),
      db.fornecimento_ciclos.where("person_id").equals(safePersonId).toArray(),
      db.fornecimento_itens.where("person_id").equals(safePersonId).toArray(),
      db.fornecimento_documentos.where("person_id").equals(safePersonId).toArray(),
    ]);
    });

  return {
    personId:
      safePersonId,

    hoje,
    fornecimento:{processos:scopeToPerson(processos,safePersonId,userId),ciclos:scopeToPerson(ciclos,safePersonId,userId),itens:scopeToPerson(itens,safePersonId,userId),documentos:scopeToPerson(vinculos,safePersonId,userId)},

    medicamentos:
      scopeToPerson(
        medicamentos,
        safePersonId,
        userId
      ),

    doseLogs:
      scopeToPerson(
        doseLogs,
        safePersonId,
        userId
      ),

    renovacoes:
      scopeToPerson(
        renovacoes,
        safePersonId,
        userId
      ),

    tratamentos:
      scopeToPerson(
        tratamentos,
        safePersonId,
        userId
      ),

    registrosSaude:
      scopeToPerson(
        registrosSaude,
        safePersonId,
        userId
      ),

    consultas:
      scopeToPerson(
        consultas,
        safePersonId,
        userId
      ),

    exames:
      scopeToPerson(
        exames,
        safePersonId,
        userId
      ),

    cirurgias:
      scopeToPerson(
        cirurgias,
        safePersonId,
        userId
      ),

    cids:
      scopeToPerson(
        cids,
        safePersonId,
        userId
      ),

    documentos:
      scopeToPerson(
        documentos,
        safePersonId,
        userId
      ),

    retiradas:
      scopeToPerson(
        retiradas,
        safePersonId,
        userId
      ),
  };
}
