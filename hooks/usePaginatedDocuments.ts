"use client";

import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";
import type { CategoryId, Document } from "@/lib/types";

const PAGE_SIZE = 20;

interface UsePaginatedDocumentsOptions {
  personId?: string;
  categoryId?: CategoryId;
  excludeCategories?: CategoryId[];
  searchQuery?: string;
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
  initialPage?: number;
}

export function usePaginatedDocuments({
  personId,
  categoryId,
  excludeCategories = [],
  searchQuery = "",
  sortBy = 'created_at',
  sortOrder = 'desc',
  initialPage = 1,
}: UsePaginatedDocumentsOptions = {}) {
  const { user } = useAuth();
  const [page, setPage] = useState(initialPage);
  const [allLoaded, setAllLoaded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Busca os documentos com paginação real
  const documents = useLiveQuery(
    async () => {
      if (!user) return [];

      // Buscar todos os documentos do usuário
      let docs = await db.documents.where('user_id').equals(user.id).toArray();

      // Aplicar filtros
      if (personId) {
        docs = docs.filter((doc: Document) => doc.person_id === personId);
      }
      if (categoryId) {
        docs = docs.filter((doc: Document) => doc.category_id === categoryId);
      }
      if (excludeCategories.length > 0) {
        docs = docs.filter((doc: Document) => !excludeCategories.includes(doc.category_id));
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        docs = docs.filter((doc: Document) =>
          doc.title.toLowerCase().includes(q) ||
          doc.description?.toLowerCase().includes(q)
        );
      }

      // Ordenar
      docs.sort((a: Document, b: Document) => {
        const aVal = a[sortBy as keyof Document] || '';
        const bVal = b[sortBy as keyof Document] || '';
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // Atualizar total
      setTotalCount(docs.length);

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
    [user?.id, personId, categoryId, excludeCategories, searchQuery, sortBy, sortOrder, page],
    []
  );

  // Carregar mais
  const loadMore = useCallback(() => {
    if (!allLoaded && !isLoadingMore) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
      setTimeout(() => setIsLoadingMore(false), 100);
    }
  }, [allLoaded, isLoadingMore]);

  // Resetar para a primeira página quando os filtros mudarem
  const reset = useCallback(() => {
    setPage(1);
    setAllLoaded(false);
  }, []);

  // Resetar quando os filtros mudarem
  useEffect(() => {
    reset();
  }, [personId, categoryId, excludeCategories, searchQuery, reset]);

  const hasMore = !allLoaded && (documents?.length || 0) < (totalCount || 0);

  return {
    documents: documents || [],
    totalCount,
    page,
    hasMore,
    isLoadingMore,
    loadMore,
    reset,
    allLoaded,
  };
}