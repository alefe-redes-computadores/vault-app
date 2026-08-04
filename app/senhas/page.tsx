"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, KeyRound, Sparkles } from "lucide-react";
import { useCredentials } from "@/hooks/useCredentials";
import { useBiometric } from "@/hooks/useBiometric";
import { decryptPassword } from "@/lib/crypto";
import { useHapticFeedback } from "@/lib/haptics";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { CredentialCard } from "@/components/CredentialCard";
import { ScrollToTop } from "@/components/ScrollToTop";

const listVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

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
  const { credentials } = useCredentials();
  const { authenticate } = useBiometric({
    title: "Copiar Senha",
    subtitle: "Confirme sua identidade para copiar a senha para a área de transferência.",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredCredentials = useMemo(() => {
    return credentials.filter((cred) => {
      const matchesSearch =
        cred.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cred.username && cred.username.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || cred.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [credentials, searchQuery, selectedCategory]);

  const handleCopyPassword = async (encryptedPassword: string) => {
    try {
      // 1. Pede a digital/rosto
      const isAuth = await authenticate();
      if (!isAuth) return; // Se cancelar ou errar, aborta

      // 2. Descriptografa e copia
      const plainText = decryptPassword(encryptedPassword);
      if (plainText && navigator.clipboard) {
        await navigator.clipboard.writeText(plainText);
        trigger("success");
      }
    } catch (error) {
      console.error("Erro ao copiar:", error);
      trigger("error");
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Senhas
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                {filteredCredentials.length} senha{filteredCredentials.length !== 1 ? "s" : ""}
                {selectedCategory !== "all" || searchQuery ? " filtradas" : " seguras"}
              </p>
            </div>

            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/senhas/novo");
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/20 transition-all active:scale-95"
              aria-label="Nova Senha"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="relative mt-4">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <Input
              placeholder="Buscar senhas, logins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9 transition-all"
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

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
                    : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </header>

        <section className="px-5 pt-5">
          {filteredCredentials.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-[30px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="glow-ice mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-ice/15 bg-surface-raised">
                <KeyRound size={28} className="text-ice/60" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-primary">
                Nenhuma senha encontrada
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Adicione suas senhas para mantê-las criptografadas, seguras e com fácil acesso offline.
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {filteredCredentials.map((cred) => (
                <motion.div key={cred.id} variants={cardVariants}>
                  <CredentialCard
                    credential={cred}
                    onClick={() => router.push(`/senhas/${cred.id}`)}
                    onCopy={(e) => {
                      e.preventDefault();
                      handleCopyPassword(cred.password_encrypted);
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        <ScrollToTop threshold={200} />
      </main>
    </PageTransition>
  );
}
