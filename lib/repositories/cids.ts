// lib/repositories/cids.ts
import { db, safeAddCid, safeUpdateCid, safeDeleteCid, safeUpdateTratamento } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from '@/lib/supabase/client';
import type { Cid } from "@/lib/types";

export const cidsRepository = {
  async getAll() {
    return db.cids.toArray();
  },

  async getById(id: string) {
    return db.cids.get(id);
  },

  async create(data: Omit<Cid, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const id = await safeAddCid({
      ...data,
      user_id: user.id,
    });
    await enfileirarOperacao("cids", "add", { id, ...data, user_id: user.id });
    return id;
  },

  async update(id: string, data: Partial<Cid>) {
    await safeUpdateCid(id, data);
    await enfileirarOperacao("cids", "update", { id, ...data });
    return id;
  },

  async delete(id: string) {
    return this.deleteSafe(id);
  },

  async deleteSafe(id: string) {
    await safeDeleteCid(id);
    await enfileirarOperacao("cids", "delete", { id });

    const tratamentosAfetados = await db.tratamentos.where('cid_ids').equals(id).toArray();

    for (const tratamento of tratamentosAfetados) {
      if (tratamento.id && tratamento.cid_ids) {
        const novosIds = Array.from(new Set(tratamento.cid_ids.filter(cidId => cidId !== id)));
        await safeUpdateTratamento(tratamento.id, { cid_ids: novosIds });
        await enfileirarOperacao("tratamentos", "update", { id: tratamento.id, cid_ids: novosIds });
      }
    }
  },
};