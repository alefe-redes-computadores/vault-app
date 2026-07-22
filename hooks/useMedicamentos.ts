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

  const getMedicamento = useCallback((id: string) => { // ← string
    return db.medicamentos.get(id);
  }, []);

  const addMedicamento = useCallback(async (data: Omit<Medicamento, 'id' | 'created_at' | 'updated_at' | 'synced'>) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    await db.medicamentos.add({
      ...data,
      id,
      created_at: now,
      updated_at: now,
      synced: false,
    });
    return id;
  }, []);

  const updateMedicamento = useCallback(async (id: string, data: Partial<Medicamento>) => { // ← string
    await db.medicamentos.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
      synced: false,
    });
  }, []);

  const deleteMedicamento = useCallback(async (id: string) => { // ← string
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