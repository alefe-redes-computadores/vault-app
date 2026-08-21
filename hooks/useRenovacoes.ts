// hooks/useRenovacoes.ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { renovacoesRepository } from "@/lib/repositories/renovacoes";
import { useAuth } from "./useAuth";
import { useActivePersonId } from "./useActivePersonId";
import { useCallback } from "react";
import type { Renovacao } from "@/lib/types";

export function useRenovacoes(medicamentoId?: string) {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const renovacoes = useLiveQuery(
    () => {
      if (!activePersonId) return [];
      let query = db.renovacoes.where('person_id').equals(activePersonId);
      if (medicamentoId) query = query.and((r) => r.medicamento_id === medicamentoId);
      return query.reverse().sortBy("data");
    },
    [activePersonId, medicamentoId],
    []
  );

  const getRenovacao = useCallback((id: string) => renovacoesRepository.getById(id), []);

  const addRenovacao = useCallback(async (data: Omit<Renovacao, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
    if (!user) throw new Error('Usuário não autenticado');
    return await renovacoesRepository.create({ ...data, user_id: user.id });
  }, [user]);

  const updateRenovacao = useCallback(async (id: string, data: Partial<Renovacao>) => {
    return await renovacoesRepository.update(id, data);
  }, []);

  const deleteRenovacao = useCallback(async (id: string) => await renovacoesRepository.delete(id), []);

  return { renovacoes, getRenovacao, addRenovacao, updateRenovacao, deleteRenovacao };
}