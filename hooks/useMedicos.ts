// hooks/useMedicos.ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { medicosRepository } from "@/lib/repositories/medicos";
import { useAuth } from "./useAuth";
import { useActivePersonId } from "./useActivePersonId";
import { useCallback } from "react";
import type { Medico } from "@/lib/types";

export function useMedicos() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const medicos = useLiveQuery(
    () => activePersonId ? db.medicos.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId],
    []
  );

  const getMedico = useCallback((id: string) => {
    return medicosRepository.getById(id);
  }, []);

  const addMedico = useCallback(
    async (data: Omit<Medico, 'id' | 'user_id' | 'person_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      if (!user) throw new Error('Usuário não autenticado');
      return medicosRepository.create({ 
        ...data, 
        user_id: user.id,
        person_id: activePersonId || undefined 
      });
    },
    [user, activePersonId]
  );

  const updateMedico = useCallback(async (id: string, data: Partial<Medico>) => {
    return medicosRepository.update(id, data);
  }, []);

  const deleteMedico = useCallback(async (id: string) => {
    return medicosRepository.delete(id);
  }, []);

  const deleteMedicoSafe = useCallback(async (id: string) => {
    return medicosRepository.deleteSafe(id);
  }, []);

  return {
    medicos,
    getMedico,
    addMedico,
    updateMedico,
    deleteMedico,
    deleteMedicoSafe,
  };
}
