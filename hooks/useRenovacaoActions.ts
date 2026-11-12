"use client";

import { useCallback } from "react";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { renovacoesRepository } from "@/lib/repositories/renovacoes";

/** Mutation-only hook. It deliberately does not subscribe to the renewal list. */
export function useRenovacaoActions() {
  const { activePersonId } = useActivePersonId();

  const deleteRenovacao = useCallback(async (id: string) => {
    if (!activePersonId) throw new Error("Pessoa ativa não identificada.");
    await renovacoesRepository.delete(id, activePersonId);
  }, [activePersonId]);

  const updateRenovacao = useCallback(async (id: string, data: { observacoes?: string | null }) => {
    if (!activePersonId) throw new Error("Pessoa ativa não identificada.");
    await renovacoesRepository.update(id, activePersonId, data);
  }, [activePersonId]);

  return { deleteRenovacao, updateRenovacao };
}
