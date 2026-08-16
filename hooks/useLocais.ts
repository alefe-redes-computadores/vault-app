"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { locaisRepository } from "@/lib/repositories/locais";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { LocalSaude } from "@/lib/types";

export function useLocais() {
  const { user } = useAuth();

  // ✅ CORRIGIDO: db.locais em vez de db.table("locais")
  const locais = useLiveQuery(
    () => db.locais.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getLocal = useCallback((id: string) => {
    return locaisRepository.getById(id);
  }, []);

  const addLocal = useCallback(
    async (data: Omit<LocalSaude, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return locaisRepository.create({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateLocal = useCallback(async (id: string, data: Partial<LocalSaude>) => {
    return locaisRepository.update(id, data);
  }, []);

  const deleteLocal = useCallback(async (id: string) => {
    return locaisRepository.delete(id);
  }, []);

  return {
    locais,
    getLocal,
    addLocal,
    updateLocal,
    deleteLocal,
  };
}