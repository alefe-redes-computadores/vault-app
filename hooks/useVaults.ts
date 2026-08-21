// hooks/useVaults.ts
"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { vaultsRepository } from "@/lib/repositories/vaults";
import { useAuth } from "./useAuth";
import type { Vault, VaultMember } from "@/lib/types";

export function useVaults() {
  const { user } = useAuth();

  const vaults = useLiveQuery(
    () => db.vaults.where("user_id").equals(user?.id || "").toArray(),
    [user?.id],
    []
  );

  const getVault = useCallback((id: string) => {
    return vaultsRepository.getById(id);
  }, []);

  const addVault = useCallback(
    async (data: Omit<Vault, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return vaultsRepository.create({ ...data, user_id: user.id });
    },
    [user]
  );

  const updateVault = useCallback(async (id: string, data: Partial<Vault>) => {
    return vaultsRepository.update(id, data);
  }, []);

  const deleteVault = useCallback(async (id: string) => {
    return vaultsRepository.delete(id);
  }, []);

  const addMember = useCallback(
    async (data: Omit<VaultMember, 'id' | 'updated_at' | 'synced' | 'invited_by'> & { id?: string; invited_at?: string }) => {
      return vaultsRepository.addMember(data);
    },
    []
  );

  const updateMember = useCallback(async (id: string, data: Partial<VaultMember>) => {
    return vaultsRepository.updateMember(id, data);
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    return vaultsRepository.deleteMember(id);
  }, []);

  return {
    vaults: vaults || [],
    getVault,
    addVault,
    updateVault,
    deleteVault,
    addMember,
    updateMember,
    deleteMember,
  };
}
