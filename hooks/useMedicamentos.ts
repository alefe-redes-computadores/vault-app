"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
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

  const getMedicamento = useCallback((id: number) => {
    return db.medicamentos.get(id);
  }, []);

  const addMedicamento = useCallback(async (data: Omit<Medicamento, 'id' | 'created_at' | 'updated_at' | 'synced'>) => {
    const now = new Date().toISOString();
    const id = await db.medicamentos.add({
      ...data,
      created_at: now,
      updated_at: now,
      synced: false,
    });
    return id;
  }, []);

  const updateMedicamento = useCallback(async (id: number, data: Partial<Medicamento>) => {
    await db.medicamentos.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
      synced: false,
    });
  }, []);

  const deleteMedicamento = useCallback(async (id: number) => {
    await db.medicamentos.delete(id);
  }, []);

  return {
    medicamentos,
    getMedicamento,
    addMedicamento,
    updateMedicamento,
    deleteMedicamento,
  };
}