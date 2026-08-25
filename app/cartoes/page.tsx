// app/cartoes/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { useToast } from "@/components/ToastProvider";
import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { getBankLogoUrl, getBrandLabel } from "@/lib/utils/card-helper";
import { ScrollToTop } from "@/components/ScrollToTop";

const CARD_COLOR = "#38BDF8";

export default function CardsPage() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const { activePersonId } = useActivePersonId();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const { isPrivate, togglePrivacy } = usePrivacyMode();

  const { cards: rawCards, hasMore, isLoadingMore, loadMore, deleteCard } = usePaginatedCards({
    searchQuery: debouncedQuery,
    selectedType: "cartoes",
  });

  const cards = useMemo(() => {
    if (!rawCards) return [];
    return rawCards.filter((c: any) => !activePersonId || !c.person_id || c.person_id === activePersonId);
  }, [rawCards, activePersonId]);

  const totalCount = cards.length;

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
              {cards.map((item, index) => {
                const logoUrl = getBankLogoUrl(item.bank_name);
                const brandLabel = item.brand ? getBrandLabel(item.brand) : null;

                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.2) }}
                    className="group relative overflow-hidden rounded-[24px] border bg-surface shadow-md transition-all hover:bg-surface-raised"
                    style={{
                      borderColor: `${CARD_COLOR}40`,
                      borderLeft: `6px solid ${CARD_COLOR}`,
                    }}
                  >
                    <div className="p-4 pl-5">
                      <button
                        type="button"
                        onClick={() => { trigger("vibrate"); router.push(`/cartoes/detalhes?id=${item.id}`); }}
                        className="flex w-full items-start gap-3.5 text-left outline-none"
                      >
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner"
                          style={{
                            backgroundColor: `${CARD_COLOR}15`,
                            borderColor: `${CARD_COLOR}30`,
                            color: CARD_COLOR,
                          }}
                        >
                          <Landmark size={22} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-baseline gap-2">
                            <h2 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                              {isPrivate ? "••••••••••••" : item.title}
                            </h2>
                            {brandLabel && (
                              <span className="shrink-0 whitespace-nowrap rounded-md bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-ice border border-surface-border/30">
                                {brandLabel}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-ink-muted truncate">
                            {isPrivate ? "••••••" : item.bank_name}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id!); }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-muted transition-colors hover:text-coral hover:border-coral/30 active:scale-95"
                            aria-label="Excluir cartão"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight size={16} className="text-ink-faint" />
                        </div>
                      </button>
                    </div>
                  </motion.article>
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