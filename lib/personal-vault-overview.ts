import type { BankCard, Credential, Document } from "./types";

export interface PersonalVaultOverview {
  credentials: number;
  cards: number;
  accounts: number;
  favoriteDocuments: number;
  total: number;
}

const cardTypes = new Set(["cartao_credito", "cartao_debito"]);
const accountTypes = new Set(["conta_corrente", "conta_poupanca", "conta_digital"]);

export function belongsToActiveVault(
  row: { user_id?: string | null; person_id?: string | null },
  userId: string,
  personId: string
): boolean {
  return row.user_id === userId && row.person_id === personId;
}

export function summarizePersonalVault(
  userId: string,
  personId: string,
  credentials: Credential[],
  bankCards: BankCard[],
  documents: Document[]
): PersonalVaultOverview {
  const ownedCredentials = credentials.filter((row) =>
    belongsToActiveVault(row, userId, personId)
  );
  const ownedCards = bankCards.filter((row) =>
    belongsToActiveVault(row, userId, personId)
  );
  const ownedDocuments = documents.filter((row) =>
    belongsToActiveVault(row, userId, personId)
  );

  const cards = ownedCards.filter((row) => cardTypes.has(row.type)).length;
  const accounts = ownedCards.filter((row) => accountTypes.has(row.type)).length;
  const favoriteDocuments = ownedDocuments.filter((row) => row.is_favorite).length;

  return {
    credentials: ownedCredentials.length,
    cards,
    accounts,
    favoriteDocuments,
    total: ownedCredentials.length + cards + accounts + favoriteDocuments,
  };
}
