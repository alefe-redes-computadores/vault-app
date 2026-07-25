"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddMedicamento, safeUpdateMedicamento, safeDeleteMedicamento } from "@/lib/db";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Medicamento } from "@/lib/types";

export function useMedicamentos() {
  const { user } = useAuth();

  const medicamentos = useLiveQuery(
    () => db.medicamentos.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getMedicamento = useCallback((id: string) => {
    return db.medicamentos.get(id);
  }, []);

  const addMedicamento = useCallback(
    async (data: Omit<Medicamento, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return safeAddMedicamento({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateMedicamento = useCallback(async (id: string, data: Partial<Medicamento>) => {
    return safeUpdateMedicamento(id, data);
  }, []);

  const deleteMedicamento = useCallback(async (id: string) => {
    return safeDeleteMedicamento(id);
  }, []);

  return {
    medicamentos,
    getMedicamento,
    addMedicamento,
    updateMedicamento,
    deleteMedicamento,
  };
}
