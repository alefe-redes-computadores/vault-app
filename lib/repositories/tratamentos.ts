// lib/repositories/tratamentos.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Tratamento } from "@/lib/types";

export const tratamentosRepository = {
  async getAll() {
    return db.tratamentos.toArray();
  },

  async getById(id: string) {
    return db.tratamentos.get(id);
  },

  async create(data: Omit<Tratamento, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string; user_id?: string; tratamento_ids?: string[] }) {
    if (process.env.NODE_ENV === "development" && "user_id" in data) {
      console.warn("[tratamentosRepository] user_id recebido do caller será ignorado — repositório injeta internamente.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }

    const now = new Date().toISOString();
    const tratamentoId = data.id || crypto.randomUUID();

    const { user_id: _, ...tratamentoData } = data;

    const tratamentoCompleto: Tratamento = {
      ...tratamentoData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
      id: tratamentoId,
    };

    await db.transaction("rw", [db.tratamentos, db.syncQueue], async () => {
      await db.tratamentos.add(tratamentoCompleto);
      await enfileirarOperacao("tratamentos", "add", tratamentoCompleto);
    });

    return tratamentoId;
  },

  async update(id: string, data: Partial<Tratamento> & { tratamento_ids?: string[] }) {
    if (data.tratamento_ids) {
      data.tratamento_ids = Array.from(new Set(data.tratamento_ids));
    }

    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.tratamentos, db.syncQueue], async () => {
      await db.tratamentos.update(id, payload);
      await enfileirarOperacao("tratamentos", "update", { id, ...payload });
    });

    return id;
  },

  async delete(id: string) {
    return this.deleteSafe(id);
  },

  async deleteSafe(id: string) {
    const now = new Date().toISOString();

    await db.transaction("rw", [db.tratamentos, db.medicamentos, db.exames, db.syncQueue], async () => {
      await db.tratamentos.delete(id);
      await enfileirarOperacao("tratamentos", "delete", { id });

      const medicamentosAfetados = await db.medicamentos
        .where('tratamento_ids')
        .equals(id)
        .toArray();

      for (const med of medicamentosAfetados) {
        if (med.id && med.tratamento_ids) {
          const novosIds = Array.from(new Set(med.tratamento_ids.filter(tId => tId !== id)));
          const updatedMed = { ...med, tratamento_ids: novosIds, updated_at: now, synced: false };
          await db.medicamentos.put(updatedMed);
          await enfileirarOperacao("medicamentos", "update", { id: med.id, tratamento_ids: novosIds });
        }
      }

      const examesAfetados = await db.exames
        .where('tratamento_ids')
        .equals(id)
        .toArray();

      for (const exame of examesAfetados) {
        if (exame.id && exame.tratamento_ids) {
          const novosIds = Array.from(new Set(exame.tratamento_ids.filter(tId => tId !== id)));
          const updatedExame = { ...exame, tratamento_ids: novosIds, updated_at: now, synced: false };
          await db.exames.put(updatedExame);
          await enfileirarOperacao("exames", "update", { id: exame.id, tratamento_ids: novosIds });
        }
      }
    });
  }
};
