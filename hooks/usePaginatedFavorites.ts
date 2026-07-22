"use client";

import { useState, useCallback, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";
import type { CategoryId, Document } from "@/lib/types";

const PAGE_SIZE = 20;

interface UsePaginatedFavoritesOptions {
  personId?: string;
  categoryId?: CategoryId;
  initialPage?: number;
}

export function usePaginatedFavorites({
  personId,
  categoryId,
  initialPage = 1,
}: UsePaginatedFavoritesOptions = {}) {
  const { user } = useAuth();
  const [page, setPage] = useState(initialPage);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Total de favoritos que batem com os filtros (sem paginar)
  const totalCount = useLiveQuery(
    async () => {
      if (!user) return 0;

      let query = db.documents
        .where('user_id')
        .equals(user.id)
        .and((doc: Document) => doc.is_favorite === true);

      if (personId) {
        query = query.and((doc: Document) => doc.person_id === personId);
      }
      if (categoryId) {
        query = query.and((doc: Document) => doc.category_id === categoryId);
      }

      return query.count();
    },
    [user?.id, personId, categoryId],
    0
  );

  // Favoritos da página atual (sem efeito colateral aqui dentro —
  // apenas busca e retorna, sem setState)
  const favorites = useLiveQuery(
    async () => {
      if (!user) return [];

      let query = db.documents
        .where('user_id')
        .equals(user.id)
        .and((doc: Document) => doc.is_favorite === true);

      if (personId) {
        query = query.and((doc: Document) => doc.person_id === personId);
      }
      if (categoryId) {
        query = query.and((doc: Document) => doc.category_id === categoryId);
      }

      const docs = await query.toArray();

      docs.sort((a: Document, b: Document) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return docs.slice(0, page * PAGE_SIZE);
    },
    [user?.id, personId, categoryId, page],
    []
  );

  // allLoaded/hasMore são valores DERIVADOS — calculados no render,
  // nunca defasados em relação ao que está na tela.
  const loadedCount = favorites?.length || 0;
  const total = totalCount || 0;
  const allLoaded = total > 0 && loadedCount >= total;
  const hasMore = !allLoaded;

  const loadMore = useCallback(() => {
    if (allLoaded || isLoadingMore) return;
    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  }, [allLoaded, isLoadingMore]);

  // Libera o "carregando" assim que a página de fato aumentou de tamanho
  // (em vez de um setTimeout arbitrário desligado do carregamento real)
  useEffect(() => {
    if (isLoadingMore) {
      setIsLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  useEffect(() => {
    reset();
  }, [personId, categoryId, reset]);

  return {
    favorites: favorites || [],
    totalCount: total,
    page,
    hasMore,
    isLoadingMore,
    loadMore,
    reset,
    allLoaded,
  };
}
