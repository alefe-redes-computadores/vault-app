// hooks/useFarmacias.ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { farmaciasRepository } from "@/lib/repositories/farmacias";
import { useAuth } from "./useAuth";
import { useActivePersonId } from "./useActivePersonId";
import { useCallback } from "react";
import type { Farmacia } from "@/lib/types";

export function useFarmacias() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const farmacias = useLiveQuery(
    () => activePersonId ? db.farmacias.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId],
    []
  );

  const getFarmacia = useCallback((id: string) => farmaciasRepository.getById(id), []);
  
  const addFarmacia = useCallback(async (data: Omit<Farmacia, 'id' | 'user_id' | 'person_id' | 'created_at' | 'updated_at' | 'synced'>) => {
    if (!user) throw new Error('Usuário não autenticado');
    return await farmaciasRepository.create({ 
      ...data, 
      user_id: user.id,
      person_id: activePersonId || undefined 
    });
  }, [user, activePersonId]);
  
  const updateFarmacia = useCallback(async (id: string, data: Partial<Farmacia>) => {
    return await farmaciasRepository.update(id, data);
  }, []);
  
  const deleteFarmacia = useCallback(async (id: string) => await farmaciasRepository.delete(id), []);
  const deleteFarmaciaSafe = useCallback(async (id: string) => await farmaciasRepository.deleteSafe(id), []);

  return { farmacias, getFarmacia, addFarmacia, updateFarmacia, deleteFarmacia, deleteFarmaciaSafe };
}
