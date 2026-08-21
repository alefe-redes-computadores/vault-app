// hooks/useLocais.ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { locaisRepository } from "@/lib/repositories/locais";
import { useAuth } from "./useAuth";
import { useActivePersonId } from "./useActivePersonId";
import { useCallback } from "react";
import type { LocalSaude } from "@/lib/types";

export function useLocais() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const locais = useLiveQuery(
    () => activePersonId ? db.locais.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId],
    []
  );

  const getLocal = useCallback((id: string) => locaisRepository.getById(id), []);
  
  const addLocal = useCallback(async (data: Omit<LocalSaude, 'id' | 'user_id' | 'person_id' | 'created_at' | 'updated_at' | 'synced'>) => {
    if (!user) throw new Error('Usuário não autenticado');
    return await locaisRepository.create({ 
      ...data, 
      user_id: user.id,
      person_id: activePersonId || undefined 
    });
  }, [user, activePersonId]);
  
  const updateLocal = useCallback(async (id: string, data: Partial<LocalSaude>) => {
    return await locaisRepository.update(id, data);
  }, []);
  
  const deleteLocal = useCallback(async (id: string) => await locaisRepository.delete(id), []);

  return { locais, getLocal, addLocal, updateLocal, deleteLocal };
}
