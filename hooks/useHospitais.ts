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

  const getHospital = useCallback((id: number) => {
    return db.hospitais.get(id);
  }, []);

  const addHospital = useCallback(async (data: Omit<Hospital, 'id' | 'created_at' | 'updated_at' | 'synced'>) => {
    const now = new Date().toISOString();
    const id = await db.hospitais.add({
      ...data,
      created_at: now,
      updated_at: now,
      synced: false,
    });
    return id;
  }, []);

  const updateHospital = useCallback(async (id: number, data: Partial<Hospital>) => {
    await db.hospitais.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
      synced: false,
    });
  }, []);

  const deleteHospital = useCallback(async (id: number) => {
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