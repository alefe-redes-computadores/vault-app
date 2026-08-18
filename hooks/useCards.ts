// hooks/useCards.ts

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cardsRepository } from "@/lib/repositories/cards";
import { useAuth } from "@/hooks/useAuth";
import type { BankCard } from "@/lib/types";

export function useCards() {
  const { user } = useAuth();

  const cards = useLiveQuery(
    () => db.bankCards.where("user_id").equals(user?.id || "").toArray(),
    [user?.id],
    []
  );

  const addCard = async (data: Omit<BankCard, "id" | "user_id" | "created_at" | "updated_at" | "synced">) => {
    if (!user) throw new Error("Usuário não autenticado");
    return cardsRepository.create(data, user.id);
  };

  const updateCard = async (
    id: string,
    data: Partial<Omit<BankCard, "id" | "user_id" | "created_at" | "updated_at" | "synced">>
  ) => {
    if (!user) throw new Error("Usuário não autenticado");
    return cardsRepository.update(id, data, user.id);
  };

  const deleteCard = async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    return cardsRepository.delete(id, user.id);
  };

  const getCard = async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    return cardsRepository.getById(id, user.id);
  };

  return {
    cards: cards || [],
    addCard,
    updateCard,
    deleteCard,
    getCard,
  };
}