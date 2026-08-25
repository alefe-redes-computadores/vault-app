// app/senhas/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/Input";
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
  { id: "all", label: "Todas" },
  { id: "fracas", label: "Senhas Fracas", icon: ShieldAlert },
  { id: "recentes", label: "Recentes", icon: Clock },
  { id: "banco", label: "Bancos" },
  { id: "social", label: "Redes Sociais" },
  { id: "trabalho", label: "Trabalho" },
  { id: "outros", label: "Outros" },
];

export default function PasswordsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast } = useToast();
  const { activePersonId } = useActivePersonId();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { credentials: rawCredentials, totalCount, hasMore, isLoadingMore, loadMore } = usePaginatedCredentials({
    searchQuery: debouncedQuery,
    category: selectedCategory,
  });

  const credentials = useMemo(() => {
    if (!rawCredentials) return [];
    return rawCredentials.filter((c: any) => !activePersonId || !c.person_id || c.person_id === activePersonId);
  }, [rawCredentials, activePersonId]);

  const { isLocked } = useSecureScreen();
  const { isPrivate, togglePrivacy } = usePrivacyMode();

  const { authenticate } = useBiometric({
    title: "Copiar Senha",
    subtitle: "Confirme sua identidade para copiar a senha para a área de transferência.",
    fallbackTitle: "Usar senha do dispositivo",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCopyPassword = async (encryptedPassword: string) => {
    try {
      const isAuth = await authenticate();
      if (!isAuth) return;

      const plainText = decryptPassword(encryptedPassword);
      if (plainText) {
        await Clipboard.write({ string: plainText });
        trigger("success");
        showToast("Senha copiada! Será limpa em 60s.", "success");

        setTimeout(() => {
          Clipboard.write({ string: "" });
        }, 60000);
      }
    } catch (error) {
      console.error("Erro ao copiar:", error);
      trigger("error");
    }
  };

  const handleTogglePrivacy = () => {
    trigger("vibrate");
    togglePrivacy();
  };

  const handleClearFilters = () => {
    trigger("vibrate");
    setSelectedCategory("all");
  };

  if (isLocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-void">
        <Lock size={48} className="mb-4 text-ice" />
        <h2 className="font-display text-xl text-ink-primary">Vault Bloqueado</h2>
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Senhas"
          subtitle={`${credentials.length} senha${credentials.length !== 1 ? "s" : ""} encontrada${credentials.length !== 1 ? "s" : ""}`}
          badgeLabel="Vault"
          badgeColor="text-ice/90"
          icon={<KeyRound size={14} />}
          iconColor="text-ice"
          rightAction={
            <button
              type="button"
              onClick={handleTogglePrivacy}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
                isPrivate ? "border-ice bg-ice/10 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ice"
              }`}
              aria-label="Modo Privacidade"
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
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setSelectedCategory(cat.id);
                }}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-all active:scale-95 flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? cat.id === "fracas"
                      ? "border-coral bg-coral/15 text-coral"
                      : "border-ice bg-ice/12 text-ice"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
              >
                {cat.icon && <cat.icon size={13} />}
                {cat.label}
              </button>
            ))}
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {credentials.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="Nenhuma senha encontrada"
              description="Tente alterar os filtros de busca ou adicione uma nova senha."
              actionLabel="Nova senha"
              onAction={() => {
                trigger("vibrate");
                router.push("/senhas/novo");
              }}
            />
          ) : (
            <>
              <div className="space-y-3">
                {credentials.map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    onClick={() => router.push(`/senhas/detalhes?id=${cred.id}`)}
                    onCopy={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCopyPassword(cred.password_encrypted);
                    }}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => { trigger("vibrate"); loadMore(); }}
                    disabled={isLoadingMore}
                    className="rounded-2xl border border-surface-border/50 bg-surface px-6 py-3 text-xs font-medium text-ink-primary transition-all active:scale-95 hover:border-ice/40 disabled:opacity-50"
                  >
                    {isLoadingMore ? <Loader2 size={16} className="animate-spin inline mr-1" /> : null}
                    Carregar mais registros
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