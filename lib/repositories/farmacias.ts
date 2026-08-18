// lib/repositories/farmacias.ts

import {
  db,
  safeAddFarmacia,
  safeUpdateFarmacia,
  safeDeleteFarmacia,
  safeUpdateMedicamento,
  safeUpdateRenovacao,
} from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Farmacia } from "@/lib/types";

export const farmaciasRepository = {
  async getAll() {
    return db.farmacias.toArray();
  },

  async getById(id: string) {
    return db.farmacias.get(id);
  },

  async create(data: Omit<Farmacia, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    const id = await safeAddFarmacia(data);
    await enfileirarOperacao("farmacias", "add", { id, ...data });
    return id;
  },

  async update(id: string, data: Partial<Farmacia>) {
    await safeUpdateFarmacia(id, data);
    await enfileirarOperacao("farmacias", "update", { id, ...data });
    return id;
  },

  /**
   * Exclusão Segura com Sincronização
   * Remove a farmácia e limpa o ID dela de medicamentos e renovações.
   */
  async deleteSafe(id: string) {
    // 1. Exclui a farmácia
    await safeDeleteFarmacia(id);
    await enfileirarOperacao("farmacias", "delete", { id });

    // 2. Limpa medicamentos
    const medicamentosAfetados = await db.medicamentos.where('farmacia_id').equals(id).toArray();
    for (const med of medicamentosAfetados) {
      if (med.id) {
        await safeUpdateMedicamento(med.id, { farmacia_id: undefined });
        await enfileirarOperacao("medicamentos", "update", { id: med.id, farmacia_id: undefined });
      }
    }

    // 3. Limpa renovações
    const renovacoesAfetadas = await db.renovacoes.where('farmacia_id').equals(id).toArray();
    for (const ren of renovacoesAfetadas) {
      if (ren.id) {
        await safeUpdateRenovacao(ren.id, { farmacia_id: undefined });
        await enfileirarOperacao("renovacoes", "update", { id: ren.id, farmacia_id: undefined });
      }
    }
  },
};