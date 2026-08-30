// lib/repositories/renovacoes.ts

import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase/client";

import {
  enfileirarOperacao,
  solicitarProcessamentoSync,
} from "@/lib/sync/enfileirarOperacao";

import type {
  Farmacia,
  Medicamento,
  Medico,
  Renovacao,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type RenovacaoCreateInput = Omit<
  Renovacao,
  | "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "synced"
  | "person_id"
> & {
  person_id: string;
};

type NullableRenovacaoFields = {
  document_id?: string | null;
  medico_id?: string | null;
  farmacia_id?: string | null;
  hospital_id?: string | null;
  local_id?: string | null;
  quantidade?: number | null;
  preco?: number | null;
  lote?: string | null;
  validade_produto?: string | null;
  anexo_url?: string | null;
  observacoes?: string | null;
  data_proxima_retirada?: string | null;
  data_retorno_sus?: string | null;
};

type RenovacaoUpdateBase = Partial<
  Omit<
    Renovacao,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
    | "updated_at"
    | "synced"
  >
>;

type RenovacaoUpdateInput = Omit<
  RenovacaoUpdateBase,
  keyof NullableRenovacaoFields
> &
  NullableRenovacaoFields;

export type RenovacaoCreateOptions = {
  proximaRenovacao?: string | null;
};

// ============================================================
// HELPERS
// ============================================================

function requirePersonId(personId?: string): string {
  const normalized = personId?.trim();

  if (!normalized) {
    throw new Error("Pessoa ativa não identificada.");
  }

  return normalized;
}

function requireRenovacaoId(id?: string): string {
  const normalized = id?.trim();

  if (!normalized) {
    throw new Error("Renovação não identificada.");
  }

  return normalized;
}

function requireMedicamentoId(medicamentoId?: string): string {
  const normalized = medicamentoId?.trim();

  if (!normalized) {
    throw new Error("Medicamento não identificado.");
  }

  return normalized;
}

function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Remove apenas propriedades undefined.
 *
 * null é preservado deliberadamente porque representa
 * "limpar o campo" para entidades/campos nullable.
 *
 * O tipo estrutural original é preservado porque retirar uma
 * propriedade cujo valor já era undefined não altera os campos
 * obrigatórios válidos do objeto.
 */
function removeUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== undefined
    )
  ) as T;
}

function sortRenovacoes(
  renovacoes: Renovacao[]
): Renovacao[] {
  return [...renovacoes].sort((a, b) => {
    const dateCompare = String(
      b.data || ""
    ).localeCompare(String(a.data || ""));

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return String(
      b.created_at || ""
    ).localeCompare(String(a.created_at || ""));
  });
}

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Usuário não autenticado.");
  }

  return data.user.id;
}

async function getRenovacaoForPerson(
  id: string,
  personId: string
): Promise<Renovacao> {
  const renovacao = await db.renovacoes.get(id);

  if (
    !renovacao ||
    renovacao.person_id !== personId
  ) {
    throw new Error(
      "Renovação não encontrada para a pessoa ativa."
    );
  }

  return renovacao;
}

async function validateMedicamentoForPerson(
  medicamentoId: string,
  personId: string
): Promise<Medicamento> {
  const medicamento =
    await db.medicamentos.get(medicamentoId);

  if (
    !medicamento ||
    medicamento.person_id !== personId
  ) {
    throw new Error(
      "Medicamento não encontrado para a pessoa ativa."
    );
  }

  return medicamento;
}

async function getMedicoForUser(
  medicoId: string | null | undefined,
  userId: string
): Promise<Medico | undefined> {
  if (!medicoId) {
    return undefined;
  }

  const medico = await db.medicos.get(medicoId);

  if (!medico) {
    throw new Error(
      "Médico selecionado não foi encontrado."
    );
  }

  if (medico.user_id !== userId) {
    throw new Error(
      "Médico selecionado não pertence ao usuário autenticado."
    );
  }

  return medico;
}

async function getFarmaciaForUser(
  farmaciaId: string | null | undefined,
  userId: string
): Promise<Farmacia | undefined> {
  if (!farmaciaId) {
    return undefined;
  }

  const farmacia = await db.farmacias.get(farmaciaId);

  if (!farmacia) {
    throw new Error(
      "Farmácia selecionada não foi encontrada."
    );
  }

  if (farmacia.user_id !== userId) {
    throw new Error(
      "Farmácia selecionada não pertence ao usuário autenticado."
    );
  }

  return farmacia;
}

function normalizeNullableText(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function normalizeNullableNumber(
  value: number | null | undefined,
  field: string
): number | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} inválido.`);
  }

  return value;
}

function normalizeUpdateInput(
  data: RenovacaoUpdateInput
): RenovacaoUpdateInput {
  return {
    ...data,

    document_id: normalizeNullableText(
      data.document_id
    ),

    medico_id: normalizeNullableText(
      data.medico_id
    ),

    farmacia_id: normalizeNullableText(
      data.farmacia_id
    ),

    hospital_id: normalizeNullableText(
      data.hospital_id
    ),

    local_id: normalizeNullableText(
      data.local_id
    ),

    lote: normalizeNullableText(data.lote),

    validade_produto: normalizeNullableText(
      data.validade_produto
    ),

    anexo_url: normalizeNullableText(
      data.anexo_url
    ),

    observacoes: normalizeNullableText(
      data.observacoes
    ),

    data_proxima_retirada: normalizeNullableText(
      data.data_proxima_retirada
    ),

    data_retorno_sus: normalizeNullableText(
      data.data_retorno_sus
    ),

    quantidade: normalizeNullableNumber(
      data.quantidade,
      "Quantidade"
    ),

    preco: normalizeNullableNumber(
      data.preco,
      "Preço"
    ),
  };
}

// ============================================================
// REPOSITORY
// ============================================================

export const renovacoesRepository = {
  // ==========================================================
  // LIST
  // ==========================================================

  async getAll(
    personId: string
  ): Promise<Renovacao[]> {
    const safePersonId = requirePersonId(personId);

    const renovacoes = await db.renovacoes
      .where("person_id")
      .equals(safePersonId)
      .toArray();

    return sortRenovacoes(renovacoes);
  },

  // ==========================================================
  // LIST POR MEDICAMENTO
  // ==========================================================

  async getByMedicamento(
    personId: string,
    medicamentoId: string
  ): Promise<Renovacao[]> {
    const safePersonId = requirePersonId(personId);
    const safeMedicamentoId =
      requireMedicamentoId(medicamentoId);

    const renovacoes = await db.renovacoes
      .where("person_id")
      .equals(safePersonId)
      .filter(
        (renovacao) =>
          renovacao.medicamento_id ===
          safeMedicamentoId
      )
      .toArray();

    return sortRenovacoes(renovacoes);
  },

  // ==========================================================
  // GET
  // ==========================================================

  async getById(
    id: string,
    personId: string
  ): Promise<Renovacao | undefined> {
    const safeId = requireRenovacaoId(id);
    const safePersonId = requirePersonId(personId);

    const renovacao = await db.renovacoes.get(safeId);

    if (
      !renovacao ||
      renovacao.person_id !== safePersonId
    ) {
      return undefined;
    }

    return renovacao;
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data: RenovacaoCreateInput,
    options: RenovacaoCreateOptions = {}
  ): Promise<string> {
    const personId = requirePersonId(data.person_id);

    const medicamentoId = requireMedicamentoId(
      data.medicamento_id
    );

    const userId = await getAuthenticatedUserId();

    const medicamento =
      await validateMedicamentoForPerson(
        medicamentoId,
        personId
      );

    if (
      medicamento.user_id &&
      medicamento.user_id !== userId
    ) {
      throw new Error(
        "Medicamento não pertence ao usuário autenticado."
      );
    }

    const medicoId = normalizeNullableText(
      data.medico_id
    );

    const farmaciaId = normalizeNullableText(
      data.farmacia_id
    );

    const hospitalId = normalizeNullableText(
      data.hospital_id
    );

    const localId = normalizeNullableText(
      data.local_id
    );

    const quantidade = normalizeNullableNumber(
      data.quantidade,
      "Quantidade"
    );

    const preco = normalizeNullableNumber(
      data.preco,
      "Preço"
    );

    const medico = await getMedicoForUser(
      medicoId,
      userId
    );

    const farmacia = await getFarmaciaForUser(
      farmaciaId,
      userId
    );

    const timestamp = nowIso();
    const id = generateId();

    const renovacao: Renovacao = {
      ...data,

      id,
      user_id: userId,
      person_id: personId,
      medicamento_id: medicamentoId,

      document_id: normalizeNullableText(
        data.document_id
      ),

      medico_id: medicoId,
      farmacia_id: farmaciaId,
      hospital_id: hospitalId,
      local_id: localId,

      quantidade,
      preco,

      lote: normalizeNullableText(data.lote),

      validade_produto: normalizeNullableText(
        data.validade_produto
      ),

      anexo_url: normalizeNullableText(
        data.anexo_url
      ),

      observacoes: normalizeNullableText(
        data.observacoes
      ),

      data_proxima_retirada: normalizeNullableText(
        data.data_proxima_retirada
      ),

      data_retorno_sus: normalizeNullableText(
        data.data_retorno_sus
      ),

      created_at: timestamp,
      updated_at: timestamp,
      synced: false,
    };

    const cleanRenovacao =
      removeUndefined(renovacao);

    /*
     * Renovacao aceita null em diversos campos porque null
     * representa limpeza explícita/histórica.
     *
     * Medicamento, por outro lado, mantém undefined como
     * representação canônica de ausência para leitura.
     *
     * Portanto os valores nullable da Renovacao são convertidos
     * para undefined somente quando consolidados no Medicamento.
     */
    const medicamentoAtualizado: Medicamento = {
      ...medicamento,

      data_receita: data.data,

      tipo_aquisicao:
        data.tipo_aquisicao === "sus"
          ? "sus"
          : data.tipo_aquisicao === "gratuito"
            ? "gratuito"
            : "comprado",

      medico_id:
        medicoId || undefined,

      medico:
        medico?.nome || "",

      farmacia_id:
        farmaciaId || undefined,

      farmacia:
        farmacia?.nome || undefined,

      data_retorno_sus:
        data.tipo_aquisicao === "sus"
          ? normalizeNullableText(
              data.data_proxima_retirada
            ) || undefined
          : undefined,

      ...(options.proximaRenovacao !== undefined
        ? {
            proxima_renovacao:
              options.proximaRenovacao || "",
          }
        : {}),

      ...(typeof quantidade === "number"
        ? {
            estoque_quantidade:
              (typeof medicamento.estoque_quantidade ===
                "number" &&
              Number.isFinite(
                medicamento.estoque_quantidade
              )
                ? medicamento.estoque_quantidade
                : 0) + quantidade,

            estoque_data_referencia: data.data,
          }
        : {}),

      updated_at: timestamp,
      synced: false,
    };

    await db.transaction(
      "rw",
      [
        db.renovacoes,
        db.medicamentos,
        db.syncQueue,
      ],
      async () => {
        await db.renovacoes.add(cleanRenovacao);

        await db.medicamentos.put(
          medicamentoAtualizado
        );

        const medicamentoPersistido =
          await db.medicamentos.get(medicamentoId);

        if (
          !medicamentoPersistido ||
          medicamentoPersistido.person_id !== personId
        ) {
          throw new Error(
            "Não foi possível validar o medicamento após registrar a renovação."
          );
        }

        await enfileirarOperacao(
          "renovacoes",
          "add",
          cleanRenovacao,
          {
            dispatchSync: false,
          }
        );

        await enfileirarOperacao(
          "medicamentos",
          "update",
          medicamentoPersistido,
          {
            dispatchSync: false,
          }
        );
      }
    );

    solicitarProcessamentoSync();

    return id;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    personId: string,
    data: RenovacaoUpdateInput
  ): Promise<void> {
    const safeId = requireRenovacaoId(id);
    const safePersonId = requirePersonId(personId);
    const userId = await getAuthenticatedUserId();

    const atual = await getRenovacaoForPerson(
      safeId,
      safePersonId
    );

    if (
      atual.user_id &&
      atual.user_id !== userId
    ) {
      throw new Error(
        "Renovação não pertence ao usuário autenticado."
      );
    }

    const normalizedData =
      normalizeUpdateInput(data);

    const medicamentoId =
      normalizedData.medicamento_id !== undefined
        ? requireMedicamentoId(
            normalizedData.medicamento_id
          )
        : requireMedicamentoId(
            atual.medicamento_id
          );

    const medicamento =
      await validateMedicamentoForPerson(
        medicamentoId,
        safePersonId
      );

    if (
      medicamento.user_id &&
      medicamento.user_id !== userId
    ) {
      throw new Error(
        "Medicamento não pertence ao usuário autenticado."
      );
    }

    if (normalizedData.medico_id) {
      await getMedicoForUser(
        normalizedData.medico_id,
        userId
      );
    }

    if (normalizedData.farmacia_id) {
      await getFarmaciaForUser(
        normalizedData.farmacia_id,
        userId
      );
    }

    const timestamp = nowIso();

    const payload = removeUndefined({
      ...normalizedData,

      medicamento_id: medicamentoId,

      updated_at: timestamp,
      synced: false as const,
    });

    delete (
      payload as Record<string, unknown>
    ).id;

    delete (
      payload as Record<string, unknown>
    ).user_id;

    delete (
      payload as Record<string, unknown>
    ).person_id;

    delete (
      payload as Record<string, unknown>
    ).created_at;

    await db.transaction(
      "rw",
      [
        db.renovacoes,
        db.syncQueue,
      ],
      async () => {
        const updated = await db.renovacoes.update(
          safeId,
          payload
        );

        if (updated === 0) {
          throw new Error(
            "Não foi possível atualizar a renovação."
          );
        }

        const renovacaoAtualizada =
          await db.renovacoes.get(safeId);

        if (
          !renovacaoAtualizada ||
          renovacaoAtualizada.person_id !==
            safePersonId
        ) {
          throw new Error(
            "Falha ao reler a renovação atualizada."
          );
        }

        await enfileirarOperacao(
          "renovacoes",
          "update",
          renovacaoAtualizada,
          {
            dispatchSync: false,
          }
        );
      }
    );

    solicitarProcessamentoSync();
  },

  // ==========================================================
  // DELETE
  // ==========================================================

  async delete(
    id: string,
    personId: string
  ): Promise<void> {
    const safeId = requireRenovacaoId(id);
    const safePersonId = requirePersonId(personId);
    const userId = await getAuthenticatedUserId();

    const renovacao = await getRenovacaoForPerson(
      safeId,
      safePersonId
    );

    if (
      renovacao.user_id &&
      renovacao.user_id !== userId
    ) {
      throw new Error(
        "Renovação não pertence ao usuário autenticado."
      );
    }

    await db.transaction(
      "rw",
      [
        db.renovacoes,
        db.syncQueue,
      ],
      async () => {
        await db.renovacoes.delete(safeId);

        await enfileirarOperacao(
          "renovacoes",
          "delete",
          {
            id: safeId,
            person_id: safePersonId,
            user_id: userId,
          },
          {
            dispatchSync: false,
          }
        );
      }
    );

    solicitarProcessamentoSync();
  },
};