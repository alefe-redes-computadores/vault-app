"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddMedico, safeUpdateMedico, safeDeleteMedico } from "@/lib/db";
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

  const getMedico = useCallback((id: string) => {
    return db.medicos.get(id);
  }, []);

  const addMedico = useCallback(
    async (data: Omit<Medico, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return safeAddMedico({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateMedico = useCallback(async (id: string, data: Partial<Medico>) => {
    return safeUpdateMedico(id, data);
  }, []);

  const deleteMedico = useCallback(async (id: string) => {
    return safeDeleteMedico(id);
  }, []);

  return {
    medicos,
    getMedico,
    addMedico,
    updateMedico,
    deleteMedico,
  };
}
