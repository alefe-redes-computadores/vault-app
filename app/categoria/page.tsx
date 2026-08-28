// app/categorias/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FolderOpen,
  User,
} from "lucide-react";

import { usePersons } from "@/hooks/usePersons";
import { useDocuments } from "@/hooks/useDocuments";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";

import {
  CATEGORIES,
  type CategoryId,
  type Document,
  type Person,
} from "@/lib/types";

import { DocumentCard } from "@/components/DocumentCard";
import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";

// ============================================================
// HELPERS
// ============================================================

function isCategoryId(
  value: string | null
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
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const { trigger } =
    useHapticFeedback();

  const { showToast } =
    useToast();

  const { favorite } =
    useSafeDb();

  const { activePersonId } =
    useActivePersonId();

  const persons =
    usePersons() as Person[];

  const allDocuments =
    useDocuments();

  const categoryParam =
    searchParams.get("nome");

  const categoryId =
    isCategoryId(categoryParam)
      ? categoryParam
      : null;

  const category =
    categoryId
      ? CATEGORIES[categoryId]
      : undefined;

  const [
    selectedPersonId,
    setSelectedPersonId,
  ] = useState<
    string | null | undefined
  >(undefined);

  // ==========================================================
  // SELEÇÃO INICIAL DA PESSOA
  // ==========================================================

  useEffect(() => {
    /*
     * undefined = ainda não inicializado
     * null = usuário escolheu "Todos"
     *
     * Dessa forma, mudanças posteriores em
     * activePersonId não sobrescrevem uma escolha
     * manual feita nesta tela.
     */
    if (
      selectedPersonId !==
      undefined
    ) {
      return;
    }

    if (activePersonId) {
      setSelectedPersonId(
        activePersonId
      );

      return;
    }

    const firstPerson =
      persons.find(
        (person) =>
          Boolean(person.id)
      );

    setSelectedPersonId(
      firstPerson?.id || null
    );
  }, [
    activePersonId,
    persons,
    selectedPersonId,
  ]);

  // ==========================================================
  // DOCUMENTOS FILTRADOS
  // ==========================================================

  const documents =
    useMemo(() => {
      if (!categoryId) {
        return [];
      }

      const docs =
        allDocuments || [];

      const categoryDocuments =
        docs.filter(
          (doc: Document) =>
            doc.category_id ===
            categoryId
        );

      /*
       * undefined significa apenas que a seleção
       * inicial ainda está sendo definida.
       *
       * Nesse breve momento retornamos vazio para
       * evitar piscar documentos de todas as pessoas.
       */
      if (
        selectedPersonId ===
        undefined
      ) {
        return [];
      }

      if (
        selectedPersonId ===
        null
      ) {
        return categoryDocuments;
      }

      return categoryDocuments.filter(
        (doc: Document) =>
          doc.person_id ===
          selectedPersonId
      );
    }, [
      allDocuments,
      categoryId,
      selectedPersonId,
    ]);

  const totalDocs =
    documents.length;

  const selectedPerson =
    useMemo(() => {
      if (!selectedPersonId) {
        return undefined;
      }

      return persons.find(
        (person) =>
          person.id ===
          selectedPersonId
      );
    }, [
      persons,
      selectedPersonId,
    ]);

  // ==========================================================
  // FAVORITO
  // ==========================================================

  const handleFavoriteToggle =
    useCallback(
      async (id: string) => {
        try {
          await favorite(id);

          trigger(
            "vibrate"
          );
        } catch (error) {
          console.error(
            "Erro ao alterar favorito:",
            error
          );

          trigger("error");

          showToast(
            "Não foi possível alterar o favorito.",
            "error"
          );
        }
      },
      [
        favorite,
        showToast,
        trigger,
      ]
    );

  // ==========================================================
  // NOVO DOCUMENTO
  // ==========================================================

  const handleCreateDocument =
    useCallback(() => {
      if (!categoryId) {
        return;
      }

      trigger("vibrate");

      const params =
        new URLSearchParams();

      params.set(
        "categoria",
        categoryId
      );

      if (
        selectedPersonId &&
        selectedPersonId !==
          undefined
      ) {
        params.set(
          "person_id",
          selectedPersonId
        );
      }

      router.push(
        `/documentos/novo?${params.toString()}`
      );
    }, [
      categoryId,
      router,
      selectedPersonId,
      trigger,
    ]);

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
                size={22}
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
                router.push("/")
              }
            >
              Voltar
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

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
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
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-surface-border/40"
                  style={{
                    backgroundColor: `${category.color}18`,
                  }}
                >
                  <FolderOpen
                    size={18}
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
                    {totalDocs}{" "}
                    documento
                    {totalDocs !== 1
                      ? "s"
                      : ""}
                    {selectedPerson
                      ? ` de ${selectedPerson.name}`
                      : ""}
                  </p>
                </div>
              </div>

              {/* ==============================================
                  FILTRO DE PESSOA
                  ============================================== */}

              <div className="scrollbar-hide -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    setSelectedPersonId(
                      null
                    );
                  }}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                    selectedPersonId ===
                    null
                      ? "border-ice bg-ice/12 text-ice shadow-[0_0_0_1px_rgba(125,211,252,0.08)]"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  Todos
                </button>

                {persons.map(
                  (person) => {
                    if (!person.id) {
                      return null;
                    }

                    const selected =
                      selectedPersonId ===
                      person.id;

                    return (
                      <button
                        key={
                          person.id
                        }
                        type="button"
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );

                          setSelectedPersonId(
                            person.id!
                          );
                        }}
                        className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          selected
                            ? "border-ice bg-ice/12 text-ice shadow-[0_0_0_1px_rgba(125,211,252,0.08)]"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        {person.avatar_url ? (
                          <img
                            src={
                              person.avatar_url
                            }
                            alt={
                              person.name
                            }
                            className="h-4 w-4 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            className="flex h-4 w-4 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: `${person.color}20`,
                              color:
                                person.color,
                            }}
                          >
                            <User
                              size={
                                11
                              }
                            />
                          </span>
                        )}

                        <span>
                          {
                            person.name
                          }
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
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
              description={
                selectedPerson
                  ? `${selectedPerson.name} ainda não possui documentos nesta categoria.`
                  : "Comece adicionando documentos nesta categoria para deixar tudo centralizado e fácil de encontrar."
              }
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
                      opacity: 0,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration:
                        0.24,

                      /*
                       * Evita que uma categoria com dezenas
                       * de documentos demore vários segundos
                       * para terminar a animação.
                       */
                      delay:
                        Math.min(
                          index,
                          6
                        ) * 0.03,
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