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
      let query = db.renovacoes.where("user_id").equals(user?.id || "");
      if (medicamentoId) {
        query = query.and((r) => r.medicamento_id === medicamentoId);
      }
      return query.reverse().sortBy("data");
    },
    [user?.id, medicamentoId],
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
