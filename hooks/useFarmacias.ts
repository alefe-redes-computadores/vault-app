"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import { Farmacia } from "@/lib/types";

export function useFarmacias() {
  const { user } = useAuth();

  const farmacias = useLiveQuery(
    () => db.farmacias.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getFarmacia = useCallback((id: number) => {
    return db.farmacias.get(id);
  }, []);

  const addFarmacia = useCallback(async (data: Omit<Farmacia, 'id' | 'created_at' | 'updated_at' | 'synced'>) => {
    const now = new Date().toISOString();
    const id = await db.farmacias.add({
      ...data,
      created_at: now,
      updated_at: now,
      synced: false,
    });
    return id;
  }, []);

  const updateFarmacia = useCallback(async (id: number, data: Partial<Farmacia>) => {
    await db.farmacias.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
      synced: false,
    });
  }, []);

  const deleteFarmacia = useCallback(async (id: number) => {
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