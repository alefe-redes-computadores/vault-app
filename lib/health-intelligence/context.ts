// lib/health-intelligence/context.ts

import { db } from "@/lib/db";

import type {
  HealthInsightContext,
  PersonScoped,
} from "@/lib/health-insights";

function scopeToPerson<
  T extends {
    person_id?: string;
  },
>(
  items: T[],
  personId: string
): Array<PersonScoped<T>> {
  return items
    .filter(
      (item) =>
        item.person_id ===
        personId
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
  hoje?: string
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
  ] =
    await Promise.all([
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
    ]);

  return {
    personId:
      safePersonId,

    hoje,

    medicamentos:
      scopeToPerson(
        medicamentos,
        safePersonId
      ),

    doseLogs:
      scopeToPerson(
        doseLogs,
        safePersonId
      ),

    renovacoes:
      scopeToPerson(
        renovacoes,
        safePersonId
      ),

    tratamentos:
      scopeToPerson(
        tratamentos,
        safePersonId
      ),

    registrosSaude:
      scopeToPerson(
        registrosSaude,
        safePersonId
      ),

    consultas:
      scopeToPerson(
        consultas,
        safePersonId
      ),

    exames:
      scopeToPerson(
        exames,
        safePersonId
      ),

    cirurgias:
      scopeToPerson(
        cirurgias,
        safePersonId
      ),

    cids:
      scopeToPerson(
        cids,
        safePersonId
      ),

    documentos:
      scopeToPerson(
        documentos,
        safePersonId
      ),
  };
}
