// lib/repositories/credentials.ts

import { db } from "../db";
import { enfileirarOperacao } from "../sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import { encryptPassword } from "@/lib/crypto";

import type {
  Credential,
  Person,
} from "../types";

// ============================================================
// TIPOS
// ============================================================

export type CredentialCategory =
  | "banco"
  | "social"
  | "trabalho"
  | "outros";

export interface CredentialPasswordHistoryItem {
  encrypted: string;
  date: string;
}

export interface CredentialCreateInput {
  person_id: string;
  vault_id?: string;
  title: string;
  username?: string;
  password_plain: string;
  url?: string;
  notes?: string;
  category: CredentialCategory;
  password_history?: CredentialPasswordHistoryItem[];
}

export interface CredentialUpdateInput {
  /**
   * person_id não faz parte do fluxo normal de edição.
   *
   * Caso seja informado por algum fluxo futuro de transferência,
   * ele será validado e nunca poderá ser vazio.
   */
  person_id?: string;

  vault_id?: string;
  title?: string;
  username?: string;
  password_plain?: string;
  url?: string;
  notes?: string;
  category?: CredentialCategory;
  password_history?: CredentialPasswordHistoryItem[];
}

// ============================================================
// HELPERS
// ============================================================

function normalizeOptionalString(
  value: string | undefined
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
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

async function getAuthenticatedUserId(): Promise<string> {
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

  return user.id;
}

async function getOwnedPerson(
  personId: string,
  userId: string
): Promise<Person> {
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
      "Acesso negado à pessoa selecionada"
    );
  }

  return person;
}

async function getOwnedCredential(
  credentialId: string,
  userId: string,
  expectedPersonId: string
): Promise<Credential> {
  if (!credentialId) {
    throw new Error(
      "ID da credencial é obrigatório"
    );
  }

  const credential =
    await db.credentials.get(
      credentialId
    );

  if (!credential) {
    throw new Error(
      "Credencial não encontrada"
    );
  }

  if (
    credential.user_id !== userId
  ) {
    throw new Error(
      "Acesso negado"
    );
  }

  if (
    credential.person_id !==
    expectedPersonId
  ) {
    throw new Error(
      "A credencial não pertence à pessoa ativa"
    );
  }

  return credential;
}

// ============================================================
// REPOSITORY
// ============================================================

export const credentialsRepository = {
  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data: CredentialCreateInput
  ): Promise<Credential> {
    const userId =
      await getAuthenticatedUserId();

    const personId =
      data.person_id.trim();

    await getOwnedPerson(
      personId,
      userId
    );

    const title =
      data.title.trim();

    if (!title) {
      throw new Error(
        "O título da credencial é obrigatório"
      );
    }

    if (!data.password_plain) {
      throw new Error(
        "A senha da credencial é obrigatória"
      );
    }

    const now =
      new Date().toISOString();

    const credential: Credential = {
      id: createId(),
      user_id: userId,
      person_id: personId,
      vault_id:
        normalizeOptionalString(
          data.vault_id
        ),
      title,
      username:
        normalizeOptionalString(
          data.username
        ),
      password_encrypted:
        encryptPassword(
          data.password_plain
        ),
      url:
        normalizeOptionalString(
          data.url
        ),
      notes:
        normalizeOptionalString(
          data.notes
        ),
      category: data.category,
      password_history:
        data.password_history?.length
          ? data.password_history
          : undefined,
      created_at: now,
      updated_at: now,
      synced: false,
    };

    await db.transaction(
      "rw",
      [
        db.credentials,
        db.syncQueue,
      ],
      async () => {
        await db.credentials.add(
          credential
        );

        await enfileirarOperacao(
          "credentials",
          "add",
          credential
        );
      }
    );

    return credential;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    personId: string,
    data: CredentialUpdateInput
  ): Promise<Credential> {
    const userId =
      await getAuthenticatedUserId();

    await getOwnedPerson(
      personId,
      userId
    );

    const existing =
      await getOwnedCredential(
        id,
        userId,
        personId
      );

    if (
      data.title !== undefined &&
      !data.title.trim()
    ) {
      throw new Error(
        "O título da credencial é obrigatório"
      );
    }

    if (
      data.password_plain !== undefined &&
      !data.password_plain
    ) {
      throw new Error(
        "A senha da credencial é obrigatória"
      );
    }

    let nextPersonId =
      existing.person_id;

    if (
      data.person_id !== undefined
    ) {
      const requestedPersonId =
        data.person_id.trim();

      if (!requestedPersonId) {
        throw new Error(
          "A pessoa da credencial não pode ser removida"
        );
      }

      await getOwnedPerson(
        requestedPersonId,
        userId
      );

      nextPersonId =
        requestedPersonId;
    }

    const now =
      new Date().toISOString();

    const updated: Credential = {
      ...existing,

      person_id:
        nextPersonId,

      ...(data.vault_id !== undefined
        ? {
            vault_id:
              normalizeOptionalString(
                data.vault_id
              ),
          }
        : {}),

      ...(data.title !== undefined
        ? {
            title:
              data.title.trim(),
          }
        : {}),

      ...(data.username !== undefined
        ? {
            username:
              normalizeOptionalString(
                data.username
              ),
          }
        : {}),

      ...(data.password_plain !== undefined
        ? {
            password_encrypted:
              encryptPassword(
                data.password_plain
              ),
          }
        : {}),

      ...(data.url !== undefined
        ? {
            url:
              normalizeOptionalString(
                data.url
              ),
          }
        : {}),

      ...(data.notes !== undefined
        ? {
            notes:
              normalizeOptionalString(
                data.notes
              ),
          }
        : {}),

      ...(data.category !== undefined
        ? {
            category:
              data.category,
          }
        : {}),

      ...(data.password_history !== undefined
        ? {
            password_history:
              data.password_history.length
                ? data.password_history
                : undefined,
          }
        : {}),

      updated_at: now,
      synced: false,
    };

    await db.transaction(
      "rw",
      [
        db.credentials,
        db.syncQueue,
      ],
      async () => {
        await db.credentials.put(
          updated
        );

        await enfileirarOperacao(
          "credentials",
          "update",
          updated
        );
      }
    );

    return updated;
  },

  // ==========================================================
  // DELETE
  // ==========================================================

  async delete(
    id: string,
    personId: string
  ): Promise<void> {
    const userId =
      await getAuthenticatedUserId();

    await getOwnedPerson(
      personId,
      userId
    );

    await getOwnedCredential(
      id,
      userId,
      personId
    );

    await db.transaction(
      "rw",
      [
        db.credentials,
        db.syncQueue,
      ],
      async () => {
        await db.credentials.delete(
          id
        );

        await enfileirarOperacao(
          "credentials",
          "delete",
          { id }
        );
      }
    );
  },

  // ==========================================================
  // GET ALL DA PESSOA
  // ==========================================================

  async getAll(
    personId: string
  ): Promise<Credential[]> {
    const userId =
      await getAuthenticatedUserId();

    await getOwnedPerson(
      personId,
      userId
    );

    const credentials =
      await db.credentials
        .where("person_id")
        .equals(personId)
        .toArray();

    return credentials.filter(
      (credential) =>
        credential.user_id ===
        userId
    );
  },

  // ==========================================================
  // GET BY ID
  // ==========================================================

  async getById(
    id: string,
    personId: string
  ): Promise<Credential | null> {
    const userId =
      await getAuthenticatedUserId();

    try {
      await getOwnedPerson(
        personId,
        userId
      );

      return await getOwnedCredential(
        id,
        userId,
        personId
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (
          error.message ===
            "Credencial não encontrada" ||
          error.message ===
            "Acesso negado" ||
          error.message ===
            "A credencial não pertence à pessoa ativa"
        )
      ) {
        return null;
      }

      throw error;
    }
  },
};