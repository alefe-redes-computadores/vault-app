// hooks/useHospitais.ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { hospitaisRepository } from "@/lib/repositories/hospitais";
import { useAuth } from "./useAuth";
import { useActivePersonId } from "./useActivePersonId";
import { useCallback } from "react";
import type { Hospital } from "@/lib/types";

export function useHospitais() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const hospitais = useLiveQuery(
    () => activePersonId ? db.hospitais.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId],
    []
  );

  const getHospital = useCallback((id: string) => hospitaisRepository.getById(id), []);
  
  const addHospital = useCallback(async (data: Omit<Hospital, 'id' | 'user_id' | 'person_id' | 'created_at' | 'updated_at' | 'synced'>) => {
    if (!user) throw new Error('Usuário não autenticado');
    return await hospitaisRepository.create({ 
      ...data, 
      user_id: user.id,
      person_id: activePersonId || undefined 
    });
  }, [user, activePersonId]);
  
  const updateHospital = useCallback(async (id: string, data: Partial<Hospital>) => {
    return await hospitaisRepository.update(id, data);
  }, []);
  
  const deleteHospital = useCallback(async (id: string) => await hospitaisRepository.delete(id), []);
  const deleteHospitalSafe = useCallback(async (id: string) => await hospitaisRepository.deleteSafe(id), []);

  return { hospitais, getHospital, addHospital, updateHospital, deleteHospital, deleteHospitalSafe };
}
