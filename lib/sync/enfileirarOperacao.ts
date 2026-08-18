// lib/sync/enfileirarOperacao.ts
import { db } from "@/lib/db";

type Operacao = "add" | "update" | "delete";

export async function enfileirarOperacao(tabela: string, operacao: Operacao, dados: Record<string, any>) {
  const chave = `${tabela}:${dados.id}`;
  const agora = new Date().toISOString();

  // Deduplicação: substitui se já existir uma operação pendente para este registro
  const existente = await db.syncQueue.where("chave").equals(chave).first();

  const item = {
    chave,
    table: tabela, // Ajustei para 'table' para bater com o seu processQueue
    operation: operacao,
    payload: dados, // Ajustei para 'payload' para bater com o seu processQueue
    synced: 0,
    retry_count: 0,
    created_at: existente?.created_at ?? agora,
    updated_at: agora,
  };

  if (existente) {
    await db.syncQueue.update(existente.id, item);
  } else {
    await db.syncQueue.add(item);
  }
}
