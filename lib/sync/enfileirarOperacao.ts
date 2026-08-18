// lib/sync/enfileirarOperacao.ts

import { db } from "@/lib/db";

type Operacao = "add" | "update" | "delete";

export async function enfileirarOperacao(
  tabela: string,
  operacao: Operacao,
  dados: Record<string, any>
) {
  const chave = `${tabela}:${dados.id}`;
  const agora = new Date().toISOString();

  // Deduplicação: substitui se já existir uma operação pendente para este registro
  const existente = await db.syncQueue.where("chave").equals(chave).first();

  if (existente) {
    // Atualiza o item existente com os novos dados
    await db.syncQueue.update(existente.id!, {
      table: tabela,
      operation: operacao,
      payload: dados,
      updated_at: agora,
      retry_count: 0, // reset ao atualizar
      failed: false,
    });
  } else {
    // Cria novo item
    await db.syncQueue.add({
      chave,
      table: tabela,
      operation: operacao,
      payload: dados,
      created_at: agora,
      updated_at: agora,
      retry_count: 0,
      failed: false,
    });
  }
}