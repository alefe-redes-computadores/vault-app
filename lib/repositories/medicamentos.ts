// lib/repositories/medicamentos.ts

import { db, safeAddMedicamento, safeUpdateMedicamento, safeDeleteMedicamento } from "@/lib/db";
import type { Medicamento } from "@/lib/types";

export const medicamentosRepository = {
  async getAll() {
    return db.medicamentos.toArray();
  },

  async getById(id: string) {
    return db.medicamentos.get(id);
  },

  async create(data: Omit<Medicamento, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    // Garante unicidade no array de tratamentos
    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }
    return safeAddMedicamento(data);
  },

  async update(id: string, data: Partial<Medicamento>) {
    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }
    return safeUpdateMedicamento(id, data);
  },

  async delete(id: string) {
    return safeDeleteMedicamento(id);
  }
};