// lib/repositories/farmacias.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Farmacia } from "@/lib/types";

export const farmaciasRepository = {
  async getAll() {
    return db.farmacias.toArray();
  },

  async getById(id: string) {
    return db.farmacias.get(id);
  },

  async create(data: Omit<Farmacia, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string; user_id?: string }) {
    if (process.env.NODE_ENV === "development" && "user_id" in data) {
      console.warn("[farmaciasRepository] user_id recebido do caller será ignorado — repositório injeta internamente.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const now = new Date().toISOString();
    const farmaciaId = data.id || crypto.randomUUID();

    const { user_id: _, ...farmaciaData } = data;

    const farmaciaCompleta: Farmacia = {
      ...farmaciaData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
      id: farmaciaId,
    };

    await db.transaction("rw", [db.farmacias, db.syncQueue], async () => {
      await db.farmacias.add(farmaciaCompleta);
      await enfileirarOperacao("farmacias", "add", farmaciaCompleta);
    });

    return farmaciaId;
  },

  async update(id: string, data: Partial<Farmacia>) {
    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.farmacias, db.syncQueue], async () => {
      await db.farmacias.update(id, payload);
      await enfileirarOperacao("farmacias", "update", { id, ...payload });
    });

    return id;
  },

  async delete(id: string) {
    return this.deleteSafe(id);
  },

  async deleteSafe(id: string) {
    const now = new Date().toISOString();

    await db.transaction("rw", [db.farmacias, db.medicamentos, db.renovacoes, db.syncQueue], async () => {
      await db.farmacias.delete(id);
      await enfileirarOperacao("farmacias", "delete", { id });

      const medicamentosAfetados = await db.medicamentos.where('farmacia_id').equals(id).toArray();
      for (const med of medicamentosAfetados) {
        if (med.id) {
          const updatedMed = { ...med, farmacia_id: undefined, updated_at: now, synced: false };
          await db.medicamentos.put(updatedMed);
          await enfileirarOperacao("medicamentos", "update", { id: med.id, farmacia_id: undefined });
        }
      }

      const renovacoesAfetadas = await db.renovacoes.where('farmacia_id').equals(id).toArray();
      for (const ren of renovacoesAfetadas) {
        if (ren.id) {
          const updatedRen = { ...ren, farmacia_id: undefined, updated_at: now, synced: false };
          await db.renovacoes.put(updatedRen);
          await enfileirarOperacao("renovacoes", "update", { id: ren.id, farmacia_id: undefined });
        }
      }
    });
  },
};
