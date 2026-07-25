"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddHospital, safeUpdateHospital, safeDeleteHospital } from "@/lib/db";
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

  const getHospital = useCallback((id: string) => {
    return db.hospitais.get(id);
  }, []);

  const addHospital = useCallback(
    async (data: Omit<Hospital, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return safeAddHospital({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateHospital = useCallback(async (id: string, data: Partial<Hospital>) => {
    return safeUpdateHospital(id, data);
  }, []);

  const deleteHospital = useCallback(async (id: string) => {
    return safeDeleteHospital(id);
  }, []);

  return {
    hospitais,
    getHospital,
    addHospital,
    updateHospital,
    deleteHospital,
  };
}
