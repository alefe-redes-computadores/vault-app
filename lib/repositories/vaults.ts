// lib/repositories/vaults.ts

import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";

import type {
  Document,
  Vault,
  VaultMember,
  VaultMemberStatus,
  VaultPermission,
} from "@/lib/types";

// ============================================================
// TIPOS DE INPUT
// ============================================================

export interface VaultCreateInput {
  person_id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
}

export interface VaultUpdateInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface VaultMemberInviteInput {
  vault_id: string;
  email: string;
  name?: string;
  permission: VaultPermission;
}

export interface VaultMemberPermissionInput {
  permission: VaultPermission;
}

export interface VaultInvitationResponseInput {
  status: Extract<
    VaultMemberStatus,
    "accepted" | "declined"
  >;

  person_id?: string;
}

export type VaultAccessRole =
  | "owner"
  | "admin"
  | "edit"
  | "view";

export interface VaultAccess {
  vault: Vault;
  role: VaultAccessRole;
  membership?: VaultMember;
}

// ============================================================
// HELPERS
// ============================================================

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeEmail(
  email: string
): string {
  return email
    .trim()
    .toLowerCase();
}

function normalizeOptionalText(
  value?: string
): string | undefined {
  const normalized =
    value?.trim();

  return normalized
    ? normalized
    : undefined;
}

function normalizeColor(
  color: string
): string {
  const normalized =
    color.trim();

  if (!normalized) {
    return "#7DD3FC";
  }

  if (
    /^#[0-9a-fA-F]{6}$/.test(
      normalized
    )
  ) {
    return normalized.toUpperCase();
  }

  const legacyColors: Record<
    string,
    string
  > = {
    purple: "#8B5CF6",
    blue: "#38BDF8",
    green: "#34D399",
    amber: "#F59E0B",
    coral: "#EF4444",
    red: "#EF4444",
    pink: "#EC4899",
    indigo: "#6366F1",
    teal: "#14B8A6",
  };

  return (
    legacyColors[
      normalized.toLowerCase()
    ] ?? "#7DD3FC"
  );
}

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .substring(2)
  );
}

async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(
      `Não foi possível validar o usuário autenticado: ${error.message}`
    );
  }

  if (!user) {
    throw new Error(
      "Usuário não autenticado"
    );
  }

  return user;
}

async function getAuthenticatedUserEmail(): Promise<
  string | null
> {
  const user =
    await getAuthenticatedUser();

  return user.email
    ? normalizeEmail(
        user.email
      )
    : null;
}

async function requireOwnedPerson(
  personId: string,
  userId: string
): Promise<void> {
  const normalizedPersonId =
    personId.trim();

  if (!normalizedPersonId) {
    throw new Error(
      "Pessoa é obrigatória"
    );
  }

  const person =
    await db.persons.get(
      normalizedPersonId
    );

  if (!person) {
    throw new Error(
      "Pessoa não encontrada"
    );
  }

  if (
    person.user_id !== userId
  ) {
    throw new Error(
      "Pessoa selecionada não pertence ao usuário autenticado"
    );
  }
}

async function getMembershipByUser(
  vaultId: string,
  userId: string
): Promise<VaultMember | undefined> {
  return db.vaultMembers
    .where("vault_id")
    .equals(vaultId)
    .filter(
      (member) =>
        member.user_id ===
          userId &&
        member.status ===
          "accepted"
    )
    .first();
}

async function getVaultAccessForUser(
  vaultId: string,
  userId: string
): Promise<VaultAccess | null> {
  const vault =
    await db.vaults.get(
      vaultId
    );

  if (!vault) {
    return null;
  }

  if (
    vault.user_id === userId
  ) {
    return {
      vault,
      role: "owner",
    };
  }

  const membership =
    await getMembershipByUser(
      vaultId,
      userId
    );

  if (!membership) {
    return null;
  }

  return {
    vault,
    role:
      membership.permission,
    membership,
  };
}

async function requireVaultAccess(
  vaultId: string
): Promise<VaultAccess> {
  const user =
    await getAuthenticatedUser();

  const access =
    await getVaultAccessForUser(
      vaultId,
      user.id
    );

  if (!access) {
    throw new Error(
      "Você não possui acesso a este cofre"
    );
  }

  return access;
}

async function requireOwner(
  vaultId: string
): Promise<VaultAccess> {
  const access =
    await requireVaultAccess(
      vaultId
    );

  if (
    access.role !== "owner"
  ) {
    throw new Error(
      "Somente o proprietário pode realizar esta ação"
    );
  }

  return access;
}

async function requireMemberManager(
  vaultId: string
): Promise<VaultAccess> {
  const access =
    await requireVaultAccess(
      vaultId
    );

  if (
    access.role !== "owner" &&
    access.role !== "admin"
  ) {
    throw new Error(
      "Você não possui permissão para gerenciar membros deste cofre"
    );
  }

  return access;
}

async function requireContentEditor(
  vaultId: string
): Promise<VaultAccess> {
  const access =
    await requireVaultAccess(
      vaultId
    );

  if (
    access.role === "view"
  ) {
    throw new Error(
      "Você possui apenas permissão de visualização neste cofre"
    );
  }

  return access;
}

async function getPendingInviteForCurrentUser(
  memberId: string
): Promise<VaultMember> {
  const user =
    await getAuthenticatedUser();

  const member =
    await db.vaultMembers.get(
      memberId
    );

  if (!member) {
    throw new Error(
      "Convite não encontrado"
    );
  }

  if (
    member.status !== "pending"
  ) {
    throw new Error(
      "Este convite já foi respondido"
    );
  }

  const currentEmail =
    user.email
      ? normalizeEmail(
          user.email
        )
      : null;

  const inviteEmail =
    normalizeEmail(
      member.email
    );

  const belongsByUserId =
    Boolean(
      member.user_id &&
      member.user_id ===
        user.id
    );

  const belongsByEmail =
    Boolean(
      currentEmail &&
      inviteEmail ===
        currentEmail
    );

  if (
    !belongsByUserId &&
    !belongsByEmail
  ) {
    throw new Error(
      "Este convite não pertence ao usuário autenticado"
    );
  }

  return member;
}

async function assertNoDuplicateMemberOrInvite(
  vaultId: string,
  email: string
): Promise<void> {
  const normalizedEmail =
    normalizeEmail(email);

  const existing =
    await db.vaultMembers
      .where("vault_id")
      .equals(vaultId)
      .filter(
        (member) =>
          normalizeEmail(
            member.email
          ) ===
            normalizedEmail &&
          member.status !==
            "declined"
      )
      .first();

  if (!existing) {
    return;
  }

  if (
    existing.status ===
    "accepted"
  ) {
    throw new Error(
      "Este usuário já é membro do cofre"
    );
  }

  throw new Error(
    "Já existe um convite pendente para este e-mail"
  );
}

// ============================================================
// REPOSITORY
// ============================================================

export const vaultsRepository = {
  // ==========================================================
  // LEITURA
  // ==========================================================

  async getAll(): Promise<
    Vault[]
  > {
    const user =
      await getAuthenticatedUser();

    return db.vaults
      .where("user_id")
      .equals(user.id)
      .toArray();
  },

  async getOwnedByPerson(
    personId: string
  ): Promise<Vault[]> {
    const user =
      await getAuthenticatedUser();

    if (!personId) {
      return [];
    }

    await requireOwnedPerson(
      personId,
      user.id
    );

    return db.vaults
      .where("person_id")
      .equals(personId)
      .filter(
        (vault) =>
          vault.user_id ===
          user.id
      )
      .toArray();
  },

  async getSharedByPerson(
    personId: string
  ): Promise<Vault[]> {
    const user =
      await getAuthenticatedUser();

    if (!personId) {
      return [];
    }

    await requireOwnedPerson(
      personId,
      user.id
    );

    const memberships =
      await db.vaultMembers
        .where(
          "[user_id+person_id]"
        )
        .equals([
          user.id,
          personId,
        ])
        .filter(
          (member) =>
            member.status ===
            "accepted"
        )
        .toArray();

    if (
      memberships.length === 0
    ) {
      return [];
    }

    const vaultIds =
      Array.from(
        new Set(
          memberships
            .map(
              (member) =>
                member.vault_id
            )
            .filter(Boolean)
        )
      );

    const vaults =
      await Promise.all(
        vaultIds.map(
          (vaultId) =>
            db.vaults.get(
              vaultId
            )
        )
      );

    return vaults.filter(
      (
        vault
      ): vault is Vault =>
        Boolean(vault)
    );
  },

  async getAccessibleByPerson(
    personId: string
  ): Promise<Vault[]> {
    if (!personId) {
      return [];
    }

    const [
      owned,
      shared,
    ] = await Promise.all([
      this.getOwnedByPerson(
        personId
      ),
      this.getSharedByPerson(
        personId
      ),
    ]);

    const byId =
      new Map<
        string,
        Vault
      >();

    for (const vault of [
      ...owned,
      ...shared,
    ]) {
      if (!vault.id) {
        continue;
      }

      byId.set(
        vault.id,
        vault
      );
    }

    return Array.from(
      byId.values()
    ).sort(
      (a, b) =>
        b.updated_at.localeCompare(
          a.updated_at
        )
    );
  },

  async getById(
    id: string
  ): Promise<Vault | undefined> {
    if (!id) {
      return undefined;
    }

    const access =
      await requireVaultAccess(
        id
      );

    return access.vault;
  },

  async getAccess(
    id: string
  ): Promise<VaultAccess | null> {
    if (!id) {
      return null;
    }

    const user =
      await getAuthenticatedUser();

    return getVaultAccessForUser(
      id,
      user.id
    );
  },

  async getMembers(
    vaultId: string
  ): Promise<VaultMember[]> {
    await requireVaultAccess(
      vaultId
    );

    return db.vaultMembers
      .where("vault_id")
      .equals(vaultId)
      .sortBy("invited_at");
  },

  async getAcceptedMembers(
    vaultId: string
  ): Promise<VaultMember[]> {
    await requireVaultAccess(
      vaultId
    );

    return db.vaultMembers
      .where("vault_id")
      .equals(vaultId)
      .filter(
        (member) =>
          member.status ===
          "accepted"
      )
      .sortBy("invited_at");
  },

  async getMemberCount(
    vaultId: string
  ): Promise<number> {
    await requireVaultAccess(
      vaultId
    );

    const acceptedMembers =
      await db.vaultMembers
        .where("vault_id")
        .equals(vaultId)
        .filter(
          (member) =>
            member.status ===
            "accepted"
        )
        .count();

    return (
      acceptedMembers + 1
    );
  },

  async getDocuments(
    vaultId: string
  ): Promise<Document[]> {
    await requireVaultAccess(
      vaultId
    );

    return db.documents
      .where("vault_id")
      .equals(vaultId)
      .toArray();
  },

  async getPendingInvitesForCurrentUser(): Promise<
    VaultMember[]
  > {
    const email =
      await getAuthenticatedUserEmail();

    if (!email) {
      return [];
    }

    return db.vaultMembers
      .where(
        "[email+status]"
      )
      .equals([
        email,
        "pending",
      ])
      .toArray();
  },

  // ==========================================================
  // VAULT CRUD
  // ==========================================================

  async create(
    data: VaultCreateInput
  ): Promise<string> {
    const user =
      await getAuthenticatedUser();

    const personId =
      data.person_id.trim();

    const name =
      data.name.trim();

    if (!personId) {
      throw new Error(
        "Pessoa ativa é obrigatória para criar um cofre"
      );
    }

    if (!name) {
      throw new Error(
        "Nome do cofre é obrigatório"
      );
    }

    await requireOwnedPerson(
      personId,
      user.id
    );

    const now =
      nowIso();

    const vaultId =
      createId();

    const vaultCompleto: Vault = {
      id: vaultId,
      user_id: user.id,
      person_id: personId,
      name,
      description:
        normalizeOptionalText(
          data.description
        ),
      icon:
        data.icon.trim() ||
        "lock",
      color:
        normalizeColor(
          data.color
        ),
      created_at: now,
      updated_at: now,
      synced: false,
    };

    await db.transaction(
      "rw",
      [
        db.vaults,
        db.syncQueue,
      ],
      async () => {
        await db.vaults.add(
          vaultCompleto
        );

        await enfileirarOperacao(
          "vaults",
          "add",
          vaultCompleto
        );
      }
    );

    return vaultId;
  },

  async update(
    id: string,
    data: VaultUpdateInput
  ): Promise<string> {
    const { vault } =
      await requireOwner(id);

    const payload: Partial<Vault> = {
      updated_at:
        nowIso(),
      synced: false,
    };

    if (
      data.name !== undefined
    ) {
      const name =
        data.name.trim();

      if (!name) {
        throw new Error(
          "Nome do cofre é obrigatório"
        );
      }

      payload.name =
        name;
    }

    if (
      data.description !==
      undefined
    ) {
      payload.description =
        normalizeOptionalText(
          data.description
        );
    }

    if (
      data.icon !== undefined
    ) {
      const icon =
        data.icon.trim();

      if (!icon) {
        throw new Error(
          "Ícone do cofre é obrigatório"
        );
      }

      payload.icon =
        icon;
    }

    if (
      data.color !== undefined
    ) {
      payload.color =
        normalizeColor(
          data.color
        );
    }

    await db.transaction(
      "rw",
      [
        db.vaults,
        db.syncQueue,
      ],
      async () => {
        await db.vaults.update(
          vault.id!,
          payload
        );

        const updated =
          await db.vaults.get(
            vault.id!
          );

        if (!updated) {
          throw new Error(
            "Falha ao recuperar cofre atualizado"
          );
        }

        await enfileirarOperacao(
          "vaults",
          "update",
          updated
        );
      }
    );

    return id;
  },

  async delete(
    id: string
  ): Promise<string> {
    const { vault } =
      await requireOwner(id);

    const members =
      await db.vaultMembers
        .where("vault_id")
        .equals(id)
        .toArray();

    const documents =
      await db.documents
        .where("vault_id")
        .equals(id)
        .toArray();

    await db.transaction(
      "rw",
      [
        db.vaults,
        db.vaultMembers,
        db.documents,
        db.syncQueue,
      ],
      async () => {
        for (
          const document of documents
        ) {
          if (!document.id) {
            continue;
          }

          const updatedDocument: Document =
            {
              ...document,
              vault_id:
                undefined,
              updated_at:
                nowIso(),
              synced:
                false,
            };

          await db.documents.put(
            updatedDocument
          );

          await enfileirarOperacao(
            "documents",
            "update",
            updatedDocument
          );
        }

        for (
          const member of members
        ) {
          if (!member.id) {
            continue;
          }

          await db.vaultMembers.delete(
            member.id
          );

          await enfileirarOperacao(
            "vaultMembers",
            "delete",
            {
              id: member.id,
            }
          );
        }

        await db.vaults.delete(
          vault.id!
        );

        await enfileirarOperacao(
          "vaults",
          "delete",
          {
            id: vault.id!,
          }
        );
      }
    );

    return id;
  },

  // ==========================================================
  // MEMBERS / CONVITES
  // ==========================================================

  async addMember(
    data: VaultMemberInviteInput
  ): Promise<string> {
    const user =
      await getAuthenticatedUser();

    await requireMemberManager(
      data.vault_id
    );

    const email =
      normalizeEmail(
        data.email
      );

    if (!email) {
      throw new Error(
        "E-mail do convidado é obrigatório"
      );
    }

    const simpleEmailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !simpleEmailPattern.test(
        email
      )
    ) {
      throw new Error(
        "Informe um e-mail válido"
      );
    }

    const currentEmail =
      user.email
        ? normalizeEmail(
            user.email
          )
        : null;

    if (
      currentEmail &&
      currentEmail === email
    ) {
      throw new Error(
        "Você não pode convidar a si mesmo"
      );
    }

    await assertNoDuplicateMemberOrInvite(
      data.vault_id,
      email
    );

    const now =
      nowIso();

    const memberId =
      createId();

    const memberCompleto: VaultMember =
      {
        id: memberId,
        vault_id:
          data.vault_id,
        email,
        name:
          normalizeOptionalText(
            data.name
          ),
        permission:
          data.permission,
        invited_by:
          user.id,
        status:
          "pending",
        invited_at:
          now,
        created_at:
          now,
        updated_at:
          now,
        synced:
          false,
      };

    await db.transaction(
      "rw",
      [
        db.vaultMembers,
        db.syncQueue,
      ],
      async () => {
        await db.vaultMembers.add(
          memberCompleto
        );

        await enfileirarOperacao(
          "vaultMembers",
          "add",
          memberCompleto
        );
      }
    );

    return memberId;
  },

  async updateMemberPermission(
    id: string,
    data: VaultMemberPermissionInput
  ): Promise<string> {
    const existing =
      await db.vaultMembers.get(
        id
      );

    if (!existing) {
      throw new Error(
        "Membro do cofre não encontrado"
      );
    }

    await requireMemberManager(
      existing.vault_id
    );

    if (
      existing.status !==
      "accepted"
    ) {
      throw new Error(
        "A permissão só pode ser alterada após o convite ser aceito"
      );
    }

    const payload: Partial<VaultMember> =
      {
        permission:
          data.permission,
        updated_at:
          nowIso(),
        synced:
          false,
      };

    await db.transaction(
      "rw",
      [
        db.vaultMembers,
        db.syncQueue,
      ],
      async () => {
        await db.vaultMembers.update(
          id,
          payload
        );

        const updated =
          await db.vaultMembers.get(
            id
          );

        if (!updated) {
          throw new Error(
            "Falha ao recuperar membro atualizado"
          );
        }

        await enfileirarOperacao(
          "vaultMembers",
          "update",
          updated
        );
      }
    );

    return id;
  },

  async respondToInvite(
    id: string,
    data: VaultInvitationResponseInput
  ): Promise<string> {
    const user =
      await getAuthenticatedUser();

    const member =
      await getPendingInviteForCurrentUser(
        id
      );

    let personId:
      | string
      | undefined;

    if (
      data.status ===
      "accepted"
    ) {
      personId =
        data.person_id?.trim();

      if (!personId) {
        throw new Error(
          "Selecione uma pessoa para associar este cofre"
        );
      }

      await requireOwnedPerson(
        personId,
        user.id
      );
    }

    const payload: Partial<VaultMember> =
      {
        status:
          data.status,

        user_id:
          user.id,

        person_id:
          data.status ===
          "accepted"
            ? personId
            : undefined,

        updated_at:
          nowIso(),

        synced:
          false,
      };

    await db.transaction(
      "rw",
      [
        db.vaultMembers,
        db.syncQueue,
      ],
      async () => {
        await db.vaultMembers.update(
          member.id!,
          payload
        );

        const updated =
          await db.vaultMembers.get(
            member.id!
          );

        if (!updated) {
          throw new Error(
            "Falha ao recuperar convite atualizado"
          );
        }

        await enfileirarOperacao(
          "vaultMembers",
          "update",
          updated
        );
      }
    );

    return id;
  },

  async deleteMember(
    id: string
  ): Promise<string> {
    const existing =
      await db.vaultMembers.get(
        id
      );

    if (!existing) {
      throw new Error(
        "Membro do cofre não encontrado"
      );
    }

    await requireMemberManager(
      existing.vault_id
    );

    await db.transaction(
      "rw",
      [
        db.vaultMembers,
        db.syncQueue,
      ],
      async () => {
        await db.vaultMembers.delete(
          id
        );

        await enfileirarOperacao(
          "vaultMembers",
          "delete",
          {
            id,
          }
        );
      }
    );

    return id;
  },

  // ==========================================================
  // DOCUMENTOS DO COFRE
  // ==========================================================

  async shareDocument(
    documentId: string,
    vaultId: string
  ): Promise<void> {
    const user =
      await getAuthenticatedUser();

    const access =
      await requireContentEditor(
        vaultId
      );

    const document =
      await db.documents.get(
        documentId
      );

    if (!document) {
      throw new Error(
        "Documento não encontrado"
      );
    }

    /**
     * Mesmo em Vault compartilhado, o usuário só pode
     * vincular ao Vault um documento que pertence à própria
     * conta.
     *
     * A RLS do Supabase protege a nuvem, mas mantemos a mesma
     * regra localmente para não enfileirar mutação indevida.
     */
    if (
      document.user_id !==
      user.id
    ) {
      throw new Error(
        "Você só pode compartilhar documentos da sua própria conta"
      );
    }

    /**
     * Para Vault próprio, também garantimos que documento e
     * Vault pertençam à mesma Person.
     */
    if (
      access.role === "owner" &&
      document.person_id !==
        access.vault.person_id
    ) {
      throw new Error(
        "O documento não pertence à mesma pessoa deste cofre"
      );
    }

    const updated: Document = {
      ...document,
      vault_id:
        vaultId,
      updated_at:
        nowIso(),
      synced:
        false,
    };

    await db.transaction(
      "rw",
      [
        db.documents,
        db.syncQueue,
      ],
      async () => {
        await db.documents.put(
          updated
        );

        await enfileirarOperacao(
          "documents",
          "update",
          updated
        );
      }
    );
  },

  async unshareDocument(
    documentId: string,
    vaultId: string
  ): Promise<void> {
    const user =
      await getAuthenticatedUser();

    await requireContentEditor(
      vaultId
    );

    const document =
      await db.documents.get(
        documentId
      );

    if (!document) {
      throw new Error(
        "Documento não encontrado"
      );
    }

    if (
      document.user_id !==
      user.id
    ) {
      throw new Error(
        "Você só pode remover do cofre documentos da sua própria conta"
      );
    }

    if (
      document.vault_id !==
      vaultId
    ) {
      return;
    }

    const updated: Document = {
      ...document,
      vault_id:
        undefined,
      updated_at:
        nowIso(),
      synced:
        false,
    };

    await db.transaction(
      "rw",
      [
        db.documents,
        db.syncQueue,
      ],
      async () => {
        await db.documents.put(
          updated
        );

        await enfileirarOperacao(
          "documents",
          "update",
          updated
        );
      }
    );
  },
};