// lib/repositories/medicos.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Medico } from "@/lib/types";

export const medicosRepository = {
  async getAll() {
    return db.medicos.toArray();
  },

  async getById(id: string) {
    return db.medicos.get(id);
  },

  async create(data: Omit<Medico, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string; user_id?: string }) {
    if (process.env.NODE_ENV === "development" && "user_id" in data) {
      console.warn("[medicosRepository] user_id recebido do caller será ignorado — repositório injeta internamente.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const now = new Date().toISOString();
    const medicoId = data.id || crypto.randomUUID();

    const { user_id: _, ...medicoData } = data;

    const medicoCompleto: Medico = {
      ...medicoData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
      id: medicoId,
    };

    await db.transaction("rw", [db.medicos, db.syncQueue], async () => {
      await db.medicos.add(medicoCompleto);
      await enfileirarOperacao("medicos", "add", medicoCompleto);
    });

    return medicoId;
  },

  async update(id: string, data: Partial<Medico>) {
    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.medicos, db.syncQueue], async () => {
      await db.medicos.update(id, payload);
      await enfileirarOperacao("medicos", "update", { id, ...payload });
    });

    return id;
  },

  async delete(id: string) {
    return this.deleteSafe(id);
  },

  async deleteSafe(id: string) {
    const now = new Date().toISOString();

    await db.transaction("rw", [db.medicos, db.medicamentos, db.consultas, db.cirurgias, db.syncQueue], async () => {
      await db.medicos.delete(id);
      await enfileirarOperacao("medicos", "delete", { id });

      const medicamentosAfetados = await db.medicamentos.where('medico_id').equals(id).toArray();
      for (const med of medicamentosAfetados) {
        if (med.id) {
          const updatedMed = { ...med, medico_id: undefined, updated_at: now, synced: false };
          await db.medicamentos.put(updatedMed);
          await enfileirarOperacao("medicamentos", "update", { id: med.id, medico_id: undefined });
        }
      }

      const consultasAfetadas = await db.consultas.where('medico_id').equals(id).toArray();
      for (const con of consultasAfetadas) {
        if (con.id) {
          const updatedCon = { ...con, medico_id: undefined, updated_at: now, synced: false };
          await db.consultas.put(updatedCon);
          await enfileirarOperacao("consultas", "update", { id: con.id, medico_id: undefined });
        }
      }

      const cirurgiasAfetadas = await db.cirurgias.where('medico_id').equals(id).toArray();
      for (const cir of cirurgiasAfetadas) {
        if (cir.id) {
          const updatedCir = { ...cir, medico_id: undefined, updated_at: now, synced: false };
          await db.cirurgias.put(updatedCir);
          await enfileirarOperacao("cirurgias", "update", { id: cir.id, medico_id: undefined });
        }
      }
    });
  },
};
