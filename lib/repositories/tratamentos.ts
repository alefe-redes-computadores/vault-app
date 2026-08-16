// lib/repositories/tratamentos.ts

import { db, safeAddTratamento, safeUpdateTratamento, safeDeleteTratamento } from "@/lib/db";
import type { Tratamento } from "@/lib/types";

export const tratamentosRepository = {
  async getAll() {
    return db.tratamentos.toArray();
  },

  async getById(id: string) {
    return db.tratamentos.get(id);
  },

  async create(data: Omit<Tratamento, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    return safeAddTratamento(data);
  },

  async update(id: string, data: Partial<Tratamento>) {
    return safeUpdateTratamento(id, data);
  },

  /**
   * Exclusão Segura (Cascade Delete Simulado)
   * Remove o tratamento e limpa o ID dele de medicamentos e exames vinculados.
   */
  async deleteSafe(id: string) {
    return db.transaction('rw', db.tratamentos, db.medicamentos, db.exames, async () => {
      // 1. Exclui o tratamento
      await db.tratamentos.delete(id);

      // 2. Limpa medicamentos
      const medicamentosAfetados = await db.medicamentos
        .where('tratamento_ids')
        .equals(id)
        .toArray();

      for (const med of medicamentosAfetados) {
        if (med.id && med.tratamento_ids) {
          const novosIds = Array.from(new Set(med.tratamento_ids.filter(tId => tId !== id)));
          await db.medicamentos.update(med.id, { tratamento_ids: novosIds });
        }
      }

      // 3. Limpa exames (✅ NOVO)
      const examesAfetados = await db.exames
        .where('tratamento_ids')
        .equals(id)
        .toArray();

      for (const exame of examesAfetados) {
        if (exame.id && exame.tratamento_ids) {
          const novosIds = Array.from(new Set(exame.tratamento_ids.filter(tId => tId !== id)));
          await db.exames.update(exame.id, { tratamento_ids: novosIds });
        }
      }
    });
  }
};