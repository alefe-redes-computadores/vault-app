"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  safeAddMedicamento,
  safeUpdateMedicamento,
  safeDeleteMedicamento,
  syncMedicamentoTratamentos,
} from "@/lib/db";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Medicamento } from "@/lib/types";

export function useMedicamentos() {
  const { user } = useAuth();

  const medicamentos = useLiveQuery(
    () =>
      db.medicamentos
        .where("user_id")
        .equals(user?.id || "")
        .toArray(),
    [user?.id],
    []
  );

  const getMedicamento = useCallback(async (id: string) => {
    return db.medicamentos.get(id);
  }, []);

  const addMedicamento = useCallback(
    async (
      data: Omit<
        Medicamento,
        "id" | "user_id" | "created_at" | "updated_at" | "synced"
      > & {
        tratamento_ids?: string[];
      }
    ) => {
      if (!user?.id) {
        throw new Error("Usuário não autenticado.");
      }

      const { tratamento_ids, ...medData } = data;

      const medId = await safeAddMedicamento({
        ...medData,
        user_id: user.id,
        person_id: medData.person_id || "",
        medico_id: medData.medico_id || undefined,
        farmacia_id: medData.farmacia_id || undefined,
      });

      const idsToSync =
        tratamento_ids ??
        (medData.tratamento_id ? [medData.tratamento_id] : []);

      await syncMedicamentoTratamentos(medId, idsToSync);

      return medId;
    },
    [user]
  );

  const updateMedicamento = useCallback(
    async (
      id: string,
      data: Partial<Medicamento> & {
        tratamento_ids?: string[];
      }
    ) => {
      const { tratamento_ids, ...medData } = data;

      await safeUpdateMedicamento(id, medData);

      if (tratamento_ids !== undefined) {
        await syncMedicamentoTratamentos(id, tratamento_ids);
      } else if (medData.tratamento_id !== undefined) {
        const idsToSync = medData.tratamento_id
          ? [medData.tratamento_id]
          : [];

        await syncMedicamentoTratamentos(id, idsToSync);
      }
    },
    []
  );

  const deleteMedicamento = useCallback(async (id: string) => {
    return safeDeleteMedicamento(id);
  }, []);

  return {
    medicamentos,
    getMedicamento,
    addMedicamento,
    updateMedicamento,
    deleteMedicamento,
  };
}