"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddCard, safeUpdateCard, safeDeleteCard } from "@/lib/db";
import { useAuth } from "./useAuth";
import type { BankCard } from "@/lib/types";

const PAGE_SIZE = 20;

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

  // Contagem total considerando filtros
  const totalCount = useLiveQuery(
    async () => {
      if (!user) return 0;
      let allCards = await db.cards.toArray();

      if (selectedType !== "all") {
        allCards = allCards.filter((item: BankCard) => item.type === selectedType);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        allCards = allCards.filter((item: BankCard) =>
          item.title.toLowerCase().includes(q) ||
          item.bank_name.toLowerCase().includes(q)
        );
      }
      return allCards.length;
    },
    [user?.id, selectedType, searchQuery],
    0
  );

  // Listagem paginada e reativa
  const cards = useLiveQuery(
    async () => {
      if (!user) return [];
      let allCards = await db.cards.toArray();

      if (selectedType !== "all") {
        allCards = allCards.filter((item: BankCard) => item.type === selectedType);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        allCards = allCards.filter((item: BankCard) =>
          item.title.toLowerCase().includes(q) ||
          item.bank_name.toLowerCase().includes(q)
        );
      }

      // Ordenar por data decrescente (mais recentes primeiro)
      allCards.sort((a: BankCard, b: BankCard) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const end = page * PAGE_SIZE;
      const paginated = allCards.slice(0, end);

      if (paginated.length >= allCards.length) {
        setAllLoaded(true);
      } else {
        setAllLoaded(false);
      }

      return paginated;
    },
    [user?.id, selectedType, searchQuery, page],
    []
  );

  const loadMore = useCallback(() => {
    if (!allLoaded && !isLoadingMore) {
      setIsLoadingMore(true);
      setPage((prev) => prev + 1);
      setTimeout(() => setIsLoadingMore(false), 100);
    }
  }, [allLoaded, isLoadingMore]);

  const reset = useCallback(() => {
    setPage(1);
    setAllLoaded(false);
  }, []);

  useEffect(() => {
    reset();
  }, [searchQuery, selectedType, reset]);

  const addCard = async (cardData: Omit<BankCard, "id" | "user_id" | "created_at" | "updated_at" | "synced">) => {
    if (!user) throw new Error("Usuário não autenticado");
    return await safeAddCard({ ...cardData, user_id: user.id });
  };

  const updateCard = async (id: string, changes: Partial<BankCard>) => {
    await safeUpdateCard(id, changes);
  };

  const deleteCard = async (id: string) => {
    await safeDeleteCard(id);
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
