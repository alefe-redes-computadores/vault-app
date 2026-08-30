// app/favoritos/page.tsx
"use client";

import {
  useCallback,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Star,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  usePaginatedFavorites,
} from "@/hooks/usePaginatedFavorites";
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
  AreaTabs,
} from "@/components/AreaTabs";
import {
  InfiniteScrollTrigger,
} from "@/components/InfiniteScrollTrigger";
import {
  EmptyState,
} from "@/components/EmptyState";
import {
  PageTransition,
} from "@/components/PageTransition";
import {
  ScrollToTop,
} from "@/components/ScrollToTop";

import type {
  CategoryId,
} from "@/lib/types";

// ============================================================
// PÁGINA
// ============================================================

export default function FavoritesPage() {
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

  // ==========================================================
  // FILTRO
  //
  // Pessoa não é mais um filtro local.
  //
  // usePaginatedFavorites acompanha activePersonId
  // automaticamente.
  // ==========================================================

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState<
      CategoryId | null
    >(null);

  // ==========================================================
  // FAVORITOS
  // ==========================================================

  const {
    favorites,
    totalCount,
    hasMore,
    isLoadingMore,
    loadMore,
  } =
    usePaginatedFavorites({
      categoryId:
        selectedCategory ||
        undefined,
    });

  // ==========================================================
  // FAVORITAR / DESFAVORITAR
  // ==========================================================

  const handleFavoriteToggle =
    useCallback(
      async (
        id:
          string
      ) => {
        /*
         * Não capturamos o erro aqui.
         *
         * O DocumentCard aguarda esta Promise e só mostra
         * feedback de sucesso se favoriteDocument resolver.
         */
        await favoriteDocument(
          id
        );
      },
      [
        favoriteDocument,
      ]
    );

  const hasFavorites =
    favorites.length >
    0;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="bg-aurora sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl header-safe-top">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft
                size={
                  18
                }
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="ring-gradient flex h-6 w-6 items-center justify-center rounded-full">
                  <Star
                    size={
                      12
                    }
                    className="fill-void text-void"
                  />
                </span>

                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
              </div>

              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Favoritos
              </h1>

              <p className="mt-1 text-sm text-ink-muted">
                {totalCount >
                0
                  ? `${totalCount} documento${totalCount !== 1 ? "s" : ""}`
                  : "Nenhum favorito"}
              </p>
            </div>
          </div>

          {/* ==================================================
              FILTRO POR CATEGORIA
              ================================================== */}

          <div className="mt-5 rounded-[24px] border border-surface-border/40 bg-surface/70 px-4 py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
              Categoria
            </p>

            <AreaTabs
              activeArea={
                selectedCategory
              }
              onAreaChange={
                setSelectedCategory
              }
            />
          </div>
        </header>

        {/* ====================================================
            CONTEÚDO
            ==================================================== */}

        <section className="px-5 pt-5">
          <AnimatePresence
            mode="wait"
          >
            {!hasFavorites ? (
              <motion.div
                key={`empty-${selectedCategory || "all"}`}
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
                exit={{
                  opacity:
                    0,

                  y:
                    -6,
                }}
                transition={{
                  duration:
                    0.22,
                }}
              >
                <EmptyState
                  icon={
                    Heart
                  }
                  title="Nenhum favorito"
                  description={
                    selectedCategory
                      ? "A pessoa ativa ainda não possui documentos favoritos nesta categoria."
                      : "Marque documentos como favoritos para acessá-los rapidamente. Basta tocar na estrela em qualquer documento."
                  }
                  actionLabel="Voltar para a Home"
                  onAction={() => {
                    trigger(
                      "vibrate"
                    );

                    router.push(
                      "/"
                    );
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key={`list-${selectedCategory || "all"}`}
                initial={{
                  opacity:
                    0,
                }}
                animate={{
                  opacity:
                    1,
                }}
                exit={{
                  opacity:
                    0,
                }}
                transition={{
                  duration:
                    0.25,
                }}
              >
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
                  <div className="space-y-4">
                    {favorites.map(
                      (
                        document,
                        index
                      ) => (
                        <motion.div
                          key={
                            document.id
                          }
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
                              0.22,

                            delay:
                              Math.min(
                                index *
                                  0.04,
                                0.4
                              ),
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
                  </div>
                </InfiniteScrollTrigger>
              </motion.div>
            )}
          </AnimatePresence>
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