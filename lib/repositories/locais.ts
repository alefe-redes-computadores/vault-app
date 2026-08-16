import { db, safeAddLocal, safeUpdateLocal, safeDeleteLocal, safeUpdateRenovacao } from "@/lib/db";
import type { LocalSaude } from "@/lib/types";

export const locaisRepository = {
  async getAll() {
    return db.locais.toArray();
  },

  async getById(id: string) {
    return db.locais.get(id);
  },

  async create(data: Omit<LocalSaude, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    return safeAddLocal(data);
  },

  async update(id: string, data: Partial<LocalSaude>) {
    return safeUpdateLocal(id, data);
  },

  /**
   * Exclusão Segura com Sincronização (Cascade Delete)
   * Remove o local e limpa o ID dele de renovações.
   * TODAS as operações usam safe... para manter sync com a nuvem.
   */
  async deleteSafe(id: string) {
    // 1. Deleta o local (já coloca na fila de sync)
    await safeDeleteLocal(id);

    // 2. Limpa renovações (usando safeUpdate)
    const renovacoesAfetadas = await db.renovacoes.where('local_id').equals(id).toArray();
    for (const ren of renovacoesAfetadas) {
      if (ren.id) await safeUpdateRenovacao(ren.id, { local_id: undefined });
    }
  }
};