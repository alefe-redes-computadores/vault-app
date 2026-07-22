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

  const getMedico = useCallback((id: string) => { // ← string
    return db.medicos.get(id);
  }, []);

  const addMedico = useCallback(async (data: Omit<Medico, 'id' | 'created_at' | 'updated_at' | 'synced'>) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    await db.medicos.add({
      ...data,
      id,
      created_at: now,
      updated_at: now,
      synced: false,
    });
    return id;
  }, []);

  const updateMedico = useCallback(async (id: string, data: Partial<Medico>) => { // ← string
    await db.medicos.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
      synced: false,
    });
  }, []);

  const deleteMedico = useCallback(async (id: string) => { // ← string
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