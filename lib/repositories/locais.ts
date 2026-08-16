// lib/repositories/locais.ts

import { db, safeAddLocal, safeUpdateLocal, safeDeleteLocal } from "@/lib/db";
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
   * Exclusão Segura
   * Remove o local e limpa o ID dele de renovações.
   */
  async deleteSafe(id: string) {
    return db.transaction('rw', db.locais, db.renovacoes, async () => {
      await db.locais.delete(id);

      const renovacoesAfetadas = await db.renovacoes.where('local_id').equals(id).toArray();
      for (const ren of renovacoesAfetadas) {
        if (ren.id) {
          await db.renovacoes.update(ren.id, { local_id: undefined });
        }
      }
    });
  }
};