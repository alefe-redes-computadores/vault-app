// lib/health-intelligence/context.ts

import { db } from "@/lib/db";
import { estimateHydrationReference } from "@/lib/health-intelligence/hydration-reference";

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

  if (!userId?.trim()) {
    throw new Error("Conta do contexto clínico não identificada.");
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
    processos,ciclos,itens,vinculos,hydrationGoals,healthProfiles,
  ] =
    await db.transaction("r", [db.persons, db.medicamentos, db.doseLogs, db.renovacoes, db.tratamentos, db.registros_saude, db.consultas, db.exames, db.cirurgias, db.cids, db.documents, db.retiradas, db.fornecimentos, db.fornecimento_ciclos, db.fornecimento_itens, db.fornecimento_documentos, ...db.tables.filter(table => table.name === "health_goals" || table.name === "health_profiles")], async () => {
  if (userId) {
    const person = await db.persons.get(safePersonId);
    if (person?.user_id !== userId) throw new Error("Pessoa não pertence à conta atual.");
  }

    const owner = [userId, safePersonId] as [string, string];

    return Promise.all([
      db.medicamentos
        .where("[user_id+person_id]")
        .equals(owner)
        .toArray(),

      db.doseLogs
        .where("[user_id+person_id]")
        .equals(owner)
        .toArray(),

      db.renovacoes
        .where("[user_id+person_id]")
        .equals(owner)
        .toArray(),

      db.tratamentos
        .where("[user_id+person_id]")
        .equals(owner)
        .toArray(),

      db.registros_saude
        .where("[user_id+person_id]")
        .equals(owner)
        .toArray(),

      db.consultas
        .where("[user_id+person_id]")
        .equals(owner)
        .toArray(),

      db.exames
        .where("[user_id+person_id]")
        .equals(owner)
        .toArray(),

      db.cirurgias
        .where("[user_id+person_id]")
        .equals(owner)
        .toArray(),

      db.cids
        .where("[user_id+person_id]")
        .equals(owner)
        .toArray(),

      db.documents
        .where("[user_id+person_id]")
        .equals(owner)
        .toArray(),

      db.retiradas.where("[user_id+person_id]").equals(owner).toArray(),
      db.fornecimentos.where("[user_id+person_id]").equals(owner).toArray(),
      db.fornecimento_ciclos.where("[user_id+person_id]").equals(owner).toArray(),
      db.fornecimento_itens.where("[user_id+person_id]").equals(owner).toArray(),
      db.fornecimento_documentos.where("[user_id+person_id]").equals(owner).toArray(),
      db.tables.some(table => table.name === "health_goals")
        ? db.health_goals.where("user_id").equals(userId).filter(row => row.person_id === safePersonId && row.goal_type === "hydration_ml").toArray()
        : Promise.resolve([]),
      db.tables.some(table => table.name === "health_profiles")
        ? db.health_profiles.where("user_id").equals(userId).filter(row => row.person_id === safePersonId).toArray()
        : Promise.resolve([]),
    ]);
    });

  // M70: both references are owned; weight is the most recent real measurement.
  const recentWeight = registrosSaude
    .filter(row => row.user_id === userId && row.person_id === safePersonId && row.tipo === "peso" && row.unidade_medida === "kg" && typeof row.valor_numerico === "number")
    .sort((a,b) => `${b.data}:${b.horario || ""}`.localeCompare(`${a.data}:${a.horario || ""}`))[0];
  const ownerProfile = healthProfiles.find(row => row.user_id === userId && row.person_id === safePersonId);
  const ownerGoal = hydrationGoals.find(row => row.user_id === userId && row.person_id === safePersonId && row.goal_type === "hydration_ml");
  const reference = estimateHydrationReference(recentWeight?.valor_numerico, ownerProfile?.height_cm);
  return {
    hydration: {goalMl: ownerGoal?.target_value ?? null, reference},
    personId:
      safePersonId,
    userId,

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
