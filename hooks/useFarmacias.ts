"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { farmaciasRepository } from "@/lib/repositories/farmacias";
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
    return farmaciasRepository.getById(id);
  }, []);

  const addFarmacia = useCallback(
    async (data: Omit<Farmacia, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return farmaciasRepository.create({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateFarmacia = useCallback(async (id: string, data: Partial<Farmacia>) => {
    return farmaciasRepository.update(id, data);
  }, []);

  const deleteFarmacia = useCallback(async (id: string) => {
    return farmaciasRepository.delete(id);
  }, []);

  // ✅ Versão com cascade delete (limpa referências em medicamentos e renovações)
  const deleteFarmaciaSafe = useCallback(async (id: string) => {
    return farmaciasRepository.deleteSafe(id);
  }, []);

  return {
    farmacias,
    getFarmacia,
    addFarmacia,
    updateFarmacia,
    deleteFarmacia,
    deleteFarmaciaSafe,
  };
}