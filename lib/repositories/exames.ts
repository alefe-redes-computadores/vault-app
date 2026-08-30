// lib/repositories/exames.ts

import {
  db,
} from "@/lib/db";

import {
  enfileirarOperacao,
  solicitarProcessamentoSync,
} from "@/lib/sync/enfileirarOperacao";

import {
  supabase,
} from "@/lib/supabase/client";

import type {
  Exame,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type CreateExameInput = Omit<
  Exame,
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

type UpdateExameInput = Partial<
  Omit<
    Exame,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
    | "updated_at"
    | "synced"
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

  if (
    !normalized
  ) {
    throw new Error(
      "Pessoa ativa não identificada."
    );
  }

  return normalized;
}

function normalizeIds(
  ids?: string[]
): string[] | undefined {
  if (
    !ids?.length
  ) {
    return undefined;
  }

  const normalized =
    Array.from(
      new Set(
        ids
          .map(
            (
              id
            ) =>
              id.trim()
          )
          .filter(
            Boolean
          )
      )
    );

  return normalized.length >
    0
    ? normalized
    : undefined;
}

async function getExameForPerson(
  id: string,
  personId: string
): Promise<
  Exame | undefined
> {
  const safePersonId =
    requirePersonId(
      personId
    );

  const exame =
    await db.exames.get(
      id
    );

  if (
    !exame ||
    exame.person_id !==
      safePersonId
  ) {
    return undefined;
  }

  return exame;
}

async function validateTratamentosForPerson(
  tratamentoIds:
    string[] | undefined,
  personId:
    string
): Promise<void> {
  if (
    !tratamentoIds?.length
  ) {
    return;
  }

  for (
    const tratamentoId of
    tratamentoIds
  ) {
    const tratamento =
      await db.tratamentos.get(
        tratamentoId
      );

    if (
      !tratamento ||
      tratamento.person_id !==
        personId
    ) {
      throw new Error(
        "Um dos tratamentos selecionados não pertence à pessoa ativa."
      );
    }
  }
}

async function validateCidsForPerson(
  cidIds:
    string[] | undefined,
  personId:
    string
): Promise<void> {
  if (
    !cidIds?.length
  ) {
    return;
  }

  for (
    const cidId of
    cidIds
  ) {
    const cid =
      await db.cids.get(
        cidId
      );

    if (
      !cid ||
      cid.person_id !==
        personId
    ) {
      throw new Error(
        "Um dos CIDs selecionados não pertence à pessoa ativa."
      );
    }
  }
}

// ============================================================
// REPOSITORY
// ============================================================

export const examesRepository = {
  // ==========================================================
  // LIST
  // ==========================================================

  async getAll(
    personId: string
  ) {
    const safePersonId =
      requirePersonId(
        personId
      );

    return db.exames
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
    return getExameForPerson(
      id,
      personId
    );
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data:
      CreateExameInput
  ) {
    const personId =
      requirePersonId(
        data.person_id
      );

    const tratamentoIds =
      normalizeIds(
        data.tratamento_ids
      );

    const cidIds =
      normalizeIds(
        data.cid_ids
      );

    await validateTratamentosForPerson(
      tratamentoIds,
      personId
    );

    await validateCidsForPerson(
      cidIds,
      personId
    );

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (
      !user
    ) {
      throw new Error(
        "Usuário não autenticado."
      );
    }

    const now =
      new Date().toISOString();

    const exameId =
      data.id ||
      crypto.randomUUID();

    const exameCompleto:
      Exame = {
      ...data,

      id:
        exameId,

      person_id:
        personId,

      user_id:
        user.id,

      tratamento_ids:
        tratamentoIds,

      cid_ids:
        cidIds,

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
        db.exames,
        db.syncQueue,
      ],
      async () => {
        await db.exames.add(
          exameCompleto
        );

        await enfileirarOperacao(
          "exames",
          "add",
          exameCompleto,
          {
            dispatchSync:
              false,
          }
        );
      }
    );

    solicitarProcessamentoSync();

    return exameId;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    personId: string,
    data:
      UpdateExameInput
  ) {
    const safePersonId =
      requirePersonId(
        personId
      );

    const current =
      await getExameForPerson(
        id,
        safePersonId
      );

    if (
      !current
    ) {
      throw new Error(
        "Exame não encontrado para a pessoa ativa."
      );
    }

    const tratamentoIds =
      "tratamento_ids" in
      data
        ? normalizeIds(
            data.tratamento_ids
          )
        : current.tratamento_ids;

    const cidIds =
      "cid_ids" in
      data
        ? normalizeIds(
            data.cid_ids
          )
        : current.cid_ids;

    await validateTratamentosForPerson(
      tratamentoIds,
      safePersonId
    );

    await validateCidsForPerson(
      cidIds,
      safePersonId
    );

    const now =
      new Date().toISOString();

    const updatedExame:
      Exame = {
      ...current,
      ...data,

      id:
        current.id,

      user_id:
        current.user_id,

      person_id:
        safePersonId,

      tratamento_ids:
        tratamentoIds,

      cid_ids:
        cidIds,

      created_at:
        current.created_at,

      updated_at:
        now,

      synced:
        false,
    };

    await db.transaction(
      "rw",
      [
        db.exames,
        db.syncQueue,
      ],
      async () => {
        await db.exames.put(
          updatedExame
        );

        await enfileirarOperacao(
          "exames",
          "update",
          updatedExame,
          {
            dispatchSync:
              false,
          }
        );
      }
    );

    solicitarProcessamentoSync();

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
      await getExameForPerson(
        id,
        safePersonId
      );

    if (
      !current
    ) {
      throw new Error(
        "Exame não encontrado para a pessoa ativa."
      );
    }

    await db.transaction(
      "rw",
      [
        db.exames,
        db.syncQueue,
      ],
      async () => {
        await db.exames.delete(
          id
        );

        await enfileirarOperacao(
          "exames",
          "delete",
          {
            id,
          },
          {
            dispatchSync:
              false,
          }
        );
      }
    );

    solicitarProcessamentoSync();

    return id;
  },
};