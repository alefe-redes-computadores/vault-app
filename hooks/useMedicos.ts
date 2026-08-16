"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { medicosRepository } from "@/lib/repositories/medicos";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Medico } from "@/lib/types";

export function useMedicos() {
  const { user } = useAuth();

  const medicos = useLiveQuery(
    () => db.medicos.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getMedico = useCallback((id: string) => {
    return medicosRepository.getById(id);
  }, []);

  const addMedico = useCallback(
    async (data: Omit<Medico, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return medicosRepository.create({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateMedico = useCallback(async (id: string, data: Partial<Medico>) => {
    return medicosRepository.update(id, data);
  }, []);

  const deleteMedico = useCallback(async (id: string) => {
    return medicosRepository.delete(id);
  }, []);

  // ✅ Versão com cascade delete (limpa referências em medicamentos, consultas, cirurgias)
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