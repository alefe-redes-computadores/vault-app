// lib/repositories/cirurgias.ts

import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Cirurgia } from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type CreateCirurgiaInput = Omit<
  Cirurgia,
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

type UpdateCirurgiaInput = Partial<
  Omit<
    Cirurgia,
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
  const normalized = personId.trim();

  if (!normalized) {
    throw new Error(
      "Pessoa ativa não identificada."
    );
  }

  return normalized;
}

async function getCirurgiaForPerson(
  id: string,
  personId: string
): Promise<Cirurgia | undefined> {
  const safePersonId =
    requirePersonId(personId);

  const cirurgia =
    await db.cirurgias.get(id);

  if (
    !cirurgia ||
    cirurgia.person_id !== safePersonId
  ) {
    return undefined;
  }

  return cirurgia;
}

// ============================================================
// REPOSITORY
// ============================================================

export const cirurgiasRepository = {
  // ==========================================================
  // LISTA
  // ==========================================================

  async getAll(
    personId: string
  ) {
    const safePersonId =
      requirePersonId(personId);

    return db.cirurgias
      .where("person_id")
      .equals(safePersonId)
      .toArray();
  },

  // ==========================================================
  // GET
  // ==========================================================

  async getById(
    id: string,
    personId: string
  ) {
    return getCirurgiaForPerson(
      id,
      personId
    );
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data: CreateCirurgiaInput
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

    const cirurgiaId =
      data.id ||
      crypto.randomUUID();

    const cirurgiaCompleta:
      Cirurgia = {
      ...data,

      id:
        cirurgiaId,

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
        db.cirurgias,
        db.syncQueue,
      ],
      async () => {
        await db.cirurgias.add(
          cirurgiaCompleta
        );

        await enfileirarOperacao(
          "cirurgias",
          "add",
          cirurgiaCompleta
        );
      }
    );

    return cirurgiaId;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    personId: string,
    data: UpdateCirurgiaInput
  ) {
    const safePersonId =
      requirePersonId(
        personId
      );

    const current =
      await getCirurgiaForPerson(
        id,
        safePersonId
      );

    if (!current) {
      throw new Error(
        "Cirurgia não encontrada para a pessoa ativa."
      );
    }

    const now =
      new Date().toISOString();

    const payload:
      UpdateCirurgiaInput &
        Pick<
          Cirurgia,
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
        db.cirurgias,
        db.syncQueue,
      ],
      async () => {
        const updated =
          await db.cirurgias.update(
            id,
            payload
          );

        if (!updated) {
          throw new Error(
            "Não foi possível atualizar a cirurgia."
          );
        }

        await enfileirarOperacao(
          "cirurgias",
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
      await getCirurgiaForPerson(
        id,
        safePersonId
      );

    if (!current) {
      throw new Error(
        "Cirurgia não encontrada para a pessoa ativa."
      );
    }

    await db.transaction(
      "rw",
      [
        db.cirurgias,
        db.syncQueue,
      ],
      async () => {
        await db.cirurgias.delete(
          id
        );

        await enfileirarOperacao(
          "cirurgias",
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