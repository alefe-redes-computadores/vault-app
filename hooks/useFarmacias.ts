"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Farmacia } from "@/lib/types";

export function useFarmacias() {
  const { user } = useAuth();

  const farmacias = useLiveQuery(
    () => db.farmacias.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getFarmacia = useCallback((id: string) => { // ← string
    return db.farmacias.get(id);
  }, []);

  const addFarmacia = useCallback(async (data: Omit<Farmacia, 'id' | 'created_at' | 'updated_at' | 'synced'>) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    await db.farmacias.add({
      ...data,
      id,
      created_at: now,
      updated_at: now,
      synced: false,
    });
    return id;
  }, []);

  const updateFarmacia = useCallback(async (id: string, data: Partial<Farmacia>) => { // ← string
    await db.farmacias.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
      synced: false,
    });
  }, []);

  const deleteFarmacia = useCallback(async (id: string) => { // ← string
    await db.farmacias.delete(id);
  }, []);

  return {
    farmacias,
    getFarmacia,
    addFarmacia,
    updateFarmacia,
    deleteFarmacia,
  };
}