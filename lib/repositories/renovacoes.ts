// lib/repositories/renovacoes.ts

import { db, safeAddRenovacao, safeUpdateRenovacao } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Renovacao } from "@/lib/types";

export const renovacoesRepository = {
  async getAll() {
    return db.renovacoes.toArray();
  },

  async getById(id: string) {
    return db.renovacoes.get(id);
  },

  async create(data: Omit<Renovacao, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    const id = await safeAddRenovacao(data);
    await enfileirarOperacao("renovacoes", "add", { id, ...data });
    return id;
  },

  async update(id: string, data: Partial<Renovacao>) {
    await safeUpdateRenovacao(id, data);
    await enfileirarOperacao("renovacoes", "update", { id, ...data });
    return id;
  },

  async delete(id: string) {
    await db.renovacoes.delete(id);
    await enfileirarOperacao("renovacoes", "delete", { id });
    return id;
  },
};