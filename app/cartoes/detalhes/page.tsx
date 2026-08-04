"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Edit3, ShieldCheck, Copy, Check, Eye, EyeOff, Landmark, CreditCard, Loader2, Trash2 
} from "lucide-react";
import { db } from "@/lib/db";
import { useCards } from "@/hooks/useCards";
import { useHapticFeedback } from "@/lib/haptics";
import { decryptPassword } from "@/lib/crypto";
import { getBankLogoUrl, getBrandLabel } from "@/lib/utils/card-helper";
import { PageTransition } from "@/components/PageTransition";
import type { BankCard } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function CardDetailsContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { deleteCard } = useCards();

  const [card, setCard] = useState<BankCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSensitive, setShowSensitive] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    async function loadCard() {
      if (!id) return;
      try {
        const item = await db.cards.get(id);
        if (item) {
          setCard(item);
        }
      } catch (error) {
        console.error("Erro ao carregar detalhes:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCard();
  }, [id]);

  const handleCopy = async (text: string, fieldName: string) => {
    trigger("vibrate");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    } catch (error) {
      console.error("Erro ao copiar:", error);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Deseja realmente excluir este item do cofre?")) return;
    trigger("vibrate");
    try {
      await deleteCard(id);
      trigger("success");
      router.back();
    } catch (error) {
      trigger("error");
      console.error("Erro ao excluir:", error);
    }
  };

  if (loading || !card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <Loader2 size={32} className="animate-spin text-ice" />
      </div>
    );
  }

  const plainCardNumber = card.card_number_encrypted ? decryptPassword(card.card_number_encrypted) : "";
  const plainCvv = card.cvv_encrypted ? decryptPassword(card.cvv_encrypted) : "";
  const logoUrl = getBankLogoUrl(card.bank_name);
  const brandLabel = card.brand ? getBrandLabel(card.brand) : null;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        {/* Header Fixo */}
        <header className="header-safe-top sticky top-0 z-20 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { trigger("vibrate"); router.back(); }} 
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <h1 className="font-display text-lg font-semibold text-ink-primary truncate max-w-[180px]">{card.title}</h1>
              <p className="text-xs text-ink-muted flex items-center gap-1">
                <ShieldCheck size={12} className="text-ice" /> Protegido com E2EE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { trigger("vibrate"); router.push(`/cartoes/editar?id=${card.id}`); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary active:scale-95"
              aria-label="Editar"
            >
              <Edit3 size={18} />
            </button>
            <button
              onClick={handleDelete}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral active:scale-95"
              aria-label="Excluir"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        {/* Ícone e Resumo Visual */}
        <div className="flex flex-col items-center pt-6 px-5">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] border border-surface-border/60 bg-surface shadow-md overflow-hidden mb-3">
            {logoUrl ? (
              <img src={logoUrl} alt={card.bank_name} className="h-10 w-10 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            ) : (
              <Landmark size={32} className="text-ice" />
            )}
          </div>
          <h2 className="font-display text-xl font-semibold text-ink-primary text-center">{card.title}</h2>
          <p className="text-xs text-ink-muted capitalize mt-0.5">{card.bank_name} • {card.type.replace("_", " ")}</p>
        </div>

        {/* Detalhes e Dados Sensíveis */}
        <section className="space-y-4 px-5 pt-6">
          {plainCardNumber && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Número do Cartão</span>
                {brandLabel && (
                  <span className="rounded-md bg-surface-raised px-2 py-0.5 text-[10px] font-semibold text-ice border border-surface-border/30">
                    {brandLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-semibold text-ink-primary tracking-wider">
                  {showSensitive ? plainCardNumber : "•••• •••• •••• " + plainCardNumber.slice(-4)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setShowSensitive(!showSensitive)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised text-ink-muted hover:text-ice active:scale-95 transition-all">
                    {showSensitive ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button onClick={() => handleCopy(plainCardNumber, "card")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-ice/10 text-ice active:scale-95 transition-all">
                    {copiedField === "card" ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {card.card_holder && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-1">
              <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Titular</span>
              <p className="text-sm font-semibold text-ink-primary">{card.card_holder}</p>
            </motion.div>
          )}

          {(card.expiry_date || plainCvv) && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-3">
              {card.expiry_date && (
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-1">
                  <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Validade</span>
                  <p className="font-mono text-sm font-semibold text-ink-primary">{card.expiry_date}</p>
                </div>
              )}
              {plainCvv && (
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-1">
                  <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">CVV</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-ink-primary">
                      {showSensitive ? plainCvv : "•••"}
                    </span>
                    <button onClick={() => handleCopy(plainCvv, "cvv")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-ice/10 text-ice active:scale-95">
                      {copiedField === "cvv" ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {(card.agency || card.account) && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-3">
              {card.agency && (
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-1">
                  <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Agência</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-ink-primary">{card.agency}</span>
                    <button onClick={() => handleCopy(card.agency!, "agency")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-ink-muted active:scale-95">
                      {copiedField === "agency" ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
              {card.account && (
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-1">
                  <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Conta / Dígito</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-ink-primary">{card.account}</span>
                    <button onClick={() => handleCopy(card.account!, "account")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-ink-muted active:scale-95">
                      {copiedField === "account" ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {card.notes && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.2 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-1">
              <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Observações</span>
              <p className="text-sm text-ink-primary whitespace-pre-wrap">{card.notes}</p>
            </motion.div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}

export default function CardDetailsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-void"><Loader2 size={32} className="animate-spin text-ice" /></div>}>
      <CardDetailsContent />
    </Suspense>
  );
}
