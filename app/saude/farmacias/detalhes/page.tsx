// app/saude/farmacias/detalhes/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Edit3,
  Trash2,
  Pill,
  ExternalLink,
  Clock,
  Plus,
  FileWarning,
  AlertTriangle,
  Navigation,
  Calendar,
  DollarSign,
  Gift,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import {
  calcularEconomia,
  isReceitaVencidaSegura,
  sugerirRenovacao,
  analisarFarmaciaDetalhada,
} from "@/lib/health-insights";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { useMounted } from "@/hooks/useMounted";
import {
  SectionTitle,
  DetailInfoRow,
  StatCard,
} from "@/components/detail/DetailComponents";
import type { Farmacia, Medicamento, Renovacao } from "@/lib/types";

/* ============================================================
   HELPERS
   ============================================================ */

function formatDateDisplay(isoStr?: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

/* ============================================================
   CONTEÚDO
   ============================================================ */

function DetalhesFarmaciaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();
  const { getFarmacia, deleteFarmacia } = useFarmacias();
  const { medicamentos } = useMedicamentos();
  const deleteAction = useSubmitAction();
  const mounted = useMounted();

  const [farmacia, setFarmacia] = useState<Farmacia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);

  const renovacoes = useLiveQuery(() => db.renovacoes.toArray(), []) || [];

  useEffect(() => {
    if (!id) {
      router.push("/saude/farmacias");
      return;
    }
    getFarmacia(id).then((item) => {
      if (item) {
        setFarmacia(item);
      } else {
        router.push("/saude/farmacias");
      }
      setIsLoading(false);
    });
  }, [id, getFarmacia, router]);

  /* ==========================================================
     ANÁLISE
     ========================================================== */

  const analiseFarmacia = useMemo(() => {
    if (!farmacia || !medicamentos) {
      return {
        medicamentosVinculados: [] as Medicamento[],
        totalGasto: 0,
        precoMedio: 0,
        ultimaCompra: null as Renovacao | null,
        ultimasRenovacoes: [] as Array<Renovacao & { medicamento_nome: string; dosagem?: string }>,
        economia: null,
      };
    }
    const medicamentosVinculados = medicamentos.filter(
      (m) => m.farmacia_id === farmacia.id
    );
    const renovacoesDaFarmacia = renovacoes
      .filter((r) => r.farmacia_id === id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    let totalGasto = 0;
    const precosParaMedia: number[] = [];

    renovacoesDaFarmacia.forEach((r) => {
      if (typeof r.preco === "number" && r.preco > 0) {
        totalGasto += r.preco;
        precosParaMedia.push(r.preco);
      }
    });

    medicamentosVinculados.forEach((m) => {
      if (typeof m.preco === "number" && m.preco > 0) {
        const jaTemRenovacaoIgual = renovacoesDaFarmacia.some(
          (r) =>
            r.medicamento_id === m.id &&
            r.preco === m.preco &&
            (r.data === m.data_receita || r.data === m.estoque_data_referencia)
        );
        if (!jaTemRenovacaoIgual) {
          totalGasto += m.preco;
          precosParaMedia.push(m.preco);
        }
      }
    });

    const precoMedio =
      precosParaMedia.length > 0
        ? precosParaMedia.reduce((a, b) => a + b, 0) / precosParaMedia.length
        : 0;

    const ultimaCompra = renovacoesDaFarmacia.length > 0 ? renovacoesDaFarmacia[0] : null;

    const ultimasRenovacoes = renovacoesDaFarmacia.slice(0, 5).map((r) => {
      const med = medicamentosVinculados.find((m) => m.id === r.medicamento_id);
      return {
        ...r,
        medicamento_nome: med?.nome || "Medicamento",
        dosagem: med?.dosagem || "",
      };
    });

    const economia = calcularEconomia(renovacoesDaFarmacia);

    return {
      medicamentosVinculados,
      totalGasto,
      precoMedio,
      ultimaCompra,
      ultimasRenovacoes,
      economia,
    };
  }, [farmacia, medicamentos, renovacoes, id]);

  const medicamentosComBadge = useMemo(() => {
    return analiseFarmacia.medicamentosVinculados.map((med) => {
      const renovacaoSugerida = sugerirRenovacao(med);
      return {
        ...med,
        receitaVencida: isReceitaVencidaSegura(med.proxima_renovacao),
        deveRenovar: renovacaoSugerida.deveRenovar,
      };
    });
  }, [analiseFarmacia.medicamentosVinculados]);

  const insightFarmacia = useMemo(() => {
    if (!farmacia) return null;
    return analisarFarmaciaDetalhada({
      totalGasto: analiseFarmacia.totalGasto,
      comprasCount:
        analiseFarmacia.medicamentosVinculados.length +
        analiseFarmacia.ultimasRenovacoes.length,
      isMaisEconomica: false,
    });
  }, [farmacia, analiseFarmacia]);

  if (!mounted || isLoading) return <DetailSkeleton />;
  if (!farmacia) return null;

  const menuOptions = [
    {
      id: "nova-renovacao",
      label: "Nova Renovação",
      icon: FileWarning,
      path: `/saude/renovacao/nova?farmacia_id=${id}`,
    },
    {
      id: "novo-medicamento",
      label: "Novo Medicamento",
      icon: Pill,
      path: `/saude/medicamentos/novo?farmacia_id=${id}`,
    },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  const handleDelete = () => {
    deleteAction.run(
      async () => {
        await deleteFarmacia(id!);
        router.replace("/saude/farmacias");
      },
      {
        successMessage: "Farmácia excluída com sucesso",
        errorMessage: "Erro ao excluir farmácia",
        goBackOnSuccess: false,
      }
    );
  };

  const cor = "#F59E0B";

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
        ==================================================== */}
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              type="button"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-400">
                Farmácia
              </p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">
                Detalhes da Farmácia
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => {
                  trigger("vibrate");
                  setIsMenuFlutuanteOpen(!isMenuFlutuanteOpen);
                }}
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
              onClick={() => {
                trigger("vibrate");
                router.push(`/saude/farmacias/editar?id=${farmacia.id}`);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary hover:text-amber-400 hover:border-amber-400/30 transition-all active:scale-95"
              type="button"
              aria-label="Editar farmácia"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => {
                trigger("vibrate");
                setShowDeleteModal(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
              type="button"
              aria-label="Excluir farmácia"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-5">
          {/* ==================================================
              INSIGHT
          ================================================== */}
          {insightFarmacia && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              className="rounded-[24px] border border-amber-400/30 bg-amber-400/5 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-ink-primary">{insightFarmacia.mensagem}</p>
              </div>
            </motion.div>
          )}

          {/* ==================================================
              HERO
          ================================================== */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4"
            style={{ borderLeft: `6px solid ${cor}` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border"
                  style={{ backgroundColor: `${cor}15`, color: cor, borderColor: `${cor}30` }}
                >
                  <Store size={28} />
                </div>
                <div className="min-w-0 pt-1">
                  <h2 className="font-display text-2xl font-bold text-ink-primary truncate uppercase">
                    {farmacia.nome}
                  </h2>
                  {farmacia.endereco && (
                    <p className="text-xs text-ink-muted mt-1 flex items-center gap-1.5 truncate">
                      <MapPin size={13} className="shrink-0 text-ink-faint" /> {farmacia.endereco}
                    </p>
                  )}
                  {farmacia.telefone && (
                    <p className="text-xs text-ink-muted mt-1 flex items-center gap-1.5">
                      <Phone size={13} className="shrink-0 text-ink-faint" /> {farmacia.telefone}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-1">
                {farmacia.telefone && (
                  <a
                    href={`tel:${farmacia.telefone}`}
                    onClick={() => trigger("vibrate")}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 active:scale-95 transition-all"
                    title="Ligar para farmácia"
                    aria-label="Ligar para farmácia"
                  >
                    <Phone size={16} />
                  </a>
                )}
                {farmacia.endereco && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(farmacia.endereco)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trigger("vibrate")}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/30 bg-ice/10 text-ice active:scale-95 transition-all"
                    title="Abrir no mapa"
                    aria-label="Abrir no mapa"
                  >
                    <Navigation size={16} />
                  </a>
                )}
              </div>
            </div>

            {analiseFarmacia.ultimaCompra && (
              <div className="pt-2 border-t border-surface-border/40">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Clock size={14} className="text-amber-400" />
                  <span>
                    Última compra:{" "}
                    <span className="font-medium text-ink-primary">
                      {formatDateDisplay(analiseFarmacia.ultimaCompra.data)}
                    </span>
                  </span>
                  {analiseFarmacia.ultimaCompra.preco && (
                    <span className="font-medium text-emerald-400 ml-1">
                      ({formatCurrency(analiseFarmacia.ultimaCompra.preco)})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* MÉTRICAS */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-surface-border/40">
              <StatCard
                icon={<Pill size={14} />}
                label="Vinculados"
                value={String(analiseFarmacia.medicamentosVinculados.length)}
              />
              <StatCard
                icon={<DollarSign size={14} />}
                label="Total Gasto"
                value={formatCurrency(analiseFarmacia.totalGasto)}
              />
              <StatCard
                icon={<DollarSign size={14} />}
                label="Preço Médio"
                value={analiseFarmacia.precoMedio > 0 ? formatCurrency(analiseFarmacia.precoMedio) : "—"}
              />
            </div>
          </motion.div>

          {/* ==================================================
              MEDICAMENTOS VINCULADOS
          ================================================== */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.05 }}
            className="space-y-3"
          >
            <SectionTitle
              icon={<Pill size={15} />}
              title={`Medicamentos Vinculados (${medicamentosComBadge.length})`}
            />

            {medicamentosComBadge.length === 0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum medicamento vinculado a esta farmácia.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicamentosComBadge.map((med) => (
                  <div
                    key={med.id}
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/saude/medicamentos/detalhes?id=${med.id}`);
                    }}
                    className="flex flex-col justify-center rounded-2xl border border-surface-border/50 bg-surface p-3.5 transition-all active:scale-[0.98] hover:border-amber-400/30 cursor-pointer shadow-sm gap-3"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                          <Pill size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-ink-primary truncate uppercase">
                              {med.nome}
                            </p>
                            {med.receitaVencida && (
                              <span className="shrink-0 text-[8px] font-bold uppercase bg-coral/20 text-coral px-1.5 py-0.5 rounded-full">
                                Vencida
                              </span>
                            )}
                            {med.deveRenovar && (
                              <span className="shrink-0 text-[8px] font-bold uppercase bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                                Renovar
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            {med.dosagem || "Uso contínuo"}
                          </p>
                        </div>
                      </div>
                      <ExternalLink size={15} className="text-ink-faint shrink-0" />
                    </div>

                    <div className="flex items-center justify-between border-t border-surface-border/40 pt-2 text-xs">
                      <div className="flex items-center gap-1.5 text-ink-muted">
                        <Calendar size={12} className="text-ink-faint" />
                        <span>
                          Vinculado em:{" "}
                          <span className="font-semibold text-ink-primary">
                            {formatDateDisplay(med.estoque_data_referencia || med.data_receita)}
                          </span>
                        </span>
                      </div>
                      {med.preco ? (
                        <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md text-emerald-400 font-bold border border-emerald-500/20">
                          <DollarSign size={12} /> {formatCurrency(med.preco)}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-ice/10 px-2 py-0.5 rounded-md text-ice font-bold border border-ice/20">
                          <Gift size={12} /> Gratuito
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              ÚLTIMAS COMPRAS (se houver)
          ================================================== */}
          {analiseFarmacia.ultimasRenovacoes.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.08 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<Clock size={15} />}
                title="Últimas Compras"
              />
              <div className="space-y-2">
                {analiseFarmacia.ultimasRenovacoes.map((ren) => (
                  <div
                    key={ren.id}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink-primary uppercase">
                        {ren.medicamento_nome}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-[11px] text-ink-muted">
                          {formatDateDisplay(ren.data)}
                        </p>
                        {ren.dosagem && (
                          <span className="text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-full">
                            {ren.dosagem}
                          </span>
                        )}
                      </div>
                    </div>
                    {ren.preco && (
                      <span className="text-sm font-semibold text-emerald-400">
                        {formatCurrency(ren.preco)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </section>

        {/* ====================================================
            CONFIRMAÇÃO DE EXCLUSÃO
        ==================================================== */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir farmácia"
          message={`Tem certeza que deseja excluir "${farmacia.nome}"?`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleteAction.isSubmitting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesFarmaciaPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetalhesFarmaciaContent />
    </Suspense>
  );
}