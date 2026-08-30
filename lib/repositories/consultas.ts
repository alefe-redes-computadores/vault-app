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
      await supabase.auth.getUser();

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

    const consultaCompleta:
      Consulta = {
      ...data,

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

        await enfileirarOperacao(
          "consultas",
          "update",
          {
            id,
            ...payload,
          }
        );
      }
    );

    return id;
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
        db.syncQueue,
      ],
      async () => {
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