// lib/repositories/documents.ts

import { db, safeAddDocument, safeUpdateDocument, safeDeleteDocument, toggleFavorite } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Document } from "@/lib/types";

export const documentsRepository = {
  async getAll() {
    return db.documents.toArray();
  },

  async getById(id: string) {
    return db.documents.get(id);
  },

  async create(data: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    const id = await safeAddDocument(data);
    await enfileirarOperacao("documents", "add", { id, ...data });
    return id;
  },

  async update(id: string, data: Partial<Document>) {
    await safeUpdateDocument(id, data);
    await enfileirarOperacao("documents", "update", { id, ...data });
    return id;
  },

  async delete(id: string) {
    await safeDeleteDocument(id);
    await enfileirarOperacao("documents", "delete", { id });
    return id;
  },

  async favorite(id: string) {
    await toggleFavorite(id);
    const doc = await db.documents.get(id);
    if (doc) {
      await enfileirarOperacao("documents", "update", { id, is_favorite: doc.is_favorite });
    }
    return id;
  },
};