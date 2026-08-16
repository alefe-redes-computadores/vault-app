// lib/repositories/medicamentos.ts

import { db } from "@/lib/db";
import type { Medicamento } from "@/lib/types";

export const medicamentosRepository = {
  async getAll() {
    return db.medicamentos.toArray();
  },

  async getById(id: string) {
    return db.medicamentos.get(id);
  },

  async create(data: Medicamento) {
    // Garante que não haverá IDs de tratamento duplicados no array
    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }
    return db.medicamentos.add(data);
  },

  async update(id: string, data: Partial<Medicamento>) {
    // Garante unicidade caso os IDs sejam atualizados
    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }
    return db.medicamentos.update(id, data);
  },

  async delete(id: string) {
    return db.medicamentos.delete(id);
  }
};
