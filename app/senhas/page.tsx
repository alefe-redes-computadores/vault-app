"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  
  // 1. Injetando a proteção de segundo plano
  const { isLocked } = useSecureScreen(); 
  
  // 2. Adicionando o fallback da biometria
  const { authenticate } = useBiometric({
    title: "Copiar Senha",
    subtitle: "Confirme sua identidade para copiar a senha para a área de transferência.",
    fallbackTitle: "Usar senha do dispositivo",
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
      const isAuth = await authenticate();
      if (!isAuth) return;

      const plainText = decryptPassword(encryptedPassword);
      if (plainText) {
        // 3. Usando o plugin nativo do Capacitor
        await Clipboard.write({ string: plainText });
        trigger("success");
        showToast("Senha copiada! Será limpa em 60s.", "success");

        // Magia: Limpa a área de transferência após 60 segundos
        setTimeout(() => {
          Clipboard.write({ string: "" });
        }, 60000);
      }
    } catch (error) {
      console.error("Erro ao copiar:", error);
      trigger("error");
    }
  };

  // Se o app foi minimizado, esconde os dados e mostra o cadeado
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
        <header className="header-safe-top sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Senhas</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {filteredCredentials.length} senha{filteredCredentials.length !== 1 ? "s" : ""}
              </p>
            </div>

            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/senhas/novo");
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/20 transition-all active:scale-95"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="relative mt-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted" />
            <Input
              placeholder="Buscar senhas, logins..."
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
        <ScrollToTop threshold={200} />
      </main>
    </PageTransition>
  );
}
