// hooks/useTratamentos.ts
"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { tratamentosRepository } from "@/lib/repositories/tratamentos";
import { medicamentosRepository } from "@/lib/repositories/medicamentos";
import { useAuth } from "./useAuth";
import type { Tratamento } from "@/lib/types";
import { cancelDoseNotifications } from "@/lib/dose-notifications";

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
      // 1. Atualiza os dados do Tratamento (via repositório, já enfileira)
      await tratamentosRepository.update(id, data);

      // 2. O "Efeito Dominó" (lógica de negócio)
      if (data.status === 'concluido' || data.status === 'suspenso') {
        const medicamentosAfetados = await db.medicamentos
          .where('tratamento_ids')
          .equals(id)
          .toArray();

        for (const med of medicamentosAfetados) {
          if (med.id && med.status !== 'descontinuado') {
            // Usa o repositório para enfileirar a atualização do medicamento
            await medicamentosRepository.update(med.id, {
              status: 'descontinuado',
              motivo_descontinuacao: `Tratamento original marcado como ${data.status}`
            });

            if (med.estoque_horarios && med.estoque_horarios.length > 0) {
              await cancelDoseNotifications({
                id: med.id,
                estoque_horarios: med.estoque_horarios
              } as any); // TODO: tipar DoseNotificationPayload
            }
          }
        }
      }
    },
    []
  );

  const deleteTratamento = useCallback(async (id: string) => {
    return tratamentosRepository.delete(id);
  }, []);

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