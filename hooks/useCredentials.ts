// hooks/useCredentials.ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { credentialsRepository } from "@/lib/repositories/credentials";
import { useAuth } from "@/hooks/useAuth";
import { encryptPassword } from "@/lib/crypto";
import type { Credential } from "@/lib/types";

type AddCredentialData = Omit<Credential, "id" | "created_at" | "updated_at" | "synced" | "password_encrypted"> & {
  password_plain: string;
};

type UpdateCredentialData = Partial<Omit<Credential, "password_encrypted">> & {
  password_plain?: string;
};

export function useCredentials() {
  const { user } = useAuth();

  const credentials = useLiveQuery(
    () => db.credentials.where("user_id").equals(user?.id || "").toArray(),
    [user?.id],
    []
  );

  const addCredential = async (data: AddCredentialData): Promise<string> => {
    const { password_plain, ...rest } = data;
    const password_encrypted = encryptPassword(password_plain);
    return credentialsRepository.create({ ...rest, user_id: user?.id || "", password_encrypted });
  };

  const updateCredential = async (id: string, changes: UpdateCredentialData): Promise<void> => {
    const { password_plain, ...rest } = changes;
    const payload: Partial<Credential> = { ...rest };
    if (password_plain) {
      payload.password_encrypted = encryptPassword(password_plain);
    }
    await credentialsRepository.update(id, payload);
  };

  const deleteCredential = async (id: string): Promise<void> => {
    await credentialsRepository.delete(id);
  };

  const credentialsByVault = (vaultId: string) => (credentials || []).filter((c) => c.vault_id === vaultId);
  const credentialsPersonal = () => (credentials || []).filter((c) => !c.vault_id);

  return {
    credentials: credentials || [],
    addCredential,
    updateCredential,
    deleteCredential,
    credentialsByVault,
    credentialsPersonal,
  };
}