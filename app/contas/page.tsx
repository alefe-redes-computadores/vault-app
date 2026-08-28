// app/contas/page.tsx
"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  Trash2,
  Wallet,
} from "lucide-react";

import { usePaginatedCards } from "@/hooks/usePaginatedCards";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { useToast } from "@/components/ToastProvider";

import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ScrollToTop } from "@/components/ScrollToTop";

import {
  ListCard,
  ListPageHeader,
  ListSearch,
} from "@/components/list";

import { getBankLogoUrl } from "@/lib/utils/card-helper";

const CONTA_COLOR = "#34D399";

export default function ContasPage() {
  const router = useRouter();

  const { trigger } =
    useHapticFeedback();

  const { showToast } =
    useToast();

  const {
    activePersonId,
  } = useActivePersonId();

  const {
    isPrivate,
    togglePrivacy,
  } = usePrivacyMode();

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    debouncedQuery,
    setDebouncedQuery,
  ] = useState("");

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [
    selectedCardId,
    setSelectedCardId,
  ] = useState<string | null>(
    null
  );

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const {
    cards,
    totalCount,
    hasMore,
    isLoadingMore,
    loadMore,
    deleteCard,
  } = usePaginatedCards({
    searchQuery:
      debouncedQuery,

    selectedType:
      "contas",

    personId:
      activePersonId,
  });

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setDebouncedQuery(
            searchQuery.trim()
          );
        },
        300
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [searchQuery]);

  const handleTogglePrivacy =
    () => {
      trigger("vibrate");
      togglePrivacy();
    };

  const handleNewAccount =
    () => {
      trigger("vibrate");

      router.push(
        "/contas/novo"
      );
    };

  const handleOpenAccount = (
    id?: string
  ) => {
    if (!id) {
      return;
    }

    trigger("vibrate");

    router.push(
      `/contas/detalhes?id=${encodeURIComponent(
        id
      )}`
    );
  };

  const handleDelete = (
    id?: string
  ) => {
    if (
      !id ||
      isDeleting
    ) {
      return;
    }

    trigger("vibrate");

    setSelectedCardId(id);
    setShowDeleteModal(true);
  };

  const handleCloseDelete =
    () => {
      if (isDeleting) {
        return;
      }

      setShowDeleteModal(false);
      setSelectedCardId(null);
    };

  const confirmDelete =
    async () => {
      if (
        !selectedCardId ||
        isDeleting
      ) {
        return;
      }

      trigger("vibrate");

      try {
        setIsDeleting(true);

        await deleteCard(
          selectedCardId
        );

        trigger("success");

        showToast(
          "Conta excluída com sucesso.",
          "success"
        );

        setShowDeleteModal(
          false
        );

        setSelectedCardId(
          null
        );
      } catch (error) {
        console.error(
          "Erro ao excluir conta:",
          error
        );

        trigger("error");

        showToast(
          error instanceof Error
            ? error.message
            : "Erro ao excluir conta.",
          "error"
        );
      } finally {
        setIsDeleting(false);
      }
    };

  const hasSearch =
    debouncedQuery.length > 0;

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-32">
        <ListPageHeader
          title="Contas Bancárias"
          subtitle={`${totalCount} ${
            totalCount === 1
              ? "conta"
              : "contas"
          }`}
          badgeLabel="Vault"
          badgeColor="text-ice/90"
          icon={
            <Wallet
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
                  ? "Desativar modo de privacidade"
                  : "Ativar modo de privacidade"
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
            placeholder="Buscar por título ou banco..."
          />
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {cards.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={
                hasSearch
                  ? "Nenhuma conta encontrada"
                  : "Nenhuma conta bancária"
              }
              description={
                hasSearch
                  ? "Tente buscar por outro título ou banco."
                  : "Adicione suas contas bancárias para manter os dados organizados no Vault."
              }
              actionLabel={
                hasSearch
                  ? undefined
                  : "Nova conta"
              }
              onAction={
                hasSearch
                  ? undefined
                  : handleNewAccount
              }
            />
          ) : (
            <>
              {cards.map(
                (
                  item,
                  index
                ) => {
                  const logoUrl =
                    getBankLogoUrl(
                      item.bank_name
                    );

                  return (
                    <ListCard
                      key={
                        item.id ??
                        `${item.title}-${index}`
                      }
                      id={
                        item.id ??
                        ""
                      }
                      color={
                        CONTA_COLOR
                      }
                      onClick={() =>
                        handleOpenAccount(
                          item.id
                        )
                      }
                      delay={Math.min(
                        index *
                          0.025,
                        0.25
                      )}
                      icon={
                        logoUrl ? (
                          <img
                            src={
                              logoUrl
                            }
                            alt={
                              item.bank_name
                            }
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
                              22
                            }
                          />
                        )
                      }
                      actions={
                        item.id ? (
                          <button
                            type="button"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              handleDelete(
                                item.id
                              );
                            }}
                            disabled={
                              isDeleting
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-colors hover:border-coral/30 hover:text-coral active:scale-95 disabled:opacity-50"
                            aria-label="Excluir conta"
                          >
                            <Trash2
                              size={
                                14
                              }
                            />
                          </button>
                        ) : undefined
                      }
                    >
                      <div className="flex min-w-0 items-baseline gap-2">
                        <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                          {isPrivate
                            ? "••••••••••••"
                            : item.title}
                        </h3>
                      </div>

                      <p className="mt-1 truncate text-sm text-ink-muted">
                        {isPrivate
                          ? "••••••"
                          : item.bank_name}
                      </p>
                    </ListCard>
                  );
                }
              )}

              {hasMore && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      loadMore();
                    }}
                    disabled={
                      isLoadingMore
                    }
                    className="rounded-2xl border border-surface-border/50 bg-surface px-6 py-3 text-xs font-medium text-ink-primary transition-all hover:border-ice/40 active:scale-95 disabled:opacity-50"
                  >
                    {isLoadingMore && (
                      <Loader2
                        size={
                          16
                        }
                        className="mr-1 inline animate-spin"
                      />
                    )}

                    {isLoadingMore
                      ? "Carregando..."
                      : "Carregar mais contas"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <ConfirmationModal
          isOpen={
            showDeleteModal
          }
          onClose={
            handleCloseDelete
          }
          onConfirm={
            confirmDelete
          }
          title="Excluir conta"
          message="Tem certeza que deseja excluir esta conta bancária?"
          confirmLabel={
            isDeleting
              ? "Excluindo..."
              : "Excluir"
          }
          cancelLabel="Cancelar"
          type="danger"
        />

        <ScrollToTop
          threshold={200}
        />
      </main>
    </PageTransition>
  );
}