"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { consultasRepository } from "@/lib/repositories/consultas";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Consulta } from "@/lib/types";

export function useConsultas() {
  const { user } = useAuth();

  const consultas = useLiveQuery(
    () => db.consultas.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getConsulta = useCallback((id: string) => {
    return consultasRepository.getById(id);
  }, []);

  const addConsulta = useCallback(
    async (data: Omit<Consulta, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return consultasRepository.create({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateConsulta = useCallback(async (id: string, data: Partial<Consulta>) => {
    return consultasRepository.update(id, data);
  }, []);

  const deleteConsulta = useCallback(async (id: string) => {
    return consultasRepository.delete(id);
  }, []);

  return {
    consultas,
    getConsulta,
    addConsulta,
    updateConsulta,
    deleteConsulta,
  };
}