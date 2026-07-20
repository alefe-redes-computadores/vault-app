"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
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

  const getMedico = useCallback((id: number) => {
    return db.medicos.get(id);
  }, []);

  const addMedico = useCallback(async (data: Omit<Medico, 'id' | 'created_at' | 'updated_at' | 'synced'>) => {
    const now = new Date().toISOString();
    const id = await db.medicos.add({
      ...data,
      created_at: now,
      updated_at: now,
      synced: false,
    });
    return id;
  }, []);

  const updateMedico = useCallback(async (id: number, data: Partial<Medico>) => {
    await db.medicos.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
      synced: false,
    });
  }, []);

  const deleteMedico = useCallback(async (id: number) => {
    await db.medicos.delete(id);
  }, []);

  return {
    medicos,
    getMedico,
    addMedico,
    updateMedico,
    deleteMedico,
  };
}