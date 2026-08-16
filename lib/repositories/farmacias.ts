// lib/repositories/farmacias.ts

import { db, safeAddFarmacia, safeUpdateFarmacia, safeDeleteFarmacia } from "@/lib/db";
import type { Farmacia } from "@/lib/types";

export const farmaciasRepository = {
  async getAll() {
    return db.farmacias.toArray();
  },

  async getById(id: string) {
    return db.farmacias.get(id);
  },

  async create(data: Omit<Farmacia, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    return safeAddFarmacia(data);
  },

  async update(id: string, data: Partial<Farmacia>) {
    return safeUpdateFarmacia(id, data);
  },

  /**
   * Exclusão Segura
   * Remove a farmácia e limpa o ID dela de medicamentos e renovações.
   */
  async deleteSafe(id: string) {
    return db.transaction('rw', db.farmacias, db.medicamentos, db.renovacoes, async () => {
      await db.farmacias.delete(id);

      const medicamentosAfetados = await db.medicamentos.where('farmacia_id').equals(id).toArray();
      for (const med of medicamentosAfetados) {
        if (med.id) {
          await db.medicamentos.update(med.id, { farmacia_id: undefined });
        }
      }

      const renovacoesAfetadas = await db.renovacoes.where('farmacia_id').equals(id).toArray();
      for (const ren of renovacoesAfetadas) {
        if (ren.id) {
          await db.renovacoes.update(ren.id, { farmacia_id: undefined });
        }
      }
    });
  }
};