"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { renovacoesRepository } from "@/lib/repositories/renovacoes";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Renovacao } from "@/lib/types";

export function useRenovacoes(medicamentoId?: string) {
  const { user } = useAuth();

  const renovacoes = useLiveQuery(
    () => {
      let query = db.renovacoes.where("user_id").equals(user?.id || "");
      if (medicamentoId) {
        query = query.and((r) => r.medicamento_id === medicamentoId);
      }
      return query.reverse().sortBy("data");
    },
    [user?.id, medicamentoId],
    []
  );

  const getRenovacao = useCallback((id: string) => {
    return renovacoesRepository.getById(id);
  }, []);

  const addRenovacao = useCallback(
    async (data: Omit<Renovacao, "id" | "user_id" | "created_at" | "updated_at" | "synced">) => {
      return renovacoesRepository.create({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateRenovacao = useCallback(async (id: string, data: Partial<Renovacao>) => {
    return renovacoesRepository.update(id, data);
  }, []);

  const deleteRenovacao = useCallback(async (id: string) => {
    return renovacoesRepository.delete(id);
  }, []);

  return {
    renovacoes,
    getRenovacao,
    addRenovacao,
    updateRenovacao,
    deleteRenovacao,
  };
}