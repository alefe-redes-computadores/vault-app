// lib/sync/enfileirarOperacao.ts
import { db } from "@/lib/db";
import type { SyncQueueItem } from "@/lib/types";

type Operacao = "add" | "update" | "delete";

function generateQueueId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function enfileirarOperacao(
  tabela: SyncQueueItem["table"],
  operacao: Operacao,
  dados: unknown
) {
  const dadosObj = dados as { id?: string };
  const chave = `${tabela}:${dadosObj.id ?? ""}`;
  const agora = new Date().toISOString();
  
  // 🔥 A CORREÇÃO: Criamos uma cópia do payload e DELETAMOS a propriedade 'synced'
  // antes de mandar para a fila, para não quebrar o Supabase.
  const payload = { ...(dados as Record<string, unknown>) };
  delete payload.synced;

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
      id: generateQueueId(),
      chave,
      ...atualizacao,
      created_at: agora,
    });
  }

  // Dispara o evento global para acordar o hook useSyncQueue imediatamente
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sync:process"));
  }
}
