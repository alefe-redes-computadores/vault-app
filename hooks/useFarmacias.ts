"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddFarmacia, safeUpdateFarmacia, safeDeleteFarmacia } from "@/lib/db";
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

  const getFarmacia = useCallback((id: string) => {
    return db.farmacias.get(id);
  }, []);

  const addFarmacia = useCallback(
    async (data: Omit<Farmacia, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return safeAddFarmacia({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateFarmacia = useCallback(async (id: string, data: Partial<Farmacia>) => {
    return safeUpdateFarmacia(id, data);
  }, []);

  const deleteFarmacia = useCallback(async (id: string) => {
    return safeDeleteFarmacia(id);
  }, []);

  return {
    farmacias,
    getFarmacia,
    addFarmacia,
    updateFarmacia,
    deleteFarmacia,
  };
}
