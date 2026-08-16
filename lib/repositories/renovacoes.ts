// lib/repositories/renovacoes.ts

import { db, safeAddRenovacao, safeUpdateRenovacao } from "@/lib/db";
import type { Renovacao } from "@/lib/types";

export const renovacoesRepository = {
  async getAll() {
    return db.renovacoes.toArray();
  },

  async getById(id: string) {
    return db.renovacoes.get(id);
  },

  async create(data: Omit<Renovacao, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    return safeAddRenovacao(data);
  },

  async update(id: string, data: Partial<Renovacao>) {
    return safeUpdateRenovacao(id, data);
  },

  async delete(id: string) {
    return db.renovacoes.delete(id);
  }
};