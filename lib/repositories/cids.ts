// lib/repositories/cids.ts

import { db, safeAddCid, safeUpdateCid, safeDeleteCid, safeUpdateTratamento } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Cid } from "@/lib/types";

export const cidsRepository = {
  async getAll() {
    return db.cids.toArray();
  },

  async getById(id: string) {
    return db.cids.get(id);
  },

  async create(data: Omit<Cid, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) {
    const id = await safeAddCid(data);
    await enfileirarOperacao("cids", "add", { id, ...data });
    return id;
  },

  async update(id: string, data: Partial<Cid>) {
    await safeUpdateCid(id, data);
    await enfileirarOperacao("cids", "update", { id, ...data });
    return id;
  },

  /**
   * Exclusão Segura com Sincronização
   * Remove o CID e limpa a referência dele nos tratamentos (cid_ids).
   */
  async deleteSafe(id: string) {
    // 1. Exclui o CID
    await safeDeleteCid(id);
    await enfileirarOperacao("cids", "delete", { id });

    // 2. Busca tratamentos que usam este CID
    const tratamentosAfetados = await db.tratamentos.where('cid_ids').equals(id).toArray();

    // 3. Remove a referência de cada tratamento
    for (const tratamento of tratamentosAfetados) {
      if (tratamento.id && tratamento.cid_ids) {
        const novosIds = Array.from(new Set(tratamento.cid_ids.filter(cidId => cidId !== id)));
        await safeUpdateTratamento(tratamento.id, { cid_ids: novosIds });
        await enfileirarOperacao("tratamentos", "update", { id: tratamento.id, cid_ids: novosIds });
      }
    }
  },
};