"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, safeSetDoseLog } from "@/lib/db";
import { useAuth } from "./useAuth";
import { useCallback } from "react";

/**
 * Retorna os dose_logs de um dia específico (ou de todos, se `data` for omitido).
 * `data` no formato "YYYY-MM-DD".
 */
export function useDoseLogs(data?: string) {
  const { user } = useAuth();

  const doseLogs = useLiveQuery(
    () => {
      let query = db.doseLogs.where("user_id").equals(user?.id || "");
      if (data) {
        query = query.and((log) => log.data === data);
      }
      return query.toArray();
    },
    [user?.id, data],
    []
  );

  /**
   * Marca (ou desmarca) uma dose como tomada.
   * `tomada = true` grava o horário atual; `false` limpa (volta a pendente).
   */
  const marcarDose = useCallback(
    async (medicamentoId: string, dataDose: string, horario: string, tomada: boolean) => {
      return safeSetDoseLog({
        user_id: user?.id || "",
        medicamento_id: medicamentoId,
        data: dataDose,
        horario,
        tomado_em: tomada ? new Date().toISOString() : undefined,
      });
    },
    [user]
  );

  return { doseLogs, marcarDose };
}
