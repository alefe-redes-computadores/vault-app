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
    () => activePersonId ? db.medicamentos.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId],
    []
  );

  const getMedicamento = useCallback((id: string) => medicamentosRepository.getById(id), []);

  const addMedicamento = useCallback(async (data: Omit<Medicamento, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
    if (!user) throw new Error('Usuário não autenticado');
    return await medicamentosRepository.create({ ...data, user_id: user.id });
  }, [user]);

  const updateMedicamento = useCallback(async (id: string, data: Partial<Medicamento>) => {
    return await medicamentosRepository.update(id, data);
  }, []);

  const deleteMedicamento = useCallback(async (id: string) => {
    return await medicamentosRepository.delete(id);
  }, []);

  return { medicamentos, getMedicamento, addMedicamento, updateMedicamento, deleteMedicamento };
}