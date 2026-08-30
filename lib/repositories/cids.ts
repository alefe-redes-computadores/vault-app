// lib/repositories/cids.ts
import { db } from "@/lib/db";
import {
  enfileirarOperacao,
} from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Cid } from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type CreateCidInput = Omit<
  Cid,
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

type UpdateCidInput = Partial<
  Omit<
    Cid,
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

async function getCidForPerson(
  id: string,
  personId: string
): Promise<Cid | undefined> {
  const safePersonId =
    requirePersonId(
      personId
    );

  const cid =
    await db.cids.get(id);

  if (
    !cid ||
    cid.person_id !==
      safePersonId
  ) {
    return undefined;
  }

  return cid;
}

// ============================================================
// REPOSITORY
// ============================================================

export const cidsRepository = {
  // ==========================================================
  // LEITURA
  // ==========================================================

  async getAll(
    personId: string
  ) {
    const safePersonId =
      requirePersonId(
        personId
      );

    return db.cids
      .where(
        "person_id"
      )
      .equals(
        safePersonId
      )
      .toArray();
  },

  async getById(
    id: string,
    personId: string
  ) {
    return getCidForPerson(
      id,
      personId
    );
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data: CreateCidInput
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

    const cidId =
      data.id ||
      crypto.randomUUID();

    const cidCompleto:
      Cid = {
      ...data,

      id:
        cidId,

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
        db.cids,
        db.syncQueue,
      ],
      async () => {
        await db.cids.add(
          cidCompleto
        );

        await enfileirarOperacao(
          "cids",
          "add",
          cidCompleto
        );
      }
    );

    return cidId;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    personId: string,
    data: UpdateCidInput
  ) {
    const safePersonId =
      requirePersonId(
        personId
      );

    const current =
      await getCidForPerson(
        id,
        safePersonId
      );

    if (!current) {
      throw new Error(
        "CID não encontrado para a pessoa ativa."
      );
    }

    const now =
      new Date().toISOString();

    const payload:
      UpdateCidInput &
        Pick<
          Cid,
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
        db.cids,
        db.syncQueue,
      ],
      async () => {
        const updated =
          await db.cids.update(
            id,
            payload
          );

        if (!updated) {
          throw new Error(
            "Não foi possível atualizar o CID."
          );
        }

        await enfileirarOperacao(
          "cids",
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
    return this.deleteSafe(
      id,
      personId
    );
  },

  async deleteSafe(
    id: string,
    personId: string
  ) {
    const safePersonId =
      requirePersonId(
        personId
      );

    const cid =
      await getCidForPerson(
        id,
        safePersonId
      );

    if (!cid) {
      throw new Error(
        "CID não encontrado para a pessoa ativa."
      );
    }

    const now =
      new Date().toISOString();

    await db.transaction(
      "rw",
      [
        db.cids,
        db.tratamentos,
        db.syncQueue,
      ],
      async () => {
        /*
         * Primeiro localizamos tratamentos que
         * possuem o CID na relação.
         *
         * Mesmo encontrando pelo índice cid_ids,
         * ainda restringimos explicitamente à
         * mesma pessoa do CID.
         */
        const tratamentosRelacionados =
          await db.tratamentos
            .where(
              "cid_ids"
            )
            .equals(id)
            .toArray();

        const tratamentosAfetados =
          tratamentosRelacionados.filter(
            (tratamento) =>
              tratamento.person_id ===
              safePersonId
          );

        /*
         * Removemos o CID dos tratamentos antes
         * de apagar o próprio diagnóstico.
         */
        for (
          const tratamento
          of tratamentosAfetados
        ) {
          if (
            !tratamento.id ||
            !tratamento.cid_ids
          ) {
            continue;
          }

          const novosIds =
            Array.from(
              new Set(
                tratamento.cid_ids.filter(
                  (
                    cidId
                  ) =>
                    cidId !== id
                )
              )
            );

          await db.tratamentos.update(
            tratamento.id,
            {
              cid_ids:
                novosIds,

              updated_at:
                now,

              synced:
                false,
            }
          );

          await enfileirarOperacao(
            "tratamentos",
            "update",
            {
              id:
                tratamento.id,

              cid_ids:
                novosIds,
            }
          );
        }

        await db.cids.delete(
          id
        );

        await enfileirarOperacao(
          "cids",
          "delete",
          {
            id,
          }
        );
      }
    );
  },
};