// app/senhas/page.tsx
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { Clipboard } from "@capacitor/clipboard";

import { usePaginatedCredentials } from "@/hooks/usePaginatedCredentials";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useBiometric } from "@/hooks/useBiometric";
import { useSecureScreen } from "@/hooks/useSecureScreen";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

import { decryptPassword } from "@/lib/crypto";
import { useHapticFeedback } from "@/lib/haptics";

import { PageTransition } from "@/components/PageTransition";
import { CredentialCard } from "@/components/CredentialCard";
import { EmptyState } from "@/components/EmptyState";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useToast } from "@/components/ToastProvider";

import {
  ListFilters,
  ListPageHeader,
  ListSearch,
} from "@/components/list";

import type {
  Credential,
} from "@/lib/types";

/* ============================================================
   TIPOS
   ============================================================ */

type CredentialCategoryFilter =
  | "all"
  | "fracas"
  | "recentes"
  | Credential["category"];

interface CategoryOption {
  id: CredentialCategoryFilter;
  label: string;
  icon?: LucideIcon;
}

/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const CATEGORIES: CategoryOption[] = [
  {
    id: "all",
    label: "Todas",
  },
  {
    id: "fracas",
    label: "Senhas Fracas",
    icon: ShieldAlert,
  },
  {
    id: "recentes",
    label: "Recentes",
    icon: Clock,
  },
  {
    id: "banco",
    label: "Bancos",
  },
  {
    id: "social",
    label: "Redes Sociais",
  },
  {
    id: "trabalho",
    label: "Trabalho",
  },
  {
    id: "outros",
    label: "Outros",
  },
];

/* ============================================================
   PÁGINA
   ============================================================ */

export default function PasswordsPage() {
  const router = useRouter();

  const {
    trigger,
  } = useHapticFeedback();

  const {
    showToast,
  } = useToast();

  const {
    activePersonId,
  } = useActivePersonId();

  const {
    isLocked,
  } = useSecureScreen();

  const {
    isPrivate,
    togglePrivacy,
  } = usePrivacyMode();

  const clipboardClearTimeoutRef =
    useRef<
      ReturnType<typeof setTimeout> | null
    >(null);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    debouncedQuery,
    setDebouncedQuery,
  ] = useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState<CredentialCategoryFilter>(
      "all"
    );

  const {
    credentials,
    totalCount,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedCredentials({
    searchQuery:
      debouncedQuery,
    category:
      selectedCategory,
    personId:
      activePersonId,
    includeLegacyWithoutPerson:
      false,
  });

  const {
    authenticate,
  } = useBiometric({
    title: "Copiar Senha",
    subtitle:
      "Confirme sua identidade para copiar a senha para a área de transferência.",
    fallbackTitle:
      "Usar senha do dispositivo",
  });

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
        300
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [searchQuery]);

  /* ============================================================
     CLEANUP
     ============================================================ */

  useEffect(() => {
    return () => {
      if (
        clipboardClearTimeoutRef.current
      ) {
        clearTimeout(
          clipboardClearTimeoutRef.current
        );
      }
    };
  }, []);

  /* ============================================================
     HANDLERS
     ============================================================ */

  const handleCopyPassword =
    async (
      encryptedPassword: string
    ) => {
      trigger("vibrate");

      try {
        const authenticated =
          await authenticate();

        if (!authenticated) {
          return;
        }

        const plainText =
          decryptPassword(
            encryptedPassword
          );

        if (!plainText) {
          trigger("error");

          showToast(
            "Não foi possível descriptografar a senha.",
            "error"
          );

          return;
        }

        await Clipboard.write({
          string: plainText,
        });

        trigger("success");

        showToast(
          "Senha copiada! Será limpa em 60s.",
          "success"
        );

        if (
          clipboardClearTimeoutRef.current
        ) {
          clearTimeout(
            clipboardClearTimeoutRef.current
          );
        }

        clipboardClearTimeoutRef.current =
          setTimeout(
            () => {
              void Clipboard.write({
                string: "",
              }).catch(
                (error) => {
                  console.error(
                    "Erro ao limpar a área de transferência:",
                    error
                  );
                }
              );
            },
            60_000
          );
      } catch (error) {
        console.error(
          "Erro ao copiar senha:",
          error
        );

        trigger("error");

        showToast(
          "Não foi possível copiar a senha.",
          "error"
        );
      }
    };

  const handleTogglePrivacy =
    () => {
      trigger("vibrate");
      togglePrivacy();
    };

  const handleCategoryChange =
    (
      categoryId: CredentialCategoryFilter
    ) => {
      trigger("vibrate");

      setSelectedCategory(
        categoryId
      );
    };

  const handleClearFilters =
    () => {
      trigger("vibrate");

      setSelectedCategory(
        "all"
      );

      setSearchQuery("");
    };

  const handleCreatePassword =
    () => {
      trigger("vibrate");

      router.push(
        "/senhas/novo"
      );
    };

  const handleOpenCredential =
    (
      credentialId:
        | string
        | undefined
    ) => {
      if (!credentialId) {
        return;
      }

      trigger("vibrate");

      router.push(
        `/senhas/detalhes?id=${encodeURIComponent(
          credentialId
        )}`
      );
    };

  const handleLoadMore =
    () => {
      if (isLoadingMore) {
        return;
      }

      trigger("vibrate");

      loadMore();
    };

  /* ============================================================
     VAULT BLOQUEADO
     ============================================================ */

  if (isLocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-void px-5 text-center">
        <Lock
          size={48}
          className="mb-4 text-ice"
        />

        <h2 className="font-display text-xl text-ink-primary">
          Vault Bloqueado
        </h2>

        <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
          Desbloqueie o Vault para visualizar suas credenciais.
        </p>
      </div>
    );
  }

  /* ============================================================
     ESTADO DA LISTA
     ============================================================ */

  const hasActiveSearch =
    debouncedQuery.length > 0;

  const hasActiveFilter =
    selectedCategory !==
    "all";

  const hasFilters =
    hasActiveSearch ||
    hasActiveFilter;

  const credentialLabel =
    totalCount === 1
      ? "senha encontrada"
      : "senhas encontradas";

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Senhas"
          subtitle={`${totalCount} ${credentialLabel}`}
          badgeLabel="Vault"
          badgeColor="text-ice/90"
          icon={
            <KeyRound
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
            placeholder="Buscar senhas, logins ou sites..."
          />

          <ListFilters
            onClear={
              handleClearFilters
            }
          >
            {CATEGORIES.map(
              (category) => {
                const CategoryIcon =
                  category.icon;

                const isSelected =
                  selectedCategory ===
                  category.id;

                return (
                  <button
                    key={
                      category.id
                    }
                    type="button"
                    onClick={() =>
                      handleCategoryChange(
                        category.id
                      )
                    }
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-all active:scale-95 ${
                      isSelected
                        ? category.id ===
                          "fracas"
                          ? "border-coral bg-coral/15 text-coral"
                          : "border-ice bg-ice/12 text-ice"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted"
                    }`}
                    aria-pressed={
                      isSelected
                    }
                  >
                    {CategoryIcon && (
                      <CategoryIcon
                        size={
                          13
                        }
                      />
                    )}

                    {
                      category.label
                    }
                  </button>
                );
              }
            )}
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {credentials.length ===
          0 ? (
            hasFilters ? (
              <EmptyState
                icon={
                  KeyRound
                }
                title="Nenhuma senha encontrada"
                description="Nenhuma credencial desta pessoa corresponde à busca ou aos filtros selecionados."
                actionLabel="Limpar filtros"
                onAction={
                  handleClearFilters
                }
              />
            ) : (
              <EmptyState
                icon={
                  KeyRound
                }
                title="Nenhuma senha cadastrada"
                description="Adicione a primeira credencial desta pessoa ao Vault."
                actionLabel="Nova senha"
                onAction={
                  handleCreatePassword
                }
              />
            )
          ) : (
            <>
              <div className="space-y-3">
                {credentials.map(
                  (
                    credential
                  ) => (
                    <CredentialCard
                      key={
                        credential.id
                      }
                      credential={
                        credential
                      }
                      onClick={() =>
                        handleOpenCredential(
                          credential.id
                        )
                      }
                      onCopy={(
                        event
                      ) => {
                        event.preventDefault();
                        event.stopPropagation();

                        void handleCopyPassword(
                          credential.password_encrypted
                        );
                      }}
                    />
                  )
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

        <ScrollToTop
          threshold={200}
        />
      </main>
    </PageTransition>
  );
}