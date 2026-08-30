// hooks/usePaginatedDocuments.ts
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  useActivePersonId,
} from "./useActivePersonId";

import {
  documentsRepository,
} from "@/lib/repositories/documents";

import type {
  CategoryId,
  Document,
} from "@/lib/types";

// ============================================================
// CONFIG
// ============================================================

const PAGE_SIZE =
  20;

const EMPTY_CATEGORIES:
  CategoryId[] =
  [];

// ============================================================
// TYPES
// ============================================================

interface UsePaginatedDocumentsOptions {
  personId?:
    string;

  categoryId?:
    CategoryId;

  excludeCategories?:
    CategoryId[];

  searchQuery?:
    string;

  sortBy?:
    "created_at"
    | "updated_at"
    | "title";

  sortOrder?:
    "asc"
    | "desc";

  initialPage?:
    number;
}

// ============================================================
// HELPERS
// ============================================================

function normalizeSearch(
  value:
    string
): string {
  return value
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase(
      "pt-BR"
    )
    .trim();
}

function getComparableValue(
  document:
    Document,
  key:
    "created_at"
    | "updated_at"
    | "title"
): string {
  const value =
    document[
      key
    ];

  return typeof value ===
    "string"
    ? value
    : "";
}

function normalizeInitialPage(
  value:
    number
): number {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return 1;
  }

  return Math.max(
    1,
    Math.floor(
      value
    )
  );
}

// ============================================================
// HOOK
// ============================================================

export function usePaginatedDocuments({
  personId,
  categoryId,
  excludeCategories = EMPTY_CATEGORIES,
  searchQuery = "",
  sortBy = "created_at",
  sortOrder = "desc",
  initialPage = 1,
}: UsePaginatedDocumentsOptions = {}) {
  const {
    activePersonId,
  } =
    useActivePersonId();

  const targetPersonId =
    personId ||
    activePersonId ||
    undefined;

  const safeInitialPage =
    normalizeInitialPage(
      initialPage
    );

  /*
   * A identidade do array não deve controlar reset/paginação.
   * Duas listas com as mesmas categorias são semanticamente
   * equivalentes, mesmo que o componente pai crie um [] novo.
   */
  const excludeCategoriesKey =
    useMemo(
      () =>
        [
          ...excludeCategories,
        ]
          .sort()
          .join(
            "|"
          ),
      [
        excludeCategories,
      ]
    );

  const excludedCategories =
    useMemo(
      () =>
        new Set<CategoryId>(
          excludeCategories
        ),
      [
        excludeCategoriesKey,
      ]
    );

  const [
    page,
    setPage,
  ] =
    useState(
      safeInitialPage
    );

  const [
    isLoadingMore,
    setIsLoadingMore,
  ] =
    useState(
      false
    );

  const loadingTimerRef =
    useRef<
      number | null
    >(
      null
    );

  // ==========================================================
  // QUERY
  // ==========================================================

  const allDocuments =
    useLiveQuery<Document[]>(
      async () => {
        if (
          !targetPersonId
        ) {
          return [];
        }

        return documentsRepository.getAll(
          targetPersonId
        );
      },
      [
        targetPersonId,
      ]
    );

  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredDocuments =
    useMemo<Document[]>(
      () => {
        let docs:
          Document[] = [
            ...(allDocuments ??
              []),
          ];

        if (
          categoryId
        ) {
          docs =
            docs.filter(
              (
                document
              ) =>
                document.category_id ===
                categoryId
            );
        }

        if (
          excludedCategories.size >
          0
        ) {
          docs =
            docs.filter(
              (
                document
              ) =>
                !excludedCategories.has(
                  document.category_id
                )
            );
        }

        const query =
          normalizeSearch(
            searchQuery
          );

        if (
          query
        ) {
          docs =
            docs.filter(
              (
                document
              ) => {
                const searchable =
                  normalizeSearch(
                    [
                      document.title ||
                        "",
                      document.description ||
                        "",
                    ].join(
                      " "
                    )
                  );

                return searchable.includes(
                  query
                );
              }
            );
        }

        docs.sort(
          (
            a,
            b
          ) => {
            const aValue =
              getComparableValue(
                a,
                sortBy
              );

            const bValue =
              getComparableValue(
                b,
                sortBy
              );

            const comparison =
              aValue.localeCompare(
                bValue,
                "pt-BR"
              );

            return sortOrder ===
              "asc"
              ? comparison
              : -comparison;
          }
        );

        return docs;
      },
      [
        allDocuments,
        categoryId,
        excludedCategories,
        searchQuery,
        sortBy,
        sortOrder,
      ]
    );

  // ==========================================================
  // PAGE RESET
  // ==========================================================

  const reset =
    useCallback(
      () => {
        setPage(
          safeInitialPage
        );

        setIsLoadingMore(
          false
        );

        if (
          loadingTimerRef.current !==
          null
        ) {
          window.clearTimeout(
            loadingTimerRef.current
          );

          loadingTimerRef.current =
            null;
        }
      },
      [
        safeInitialPage,
      ]
    );

  useEffect(
    () => {
      reset();
    },
    [
      targetPersonId,
      categoryId,
      excludeCategoriesKey,
      searchQuery,
      sortBy,
      sortOrder,
      reset,
    ]
  );

  // ==========================================================
  // TIMER CLEANUP
  // ==========================================================

  useEffect(
    () => {
      return () => {
        if (
          loadingTimerRef.current !==
          null
        ) {
          window.clearTimeout(
            loadingTimerRef.current
          );

          loadingTimerRef.current =
            null;
        }
      };
    },
    []
  );

  // ==========================================================
  // PAGINATED VIEW
  // ==========================================================

  const documents =
    useMemo<Document[]>(
      () =>
        filteredDocuments.slice(
          0,
          page *
            PAGE_SIZE
        ),
      [
        filteredDocuments,
        page,
      ]
    );

  const totalCount =
    filteredDocuments.length;

  const allLoaded =
    documents.length >=
    totalCount;

  const hasMore =
    !allLoaded;

  // ==========================================================
  // LOAD MORE
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

        /*
         * Não há requisição remota aqui.
         * O timeout apenas impede múltiplos taps no mesmo frame.
         */
        loadingTimerRef.current =
          window.setTimeout(
            () => {
              setIsLoadingMore(
                false
              );

              loadingTimerRef.current =
                null;
            },
            0
          );
      },
      [
        allLoaded,
        isLoadingMore,
      ]
    );

  return {
    documents,

    totalCount,

    page,

    hasMore,

    isLoadingMore,

    loadMore,

    reset,

    allLoaded,
  };
}