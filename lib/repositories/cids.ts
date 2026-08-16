import { db, safeAddCid, safeUpdateCid, safeDeleteCid, safeUpdateTratamento } from "@/lib/db";
import type { Cid } from "@/lib/types";

export const cidsRepository = {
  async getAll() {
    return db.cids.toArray();
  },

  async getById(id: string) {
    return db.cids.get(id);
  },

  async create(data: Omit<Cid, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) {
    return safeAddCid(data);
  },

  async update(id: string, data: Partial<Cid>) {
    return safeUpdateCid(id, data);
  },

  /**
   * Exclusão Segura com Sincronização (Cascade Delete)
   * Remove o CID e limpa a referência cid_id nos tratamentos vinculados.
   * TODAS as operações usam safe... para manter sync com a nuvem.
   */
  async deleteSafe(id: string) {
    // 1. Deleta o CID (já coloca na fila de sync, se houver)
    await safeDeleteCid(id);

    // 2. Busca tratamentos que usam este CID
    const tratamentosAfetados = await db.tratamentos.where('cid_id').equals(id).toArray();

    // 3. Remove a referência de cada tratamento (usando safeUpdate)
    for (const tratamento of tratamentosAfetados) {
      if (tratamento.id) {
        await safeUpdateTratamento(tratamento.id, { cid_id: undefined });
      }
    }
  }
};