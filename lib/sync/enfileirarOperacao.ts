// lib/sync/enfileirarOperacao.ts

import { db } from "@/lib/db";

import type {
  SyncQueueItem,
} from "@/lib/types";

type Operacao =
  | "add"
  | "update"
  | "delete";

type QueuePayload =
  Record<
    string,
    unknown
  >;

type EnfileirarOperacaoOptions = {
  dispatchSync?:
    boolean;
};

// ============================================================
// HELPERS
// ============================================================

function generateQueueId(): string {
  if (
    typeof crypto !==
      "undefined" &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (
      c
    ) => {
      const r =
        (
          Math.random() *
          16
        ) |
        0;

      const v =
        c ===
        "x"
          ? r
          : (
              r &
              0x3
            ) |
            0x8;

      return v.toString(
        16
      );
    }
  );
}

function sanitizePayload(
  dados: unknown
): QueuePayload {
  if (
    !dados ||
    typeof dados !==
      "object" ||
    Array.isArray(
      dados
    )
  ) {
    return {};
  }

  const payload = {
    ...(dados as QueuePayload),
  };

  /*
   * `synced` pertence exclusivamente ao estado local.
   *
   * IMPORTANTE:
   * não removemos null.
   *
   * null possui significado semântico para atualizações:
   *
   *   undefined = campo ausente / não alterado
   *   null      = limpar valor remoto
   */
  delete payload.synced;

  return payload;
}

function mergePayloads(
  anterior: unknown,
  novo: QueuePayload
): QueuePayload {
  const payloadAnterior =
    anterior &&
    typeof anterior ===
      "object" &&
    !Array.isArray(
      anterior
    )
      ? (
          anterior as
            QueuePayload
        )
      : {};

  const merged = {
    ...payloadAnterior,
    ...novo,
  };

  delete merged.synced;

  return merged;
}

function resolverOperacao(
  operacaoAnterior:
    Operacao,
  novaOperacao:
    Operacao
): Operacao {
  if (
    operacaoAnterior ===
      "add" &&
    novaOperacao ===
      "update"
  ) {
    return "add";
  }

  if (
    operacaoAnterior ===
      "add" &&
    novaOperacao ===
      "add"
  ) {
    return "add";
  }

  if (
    novaOperacao ===
    "delete"
  ) {
    return "delete";
  }

  if (
    operacaoAnterior ===
      "delete" &&
    novaOperacao ===
      "add"
  ) {
    return "add";
  }

  if (
    operacaoAnterior ===
      "delete" &&
    novaOperacao ===
      "update"
  ) {
    return "add";
  }

  if (
    operacaoAnterior ===
      "update" &&
    novaOperacao ===
      "add"
  ) {
    return "update";
  }

  return novaOperacao;
}

// ============================================================
// DISPATCH
// ============================================================

export function solicitarProcessamentoSync(): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new Event(
      "sync:process"
    )
  );
}

// ============================================================
// ENFILEIRAR
// ============================================================

export async function enfileirarOperacao(
  tabela:
    SyncQueueItem["table"],
  operacao:
    Operacao,
  dados:
    unknown,
  options:
    EnfileirarOperacaoOptions = {}
): Promise<void> {
  const {
    dispatchSync =
      true,
  } =
    options;

  /*
   * Guarda anti-eco.
   */
  if (
    typeof window !==
      "undefined" &&
    window.__isCloudUpdate
  ) {
    console.log(
      `[Anti-Eco] Ignorando operação na fila (${tabela}) porque o dado veio da nuvem.`
    );

    return;
  }

  const payloadNovo =
    sanitizePayload(
      dados
    );

  const id =
    typeof payloadNovo.id ===
      "string"
      ? payloadNovo.id
      : "";

  if (!id) {
    throw new Error(
      `[SyncQueue] Não foi possível enfileirar ${operacao} em "${tabela}": payload sem id.`
    );
  }

  const chave =
    `${tabela}:${id}`;

  const agora =
    new Date()
      .toISOString();

  const existente =
    await db.syncQueue
      .where(
        "chave"
      )
      .equals(
        chave
      )
      .first();

  if (!existente) {
    await db.syncQueue.add({
      id:
        generateQueueId(),

      chave,

      table:
        tabela,

      operation:
        operacao,

      payload:
        payloadNovo,

      created_at:
        agora,

      updated_at:
        agora,

      retry_count:
        0,

      failed:
        false,
    });

    if (
      dispatchSync
    ) {
      solicitarProcessamentoSync();
    }

    return;
  }

  const operacaoAnterior =
    existente.operation as
      Operacao;

  const operacaoResolvida =
    resolverOperacao(
      operacaoAnterior,
      operacao
    );

  const payloadResolvido =
    mergePayloads(
      existente.payload,
      payloadNovo
    );

  await db.syncQueue.update(
    existente.id!,
    {
      table:
        tabela,

      operation:
        operacaoResolvida,

      payload:
        payloadResolvido,

      updated_at:
        agora,

      retry_count:
        0,

      failed:
        false,

      /*
       * Uma nova alteração válida reativa inclusive
       * itens anteriormente marcados com erro.
       */
      next_retry_at:
        null,

      error:
        null,
    }
  );

  if (
    dispatchSync
  ) {
    solicitarProcessamentoSync();
  }
}

// ============================================================
// GLOBAL
// ============================================================

declare global {
  interface Window {
    __isCloudUpdate?:
      boolean;
  }
}