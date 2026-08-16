// lib/repositories/tratamentos.ts

import { db } from "@/lib/db";
import type { Tratamento } from "@/lib/types";

export const tratamentosRepository = {
  async getAll() {
    return db.tratamentos.toArray();
  },

  async getById(id: string) {
    return db.tratamentos.get(id);
  },

  async create(data: Tratamento) {
    return db.tratamentos.add(data);
  },

  async update(id: string, data: Partial<Tratamento>) {
    return db.tratamentos.update(id, data);
  },

  /**
   * Exclusão Segura (Simulação de Cascade Delete)
   * Remove o tratamento e limpa o ID dele de todos os medicamentos vinculados.
   */
  async deleteSafe(id: string) {
    return db.transaction('rw', db.tratamentos, db.medicamentos, async () => {
      // 1. Exclui o tratamento
      await db.tratamentos.delete(id);

      // 2. Busca todos os medicamentos que possuem este ID no array
      const medicamentosAfetados = await db.medicamentos
        .where('tratamento_ids')
        .equals(id)
        .toArray();

      // 3. Varre e remove o ID fantasma de cada medicamento
      for (const med of medicamentosAfetados) {
        if (med.id && med.tratamento_ids) {
          // Filtra removendo o ID deletado e garantindo valores únicos com Set
          const novosIds = Array.from(new Set(med.tratamento_ids.filter(tId => tId !== id)));
          await db.medicamentos.update(med.id, { tratamento_ids: novosIds });
        }
      }
    });
  }
};
