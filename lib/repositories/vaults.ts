// lib/repositories/vaults.ts
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { Vault, VaultMember } from "@/lib/types";

export const vaultsRepository = {
  async getAll() {
    return db.vaults.toArray();
  },

  async getById(id: string) {
    return db.vaults.get(id);
  },

  async create(data: Omit<Vault, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'> & { id?: string; user_id?: string }) {
    if (process.env.NODE_ENV === "development" && "user_id" in data) {
      console.warn("[vaultsRepository] user_id recebido do caller será ignorado — repositório injeta internamente.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const now = new Date().toISOString();
    const vaultId = data.id || crypto.randomUUID();

    const { user_id: _, ...vaultData } = data;

    const vaultCompleto: Vault = {
      ...vaultData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
      id: vaultId,
    };

    await db.transaction("rw", [db.vaults, db.syncQueue], async () => {
      await db.vaults.add(vaultCompleto);
      await enfileirarOperacao("vaults", "add", vaultCompleto);
    });

    return vaultId;
  },

  async update(id: string, data: Partial<Vault>) {
    const existing = await db.vaults.get(id);
    if (!existing) throw new Error("Cofre não encontrado");

    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.vaults, db.syncQueue], async () => {
      await db.vaults.update(id, payload);
      const updated = await db.vaults.get(id);
      await enfileirarOperacao("vaults", "update", updated);
    });

    return id;
  },

  async delete(id: string) {
    const existing = await db.vaults.get(id);
    if (!existing) throw new Error("Cofre não encontrado");

    await db.transaction("rw", [db.vaults, db.syncQueue], async () => {
      await db.vaults.delete(id);
      await enfileirarOperacao("vaults", "delete", { id });
    });

    return id;
  },

  async addMember(data: Omit<VaultMember, 'id' | 'created_at' | 'updated_at' | 'synced' | 'invited_by'> & { id?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const now = new Date().toISOString();
    const memberId = data.id || crypto.randomUUID();
    
    // O user_id aqui pertence ao CONVIDADO (vem de data), 
    // enquanto invited_by registra quem fez o convite (o usuário logado).
    const memberCompleto: VaultMember = {
      ...data,
      invited_by: user.id,
      invited_at: data.invited_at || now,
      created_at: now,
      updated_at: now,
      synced: false,
      id: memberId,
    };

    await db.transaction("rw", [db.vaultMembers, db.syncQueue], async () => {
      await db.vaultMembers.add(memberCompleto);
      await enfileirarOperacao("vaultMembers", "add", memberCompleto);
    });

    return memberId;
  },

  async updateMember(id: string, data: Partial<VaultMember>) {
    const existing = await db.vaultMembers.get(id);
    if (!existing) throw new Error("Membro do cofre não encontrado");

    const now = new Date().toISOString();
    const payload = { ...data, updated_at: now, synced: false };

    await db.transaction("rw", [db.vaultMembers, db.syncQueue], async () => {
      await db.vaultMembers.update(id, payload);
      const updated = await db.vaultMembers.get(id);
      await enfileirarOperacao("vaultMembers", "update", updated);
    });

    return id;
  },

  async deleteMember(id: string) {
    const existing = await db.vaultMembers.get(id);
    if (!existing) throw new Error("Membro do cofre não encontrado");

    await db.transaction("rw", [db.vaultMembers, db.syncQueue], async () => {
      await db.vaultMembers.delete(id);
      await enfileirarOperacao("vaultMembers", "delete", { id });
    });

    return id;
  },
};
