"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { 
  db, 
  safeAddMedicamento, 
  safeUpdateMedicamento, 
  safeDeleteMedicamento,
  syncMedicamentoTratamentos 
} from "@/lib/db";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Medicamento } from "@/lib/types";

export function useMedicamentos() {
  const { user } = useAuth();

  const medicamentos = useLiveQuery(
    () => db.medicamentos.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getMedicamento = useCallback(async (id: string) => {
    return db.medicamentos.get(id);
  }, []);

  const addMedicamento = useCallback(
    async (data: Omit<Medicamento, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { tratamento_ids?: string[] }) => {
      // Extrai os IDs múltiplos (se houver) e separa do resto dos dados
      const { tratamento_ids, ...medData } = data;
      
      // Salva o medicamento na tabela principal blindando os novos relacionamentos
      const medId = await safeAddMedicamento({ 
        ...medData, 
        user_id: user?.id || "",
        person_id: medData.person_id || "", 
        medico_id: medData.medico_id || undefined,
        farmacia_id: medData.farmacia_id || undefined
      });
      
      // Compatibilidade: Se vier o array novo usa ele, senão pega o tratamento_id antigo (se existir)
      const idsToSync = tratamento_ids || (medData.tratamento_id ? [medData.tratamento_id] : []);

      // Sincroniza a tabela N:N
      if (idsToSync.length > 0) {
        await syncMedicamentoTratamentos(medId, idsToSync);
      }
      
      return medId;
    },
    [user]
  );

  const updateMedicamento = useCallback(async (id: string, data: Partial<Medicamento> & { tratamento_ids?: string[] }) => {
    const { tratamento_ids, ...medData } = data;
    
    // Atualiza os dados base do medicamento
    await safeUpdateMedicamento(id, medData);

    // Se um array de tratamentos foi explicitamente passado, sincroniza a relação N:N
    if (tratamento_ids !== undefined) {
      await syncMedicamentoTratamentos(id, tratamento_ids);
    } else if (medData.tratamento_id !== undefined) {
      // Fallback para o comportamento antigo: se mandou atualizar um único ID, transforma em array e sincroniza
      const idsToSync = medData.tratamento_id ? [medData.tratamento_id] : [];
      await syncMedicamentoTratamentos(id, idsToSync);
    }
  }, []);

  const deleteMedicamento = useCallback(async (id: string) => {
    // A deleção em cascata (ON DELETE CASCADE no Supabase e limpeza local) 
    // garante que as relações N:N sejam limpas quando o remédio é apagado.
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
