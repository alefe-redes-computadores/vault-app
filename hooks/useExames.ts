// hooks/useExames.ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { examesRepository } from "@/lib/repositories/exames";
import { useAuth } from "./useAuth";
import { useActivePersonId } from "./useActivePersonId";
import { useCallback } from "react";
import type { Exame } from "@/lib/types";

export function useExames() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const exames = useLiveQuery(
    () => activePersonId ? db.exames.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId],
    []
  );

  const getExame = useCallback((id: string) => examesRepository.getById(id), []);

  const addExame = useCallback(async (data: Omit<Exame, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
    return await examesRepository.create({ ...data, user_id: user?.id });
  }, [user]);

  const updateExame = useCallback(async (id: string, data: Partial<Exame>) => {
    return await examesRepository.update(id, data);
  }, []);

  const deleteExame = useCallback(async (id: string) => {
    return await examesRepository.delete(id);
  }, []);

  return { exames, getExame, addExame, updateExame, deleteExame };
}