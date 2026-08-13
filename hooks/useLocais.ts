"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { SyncQueueItem } from "@/lib/types";

export interface LocalSaude {
  id?: string;
  user_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  tipo?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export function useLocais() {
  const { user } = useAuth();

  const locais = useLiveQuery(
    () => {
      if (!user?.id) return [];
      return db.table("locais").where("user_id").equals(user.id).toArray();
    },
    [user?.id],
    []
  );

  const getLocal = useCallback(async (id: string) => {
    return await db.table("locais").get(id);
  }, []);

  const addLocal = useCallback(
    async (data: Omit<LocalSaude, "id" | "user_id" | "created_at" | "updated_at" | "synced">) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const now = new Date().toISOString();
      const novoLocal: LocalSaude = {
        ...data,
        id: crypto.randomUUID(),
        user_id: user.id,
        created_at: now,
        updated_at: now,
        synced: false,
      };

      await db.table("locais").add(novoLocal);

      const syncItem: SyncQueueItem = {
        id: crypto.randomUUID(),
        table: "hospitais" as any, 
        operation: "add",
        payload: novoLocal as any,
        created_at: now,
      };
      await db.syncQueue.add(syncItem);

      return novoLocal;
    },
    [user]
  );

  const updateLocal = useCallback(
    async (id: string, data: Partial<LocalSaude>) => {
      const now = new Date().toISOString();
      const atualizacao = { ...data, updated_at: now, synced: false };

      await db.table("locais").update(id, atualizacao);

      const localAtualizado = await db.table("locais").get(id);
      if (localAtualizado) {
        const syncItem: SyncQueueItem = {
          id: crypto.randomUUID(),
          table: "hospitais" as any,
          operation: "update",
          payload: localAtualizado as any,
          created_at: now,
        };
        await db.syncQueue.add(syncItem);
      }
    },
    []
  );

  const deleteLocal = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    await db.table("locais").delete(id);

    const syncItem: SyncQueueItem = {
      id: crypto.randomUUID(),
      table: "hospitais" as any,
      operation: "delete",
      payload: { id },
      created_at: now,
    };
    await db.syncQueue.add(syncItem);
  }, []);

  return {
    locais,
    getLocal,
    addLocal,
    updateLocal,
    deleteLocal,
  };
}
