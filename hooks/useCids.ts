"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddCid, safeUpdateCid, safeDeleteCid } from "@/lib/db";
import { useAuth } from "./useAuth";
import type { Cid } from "@/lib/types";

export function useCids() {
  const { user } = useAuth();

  const cids = useLiveQuery(
    () => db.cids.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  const addCid = useCallback(
    async (data: Omit<Cid, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      return safeAddCid({ ...data, user_id: user?.id || "" });
    },
    [user]
  );

  const updateCid = useCallback(async (id: string, data: Partial<Cid>) => {
    return safeUpdateCid(id, data);
  }, []);

  const deleteCid = useCallback(async (id: string) => {
    return safeDeleteCid(id);
  }, []);

  return { cids, addCid, updateCid, deleteCid };
}
