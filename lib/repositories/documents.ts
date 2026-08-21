// lib/repositories/documents.ts
import { db, toggleFavorite } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Document } from "@/lib/types";

export const documentsRepository = {
  async getAll() {
    return db.documents.toArray();
  },

  async getById(id: string) {
    return db.documents.get(id);
  },

  async create(data: Omit<Document, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string; user_id?: string }) {
    if (process.env.NODE_ENV === "development" && "user_id" in data) {
      console.warn("[documentsRepository] user_id recebido do caller será ignorado — repositório injeta internamente.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const now = new Date().toISOString();
    const docId = data.id || crypto.randomUUID();

    const { user_id: _, ...docData } = data;

    const docCompleto: Document = {
      ...docData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
      id: docId,
    };

    await db.transaction("rw", [db.documents, db.syncQueue], async () => {
      await db.documents.add(docCompleto);
      await enfileirarOperacao("documents", "add", docCompleto);
    });

    return docId;
  },

  async update(id: string, data: Partial<Document>) {
    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.documents, db.syncQueue], async () => {
      await db.documents.update(id, payload);
      await enfileirarOperacao("documents", "update", { id, ...payload });
    });

    return id;
  },

  async delete(id: string) {
    await db.transaction("rw", [db.documents, db.syncQueue], async () => {
      await db.documents.delete(id);
      await enfileirarOperacao("documents", "delete", { id });
    });

    return id;
  },

  async favorite(id: string) {
    const now = new Date().toISOString();
    await toggleFavorite(id);
    const doc = await db.documents.get(id);
    if (doc) {
      await db.transaction("rw", [db.documents, db.syncQueue], async () => {
        await db.documents.update(id, { updated_at: now, synced: false });
        await enfileirarOperacao("documents", "update", { id, is_favorite: doc.is_favorite, updated_at: now });
      });
    }
    return id;
  },
};
