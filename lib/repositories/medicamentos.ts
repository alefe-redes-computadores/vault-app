import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
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

import {
  cancelDoseNotifications,
  scheduleDoseNotifications,
} from "@/lib/dose-notifications";

import {
  cancelMedicationRenewalNotification,
  scheduleMedicationRenewalNotification,
} from "@/lib/notifications";

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

/**
 * Compatibilidade somente de leitura para cadastros anteriores
 * à identidade visual canônica. Não reescreve o banco e não
 * inventa valores quando o usuário nunca escolheu uma aparência.
 */
function withCanonicalVisualIdentity(
  medicamento: Medicamento
): Medicamento {
  const formato =
    medicamento.formato?.trim() ||
    medicamento.forma_farmaceutica?.trim();

  const modernColors =
    medicamento.cores
      ?.filter((color): color is string =>
        typeof color === "string" && color.trim().length > 0
      )
      .map((color) => color.trim()) || [];

  const legacyColors = [
    medicamento.cor_principal,
    medicamento.cor_secundaria,
  ].filter((color): color is string =>
    typeof color === "string" && color.trim().length > 0
  );

  const cores = Array.from(
    new Set(modernColors.length > 0 ? modernColors : legacyColors)
  ).slice(0, 2);

  return {
    ...medicamento,
    ...(formato ? { formato } : {}),
    ...(cores.length > 0 ? { cores } : {}),
  };
}

async function reconcileMedicationNotifications(
  previous:
    Medicamento |
    undefined,

  current:
    Medicamento |
    undefined
): Promise<void> {
  const reference =
    current ||
    previous;

  if (
    !reference?.id
  ) {
    return;
  }

  try {
    /*
     * Cancela os horários antigos primeiro.
     * Assim horários removidos não ficam vivos no Android.
     */
    if (
      previous
        ?.estoque_horarios &&
      previous
        .estoque_horarios
        .length >
        0
    ) {
      await cancelDoseNotifications({
        id:
          reference.id,

        person_id:
          previous.person_id,

        nome:
          previous.nome,

        dosagem:
          previous.dosagem,

        estoque_horarios:
          previous.estoque_horarios,
      });
    }

    /*
     * A renovação usa ID determinístico por medicamento.
     * Cancelamos antes de decidir se existe uma nova.
     */
    await cancelMedicationRenewalNotification(
      reference.id
    );

    /*
     * Exclusão ou descontinuação encerra aqui:
     * nada deve ser reagendado.
     */
    if (
      !current ||
      current.status ===
        "descontinuado"
    ) {
      return;
    }

    if (
      current.tipo_uso ===
        "continuo" &&
      current
        .estoque_horarios &&
      current
        .estoque_horarios
        .length >
        0
    ) {
      await scheduleDoseNotifications({
        id:
          current.id!,

        person_id:
          current.person_id,

        nome:
          current.nome,

        dosagem:
          current.dosagem,

        estoque_horarios:
          current.estoque_horarios,
      });
    }

    const renewalDate =
      current
        .proxima_renovacao
        ?.trim();

    if (
      renewalDate
    ) {
      await scheduleMedicationRenewalNotification(
        current.id!,
        current.nome,
        renewalDate,
        current.medico || ""
      );
    }
  } catch (
    error
  ) {
    /*
     * Falha no Android não desfaz um cadastro já salvo.
     */
    console.error(
      "[medicamentosRepository] Dados salvos, mas houve falha ao reconciliar notificações:",
      error
    );
  }
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

    const medicamentos =
      await db.medicamentos
        .where(
          "person_id"
        )
        .equals(
          personId
        )
        .filter(
          (medicamento) =>
            medicamento.status !==
            "descontinuado"
        )
        .toArray();

    return medicamentos.map(
      withCanonicalVisualIdentity
    );
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

    return withCanonicalVisualIdentity(
      medicamento
    );
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
      await getLocalFirstAuthUser();

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

    await reconcileMedicationNotifications(
      undefined,
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

    await reconcileMedicationNotifications(
      current,
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

    /*
     * Um medicamento participa do prontuário longitudinal.
     * Removê-lo fisicamente apagava DoseLogs e quebrava a
     * identidade de eventos históricos. A operação pública de
     * remoção agora é uma descontinuação segura e reversível.
     */
    const now =
      new Date().toISOString();

    const descontinuado: Medicamento = {
      ...medicamento,
      status:
        "descontinuado",
      data_descontinuacao:
        medicamento.data_descontinuacao ||
        now.slice(0, 10),
      motivo_descontinuacao:
        medicamento.motivo_descontinuacao ||
        "Removido da rotina pelo usuário",
      updated_at:
        now,
      synced:
        false,
    };

    await safeUpdateMedicamento(
      id,
      descontinuado
    );

    const registroCompleto =
      await db.medicamentos.get(
        id
      );

    if (!registroCompleto) {
      throw new Error(
        "Não foi possível preservar o medicamento no histórico."
      );
    }

    await enfileirarOperacao(
      "medicamentos",
      "update",
      registroCompleto
    );

    await reconcileMedicationNotifications(
      medicamento,
      registroCompleto
    );

    return id;
  },
};