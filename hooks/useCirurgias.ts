"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cirurgiasRepository } from "@/lib/repositories/cirurgias";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Cirurgia } from "@/lib/types";

export function useCirurgias() {
  const { user } = useAuth();

  const cirurgias = useLiveQuery(
    () => db.cirurgias.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getCirurgia = useCallback((id: string) => {
    return cirurgiasRepository.getById(id);
  }, []);

  const addCirurgia = useCallback(
    async (data: Omit<Cirurgia, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return cirurgiasRepository.create({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateCirurgia = useCallback(async (id: string, data: Partial<Cirurgia>) => {
    return cirurgiasRepository.update(id, data);
  }, []);

  const deleteCirurgia = useCallback(async (id: string) => {
    return cirurgiasRepository.delete(id);
  }, []);

  return {
    cirurgias,
    getCirurgia,
    addCirurgia,
    updateCirurgia,
    deleteCirurgia,
  };
}