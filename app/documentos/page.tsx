// app/documentos/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  Calendar,
  FileText,
  Grid3X3,
  Images,
  LayoutList,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  usePaginatedDocuments,
} from "@/hooks/usePaginatedDocuments";
import {
  useDocumentActions,
} from "@/hooks/useDocuments";
import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  DocumentCard,
} from "@/components/DocumentCard";
import {
  InfiniteScrollTrigger,
} from "@/components/InfiniteScrollTrigger";
import {
  Input,
} from "@/components/ui/Input";
import {
  CardListSkeleton,
} from "@/components/loading/CardListSkeleton";
import {
  PageTransition,
} from "@/components/PageTransition";
import {
  ExportCardButton,
} from "@/components/ExportCardButton";
import {
  ScrollToTop,
} from "@/components/ScrollToTop";
import {
  HealthDocsBanner,
} from "@/components/HealthDocsBanner";

import {
  CATEGORIES,
  TYPE_CATEGORY_MAP,
  type CategoryId,
  type Document,
  type DocumentType,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type DateFilter =
  | "all"
  | "expiring"
  | "expired";

type ViewMode =
  | "list"
  | "grid";

interface DocumentTypeOption {
  id: DocumentType;
  label: string;
}

// ============================================================
// DOMÍNIO — COFRE PESSOAL
// ============================================================

const GENERAL_CATEGORIES = [
  "pessoal",
  "empresa",
  "outros",
] as const satisfies readonly CategoryId[];

type GeneralCategoryId =
  (typeof GENERAL_CATEGORIES)[number];

const GENERAL_DOCUMENT_TYPES = [
  "rg",
  "cpf",
  "cnh",
  "certidao_nascimento",
  "titulo_eleitor",
  "certificado",
  "carteira_trabalho",
  "passaporte",
  "dispensa_militar",
  "credencial",
  "outro",
] as const satisfies readonly DocumentType[];

const DOCUMENT_TYPES: DocumentTypeOption[] = [
  {
    id: "rg",
    label: "C.I.N / RG",
  },
  {
    id: "cpf",
    label: "CPF",
  },
  {
    id: "cnh",
    label: "CNH",
  },
  {
    id: "certidao_nascimento",
    label: "Certidão",
  },
  {
    id: "titulo_eleitor",
    label: "Título de Eleitor",
  },
  {
    id: "certificado",
    label: "Certificado",
  },
  {
    id: "carteira_trabalho",
    label: "Carteira de Trabalho",
  },
  {
    id: "passaporte",
    label: "Passaporte",
  },
  {
    id: "dispensa_militar",
    label: "Dispensa Militar",
  },
  {
    id: "credencial",
    label: "Credencial",
  },
  {
    id: "outro",
    label: "Outro",
  },
];

const DOCUMENT_TYPE_LABEL_MAP =
  DOCUMENT_TYPES.reduce(
    (
      accumulator,
      item
    ) => {
      accumulator[
        item.id
      ] =
        item.label;

      return accumulator;
    },
    {} as Partial<
      Record<
        DocumentType,
        string
      >
    >
  );

// ============================================================
// ANIMAÇÕES
// ============================================================

const listVariants = {
  hidden: {
    opacity: 0,
  },

  show: {
    opacity: 1,

    transition: {
      staggerChildren:
        0.025,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 8,
  },

  show: {
    opacity: 1,
    y: 0,

    transition: {
      duration:
        0.2,

      ease: [
        0.16,
        1,
        0.3,
        1,
      ],
    },
  },
};

// ============================================================
// HELPERS
// ============================================================

function useDebounce(
  value: string,
  delay = 300
) {
  const [
    debouncedValue,
    setDebouncedValue,
  ] =
    useState(
      value
    );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setDebouncedValue(
            value
          );
        },
        delay
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    value,
    delay,
  ]);

  return debouncedValue;
}

function getDocumentExpiry(
  document: Document
): string | Date | undefined {
  const metadata =
    document.metadata as
      | {
          expiry_date?:
            | string
            | Date;

          renewal_date?:
            | string
            | Date;

          validade?:
            | string
            | Date;
        }
      | undefined;

  return (
    metadata?.expiry_date ||
    metadata?.renewal_date ||
    metadata?.validade
  );
}

/*
 * Evita interpretar YYYY-MM-DD como UTC.
 *
 * Uma validade é uma data civil/local. Portanto:
 *
 * 2026-08-30
 *
 * representa o fim daquele dia local, e não meia-noite UTC.
 */
function parseDocumentDate(
  value:
    | string
    | Date
): Date | null {
  if (
    value instanceof
    Date
  ) {
    if (
      Number.isNaN(
        value.getTime()
      )
    ) {
      return null;
    }

    return value;
  }

  const trimmed =
    value.trim();

  const dateOnlyMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      trimmed
    );

  if (
    dateOnlyMatch
  ) {
    const year =
      Number(
        dateOnlyMatch[
          1
        ]
      );

    const month =
      Number(
        dateOnlyMatch[
          2
        ]
      );

    const day =
      Number(
        dateOnlyMatch[
          3
        ]
      );

    const date =
      new Date(
        year,
        month - 1,
        day,
        23,
        59,
        59,
        999
      );

    /*
     * Além de validar o timestamp, validamos o round-trip.
     *
     * Isso impede datas impossíveis como 2026-02-31
     * de serem normalizadas silenciosamente pelo JavaScript.
     */
    if (
      Number.isNaN(
        date.getTime()
      ) ||
      date.getFullYear() !==
        year ||
      date.getMonth() !==
        month - 1 ||
      date.getDate() !==
        day
    ) {
      return null;
    }

    return date;
  }

  const parsed =
    new Date(
      trimmed
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}

function isGeneralCategory(
  categoryId: CategoryId
): categoryId is GeneralCategoryId {
  return (
    GENERAL_CATEGORIES as
      readonly CategoryId[]
  ).includes(
    categoryId
  );
}

// ============================================================
// PÁGINA
// ============================================================

export default function DocumentsPage() {
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    favoriteDocument,
  } =
    useDocumentActions();

  const cardRefs =
    useRef<
      Record<
        string,
        HTMLDivElement | null
      >
    >({});

  // ==========================================================
  // FILTROS
  //
  // Pessoa NÃO é filtro local.
  //
  // O usePaginatedDocuments resolve activePersonId.
  // Portanto a listagem acompanha rigorosamente
  // a pessoa ativa global do Vault.
  // ==========================================================

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState(
      ""
    );

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState<
      GeneralCategoryId | "all"
    >(
      "all"
    );

  const [
    selectedType,
    setSelectedType,
  ] =
    useState<
      DocumentType | "all"
    >(
      "all"
    );

  const [
    dateFilter,
    setDateFilter,
  ] =
    useState<DateFilter>(
      "all"
    );

  const [
    showFilters,
    setShowFilters,
  ] =
    useState(
      false
    );

  const [
    viewMode,
    setViewMode,
  ] =
    useState<ViewMode>(
      "list"
    );

  /*
   * O hook atual não expõe um loading inicial separado.
   *
   * Mantemos somente uma curta transição visual para evitar
   * flash da tela vazia durante a primeira resolução local.
   */
  const [
    initialVisualLoading,
    setInitialVisualLoading,
  ] =
    useState(
      true
    );

  const debouncedSearch =
    useDebounce(
      searchQuery
    );

  // ==========================================================
  // LOADING VISUAL INICIAL
  // ==========================================================

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setInitialVisualLoading(
            false
          );
        },
        320
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, []);

  // ==========================================================
  // DOCUMENTOS
  // ==========================================================

  const {
    documents:
      paginatedDocs,

    totalCount,

    hasMore,

    isLoadingMore,

    loadMore,
  } =
    usePaginatedDocuments({
      categoryId:
        selectedCategory !==
        "all"
          ? selectedCategory
          : undefined,

      searchQuery:
        debouncedSearch,

      /*
       * Saúde possui seu próprio Acervo Clínico.
       */
      excludeCategories: [
        "saude",
      ],
    });

  // ==========================================================
  // CATEGORIAS
  // ==========================================================

  const vaultCategories =
    useMemo(
      () =>
        Object.values(
          CATEGORIES
        ).filter(
          (
            category
          ) =>
            isGeneralCategory(
              category.id
            )
        ),
      []
    );

  // ==========================================================
  // TIPOS PERMITIDOS PELA CATEGORIA
  // ==========================================================

  const availableDocumentTypes =
    useMemo(
      () => {
        if (
          selectedCategory ===
          "all"
        ) {
          return DOCUMENT_TYPES;
        }

        return DOCUMENT_TYPES.filter(
          (
            option
          ) =>
            TYPE_CATEGORY_MAP[
              option.id
            ]?.includes(
              selectedCategory
            )
        );
      },
      [
        selectedCategory,
      ]
    );

  /*
   * Se a pessoa selecionou um tipo e depois mudou para uma
   * categoria incompatível, não deixamos um filtro impossível
   * escondido na tela.
   */
  useEffect(() => {
    if (
      selectedType ===
      "all"
    ) {
      return;
    }

    const stillAllowed =
      availableDocumentTypes.some(
        (
          option
        ) =>
          option.id ===
          selectedType
      );

    if (
      !stillAllowed
    ) {
      setSelectedType(
        "all"
      );
    }
  }, [
    availableDocumentTypes,
    selectedType,
  ]);

  // ==========================================================
  // FILTROS LOCAIS
  // ==========================================================

  const filteredDocs =
    useMemo<Document[]>(
      () => {
        let result =
          (
            paginatedDocs as
              Document[]
          ).filter(
            (
              document
            ) =>
              document.category_id !==
              "saude"
          );

        if (
          selectedType !==
          "all"
        ) {
          result =
            result.filter(
              (
                document
              ) =>
                document.type ===
                selectedType
            );
        }

        if (
          dateFilter !==
          "all"
        ) {
          const now =
            new Date();

          const sevenDaysFromNow =
            new Date(
              now.getTime() +
                7 *
                  24 *
                  60 *
                  60 *
                  1000
            );

          result =
            result.filter(
              (
                document
              ) => {
                const expiry =
                  getDocumentExpiry(
                    document
                  );

                if (
                  !expiry
                ) {
                  return false;
                }

                const expiryDate =
                  parseDocumentDate(
                    expiry
                  );

                if (
                  !expiryDate
                ) {
                  return false;
                }

                if (
                  dateFilter ===
                  "expired"
                ) {
                  return (
                    expiryDate <
                    now
                  );
                }

                return (
                  expiryDate >
                    now &&
                  expiryDate <=
                    sevenDaysFromNow
                );
              }
            );
        }

        return result;
      },
      [
        paginatedDocs,
        selectedType,
        dateFilter,
      ]
    );

  const hasLocalPaginationFilters =
    selectedType !==
      "all" ||
    dateFilter !==
      "all";

  /*
   * Correção importante:
   *
   * Tipo e validade ainda são filtros locais sobre páginas
   * já carregadas pelo hook.
   *
   * Antes, se a primeira página não tivesse nenhum match,
   * a tela renderizava o empty state e removia o
   * InfiniteScrollTrigger. Um documento compatível em uma
   * página posterior ficava inacessível.
   *
   * Enquanto houver páginas e nenhum match local tiver sido
   * encontrado, buscamos a próxima página automaticamente.
   */
  useEffect(() => {
    if (
      !hasLocalPaginationFilters ||
      filteredDocs.length >
        0 ||
      !hasMore ||
      isLoadingMore
    ) {
      return;
    }

    void loadMore();
  }, [
    filteredDocs.length,
    hasLocalPaginationFilters,
    hasMore,
    isLoadingMore,
    loadMore,
  ]);

  // ==========================================================
  // FAVORITO
  // ==========================================================

  const handleFavoriteToggle =
    useCallback(
      async (
        id: string
      ) => {
        try {
          await favoriteDocument(
            id
          );

          trigger(
            "vibrate"
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao alterar favorito do documento:",
            error
          );

          trigger(
            "error"
          );

          throw error;
        }
      },
      [
        favoriteDocument,
        trigger,
      ]
    );

  // ==========================================================
  // FILTROS
  // ==========================================================

  const clearFilters =
    useCallback(
      () => {
        setSearchQuery(
          ""
        );

        setSelectedCategory(
          "all"
        );

        setSelectedType(
          "all"
        );

        setDateFilter(
          "all"
        );

        trigger(
          "vibrate"
        );
      },
      [
        trigger,
      ]
    );

  const handleCategoryFilter =
    useCallback(
      (
        category:
          GeneralCategoryId | "all"
      ) => {
        trigger(
          "vibrate"
        );

        setSelectedCategory(
          category
        );
      },
      [
        trigger,
      ]
    );

  const handleTypeFilter =
    useCallback(
      (
        type:
          DocumentType | "all"
      ) => {
        trigger(
          "vibrate"
        );

        setSelectedType(
          type
        );
      },
      [
        trigger,
      ]
    );

  const handleDateFilter =
    useCallback(
      (
        filter:
          DateFilter
      ) => {
        trigger(
          "vibrate"
        );

        setDateFilter(
          filter
        );
      },
      [
        trigger,
      ]
    );

  const hasActiveFilters =
    selectedCategory !==
      "all" ||
    selectedType !==
      "all" ||
    dateFilter !==
      "all";

  const hasSearch =
    searchQuery.trim()
      .length >
    0;

  const activeFilterCount =
    [
      selectedCategory !==
        "all",

      selectedType !==
        "all",

      dateFilter !==
        "all",
    ].filter(
      Boolean
    ).length;

  // ==========================================================
  // EXPORTAÇÃO
  // ==========================================================

  const getExportCards =
    useCallback(
      () =>
        filteredDocs
          .filter(
            (
              document
            ) =>
              Boolean(
                document.id
              )
          )
          .map(
            (
              document
            ) => ({
              ref: {
                current:
                  cardRefs.current[
                    document.id!
                  ],
              },

              id:
                document.id!,
            })
          ),
      [
        filteredDocs,
      ]
    );

  /*
   * totalCount é confiável para filtros processados
   * diretamente pelo hook.
   *
   * Tipo e validade continuam operando localmente sobre
   * páginas carregadas. Nesses casos mostramos somente a
   * quantidade conhecida, sem fingir um total global.
   */
  const displayedCount =
    hasLocalPaginationFilters
      ? filteredDocs.length
      : totalCount;

  // ==========================================================
  // NAVEGAÇÃO / VISUALIZAÇÃO
  // ==========================================================

  const openGallery =
    useCallback(
      () => {
        trigger(
          "vibrate"
        );

        router.push(
          "/galeria"
        );
      },
      [
        router,
        trigger,
      ]
    );

  const openNewDocument =
    useCallback(
      () => {
        trigger(
          "vibrate"
        );

        router.push(
          "/documentos/novo"
        );
      },
      [
        router,
        trigger,
      ]
    );

  const toggleViewMode =
    useCallback(
      () => {
        trigger(
          "vibrate"
        );

        setViewMode(
          (
            previous
          ) =>
            previous ===
            "list"
              ? "grid"
              : "list"
        );
      },
      [
        trigger,
      ]
    );

  const openDocument =
    useCallback(
      (
        id: string
      ) => {
        trigger(
          "vibrate"
        );

        router.push(
          `/documentos/detalhes?id=${id}`
        );
      },
      [
        router,
        trigger,
      ]
    );

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    initialVisualLoading
  ) {
    return (
      <CardListSkeleton />
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/85 px-5 pb-4 backdrop-blur-xl header-safe-top">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ice/90">
                  Documentos
                </p>

                <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                  Cofre Pessoal
                </h1>

                <p className="mt-1 text-xs text-ink-muted">
                  {displayedCount}{" "}
                  documento
                  {displayedCount !==
                  1
                    ? "s"
                    : ""}
                  {hasActiveFilters ||
                  hasSearch
                    ? " encontrado"
                    : " armazenado"}
                  {displayedCount !==
                  1
                    ? "s"
                    : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  openNewDocument
                }
                className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-ice/20 bg-ice/10 px-4 text-sm font-semibold text-ice transition-all active:scale-95"
              >
                <Plus
                  size={
                    17
                  }
                />

                <span className="hidden sm:inline">
                  Novo
                </span>
              </button>
            </div>

            {/* ==================================================
                BUSCA
                ================================================== */}

            <div className="relative mt-4">
              <Search
                size={
                  16
                }
                className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-ink-muted"
              />

              <Input
                placeholder="Buscar por nome, número ou nota..."
                value={
                  searchQuery
                }
                onChange={(
                  event
                ) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                className="border-surface-border/45 bg-surface-raised pl-10 pr-10"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery(
                      ""
                    )
                  }
                  className="absolute right-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-transform active:scale-90"
                  aria-label="Limpar busca"
                >
                  <X
                    size={
                      14
                    }
                  />
                </button>
              )}
            </div>

            {/* ==================================================
                FERRAMENTAS
                ================================================== */}

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setShowFilters(
                    (
                      previous
                    ) =>
                      !previous
                  );
                }}
                className={`relative flex h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition-all active:scale-95 ${
                  hasActiveFilters ||
                  showFilters
                    ? "border-ice/30 bg-ice/10 text-ice"
                    : "border-surface-border/45 bg-surface-raised text-ink-muted"
                }`}
                aria-label="Abrir filtros"
                aria-pressed={
                  showFilters
                }
              >
                <SlidersHorizontal
                  size={
                    15
                  }
                />

                Filtros

                {activeFilterCount >
                  0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ice px-1.5 font-mono text-[9px] font-bold text-void">
                    {
                      activeFilterCount
                    }
                  </span>
                )}
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={
                    openGallery
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/45 bg-surface-raised text-ink-muted transition-all active:scale-95"
                  aria-label="Abrir galeria"
                >
                  <Images
                    size={
                      16
                    }
                  />
                </button>

                <button
                  type="button"
                  onClick={
                    toggleViewMode
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/45 bg-surface-raised text-ink-muted transition-all active:scale-95"
                  aria-label={
                    viewMode ===
                    "list"
                      ? "Usar visualização em grade"
                      : "Usar visualização em lista"
                  }
                  aria-pressed={
                    viewMode ===
                    "grid"
                  }
                >
                  {viewMode ===
                  "list" ? (
                    <Grid3X3
                      size={
                        16
                      }
                    />
                  ) : (
                    <LayoutList
                      size={
                        16
                      }
                    />
                  )}
                </button>

                {filteredDocs.length >
                  0 && (
                  <ExportCardButton
                    cards={
                      getExportCards()
                    }
                    title="Meus Documentos"
                    variant="secondary"
                    size="sm"
                    label="Exportar"
                  />
                )}
              </div>
            </div>

            {/* ==================================================
                INDICADOR DE FILTROS
                ================================================== */}

            {(hasActiveFilters ||
              hasSearch) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-ice/15 bg-ice/5 px-2.5 py-1 text-[10px] font-medium text-ice">
                  <Sparkles
                    size={
                      11
                    }
                  />

                  {hasSearch &&
                  !hasActiveFilters
                    ? "Busca ativa"
                    : `${activeFilterCount} filtro${
                        activeFilterCount !==
                        1
                          ? "s"
                          : ""
                      } ativo${
                        activeFilterCount !==
                        1
                          ? "s"
                          : ""
                      }`}
                </div>

                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium text-ink-muted transition-colors active:text-ink-primary"
                >
                  <X
                    size={
                      11
                    }
                  />

                  Limpar tudo
                </button>
              </div>
            )}

            {/* ==================================================
                FILTROS
                ================================================== */}

            <AnimatePresence
              initial={
                false
              }
            >
              {showFilters && (
                <motion.div
                  initial={{
                    opacity:
                      0,

                    height:
                      0,

                    y:
                      -4,
                  }}
                  animate={{
                    opacity:
                      1,

                    height:
                      "auto",

                    y:
                      0,
                  }}
                  exit={{
                    opacity:
                      0,

                    height:
                      0,

                    y:
                      -4,
                  }}
                  transition={{
                    duration:
                      0.22,

                    ease: [
                      0.16,
                      1,
                      0.3,
                      1,
                    ],
                  }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-4 rounded-[22px] border border-surface-border/40 bg-surface/95 p-4 shadow-sm">
                    {/* ==========================================
                        CATEGORIA
                        ========================================== */}

                    <div>
                      <label className="mb-2.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                        Categoria
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleCategoryFilter(
                              "all"
                            )
                          }
                          className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                            selectedCategory ===
                            "all"
                              ? "border-ice/30 bg-ice/10 text-ice"
                              : "border-surface-border/45 bg-surface-raised text-ink-muted"
                          }`}
                          aria-pressed={
                            selectedCategory ===
                            "all"
                          }
                        >
                          Todas
                        </button>

                        {vaultCategories.map(
                          (
                            category
                          ) => (
                            <button
                              type="button"
                              key={
                                category.id
                              }
                              onClick={() =>
                                handleCategoryFilter(
                                  category.id as
                                    GeneralCategoryId
                                )
                              }
                              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                                selectedCategory ===
                                category.id
                                  ? "border-ice/30 bg-ice/10 text-ice"
                                  : "border-surface-border/45 bg-surface-raised text-ink-muted"
                              }`}
                              aria-pressed={
                                selectedCategory ===
                                category.id
                              }
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    category.color,
                                }}
                              />

                              {
                                category.name
                              }
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* ==========================================
                        TIPO
                        ========================================== */}

                    <div>
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <label className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                          Tipo
                        </label>

                        {selectedCategory !==
                          "all" && (
                          <span className="text-[9px] text-ink-faint">
                            {
                              CATEGORIES[
                                selectedCategory
                              ].name
                            }
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleTypeFilter(
                              "all"
                            )
                          }
                          className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                            selectedType ===
                            "all"
                              ? "border-ice/30 bg-ice/10 text-ice"
                              : "border-surface-border/45 bg-surface-raised text-ink-muted"
                          }`}
                          aria-pressed={
                            selectedType ===
                            "all"
                          }
                        >
                          Todos
                        </button>

                        {availableDocumentTypes.map(
                          (
                            type
                          ) => (
                            <button
                              type="button"
                              key={
                                type.id
                              }
                              onClick={() =>
                                handleTypeFilter(
                                  type.id
                                )
                              }
                              className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                                selectedType ===
                                type.id
                                  ? "border-ice/30 bg-ice/10 text-ice"
                                  : "border-surface-border/45 bg-surface-raised text-ink-muted"
                              }`}
                              aria-pressed={
                                selectedType ===
                                type.id
                              }
                            >
                              {
                                type.label
                              }
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* ==========================================
                        VALIDADE
                        ========================================== */}

                    <div>
                      <label className="mb-2.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                        Validade
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleDateFilter(
                              "all"
                            )
                          }
                          className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                            dateFilter ===
                            "all"
                              ? "border-ice/30 bg-ice/10 text-ice"
                              : "border-surface-border/45 bg-surface-raised text-ink-muted"
                          }`}
                          aria-pressed={
                            dateFilter ===
                            "all"
                          }
                        >
                          Todas
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDateFilter(
                              "expiring"
                            )
                          }
                          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                            dateFilter ===
                            "expiring"
                              ? "border-ice/30 bg-ice/10 text-ice"
                              : "border-surface-border/45 bg-surface-raised text-ink-muted"
                          }`}
                          aria-pressed={
                            dateFilter ===
                            "expiring"
                          }
                        >
                          <Calendar
                            size={
                              12
                            }
                          />

                          Vencendo em 7 dias
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDateFilter(
                              "expired"
                            )
                          }
                          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                            dateFilter ===
                            "expired"
                              ? "border-coral/30 bg-coral/10 text-coral"
                              : "border-surface-border/45 bg-surface-raised text-ink-muted"
                          }`}
                          aria-pressed={
                            dateFilter ===
                            "expired"
                          }
                        >
                          <Calendar
                            size={
                              12
                            }
                          />

                          Vencidos
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* ====================================================
            CONTEÚDO
            ==================================================== */}

        <div className="mx-auto max-w-5xl">
          {/* ==================================================
              PONTE PARA ACERVO CLÍNICO
              ================================================== */}

          <HealthDocsBanner />

          {/* ==================================================
              LISTAGEM
              ================================================== */}

          <section className="px-5 pt-4">
            {filteredDocs.length ===
              0 &&
            hasLocalPaginationFilters &&
            hasMore ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-surface-border/35 bg-surface/60 px-5 text-center">
                <div>
                  <motion.div
                    animate={{
                      rotate:
                        360,
                    }}
                    transition={{
                      duration:
                        1,

                      repeat:
                        Infinity,

                      ease:
                        "linear",
                    }}
                    className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-ice/15 bg-ice/5"
                  >
                    <Search
                      size={
                        16
                      }
                      className="text-ice"
                    />
                  </motion.div>

                  <p className="mt-3 text-xs font-medium text-ink-primary">
                    Procurando nos seus documentos…
                  </p>

                  <p className="mt-1 text-[10px] leading-4 text-ink-muted">
                    Há mais páginas no Cofre Pessoal.
                  </p>
                </div>
              </div>
            ) : filteredDocs.length ===
              0 ? (
              <motion.div
                initial={{
                  opacity:
                    0,

                  y:
                    8,
                }}
                animate={{
                  opacity:
                    1,

                  y:
                    0,
                }}
                transition={{
                  duration:
                    0.22,
                }}
                className="flex flex-col items-center justify-center rounded-[26px] border border-surface-border/40 bg-surface/85 px-6 py-12 text-center shadow-sm"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-ice/15 bg-ice/5">
                  {hasActiveFilters ||
                  hasSearch ? (
                    <Search
                      size={
                        24
                      }
                      className="text-ice/65"
                    />
                  ) : (
                    <FileText
                      size={
                        24
                      }
                      className="text-ice/65"
                    />
                  )}
                </div>

                <h3 className="mt-4 font-display text-lg font-semibold text-ink-primary">
                  {hasActiveFilters ||
                  hasSearch
                    ? "Nenhum documento encontrado"
                    : "Seu Cofre está vazio"}
                </h3>

                <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                  {hasActiveFilters ||
                  hasSearch
                    ? "Nenhum documento da pessoa ativa corresponde à busca e aos filtros atuais."
                    : "Adicione documentos pessoais, empresariais, identidades, certificados e outros arquivos importantes."}
                </p>

                {hasActiveFilters ||
                hasSearch ? (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-surface-border/50 bg-surface-raised px-4 py-2.5 text-xs font-medium text-ink-muted transition-all active:scale-95"
                  >
                    <X
                      size={
                        13
                      }
                    />

                    Limpar busca e filtros
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={
                      openNewDocument
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-ice/20 bg-ice/10 px-5 py-2.5 text-xs font-semibold text-ice transition-all active:scale-95"
                  >
                    <Plus
                      size={
                        14
                      }
                    />

                    Adicionar documento
                  </button>
                )}
              </motion.div>
            ) : viewMode ===
              "list" ? (
              <InfiniteScrollTrigger
                onLoadMore={
                  loadMore
                }
                hasMore={
                  hasMore
                }
                isLoading={
                  isLoadingMore
                }
              >
                <motion.div
                  variants={
                    listVariants
                  }
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                >
                  {filteredDocs.map(
                    (
                      document
                    ) => (
                      <motion.div
                        key={
                          document.id
                        }
                        variants={
                          cardVariants
                        }
                        ref={(
                          element
                        ) => {
                          if (
                            document.id
                          ) {
                            cardRefs.current[
                              document.id
                            ] =
                              element;
                          }
                        }}
                      >
                        <DocumentCard
                          document={
                            document
                          }
                          onFavoriteToggle={
                            handleFavoriteToggle
                          }
                        />
                      </motion.div>
                    )
                  )}
                </motion.div>
              </InfiniteScrollTrigger>
            ) : (
              <InfiniteScrollTrigger
                onLoadMore={
                  loadMore
                }
                hasMore={
                  hasMore
                }
                isLoading={
                  isLoadingMore
                }
              >
                <motion.div
                  variants={
                    listVariants
                  }
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                >
                  {filteredDocs.map(
                    (
                      document
                    ) => {
                      const firstAttachment =
                        document
                          .attachments?.[
                          0
                        ];

                      const category =
                        CATEGORIES[
                          document.category_id
                        ];

                      const typeLabel =
                        DOCUMENT_TYPE_LABEL_MAP[
                          document.type
                        ] ||
                        document.type.replace(
                          /_/g,
                          " "
                        );

                      return (
                        <motion.div
                          key={
                            document.id
                          }
                          variants={
                            cardVariants
                          }
                          ref={(
                            element
                          ) => {
                            if (
                              document.id
                            ) {
                              cardRefs.current[
                                document.id
                              ] =
                                element;
                            }
                          }}
                          onClick={() => {
                            if (
                              !document.id
                            ) {
                              return;
                            }

                            openDocument(
                              document.id
                            );
                          }}
                          className="group relative cursor-pointer overflow-hidden rounded-[20px] border border-surface-border/45 bg-surface/90 p-2.5 shadow-sm transition-all active:scale-[0.98]"
                          role="button"
                          tabIndex={
                            0
                          }
                          aria-label={`Abrir ${document.title}`}
                          onKeyDown={(
                            event
                          ) => {
                            if (
                              event.key !==
                                "Enter" &&
                              event.key !==
                                " "
                            ) {
                              return;
                            }

                            event.preventDefault();

                            if (
                              !document.id
                            ) {
                              return;
                            }

                            openDocument(
                              document.id
                            );
                          }}
                        >
                          <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-surface-raised">
                            {firstAttachment?.type ===
                              "image" &&
                            firstAttachment.url ? (
                              <img
                                src={
                                  firstAttachment.thumbnail_url ||
                                  firstAttachment.url
                                }
                                alt=""
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-ice/8">
                                  <FileText
                                    size={
                                      22
                                    }
                                    className="text-ice/60"
                                  />
                                </div>
                              </div>
                            )}

                            {category && (
                              <span
                                className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-black/20"
                                style={{
                                  backgroundColor:
                                    category.color,
                                }}
                                title={
                                  category.name
                                }
                              />
                            )}

                            {document.is_favorite && (
                              <div className="absolute right-2 top-2 flex h-6 items-center rounded-full bg-black/55 px-2 text-[9px] font-medium text-white backdrop-blur-md">
                                Favorito
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 px-1 pb-1 pt-2.5">
                            <p className="truncate text-xs font-semibold text-ink-primary">
                              {
                                document.title
                              }
                            </p>

                            <div className="mt-1 flex min-w-0 items-center gap-1.5">
                              <span className="truncate font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">
                                {
                                  typeLabel
                                }
                              </span>

                              {document.attachments?.length >
                                0 && (
                                <>
                                  <span className="h-1 w-1 shrink-0 rounded-full bg-ink-faint/40" />

                                  <span className="shrink-0 text-[9px] text-ink-faint">
                                    {
                                      document.attachments.length
                                    }{" "}
                                    anexo
                                    {document.attachments.length !==
                                    1
                                      ? "s"
                                      : ""}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    }
                  )}
                </motion.div>
              </InfiniteScrollTrigger>
            )}
          </section>
        </div>

        {/* ====================================================
            FAB MOBILE
            ==================================================== */}

        <motion.button
          type="button"
          initial={{
            opacity:
              0,

            scale:
              0.92,

            y:
              10,
          }}
          animate={{
            opacity:
              1,

            scale:
              1,

            y:
              0,
          }}
          transition={{
            duration:
              0.22,

            delay:
              0.1,
          }}
          onClick={
            openNewDocument
          }
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-ice/25 bg-ice text-void shadow-[0_12px_32px_rgba(56,189,248,0.24)] transition-transform active:scale-95 sm:hidden"
          aria-label="Novo documento"
        >
          <Plus
            size={
              22
            }
          />
        </motion.button>

        <ScrollToTop
          threshold={
            400
          }
        />
      </main>
    </PageTransition>
  );
}