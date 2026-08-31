// lib/repositories/medicamentos.ts

import {
  db,
  safeAddMedicamento,
  safeDeleteMedicamento,
  safeUpdateMedicamento,
} from "@/lib/db";

import { supabase } from "@/lib/supabase/client";

import {
  enfileirarOperacao,
} from "@/lib/sync/enfileirarOperacao";

import type {
  CreateMedicamentoInput,
  Medicamento,
  UpdateMedicamentoInput,
} from "@/lib/types";

// ============================================================
// HELPERS
// ============================================================

function uniqueIds(
  ids?: string[]
): string[] | undefined {
  if (!ids) {
    return undefined;
  }

  return Array.from(
    new Set(
      ids.filter(Boolean)
    )
  );
}

function normalizeCreateText(
  value?: string
): string {
  return value?.trim() || "";
}

// ============================================================
// REPOSITORY
// ============================================================

export const medicamentosRepository = {
  // ==========================================================
  // LIST
  // ==========================================================

  async getAll(
    personId: string
  ) {
    if (!personId) {
      return [];
    }

    return db.medicamentos
      .where(
        "person_id"
      )
      .equals(
        personId
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
    if (
      !id ||
      !personId
    ) {
      return undefined;
    }

    const medicamento =
      await db.medicamentos.get(
        id
      );

    if (
      !medicamento ||
      medicamento.person_id !==
        personId
    ) {
      return undefined;
    }

    return medicamento;
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data: CreateMedicamentoInput
  ) {
    if (!data.person_id) {
      throw new Error(
        "Pessoa do medicamento não identificada."
      );
    }

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

    const tratamentoIds =
      uniqueIds(
        data.tratamento_ids
      );

    const cidIds =
      uniqueIds(
        data.cid_ids
      );

    // ========================================================
    // ANTI-DUPLICAÇÃO
    // ========================================================

    if (data.nome) {
      const nomeNormalizado =
        data.nome
          .trim()
          .toLowerCase();

      const duplicadoRecente =
        await db.medicamentos
          .where(
            "person_id"
          )
          .equals(
            data.person_id
          )
          .filter(
            (
              medicamento
            ) =>
              medicamento.nome
                .trim()
                .toLowerCase() ===
              nomeNormalizado
          )
          .first();

      if (
        duplicadoRecente?.created_at
      ) {
        const criadoEm =
          new Date(
            duplicadoRecente.created_at
          ).getTime();

        const diffEmSegundos =
          (
            Date.now() -
            criadoEm
          ) /
          1000;

        if (
          Number.isFinite(
            diffEmSegundos
          ) &&
          diffEmSegundos <
            5
        ) {
          console.warn(
            "⚠️ Tentativa de duplicação bloqueada pelo repositório:",
            data.nome
          );

          return duplicadoRecente.id!;
        }
      }
    }

    // ========================================================
    // PAYLOAD
    // ========================================================

    const now =
      new Date().toISOString();

    const payload:
      Medicamento = {
      ...data,

      id:
        data.id ||
        crypto.randomUUID(),

      user_id:
        user.id,

      person_id:
        data.person_id,

      data_receita:
        normalizeCreateText(
          data.data_receita
        ),

      proxima_renovacao:
        normalizeCreateText(
          data.proxima_renovacao
        ),

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

    // ========================================================
    // LOCAL
    // ========================================================

    const id =
      await safeAddMedicamento(
        payload
      );

    const registroCriado =
      await db.medicamentos.get(
        id
      );

    if (!registroCriado) {
      throw new Error(
        "Medicamento criado, mas não foi possível recuperar o registro local."
      );
    }

    if (
      registroCriado.person_id !==
        data.person_id
    ) {
      throw new Error(
        "Medicamento criado com vínculo de pessoa inconsistente."
      );
    }

    // ========================================================
    // SYNC
    // ========================================================

    await enfileirarOperacao(
      "medicamentos",
      "add",
      registroCriado
    );

    return id;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    personId: string,
    data: UpdateMedicamentoInput
  ) {
    const current =
      await db.medicamentos.get(
        id
      );

    if (
      !current ||
      current.person_id !==
        personId
    ) {
      throw new Error(
        "Medicamento não encontrado para a pessoa ativa."
      );
    }

    const tratamentoIds =
      data.tratamento_ids !==
      undefined
        ? uniqueIds(
            data.tratamento_ids
          )
        : undefined;

    const cidIds =
      data.cid_ids !==
      undefined
        ? uniqueIds(
            data.cid_ids
          )
        : undefined;

    const now =
      new Date().toISOString();

    const payload:
      UpdateMedicamentoInput & {
        updated_at: string;
        synced: false;
      } = {
      ...data,

      ...(data.tratamento_ids !==
      undefined
        ? {
            tratamento_ids:
              tratamentoIds,
          }
        : {}),

      ...(data.cid_ids !==
      undefined
        ? {
            cid_ids:
              cidIds,
          }
        : {}),

      updated_at:
        now,

      synced:
        false,
    };

    // ========================================================
    // LOCAL
    // ========================================================

    await safeUpdateMedicamento(
      id,
      payload
    );

    // ========================================================
    // AUTO-HEALING / FULL QUEUE PAYLOAD
    // ========================================================

    const registroCompleto =
      await db.medicamentos.get(
        id
      );

    if (
      !registroCompleto ||
      registroCompleto.person_id !==
        personId
    ) {
      throw new Error(
        "Medicamento atualizado, mas não foi possível validar o registro local."
      );
    }

    await enfileirarOperacao(
      "medicamentos",
      "update",
      registroCompleto
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

  // ==========================================================
  // DELETE SAFE
  // ==========================================================

  async deleteSafe(
    id: string,
    personId: string
  ) {
    const medicamento =
      await db.medicamentos.get(
        id
      );

    if (
      !medicamento ||
      medicamento.person_id !==
        personId
    ) {
      throw new Error(
        "Medicamento não encontrado para a pessoa ativa."
      );
    }

    const now =
      new Date().toISOString();

    await db.transaction(
      "rw",
      [
        db.medicamentos,
        db.renovacoes,
        db.doseLogs,
        db.medicamento_tratamentos,
        db.registros_saude,
        db.anexos_clinicos,
        db.syncQueue,
      ],
      async () => {
        // ------------------------------------------------------
        // RENOVAÇÕES
        // ------------------------------------------------------
        //
        // Renovação é histórico clínico/financeiro e NÃO deve ser
        // apagada junto com o cadastro atual do medicamento.
        //
        // Antes de remover o medicamento, enriquecemos somente
        // renovações legadas que ainda não possuem snapshot de
        // nome/dosagem. Snapshots já existentes são preservados,
        // pois representam a identidade histórica da aquisição.
        // ------------------------------------------------------

        const renovacoes =
          await db.renovacoes
            .where(
              "medicamento_id"
            )
            .equals(
              id
            )
            .toArray();

        for (
          const renovacao of
          renovacoes
        ) {
          if (!renovacao.id) {
            continue;
          }

          const medicamentoNomeSnapshot =
            renovacao.medicamento_nome?.trim() ||
            medicamento.nome.trim() ||
            null;

          const medicamentoDosagemSnapshot =
            renovacao.medicamento_dosagem?.trim() ||
            medicamento.dosagem.trim() ||
            null;

          const needsSnapshotUpdate =
            renovacao.medicamento_nome !==
              medicamentoNomeSnapshot ||
            renovacao.medicamento_dosagem !==
              medicamentoDosagemSnapshot;

          if (!needsSnapshotUpdate) {
            continue;
          }

          const updatedRenovacao = {
            ...renovacao,

            medicamento_nome:
              medicamentoNomeSnapshot,

            medicamento_dosagem:
              medicamentoDosagemSnapshot,

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
        // DOSE LOGS
        // ------------------------------------------------------

        const doseLogs =
          await db.doseLogs
            .where(
              "medicamento_id"
            )
            .equals(
              id
            )
            .toArray();

        for (
          const doseLog of
          doseLogs
        ) {
          if (!doseLog.id) {
            continue;
          }

          await db.doseLogs.delete(
            doseLog.id
          );

          await enfileirarOperacao(
            "doseLogs",
            "delete",
            {
              id:
                doseLog.id,
            }
          );
        }

        // ------------------------------------------------------
        // MEDICAMENTO ↔ TRATAMENTOS
        // ------------------------------------------------------

        await db.medicamento_tratamentos
          .filter(
            (
              vinculo
            ) =>
              vinculo.medicamento_id ===
              id
          )
          .delete();

        // ------------------------------------------------------
        // REGISTROS DE SAÚDE
        // ------------------------------------------------------

        const registrosSaude =
          await db.registros_saude
            .where(
              "person_id"
            )
            .equals(
              personId
            )
            .filter(
              (
                registro
              ) =>
                registro.medicamento_id ===
                id
            )
            .toArray();

        for (
          const registro of
          registrosSaude
        ) {
          if (!registro.id) {
            continue;
          }

          const updatedRegistro = {
            ...registro,

            medicamento_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.registros_saude.put(
            updatedRegistro
          );

          await enfileirarOperacao(
            "registros_saude",
            "update",
            updatedRegistro
          );
        }

        // ------------------------------------------------------
        // ANEXOS CLÍNICOS
        // ------------------------------------------------------

        const anexosClinicos =
          await db.anexos_clinicos
            .filter(
              (
                anexo
              ) =>
                anexo.medicamento_id ===
                id
            )
            .toArray();

        for (
          const anexo of
          anexosClinicos
        ) {
          if (!anexo.id) {
            continue;
          }

          const updatedAnexo = {
            ...anexo,

            medicamento_id:
              undefined,

            updated_at:
              now,

            synced:
              false,
          };

          await db.anexos_clinicos.put(
            updatedAnexo
          );

          await enfileirarOperacao(
            "anexos_clinicos",
            "update",
            updatedAnexo
          );
        }

        // ------------------------------------------------------
        // OUTROS MEDICAMENTOS QUE APONTAM PARA ESTE
        // ------------------------------------------------------

        const medicamentosRelacionados =
          await db.medicamentos
            .where(
              "person_id"
            )
            .equals(
              personId
            )
            .filter(
              (
                outroMedicamento
              ) =>
                outroMedicamento.id !==
                  id &&
                outroMedicamento.substituido_por_id ===
                  id
            )
            .toArray();

        for (
          const relacionado of
          medicamentosRelacionados
        ) {
          if (!relacionado.id) {
            continue;
          }

          const updatedMedicamento:
            Medicamento = {
            ...relacionado,

            substituido_por_id:
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
        // MEDICAMENTO
        // ------------------------------------------------------

        await safeDeleteMedicamento(
          id
        );

        await enfileirarOperacao(
          "medicamentos",
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