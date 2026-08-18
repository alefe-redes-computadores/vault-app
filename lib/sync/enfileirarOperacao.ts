// lib/sync/enfileirarOperacao.ts
import { db } from "@/lib/db";
import type { SyncQueueItem } from "@/lib/types";

type Operacao = "add" | "update" | "delete";

export async function enfileirarOperacao(
  tabela: SyncQueueItem["table"],
  operacao: Operacao,
  dados: unknown
) {
  const dadosObj = dados as { id?: string };
  const chave = `${tabela}:${dadosObj.id ?? ""}`;
  const agora = new Date().toISOString();
  const payload = dados as Record<string, unknown>;

  const existente = await db.syncQueue.where("chave").equals(chave).first();

  const atualizacao = {
    table: tabela,
    operation: operacao,
    payload,
    updated_at: agora,
    retry_count: 0,
    failed: false,
  };

  if (existente) {
    await db.syncQueue.update(existente.id!, atualizacao);
  } else {
    await db.syncQueue.add({
      chave,
      ...atualizacao,
      created_at: agora,
    });
  }
}