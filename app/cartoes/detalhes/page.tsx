// app/cartoes/detalhes/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Edit3, ShieldCheck, Copy, Check, Eye, EyeOff, Landmark, CreditCard, Loader2, Trash2, Wifi,
} from "lucide-react";
import { useCards } from "@/hooks/useCards";
import { useBiometric } from "@/hooks/useBiometric";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { decryptPassword } from "@/lib/crypto";
import { getBankLogoUrl, getBrandLabel } from "@/lib/utils/card-helper";
import { PageTransition } from "@/components/PageTransition";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { useMounted } from "@/hooks/useMounted";
import type { BankCard } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const formatCardNumber = (num: string) => {
  const digits = num.replace(/\D/g, "");
  const match = digits.match(/.{1,4}/g);
  return match ? match.join(" ") : num;
};

const getBankStyle = (bankName: string) => {
  const name = bankName.toLowerCase();
  if (name.includes('nubank')) return 'from-[#820ad1] to-[#590494] text-white';
  if (name.includes('itaú') || name.includes('itau')) return 'from-[#ec7000] to-[#ff9900] text-white';
  if (name.includes('inter')) return 'from-[#ff7a00] to-[#ff500f] text-white';
  if (name.includes('c6')) return 'from-[#242424] to-[#000000] text-white border-white/10';
  if (name.includes('bradesco')) return 'from-[#cc092f] to-[#ff1a4a] text-white';
  if (name.includes('santander')) return 'from-[#cc0000] to-[#ff0000] text-white';
  if (name.includes('caixa')) return 'from-[#005CA9] to-[#007cc7] text-white';
  if (name.includes('brasil') || name.includes('bb')) return 'from-[#003da5] to-[#0052cc] text-white';
  if (name.includes('xp')) return 'from-[#000000] to-[#1a1a1a] text-white';
  if (name.includes('sicredi')) return 'from-[#008736] to-[#00b046] text-white';
  return 'from-surface-raised to-surface border-surface-border/50 text-ink-primary';
};

function CardDetailsContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { deleteCard, getCard } = useCards();
  const mounted = useMounted();
  const { authenticate } = useBiometric({
    title: "Revelar Dados",
    subtitle: "Confirme sua identidade para exibir os números do cartão e CVV.",
  });

  const [card, setCard] = useState<BankCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSensitive, setShowSensitive] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    async function loadCard() {
      if (!id) return;
      try {
        const item = await getCard(id);
        if (item) setCard(item);
      } catch (error) {
        console.error("Erro ao carregar detalhes:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCard();
  }, [id, getCard]);

  if (!mounted) return <DetailSkeleton />;

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

  const handleToggleSensitive = async () => {
    trigger("vibrate");
    if (!showSensitive) {
      const isAuth = await authenticate();
      if (!isAuth) return;
    }
    setShowSensitive(!showSensitive);
  };

  const handleDelete = async () => {
    if (!id) return;
    trigger("vibrate");
    try {
      await deleteCard(id);
      trigger("success");
      showToast("Registro excluído", "success");
      router.back();
    } catch (error) {
      trigger("error");
      showToast("Erro ao excluir", "error");
    } finally {
      setShowDeleteModal(false);
    }
  };

  if (loading || !card) {
    return <DetailSkeleton />;
  }

  const plainCardNumber = card.card_number_encrypted ? decryptPassword(card.card_number_encrypted) : "";
  const plainCvv = card.cvv_encrypted ? decryptPassword(card.cvv_encrypted) : "";
  const logoUrl = getBankLogoUrl(card.bank_name);
  const brandLabel = card.brand ? getBrandLabel(card.brand) : null;
  const cardStyle = getBankStyle(card.bank_name);

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="header-safe-top sticky top-0 z-20 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
              type="button"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <h1 className="font-display text-lg font-semibold text-ink-primary truncate max-w-[180px]">{card.title}</h1>
              <p className="text-[11px] text-ink-muted flex items-center gap-1 mt-0.5">
                <ShieldCheck size={12} className="text-ice" /> Protegido (E2EE)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { trigger("vibrate"); router.push(`/cartoes/editar?id=${card.id}`); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary active:scale-95"
              type="button"
              aria-label="Editar cartão"
            >
              <Edit3 size={18} />
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral active:scale-95"
              type="button"
              aria-label="Excluir cartão"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="relative w-full">
            <div className={`absolute -inset-1 blur-2xl opacity-20 bg-gradient-to-br ${cardStyle}`} />

            <div className={`relative aspect-[1.58/1] w-full rounded-3xl border p-6 flex flex-col justify-between overflow-hidden shadow-2xl bg-gradient-to-br ${cardStyle}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

              <div className="relative z-10 flex justify-between items-start">
                {logoUrl ? (
                  <div className="bg-white/90 p-1.5 rounded-lg backdrop-blur-md">
                    <img src={logoUrl} alt={card.bank_name} className="h-5 object-contain mix-blend-multiply" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                  </div>
                ) : (
                  <span className="font-display font-bold text-lg">{card.bank_name}</span>
                )}
                {brandLabel && <span className="font-bold italic text-white/90 uppercase tracking-widest text-sm">{brandLabel}</span>}
              </div>

              {plainCardNumber && (
                <div className="relative z-10 flex items-center gap-3 mt-4">
                  <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 to-amber-500 border border-amber-600/50 flex flex-col justify-around p-1 shadow-inner">
                    <div className="w-full h-[1px] bg-amber-700/30" />
                    <div className="w-full h-[1px] bg-amber-700/30" />
                    <div className="w-full h-[1px] bg-amber-700/30" />
                  </div>
                  <Wifi size={24} className="text-white/60 rotate-90" />
                </div>
              )}

              <div className="relative z-10 mt-auto pt-4 space-y-2">
                {plainCardNumber ? (
                  <div className="font-mono text-xl md:text-2xl tracking-[0.12em] text-white drop-shadow-sm">
                    {showSensitive ? formatCardNumber(plainCardNumber) : "••••  ••••  ••••  " + plainCardNumber.slice(-4)}
                  </div>
                ) : (
                  <div className="font-mono text-xl tracking-widest text-white/50">CONTA BANCÁRIA</div>
                )}

                <div className="flex justify-between items-end">
                  <div className="uppercase tracking-widest text-[10px] text-white/80 font-medium truncate pr-4">
                    {card.card_holder || "TITULAR DO CARTÃO"}
                  </div>

                  <div className="flex gap-4 text-right">
                    {card.expiry_date && (
                      <div className="flex flex-col">
                        <span className="text-[7px] uppercase text-white/60 tracking-wider">Validade</span>
                        <span className="font-mono text-sm text-white">{card.expiry_date}</span>
                      </div>
                    )}
                    {plainCvv && (
                      <div className="flex flex-col">
                        <span className="text-[7px] uppercase text-white/60 tracking-wider">CVV</span>
                        <span className="font-mono text-sm text-white">{showSensitive ? plainCvv : "•••"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="flex justify-center gap-3 mt-6">
            <button
              onClick={handleToggleSensitive}
              className={`flex flex-col items-center gap-1.5 transition-all active:scale-95 ${showSensitive ? "text-ice" : "text-ink-muted hover:text-ink-primary"}`}
              type="button"
              aria-label={showSensitive ? "Ocultar dados" : "Revelar dados"}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${showSensitive ? "bg-ice/15 border-ice/30" : "bg-surface-raised border-surface-border/50"}`}>
                {showSensitive ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider">{showSensitive ? "Ocultar" : "Revelar"}</span>
            </button>

            {plainCardNumber && (
              <button
                onClick={() => handleCopy(plainCardNumber, "card")}
                className="flex flex-col items-center gap-1.5 transition-all active:scale-95 text-ink-muted hover:text-ink-primary"
                type="button"
                aria-label="Copiar número do cartão"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-surface-raised border-surface-border/50">
                  {copiedField === "card" ? <Check size={18} className="text-ice" /> : <CreditCard size={18} />}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider">Copiar Nº</span>
              </button>
            )}

            {card.account && (
              <button
                onClick={() => handleCopy(card.account!, "account")}
                className="flex flex-col items-center gap-1.5 transition-all active:scale-95 text-ink-muted hover:text-ink-primary"
                type="button"
                aria-label="Copiar conta"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-surface-raised border-surface-border/50">
                  {copiedField === "account" ? <Check size={18} className="text-ice" /> : <Landmark size={18} />}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider">Copiar C/C</span>
              </button>
            )}
          </motion.div>
        </section>

        <section className="space-y-3 px-5 pt-8">
          {(card.agency || card.account) && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-3">
              {card.agency && (
                <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Agência</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-semibold text-ink-primary">{card.agency}</span>
                    <button
                      onClick={() => handleCopy(card.agency!, "agency")}
                      className="text-ink-muted active:scale-95 p-1"
                      type="button"
                      aria-label="Copiar agência"
                    >
                      {copiedField === "agency" ? <Check size={16} className="text-ice" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )}
              {card.account && (
                <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Conta</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-semibold text-ink-primary">{card.account}</span>
                    <button
                      onClick={() => handleCopy(card.account!, "account_only")}
                      className="text-ink-muted active:scale-95 p-1"
                      type="button"
                      aria-label="Copiar conta"
                    >
                      {copiedField === "account_only" ? <Check size={16} className="text-ice" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {card.notes && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.2 }} className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Anotações</span>
              <p className="text-sm text-ink-primary whitespace-pre-wrap leading-relaxed">{card.notes}</p>
            </motion.div>
          )}
        </section>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir registro"
          message="Tem certeza que deseja excluir este item do cofre?"
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function CardDetailsPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <CardDetailsContent />
    </Suspense>
  );
}