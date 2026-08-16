import { db, safeAddCirurgia, safeUpdateCirurgia, safeDeleteCirurgia } from "@/lib/db";
import type { Cirurgia } from "@/lib/types";

export const cirurgiasRepository = {
  async getAll() {
    return db.cirurgias.toArray();
  },

  async getById(id: string) {
    return db.cirurgias.get(id);
  },

  async create(data: Omit<Cirurgia, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    return safeAddCirurgia(data);
  },

  async update(id: string, data: Partial<Cirurgia>) {
    return safeUpdateCirurgia(id, data);
  },

  async delete(id: string) {
    return safeDeleteCirurgia(id);
  }
};