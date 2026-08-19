// hooks/useMedicamentos.ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { medicamentosRepository } from "@/lib/repositories/medicamentos";
import { useAuth } from "./useAuth";
import { useActivePersonId } from "./useActivePersonId";
import { useCallback } from "react";
import type { Medicamento } from "@/lib/types";

export function useMedicamentos() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const medicamentos = useLiveQuery(
    () => {
      if (!activePersonId) return [];
      return db.medicamentos
        .where('person_id')
        .equals(activePersonId)
        .toArray();
    },
    [activePersonId],
    []
  );

  const getMedicamento = useCallback((id: string) => {
    return medicamentosRepository.getById(id);
  }, []);

  const addMedicamento = useCallback(
    async (data: Omit<Medicamento, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return medicamentosRepository.create({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateMedicamento = useCallback(
    async (id: string, data: Partial<Medicamento>) => {
      return medicamentosRepository.update(id, data);
    },
    []
  );

  const deleteMedicamento = useCallback(async (id: string) => {
    return medicamentosRepository.delete(id);
  }, []);

  return {
    medicamentos,
    getMedicamento,
    addMedicamento,
    updateMedicamento,
    deleteMedicamento,
  };
}