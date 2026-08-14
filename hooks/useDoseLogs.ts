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
      if (!user?.id) return [];

      // OTIMIZAÇÃO DE PERFORMANCE (FASE 3):
      // Buscar pelo index da data reduz drasticamente a carga na memória RAM,
      // pois puxa apenas as doses de um único dia antes de filtrar o usuário.
      if (data) {
        return db.doseLogs
          .where("data")
          .equals(data)
          .filter((log) => log.user_id === user.id)
          .toArray();
      }

      // Fallback: se não tiver data, puxa tudo do usuário (usado em relatórios gerais)
      return db.doseLogs
        .where("user_id")
        .equals(user.id)
        .toArray();
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
      if (!user?.id) return;

      return safeSetDoseLog({
        user_id: user.id,
        medicamento_id: medicamentoId,
        data: dataDose,
        horario,
        tomado_em: tomada ? new Date().toISOString() : undefined,
      });
    },
    [user?.id] // Dependência ajustada para user?.id para evitar recriações desnecessárias
  );

  return { doseLogs, marcarDose };
}
