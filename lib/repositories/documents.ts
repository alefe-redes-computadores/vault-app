// lib/repositories/documents.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import { deleteFile } from "@/lib/supabase/storage";
import type { Document } from "@/lib/types";

export const documentsRepository = {
  /* ==========================================================
     LEITURA
     ========================================================== */

  async getAll() {
    return db.documents.toArray();
  },

  async getById(id: string) {
    return db.documents.get(id);
  },

  /* ==========================================================
     CRIAÇÃO
     ========================================================== */

  async create(
    data: Omit<
      Document,
      "id" | "user_id" | "created_at" | "updated_at" | "synced"
    > & {
      id?: string;
      user_id?: string;
    }
  ) {
    if (
      process.env.NODE_ENV === "development" &&
      "user_id" in data
    ) {
      console.warn(
        "[documentsRepository] user_id recebido do caller será ignorado — repositório injeta internamente."
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const now = new Date().toISOString();
    const docId = data.id || crypto.randomUUID();

    const { user_id: _ignoredUserId, ...docData } = data;

    const docCompleto: Document = {
      ...docData,
      id: docId,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
    };

    await db.transaction(
      "rw",
      [db.documents, db.syncQueue],
      async () => {
        await db.documents.add(docCompleto);

        await enfileirarOperacao(
          "documents",
          "add",
          docCompleto
        );
      }
    );

    return docId;
  },

  /* ==========================================================
     ATUALIZAÇÃO
     ========================================================== */

  async update(
    id: string,
    data: Partial<Document>
  ) {
    const existing = await db.documents.get(id);

    if (!existing) {
      throw new Error("Documento não encontrado");
    }

    const now = new Date().toISOString();

    const payload: Partial<Document> = {
      ...data,
      updated_at: now,
      synced: false,
    };

    await db.transaction(
      "rw",
      [db.documents, db.syncQueue],
      async () => {
        await db.documents.update(id, payload);

        await enfileirarOperacao(
          "documents",
          "update",
          {
            id,
            ...payload,
          }
        );
      }
    );

    return id;
  },

  /* ==========================================================
     EXCLUSÃO

     1. Obtém o documento.
     2. Tenta limpar seus arquivos físicos do Storage.
     3. Remove o registro local.
     4. Enfileira a exclusão para sincronização.

     Falha na limpeza de um arquivo não impede a exclusão do
     registro, preservando o comportamento anterior do Vault.
     ========================================================== */

  async delete(id: string) {
    const document = await db.documents.get(id);

    if (!document) {
      throw new Error("Documento não encontrado");
    }

    if (
      document.attachments &&
      document.attachments.length > 0
    ) {
      for (const attachment of document.attachments) {
        if (
          !attachment.url ||
          attachment.url.startsWith("blob:")
        ) {
          continue;
        }

        try {
          await deleteFile(attachment.url);
        } catch (error) {
          console.error(
            "[documentsRepository] Erro ao excluir arquivo do Storage:",
            attachment.url,
            error
          );
        }
      }
    }

    await db.transaction(
      "rw",
      [db.documents, db.syncQueue],
      async () => {
        await db.documents.delete(id);

        await enfileirarOperacao(
          "documents",
          "delete",
          { id }
        );
      }
    );

    return id;
  },

  /* ==========================================================
     FAVORITO
     ========================================================== */

  async favorite(id: string) {
    const document = await db.documents.get(id);

    if (!document) {
      throw new Error("Documento não encontrado");
    }

    const now = new Date().toISOString();
    const isFavorite = !document.is_favorite;

    const payload: Partial<Document> = {
      is_favorite: isFavorite,
      updated_at: now,
      synced: false,
    };

    await db.transaction(
      "rw",
      [db.documents, db.syncQueue],
      async () => {
        await db.documents.update(id, payload);

        await enfileirarOperacao(
          "documents",
          "update",
          {
            id,
            ...payload,
          }
        );
      }
    );

    return id;
  },
};