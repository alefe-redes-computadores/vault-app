// hooks/useCirurgias.ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cirurgiasRepository } from "@/lib/repositories/cirurgias";
import { useAuth } from "./useAuth";
import { useActivePersonId } from "./useActivePersonId";
import { useCallback } from "react";
import type { Cirurgia } from "@/lib/types";

export function useCirurgias() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const cirurgias = useLiveQuery(
    () => activePersonId ? db.cirurgias.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId],
    []
  );

  const getCirurgia = useCallback((id: string) => cirurgiasRepository.getById(id), []);

  const addCirurgia = useCallback(async (data: Omit<Cirurgia, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
    if (!user) throw new Error('Usuário não autenticado');
    return await cirurgiasRepository.create({ ...data, user_id: user.id });
  }, [user]);

  const updateCirurgia = useCallback(async (id: string, data: Partial<Cirurgia>) => {
    return await cirurgiasRepository.update(id, data);
  }, []);

  const deleteCirurgia = useCallback(async (id: string) => {
    return await cirurgiasRepository.delete(id);
  }, []);

  return { cirurgias, getCirurgia, addCirurgia, updateCirurgia, deleteCirurgia };
}