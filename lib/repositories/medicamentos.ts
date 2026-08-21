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

  async create(data: Omit<Medicamento, 'id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string }) {
    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }

    const now = new Date().toISOString();
    
    // Garante que o ID e os metadados fundamentais sejam gerados aqui, na raiz
    const payload = {
      ...data,
      id: data.id || crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      synced: false,
    };

    // 1. Grava localmente passando o objeto completo já com o ID
    const id = await safeAddMedicamento(payload);

    // 2. Enfileira para o Supabase (fonte de verdade)
    await enfileirarOperacao("medicamentos", "add", payload);

    return id;
  },

  async update(id: string, data: Partial<Medicamento>) {
    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }

    const now = new Date().toISOString();
    const payload = {
      ...data,
      updated_at: now,
      synced: false,
    };

    // 1. Atualiza localmente
    await safeUpdateMedicamento(id, payload);

    // 2. Enfileira para o Supabase
    await enfileirarOperacao("medicamentos", "update", { id, ...payload });

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
