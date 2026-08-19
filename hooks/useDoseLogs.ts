// hooks/useDoseLogs.ts
"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeSetDoseLog } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "./useActivePersonId";
import type { DoseLog } from "@/lib/types";

export function useDoseLogs(dataEspecifia?: string) {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const doseLogs = useLiveQuery(
    () => {
      if (!activePersonId) return [];
      
      let query = db.doseLogs.where('person_id').equals(activePersonId);
      
      if (dataEspecifia) {
        query = query.and((log) => log.data === dataEspecifia);
      }
      
      return query.toArray();
    },
    [activePersonId, dataEspecifia],
    []
  );

  const marcarComoTomada = useCallback(
    async (medicamentoId: string, dataDose: string, horario: string) => {
      return safeSetDoseLog({
        user_id: user?.id || "",
        person_id: activePersonId || undefined,
        medicamento_id: medicamentoId,
        data: dataDose,
        horario,
        tomado_em: new Date().toISOString(),
      });
    },
    [user, activePersonId]
  );

  const marcarComoIgnorada = useCallback(
    async (medicamentoId: string, dataDose: string, horario: string) => {
      return safeSetDoseLog({
        user_id: user?.id || "",
        person_id: activePersonId || undefined,
        medicamento_id: medicamentoId,
        data: dataDose,
        horario,
        ignorado_em: new Date().toISOString(),
      });
    },
    [user, activePersonId]
  );

  const desmarcarDose = useCallback(
    async (medicamentoId: string, dataDose: string, horario: string) => {
      return safeSetDoseLog({
        user_id: user?.id || "",
        person_id: activePersonId || undefined,
        medicamento_id: medicamentoId,
        data: dataDose,
        horario,
        tomado_em: undefined,
        ignorado_em: undefined,
      });
    },
    [user, activePersonId]
  );

  return { doseLogs, marcarComoTomada, marcarComoIgnorada, desmarcarDose };
}