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

type UpdateCredentialData = Partial<
  Omit<Credential, "id" | "user_id" | "created_at" | "updated_at" | "synced" | "password_encrypted">
> & {
  password_plain?: string;
};

export function useCredentials() {
  const { user } = useAuth();

  const credentials = useLiveQuery(
    () => db.credentials.where("user_id").equals(user?.id || "").toArray(),
    [user?.id],
    []
  );

  const addCredential = async (data: AddCredentialData) => {
    if (!user) throw new Error("Usuário não autenticado");
    const { password_plain, ...rest } = data;
    const password_encrypted = encryptPassword(password_plain);
    return credentialsRepository.create(
      {
        ...rest,
        password_encrypted,
      },
      user.id
    );
  };

  const updateCredential = async (id: string, changes: UpdateCredentialData) => {
    if (!user) throw new Error("Usuário não autenticado");
    const { password_plain, ...rest } = changes;
    const payload: Partial<Omit<Credential, "id" | "user_id" | "created_at" | "updated_at" | "synced" | "password_encrypted">> =
      { ...rest };
    if (password_plain) {
      payload.password_encrypted = encryptPassword(password_plain);
    }
    return credentialsRepository.update(id, payload, user.id);
  };

  const deleteCredential = async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    return credentialsRepository.delete(id, user.id);
  };

  const getCredential = async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    return credentialsRepository.getById(id, user.id);
  };

  const credentialsByVault = (vaultId: string) =>
    (credentials || []).filter((c) => c.vault_id === vaultId);

  const credentialsPersonal = () =>
    (credentials || []).filter((c) => !c.vault_id);

  return {
    credentials: credentials || [],
    addCredential,
    updateCredential,
    deleteCredential,
    getCredential,
    credentialsByVault,
    credentialsPersonal,
  };
}