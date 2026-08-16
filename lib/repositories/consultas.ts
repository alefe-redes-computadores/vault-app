import { db, safeAddConsulta, safeUpdateConsulta, safeDeleteConsulta } from "@/lib/db";
import type { Consulta } from "@/lib/types";

export const consultasRepository = {
  async getAll() {
    return db.consultas.toArray();
  },

  async getById(id: string) {
    return db.consultas.get(id);
  },

  async create(data: Omit<Consulta, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    return safeAddConsulta(data);
  },

  async update(id: string, data: Partial<Consulta>) {
    return safeUpdateConsulta(id, data);
  },

  async delete(id: string) {
    return safeDeleteConsulta(id);
  }
};