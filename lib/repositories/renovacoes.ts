// lib/repositories/renovacoes.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Renovacao } from "@/lib/types";

export const renovacoesRepository = {
  async getAll() {
    return db.renovacoes.toArray();
  },

  async getById(id: string) {
    return db.renovacoes.get(id);
  },

  async create(data: Omit<Renovacao, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string; user_id?: string }) {
    if (process.env.NODE_ENV === "development" && "user_id" in data) {
      console.warn("[renovacoesRepository] user_id recebido do caller será ignorado — repositório injeta internamente.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const now = new Date().toISOString();
    const renovacaoId = data.id || crypto.randomUUID();

    const { user_id: _, ...renovacaoData } = data;

    const renovacaoCompleta: Renovacao = {
      ...renovacaoData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
      id: renovacaoId,
    };

    await db.transaction("rw", [db.renovacoes, db.syncQueue], async () => {
      await db.renovacoes.add(renovacaoCompleta);
      await enfileirarOperacao("renovacoes", "add", renovacaoCompleta);
    });

    return renovacaoId;
  },

  async update(id: string, data: Partial<Renovacao>) {
    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.renovacoes, db.syncQueue], async () => {
      await db.renovacoes.update(id, payload);
      await enfileirarOperacao("renovacoes", "update", { id, ...payload });
    });

    return id;
  },

  async delete(id: string) {
    await db.transaction("rw", [db.renovacoes, db.syncQueue], async () => {
      await db.renovacoes.delete(id);
      await enfileirarOperacao("renovacoes", "delete", { id });
    });

    return id;
  },
};
