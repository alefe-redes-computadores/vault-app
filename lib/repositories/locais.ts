 // lib/repositories/locais.ts

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
  LocalSaude,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type CreateLocalInput = Omit<
  LocalSaude,
  | "id"
  | "user_id"
  | "person_id"
  | "tratamento_ids"
  | "created_at"
  | "updated_at"
  | "synced"
> & {
  id?: string;
};

type UpdateLocalInput = Partial<
  Omit<
    LocalSaude,
    | "id"
    | "user_id"
    | "person_id"
    | "tratamento_ids"
    | "created_at"
    | "updated_at"
    | "synced"
  >
>;

// ============================================================
// HELPERS
// ============================================================

function normalizeIds(
  ids?: string[]
): string[] {
  if (
    !ids?.length
  ) {
    return [];
  }

  return Array.from(
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
}

async function validateMedicos(
  medicoIds: string[]
): Promise<void> {
  if (
    medicoIds.length ===
    0
  ) {
    return;
  }

  const medicos =
    await db.medicos.bulkGet(
      medicoIds
    );

  const allExist =
    medicos.every(
      Boolean
    );

  if (
    !allExist
  ) {
    throw new Error(
      "Um ou mais médicos vinculados ao local não foram encontrados."
    );
  }
}

// ============================================================
// REPOSITORY
// ============================================================

export const locaisRepository = {
  // ==========================================================
  // LIST
  // ==========================================================

  async getAll() {
    return db.locais.toArray();
  },

  // ==========================================================
  // GET
  // ==========================================================

  async getById(
    id: string
  ) {
    return db.locais.get(
      id
    );
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data:
      CreateLocalInput
  ) {
    const medicoIds =
      normalizeIds(
        data.medico_ids
      );

    await validateMedicos(
      medicoIds
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

    const localId =
      data.id ||
      crypto.randomUUID();

    /*
     * Local é GLOBAL por usuário.
     *
     * Não possui:
     * - person_id;
     * - tratamento_ids.
     *
     * Local.medico_ids é a relação canônica direta
     * Local -> Médico.
     */
    const localCompleto:
      LocalSaude = {
      ...data,

      id:
        localId,

      user_id:
        user.id,

      person_id:
        undefined,

      tratamento_ids:
        undefined,

      medico_ids:
        medicoIds,

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
        db.locais,
        db.syncQueue,
      ],
      async () => {
        await db.locais.add(
          localCompleto
        );

        await enfileirarOperacao(
          "locais",
          "add",
          localCompleto,
          {
            dispatchSync:
              false,
          }
        );
      }
    );

    solicitarProcessamentoSync();

    return localId;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    data:
      UpdateLocalInput
  ) {
    const current =
      await db.locais.get(
        id
      );

    if (
      !current
    ) {
      throw new Error(
        "Local não encontrado."
      );
    }

    const medicoIds =
      data.medico_ids !==
      undefined
        ? normalizeIds(
            data.medico_ids
          )
        : normalizeIds(
            current.medico_ids
          );

    await validateMedicos(
      medicoIds
    );

    const now =
      new Date().toISOString();

    const updatedLocal:
      LocalSaude = {
      ...current,
      ...data,

      id:
        current.id,

      user_id:
        current.user_id,

      /*
       * Limpeza definitiva de arquitetura antiga.
       */
      person_id:
        undefined,

      tratamento_ids:
        undefined,

      medico_ids:
        medicoIds,

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
        db.locais,
        db.syncQueue,
      ],
      async () => {
        await db.locais.put(
          updatedLocal
        );

        await enfileirarOperacao(
          "locais",
          "update",
          updatedLocal,
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
    id: string
  ) {
    return this.deleteSafe(
      id
    );
  },

  // ==========================================================
  // DELETE SAFE
  // ==========================================================

  async deleteSafe(
    id: string
  ) {
    const local =
      await db.locais.get(
        id
      );

    if (
      !local
    ) {
      throw new Error(
        "Local não encontrado."
      );
    }

    const now =
      new Date().toISOString();

    /*
     * Local é global.
     *
     * Relações diretas:
     * - Cid.local_id
     * - Renovacao.local_id
     * - Medicamento.local_id
     * - Exame.local_id
     * - Consulta.local_id
     * - Cirurgia.local_id
     *
     * Relação N:N:
     * - Tratamento.local_ids[]
     *
     * Excluir o Local NÃO exclui registros clínicos.
     * Apenas remove a referência ao estabelecimento.
     */
    await db.transaction(
      "rw",
      [
        db.locais,
        db.cids,
        db.tratamentos,
        db.renovacoes,
        db.medicamentos,
        db.exames,
        db.consultas,
        db.cirurgias,
        db.syncQueue,
      ],
      async () => {
        // ------------------------------------------------------
        // CIDS
        // ------------------------------------------------------

        const cids =
          await db.cids
            .where(
              "local_id"
            )
            .equals(
              id
            )
            .toArray();

        for (
          const cid of
          cids
        ) {
          if (
            !cid.id
          ) {
            continue;
          }

          const updatedCid = {
            ...cid,

            local_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.cids.put(
            updatedCid
          );

          await enfileirarOperacao(
            "cids",
            "update",
            updatedCid,
            {
              dispatchSync:
                false,
            }
          );
        }

        // ------------------------------------------------------
        // TRATAMENTOS
        // ------------------------------------------------------

        const tratamentos =
          await db.tratamentos.toArray();

        const tratamentosDoLocal =
          tratamentos.filter(
            (
              tratamento
            ) =>
              tratamento.local_ids?.includes(
                id
              )
          );

        for (
          const tratamento of
          tratamentosDoLocal
        ) {
          if (
            !tratamento.id
          ) {
            continue;
          }

          const updatedTratamento = {
            ...tratamento,

            local_ids:
              normalizeIds(
                (
                  tratamento.local_ids ||
                  []
                ).filter(
                  (
                    localId
                  ) =>
                    localId !==
                    id
                )
              ),

            updated_at:
              now,

            synced:
              false,
          };

          await db.tratamentos.put(
            updatedTratamento
          );

          await enfileirarOperacao(
            "tratamentos",
            "update",
            updatedTratamento,
            {
              dispatchSync:
                false,
            }
          );
        }

        // ------------------------------------------------------
        // RENOVAÇÕES
        // ------------------------------------------------------

        const renovacoes =
          await db.renovacoes
            .where(
              "local_id"
            )
            .equals(
              id
            )
            .toArray();

        for (
          const renovacao of
          renovacoes
        ) {
          if (
            !renovacao.id
          ) {
            continue;
          }

          const updatedRenovacao = {
            ...renovacao,

            local_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.renovacoes.put(
            updatedRenovacao
          );

          await enfileirarOperacao(
            "renovacoes",
            "update",
            updatedRenovacao,
            {
              dispatchSync:
                false,
            }
          );
        }

        // ------------------------------------------------------
        // MEDICAMENTOS
        // ------------------------------------------------------

        const medicamentos =
          await db.medicamentos
            .where(
              "local_id"
            )
            .equals(
              id
            )
            .toArray();

        for (
          const medicamento of
          medicamentos
        ) {
          if (
            !medicamento.id
          ) {
            continue;
          }

          const updatedMedicamento = {
            ...medicamento,

            local_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.medicamentos.put(
            updatedMedicamento
          );

          await enfileirarOperacao(
            "medicamentos",
            "update",
            updatedMedicamento,
            {
              dispatchSync:
                false,
            }
          );
        }

        // ------------------------------------------------------
        // EXAMES
        // ------------------------------------------------------

        const exames =
          await db.exames
            .where(
              "local_id"
            )
            .equals(
              id
            )
            .toArray();

        for (
          const exame of
          exames
        ) {
          if (
            !exame.id
          ) {
            continue;
          }

          const updatedExame = {
            ...exame,

            local_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

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

        // ------------------------------------------------------
        // CONSULTAS
        // ------------------------------------------------------

        const consultas =
          await db.consultas
            .where(
              "local_id"
            )
            .equals(
              id
            )
            .toArray();

        for (
          const consulta of
          consultas
        ) {
          if (
            !consulta.id
          ) {
            continue;
          }

          const updatedConsulta = {
            ...consulta,

            local_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.consultas.put(
            updatedConsulta
          );

          await enfileirarOperacao(
            "consultas",
            "update",
            updatedConsulta,
            {
              dispatchSync:
                false,
            }
          );
        }

        // ------------------------------------------------------
        // CIRURGIAS
        // ------------------------------------------------------

        const cirurgias =
          await db.cirurgias
            .where(
              "local_id"
            )
            .equals(
              id
            )
            .toArray();

        for (
          const cirurgia of
          cirurgias
        ) {
          if (
            !cirurgia.id
          ) {
            continue;
          }

          const updatedCirurgia = {
            ...cirurgia,

            local_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.cirurgias.put(
            updatedCirurgia
          );

          await enfileirarOperacao(
            "cirurgias",
            "update",
            updatedCirurgia,
            {
              dispatchSync:
                false,
            }
          );
        }

        // ------------------------------------------------------
        // LOCAL
        // ------------------------------------------------------

        await db.locais.delete(
          id
        );

        await enfileirarOperacao(
          "locais",
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

    /*
     * Um único disparo depois de TODA a operação composta
     * ter sido confirmada pelo Dexie.
     */
    solicitarProcessamentoSync();

    return id;
  },
};