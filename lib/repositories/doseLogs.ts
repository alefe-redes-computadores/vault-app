// lib/repositories/doseLogs.ts

import {
  db,
  safeSetDoseLog,
  safeUpdateMedicamento,
} from "@/lib/db";

import {
  enfileirarOperacao,
} from "@/lib/sync/enfileirarOperacao";

import {
  supabase,
} from "@/lib/supabase/client";

import {
  getLocalTodayISO,
} from "@/lib/health-utils";

import type {
  DoseLog,
  Medicamento,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type DoseStatus =
  | "taken"
  | "ignored"
  | "clear";

interface SetDoseStatusInput {
  personId: string;

  medicamentoId: string;

  data?: string;

  horario: string;

  status: DoseStatus;

  quantidade?: number;

  /**
   * Momento REAL informado para a tomada.
   *
   * Exemplo:
   *
   * slot programado: 10:00
   * registro feito: 16:00
   *
   * - se tomou às 10:00, enviar 10:00
   * - se tomou às 16:00, enviar 16:00
   *
   * Quando omitido, mantém o comportamento legado:
   * usa o momento atual.
   */
  tomadoEm?: string;

  /**
   * Controla se esta alteração deve movimentar o saldo atual
   * do medicamento.
   *
   * true / undefined:
   * comportamento normal do Vault.
   *
   * false:
   * revisão histórica. O DoseLog é persistido e sincronizado,
   * mas o estoque atual permanece intacto.
   */
  adjustStock?: boolean;
}

interface RegistrarTomadaAvulsaInput {
  personId: string;

  medicamentoId: string;

  data?: string;

  horario: string;

  quantidade?: number;

  doseKind?: "sos" | "extra";

  motivo?: string;
}

interface RemoveDoseLogByIdInput {
  personId: string;

  id: string;
}

// ============================================================
// HELPERS DE VALIDAÇÃO
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

function requireMedicamentoId(
  medicamentoId: string
): string {
  const normalized =
    medicamentoId.trim();

  if (!normalized) {
    throw new Error(
      "Medicamento não identificado."
    );
  }

  return normalized;
}

function requireDoseLogId(
  id: string
): string {
  const normalized =
    id.trim();

  if (!normalized) {
    throw new Error(
      "Registro de dose não identificado."
    );
  }

  return normalized;
}

function requireHorario(
  horario: string
): string {
  const normalized =
    horario.trim();

  if (!normalized) {
    throw new Error(
      "Horário da dose não identificado."
    );
  }

  const match =
    /^(\d{1,2}):(\d{2})$/.exec(
      normalized
    );

  if (!match) {
    throw new Error(
      "Horário da dose inválido."
    );
  }

  const hours =
    Number(
      match[1]
    );

  const minutes =
    Number(
      match[2]
    );

  if (
    !Number.isInteger(
      hours
    ) ||
    !Number.isInteger(
      minutes
    ) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(
      "Horário da dose inválido."
    );
  }

  return `${String(
    hours
  ).padStart(
    2,
    "0"
  )}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )}`;
}

function requireDate(
  data?: string
): string {
  const normalized =
    (
      data ||
      getLocalTodayISO()
    ).trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized
    )
  ) {
    throw new Error(
      "Data da dose inválida."
    );
  }

  return normalized;
}

function normalizeTakenAt(
  value?: string
): string | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  if (
    !normalized
  ) {
    throw new Error(
      "Horário real da tomada inválido."
    );
  }

  const parsed =
    new Date(
      normalized
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      "Horário real da tomada inválido."
    );
  }

  return parsed.toISOString();
}

// ============================================================
// QUANTIDADE
// ============================================================

function normalizePositiveQuantity(
  value:
    | number
    | undefined
): number | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    throw new Error(
      "Quantidade da dose inválida."
    );
  }

  return value;
}

/**
 * Quantidade HISTÓRICA efetivamente salva em um DoseLog existente.
 *
 * Não usamos a configuração atual do medicamento como fallback.
 *
 * Isso é proposital:
 *
 * se estoque_unidade_por_dose mudou depois da tomada, usar o valor
 * atual para desfazer uma movimentação antiga poderia alterar o
 * estoque incorretamente.
 */
function getExistingDoseQuantity(
  existing?: DoseLog
): number | undefined {
  if (
    existing?.quantidade ===
      undefined ||
    existing?.quantidade ===
      null
  ) {
    return undefined;
  }

  const value =
    Number(
      existing.quantidade
    );

  if (
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    return undefined;
  }

  return value;
}

/**
 * Resolve a quantidade de uma NOVA tomada ou de uma atualização.
 *
 * Ordem:
 *
 * 1. quantidade explicitamente informada;
 * 2. quantidade histórica já registrada no DoseLog;
 * 3. unidade por dose configurada no medicamento;
 * 4. undefined.
 *
 * IMPORTANTE:
 *
 * Não existe fallback para 1.
 *
 * Uma tomada pode ser registrada mesmo sem quantidade conhecida.
 * Nesse caso ela continua válida para adesão/histórico, porém o
 * estoque não será alterado se não for possível calcular o consumo.
 */
function resolveDoseQuantity(
  medicamento: Medicamento,
  requested?: number,
  existing?: DoseLog
): number | undefined {
  if (
    requested !== undefined
  ) {
    return normalizePositiveQuantity(
      requested
    );
  }

  const existingQuantity =
    getExistingDoseQuantity(
      existing
    );

  if (
    existingQuantity !==
    undefined
  ) {
    return existingQuantity;
  }

  const configuredQuantity =
    medicamento.estoque_unidade_por_dose;

  if (
    typeof configuredQuantity !==
      "number" ||
    !Number.isFinite(
      configuredQuantity
    ) ||
    configuredQuantity <= 0
  ) {
    return undefined;
  }

  return configuredQuantity;
}

// ============================================================
// GOTAS / UNIDADE DE ESTOQUE
// ============================================================

function isDropMedication(
  medicamento: Medicamento
): boolean {
  const forma =
    String(
      medicamento.forma_farmaceutica ||
        ""
    )
      .trim()
      .toLowerCase();

  const formato =
    String(
      medicamento.formato ||
        ""
    )
      .trim()
      .toLowerCase();

  return (
    forma.includes(
      "gota"
    ) ||
    formato.includes(
      "gota"
    )
  );
}

/**
 * Converte a quantidade da dose para a unidade utilizada pelo estoque.
 *
 * Retorna null quando não há dados suficientes para uma conversão
 * confiável.
 */
function quantityInStockUnit(
  medicamento: Medicamento,
  doseQuantity:
    | number
    | undefined
): number | null {
  if (
    doseQuantity ===
    undefined
  ) {
    return null;
  }

  if (
    !Number.isFinite(
      doseQuantity
    ) ||
    doseQuantity <= 0
  ) {
    return null;
  }

  const unidade =
    String(
      medicamento.estoque_unidade_medida ||
        ""
    )
      .trim()
      .toLowerCase();

  if (
    !isDropMedication(
      medicamento
    )
  ) {
    return doseQuantity;
  }

  // ==========================================================
  // ESTOQUE EM GOTAS
  // ==========================================================

  if (
    unidade.includes(
      "gota"
    )
  ) {
    return doseQuantity;
  }

  // ==========================================================
  // GOTAS → ML
  // ==========================================================

  if (
    unidade.includes(
      "ml"
    )
  ) {
    const gotasPorMl =
      medicamento.estoque_gotas_por_ml;

    if (
      typeof gotasPorMl !==
        "number" ||
      !Number.isFinite(
        gotasPorMl
      ) ||
      gotasPorMl <= 0
    ) {
      return null;
    }

    return (
      doseQuantity /
      gotasPorMl
    );
  }

  // ==========================================================
  // GOTAS → FRASCO
  // ==========================================================

  if (
    unidade.includes(
      "frasco"
    )
  ) {
    return null;
  }

  return null;
}

// ============================================================
// AUTH
// ============================================================

async function requireAuthenticatedUser() {
  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth.getUser();

  if (
    error ||
    !user
  ) {
    throw new Error(
      "Usuário não autenticado."
    );
  }

  return user;
}

// ============================================================
// MEDICAMENTO
// ============================================================

async function getMedicamentoForPerson(
  medicamentoId: string,
  personId: string,
  userId: string
): Promise<Medicamento> {
  const medicamento =
    await db.medicamentos.get(
      medicamentoId
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

  if (
    medicamento.user_id &&
    medicamento.user_id !==
      userId
  ) {
    throw new Error(
      "Medicamento não pertence ao usuário autenticado."
    );
  }

  return medicamento;
}

// ============================================================
// DOSE PROGRAMADA
//
// A identidade lógica deste registro é:
//
// medicamento + pessoa + data + horário
//
// Essa regra NÃO deve ser usada para dose SOS avulsa.
// ============================================================

async function getDoseLogForSlot(
  medicamentoId: string,
  personId: string,
  data: string,
  horario: string
): Promise<DoseLog | undefined> {
  return db.doseLogs
    .where(
      "medicamento_id"
    )
    .equals(
      medicamentoId
    )
    .filter(
      (log) =>
        log.person_id ===
          personId &&
        log.data ===
          data &&
        log.horario ===
          horario
    )
    .first();
}

// ============================================================
// ESTOQUE
// ============================================================

async function applyStockDelta(
  medicamentoId: string,
  stockDelta:
    | number
    | null,
  timestamp: string
): Promise<void> {
  /**
   * null significa:
   *
   * "não há informação suficiente para calcular a movimentação".
   *
   * O DoseLog continua válido e nenhum valor é inventado.
   */
  if (
    stockDelta === null ||
    stockDelta === 0
  ) {
    return;
  }

  if (
    !Number.isFinite(
      stockDelta
    )
  ) {
    return;
  }

  const medicamentoAtual =
    await db.medicamentos.get(
      medicamentoId
    );

  if (
    !medicamentoAtual
  ) {
    throw new Error(
      "Medicamento não encontrado ao atualizar o estoque."
    );
  }

  if (
    typeof medicamentoAtual.estoque_quantidade !==
      "number" ||
    !Number.isFinite(
      medicamentoAtual.estoque_quantidade
    )
  ) {
    return;
  }

  /**
   * NÃO usamos Math.max(0).
   *
   * O estoque permanece matematicamente reversível.
   */
  const novoEstoque =
    medicamentoAtual.estoque_quantidade -
    stockDelta;

  await safeUpdateMedicamento(
    medicamentoId,
    {
      estoque_quantidade:
        novoEstoque,

      estoque_data_referencia:
        getLocalTodayISO(),

      updated_at:
        timestamp,

      synced:
        false,
    }
  );

  const medicamentoAtualizado =
    await db.medicamentos.get(
      medicamentoId
    );

  if (
    !medicamentoAtualizado
  ) {
    throw new Error(
      "Não foi possível recuperar o medicamento após atualizar o estoque."
    );
  }

  await enfileirarOperacao(
    "medicamentos",
    "update",
    medicamentoAtualizado
  );
}

// ============================================================
// REPOSITORY
// ============================================================

export const doseLogsRepository = {
  // ==========================================================
  // LEITURA
  // ==========================================================

  async getAll(
    personId: string,
    data?: string
  ): Promise<DoseLog[]> {
    const safePersonId =
      requirePersonId(
        personId
      );

    let query =
      db.doseLogs
        .where(
          "person_id"
        )
        .equals(
          safePersonId
        );

    if (data) {
      const safeDate =
        requireDate(
          data
        );

      query =
        query.and(
          (log) =>
            log.data ===
            safeDate
        );
    }

    const rows =
      await query.toArray();

    return rows.sort(
      (
        first,
        second
      ) => {
        const firstKey =
          `${first.data || ""} ${first.horario || ""}`;

        const secondKey =
          `${second.data || ""} ${second.horario || ""}`;

        return firstKey.localeCompare(
          secondKey
        );
      }
    );
  },

  /**
   * Quantidades recentes efetivamente registradas como tomadas.
   *
   * Usado exclusivamente para proteção de UX contra
   * possíveis erros de digitação.
   */
  async getRecentQuantities(
    personId: string,
    medicamentoId: string,
    limit: number = 20
  ): Promise<number[]> {
    const safePersonId =
      requirePersonId(
        personId
      );

    const safeMedicamentoId =
      requireMedicamentoId(
        medicamentoId
      );

    const safeLimit =
      Math.min(
        50,
        Math.max(
          1,
          Math.floor(
            limit
          )
        )
      );

    const rows =
      await db.doseLogs
        .where(
          "person_id"
        )
        .equals(
          safePersonId
        )
        .and(
          (
            log
          ) =>
            log.medicamento_id ===
              safeMedicamentoId &&
            Boolean(
              log.tomado_em
            ) &&
            typeof log.quantidade ===
              "number" &&
            Number.isFinite(
              log.quantidade
            ) &&
            log.quantidade >
              0
        )
        .toArray();

    return rows
      .sort(
        (
          first,
          second
        ) => {
          const firstTime =
            first.tomado_em ||
            first.updated_at ||
            first.created_at ||
            `${first.data || ""}T${first.horario || "00:00"}`;

          const secondTime =
            second.tomado_em ||
            second.updated_at ||
            second.created_at ||
            `${second.data || ""}T${second.horario || "00:00"}`;

          return secondTime.localeCompare(
            firstTime
          );
        }
      )
      .slice(
        0,
        safeLimit
      )
      .map(
        (
          log
        ) =>
          Number(
            log.quantidade
          )
      )
      .reverse();
  },

    async getById(
    id: string,
    personId: string
  ): Promise<DoseLog | undefined> {
    const safePersonId =
      requirePersonId(
        personId
      );

    const normalizedId =
      id.trim();

    if (
      !normalizedId
    ) {
      return undefined;
    }

    const log =
      await db.doseLogs.get(
        normalizedId
      );

    if (
      !log ||
      log.person_id !==
        safePersonId
    ) {
      return undefined;
    }

    return log;
  },

  // ==========================================================
  // DOSE PROGRAMADA
  // ==========================================================

  async setStatus({
    personId,
    medicamentoId,
    data,
    horario,
    status,
    quantidade,
    tomadoEm,
    adjustStock = true,
  }: SetDoseStatusInput): Promise<string> {
    const safePersonId =
      requirePersonId(
        personId
      );

    const safeMedicamentoId =
      requireMedicamentoId(
        medicamentoId
      );

    const safeHorario =
      requireHorario(
        horario
      );

    const targetDate =
      requireDate(
        data
      );

    const safeTakenAt =
      status ===
      "taken"
        ? normalizeTakenAt(
            tomadoEm
          )
        : undefined;

    const user =
      await requireAuthenticatedUser();

    return db.transaction(
      "rw",
      [
        db.doseLogs,
        db.medicamentos,
        db.syncQueue,
      ],
      async () => {
        const medicamento =
          await getMedicamentoForPerson(
            safeMedicamentoId,
            safePersonId,
            user.id
          );

        const existing =
          await getDoseLogForSlot(
            safeMedicamentoId,
            safePersonId,
            targetDate,
            safeHorario
          );

        if (
          existing?.user_id &&
          existing.user_id !==
            user.id
        ) {
          throw new Error(
            "Registro de dose não pertence ao usuário autenticado."
          );
        }

        // ====================================================
        // CLEAR
        // ====================================================

        if (
          status ===
          "clear"
        ) {
          if (
            !existing ||
            !existing.id
          ) {
            throw new Error(
              "Não existe registro de dose para desmarcar."
            );
          }

          const timestamp =
            new Date().toISOString();

          const wasTaken =
            Boolean(
              existing.tomado_em
            );

          const oldQuantity =
            getExistingDoseQuantity(
              existing
            );

          const oldStockAmount =
            wasTaken
              ? quantityInStockUnit(
                  medicamento,
                  oldQuantity
                )
              : 0;

          await db.doseLogs.delete(
            existing.id
          );

          await enfileirarOperacao(
            "doseLogs",
            "delete",
            {
              id:
                existing.id,

              person_id:
                safePersonId,

              user_id:
                user.id,
            }
          );

          const stockDelta =
            wasTaken
              ? oldStockAmount ===
                null
                ? null
                : -oldStockAmount
              : 0;

          /*
           * Revisão histórica pode apagar/corrigir o DoseLog
           * sem alterar um estoque atual que já incorporava
           * aquele período.
           */
          if (
            adjustStock
          ) {
            await applyStockDelta(
              safeMedicamentoId,
              stockDelta,
              timestamp
            );
          }

          return existing.id;
        }

        // ====================================================
        // TAKEN / IGNORED
        // ====================================================

        const doseQuantity =
          resolveDoseQuantity(
            medicamento,
            quantidade,
            existing
          );

        const wasTaken =
          Boolean(
            existing?.tomado_em
          );

        const willBeTaken =
          status ===
          "taken";

        const oldDoseQuantity =
          getExistingDoseQuantity(
            existing
          );

        const oldStockAmount =
          wasTaken
            ? quantityInStockUnit(
                medicamento,
                oldDoseQuantity
              )
            : 0;

        const newStockAmount =
          willBeTaken
            ? quantityInStockUnit(
                medicamento,
                doseQuantity
              )
            : 0;

        let stockDelta:
          | number
          | null = 0;

        if (
          wasTaken &&
          willBeTaken
        ) {
          if (
            oldStockAmount ===
              null ||
            newStockAmount ===
              null
          ) {
            stockDelta =
              null;
          } else {
            stockDelta =
              newStockAmount -
              oldStockAmount;
          }
        } else if (
          !wasTaken &&
          willBeTaken
        ) {
          stockDelta =
            newStockAmount;
        } else if (
          wasTaken &&
          !willBeTaken
        ) {
          stockDelta =
            oldStockAmount ===
            null
              ? null
              : -oldStockAmount;
        }

        const timestamp =
          new Date().toISOString();

        const doseLogId =
          await safeSetDoseLog({
            user_id:
              user.id,

            person_id:
              safePersonId,

            medicamento_id:
              safeMedicamentoId,

            data:
              targetDate,

            horario:
              safeHorario,

            quantidade:
              doseQuantity,

            dose_kind:
              existing?.dose_kind ||
              "scheduled",

            tomado_em:
              status ===
              "taken"
                ? (
                    safeTakenAt ??
                    (
                      wasTaken &&
                      existing?.tomado_em
                        ? existing.tomado_em
                        : timestamp
                    )
                  )
                : undefined,

            ignorado_em:
              status ===
              "ignored"
                ? (
                    existing?.ignorado_em ||
                    timestamp
                  )
                : undefined,
          });

        const doseLogAtualizado =
          await db.doseLogs.get(
            doseLogId
          );

        if (
          !doseLogAtualizado
        ) {
          throw new Error(
            "Não foi possível recuperar o registro de dose após a atualização."
          );
        }

        if (
          doseLogAtualizado.person_id !==
            safePersonId
        ) {
          throw new Error(
            "O registro de dose atualizado não pertence à pessoa ativa."
          );
        }

        await enfileirarOperacao(
          "doseLogs",
          existing
            ? "update"
            : "add",
          doseLogAtualizado
        );

        /*
         * Registro histórico continua sendo um DoseLog real:
         *
         * - entra no histórico;
         * - sincroniza;
         * - pode participar das métricas;
         *
         * porém pode deliberadamente NÃO alterar o saldo atual.
         */
        if (
          adjustStock
        ) {
          await applyStockDelta(
            safeMedicamentoId,
            stockDelta,
            timestamp
          );
        }

        return doseLogId;
      }
    );
  },

  // ==========================================================
  // TOMADA AVULSA / SOS
  //
  // Diferente de setStatus(), esta operação SEMPRE cria um
  // novo evento independente.
  // ==========================================================

  async registrarTomadaAvulsa({
    personId,
    medicamentoId,
    data,
    horario,
    quantidade,
    doseKind = "sos",
    motivo,
  }: RegistrarTomadaAvulsaInput): Promise<string> {
    const safePersonId =
      requirePersonId(
        personId
      );

    const safeMedicamentoId =
      requireMedicamentoId(
        medicamentoId
      );

    const safeHorario =
      requireHorario(
        horario
      );

    const targetDate =
      requireDate(
        data
      );

    const user =
      await requireAuthenticatedUser();

    return db.transaction(
      "rw",
      [
        db.doseLogs,
        db.medicamentos,
        db.syncQueue,
      ],
      async () => {
        const medicamento =
          await getMedicamentoForPerson(
            safeMedicamentoId,
            safePersonId,
            user.id
          );

        const doseQuantity =
          resolveDoseQuantity(
            medicamento,
            quantidade
          );

        const stockAmount =
          quantityInStockUnit(
            medicamento,
            doseQuantity
          );

        const timestamp =
          new Date().toISOString();

        const id =
          crypto.randomUUID();

        const fullLog: DoseLog = {
          id,

          user_id:
            user.id,

          person_id:
            safePersonId,

          medicamento_id:
            safeMedicamentoId,

          data:
            targetDate,

          horario:
            safeHorario,

          quantidade:
            doseQuantity,

          dose_kind:
            doseKind,

          motivo:
            motivo?.trim() || undefined,

          tomado_em:
            timestamp,

          ignorado_em:
            undefined,

          created_at:
            timestamp,

          updated_at:
            timestamp,

          synced:
            false,
        };

        await db.doseLogs.add(
          fullLog
        );

        const doseLogSalvo =
          await db.doseLogs.get(
            id
          );

        if (
          !doseLogSalvo
        ) {
          throw new Error(
            "Não foi possível recuperar a dose avulsa após o registro."
          );
        }

        if (
          doseLogSalvo.person_id !==
            safePersonId
        ) {
          throw new Error(
            "A dose avulsa registrada não pertence à pessoa ativa."
          );
        }

        await enfileirarOperacao(
          "doseLogs",
          "add",
          doseLogSalvo
        );

        await applyStockDelta(
          safeMedicamentoId,
          stockAmount,
          timestamp
        );

        return id;
      }
    );
  },

  // ==========================================================
  // REMOÇÃO POR ID
  //
  // Operação canônica para remover um evento já persistido.
  //
  // Foi criada especialmente para evitar que telas façam:
  //
  // db.doseLogs.delete(...)
  //
  // diretamente.
  //
  // Isso é essencial para doses avulsas/SOS, porque a exclusão
  // precisa:
  //
  // 1. validar ownership;
  // 2. recuperar a quantidade HISTÓRICA;
  // 3. restaurar o estoque quando calculável;
  // 4. remover o DoseLog;
  // 5. enfileirar DELETE para o remoto.
  //
  // Também é segura para um DoseLog programado caso algum fluxo
  // legítimo precise remover pelo id.
  // ==========================================================

  async removeById({
    personId,
    id,
  }: RemoveDoseLogByIdInput): Promise<string> {
    const safePersonId =
      requirePersonId(
        personId
      );

    const safeId =
      requireDoseLogId(
        id
      );

    const user =
      await requireAuthenticatedUser();

    return db.transaction(
      "rw",
      [
        db.doseLogs,
        db.medicamentos,
        db.syncQueue,
      ],
      async () => {
        const existing =
          await db.doseLogs.get(
            safeId
          );

        if (
          !existing ||
          existing.person_id !==
            safePersonId
        ) {
          throw new Error(
            "Registro de dose não encontrado para a pessoa ativa."
          );
        }

        if (
          existing.user_id &&
          existing.user_id !==
            user.id
        ) {
          throw new Error(
            "Registro de dose não pertence ao usuário autenticado."
          );
        }

        const safeMedicamentoId =
          requireMedicamentoId(
            existing.medicamento_id
          );

        const medicamento =
          await getMedicamentoForPerson(
            safeMedicamentoId,
            safePersonId,
            user.id
          );

        const timestamp =
          new Date().toISOString();

        const wasTaken =
          Boolean(
            existing.tomado_em
          );

        const historicalQuantity =
          getExistingDoseQuantity(
            existing
          );

        /**
         * Só restauramos estoque se:
         *
         * - o DoseLog representava uma tomada;
         * - a quantidade histórica é conhecida;
         * - a conversão para a unidade do estoque é confiável.
         *
         * Nunca reconstruímos o passado usando a configuração
         * atual do medicamento.
         */
        const historicalStockAmount =
          wasTaken
            ? quantityInStockUnit(
                medicamento,
                historicalQuantity
              )
            : 0;

        await db.doseLogs.delete(
          safeId
        );

        await enfileirarOperacao(
          "doseLogs",
          "delete",
          {
            id:
              safeId,

            person_id:
              safePersonId,

            user_id:
              user.id,
          }
        );

        const stockDelta =
          wasTaken
            ? historicalStockAmount ===
              null
              ? null
              : -historicalStockAmount
            : 0;

        await applyStockDelta(
          safeMedicamentoId,
          stockDelta,
          timestamp
        );

        return safeId;
      }
    );
  },
};
