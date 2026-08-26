// app/saude/renovacao/detalhes/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FileWarning,
  Calendar,
  DollarSign,
  ExternalLink,
  Trash2,
  Pill,
  FileText,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  ChevronRight,
  Plus,
  Receipt,
} from "lucide-react";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { isReceitaVencidaSegura } from "@/lib/health-insights";
import { getDaysUntil, getClinicalTheme } from "@/lib/health-utils";
import type { Renovacao, Medicamento, Medico, Farmacia } from "@/lib/types";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { useMounted } from "@/hooks/useMounted";
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

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

/* ============================================================
   CONTEÚDO
   ============================================================ */

function DetalhesRenovacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();
  const { deleteRenovacao } = useRenovacoes();
  const { activePersonId } = useActivePersonId();
  const mounted = useMounted();

  const [renovacao, setRenovacao] = useState<Renovacao | null>(null);
  const [medicamento, setMedicamento] = useState<Medicamento | null>(null);
  const [medico, setMedico] = useState<Medico | null>(null);
  const [farmacia, setFarmacia] = useState<Farmacia | null>(null);
  const [historicoRenovacoes, setHistoricoRenovacoes] = useState<Renovacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      router.push("/saude/renovacao");
      return;
    }

    const fetchData = async () => {
      try {
        const res = await db.renovacoes.get(id);
        if (res) {
          setRenovacao(res);

          if (res.medicamento_id) {
            const med = await db.medicamentos.get(res.medicamento_id);
            setMedicamento(med || null);

            const outrasRenovacoes = await db.renovacoes
              .where("medicamento_id")
              .equals(res.medicamento_id)
              .toArray();

            const historico = outrasRenovacoes
              .filter((r) => r.id !== res.id)
              .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
              .slice(0, 5);

            setHistoricoRenovacoes(historico);

            if (res.medico_id) {
              const doc = await db.medicos.get(res.medico_id);
              setMedico(doc || null);
            }

            if (res.farmacia_id) {
              const farm = await db.farmacias.get(res.farmacia_id);
              setFarmacia(farm || null);
            }
          }
        } else {
          router.push("/saude/renovacao");
        }
      } catch (error) {
        console.error("Erro ao buscar renovação:", error);
        router.push("/saude/renovacao");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  if (!mounted) return <DetailSkeleton />;

  const handleDelete = async () => {
    setDeleting(true);
    trigger("vibrate");
    try {
      await deleteRenovacao(id!);
      trigger("success");
      router.replace("/saude/renovacao");
    } catch (error) {
      console.error("Erro ao excluir renovação:", error);
      trigger("error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const menuOptions = [
    {
      id: "nova-renovacao",
      label: "Nova Renovação",
      icon: FileWarning,
      path: `/saude/renovacao/nova?medicamento_id=${medicamento?.id || ""}`,
    },
    {
      id: "editar-renovacao",
      label: "Editar Renovação",
      icon: Edit3,
      path: `/saude/renovacao/editar?id=${id}`,
    },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  if (isLoading) return <DetailSkeleton />;
  if (!renovacao) return null;

  const precoFormatado = renovacao.preco ? formatCurrency(renovacao.preco) : "SUS / Gratuito";

  const vencida = medicamento
    ? isReceitaVencidaSegura(medicamento.proxima_renovacao)
    : isReceitaVencidaSegura(renovacao.data);
  const diasRestantes = getDaysUntil(medicamento?.proxima_renovacao || renovacao.data);

  const theme = getClinicalTheme(medicamento?.nome || "Renovação");

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* ===== HEADER ===== */}
        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/85 px-5 pb-4 pt-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                aria-label="Voltar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-transform active:scale-95"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <p className={`font-mono text-[11px] uppercase tracking-[0.28em] ${theme.textClass}`}>
                  Vault
                </p>
                <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">
                  Detalhes da Renovação
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setIsMenuFlutuanteOpen(!isMenuFlutuanteOpen);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
                  aria-label="Menu"
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
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 pb-2 pt-3.5">
                          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                            Adicionar
                          </p>
                        </div>
                        <div className="space-y-0.5 px-1.5 pb-2">
                          {menuOptions.map((option) => {
                            const Icon = option.icon;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => handleMenuOptionClick(option.path)}
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
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
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  router.push(`/saude/renovacao/editar?id=${id}`);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ice transition-all active:scale-95 hover:bg-ice/10"
                aria-label="Editar renovação"
              >
                <Edit3 size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setShowDeleteModal(true);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
                aria-label="Excluir renovação"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* ===== CONTEÚDO ===== */}
        <section className="space-y-5 px-5 pt-6">
          {/* Card principal */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm"
            style={{
              borderLeft: `6px solid ${vencida ? "#EF4444" : theme.hex}`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${theme.bgClass} ${theme.textClass} ${theme.borderClass}`}
              >
                <Receipt size={24} />
              </div>
              <div className="min-w-0 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-display text-xl font-bold text-ink-primary">
                    {medicamento?.nome || "Medicamento"}
                  </h2>
                  {vencida ? (
                    <span className="flex items-center gap-1 rounded-full border border-coral/30 bg-coral/20 px-2 py-0.5 text-[10px] font-bold uppercase text-coral">
                      <AlertCircle size={10} /> Vencida
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                      <CheckCircle2 size={10} /> Válida
                    </span>
                  )}
                </div>
                <p className={`mt-0.5 text-sm font-medium ${theme.textClass}`}>
                  {medicamento?.dosagem || ""}
                </p>
                {medico && (
                  <p className="mt-1 text-xs text-ink-muted">
                    <span className="font-medium">Prescrito por:</span> Dr(a). {medico.nome}
                  </p>
                )}
                {farmacia && (
                  <p className="mt-0.5 text-xs text-ink-muted">
                    <span className="font-medium">Farmácia:</span> {farmacia.nome}
                  </p>
                )}
              </div>
            </div>

            {diasRestantes !== null && !vencida && (
              <div className="mt-3 border-t border-surface-border/40 pt-3">
                <div
                  className={`flex items-center gap-2 text-xs ${
                    diasRestantes <= 7 ? "text-amber-400" : "text-ink-muted"
                  }`}
                >
                  <Clock size={14} />
                  <span>
                    {diasRestantes <= 7 ? (
                      <span className="font-medium text-amber-400">Atenção!</span>
                    ) : (
                      <span>Faltam</span>
                    )}{" "}
                    {diasRestantes} dias para o vencimento da receita
                  </span>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-surface-border/40 pt-4">
              <StatCard
                icon={<Calendar size={14} />}
                label="Data da Receita"
                value={formatDateDisplay(renovacao.data)}
              />
              <StatCard
                icon={<DollarSign size={14} />}
                label="Custo Registrado"
                value={precoFormatado}
              />
            </div>

            {renovacao.observacoes && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-ink-muted">
                  Notas / Observações
                </p>
                <p className="rounded-xl border border-surface-border/40 bg-surface-raised/50 p-3 text-xs text-ink-primary">
                  {renovacao.observacoes}
                </p>
              </div>
            )}

            {renovacao.anexo_url && (
              <a
                href={renovacao.anexo_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-between rounded-2xl border border-ice/20 bg-ice/10 p-3.5 text-ice transition-colors hover:bg-ice/20"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileText size={16} /> Ver Comprovante / Receita Anexada
                </div>
                <ExternalLink size={14} />
              </a>
            )}
          </motion.div>

          {/* Histórico */}
          {historicoRenovacoes.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.05 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<History size={15} />}
                title="Histórico de Renovações"
              />
              <div className="space-y-2">
                {historicoRenovacoes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/saude/renovacao/detalhes?id=${r.id}`);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 transition-all hover:border-amber-400/30 active:scale-[0.98]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">
                        {formatDateDisplay(r.data)}
                      </p>
                      {r.preco && (
                        <p className="text-xs text-emerald-400">{formatCurrency(r.preco)}</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-ink-faint" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Rede de Apoio */}
          {(medico || farmacia) && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.1 }}
              className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <SectionTitle icon={<Receipt size={15} />} title="Rede de Apoio" />
              <div className="mt-3 space-y-3">
                {medico && (
                  <DetailInfoRow
                    icon={<Pill size={14} />}
                    iconClassName="bg-ice/10 text-ice"
                    label="Médico"
                  >
                    <p className="text-sm font-semibold text-ink-primary">
                      Dr(a). {medico.nome}
                    </p>
                  </DetailInfoRow>
                )}
                {farmacia && (
                  <DetailInfoRow
                    icon={<DollarSign size={14} />}
                    iconClassName="bg-emerald-400/10 text-emerald-400"
                    label="Farmácia"
                  >
                    <p className="text-sm font-semibold text-ink-primary">
                      {farmacia.nome}
                    </p>
                  </DetailInfoRow>
                )}
              </div>
            </motion.div>
          )}
        </section>

        {/* ===== MODAL ===== */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir Registro"
          message="Tem certeza que deseja excluir este registro de renovação?"
          isLoading={deleting}
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesRenovacaoPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetalhesRenovacaoContent />
    </Suspense>
  );
}