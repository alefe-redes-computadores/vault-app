// hooks/useCids.ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cidsRepository } from "@/lib/repositories/cids";
import { useAuth } from "./useAuth";
import { useActivePersonId } from "./useActivePersonId";
import { useCallback } from "react";
import type { Cid } from "@/lib/types";

export function useCids() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const cids = useLiveQuery(
    () => activePersonId ? db.cids.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId],
    []
  );

  const getCid = useCallback((id: string) => cidsRepository.getById(id), []);

  const addCid = useCallback(async (data: Omit<Cid, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
    if (!user) throw new Error('Usuário não autenticado');
    return await cidsRepository.create({ ...data, user_id: user.id });
  }, [user]);

  const updateCid = useCallback(async (id: string, data: Partial<Cid>) => {
    return await cidsRepository.update(id, data);
  }, []);

  const deleteCid = useCallback(async (id: string) => await cidsRepository.delete(id), []);
  const deleteCidSafe = useCallback(async (id: string) => await cidsRepository.deleteSafe(id), []);

  return { cids, getCid, addCid, updateCid, deleteCid, deleteCidSafe };
}