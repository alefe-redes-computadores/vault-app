// lib/repositories/exames.ts

import { db, safeAddExame, safeUpdateExame, safeDeleteExame } from "@/lib/db";
import type { Exame } from "@/lib/types";

export const examesRepository = {
  async getAll() {
    return db.exames.toArray();
  },

  async getById(id: string) {
    return db.exames.get(id);
  },

  async create(data: Omit<Exame, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }
    return safeAddExame(data);
  },

  async update(id: string, data: Partial<Exame>) {
    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }
    return safeUpdateExame(id, data);
  },

  async delete(id: string) {
    return safeDeleteExame(id);
  }
};