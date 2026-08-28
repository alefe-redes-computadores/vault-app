// hooks/useVaults.ts

"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { vaultsRepository } from "@/lib/repositories/vaults";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useAuth } from "@/hooks/useAuth";

import type {
  Document,
  Vault,
  VaultMember,
  VaultPermission,
} from "@/lib/types";

import type {
  VaultAccess,
  VaultCreateInput,
  VaultInvitationResponseInput,
  VaultMemberInviteInput,
  VaultUpdateInput,
} from "@/lib/repositories/vaults";

// ============================================================
// TIPOS
// ============================================================

interface UpdateMemberPermissionInput {
  permission: VaultPermission;
}

// ============================================================
// HOOK
// ============================================================

export function useVaults() {
  const { user } = useAuth();

  const {
    activePersonId,
    loading: personLoading,
  } = useActivePersonId();

  // ==========================================================
  // COFRES DA PESSOA ATIVA
  // ==========================================================

  /**
   * Fonte única da listagem de Vaults.
   *
   * Inclui:
   * - cofres próprios ligados à pessoa ativa;
   * - cofres compartilhados aceitos e associados
   *   à pessoa ativa do usuário atual.
   *
   * Não inclui registros sem person_id.
   */
  const vaults = useLiveQuery(
    async (): Promise<Vault[]> => {
      if (
        !user?.id ||
        !activePersonId
      ) {
        return [];
      }

      return vaultsRepository.getAccessibleByPerson(
        activePersonId
      );
    },
    [
      user?.id,
      activePersonId,
    ],
    []
  );

  // ==========================================================
  // CONVITES PENDENTES
  // ==========================================================

  /**
   * Convites destinados à conta autenticada.
   *
   * Eles não dependem da pessoa ativa porque o usuário
   * escolhe a pessoa à qual associará o cofre somente
   * no momento da aceitação.
   */
  const pendingInvites = useLiveQuery(
    async (): Promise<VaultMember[]> => {
      if (!user?.id) {
        return [];
      }

      return vaultsRepository.getPendingInvitesForCurrentUser();
    },
    [
      user?.id,
      user?.email,
    ],
    []
  );

  // ==========================================================
  // LEITURA
  // ==========================================================

  const getVault = useCallback(
    async (
      id: string
    ): Promise<Vault | undefined> => {
      if (
        !id ||
        !user?.id
      ) {
        return undefined;
      }

      return vaultsRepository.getById(
        id
      );
    },
    [
      user?.id,
    ]
  );

  const getAccess = useCallback(
    async (
      id: string
    ): Promise<VaultAccess | null> => {
      if (
        !id ||
        !user?.id
      ) {
        return null;
      }

      return vaultsRepository.getAccess(
        id
      );
    },
    [
      user?.id,
    ]
  );

  const getMembers = useCallback(
    async (
      vaultId: string
    ): Promise<VaultMember[]> => {
      if (
        !vaultId ||
        !user?.id
      ) {
        return [];
      }

      return vaultsRepository.getMembers(
        vaultId
      );
    },
    [
      user?.id,
    ]
  );

  const getAcceptedMembers = useCallback(
    async (
      vaultId: string
    ): Promise<VaultMember[]> => {
      if (
        !vaultId ||
        !user?.id
      ) {
        return [];
      }

      return vaultsRepository.getAcceptedMembers(
        vaultId
      );
    },
    [
      user?.id,
    ]
  );

  const getMemberCount = useCallback(
    async (
      vaultId: string
    ): Promise<number> => {
      if (
        !vaultId ||
        !user?.id
      ) {
        return 0;
      }

      return vaultsRepository.getMemberCount(
        vaultId
      );
    },
    [
      user?.id,
    ]
  );

  const getDocuments = useCallback(
    async (
      vaultId: string
    ): Promise<Document[]> => {
      if (
        !vaultId ||
        !user?.id
      ) {
        return [];
      }

      return vaultsRepository.getDocuments(
        vaultId
      );
    },
    [
      user?.id,
    ]
  );

  // ==========================================================
  // VAULT CRUD
  // ==========================================================

  const addVault = useCallback(
    async (
      data: Omit<
        VaultCreateInput,
        "person_id"
      > & {
        person_id?: string;
      }
    ): Promise<string> => {
      if (!user?.id) {
        throw new Error(
          "Usuário não autenticado"
        );
      }

      const personId =
        data.person_id ??
        activePersonId;

      if (!personId) {
        throw new Error(
          "Nenhuma pessoa ativa selecionada"
        );
      }

      if (
        activePersonId &&
        personId !== activePersonId
      ) {
        throw new Error(
          "O cofre deve pertencer à pessoa ativa"
        );
      }

      return vaultsRepository.create({
        person_id: personId,
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
      });
    },
    [
      user?.id,
      activePersonId,
    ]
  );

  const updateVault = useCallback(
    async (
      id: string,
      data: VaultUpdateInput
    ): Promise<string> => {
      if (!user?.id) {
        throw new Error(
          "Usuário não autenticado"
        );
      }

      return vaultsRepository.update(
        id,
        data
      );
    },
    [
      user?.id,
    ]
  );

  const deleteVault = useCallback(
    async (
      id: string
    ): Promise<string> => {
      if (!user?.id) {
        throw new Error(
          "Usuário não autenticado"
        );
      }

      return vaultsRepository.delete(
        id
      );
    },
    [
      user?.id,
    ]
  );

  // ==========================================================
  // MEMBERS / CONVITES
  // ==========================================================

  const addMember = useCallback(
    async (
      data: VaultMemberInviteInput
    ): Promise<string> => {
      if (!user?.id) {
        throw new Error(
          "Usuário não autenticado"
        );
      }

      return vaultsRepository.addMember(
        data
      );
    },
    [
      user?.id,
    ]
  );

  const updateMemberPermission =
    useCallback(
      async (
        id: string,
        data: UpdateMemberPermissionInput
      ): Promise<string> => {
        if (!user?.id) {
          throw new Error(
            "Usuário não autenticado"
          );
        }

        return vaultsRepository.updateMemberPermission(
          id,
          data
        );
      },
      [
        user?.id,
      ]
    );

  const respondToInvite =
    useCallback(
      async (
        id: string,
        data: VaultInvitationResponseInput
      ): Promise<string> => {
        if (!user?.id) {
          throw new Error(
            "Usuário não autenticado"
          );
        }

        if (
          data.status === "accepted"
        ) {
          const personId =
            data.person_id ??
            activePersonId;

          if (!personId) {
            throw new Error(
              "Selecione uma pessoa antes de aceitar o convite"
            );
          }

          return vaultsRepository.respondToInvite(
            id,
            {
              status: "accepted",
              person_id: personId,
            }
          );
        }

        return vaultsRepository.respondToInvite(
          id,
          {
            status: "declined",
          }
        );
      },
      [
        user?.id,
        activePersonId,
      ]
    );

  const deleteMember = useCallback(
    async (
      id: string
    ): Promise<string> => {
      if (!user?.id) {
        throw new Error(
          "Usuário não autenticado"
        );
      }

      return vaultsRepository.deleteMember(
        id
      );
    },
    [
      user?.id,
    ]
  );

  // ==========================================================
  // DOCUMENTOS
  // ==========================================================

  const shareDocument = useCallback(
    async (
      documentId: string,
      vaultId: string
    ): Promise<void> => {
      if (!user?.id) {
        throw new Error(
          "Usuário não autenticado"
        );
      }

      return vaultsRepository.shareDocument(
        documentId,
        vaultId
      );
    },
    [
      user?.id,
    ]
  );

  const unshareDocument = useCallback(
    async (
      documentId: string,
      vaultId: string
    ): Promise<void> => {
      if (!user?.id) {
        throw new Error(
          "Usuário não autenticado"
        );
      }

      return vaultsRepository.unshareDocument(
        documentId,
        vaultId
      );
    },
    [
      user?.id,
    ]
  );

  // ==========================================================
  // RETORNO
  // ==========================================================

  return {
    activePersonId,

    loading:
      personLoading ||
      vaults === undefined ||
      pendingInvites === undefined,

    vaults:
      vaults ?? [],

    pendingInvites:
      pendingInvites ?? [],

    getVault,
    getAccess,
    getMembers,
    getAcceptedMembers,
    getMemberCount,
    getDocuments,

    addVault,
    updateVault,
    deleteVault,

    addMember,
    updateMemberPermission,
    respondToInvite,
    deleteMember,

    shareDocument,
    unshareDocument,
  };
}