// hooks/usePaginatedFavorites.ts
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  documentsRepository,
} from "@/lib/repositories/documents";

import type {
  CategoryId,
  Document,
} from "@/lib/types";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const PAGE_SIZE = 20;

// ============================================================
// TIPOS
// ============================================================

interface UsePaginatedFavoritesOptions {
  /*
   * Permite uso explícito por pessoa quando algum consumer
   * realmente precisar disso.
   *
   * Quando omitido, o hook acompanha a pessoa ativa global.
   *
   * Importante:
   * undefined NÃO significa "todas as pessoas".
   */
  personId?: string;

  categoryId?: CategoryId;

  initialPage?: number;
}

// ============================================================
// HOOK
// ============================================================

export function usePaginatedFavorites({
  personId,
  categoryId,
  initialPage = 1,
}: UsePaginatedFavoritesOptions = {}) {
  const {
    activePersonId,
  } =
    useActivePersonId();

  const [
    page,
    setPage,
  ] =
    useState(
      initialPage
    );

  const [
    isLoadingMore,
    setIsLoadingMore,
  ] =
    useState(false);

  // ==========================================================
  // PESSOA ALVO
  //
  // Mesmo contrato adotado nos hooks modernos de documentos:
  //
  // personId explícito
  //       ↓
  // activePersonId
  //       ↓
  // sem pessoa = nenhum documento
  //
  // Nunca usamos ausência de personId como "todas as pessoas".
  // ==========================================================

  const targetPersonId =
    personId ||
    activePersonId ||
    undefined;

  // ==========================================================
  // DOCUMENTOS FAVORITOS
  // ==========================================================

  const allFavorites =
    useLiveQuery(
      async () => {
        if (
          !targetPersonId
        ) {
          return [];
        }

        const documents =
          await documentsRepository.getAll(
            targetPersonId
          );

        const filtered =
          documents.filter(
            (
              document:
                Document
            ) => {
              if (
                !document.is_favorite
              ) {
                return false;
              }

              if (
                categoryId &&
                document.category_id !==
                  categoryId
              ) {
                return false;
              }

              return true;
            }
          );

        filtered.sort(
          (
            a,
            b
          ) =>
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
        );

        return filtered;
      },
      [
        targetPersonId,
        categoryId,
      ],
      []
    );

  // ==========================================================
  // PAGINAÇÃO LOCAL
  // ==========================================================

  const totalCount =
    allFavorites.length;

  const favorites =
    useMemo(
      () => {
        return allFavorites.slice(
          0,
          page *
            PAGE_SIZE
        );
      },
      [
        allFavorites,
        page,
      ]
    );

  const loadedCount =
    favorites.length;

  /*
   * Zero resultados significa que já carregamos tudo.
   *
   * O hook antigo retornava:
   *
   * total = 0
   * allLoaded = false
   * hasMore = true
   *
   * o que era semanticamente incorreto.
   */
  const allLoaded =
    totalCount === 0 ||
    loadedCount >=
      totalCount;

  const hasMore =
    !allLoaded;

  // ==========================================================
  // CARREGAR MAIS
  // ==========================================================

  const loadMore =
    useCallback(
      () => {
        if (
          allLoaded ||
          isLoadingMore
        ) {
          return;
        }

        setIsLoadingMore(
          true
        );

        setPage(
          (
            previous
          ) =>
            previous +
            1
        );
      },
      [
        allLoaded,
        isLoadingMore,
      ]
    );

  // ==========================================================
  // FINALIZAÇÃO DO LOAD MORE
  // ==========================================================

  useEffect(() => {
    if (
      !isLoadingMore
    ) {
      return;
    }

    setIsLoadingMore(
      false
    );
  }, [
    favorites,
    isLoadingMore,
  ]);

  // ==========================================================
  // RESET
  // ==========================================================

  const reset =
    useCallback(
      () => {
        setPage(
          initialPage
        );

        setIsLoadingMore(
          false
        );
      },
      [
        initialPage,
      ]
    );

  /*
   * Troca da pessoa ativa ou categoria reinicia
   * a paginação imediatamente.
   */
  useEffect(() => {
    reset();
  }, [
    targetPersonId,
    categoryId,
    reset,
  ]);

  // ==========================================================
  // RETORNO
  // ==========================================================

  return {
    favorites,
    totalCount,
    page,
    hasMore,
    isLoadingMore,
    loadMore,
    reset,
    allLoaded,
  };
}