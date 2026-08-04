"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Plus, Search, Landmark, ShieldCheck, Trash2, ChevronRight, Loader2, Wallet, CreditCard 
} from "lucide-react";
import { usePaginatedCards } from "@/hooks/usePaginatedCards";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { getBankLogoUrl, getBrandLabel } from "@/lib/utils/card-helper";
import { ScrollToTop } from "@/components/ScrollToTop";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function CardsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isComposeMenuOpen, setIsComposeMenuOpen] = useState(false);

  const { cards, totalCount, hasMore, isLoadingMore, loadMore, deleteCard } = usePaginatedCards({
    searchQuery: debouncedQuery,
    selectedType,
  });

  // Debounce (300ms) para otimizar busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleComposePress = () => {
    trigger("vibrate");
    setIsComposeMenuOpen((prev) => !prev);
  };

  const handleOptionPress = (path: string) => {
    trigger("success");
    setIsComposeMenuOpen(false);
    router.push(path);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deseja excluir este registro do cofre?")) return;
    trigger("vibrate");
    try {
      await deleteCard(id);
      trigger("success");
    } catch (error) {
      trigger("error");
      console.error("Erro ao deletar:", error);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        {/* Header Fixo Padronizado */}
        <header className="header-safe-top sticky top-0 z-20 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { trigger("vibrate"); router.push("/mais"); }} 
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
              <h1 className="mt-1 font-display text-lg font-semibold text-ink-primary">Bancos & Cartões</h1>
              <p className="mt-1 text-sm text-ink-muted flex items-center gap-1">
                <ShieldCheck size={12} className="text-ice" /> {totalCount} registro{totalCount !== 1 ? "s" : ""} cadastrado{totalCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </header>

        {/* Barra de Busca e Filtros */}
        <section className="px-5 pt-5 space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Buscar por título ou banco..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface px-4 py-3.5 pl-11 text-sm text-ink-primary outline-none transition-all focus:border-ice/50 focus:ring-2 focus:ring-ice/15"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "all", label: "Todos" },
              { id: "cartao_credito", label: "Crédito" },
              { id: "cartao_debito", label: "Débito" },
              { id: "conta_corrente", label: "C. Corrente" },
              { id: "conta_digital", label: "Digital" },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => { trigger("vibrate"); setSelectedType(filter.id); }}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-all active:scale-95 ${
                  selectedType === filter.id 
                    ? "border-ice bg-ice/12 text-ice" 
                    : "border-surface-border/50 bg-surface text-ink-muted"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        {/* Listagem com Paginação em Blocos */}
        <section className="px-5 pt-4">
          {cards.length === 0 ? (
            <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-surface-border/50 bg-surface text-ink-faint mb-4">
                <Wallet size={28} />
              </div>
              <h2 className="font-display text-base font-semibold text-ink-primary">Nenhum cartão ou conta encontrado</h2>
              <p className="mt-1 text-sm text-ink-muted max-w-xs">Adicione seus dados bancários com segurança para acessá-los rapidamente.</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {cards.map((item, index) => {
                const logoUrl = getBankLogoUrl(item.bank_name);
                const brandLabel = item.brand ? getBrandLabel(item.brand) : null;

                return (
                  <motion.div
                    key={item.id}
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: (index % 20) * 0.03 }}
                    onClick={() => { trigger("vibrate"); router.push(`/cartoes/detalhes?id=${item.id}`); }}
                    className="group flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-4 transition-all active:scale-[0.99] hover:border-ice/30 shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised overflow-hidden">
                        {logoUrl ? (
                          <img src={logoUrl} alt={item.bank_name} className="h-7 w-7 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                        ) : (
                          <Landmark size={20} className="text-ice" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h2 className="font-display text-sm font-semibold truncate text-ink-primary">{item.title}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-ink-muted capitalize">{item.bank_name}</span>
                          {brandLabel && (
                            <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-ice border border-surface-border/30">
                              {brandLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDelete(item.id!, e)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-faint hover:bg-coral/10 hover:text-coral transition-colors"
                        aria-label="Excluir cartão"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={16} className="text-ink-faint" />
                    </div>
                  </motion.div>
                );
              })}

              {hasMore && (
                <div className="pt-4 text-center">
                  <button
                    onClick={() => { trigger("vibrate"); loadMore(); }}
                    disabled={isLoadingMore}
                    className="rounded-2xl border border-surface-border/50 bg-surface px-6 py-3 text-xs font-medium text-ink-primary transition-all active:scale-95 hover:border-ice/40 disabled:opacity-50"
                  >
                    {isLoadingMore ? <Loader2 size={16} className="animate-spin inline mr-1" /> : null}
                    Carregar mais cartões
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Menu Flutuante Contextual Separado (Cartão e Conta) */}
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
                    Gerenciar Bancos & Cartões
                  </p>
                </div>
                <div className="px-2 pb-2 space-y-1">
                  <button
                    onClick={() => handleOptionPress("/cartoes/novo")}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                      <CreditCard size={16} />
                    </div>
                    <span className="text-sm font-medium text-ink-primary">
                      Novo cartão
                    </span>
                  </button>

                  <button
                    onClick={() => handleOptionPress("/contas/novo")}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                      <Landmark size={16} />
                    </div>
                    <span className="text-sm font-medium text-ink-primary">
                      Nova conta bancária
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
            aria-label="Adicionar cartão ou conta"
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
