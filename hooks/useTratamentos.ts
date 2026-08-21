// hooks/useTratamentos.ts
"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { tratamentosRepository } from "@/lib/repositories/tratamentos";
import { medicamentosRepository } from "@/lib/repositories/medicamentos";
import { useAuth } from "./useAuth";
import { useActivePersonId } from "./useActivePersonId";
import type { Tratamento } from "@/lib/types";
import { cancelDoseNotifications } from "@/lib/dose-notifications";

export function useTratamentos() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const tratamentos = useLiveQuery(
    () => activePersonId ? db.tratamentos.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId],
    []
  );

  const getTratamento = useCallback((id: string) => tratamentosRepository.getById(id), []);

  const addTratamento = useCallback(async (data: Omit<Tratamento, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
    if (!user) throw new Error('Usuário não autenticado');
    return await tratamentosRepository.create({ ...data, user_id: user.id });
  }, [user]);

  const updateTratamento = useCallback(async (id: string, data: Partial<Tratamento>) => {
    await tratamentosRepository.update(id, data);
    if (data.status === 'concluido' || data.status === 'suspenso') {
      const medicamentosAfetados = await db.medicamentos.where('tratamento_ids').equals(id).toArray();
      for (const med of medicamentosAfetados) {
        if (med.id && med.status !== 'descontinuado') {
          await medicamentosRepository.update(med.id, {
            status: 'descontinuado',
            motivo_descontinuacao: `Tratamento original marcado como ${data.status}`
          });
          if (med.estoque_horarios && med.estoque_horarios.length > 0) {
            await cancelDoseNotifications({
              id: med.id,
              nome: med.nome || "",
              dosagem: med.dosagem || "",
              estoque_horarios: med.estoque_horarios
            });
          }
        }
      }
    }
  }, []);

  const deleteTratamento = useCallback(async (id: string) => await tratamentosRepository.delete(id), []);
  const deleteTratamentoSafe = useCallback(async (id: string) => await tratamentosRepository.deleteSafe(id), []);

  return { tratamentos, getTratamento, addTratamento, updateTratamento, deleteTratamento, deleteTratamentoSafe };
}