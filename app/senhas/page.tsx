// app/senhas/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  KeyRound,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ShieldAlert,
  Clock,
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
  ListPageHeader,
  ListSearch,
  ListFilters,
} from "@/components/list";

const CATEGORIES = [
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
] as const;

export default function PasswordsPage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();

  const { activePersonId } = useActivePersonId();
  const { isLocked } = useSecureScreen();
  const { isPrivate, togglePrivacy } = usePrivacyMode();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const {
    credentials: rawCredentials,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedCredentials({
    searchQuery: debouncedQuery,
    category: selectedCategory,
  });

  /**
   * O hook busca os registros de acordo com busca/categoria.
   * Aqui aplicamos o contexto global da pessoa ativa.
   */
  const credentials = useMemo(() => {
    if (!rawCredentials) return [];

    return rawCredentials.filter(
      (credential) =>
        !activePersonId ||
        !credential.person_id ||
        credential.person_id === activePersonId
    );
  }, [rawCredentials, activePersonId]);

  const { authenticate } = useBiometric({
    title: "Copiar Senha",
    subtitle:
      "Confirme sua identidade para copiar a senha para a área de transferência.",
    fallbackTitle: "Usar senha do dispositivo",
  });

  /**
   * Debounce da pesquisa para evitar consultas a cada tecla.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  /**
   * Copia a senha somente depois da autenticação biométrica
   * e agenda a limpeza da área de transferência.
   */
  const handleCopyPassword = async (encryptedPassword: string) => {
    try {
      const authenticated = await authenticate();

      if (!authenticated) {
        return;
      }

      const plainText = decryptPassword(encryptedPassword);

      if (!plainText) {
        trigger("error");
        showToast("Não foi possível descriptografar a senha.", "error");
        return;
      }

      await Clipboard.write({
        string: plainText,
      });

      trigger("success");
      showToast("Senha copiada! Será limpa em 60s.", "success");

      window.setTimeout(() => {
        void Clipboard.write({ string: "" }).catch((error) => {
          console.error(
            "Erro ao limpar a área de transferência:",
            error
          );
        });
      }, 60_000);
    } catch (error) {
      console.error("Erro ao copiar senha:", error);
      trigger("error");
      showToast("Não foi possível copiar a senha.", "error");
    }
  };

  const handleTogglePrivacy = () => {
    trigger("vibrate");
    togglePrivacy();
  };

  const handleCategoryChange = (categoryId: string) => {
    trigger("vibrate");
    setSelectedCategory(categoryId);
  };

  const handleClearFilters = () => {
    trigger("vibrate");
    setSelectedCategory("all");
  };

  const handleCreatePassword = () => {
    trigger("vibrate");
    router.push("/senhas/novo");
  };

  const handleLoadMore = () => {
    if (isLoadingMore) return;

    trigger("vibrate");
    void loadMore();
  };

  if (isLocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-void px-5 text-center">
        <Lock size={48} className="mb-4 text-ice" />

        <h2 className="font-display text-xl text-ink-primary">
          Vault Bloqueado
        </h2>

        <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
          Desbloqueie o Vault para visualizar suas credenciais.
        </p>
      </div>
    );
  }

  const credentialCount = credentials.length;
  const credentialLabel =
    credentialCount === 1 ? "senha encontrada" : "senhas encontradas";

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Senhas"
          subtitle={`${credentialCount} ${credentialLabel}`}
          badgeLabel="Vault"
          badgeColor="text-ice/90"
          icon={<KeyRound size={14} />}
          iconColor="text-ice"
          rightAction={
            <button
              type="button"
              onClick={handleTogglePrivacy}
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
              aria-pressed={isPrivate}
            >
              {isPrivate ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        >
          <div className="flex items-center gap-2">
            <ListSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar senhas, logins ou sites..."
            />
          </div>

          <ListFilters onClear={handleClearFilters}>
            {CATEGORIES.map((category) => {
              const CategoryIcon = (category as any).icon;
              const isSelected = selectedCategory === category.id;


              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryChange(category.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-all active:scale-95 ${
                    isSelected
                      ? category.id === "fracas"
                        ? "border-coral bg-coral/15 text-coral"
                        : "border-ice bg-ice/12 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted"
                  }`}
                  aria-pressed={isSelected}
                >
                  {CategoryIcon && <CategoryIcon size={13} />}
                  {category.label}
                </button>
              );
            })}
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {credentials.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="Nenhuma senha encontrada"
              description="Tente alterar os filtros de busca ou adicione uma nova senha."
              actionLabel="Nova senha"
              onAction={handleCreatePassword}
            />
          ) : (
            <>
              <div className="space-y-3">
                {credentials.map((credential) => (
                  <CredentialCard
                    key={credential.id}
                    credential={credential}
                    onClick={() =>
                      router.push(
                        `/senhas/detalhes?id=${credential.id}`
                      )
                    }
                    onCopy={(event: React.MouseEvent) => {
                      event.preventDefault();
                      event.stopPropagation();

                      void handleCopyPassword(
                        credential.password_encrypted
                      );
                    }}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface px-6 py-3 text-xs font-medium text-ink-primary transition-all active:scale-95 hover:border-ice/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoadingMore && (
                      <Loader2
                        size={16}
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

        <ScrollToTop threshold={200} />
      </main>
    </PageTransition>
  );
}