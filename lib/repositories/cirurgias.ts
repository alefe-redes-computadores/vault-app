// lib/repositories/cirurgias.ts

import { db, safeAddCirurgia, safeUpdateCirurgia, safeDeleteCirurgia } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Cirurgia } from "@/lib/types";

export const cirurgiasRepository = {
  async getAll() {
    return db.cirurgias.toArray();
  },

  async getById(id: string) {
    return db.cirurgias.get(id);
  },

  async create(data: Omit<Cirurgia, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    const id = await safeAddCirurgia(data);
    await enfileirarOperacao("cirurgias", "add", { id, ...data });
    return id;
  },

  async update(id: string, data: Partial<Cirurgia>) {
    await safeUpdateCirurgia(id, data);
    await enfileirarOperacao("cirurgias", "update", { id, ...data });
    return id;
  },

  async delete(id: string) {
    await safeDeleteCirurgia(id);
    await enfileirarOperacao("cirurgias", "delete", { id });
    return id;
  },
};