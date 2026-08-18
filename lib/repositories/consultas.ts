// lib/repositories/consultas.ts

import { db, safeAddConsulta, safeUpdateConsulta, safeDeleteConsulta } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Consulta } from "@/lib/types";

export const consultasRepository = {
  async getAll() {
    return db.consultas.toArray();
  },

  async getById(id: string) {
    return db.consultas.get(id);
  },

  async create(data: Omit<Consulta, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    const id = await safeAddConsulta(data);
    await enfileirarOperacao("consultas", "add", { id, ...data });
    return id;
  },

  async update(id: string, data: Partial<Consulta>) {
    await safeUpdateConsulta(id, data);
    await enfileirarOperacao("consultas", "update", { id, ...data });
    return id;
  },

  async delete(id: string) {
    await safeDeleteConsulta(id);
    await enfileirarOperacao("consultas", "delete", { id });
    return id;
  },
};