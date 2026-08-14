"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeSetDoseLog } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import type { DoseLog } from "@/lib/types";

export function useDoseLogs(dataEspecifia?: string) {
  const { user } = useAuth();

  // Se passar uma data, filtra. Se não, traz tudo.
  const doseLogs = useLiveQuery(
    () => {
      if (dataEspecifia) {
        return db.doseLogs.where("data").equals(dataEspecifia).toArray();
      }
      return db.doseLogs.toArray();
    },
    [dataEspecifia]
  );

  const marcarComoTomada = useCallback(
    async (medicamentoId: string, dataDose: string, horario: string) => {
      return safeSetDoseLog({
        user_id: user?.id || "",
        medicamento_id: medicamentoId,
        data: dataDose,
        horario,
        tomado_em: new Date().toISOString(),
        ignorado_em: undefined, // Garante que limpa o ignorado se ele mudar de ideia
      });
    },
    [user]
  );

  const marcarComoIgnorada = useCallback(
    async (medicamentoId: string, dataDose: string, horario: string) => {
      return safeSetDoseLog({
        user_id: user?.id || "",
        medicamento_id: medicamentoId,
        data: dataDose,
        horario,
        ignorado_em: new Date().toISOString(),
        tomado_em: undefined, // Garante que limpa o tomado se ele mudar de ideia
      });
    },
    [user]
  );

  const desmarcarDose = useCallback(
    async (medicamentoId: string, dataDose: string, horario: string) => {
      return safeSetDoseLog({
        user_id: user?.id || "",
        medicamento_id: medicamentoId,
        data: dataDose,
        horario,
        tomado_em: undefined,
        ignorado_em: undefined,
      });
    },
    [user]
  );

  return { doseLogs, marcarComoTomada, marcarComoIgnorada, desmarcarDose };
}
