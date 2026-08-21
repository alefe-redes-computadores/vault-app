// lib/repositories/consultas.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Consulta } from "@/lib/types";

export const consultasRepository = {
  async getAll() {
    return db.consultas.toArray();
  },

  async getById(id: string) {
    return db.consultas.get(id);
  },

  async create(data: Omit<Consulta, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string; user_id?: string }) {
    if (process.env.NODE_ENV === "development" && "user_id" in data) {
      console.warn("[consultasRepository] user_id recebido do caller será ignorado — repositório injeta internamente.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const now = new Date().toISOString();
    const consultaId = data.id || crypto.randomUUID();

    const { user_id: _, ...consultaData } = data;

    const consultaCompleta: Consulta = {
      ...consultaData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
      id: consultaId,
    };

    await db.transaction("rw", [db.consultas, db.syncQueue], async () => {
      await db.consultas.add(consultaCompleta);
      await enfileirarOperacao("consultas", "add", consultaCompleta);
    });

    return consultaId;
  },

  async update(id: string, data: Partial<Consulta>) {
    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.consultas, db.syncQueue], async () => {
      await db.consultas.update(id, payload);
      await enfileirarOperacao("consultas", "update", { id, ...payload });
    });

    return id;
  },

  async delete(id: string) {
    await db.transaction("rw", [db.consultas, db.syncQueue], async () => {
      await db.consultas.delete(id);
      await enfileirarOperacao("consultas", "delete", { id });
    });

    return id;
  },
};
