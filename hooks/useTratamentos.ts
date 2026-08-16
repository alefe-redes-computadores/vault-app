"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { tratamentosRepository } from "@/lib/repositories/tratamentos";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Tratamento } from "@/lib/types";

export function useTratamentos() {
  const { user } = useAuth();

  const tratamentos = useLiveQuery(
    () => db.tratamentos.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getTratamento = useCallback((id: string) => {
    return tratamentosRepository.getById(id);
  }, []);

  const addTratamento = useCallback(
    async (data: Omit<Tratamento, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return tratamentosRepository.create({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateTratamento = useCallback(
    async (id: string, data: Partial<Tratamento>) => {
      return tratamentosRepository.update(id, data);
    },
    []
  );

  const deleteTratamento = useCallback(async (id: string) => {
    return tratamentosRepository.delete(id);
  }, []);

  // ✅ Versão segura com cascade delete
  const deleteTratamentoSafe = useCallback(async (id: string) => {
    return tratamentosRepository.deleteSafe(id);
  }, []);

  return {
    tratamentos,
    getTratamento,
    addTratamento,
    updateTratamento,
    deleteTratamento,
    deleteTratamentoSafe,
  };
}