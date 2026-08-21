// lib/repositories/exames.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Exame } from "@/lib/types";

export const examesRepository = {
  async getAll() {
    return db.exames.toArray();
  },

  async getById(id: string) {
    return db.exames.get(id);
  },

  async create(data: Omit<Exame, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string; user_id?: string; tratamento_ids?: string[] }) {
    if (process.env.NODE_ENV === "development" && "user_id" in data) {
      console.warn("[examesRepository] user_id recebido do caller será ignorado — repositório injeta internamente.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }

    const now = new Date().toISOString();
    const exameId = data.id || crypto.randomUUID();

    const { user_id: _, ...exameData } = data;

    const exameCompleto: Exame = {
      ...exameData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
      id: exameId,
    };

    await db.transaction("rw", [db.exames, db.syncQueue], async () => {
      await db.exames.add(exameCompleto);
      await enfileirarOperacao("exames", "add", exameCompleto);
    });

    return exameId;
  },

  async update(id: string, data: Partial<Exame>) {
    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }

    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.exames, db.syncQueue], async () => {
      await db.exames.update(id, payload);
      await enfileirarOperacao("exames", "update", { id, ...payload });
    });

    return id;
  },

  async delete(id: string) {
    await db.transaction("rw", [db.exames, db.syncQueue], async () => {
      await db.exames.delete(id);
      await enfileirarOperacao("exames", "delete", { id });
    });

    return id;
  },
};
