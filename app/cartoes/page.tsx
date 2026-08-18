// app/cartoes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Landmark,
  ShieldCheck,
  Trash2,
  ChevronRight,
  Loader2,
  CreditCard,
  Eye,
  EyeOff,
} from "lucide-react";
import { usePaginatedCards } from "@/hooks/usePaginatedCards";
import { useHapticFeedback } from "@/lib/haptics";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { useToast } from "@/components/ToastProvider";
import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { getBankLogoUrl, getBrandLabel } from "@/lib/utils/card-helper";
import { ScrollToTop } from "@/components/ScrollToTop";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function CardsPage() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const { isPrivate, togglePrivacy } = usePrivacyMode();

  const { cards, totalCount, hasMore, isLoadingMore, loadMore, deleteCard } = usePaginatedCards({
    searchQuery: debouncedQuery,
    selectedType: "cartoes",
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleTogglePrivacy = () => {
    trigger("vibrate");
    togglePrivacy();
  };

  const handleDelete = (id: string) => {
    setSelectedCardId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedCardId) return;
    trigger("vibrate");
    try {
      await deleteCard(selectedCardId);
      trigger("success");
      showToast("Cartão excluído", "success");
    } catch (error) {
      trigger("error");
      showToast("Erro ao excluir cartão", "error");
    } finally {
      setShowDeleteModal(false);
      setSelectedCardId(null);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
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
              <h1 className="mt-1 font-display text-lg font-semibold text-ink-primary">Cartões</h1>
              <p className="mt-1 text-sm text-ink-muted flex items-center gap-1">
                <ShieldCheck size={12} className="text-ice" /> {totalCount} cartão{totalCount !== 1 ? "s" : ""}
              </p>
            </div>
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
        </header>

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
        </section>

        <section className="px-5 pt-4">
          {cards.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Nenhum cartão encontrado"
              description="Adicione seus cartões de crédito e débito para acessá-los rapidamente."
              actionLabel="Novo cartão"
              onAction={() => {
                trigger("vibrate");
                router.push("/cartoes/novo");
              }}
            />
          ) : (
            <div className="space-y-3">
              {cards.map((item) => {
                const logoUrl = getBankLogoUrl(item.bank_name);
                const brandLabel = item.brand ? getBrandLabel(item.brand) : null;

                return (
                  <motion.div
                    key={item.id}
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
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
                        <h2 className="font-display text-sm font-semibold truncate text-ink-primary">
                          {isPrivate ? "••••••••••••" : item.title}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-ink-muted capitalize">{isPrivate ? "••••••" : item.bank_name}</span>
                          {brandLabel && (
                            <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-ice border border-surface-border/30">{brandLabel}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id!); }}
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

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title="Excluir cartão"
          message="Tem certeza que deseja excluir este cartão?"
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          type="danger"
        />

        <ScrollToTop threshold={200} />
      </main>
    </PageTransition>
  );
}