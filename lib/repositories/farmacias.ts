// lib/repositories/farmacias.ts

import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type {
  Farmacia,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type CreateFarmaciaInput = Omit<
  Farmacia,
  | "id"
  | "user_id"
  | "person_id"
  | "created_at"
  | "updated_at"
  | "synced"
> & {
  id?: string;
};

type UpdateFarmaciaInput = Partial<
  Omit<
    Farmacia,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
  >
>;

// ============================================================
// REPOSITORY
// ============================================================

export const farmaciasRepository = {
  // ==========================================================
  // LIST
  // ==========================================================

  async getAll() {
    return db.farmacias.toArray();
  },

  // ==========================================================
  // GET
  // ==========================================================

  async getById(
    id: string
  ) {
    return db.farmacias.get(
      id
    );
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data:
      CreateFarmaciaInput
  ) {
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

    const farmaciaId =
      data.id ||
      crypto.randomUUID();

    /*
     * Farmácia é GLOBAL por usuário.
     *
     * Não recebe nem grava person_id.
     *
     * tipo/is_sus são dados globais da Farmácia
     * e agora também são sincronizados com o Supabase.
     */
    const farmaciaCompleta:
      Farmacia = {
      ...data,

      id:
        farmaciaId,

      user_id:
        user.id,

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
        db.farmacias,
        db.syncQueue,
      ],
      async () => {
        await db.farmacias.add(
          farmaciaCompleta
        );

        await enfileirarOperacao(
          "farmacias",
          "add",
          farmaciaCompleta
        );
      }
    );

    return farmaciaId;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    data:
      UpdateFarmaciaInput
  ) {
    const current =
      await db.farmacias.get(
        id
      );

    if (!current) {
      throw new Error(
        "Farmácia não encontrada."
      );
    }

    const now =
      new Date().toISOString();

    /*
     * O sync usa UPSERT.
     *
     * Portanto a fila recebe sempre a Farmácia COMPLETA,
     * evitando depender de merge parcial da fila.
     *
     * Também limpamos person_id legado.
     */
    const updatedFarmacia:
      Farmacia = {
      ...current,
      ...data,

      id:
        current.id,

      user_id:
        current.user_id,

      person_id:
        undefined,

      updated_at:
        now,

      synced:
        false,
    };

    await db.transaction(
      "rw",
      [
        db.farmacias,
        db.syncQueue,
      ],
      async () => {
        await db.farmacias.put(
          updatedFarmacia
        );

        await enfileirarOperacao(
          "farmacias",
          "update",
          updatedFarmacia
        );
      }
    );

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
    const farmacia =
      await db.farmacias.get(
        id
      );

    if (!farmacia) {
      throw new Error(
        "Farmácia não encontrada."
      );
    }

    const now =
      new Date().toISOString();

    /*
     * Farmácia é global.
     *
     * Todos os medicamentos e renovações de TODAS
     * as pessoas devem apenas perder farmacia_id.
     *
     * Os registros clínicos são preservados.
     */
    await db.transaction(
      "rw",
      [
        db.farmacias,
        db.medicamentos,
        db.renovacoes,
        db.syncQueue,
      ],
      async () => {
        // ------------------------------------------------------
        // MEDICAMENTOS
        // ------------------------------------------------------

        const medicamentosAfetados =
          await db.medicamentos
            .where(
              "farmacia_id"
            )
            .equals(
              id
            )
            .toArray();

        for (
          const medicamento of
          medicamentosAfetados
        ) {
          if (
            !medicamento.id
          ) {
            continue;
          }

          const updatedMedicamento:
            typeof medicamento = {
            ...medicamento,

            farmacia_id:
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
            updatedMedicamento
          );
        }

        // ------------------------------------------------------
        // RENOVAÇÕES
        // ------------------------------------------------------

        const renovacoesAfetadas =
          await db.renovacoes
            .where(
              "farmacia_id"
            )
            .equals(
              id
            )
            .toArray();

        for (
          const renovacao of
          renovacoesAfetadas
        ) {
          if (
            !renovacao.id
          ) {
            continue;
          }

          const updatedRenovacao:
            typeof renovacao = {
            ...renovacao,

            farmacia_id:
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
            updatedRenovacao
          );
        }

        // ------------------------------------------------------
        // FARMÁCIA
        // ------------------------------------------------------

        await db.farmacias.delete(
          id
        );

        await enfileirarOperacao(
          "farmacias",
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