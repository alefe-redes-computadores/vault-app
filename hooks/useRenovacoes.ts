"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddRenovacao, safeUpdateRenovacao } from "@/lib/db";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Renovacao } from "@/lib/types";

export function useRenovacoes(medicamentoId?: string) {
  const { user } = useAuth();

  const renovacoes = useLiveQuery(
    () => {
      let query = db.renovacoes.toCollection();
      if (medicamentoId) {
        query = query.filter((r) => r.medicamento_id === medicamentoId);
      }
      return query.reverse().sortBy("data");
    },
    [medicamentoId],
    []
  );

  const addRenovacao = useCallback(
    async (data: Omit<Renovacao, "id" | "user_id" | "created_at" | "updated_at" | "synced">) => {
      return safeAddRenovacao({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateRenovacao = useCallback(async (id: string, data: Partial<Renovacao>) => {
    return safeUpdateRenovacao(id, data);
  }, []);

  return {
    renovacoes,
    addRenovacao,
    updateRenovacao,
  };
}
