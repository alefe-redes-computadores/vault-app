import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
// lib/repositories/consultas.ts

import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Consulta } from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type CreateConsultaInput = Omit<
  Consulta,
  | "id"
  | "user_id"
  | "person_id"
  | "created_at"
  | "updated_at"
  | "synced"
> & {
  id?: string;
  person_id: string;
};

type UpdateConsultaInput = Partial<
  Omit<
    Consulta,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
  >
>;

/** CI360 P6 — conferencia ANTES da escrita offline e da outbox. */
async function scopedMedicationIdsP6(selected:readonly string[]|undefined,userId:string,personId:string):Promise<string[]|undefined> {
  if(selected===undefined)return undefined;
  if(!Array.isArray(selected)||selected.length>64||new Set(selected).size!==selected.length)
    throw new Error("Vínculos de medicamentos inválidos ou duplicados.");
  const checked:string[]=[];
  for(const id of selected){
    if(typeof id!=="string"||!id.trim())throw new Error("ID de medicamento inválido.");
    const med=await db.medicamentos.get(id);
    if(!med||med.user_id!==userId||med.person_id!==personId)
      throw new Error("Medicamento não pertence à conta e pessoa ativa.");
    checked.push(id);
  }
  return checked;
}

// ============================================================
// HELPERS
// ============================================================

function requirePersonId(
  personId: string
): string {
  const normalized =
    personId.trim();

  if (!normalized) {
    throw new Error(
      "Pessoa ativa não identificada."
    );
  }

  return normalized;
}

async function getConsultaForPerson(
  id: string,
  personId: string
): Promise<Consulta | undefined> {
  const safePersonId =
    requirePersonId(
      personId
    );

  const consulta =
    await db.consultas.get(
      id
    );

  if (
    !consulta ||
    consulta.person_id !==
      safePersonId
  ) {
    return undefined;
  }

  return consulta;
}

// ============================================================
// REPOSITORY
// ============================================================

export const consultasRepository = {
  // ==========================================================
  // LISTA
  // ==========================================================

  async getAll(
    personId: string
  ) {
    const safePersonId =
      requirePersonId(
        personId
      );

    return db.consultas
      .where(
        "person_id"
      )
      .equals(
        safePersonId
      )
      .toArray();
  },

  // ==========================================================
  // GET
  // ==========================================================

  async getById(
    id: string,
    personId: string
  ) {
    return getConsultaForPerson(
      id,
      personId
    );
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data: CreateConsultaInput
  ) {
    const personId =
      requirePersonId(
        data.person_id
      );

    const {
      data: {
        user,
      },
    } =
      await getLocalFirstAuthUser();

    if (!user) {
      throw new Error(
        "Usuário não autenticado."
      );
    }

    const now =
      new Date().toISOString();

    const consultaId =
      data.id ||
      crypto.randomUUID();

    const allowedMedicationIdsP6 = await scopedMedicationIdsP6(data.medicamento_ids,user.id,personId);
    const rejectedLinksP6R2 = await scopedMedicationIdsP6(data.revisao_vinculos_rejeitados,user.id,personId);
    if(rejectedLinksP6R2?.some(id=>(allowedMedicationIdsP6??[]).includes(id)))
      throw new Error("Um medicamento não pode estar vinculado e rejeitado na mesma consulta.");
    const consultaCompleta:
      Consulta = {
      ...data,
      ...(allowedMedicationIdsP6 !== undefined ? {medicamento_ids: allowedMedicationIdsP6}:{}),
      ...(rejectedLinksP6R2 !== undefined ? {revisao_vinculos_rejeitados: rejectedLinksP6R2}:{}),

      id:
        consultaId,

      user_id:
        user.id,

      person_id:
        personId,

      created_at:
        now,

      updated_at:
        now,

      synced:
        false,
    };

    await db.transaction(
      "rw",
      [
        db.consultas,
        db.syncQueue,
      ],
      async () => {
        await db.consultas.add(
          consultaCompleta
        );

        await enfileirarOperacao(
          "consultas",
          "add",
          consultaCompleta
        );
      }
    );

    return consultaId;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    personId: string,
    data: UpdateConsultaInput
  ) {
    const safePersonId =
      requirePersonId(
        personId
      );

    const current =
      await getConsultaForPerson(
        id,
        safePersonId
      );

    if (!current) {
      throw new Error(
        "Consulta não encontrada para a pessoa ativa."
      );
    }

    const authResultP6=await getLocalFirstAuthUser();
    const ownerP6=authResultP6.data.user;
    if(!ownerP6||current.user_id!==ownerP6.id)throw new Error("Conta da consulta não corresponde à sessão ativa.");
    const allowedMedicationIdsP6=await scopedMedicationIdsP6(data.medicamento_ids,ownerP6.id,safePersonId);
    const rejectedLinksP6R2=await scopedMedicationIdsP6(data.revisao_vinculos_rejeitados,ownerP6.id,safePersonId);
    const effectiveAcceptedP6R2=allowedMedicationIdsP6??current.medicamento_ids??[];
    const effectiveRejectedP6R2=rejectedLinksP6R2??current.revisao_vinculos_rejeitados??[];
    if(effectiveRejectedP6R2.some(id=>effectiveAcceptedP6R2.includes(id)))
      throw new Error("Vínculo rejeitado incompatível com medicamento já aceito nesta consulta.");
    const now =
      new Date().toISOString();

    const payload:
      UpdateConsultaInput &
        Pick<
          Consulta,
          | "updated_at"
          | "synced"
        > = {
      ...data,
      ...(allowedMedicationIdsP6 !== undefined ? {medicamento_ids: allowedMedicationIdsP6}:{}),
      ...(rejectedLinksP6R2 !== undefined ? {revisao_vinculos_rejeitados: rejectedLinksP6R2}:{}),

      updated_at:
        now,

      synced:
        false,
    };

    await db.transaction(
      "rw",
      [
        db.consultas,
        db.syncQueue,
      ],
      async () => {
        const updated =
          await db.consultas.update(
            id,
            payload
          );

        if (!updated) {
          throw new Error(
            "Não foi possível atualizar a consulta."
          );
        }

        const consultaAtualizadaP0: Consulta = {
          ...current,
          ...payload,
          id,
          user_id: ownerP6.id,
          person_id: safePersonId,
          created_at: current.created_at,
        };

        await enfileirarOperacao(
          "consultas",
          "update",
          consultaAtualizadaP0
        );
      }
    );

    return id;
  },

  // P6 P3-D2: vínculo idempotente no repositório canônico.
  // Não renomear tratamentos nem reescrever histórico clínico.
  async linkMedicationFromCreationD2(consultationId: string, personId: string, medicationId: string) {
    const person = requirePersonId(personId);
    if (!consultationId?.trim() || !medicationId?.trim()) throw new Error("IDs da consulta e medicamento obrigatórios.");
    const auth = await getLocalFirstAuthUser();
    const userId = auth.data.user?.id;
    if (!userId) throw new Error("Autenticação necessária para vincular medicamento.");
    return db.transaction("rw", [db.consultas, db.medicamentos, db.syncQueue], async () => {
      const consultation = await db.consultas.get(consultationId);
      const medication = await db.medicamentos.get(medicationId);
      if (!consultation || consultation.user_id !== userId || consultation.person_id !== person)
        throw new Error("Consulta indisponível para a conta e pessoa ativas.");
      if (!medication || medication.user_id !== userId || medication.person_id !== person)
        throw new Error("Medicamento indisponível para a conta e pessoa ativas.");
      if (consultation.status === "cancelada") throw new Error("Consulta cancelada não permite novo vínculo.");
      if (consultation.revisao_vinculos_rejeitados?.includes(medicationId))
        throw new Error("Vínculo previamente rejeitado; revise manualmente na consulta.");
      const selected = consultation.medicamento_ids || [];
      if (!Array.isArray(selected) || selected.length > 64 || selected.length !== new Set(selected).size)
        throw new Error("Vínculos de consulta precisam de revisão antes de incluir outro.");
      if (selected.includes(medicationId)) return "already-linked" as const;
      if (selected.length >= 64) throw new Error("Limite de vínculos alcançado; revise a consulta.");
      const updatedIds = [...selected, medicationId];
      // Reutilizar a barreira canônica de IDs por conta e pessoa.
      await scopedMedicationIdsP6(updatedIds, userId, person);
      const updatedAt = new Date().toISOString();
      const updated = await db.consultas.update(consultationId, {
        medicamento_ids: updatedIds, updated_at: updatedAt, synced: false,
      });
      if (!updated) throw new Error("Consulta alterada durante o vínculo.");
      await enfileirarOperacao("consultas", "update", {
        id: consultationId, medicamento_ids: updatedIds, updated_at: updatedAt, synced: false,
      });
      return "linked" as const;
    });
  },

  // ==========================================================
  // DELETE
  // ==========================================================

  async delete(
    id: string,
    personId: string
  ) {
    const safePersonId =
      requirePersonId(
        personId
      );

    const current =
      await getConsultaForPerson(
        id,
        safePersonId
      );

    if (!current) {
      throw new Error(
        "Consulta não encontrada para a pessoa ativa."
      );
    }

    await db.transaction(
      "rw",
      [
        db.consultas,
        db.fornecimento_ciclos,
        db.syncQueue,
      ],
      async () => {
        const related = await db.fornecimento_ciclos.where("person_id").equals(safePersonId).filter(c=>c.consulta_id===id&&c.user_id===current.user_id).toArray();
        for(const c of related){
          const row={...c,consulta_id:null,updated_at:new Date().toISOString(),synced:false};
          await db.fornecimento_ciclos.put(row);
          await enfileirarOperacao("fornecimento_ciclos","update",row,{dispatchSync:false});
        }
        await db.consultas.delete(
          id
        );

        await enfileirarOperacao(
          "consultas",
          "delete",
          {
            id,
          }
        );
      }
    );

    return id;
  },
};