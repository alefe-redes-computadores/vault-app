// lib/repositories/hospitais.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Hospital } from "@/lib/types";

export const hospitaisRepository = {
  async getAll() {
    return db.hospitais.toArray();
  },

  async getById(id: string) {
    return db.hospitais.get(id);
  },

  async create(data: Omit<Hospital, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string; user_id?: string }) {
    if (process.env.NODE_ENV === "development" && "user_id" in data) {
      console.warn("[hospitaisRepository] user_id recebido do caller será ignorado — repositório injeta internamente.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const now = new Date().toISOString();
    const hospitalId = data.id || crypto.randomUUID();

    const { user_id: _, ...hospitalData } = data;

    const hospitalCompleto: Hospital = {
      ...hospitalData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
      id: hospitalId,
    };

    await db.transaction("rw", [db.hospitais, db.syncQueue], async () => {
      await db.hospitais.add(hospitalCompleto);
      await enfileirarOperacao("hospitais", "add", hospitalCompleto);
    });

    return hospitalId;
  },

  async update(id: string, data: Partial<Hospital>) {
    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.hospitais, db.syncQueue], async () => {
      await db.hospitais.update(id, payload);
      await enfileirarOperacao("hospitais", "update", { id, ...payload });
    });

    return id;
  },

  async delete(id: string) {
    return this.deleteSafe(id);
  },

  async deleteSafe(id: string) {
    const now = new Date().toISOString();

    await db.transaction("rw", [db.hospitais, db.documents, db.consultas, db.cirurgias, db.medicamentos, db.renovacoes, db.syncQueue], async () => {
      await db.hospitais.delete(id);
      await enfileirarOperacao("hospitais", "delete", { id });

      const tables = [
        { table: db.documents, field: 'hospital_id', name: 'documents' },
        { table: db.consultas, field: 'hospital_id', name: 'consultas' },
        { table: db.cirurgias, field: 'hospital_id', name: 'cirurgias' },
        { table: db.medicamentos, field: 'hospital_id', name: 'medicamentos' },
        { table: db.renovacoes, field: 'hospital_id', name: 'renovacoes' },
      ];

      for (const t of tables) {
        const affected = await t.table.where(t.field).equals(id).toArray();
        for (const item of affected) {
          if (item.id) {
            const updatedItem: any = { ...item, [t.field]: undefined, updated_at: now, synced: false };
            await t.table.put(updatedItem);
            await enfileirarOperacao(t.name as any, "update", { id: item.id, [t.field]: undefined });
          }
        }
      }
    });
  },
};
