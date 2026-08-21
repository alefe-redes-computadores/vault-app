// lib/repositories/cirurgias.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Cirurgia } from "@/lib/types";

export const cirurgiasRepository = {
  async getAll() {
    return db.cirurgias.toArray();
  },

  async getById(id: string) {
    return db.cirurgias.get(id);
  },

  async create(data: Omit<Cirurgia, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string; user_id?: string }) {
    if (process.env.NODE_ENV === "development" && "user_id" in data) {
      console.warn("[cirurgiasRepository] user_id recebido do caller será ignorado — repositório injeta internamente.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const now = new Date().toISOString();
    const cirurgiaId = data.id || crypto.randomUUID();

    const { user_id: _, ...cirurgiaData } = data;

    const cirurgiaCompleta: Cirurgia = {
      ...cirurgiaData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
      id: cirurgiaId,
    };

    await db.transaction("rw", [db.cirurgias, db.syncQueue], async () => {
      await db.cirurgias.add(cirurgiaCompleta);
      await enfileirarOperacao("cirurgias", "add", cirurgiaCompleta);
    });

    return cirurgiaId;
  },

  async update(id: string, data: Partial<Cirurgia>) {
    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.cirurgias, db.syncQueue], async () => {
      await db.cirurgias.update(id, payload);
      await enfileirarOperacao("cirurgias", "update", { id, ...payload });
    });

    return id;
  },

  async delete(id: string) {
    await db.transaction("rw", [db.cirurgias, db.syncQueue], async () => {
      await db.cirurgias.delete(id);
      await enfileirarOperacao("cirurgias", "delete", { id });
    });

    return id;
  },
};
