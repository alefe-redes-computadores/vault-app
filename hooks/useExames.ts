"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { examesRepository } from "@/lib/repositories/exames";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Exame } from "@/lib/types";

export function useExames() {
  const { user } = useAuth();

  const exames = useLiveQuery(
    () => db.exames.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getExame = useCallback((id: string) => {
    return examesRepository.getById(id);
  }, []);

  const addExame = useCallback(
    async (data: Omit<Exame, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return examesRepository.create({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateExame = useCallback(async (id: string, data: Partial<Exame>) => {
    return examesRepository.update(id, data);
  }, []);

  const deleteExame = useCallback(async (id: string) => {
    return examesRepository.delete(id);
  }, []);

  return {
    exames,
    getExame,
    addExame,
    updateExame,
    deleteExame,
  };
}