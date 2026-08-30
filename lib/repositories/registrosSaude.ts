// lib/repositories/registrosSaude.ts

import { db } from "@/lib/db";

import {
  enfileirarOperacao,
  solicitarProcessamentoSync,
} from "@/lib/sync/enfileirarOperacao";

import { supabase } from "@/lib/supabase/client";

import type { RegistroSaude } from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type CreateRegistroSaudeBase = Omit<
  RegistroSaude,
  | "id"
  | "user_id"
  | "person_id"
  | "created_at"
  | "updated_at"
  | "synced"
>;

export type CreateRegistroSaudeInput = Omit<
  CreateRegistroSaudeBase,
  "medicamento_id" | "tratamento_ids" | "cid_ids"
> & {
  person_id: string;

  medicamento_id?: string | null;

  tratamento_ids?: string[] | null;

  cid_ids?: string[] | null;
};

type UpdateRegistroSaudeBase = Partial<
  Omit<
    RegistroSaude,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
    | "updated_at"
    | "synced"
  >
>;

export type UpdateRegistroSaudeInput = Omit<
  UpdateRegistroSaudeBase,
  "medicamento_id" | "tratamento_ids" | "cid_ids"
> & {
  /*
   * undefined = não altera
   * null = limpa
   * string = define
   */
  medicamento_id?: string | null;

  /*
   * undefined = não altera
   * null / [] = limpa
   * ids = define
   */
  tratamento_ids?: string[] | null;

  cid_ids?: string[] | null;
};

// ============================================================
// HELPERS BÁSICOS
// ============================================================

function requireId(id?: string): string {
  const safeId = id?.trim();

  if (!safeId) {
    throw new Error("Registro de saúde não identificado.");
  }

  return safeId;
}

function requirePersonId(personId?: string): string {
  const safePersonId = personId?.trim();

  if (!safePersonId) {
    throw new Error("Pessoa ativa não identificada.");
  }

  return safePersonId;
}

function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function uniqueIds(ids?: string[] | null): string[] {
  if (!ids) {
    return [];
  }

  return Array.from(
    new Set(
      ids
        .map((id) => id.trim())
        .filter(Boolean)
    )
  );
}

function hasOwn(
  value: object,
  key: PropertyKey
): boolean {
  return Object.prototype.hasOwnProperty.call(
    value,
    key
  );
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } =
    await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error(
      "Usuário não autenticado."
    );
  }

  return data.user.id;
}

// ============================================================
// OWNERSHIP
// ============================================================

async function getRegistroForPerson(
  id: string,
  personId: string
): Promise<RegistroSaude | undefined> {
  const safeId = requireId(id);

  const safePersonId =
    requirePersonId(personId);

  const registro =
    await db.registros_saude.get(
      safeId
    );

  if (
    !registro ||
    registro.person_id !== safePersonId
  ) {
    return undefined;
  }

  return registro;
}

// ============================================================
// VALIDAÇÃO DE RELAÇÕES
// ============================================================

async function validateMedicamento(
  medicamentoId: string | null | undefined,
  personId: string
): Promise<void> {
  if (!medicamentoId) {
    return;
  }

  const medicamento =
    await db.medicamentos.get(
      medicamentoId
    );

  if (
    !medicamento ||
    medicamento.person_id !== personId
  ) {
    throw new Error(
      "O medicamento selecionado não pertence à pessoa ativa."
    );
  }
}

async function validateTratamentos(
  tratamentoIds: string[],
  personId: string
): Promise<void> {
  if (tratamentoIds.length === 0) {
    return;
  }

  const tratamentos =
    await db.tratamentos
      .where("id")
      .anyOf(tratamentoIds)
      .toArray();

  const validIds = new Set(
    tratamentos
      .filter(
        (tratamento) =>
          tratamento.person_id === personId
      )
      .map(
        (tratamento) =>
          tratamento.id
      )
      .filter(
        (tratamentoId): tratamentoId is string =>
          Boolean(tratamentoId)
      )
  );

  for (const tratamentoId of tratamentoIds) {
    if (!validIds.has(tratamentoId)) {
      throw new Error(
        "Um dos tratamentos selecionados não pertence à pessoa ativa."
      );
    }
  }
}

async function validateCids(
  cidIds: string[],
  personId: string
): Promise<void> {
  if (cidIds.length === 0) {
    return;
  }

  const cids =
    await db.cids
      .where("id")
      .anyOf(cidIds)
      .toArray();

  const validIds = new Set(
    cids
      .filter(
        (cid) =>
          cid.person_id === personId
      )
      .map(
        (cid) =>
          cid.id
      )
      .filter(
        (cidId): cidId is string =>
          Boolean(cidId)
      )
  );

  for (const cidId of cidIds) {
    if (!validIds.has(cidId)) {
      throw new Error(
        "Um dos CIDs selecionados não pertence à pessoa ativa."
      );
    }
  }
}

async function validateRelations(params: {
  personId: string;

  medicamentoId?: string | null;

  tratamentoIds?: string[] | null;

  cidIds?: string[] | null;
}): Promise<void> {
  const {
    personId,
    medicamentoId,
    tratamentoIds,
    cidIds,
  } = params;

  await Promise.all([
    validateMedicamento(
      medicamentoId,
      personId
    ),

    validateTratamentos(
      uniqueIds(tratamentoIds),
      personId
    ),

    validateCids(
      uniqueIds(cidIds),
      personId
    ),
  ]);
}

// ============================================================
// ORDENAÇÃO
// ============================================================

function sortRegistros(
  registros: RegistroSaude[]
): RegistroSaude[] {
  return [...registros].sort(
    (a, b) => {
      const dateCompare = String(
        b.data || ""
      ).localeCompare(
        String(a.data || "")
      );

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return String(
        b.horario || ""
      ).localeCompare(
        String(a.horario || "")
      );
    }
  );
}

// ============================================================
// REPOSITORY
// ============================================================

export const registrosSaudeRepository = {
  // ==========================================================
  // LIST
  // ==========================================================

  async getAll(
    personId: string
  ): Promise<RegistroSaude[]> {
    const safePersonId =
      requirePersonId(personId);

    const registros =
      await db.registros_saude
        .where("person_id")
        .equals(safePersonId)
        .toArray();

    return sortRegistros(
      registros
    );
  },

  // ==========================================================
  // GET
  // ==========================================================

  async getById(
    id: string,
    personId: string
  ): Promise<RegistroSaude | undefined> {
    return getRegistroForPerson(
      id,
      personId
    );
  },

  // ==========================================================
  // HISTÓRICO SEMELHANTE
  //
  // A comparação permanece determinística:
  // mesmo nome normalizado + mesma pessoa.
  //
  // A camada de inteligência poderá aprofundar essa série
  // longitudinal sem acessar Dexie diretamente.
  // ==========================================================

  async getHistoricoSimilar(
    id: string,
    personId: string,
    limit = 10
  ): Promise<RegistroSaude[]> {
    const safeId =
      requireId(id);

    const safePersonId =
      requirePersonId(personId);

    const registro =
      await getRegistroForPerson(
        safeId,
        safePersonId
      );

    if (!registro) {
      return [];
    }

    const nomeNormalizado =
      String(registro.nome || "")
        .trim()
        .toLocaleLowerCase(
          "pt-BR"
        );

    if (!nomeNormalizado) {
      return [];
    }

    const todos =
      await db.registros_saude
        .where("person_id")
        .equals(safePersonId)
        .toArray();

    return sortRegistros(
      todos.filter(
        (item) =>
          item.id !== safeId &&
          String(item.nome || "")
            .trim()
            .toLocaleLowerCase(
              "pt-BR"
            ) === nomeNormalizado
      )
    ).slice(
      0,
      Math.max(0, limit)
    );
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data: CreateRegistroSaudeInput
  ): Promise<string> {
    const personId =
      requirePersonId(
        data.person_id
      );

    const userId =
      await getAuthenticatedUserId();

    const medicamentoId =
      data.medicamento_id?.trim() ||
      null;

    const tratamentoIds =
      uniqueIds(
        data.tratamento_ids
      );

    const cidIds =
      uniqueIds(
        data.cid_ids
      );

    await validateRelations({
      personId,

      medicamentoId,

      tratamentoIds,

      cidIds,
    });

    const id =
      generateId();

    const now =
      nowIso();

    const novoRegistro = {
      ...data,

      id,

      user_id:
        userId,

      person_id:
        personId,

      medicamento_id:
        medicamentoId,

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
    } as RegistroSaude;

    await db.transaction(
      "rw",
      [
        db.registros_saude,
        db.syncQueue,
      ],
      async () => {
        await db.registros_saude.add(
          novoRegistro
        );

        await enfileirarOperacao(
          "registros_saude" as any,
          "add",
          novoRegistro as any,
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
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    personId: string,
    changes: UpdateRegistroSaudeInput
  ): Promise<string> {
    const safeId =
      requireId(id);

    const safePersonId =
      requirePersonId(personId);

    const userId =
      await getAuthenticatedUserId();

    const atual =
      await getRegistroForPerson(
        safeId,
        safePersonId
      );

    if (!atual) {
      throw new Error(
        "Registro de saúde não encontrado para a pessoa ativa."
      );
    }

    if (
      atual.user_id &&
      atual.user_id !== userId
    ) {
      throw new Error(
        "Registro de saúde não pertence ao usuário autenticado."
      );
    }

    // --------------------------------------------------------
    // RELAÇÕES FINAIS
    // --------------------------------------------------------

    const finalMedicamentoId =
      hasOwn(
        changes,
        "medicamento_id"
      )
        ? changes.medicamento_id?.trim() ||
          null
        : atual.medicamento_id ||
          null;

    const finalTratamentoIds =
      hasOwn(
        changes,
        "tratamento_ids"
      )
        ? uniqueIds(
            changes.tratamento_ids
          )
        : uniqueIds(
            atual.tratamento_ids
          );

    const finalCidIds =
      hasOwn(
        changes,
        "cid_ids"
      )
        ? uniqueIds(
            changes.cid_ids
          )
        : uniqueIds(
            atual.cid_ids
          );

    await validateRelations({
      personId:
        safePersonId,

      medicamentoId:
        finalMedicamentoId,

      tratamentoIds:
        finalTratamentoIds,

      cidIds:
        finalCidIds,
    });

    const now =
      nowIso();

    /*
     * Construímos o registro FINAL completo em memória.
     *
     * Isso resolve duas coisas:
     *
     * 1. a fila recebe registro completo;
     * 2. null realmente limpa relações no sync remoto.
     */
    const atualizado = {
      ...atual,
      ...changes,

      id:
        safeId,

      user_id:
        atual.user_id ||
        userId,

      person_id:
        safePersonId,

      medicamento_id:
        finalMedicamentoId,

      tratamento_ids:
        finalTratamentoIds,

      cid_ids:
        finalCidIds,

      created_at:
        atual.created_at,

      updated_at:
        now,

      synced:
        false,
    } as RegistroSaude;

    await db.transaction(
      "rw",
      [
        db.registros_saude,
        db.syncQueue,
      ],
      async () => {
        await db.registros_saude.put(
          atualizado
        );

        await enfileirarOperacao(
          "registros_saude" as any,
          "update",
          atualizado as any,
          {
            dispatchSync:
              false,
          }
        );
      }
    );

    solicitarProcessamentoSync();

    return safeId;
  },

  // ==========================================================
  // DELETE
  // ==========================================================

  async delete(
    id: string,
    personId: string
  ): Promise<string> {
    const safeId =
      requireId(id);

    const safePersonId =
      requirePersonId(personId);

    const userId =
      await getAuthenticatedUserId();

    const atual =
      await getRegistroForPerson(
        safeId,
        safePersonId
      );

    if (!atual) {
      throw new Error(
        "Registro de saúde não encontrado para a pessoa ativa."
      );
    }

    if (
      atual.user_id &&
      atual.user_id !== userId
    ) {
      throw new Error(
        "Registro de saúde não pertence ao usuário autenticado."
      );
    }

    await db.transaction(
      "rw",
      [
        db.registros_saude,
        db.syncQueue,
      ],
      async () => {
        await db.registros_saude.delete(
          safeId
        );

        await enfileirarOperacao(
          "registros_saude" as any,
          "delete",
          {
            id:
              safeId,

            person_id:
              safePersonId,

            user_id:
              userId,
          } as any,
          {
            dispatchSync:
              false,
          }
        );
      }
    );

    solicitarProcessamentoSync();

    return safeId;
  },
};