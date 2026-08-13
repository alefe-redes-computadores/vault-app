"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddLocal, safeUpdateLocal, safeDeleteLocal } from "@/lib/db";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { LocalSaude } from "@/lib/types"; // Supondo que você incluiu o LocalSaude no types.ts

export function useLocais() {
  const { user } = useAuth();

  const locais = useLiveQuery(
    () => db.table("locais").where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getLocal = useCallback((id: string) => {
    return db.table("locais").get(id);
  }, []);

  const addLocal = useCallback(
    async (data: Omit<LocalSaude, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return safeAddLocal({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateLocal = useCallback(async (id: string, data: Partial<LocalSaude>) => {
    return safeUpdateLocal(id, data);
  }, []);

  const deleteLocal = useCallback(async (id: string) => {
    return safeDeleteLocal(id);
  }, []);

  return {
    locais,
    getLocal,
    addLocal,
    updateLocal,
    deleteLocal,
  };
}
