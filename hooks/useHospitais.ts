"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { hospitaisRepository } from "@/lib/repositories/hospitais";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Hospital } from "@/lib/types";

export function useHospitais() {
  const { user } = useAuth();

  const hospitais = useLiveQuery(
    () => db.hospitais.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getHospital = useCallback((id: string) => {
    return hospitaisRepository.getById(id);
  }, []);

  const addHospital = useCallback(
    async (data: Omit<Hospital, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return hospitaisRepository.create({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateHospital = useCallback(async (id: string, data: Partial<Hospital>) => {
    return hospitaisRepository.update(id, data);
  }, []);

  const deleteHospital = useCallback(async (id: string) => {
    return hospitaisRepository.delete(id);
  }, []);

  // ✅ Versão com cascade delete (limpa referências em documentos, consultas, cirurgias, exames)
  const deleteHospitalSafe = useCallback(async (id: string) => {
    return hospitaisRepository.deleteSafe(id);
  }, []);

  return {
    hospitais,
    getHospital,
    addHospital,
    updateHospital,
    deleteHospital,
    deleteHospitalSafe,
  };
}