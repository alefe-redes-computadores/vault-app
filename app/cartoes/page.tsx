// app/cartoes/page.tsx

"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { usePaginatedCards } from "@/hooks/usePaginatedCards";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

import { useHapticFeedback } from "@/lib/haptics";
import {
  getBankLogoUrl,
  getBrandLabel,
} from "@/lib/utils/card-helper";

import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useToast } from "@/components/ToastProvider";

import {
  ListPageHeader,
  ListSearch,
} from "@/components/list";

const CARD_COLOR =
  "#38BDF8";

export default function CartoesPage() {
  const router =
    useRouter();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    isPrivate,
    togglePrivacy,
  } =
    usePrivacyMode();

  const {
    showToast,
  } =
    useToast();

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  const [
    debouncedQuery,
    setDebouncedQuery,
  ] =
    useState("");

  const [
    selectedCardId,
    setSelectedCardId,
  ] =
    useState<
      string | null
    >(null);

  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(false);

  /* ============================================================
     DEBOUNCE
     ============================================================ */

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setDebouncedQuery(
            searchQuery.trim()
          );
        },
        250
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    searchQuery,
  ]);

  /* ============================================================
     DADOS
     ============================================================ */

  const {
    cards,
    totalCount,
    hasMore,
    isLoadingMore,
    loadMore,
    deleteCard,
  } =
    usePaginatedCards({
      searchQuery:
        debouncedQuery,

      selectedType:
        "cartoes",

      personId:
        activePersonId,

      includeLegacyWithoutPerson:
        false,
    });

  /* ============================================================
     HANDLERS
     ============================================================ */

  const handleOpenCard =
    (
      id?:
        string
    ) => {
      if (!id) {
        return;
      }

      trigger(
        "vibrate"
      );

      router.push(
        `/cartoes/detalhes?id=${encodeURIComponent(
          id
        )}`
      );
    };

  const handleCreateCard =
    () => {
      trigger(
        "vibrate"
      );

      router.push(
        "/cartoes/novo"
      );
    };

  const handleRequestDelete =
    (
      id?:
        string
    ) => {
      if (
        !id ||
        isDeleting
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setSelectedCardId(
        id
      );
    };

  const handleCancelDelete =
    () => {
      if (
        isDeleting
      ) {
        return;
      }

      setSelectedCardId(
        null
      );
    };

  const handleConfirmDelete =
    async () => {
      if (
        !selectedCardId ||
        isDeleting
      ) {
        return;
      }

      try {
        setIsDeleting(
          true
        );

        await deleteCard(
          selectedCardId
        );

        trigger(
          "success"
        );

        showToast(
          "Cartão excluído com sucesso.",
          "success"
        );

        setSelectedCardId(
          null
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao excluir cartão:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          error instanceof
            Error
            ? error.message
            : "Não foi possível excluir o cartão.",
          "error"
        );
      } finally {
        setIsDeleting(
          false
        );
      }
    };

  const handleTogglePrivacy =
    () => {
      trigger(
        "vibrate"
      );

      togglePrivacy();
    };

  const handleLoadMore =
    () => {
      if (
        isLoadingMore
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      loadMore();
    };

  /* ============================================================
     ESTADO
     ============================================================ */

  const hasSearch =
    debouncedQuery.length >
    0;

  const cardLabel =
    totalCount === 1
      ? "cartão encontrado"
      : "cartões encontrados";

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Cartões"
          subtitle={`${totalCount} ${cardLabel}`}
          badgeLabel="Vault"
          badgeColor="text-ice/90"
          icon={
            <CreditCard
              size={14}
            />
          }
          iconColor="text-ice"
          rightAction={
            <button
              type="button"
              onClick={
                handleTogglePrivacy
              }
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
                isPrivate
                  ? "border-ice bg-ice/10 text-ice"
                  : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ice"
              }`}
              aria-label={
                isPrivate
                  ? "Desativar modo privacidade"
                  : "Ativar modo privacidade"
              }
              aria-pressed={
                isPrivate
              }
            >
              {isPrivate ? (
                <EyeOff
                  size={18}
                />
              ) : (
                <Eye
                  size={18}
                />
              )}
            </button>
          }
        >
          <ListSearch
            value={
              searchQuery
            }
            onChange={
              setSearchQuery
            }
            placeholder="Buscar cartão ou banco..."
          />
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {cards.length ===
          0 ? (
            hasSearch ? (
              <EmptyState
                icon={
                  CreditCard
                }
                title="Nenhum cartão encontrado"
                description="Nenhum cartão desta pessoa corresponde à busca atual."
                actionLabel="Limpar busca"
                onAction={() =>
                  setSearchQuery(
                    ""
                  )
                }
              />
            ) : (
              <EmptyState
                icon={
                  CreditCard
                }
                title="Nenhum cartão cadastrado"
                description="Adicione o primeiro cartão desta pessoa ao Vault."
                actionLabel="Novo cartão"
                onAction={
                  handleCreateCard
                }
              />
            )
          ) : (
            <>
              <div className="space-y-3">
                {cards.map(
                  (
                    card,
                    index
                  ) => {
                    const bankLogo =
                      getBankLogoUrl(
                        card.bank_name
                      );

                    const brandLabel =
                      card.brand
                        ? getBrandLabel(
                            card.brand
                          )
                        : null;

                    const animationDelay =
                      Math.min(
                        index *
                          25,
                        250
                      );

                    const title =
                      isPrivate
                        ? "••••••••"
                        : card.title;

                    const bankName =
                      isPrivate
                        ? "••••••"
                        : card.bank_name;

                    const typeLabel =
                      card.type ===
                      "cartao_credito"
                        ? "Crédito"
                        : "Débito";

                    const subtitleParts =
                      [
                        bankName,
                        brandLabel,
                        typeLabel,
                      ].filter(
                        (
                          value
                        ): value is string =>
                          Boolean(
                            value
                          )
                      );

                    return (
                      <article
                        key={
                          card.id ??
                          `${card.title}-${index}`
                        }
                        style={{
                          animationDelay:
                            `${animationDelay}ms`,
                        }}
                        className="animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-[24px] border border-surface-border/50 bg-surface shadow-sm duration-300 fill-mode-both"
                      >
                        <div className="flex items-center gap-3 p-4">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenCard(
                                card.id
                              )
                            }
                            className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]"
                          >
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-surface-border/50 bg-surface-raised"
                              style={{
                                borderColor:
                                  `${CARD_COLOR}22`,
                              }}
                            >
                              {bankLogo ? (
                                <img
                                  src={
                                    bankLogo
                                  }
                                  alt={`Logo ${
                                    isPrivate
                                      ? "do banco"
                                      : card.bank_name
                                  }`}
                                  className="h-7 w-7 object-contain"
                                  onError={(
                                    event
                                  ) => {
                                    event.currentTarget.style.display =
                                      "none";
                                  }}
                                />
                              ) : (
                                <Landmark
                                  size={
                                    20
                                  }
                                  style={{
                                    color:
                                      CARD_COLOR,
                                  }}
                                  aria-hidden="true"
                                />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink-primary">
                                {
                                  title
                                }
                              </p>

                              <p className="mt-1 truncate text-xs text-ink-muted">
                                {subtitleParts.join(
                                  " • "
                                )}
                              </p>
                            </div>

                            <CreditCard
                              size={17}
                              className="shrink-0 text-ink-faint"
                              aria-hidden="true"
                            />
                          </button>

                          {card.id && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRequestDelete(
                                  card.id
                                )
                              }
                              disabled={
                                isDeleting
                              }
                              aria-label="Excluir cartão"
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-coral transition-all hover:bg-coral/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2
                                size={
                                  16
                                }
                                aria-hidden="true"
                              />
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  }
                )}
              </div>

              {hasMore && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={
                      handleLoadMore
                    }
                    disabled={
                      isLoadingMore
                    }
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface px-6 py-3 text-xs font-medium text-ink-primary transition-all hover:border-ice/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoadingMore && (
                      <Loader2
                        size={
                          16
                        }
                        className="mr-2 animate-spin"
                      />
                    )}

                    {isLoadingMore
                      ? "Carregando..."
                      : "Carregar mais registros"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <button
          type="button"
          onClick={
            handleCreateCard
          }
          aria-label="Adicionar cartão"
          className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/20 transition-all active:scale-95"
        >
          <Plus
            size={22}
            strokeWidth={
              2.5
            }
            aria-hidden="true"
          />
        </button>

        <ScrollToTop
          threshold={200}
        />

        <ConfirmationModal
          isOpen={
            Boolean(
              selectedCardId
            )
          }
          title="Excluir cartão?"
          message="Este cartão será removido do Vault. Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          onConfirm={
            handleConfirmDelete
          }
          onClose={
            handleCancelDelete
          }
          type="danger"
          isLoading={
            isDeleting
          }
          closeOnBackdrop
        />
      </main>
    </PageTransition>
  );
}