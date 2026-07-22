"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Hospital } from "@/lib/types";

export function useHospitais() {
  const { user } = useAuth();

  const hospitais = useLiveQuery(
    () => db.hospitais.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getHospital = useCallback((id: string) => { // ← string
    return db.hospitais.get(id);
  }, []);

  const addHospital = useCallback(async (data: Omit<Hospital, 'id' | 'created_at' | 'updated_at' | 'synced'>) => {
    const now = new Date().toISOString();
    // O ID é gerado pela função safeAddHospital (que usa UUID)
    // Esta função será substituída para usar safeAddHospital em vez de db.hospitais.add diretamente
    // Mas como o hook atual ainda usa add direto, vou manter com string
    const id = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    await db.hospitais.add({
      ...data,
      id,
      created_at: now,
      updated_at: now,
      synced: false,
    });
    return id;
  }, []);

  const updateHospital = useCallback(async (id: string, data: Partial<Hospital>) => { // ← string
    await db.hospitais.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
      synced: false,
    });
  }, []);

  const deleteHospital = useCallback(async (id: string) => { // ← string
    await db.hospitais.delete(id);
  }, []);

  return {
    hospitais,
    getHospital,
    addHospital,
    updateHospital,
    deleteHospital,
  };
}