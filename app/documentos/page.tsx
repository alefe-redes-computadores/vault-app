// app/documentos/page.tsx
"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Calendar,
  SlidersHorizontal,
  Sparkles,
  LayoutList,
  Grid3X3,
  FileText,
  Images,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
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

// ============================================================
// TIPOS DE DOCUMENTOS PESSOAIS
// ============================================================

const DOCUMENT_TYPES: {
  id: DocumentType;
  label: string;
}[] = [
  {
    id: "rg",
    label: "RG",
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
    label: "Título Eleitor",
  },
  {
    id: "certificado",
    label: "Certificado",
  },
  {
    id: "carteira_trabalho",
    label: "Carteira Trabalho",
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
      staggerChildren: 0.03,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },

  show: {
    opacity: 1,
    y: 0,

    transition: {
      duration: 0.22,

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
  ] = useState(value);

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

    return () =>
      window.clearTimeout(
        timer
      );
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
 * Em navegadores JavaScript:
 *
 * new Date("2026-08-30")
 *
 * representa meia-noite UTC e pode cair no dia
 * anterior em fusos negativos.
 *
 * Para validade de documentos, quando o valor é
 * somente uma data, interpretamos como data local.
 */
function parseDocumentDate(
  value:
    | string
    | Date
): Date | null {
  if (
    value instanceof Date
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
        dateOnlyMatch[1]
      );

    const month =
      Number(
        dateOnlyMatch[2]
      );

    const day =
      Number(
        dateOnlyMatch[3]
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

    if (
      Number.isNaN(
        date.getTime()
      )
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
  // Pessoa não é um filtro local desta tela.
  //
  // O usePaginatedDocuments já utiliza activePersonId.
  // Assim o Cofre Pessoal acompanha rigorosamente
  // a pessoa ativa global do Vault.
  // ==========================================================

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState<
      CategoryId | "all"
    >("all");

  const [
    selectedType,
    setSelectedType,
  ] =
    useState<
      DocumentType | "all"
    >("all");

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
  ] = useState(false);

  const [
    viewMode,
    setViewMode,
  ] =
    useState<ViewMode>(
      "list"
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

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
          setIsLoading(
            false
          );
        },
        420
      );

    return () =>
      window.clearTimeout(
        timer
      );
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
      /*
       * Não passamos personId propositalmente.
       *
       * O hook resolve a pessoa através do
       * activePersonId global.
       */

      categoryId:
        selectedCategory !==
        "all"
          ? selectedCategory
          : undefined,

      searchQuery:
        debouncedSearch,

      /*
       * Documentos de Saúde possuem seu próprio
       * acervo e nunca entram no Cofre Pessoal.
       */
      excludeCategories: [
        "saude",
      ],
    });

  // ==========================================================
  // FILTROS LOCAIS
  // ==========================================================

  const filteredDocs =
    useMemo<Document[]>(
      () => {
        let result =
          paginatedDocs as
            Document[];

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

  // ==========================================================
  // FAVORITO
  // ==========================================================

  const handleFavoriteToggle =
    useCallback(
      async (
        id:
          string
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
          /*
           * O DocumentCard será auditado em seguida
           * para centralizarmos também feedback/toast.
           *
           * Por enquanto não engolimos silenciosamente
           * erro do domínio.
           */
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

  // ==========================================================
  // EXPORTAÇÃO
  // ==========================================================

  const getExportCards =
    useCallback(
      () => {
        return filteredDocs
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
          );
      },
      [
        filteredDocs,
      ]
    );

  // ==========================================================
  // CATEGORIAS
  // ==========================================================

  const vaultCategories =
    useMemo(
      () => {
        return Object.values(
          CATEGORIES
        ).filter(
          (
            category
          ) =>
            category.id !==
            "saude"
        );
      },
      []
    );

  /*
   * O total do hook é exato enquanto os filtros locais
   * tipo/validade não estiverem ativos.
   *
   * Esses dois filtros ainda trabalham sobre as páginas já
   * carregadas; portanto, quando ativos mostramos a quantidade
   * atualmente exibida e não fingimos possuir um total global.
   */
  const displayedCount =
    selectedType ===
      "all" &&
    dateFilter ===
      "all"
      ? totalCount
      : filteredDocs.length;

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
        id:
          string
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
    isLoading
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
      <main className="min-h-screen bg-void pb-28">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl header-safe-top">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                COFRE PESSOAL
              </h1>

              <p className="mt-1 text-sm text-ink-muted">
                {
                  displayedCount
                }{" "}
                documento
                {displayedCount !==
                1
                  ? "s"
                  : ""}

                {hasActiveFilters
                  ? " filtrados"
                  : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={
                  openGallery
                }
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-all active:scale-95 hover:text-ink-primary"
                aria-label="Abrir galeria de imagens"
              >
                <Images
                  size={
                    18
                  }
                />
              </button>

              <button
                type="button"
                onClick={
                  toggleViewMode
                }
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-all active:scale-95 hover:text-ink-primary"
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
                      18
                    }
                  />
                ) : (
                  <LayoutList
                    size={
                      18
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
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all active:scale-95 ${
                  hasActiveFilters ||
                  showFilters
                    ? "border-ice bg-ice/12 text-ice"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                }`}
                aria-label="Abrir filtros"
                aria-pressed={
                  showFilters
                }
              >
                <SlidersHorizontal
                  size={
                    18
                  }
                />
              </button>
            </div>
          </div>

          {/* ==================================================
              BUSCA
              ================================================== */}

          <div className="relative mt-4">
            <Search
              size={
                16
              }
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />

            <Input
              placeholder="Buscar documentos, números ou notas..."
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
              className="border-surface-border/50 bg-surface-raised pl-9 transition-all"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() =>
                  setSearchQuery(
                    ""
                  )
                }
                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-ink-muted transition-colors hover:text-ink-primary"
                aria-label="Limpar busca"
              >
                <X
                  size={
                    15
                  }
                />
              </button>
            )}
          </div>

          {/* ==================================================
              INDICADOR DE FILTROS
              ================================================== */}

          {(hasActiveFilters ||
            hasSearch) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-ice/20 bg-ice/10 px-3 py-1.5 text-xs font-medium text-ice">
                <Sparkles
                  size={
                    12
                  }
                />

                {hasSearch &&
                !hasActiveFilters
                  ? "Busca ativa"
                  : "Filtros ativos"}
              </div>

              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="inline-flex items-center gap-1 rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1.5 text-xs text-ink-muted transition-colors active:scale-95 hover:text-ink-primary"
              >
                <X
                  size={
                    12
                  }
                />

                Limpar
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
                    0.24,

                  ease: [
                    0.16,
                    1,
                    0.3,
                    1,
                  ],
                }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-4 rounded-[26px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm">
                  {/* ==========================================
                      CATEGORIA
                      ========================================== */}

                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-ink-faint">
                      Categoria
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCategory(
                            "all"
                          )
                        }
                        className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          selectedCategory ===
                          "all"
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
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
                              setSelectedCategory(
                                category.id
                              )
                            }
                            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                              selectedCategory ===
                              category.id
                                ? "border-ice bg-ice/12 text-ice"
                                : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
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
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-ink-faint">
                      Tipo
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedType(
                            "all"
                          )
                        }
                        className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          selectedType ===
                          "all"
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                        }`}
                        aria-pressed={
                          selectedType ===
                          "all"
                        }
                      >
                        Todos
                      </button>

                      {DOCUMENT_TYPES.map(
                        (
                          type
                        ) => (
                          <button
                            type="button"
                            key={
                              type.id
                            }
                            onClick={() =>
                              setSelectedType(
                                type.id
                              )
                            }
                            className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                              selectedType ===
                              type.id
                                ? "border-ice bg-ice/12 text-ice"
                                : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
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
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-ink-faint">
                      Validade
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDateFilter(
                            "all"
                          )
                        }
                        className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          dateFilter ===
                          "all"
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
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
                          setDateFilter(
                            "expiring"
                          )
                        }
                        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          dateFilter ===
                          "expiring"
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
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

                        Vencendo (7d)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDateFilter(
                            "expired"
                          )
                        }
                        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          dateFilter ===
                          "expired"
                            ? "border-coral bg-coral/10 text-coral"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
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
        </header>

        {/* ====================================================
            PONTE PARA O ACERVO CLÍNICO
            ==================================================== */}

        <HealthDocsBanner />

        {/* ====================================================
            LISTAGEM
            ==================================================== */}

        <section className="px-5 pt-5">
          {filteredDocs.length ===
          0 ? (
            <motion.div
              initial={{
                opacity:
                  0,

                y:
                  10,
              }}
              animate={{
                opacity:
                  1,

                y:
                  0,
              }}
              transition={{
                duration:
                  0.24,
              }}
              className="flex flex-col items-center justify-center rounded-[30px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="glow-ice mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-ice/15 bg-surface-raised">
                <Search
                  size={
                    28
                  }
                  className="text-ice/60"
                />
              </div>

              <h3 className="font-display text-lg font-semibold text-ink-primary">
                Nenhum documento encontrado
              </h3>

              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                {hasActiveFilters ||
                hasSearch
                  ? "Nenhum documento da pessoa ativa corresponde aos filtros atuais."
                  : "Os documentos pessoais, empresariais e outros da pessoa ativa aparecerão aqui."}
              </p>

              {(hasActiveFilters ||
                hasSearch) && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-surface-border/50 bg-surface-raised px-4 py-2.5 text-xs font-medium text-ink-muted transition-all active:scale-95 hover:border-ice/30 hover:text-ink-primary"
                >
                  <X
                    size={
                      13
                    }
                  />

                  Limpar filtros
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
                className="space-y-4"
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
                className="grid grid-cols-2 gap-3"
              >
                {filteredDocs.map(
                  (
                    document
                  ) => {
                    const firstAttachment =
                      document
                        .attachments?.[0];

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
                        className="group relative cursor-pointer overflow-hidden rounded-[22px] border border-surface-border/50 bg-surface p-3 shadow-sm transition-all hover:border-ice/30 active:scale-[0.98]"
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
                        <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-surface-raised">
                          {firstAttachment?.type ===
                            "image" &&
                          firstAttachment.url ? (
                            <img
                              src={
                                firstAttachment.thumbnail_url ||
                                firstAttachment.url
                              }
                              alt={
                                document.title
                              }
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <FileText
                              size={
                                32
                              }
                              className="text-ice/50"
                            />
                          )}
                        </div>

                        <div className="mt-2.5 min-w-0">
                          <p className="truncate text-xs font-semibold text-ink-primary">
                            {
                              document.title
                            }
                          </p>

                          <p className="text-[10px] capitalize text-ink-muted">
                            {document.type.replace(
                              /_/g,
                              " "
                            )}
                          </p>
                        </div>
                      </motion.div>
                    );
                  }
                )}
              </motion.div>
            </InfiniteScrollTrigger>
          )}
        </section>

        <ScrollToTop
          threshold={
            400
          }
        />
      </main>
    </PageTransition>
  );
}