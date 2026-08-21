// lib/repositories/cids.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Cid } from "@/lib/types";

export const cidsRepository = {
  async getAll() {
    return db.cids.toArray();
  },

  async getById(id: string) {
    return db.cids.get(id);
  },

  async create(data: Omit<Cid, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string; user_id?: string }) {
    if (process.env.NODE_ENV === "development" && "user_id" in data) {
      console.warn("[cidsRepository] user_id recebido do caller será ignorado — repositório injeta internamente.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const now = new Date().toISOString();
    const cidId = data.id || crypto.randomUUID();

    const { user_id: _, ...cidData } = data;

    const cidCompleto: Cid = {
      ...cidData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
      id: cidId,
    };

    await db.transaction("rw", [db.cids, db.syncQueue], async () => {
      await db.cids.add(cidCompleto);
      await enfileirarOperacao("cids", "add", cidCompleto);
    });

    return cidId;
  },

  async update(id: string, data: Partial<Cid>) {
    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.cids, db.syncQueue], async () => {
      await db.cids.update(id, payload);
      await enfileirarOperacao("cids", "update", { id, ...payload });
    });

    return id;
  },

  async delete(id: string) {
    return this.deleteSafe(id);
  },

  async deleteSafe(id: string) {
    const now = new Date().toISOString();

    await db.transaction("rw", [db.cids, db.tratamentos, db.syncQueue], async () => {
      await db.cids.delete(id);
      await enfileirarOperacao("cids", "delete", { id });

      const tratamentosAfetados = await db.tratamentos.where('cid_ids').equals(id).toArray();

      for (const tratamento of tratamentosAfetados) {
        if (tratamento.id && tratamento.cid_ids) {
          const novosIds = Array.from(new Set(tratamento.cid_ids.filter(cidId => cidId !== id)));
          const updatedTratamento = { ...tratamento, cid_ids: novosIds, updated_at: now, synced: false };
          await db.tratamentos.put(updatedTratamento);
          await enfileirarOperacao("tratamentos", "update", { id: tratamento.id, cid_ids: novosIds });
        }
      }
    });
  },
};
