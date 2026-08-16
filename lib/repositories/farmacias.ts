import { db, safeAddFarmacia, safeUpdateFarmacia, safeDeleteFarmacia, safeUpdateMedicamento, safeUpdateRenovacao } from "@/lib/db";
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
   * Exclusão Segura com Sincronização (Cascade Delete)
   * Remove a farmácia e limpa o ID dela de medicamentos e renovações.
   * TODAS as operações usam safe... para manter sync com a nuvem.
   */
  async deleteSafe(id: string) {
    // 1. Deleta a farmácia (já coloca na fila de sync)
    await safeDeleteFarmacia(id);

    // 2. Limpa medicamentos (usando safeUpdate)
    const medicamentosAfetados = await db.medicamentos.where('farmacia_id').equals(id).toArray();
    for (const med of medicamentosAfetados) {
      if (med.id) await safeUpdateMedicamento(med.id, { farmacia_id: undefined });
    }

    // 3. Limpa renovações (usando safeUpdate)
    const renovacoesAfetadas = await db.renovacoes.where('farmacia_id').equals(id).toArray();
    for (const ren of renovacoesAfetadas) {
      if (ren.id) await safeUpdateRenovacao(ren.id, { farmacia_id: undefined });
    }
  }
};