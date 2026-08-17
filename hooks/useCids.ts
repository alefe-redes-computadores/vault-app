"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cidsRepository } from "@/lib/repositories/cids";
import { useAuth } from "./useAuth";
import { useCallback } from "react";
import type { Cid } from "@/lib/types";

export function useCids() {
  const { user } = useAuth();

  const cids = useLiveQuery(
    () => db.cids.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const getCid = useCallback((id: string) => {
    return cidsRepository.getById(id);
  }, []);

  /**
   * Adiciona um novo CID. O user_id é injetado automaticamente
   * para manter a integridade da conta autenticada.
   */
  const addCid = useCallback(
    async (data: Omit<Cid, 'id' | 'created_at' | 'updated_at' | 'synced'>) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return cidsRepository.create({ ...data, user_id: user.id });
    },
    [user]
  );

  const updateCid = useCallback(async (id: string, data: Partial<Cid>) => {
    return cidsRepository.update(id, data);
  }, []);

  const deleteCid = useCallback(async (id: string) => {
    return cidsRepository.delete(id);
  }, []);

  const deleteCidSafe = useCallback(async (id: string) => {
    return cidsRepository.deleteSafe(id);
  }, []);

  return {
    cids,
    getCid,
    addCid,
    updateCid,
    deleteCid,
    deleteCidSafe,
  };
}
