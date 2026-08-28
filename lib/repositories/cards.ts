// lib/repositories/cards.ts

import { db } from "../db";
import { enfileirarOperacao } from "../sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import { encryptPassword } from "@/lib/crypto";

import type {
  BankCard,
  CardBrand,
  CardType,
  Person,
} from "../types";

// ============================================================
// TIPOS
// ============================================================

export interface CardCreateInput {
  person_id: string;

  title: string;
  bank_name: string;
  type: CardType;

  card_number?: string;
  card_holder?: string;
  brand?: CardBrand;
  expiry_date?: string;
  cvv?: string;

  agency?: string;
  account?: string;
  notes?: string;
}

export interface CardUpdateInput {
  /**
   * person_id não deve ser removido.
   *
   * Caso algum fluxo futuro permita transferência entre
   * Persons, o novo valor ainda será validado pelo repository.
   */
  person_id?: string;

  title?: string;
  bank_name?: string;
  type?: CardType;

  card_number?: string;
  card_holder?: string;
  brand?: CardBrand;
  expiry_date?: string;
  cvv?: string;

  agency?: string;
  account?: string;
  notes?: string;
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

async function getOwnedCard(
  cardId: string,
  userId: string,
  expectedPersonId: string
): Promise<BankCard> {
  if (!cardId) {
    throw new Error(
      "ID do cartão é obrigatório"
    );
  }

  const card =
    await db.bankCards.get(
      cardId
    );

  if (!card) {
    throw new Error(
      "Cartão não encontrado"
    );
  }

  if (
    card.user_id !== userId
  ) {
    throw new Error(
      "Acesso negado"
    );
  }

  if (
    card.person_id !==
    expectedPersonId
  ) {
    throw new Error(
      "O cartão não pertence à pessoa ativa"
    );
  }

  return card;
}

// ============================================================
// REPOSITORY
// ============================================================

export const cardsRepository = {
  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data: CardCreateInput
  ): Promise<BankCard> {
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

    const bankName =
      data.bank_name.trim();

    if (!title) {
      throw new Error(
        "Título do cartão é obrigatório"
      );
    }

    if (!bankName) {
      throw new Error(
        "Nome do banco é obrigatório"
      );
    }

    const now =
      new Date().toISOString();

    const card: BankCard = {
      id: createId(),
      user_id: userId,
      person_id: personId,

      title,
      bank_name: bankName,
      type: data.type,

      card_number_encrypted:
        data.card_number?.trim()
          ? encryptPassword(
              data.card_number.trim()
            )
          : undefined,

      card_holder:
        normalizeOptionalString(
          data.card_holder
        ),

      brand:
        data.brand,

      expiry_date:
        normalizeOptionalString(
          data.expiry_date
        ),

      cvv_encrypted:
        data.cvv?.trim()
          ? encryptPassword(
              data.cvv.trim()
            )
          : undefined,

      agency:
        normalizeOptionalString(
          data.agency
        ),

      account:
        normalizeOptionalString(
          data.account
        ),

      notes:
        normalizeOptionalString(
          data.notes
        ),

      created_at: now,
      updated_at: now,
      synced: false,
    };

    await db.transaction(
      "rw",
      [
        db.bankCards,
        db.syncQueue,
      ],
      async () => {
        await db.bankCards.add(
          card
        );

        await enfileirarOperacao(
          "cards",
          "add",
          card
        );
      }
    );

    return card;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    personId: string,
    data: CardUpdateInput
  ): Promise<BankCard> {
    const userId =
      await getAuthenticatedUserId();

    await getOwnedPerson(
      personId,
      userId
    );

    const existing =
      await getOwnedCard(
        id,
        userId,
        personId
      );

    if (
      data.title !== undefined &&
      !data.title.trim()
    ) {
      throw new Error(
        "Título do cartão é obrigatório"
      );
    }

    if (
      data.bank_name !== undefined &&
      !data.bank_name.trim()
    ) {
      throw new Error(
        "Nome do banco é obrigatório"
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
          "A pessoa do cartão não pode ser removida"
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

    const updated: BankCard = {
      ...existing,

      person_id:
        nextPersonId,

      ...(data.title !== undefined
        ? {
            title:
              data.title.trim(),
          }
        : {}),

      ...(data.bank_name !== undefined
        ? {
            bank_name:
              data.bank_name.trim(),
          }
        : {}),

      ...(data.type !== undefined
        ? {
            type:
              data.type,
          }
        : {}),

      ...(data.card_number !== undefined
        ? {
            card_number_encrypted:
              data.card_number.trim()
                ? encryptPassword(
                    data.card_number.trim()
                  )
                : undefined,
          }
        : {}),

      ...(data.card_holder !== undefined
        ? {
            card_holder:
              normalizeOptionalString(
                data.card_holder
              ),
          }
        : {}),

      ...(data.brand !== undefined
        ? {
            brand:
              data.brand,
          }
        : {}),

      ...(data.expiry_date !== undefined
        ? {
            expiry_date:
              normalizeOptionalString(
                data.expiry_date
              ),
          }
        : {}),

      ...(data.cvv !== undefined
        ? {
            cvv_encrypted:
              data.cvv.trim()
                ? encryptPassword(
                    data.cvv.trim()
                  )
                : undefined,
          }
        : {}),

      ...(data.agency !== undefined
        ? {
            agency:
              normalizeOptionalString(
                data.agency
              ),
          }
        : {}),

      ...(data.account !== undefined
        ? {
            account:
              normalizeOptionalString(
                data.account
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

      updated_at: now,
      synced: false,
    };

    await db.transaction(
      "rw",
      [
        db.bankCards,
        db.syncQueue,
      ],
      async () => {
        await db.bankCards.put(
          updated
        );

        await enfileirarOperacao(
          "cards",
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

    await getOwnedCard(
      id,
      userId,
      personId
    );

    await db.transaction(
      "rw",
      [
        db.bankCards,
        db.syncQueue,
      ],
      async () => {
        await db.bankCards.delete(
          id
        );

        await enfileirarOperacao(
          "cards",
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
  ): Promise<BankCard[]> {
    const userId =
      await getAuthenticatedUserId();

    await getOwnedPerson(
      personId,
      userId
    );

    const cards =
      await db.bankCards
        .where("person_id")
        .equals(personId)
        .toArray();

    return cards.filter(
      (card) =>
        card.user_id === userId
    );
  },

  // ==========================================================
  // GET BY ID
  // ==========================================================

  async getById(
    id: string,
    personId: string
  ): Promise<BankCard | null> {
    const userId =
      await getAuthenticatedUserId();

    try {
      await getOwnedPerson(
        personId,
        userId
      );

      return await getOwnedCard(
        id,
        userId,
        personId
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (
          error.message ===
            "Cartão não encontrado" ||
          error.message ===
            "Acesso negado" ||
          error.message ===
            "O cartão não pertence à pessoa ativa"
        )
      ) {
        return null;
      }

      throw error;
    }
  },
};