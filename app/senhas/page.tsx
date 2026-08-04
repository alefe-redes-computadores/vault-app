"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, KeyRound, Lock } from "lucide-react";
import { Clipboard } from "@capacitor/clipboard";
import { useCredentials } from "@/hooks/useCredentials";
import { useBiometric } from "@/hooks/useBiometric";
import { useSecureScreen } from "@/hooks/useSecureScreen";
import { decryptPassword } from "@/lib/crypto";
import { useHapticFeedback } from "@/lib/haptics";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { CredentialCard } from "@/components/CredentialCard";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useToast } from "@/components/ToastProvider";
import { normalizeText } from "@/lib/utils/credential-helper";

const CATEGORIES = [
  { id: "all", label: "Todas" },
  { id: "banco", label: "Bancos" },
  { id: "social", label: "Redes Sociais" },
  { id: "trabalho", label: "Trabalho" },
  { id: "outros", label: "Outros" },
];

export default function PasswordsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast } = useToast();
  const { credentials } = useCredentials();
  
  const { isLocked } = useSecureScreen(); 
  const [isComposeMenuOpen, setIsComposeMenuOpen] = useState(false);
  
  const { authenticate } = useBiometric({
    title: "Copiar Senha",
    subtitle: "Confirme sua identidade para copiar a senha para a área de transferência.",
    fallbackTitle: "Usar senha do dispositivo",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Implementação do Debounce (300ms) para otimizar a performance da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredCredentials = useMemo(() => {
    const query = normalizeText(debouncedQuery);

    return credentials.filter((cred) => {
      const titleMatch = normalizeText(cred.title).includes(query);
      const userMatch = cred.username ? normalizeText(cred.username).includes(query) : false;
      const urlMatch = cred.url ? normalizeText(cred.url).includes(query) : false;

      const matchesSearch = !query || titleMatch || userMatch || urlMatch;
      const matchesCategory = selectedCategory === "all" || cred.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [credentials, debouncedQuery, selectedCategory]);

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

  const handleComposePress = () => {
    trigger("vibrate");
    setIsComposeMenuOpen((prev) => !prev);
  };

  const handleOptionPress = (path: string) => {
    trigger("success");
    setIsComposeMenuOpen(false);
    router.push(path);
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
                {filteredCredentials.length} senha{filteredCredentials.length !== 1 ? "s" : ""}
              </p>
            </div>
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
                onClick={() => {
                  trigger("vibrate");
                  setSelectedCategory(cat.id);
                }}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-all active:scale-95 ${
                  selectedCategory === cat.id
                    ? "border-ice bg-ice/12 text-ice"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </header>

        <section className="px-5 pt-5">
          {filteredCredentials.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[30px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm">
              <div className="glow-ice mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-ice/15 bg-surface-raised">
                <KeyRound size={28} className="text-ice/60" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-primary">Nenhuma senha</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCredentials.map((cred) => (
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
          )}
        </section>

        {/* Menu Flutuante Contextual de Adição */}
        <AnimatePresence>
          {isComposeMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                onClick={() => setIsComposeMenuOpen(false)}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="shadow-vault fixed bottom-[5.5rem] left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-xs -translate-x-1/2 overflow-hidden rounded-[26px] border border-surface-border/60 bg-surface"
              >
                <div className="px-4 pb-1 pt-3.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                    Gerenciar Senhas
                  </p>
                </div>
                <div className="px-2 pb-2">
                  <button
                    onClick={() => handleOptionPress("/senhas/novo")}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                      <KeyRound size={16} />
                    </div>
                    <span className="text-sm font-medium text-ink-primary">
                      Nova senha
                    </span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Botão Flutuante Inferior Centralizado */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={handleComposePress}
            aria-label="Adicionar senha"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-ice text-void shadow-[0_16px_32px_rgba(47,227,201,0.28)] transition-all duration-200 active:scale-95"
          >
            <motion.div
              animate={{ rotate: isComposeMenuOpen ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Plus size={24} strokeWidth={2.6} />
            </motion.div>
          </button>
        </div>

        <ScrollToTop threshold={200} />
      </main>
    </PageTransition>
  );
}
