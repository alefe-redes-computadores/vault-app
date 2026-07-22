"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [allLoaded, setAllLoaded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Busca total de favoritos com os filtros
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

  // Busca apenas os favoritos da página atual
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
      
      let docs = await query.toArray();
      
      // Ordenar por data de criação (mais recentes primeiro)
      docs.sort((a: Document, b: Document) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // Paginar
      const start = 0;
      const end = page * PAGE_SIZE;
      const paginated = docs.slice(start, end);
      
      // Verificar se carregou todos
      if (paginated.length >= docs.length) {
        setAllLoaded(true);
      } else {
        setAllLoaded(false);
      }
      
      return paginated;
    },
    [user?.id, personId, categoryId, page],
    []
  );

  const loadMore = useCallback(() => {
    if (!allLoaded && !isLoadingMore) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
      setTimeout(() => setIsLoadingMore(false), 100);
    }
  }, [allLoaded, isLoadingMore]);

  const reset = useCallback(() => {
    setPage(1);
    setAllLoaded(false);
  }, []);

  useEffect(() => {
    reset();
  }, [personId, categoryId, reset]);

  const hasMore = !allLoaded && (favorites?.length || 0) < (totalCount || 0);

  return {
    favorites: favorites || [],
    totalCount: totalCount || 0,
    page,
    hasMore,
    isLoadingMore,
    loadMore,
    reset,
    allLoaded,
  };
}