// lib/sync/enfileirarOperacao.ts
import { db } from "@/lib/db";
import type { SyncQueueItem } from "@/lib/types";

type Operacao = "add" | "update" | "delete";

type QueuePayload = Record<string, unknown>;

function generateQueueId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }
  );
}

function sanitizePayload(dados: unknown): QueuePayload {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    return {};
  }

  const payload = {
    ...(dados as QueuePayload),
  };

  // `synced` é um estado exclusivamente local.
  // Não deve fazer parte do payload enviado ao Supabase.
  delete payload.synced;

  return payload;
}

function mergePayloads(
  anterior: unknown,
  novo: QueuePayload
): QueuePayload {
  const payloadAnterior =
    anterior &&
    typeof anterior === "object" &&
    !Array.isArray(anterior)
      ? (anterior as QueuePayload)
      : {};

  const merged = {
    ...payloadAnterior,
    ...novo,
  };

  delete merged.synced;

  return merged;
}

function resolverOperacao(
  operacaoAnterior: Operacao,
  novaOperacao: Operacao
): Operacao {
  /**
   * Estado desejado da fila:
   *
   * add -> update
   * Continua sendo ADD.
   *
   * O registro ainda pode não existir na nuvem.
   * Apenas atualizamos o payload do ADD com os dados mais recentes.
   */
  if (
    operacaoAnterior === "add" &&
    novaOperacao === "update"
  ) {
    return "add";
  }

  /**
   * add -> add
   * Mantém ADD e consolida os dados.
   */
  if (
    operacaoAnterior === "add" &&
    novaOperacao === "add"
  ) {
    return "add";
  }

  /**
   * Qualquer estado -> delete
   *
   * Mantemos DELETE na fila em vez de simplesmente remover
   * o item. Isso é mais seguro porque pode ter acontecido o caso:
   *
   * 1. ADD chegou no Supabase;
   * 2. conexão caiu antes de remover o item da fila;
   * 3. usuário apagou o registro localmente.
   *
   * Nesse cenário, remover a fila deixaria um registro órfão
   * na nuvem. DELETE é idempotente no Supabase.
   */
  if (novaOperacao === "delete") {
    return "delete";
  }

  /**
   * delete -> add
   *
   * O estado final desejado voltou a ser "registro existe".
   *
   * Tratamos como ADD. Os handlers de sincronização ainda
   * deverão ser auditados para garantir UPSERT onde necessário.
   */
  if (
    operacaoAnterior === "delete" &&
    novaOperacao === "add"
  ) {
    return "add";
  }

  /**
   * delete -> update
   *
   * É um fluxo incomum, mas significa que localmente o registro
   * voltou a existir antes do DELETE chegar à nuvem.
   *
   * Usamos ADD pelo mesmo motivo: não podemos assumir que o
   * registro remoto ainda existe.
   */
  if (
    operacaoAnterior === "delete" &&
    novaOperacao === "update"
  ) {
    return "add";
  }

  /**
   * update -> add
   *
   * Se já havia UPDATE pendente, normalmente significa que
   * o registro já existia antes.
   *
   * Mantemos UPDATE para não transformar desnecessariamente
   * o fluxo em INSERT.
   */
  if (
    operacaoAnterior === "update" &&
    novaOperacao === "add"
  ) {
    return "update";
  }

  return novaOperacao;
}

export async function enfileirarOperacao(
  tabela: SyncQueueItem["table"],
  operacao: Operacao,
  dados: unknown
): Promise<void> {
  /**
   * Guarda anti-eco.
   *
   * Mantida por compatibilidade com o fluxo atual.
   * Hoje o Vault não possui publicação Realtime ativa no
   * Supabase, mas outras partes do app ainda podem utilizar
   * essa flag.
   */
  if (
    typeof window !== "undefined" &&
    window.__isCloudUpdate
  ) {
    console.log(
      `[Anti-Eco] Ignorando operação na fila (${tabela}) porque o dado veio da nuvem.`
    );

    return;
  }

  const payloadNovo = sanitizePayload(dados);

  const id =
    typeof payloadNovo.id === "string"
      ? payloadNovo.id
      : "";

  if (!id) {
    throw new Error(
      `[SyncQueue] Não foi possível enfileirar ${operacao} em "${tabela}": payload sem id.`
    );
  }

  const chave = `${tabela}:${id}`;
  const agora = new Date().toISOString();

  const existente = await db.syncQueue
    .where("chave")
    .equals(chave)
    .first();

  if (!existente) {
    await db.syncQueue.add({
      id: generateQueueId(),
      chave,
      table: tabela,
      operation: operacao,
      payload: payloadNovo,
      created_at: agora,
      updated_at: agora,
      retry_count: 0,
      failed: false,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sync:process"));
    }

    return;
  }

  const operacaoAnterior =
    existente.operation as Operacao;

  const operacaoResolvida = resolverOperacao(
    operacaoAnterior,
    operacao
  );

  let payloadResolvido: QueuePayload;

  if (operacaoResolvida === "delete") {
    /**
     * Mantemos pelo menos o payload anterior + novo.
     *
     * Alguns handlers de DELETE usam somente `id`, mas preservar
     * os demais campos evita quebrar algum fluxo existente que
     * ainda dependa deles.
     */
    payloadResolvido = mergePayloads(
      existente.payload,
      payloadNovo
    );
  } else {
    /**
     * Fundamental para:
     *
     * ADD inicial:
     * { id, title, ... }
     *
     * UPDATE posterior:
     * { id, title: "novo" }
     *
     * Resultado:
     * ADD com todos os dados originais + alterações mais recentes.
     */
    payloadResolvido = mergePayloads(
      existente.payload,
      payloadNovo
    );
  }

  await db.syncQueue.update(existente.id!, {
    table: tabela,
    operation: operacaoResolvida,
    payload: payloadResolvido,
    updated_at: agora,

    // Uma nova alteração local dá nova oportunidade à operação.
    retry_count: 0,
    failed: false,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sync:process"));
  }
}

declare global {
  interface Window {
    __isCloudUpdate?: boolean;
  }
}