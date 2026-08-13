"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddTratamento, safeUpdateTratamento, safeDeleteTratamento } from "@/lib/db";
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

  const getTratamento = useCallback(async (id: string) => {
    return db.tratamentos.get(id);
  }, []);

  const addTratamento = useCallback(
    async (data: Omit<Tratamento, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return safeAddTratamento({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateTratamento = useCallback(
    async (id: string, data: Partial<Tratamento>) => {
      // 1. Atualiza os dados do Tratamento em si
      await safeUpdateTratamento(id, data);

      // 2. O "Efeito Dominó" (A inteligência relacional)
      // Se o usuário marcou o tratamento como concluído ou suspenso:
      if (data.status === 'concluido' || data.status === 'suspenso') {
        
        // Pega todos os vínculos desse tratamento na nova tabela N:N
        const vinculos = await db.medicamento_tratamentos
          .where('tratamento_id')
          .equals(id)
          .toArray();
        
        // Para cada remédio vinculado a esse tratamento...
        for (const vinculo of vinculos) {
          const med = await db.medicamentos.get(vinculo.medicamento_id);
          
          if (med && med.status !== 'descontinuado') {
            // A) Marca o remédio como descontinuado e registra o motivo automaticamente
            await db.medicamentos.update(med.id!, { 
              status: 'descontinuado',
              motivo_descontinuacao: `Tratamento original marcado como ${data.status}` 
            });
            
            // B) Cancela todos os alarmes e notificações desse remédio no celular
            if (med.estoque_horarios && med.estoque_horarios.length > 0) {
              await cancelDoseNotifications({ 
                id: med.id!, 
                estoque_horarios: med.estoque_horarios 
              } as any);
            }
          }
        }
      }
    },
    []
  );

  const deleteTratamento = useCallback(async (id: string) => {
    return safeDeleteTratamento(id);
  }, []);

  return {
    tratamentos,
    getTratamento,
    addTratamento,
    updateTratamento,
    deleteTratamento,
  };
}
