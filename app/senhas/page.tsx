// app/senhas/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search, X, KeyRound, Lock, Loader2, Eye, EyeOff, ShieldAlert, Clock,
} from "lucide-react";
import { Clipboard } from "@capacitor/clipboard";
import { usePaginatedCredentials } from "@/hooks/usePaginatedCredentials";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { credentials, totalCount, hasMore, isLoadingMore, loadMore } = usePaginatedCredentials({
    searchQuery: debouncedQuery,
    category: selectedCategory,
  });

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
      <main className="min-h-screen bg-void pb-28">
        <header className="header-safe-top sticky top-0 z-25 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Senhas</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {totalCount} senha{totalCount !== 1 ? "s" : ""} encontrada{totalCount !== 1 ? "s" : ""}
              </p>
            </div>

            <button
              onClick={handleTogglePrivacy}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
                isPrivate ? "border-ice bg-ice/10 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ice"
              }`}
              aria-label="Modo Privacidade"
            >
              {isPrivate ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative mt-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted" />
            <Input
              placeholder="Buscar senhas, logins ou sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-muted active:scale-95"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="scrollbar-hide mt-4 flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { trigger("vibrate"); setSelectedCategory(cat.id); }}
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
          </div>
        </header>

        <section className="px-5 pt-5">
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

              {hasMore && (
                <div className="pt-4 text-center">
                  <button
                    onClick={() => { trigger("vibrate"); loadMore(); }}
                    disabled={isLoadingMore}
                    className="rounded-2xl border border-surface-border/50 bg-surface px-6 py-3 text-xs font-medium text-ink-primary transition-all active:scale-95 hover:border-ice/40 disabled:opacity-50"
                  >
                    {isLoadingMore ? <Loader2 size={16} className="animate-spin inline mr-1" /> : null}
                    Carregar mais registros
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <ScrollToTop threshold={200} />
      </main>
    </PageTransition>
  );
}