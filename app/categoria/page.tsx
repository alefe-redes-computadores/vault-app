// app/categoria/page.tsx
"use client";

import {
  useCallback,
  useMemo,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  motion,
} from "framer-motion";
import {
  ArrowLeft,
  FolderOpen,
} from "lucide-react";

import {
  useDocuments,
  useDocumentActions,
} from "@/hooks/useDocuments";
import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  CATEGORIES,
  type CategoryId,
  type Document,
} from "@/lib/types";

import {
  DocumentCard,
} from "@/components/DocumentCard";
import {
  PageTransition,
} from "@/components/PageTransition";
import {
  EmptyState,
} from "@/components/EmptyState";
import {
  Button,
} from "@/components/ui/Button";

// ============================================================
// HELPERS
// ============================================================

function isCategoryId(
  value:
    | string
    | null
): value is CategoryId {
  if (!value) {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(
    CATEGORIES,
    value
  );
}

// ============================================================
// PÁGINA
// ============================================================

export default function CategoryPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    favoriteDocument,
  } =
    useDocumentActions();

  /*
   * useDocuments() já acompanha a pessoa ativa.
   *
   * Esta página não mantém mais um segundo seletor de pessoa.
   */
  const allDocuments =
    useDocuments();

  // ==========================================================
  // CATEGORIA
  // ==========================================================

  const categoryParam =
    searchParams.get(
      "nome"
    );

  const categoryId =
    isCategoryId(
      categoryParam
    )
      ? categoryParam
      : null;

  const category =
    categoryId
      ? CATEGORIES[
          categoryId
        ]
      : undefined;

  // ==========================================================
  // DOCUMENTOS
  // ==========================================================

  const documents =
    useMemo(
      () => {
        if (
          !categoryId
        ) {
          return [];
        }

        return (
          allDocuments ||
          []
        ).filter(
          (
            document:
              Document
          ) =>
            document.category_id ===
            categoryId
        );
      },
      [
        allDocuments,
        categoryId,
      ]
    );

  const totalDocs =
    documents.length;

  // ==========================================================
  // FAVORITO
  // ==========================================================

  const handleFavoriteToggle =
    useCallback(
      async (
        id:
          string
      ) => {
        /*
         * O DocumentCard é responsável pelo feedback.
         * A Promise precisa rejeitar em caso de erro para
         * ele não mostrar falso sucesso.
         */
        await favoriteDocument(
          id
        );
      },
      [
        favoriteDocument,
      ]
    );

  // ==========================================================
  // NOVO DOCUMENTO
  // ==========================================================

  const handleCreateDocument =
    useCallback(
      () => {
        if (
          !categoryId
        ) {
          return;
        }

        trigger(
          "vibrate"
        );

        const params =
          new URLSearchParams();

        params.set(
          "categoria",
          categoryId
        );

        /*
         * Não enviamos person_id pela URL.
         *
         * /documentos/novo usa a pessoa ativa global e
         * createDocument injeta o person_id pelo hook.
         */
        router.push(
          `/documentos/novo?${params.toString()}`
        );
      },
      [
        categoryId,
        router,
        trigger,
      ]
    );

  // ==========================================================
  // CATEGORIA INVÁLIDA
  // ==========================================================

  if (!category) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-ink-muted">
              <FolderOpen
                size={
                  22
                }
              />
            </div>

            <p className="mt-4 text-sm font-medium text-ink-primary">
              Categoria não encontrada
            </p>

            <p className="mt-1 text-xs leading-5 text-ink-muted">
              Esta categoria não existe ou o endereço está incorreto.
            </p>

            <Button
              variant="primary"
              className="mt-5"
              onClick={() =>
                router.push(
                  "/documentos"
                )
              }
            >
              Voltar aos documentos
            </Button>
          </div>
        </main>
      </PageTransition>
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
          <div className="mx-auto flex max-w-3xl items-start gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
              }}
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={
                  18
                }
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-surface-border/40"
                  style={{
                    backgroundColor:
                      `${category.color}18`,
                  }}
                >
                  <FolderOpen
                    size={
                      18
                    }
                    style={{
                      color:
                        category.color,
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                    Vault
                  </p>

                  <h1 className="truncate font-display text-xl font-semibold text-ink-primary">
                    {
                      category.name
                    }
                  </h1>

                  <p className="text-sm text-ink-muted">
                    {
                      totalDocs
                    }{" "}
                    documento
                    {totalDocs !==
                    1
                      ? "s"
                      : ""}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-ink-faint">
                Documentos desta categoria para a pessoa ativa.
              </p>
            </div>
          </div>
        </header>

        {/* ====================================================
            CONTEÚDO
            ==================================================== */}

        <section className="mx-auto max-w-3xl px-5 pt-5">
          {!documents.length ? (
            <EmptyState
              icon={
                FolderOpen
              }
              title={`Nenhum documento em ${category.name}`}
              description="A pessoa ativa ainda não possui documentos nesta categoria."
              actionLabel="Adicionar documento"
              onAction={
                handleCreateDocument
              }
            />
          ) : (
            <div className="space-y-4">
              {documents.map(
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
                        0.24,

                      delay:
                        Math.min(
                          index,
                          6
                        ) *
                        0.03,
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
          )}
        </section>
      </main>
    </PageTransition>
  );
}