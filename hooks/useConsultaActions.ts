"use client";
import { useCallback } from "react";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { consultasRepository } from "@/lib/repositories/consultas";
import type { Consulta } from "@/lib/types";

type UpdateConsultaInput = Partial<Omit<Consulta, "id" | "user_id" | "person_id" | "created_at">>;

export function useConsultaActions() {
  const { activePersonId } = useActivePersonId();
  const requirePerson = () => {
    if (!activePersonId) throw new Error("Pessoa ativa não identificada.");
    return activePersonId;
  };
  const updateConsulta = useCallback((id: string, data: UpdateConsultaInput) => consultasRepository.update(id, requirePerson(), data), [activePersonId]);
  const deleteConsulta = useCallback((id: string) => consultasRepository.delete(id, requirePerson()), [activePersonId]);
  return { updateConsulta, deleteConsulta };
}
