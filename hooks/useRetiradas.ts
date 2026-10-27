// hooks/useRetiradas.ts
"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { retiradasRepository } from "@/lib/repositories/retiradas";
import { useActivePersonId } from "./useActivePersonId";
import { useAuth } from "./useAuth";
import type {
  RetiradaCreateInput,
  RetiradaUpdateInput,
} from "@/lib/repositories/retiradas";

export function useRetiradas(medicamentoId?: string) {
  const { activePersonId } = useActivePersonId();
  const { user } = useAuth();

  const retiradas = useLiveQuery(
    async () => {
      if (!activePersonId || !user?.id) return [];

      return medicamentoId
        ? retiradasRepository.getByMedicamento(user.id, activePersonId, medicamentoId)
        : retiradasRepository.getAll(user.id, activePersonId);
    },
    [user?.id, activePersonId, medicamentoId],
    []
  );

  const linkReceipt = useCallback(
    async (withdrawalId: string, receiptId: string) => {
      if (!activePersonId) throw new Error("Pessoa ativa não identificada.");
      return retiradasRepository.linkReceipt(
        activePersonId,
        withdrawalId,
        receiptId
      );
    },
    [activePersonId]
  );
  const getRetirada = useCallback(
    async (id: string) => {
      if (!activePersonId || !user?.id) return undefined;
      return retiradasRepository.getById(id, user.id, activePersonId);
    },
    [user?.id, activePersonId]
  );

  const getRetiradasByDate = useCallback(
    async (data: string) => {
      if (!activePersonId || !user?.id) return [];
      return retiradasRepository.getByDate(user.id, activePersonId, data);
    },
    [user?.id, activePersonId]
  );

  const addRetirada = useCallback(
    async (data: Omit<RetiradaCreateInput, "person_id">) => {
      if (!activePersonId) throw new Error("Pessoa ativa não identificada.");
      return retiradasRepository.create({ ...data, person_id: activePersonId });
    },
    [activePersonId]
  );

  const updateRetirada = useCallback(
    async (id: string, data: RetiradaUpdateInput) => {
      if (!activePersonId) throw new Error("Pessoa ativa não identificada.");
      return retiradasRepository.update(id, activePersonId, data);
    },
    [activePersonId]
  );

  const rescheduleRetiradas = useCallback(
    async (selected: Array<{id: string; data: string; updated_at?: string}>, date: string, reason: string, time?: string | null) => {
      if (!activePersonId) throw new Error("Pessoa ativa não identificada.");
      return retiradasRepository.rescheduleMany(activePersonId, selected, date, reason, time);
    }, [activePersonId]
  );

  const deleteRetirada = useCallback(
    async (id: string) => {
      if (!activePersonId) throw new Error("Pessoa ativa não identificada.");
      return retiradasRepository.delete(id, activePersonId);
    },
    [activePersonId]
  );

  return {
    linkReceipt,
    rescheduleRetiradas,
    retiradas: retiradas ?? [],
    getRetirada,
    getRetiradasByDate,
    addRetirada,
    updateRetirada,
    deleteRetirada,
    activePersonId,
  };
}
