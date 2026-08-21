// lib/repositories/locais.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { LocalSaude } from "@/lib/types";

// Gerador de ID robusto com suporte total a ambientes mobile restritos
function generateSafeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const locaisRepository = {
  async getAll() {
    return db.locais.toArray();
  },

  async getById(id: string) {
    return db.locais.get(id);
  },

  async create(data: Omit<LocalSaude, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string; user_id?: string }) {
    if (process.env.NODE_ENV === "development" && "user_id" in data) {
      console.warn("[locaisRepository] user_id recebido do caller será ignorado — repositório injeta internamente.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const now = new Date().toISOString();
    
    // Garante um ID válido utilizando o gerador seguro com fallback
    const localId = data.id || generateSafeId();

    const { user_id: _, ...localData } = data;

    const localCompleto: LocalSaude = {
      ...localData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
      id: localId, // Posicionado explicitamente por último para blindar a chave primária
    };

    await db.transaction("rw", [db.locais, db.syncQueue], async () => {
      await db.locais.add(localCompleto);
      await enfileirarOperacao("locais", "add", localCompleto);
    });

    return localId;
  },

  async update(id: string, data: Partial<LocalSaude>) {
    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.locais, db.syncQueue], async () => {
      await db.locais.update(id, payload);
      await enfileirarOperacao("locais", "update", { id, ...payload });
    });

    return id;
  },

  async delete(id: string) {
    return this.deleteSafe(id);
  },

  async deleteSafe(id: string) {
    const now = new Date().toISOString();

    await db.transaction("rw", [db.locais, db.renovacoes, db.medicamentos, db.exames, db.consultas, db.cirurgias, db.syncQueue], async () => {
      await db.locais.delete(id);
      await enfileirarOperacao("locais", "delete", { id });

      const tables = [
        { table: db.renovacoes, field: 'local_id', name: 'renovacoes' },
        { table: db.medicamentos, field: 'local_id', name: 'medicamentos' },
        { table: db.exames, field: 'local_id', name: 'exames' },
        { table: db.consultas, field: 'local_id', name: 'consultas' },
        { table: db.cirurgias, field: 'local_id', name: 'cirurgias' },
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
