// lib/repositories/registrosSaude.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { RegistroSaude } from "@/lib/types";

export const registrosSaudeRepository = {
  async create(data: Omit<RegistroSaude, "id" | "created_at" | "updated_at" | "synced">) {
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    const now = new Date().toISOString();

    const novoRegistro: RegistroSaude = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
      synced: false,
    };

    // 1. Grava no Dexie local
    await db.registros_saude.add(novoRegistro);

    // 2. Enfileira a operação para sincronizar com o Supabase
    await enfileirarOperacao("registros_saude" as any, "add", novoRegistro as any);

    // 3. Dispara o gatilho de sync em segundo plano
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sync:process"));
    }

    return id;
  },

  async update(id: string, changes: Partial<RegistroSaude>) {
    const now = new Date().toISOString();
    const payload = { ...changes, updated_at: now, synced: false };

    // 1. Atualiza localmente
    await db.registros_saude.update(id, payload);

    // 2. Busca o objeto completo atualizado para mandar na fila
    const atualizado = await db.registros_saude.get(id);
    if (atualizado) {
      await enfileirarOperacao("registros_saude" as any, "update", atualizado as any);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sync:process"));
    }
  },

  async delete(id: string) {
    // 1. Remove localmente
    await db.registros_saude.delete(id);

    // 2. Enfileira a exclusão
    await enfileirarOperacao("registros_saude" as any, "delete", { id } as any);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sync:process"));
    }
  }
};
