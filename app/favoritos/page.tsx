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

        <header className="border-b border-surface-border/30 bg-void px-5 pb-4 header-safe-top">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.replace("/mais");
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

          {(totalCount > 0 || selectedCategory) && <div className="mt-5 rounded-[22px] border border-surface-border/40 bg-surface px-3 py-3">
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
              showAll
            />
          </div>}
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
                <div className="mx-auto flex max-w-xl flex-col items-center rounded-[26px] border border-surface-border/40 bg-surface px-6 py-9 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ice/15 bg-ice/5 text-ice"><Heart size={25}/></div>
                  <h2 className="mt-5 text-lg font-bold text-ink-primary">{selectedCategory ? "Nada nesta categoria" : "Sua coleção começa aqui"}</h2>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{selectedCategory ? "Não há favoritos deste tipo para a pessoa ativa. Você pode voltar a ver todas as categorias." : "Marque documentos com a estrela para reuni-los aqui sem duplicar arquivos."}</p>
                  <button type="button" onClick={() => { trigger("vibrate"); selectedCategory ? setSelectedCategory(null) : router.push("/documentos"); }} className="mt-5 rounded-full bg-ice px-5 py-3 text-sm font-bold text-void transition active:scale-95">{selectedCategory ? "Ver todos" : "Explorar documentos"}</button>
                </div>
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
