// lib/repositories/tratamentos.ts

import { db, safeAddTratamento, safeUpdateTratamento, safeDeleteTratamento } from "@/lib/db";
import { safeUpdateMedicamento } from "@/lib/db";
import { safeUpdateExame } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Tratamento } from "@/lib/types";

export const tratamentosRepository = {
  async getAll() {
    return db.tratamentos.toArray();
  },

  async getById(id: string) {
    return db.tratamentos.get(id);
  },

  async create(data: Omit<Tratamento, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    // 1. Grava localmente
    const id = await safeAddTratamento(data);

    // 2. Enfileira para o Supabase (fonte de verdade)
    await enfileirarOperacao("tratamentos", "add", { id, ...data });

    return id;
  },

  async update(id: string, data: Partial<Tratamento>) {
    // 1. Atualiza localmente
    await safeUpdateTratamento(id, data);

    // 2. Enfileira para o Supabase
    await enfileirarOperacao("tratamentos", "update", { id, ...data });

    return id;
  },

  /**
   * Exclusão Segura com Sincronização (Cascade Delete Manual)
   * Remove o tratamento e limpa o ID dele de medicamentos e exames.
   * Todas as operações usam safe... e enfileirarOperacao para a nuvem.
   */
  async deleteSafe(id: string) {
    // 1. Exclui o tratamento e enfileira
    await safeDeleteTratamento(id);
    await enfileirarOperacao("tratamentos", "delete", { id });

    // 2. Limpa medicamentos vinculados
    const medicamentosAfetados = await db.medicamentos
      .where('tratamento_ids')
      .equals(id)
      .toArray();

    for (const med of medicamentosAfetados) {
      if (med.id && med.tratamento_ids) {
        const novosIds = Array.from(new Set(med.tratamento_ids.filter(tId => tId !== id)));
        await safeUpdateMedicamento(med.id, { tratamento_ids: novosIds });
        await enfileirarOperacao("medicamentos", "update", { id: med.id, tratamento_ids: novosIds });
      }
    }

    // 3. Limpa exames vinculados
    const examesAfetados = await db.exames
      .where('tratamento_ids')
      .equals(id)
      .toArray();

    for (const exame of examesAfetados) {
      if (exame.id && exame.tratamento_ids) {
        const novosIds = Array.from(new Set(exame.tratamento_ids.filter(tId => tId !== id)));
        await safeUpdateExame(exame.id, { tratamento_ids: novosIds });
        await enfileirarOperacao("exames", "update", { id: exame.id, tratamento_ids: novosIds });
      }
    }
  }
};