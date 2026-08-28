// hooks/useCredentials.ts

"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";

import {
  credentialsRepository,
  type CredentialCreateInput,
  type CredentialUpdateInput,
} from "@/lib/repositories/credentials";

import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";

// ============================================================
// HOOK
// ============================================================

export function useCredentials() {
  const { user } = useAuth();

  const {
    activePersonId,
    loading: personLoading,
  } = useActivePersonId();

  // ==========================================================
  // CREDENTIALS DA PESSOA ATIVA
  //
  // A consulta parte do índice person_id adicionado na v34.
  //
  // Mesmo usando o índice da Person, mantemos também a
  // conferência de user_id para garantir isolamento entre
  // contas no IndexedDB local.
  // ==========================================================

  const credentials = useLiveQuery(
    async () => {
      if (
        !user?.id ||
        !activePersonId
      ) {
        return [];
      }

      const rows =
        await db.credentials
          .where("person_id")
          .equals(activePersonId)
          .toArray();

      return rows.filter(
        (credential) =>
          credential.user_id ===
          user.id
      );
    },
    [
      user?.id,
      activePersonId,
    ],
    []
  );

  // ==========================================================
  // CREATE
  // ==========================================================

  const addCredential = async (
    data: CredentialCreateInput
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    if (!activePersonId) {
      throw new Error(
        "Nenhuma pessoa ativa selecionada"
      );
    }

    /**
     * A pessoa ativa é a autoridade do contexto atual.
     *
     * Mesmo que algum formulário envie person_id diferente,
     * não permitimos criar uma credencial silenciosamente em
     * outra Person enquanto uma Person diferente está ativa.
     */
    if (
      data.person_id !==
      activePersonId
    ) {
      throw new Error(
        "A credencial deve pertencer à pessoa ativa"
      );
    }

    return credentialsRepository.create(
      data
    );
  };

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateCredential = async (
    id: string,
    changes: CredentialUpdateInput
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    if (!activePersonId) {
      throw new Error(
        "Nenhuma pessoa ativa selecionada"
      );
    }

    /**
     * O fluxo comum não deve transferir a credencial para
     * outra Person.
     *
     * Se futuramente existir uma tela específica de
     * transferência, ela pode usar o repository diretamente
     * com validações próprias.
     */
    if (
      changes.person_id !== undefined &&
      changes.person_id !==
        activePersonId
    ) {
      throw new Error(
        "Não é permitido alterar a pessoa da credencial por este fluxo"
      );
    }

    return credentialsRepository.update(
      id,
      activePersonId,
      changes
    );
  };

  // ==========================================================
  // DELETE
  // ==========================================================

  const deleteCredential = async (
    id: string
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    if (!activePersonId) {
      throw new Error(
        "Nenhuma pessoa ativa selecionada"
      );
    }

    return credentialsRepository.delete(
      id,
      activePersonId
    );
  };

  // ==========================================================
  // GET BY ID
  // ==========================================================

  const getCredential = async (
    id: string
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    if (!activePersonId) {
      return null;
    }

    return credentialsRepository.getById(
      id,
      activePersonId
    );
  };

  // ==========================================================
  // FILTROS DERIVADOS
  // ==========================================================

  const credentialsByVault = (
    vaultId: string
  ) =>
    (credentials || []).filter(
      (credential) =>
        credential.vault_id ===
        vaultId
    );

  const credentialsPersonal = () =>
    (credentials || []).filter(
      (credential) =>
        !credential.vault_id
    );

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    credentials:
      credentials || [],

    activePersonId,

    /**
     * Útil para telas que precisam distinguir:
     *
     * - ainda carregando PersonContext;
     * - Person realmente inexistente.
     */
    loading:
      personLoading ||
      credentials === undefined,

    addCredential,
    updateCredential,
    deleteCredential,
    getCredential,
    credentialsByVault,
    credentialsPersonal,
  };
}