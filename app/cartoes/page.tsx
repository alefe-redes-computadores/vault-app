// app/cartoes/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Landmark,
  ShieldCheck,
  Trash2,
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
import {
  ListPageHeader,
  ListSearch,
  ListCard,
} from "@/components/list";

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
      <main className="relative min-h-screen bg-void pb-32">
        <ListPageHeader
          title="Cartões"
          subtitle={`${totalCount} cartão${totalCount !== 1 ? "s" : ""}`}
          badgeLabel="Vault"
          badgeColor="text-ice/90"
          icon={<CreditCard size={14} />}
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
          <ListSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar por título ou banco..."
          />
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
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
            <>
              {cards.map((item, index) => {
                const logoUrl = getBankLogoUrl(item.bank_name);
                const brandLabel = item.brand ? getBrandLabel(item.brand) : null;

                return (
                  <ListCard
                    key={item.id}
                    id={item.id!}
                    color={CARD_COLOR}
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/cartoes/detalhes?id=${item.id}`);
                    }}
                    delay={index * 0.025}
                    icon={
                      logoUrl ? (
                        <img src={logoUrl} alt={item.bank_name} className="h-7 w-7 object-contain" />
                      ) : (
                        <Landmark size={22} />
                      )
                    }
                    actions={
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id!);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-muted transition-colors hover:text-coral hover:border-coral/30 active:scale-95"
                        aria-label="Excluir cartão"
                      >
                        <Trash2 size={14} />
                      </button>
                    }
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                        {isPrivate ? "••••••••••••" : item.title}
                      </h3>
                      {brandLabel && (
                        <span className="shrink-0 whitespace-nowrap rounded-md bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-ice border border-surface-border/30">
                          {brandLabel}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink-muted truncate">
                      {isPrivate ? "••••••" : item.bank_name}
                    </p>
                  </ListCard>
                );
              })}

              {hasMore && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => { trigger("vibrate"); loadMore(); }}
                    disabled={isLoadingMore}
                    className="rounded-2xl border border-surface-border/50 bg-surface px-6 py-3 text-xs font-medium text-ink-primary transition-all active:scale-95 hover:border-ice/40 disabled:opacity-50"
                  >
                    {isLoadingMore ? <Loader2 size={16} className="animate-spin inline mr-1" /> : null}
                    Carregar mais cartões
                  </button>
                </div>
              )}
            </>
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