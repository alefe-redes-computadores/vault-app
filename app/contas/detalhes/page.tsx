// app/contas/detalhes/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Edit3,
  ShieldCheck,
  Copy,
  Check,
  Landmark,
  Loader2,
  Trash2,
  Plus,
} from "lucide-react";
import { useCards } from "@/hooks/useCards";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { getBankLogoUrl } from "@/lib/utils/card-helper";
import { PageTransition } from "@/components/PageTransition";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { useMounted } from "@/hooks/useMounted";
import type { BankCard } from "@/lib/types";
import {
  SectionTitle,
  DetailInfoRow,
  StatCard,
} from "@/components/detail/DetailComponents";

/* ============================================================
   HELPERS
   ============================================================ */

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
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

/* ============================================================
   CONTEÚDO
   ============================================================ */

function AccountDetailsContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { deleteCard, getCard } = useCards();
  const mounted = useMounted();

  const [account, setAccount] = useState<BankCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);

  useEffect(() => {
    async function loadAccount() {
      if (!id) return;
      try {
        const item = await getCard(id);
        if (item) setAccount(item);
      } catch (error) {
        console.error("Erro ao carregar detalhes da conta:", error);
      } finally {
        setLoading(false);
      }
    }
    loadAccount();
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

  const menuOptions = [
    { id: "nova-conta", label: "Nova Conta", icon: Landmark, path: "/contas/novo" },
    { id: "editar-conta", label: "Editar Conta", icon: Edit3, path: `/contas/editar?id=${id}` },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  if (loading || !account) {
    return <DetailSkeleton />;
  }

  const logoUrl = getBankLogoUrl(account.bank_name);
  const accountStyle = getBankStyle(account.bank_name);

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        {/* ===== HEADER ===== */}
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
              <h1 className="max-w-[180px] truncate font-display text-lg font-semibold text-ink-primary">
                {account.title}
              </h1>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
                <ShieldCheck size={12} className="text-ice" /> Protegido (E2EE)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => { trigger("vibrate"); setIsMenuFlutuanteOpen(!isMenuFlutuanteOpen); }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
                type="button"
                aria-label="Adicionar registro"
              >
                <Plus size={18} />
              </button>
              <AnimatePresence>
                {isMenuFlutuanteOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      onClick={() => setIsMenuFlutuanteOpen(false)}
                      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface shadow-2xl"
                    >
                      <div className="px-3 pb-2 pt-3.5">
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                          Adicionar
                        </p>
                      </div>
                      <div className="px-1.5 pb-2">
                        {menuOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.id}
                              onClick={() => handleMenuOptionClick(option.path)}
                              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
                              type="button"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                <Icon size={15} />
                              </div>
                              <span className="text-sm font-medium text-ink-primary">
                                {option.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => { trigger("vibrate"); router.push(`/contas/editar?id=${account.id}`); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary active:scale-95"
              type="button"
              aria-label="Editar conta"
            >
              <Edit3 size={18} />
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral active:scale-95"
              type="button"
              aria-label="Excluir conta"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        {/* ===== CONTEÚDO ===== */}
        <section className="space-y-6 px-5 pt-6">
          {/* Cartão do banco */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="relative w-full"
          >
            <div className={`absolute -inset-1 blur-2xl opacity-20 bg-gradient-to-br ${accountStyle}`} />
            <div
              className={`relative aspect-[1.58/1] w-full overflow-hidden rounded-3xl border bg-gradient-to-br ${accountStyle} flex flex-col justify-between p-6 shadow-2xl`}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <div className="relative z-10 flex items-start justify-between">
                {logoUrl ? (
                  <div className="rounded-lg bg-white/90 p-1.5 backdrop-blur-md">
                    <img
                      src={logoUrl}
                      alt={account.bank_name}
                      className="h-5 object-contain mix-blend-multiply"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <span className="font-display text-lg font-bold">{account.bank_name}</span>
                )}
                <span className="text-sm font-bold uppercase tracking-widest text-white/80">Conta Bancária</span>
              </div>
              <div className="relative z-10 mt-auto space-y-2 pt-4">
                <div className="font-mono text-2xl tracking-widest text-white/80">
                  {account.account ? `Conta: ${account.account}` : "•••• ••••"}
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-[10px] font-medium uppercase tracking-widest text-white/80">
                    {account.bank_name}
                  </div>
                  {account.agency && (
                    <div className="text-right">
                      <span className="block text-[7px] uppercase tracking-wider text-white/60">Agência</span>
                      <span className="font-mono text-sm text-white">{account.agency}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Botões de cópia */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1 }}
            className="flex justify-center gap-3"
          >
            {account.agency && (
              <button
                onClick={() => handleCopy(account.agency!, "agency")}
                className="flex flex-col items-center gap-1.5 text-ink-muted transition-all hover:text-ink-primary active:scale-95"
                type="button"
                aria-label="Copiar agência"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                  {copiedField === "agency" ? (
                    <Check size={18} className="text-ice" />
                  ) : (
                    <Landmark size={18} />
                  )}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider">Copiar Agência</span>
              </button>
            )}
            {account.account && (
              <button
                onClick={() => handleCopy(account.account!, "account")}
                className="flex flex-col items-center gap-1.5 text-ink-muted transition-all hover:text-ink-primary active:scale-95"
                type="button"
                aria-label="Copiar conta"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                  {copiedField === "account" ? (
                    <Check size={18} className="text-ice" />
                  ) : (
                    <Copy size={18} />
                  )}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider">Copiar Conta</span>
              </button>
            )}
          </motion.div>

          {/* Dados da conta */}
          {(account.agency || account.account) && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.15 }}
              className="space-y-3"
            >
              <SectionTitle icon={<Landmark size={15} />} title="Dados da Conta" />
              <div className="grid grid-cols-2 gap-3">
                {account.agency && (
                  <DetailInfoRow
                    icon={<Landmark size={14} />}
                    iconClassName="bg-surface-raised text-ink-muted"
                    label="Agência"
                    action={
                      <button
                        onClick={() => handleCopy(account.agency!, "agency")}
                        className="p-1 text-ink-muted active:scale-95"
                        type="button"
                        aria-label="Copiar agência"
                      >
                        {copiedField === "agency" ? (
                          <Check size={16} className="text-ice" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    }
                  >
                    <span className="font-mono text-base font-semibold text-ink-primary">{account.agency}</span>
                  </DetailInfoRow>
                )}
                {account.account && (
                  <DetailInfoRow
                    icon={<Copy size={14} />}
                    iconClassName="bg-surface-raised text-ink-muted"
                    label="Conta"
                    action={
                      <button
                        onClick={() => handleCopy(account.account!, "account")}
                        className="p-1 text-ink-muted active:scale-95"
                        type="button"
                        aria-label="Copiar conta"
                      >
                        {copiedField === "account" ? (
                          <Check size={16} className="text-ice" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    }
                  >
                    <span className="font-mono text-base font-semibold text-ink-primary">{account.account}</span>
                  </DetailInfoRow>
                )}
              </div>
            </motion.div>
          )}

          {/* Anotações */}
          {account.notes && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <SectionTitle icon={<Edit3 size={15} />} title="Anotações" />
              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-primary">{account.notes}</p>
              </div>
            </motion.div>
          )}
        </section>

        {/* ===== MODAL ===== */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir conta"
          message="Tem certeza que deseja excluir esta conta bancária?"
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function AccountDetailsPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <AccountDetailsContent />
    </Suspense>
  );
}