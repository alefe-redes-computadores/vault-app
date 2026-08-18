// hooks/usePaginatedCards.ts

"use client";

import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cardsRepository } from "@/lib/repositories/cards";
import { useAuth } from "./useAuth";
import type { BankCard } from "@/lib/types";

const PAGE_SIZE = 20;

const CONTA_TYPES = ["conta_corrente", "conta_poupanca", "conta_digital"];
const CARTAO_TYPES = ["cartao_credito", "cartao_debito"];

interface UsePaginatedCardsOptions {
  searchQuery?: string;
  selectedType?: string;
  initialPage?: number;
}

export function usePaginatedCards({
  searchQuery = "",
  selectedType = "all",
  initialPage = 1,
}: UsePaginatedCardsOptions = {}) {
  const { user } = useAuth();
  const [page, setPage] = useState(initialPage);
  const [allLoaded, setAllLoaded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const totalCount = useLiveQuery(
    async () => {
      if (!user) return 0;
      // CORRIGIDO: db.bankCards em vez de db.cards
      let allCards = await db.bankCards.where("user_id").equals(user.id).toArray();

      allCards = applyTypeFilter(allCards, selectedType);

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        allCards = allCards.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.bank_name.toLowerCase().includes(q)
        );
      }
      return allCards.length;
    },
    [user?.id, selectedType, searchQuery],
    0
  );

  const cards = useLiveQuery(
    async () => {
      if (!user) return [];
      // CORRIGIDO: db.bankCards em vez de db.cards
      let allCards = await db.bankCards.where("user_id").equals(user.id).toArray();

      allCards = applyTypeFilter(allCards, selectedType);

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        allCards = allCards.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.bank_name.toLowerCase().includes(q)
        );
      }

      allCards.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const end = page * PAGE_SIZE;
      const paginated = allCards.slice(0, end);

      setAllLoaded(paginated.length >= allCards.length);

      return paginated;
    },
    [user?.id, selectedType, searchQuery, page],
    []
  );

  const loadMore = useCallback(() => {
    if (!allLoaded && !isLoadingMore) {
      setIsLoadingMore(true);
      setPage((prev) => prev + 1);
    }
  }, [allLoaded, isLoadingMore]);

  useEffect(() => {
    setIsLoadingMore(false);
  }, [cards]);

  const reset = useCallback(() => {
    setPage(1);
    setAllLoaded(false);
  }, []);

  useEffect(() => {
    reset();
  }, [searchQuery, selectedType, reset]);

  const addCard = async (cardData: Omit<BankCard, "id" | "user_id" | "created_at" | "updated_at" | "synced">) => {
    if (!user) throw new Error("Usuário não autenticado");
    return cardsRepository.create({ ...cardData, user_id: user.id });
  };

  const updateCard = async (id: string, changes: Partial<BankCard>) => {
    await cardsRepository.update(id, changes);
  };

  const deleteCard = async (id: string) => {
    await cardsRepository.delete(id);
  };

  const hasMore = !allLoaded && (cards?.length || 0) < (totalCount || 0);

  return {
    cards: cards || [],
    totalCount: totalCount || 0,
    hasMore,
    isLoadingMore,
    loadMore,
    addCard,
    updateCard,
    deleteCard,
  };
}

function applyTypeFilter(allCards: BankCard[], selectedType: string): BankCard[] {
  if (selectedType === "cartoes") {
    return allCards.filter((item) => CARTAO_TYPES.includes(item.type));
  }

  if (selectedType === "contas") {
    return allCards.filter((item) => CONTA_TYPES.includes(item.type));
  }

  if (selectedType !== "all") {
    return allCards.filter((item) => item.type === selectedType);
  }

  return allCards;
}