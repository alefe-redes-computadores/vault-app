// lib/repositories/vaults.ts

import { db, safeAddVault, safeAddVaultMember, safeUpdateVaultMember } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Vault, VaultMember } from "@/lib/types";

export const vaultsRepository = {
  async getAll() {
    return db.vaults.toArray();
  },

  async getById(id: string) {
    return db.vaults.get(id);
  },

  async create(data: Omit<Vault, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    const id = await safeAddVault(data);
    await enfileirarOperacao("vaults", "add", { id, ...data });
    return id;
  },

  async update(id: string, data: Partial<Vault>) {
    const existing = await db.vaults.get(id);
    if (!existing) throw new Error("Cofre não encontrado");
    await db.vaults.update(id, { ...data, updated_at: new Date().toISOString(), synced: false });
    const updated = await db.vaults.get(id);
    await enfileirarOperacao("vaults", "update", { id, ...updated });
    return id;
  },

  async delete(id: string) {
    const existing = await db.vaults.get(id);
    if (!existing) throw new Error("Cofre não encontrado");
    await db.vaults.delete(id);
    await enfileirarOperacao("vaults", "delete", { id });
    return id;
  },

  async addMember(data: Omit<VaultMember, 'id' | 'invited_at' | 'updated_at' | 'synced'>) {
    const id = await safeAddVaultMember(data);
    await enfileirarOperacao("vaultMembers", "add", { id, ...data });
    return id;
  },

  async updateMember(id: string, data: Partial<VaultMember>) {
    const existing = await db.vaultMembers.get(id);
    if (!existing) throw new Error("Membro do cofre não encontrado");
    await db.vaultMembers.update(id, { ...data, updated_at: new Date().toISOString(), synced: false });
    const updated = await db.vaultMembers.get(id);
    await enfileirarOperacao("vaultMembers", "update", { id, ...updated });
    return id;
  },

  async deleteMember(id: string) {
    const existing = await db.vaultMembers.get(id);
    if (!existing) throw new Error("Membro do cofre não encontrado");
    await db.vaultMembers.delete(id);
    await enfileirarOperacao("vaultMembers", "delete", { id });
    return id;
  },
};