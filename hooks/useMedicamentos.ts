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
      const result = await medicamentosRepository.create({ ...data, user_id: user?.id || "" });
      // Dispara a sincronização imediatamente após adicionar
      if (typeof window !== "undefined") window.dispatchEvent(new Event("sync:process"));
      return result;
    },
    [user]
  );

  const updateMedicamento = useCallback(
    async (id: string, data: Partial<Medicamento>) => {
      const result = await medicamentosRepository.update(id, data);
      // Dispara a sincronização imediatamente após atualizar
      if (typeof window !== "undefined") window.dispatchEvent(new Event("sync:process"));
      return result;
    },
    []
  );

  const deleteMedicamento = useCallback(async (id: string) => {
    const result = await medicamentosRepository.delete(id);
    // Dispara a sincronização imediatamente após deletar
    if (typeof window !== "undefined") window.dispatchEvent(new Event("sync:process"));
    return result;
  }, []);

  return {
    medicamentos,
    getMedicamento,
    addMedicamento,
    updateMedicamento,
    deleteMedicamento,
  };
}
