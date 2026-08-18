// lib/repositories/medicamentos.ts

import { db, safeAddMedicamento, safeUpdateMedicamento, safeDeleteMedicamento } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Medicamento } from "@/lib/types";

export const medicamentosRepository = {
  async getAll() {
    return db.medicamentos.toArray();
  },

  async getById(id: string) {
    return db.medicamentos.get(id);
  },

  async create(data: Omit<Medicamento, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }

    // 1. Grava localmente
    const id = await safeAddMedicamento(data);

    // 2. Enfileira para o Supabase (fonte de verdade)
    await enfileirarOperacao("medicamentos", "add", { id, ...data });

    return id;
  },

  async update(id: string, data: Partial<Medicamento>) {
    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }

    // 1. Atualiza localmente
    await safeUpdateMedicamento(id, data);

    // 2. Enfileira para o Supabase
    await enfileirarOperacao("medicamentos", "update", { id, ...data });

    return id;
  },

  async delete(id: string) {
    // 1. Exclui localmente
    await safeDeleteMedicamento(id);

    // 2. Enfileira a exclusão para o Supabase
    await enfileirarOperacao("medicamentos", "delete", { id });

    return id;
  }
};