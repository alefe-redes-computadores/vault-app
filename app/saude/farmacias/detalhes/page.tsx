// app/saude/farmacias/detalhes/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Building2, MapPin, Phone, Edit3, Trash2, 
  Pill, ExternalLink, Clock, TrendingDown, TrendingUp,
  Plus, FileWarning,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { calcularEconomia, isReceitaVencidaSegura } from "@/lib/health-insights";
import type { Farmacia, Medicamento, Renovacao } from "@/lib/types";

function formatDateDisplay(isoStr: string): string {
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

function DetalhesFarmaciaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();
  const { getFarmacia, deleteFarmacia } = useFarmacias();
  const { medicamentos } = useMedicamentos();

  const [farmacia, setFarmacia] = useState<Farmacia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

    // Agora filtra diretamente pela farmácia, usando o campo farmacia_id
    const renovacoesDaFarmacia = renovacoes
      .filter((r) => r.farmacia_id === id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    let totalGasto = 0;
    renovacoesDaFarmacia.forEach((r) => {
      if (typeof r.preco === "number" && r.preco > 0) {
        totalGasto += r.preco;
      }
    });

    const precos = renovacoesDaFarmacia
      .filter((r) => typeof r.preco === "number" && r.preco > 0)
      .map((r) => r.preco as number);
    const precoMedio = precos.length > 0 
      ? precos.reduce((a, b) => a + b, 0) / precos.length 
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
    return analiseFarmacia.medicamentosVinculados.map((med) => ({
      ...med,
      receitaVencida: isReceitaVencidaSegura(med.proxima_renovacao),
    }));
  }, [analiseFarmacia.medicamentosVinculados]);

  const menuOptions = [
    { id: "nova-renovacao", label: "Nova Renovação", icon: FileWarning, path: `/saude/renovacao/nova?farmacia_id=${id}` },
    { id: "novo-medicamento", label: "Novo Medicamento", icon: Pill, path: `/saude/medicamentos/novo?farmacia_id=${id}` },
    { id: "editar-farmacia", label: "Editar Farmácia", icon: Edit3, path: `/saude/farmacias/editar?id=${id}` },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFarmacia(id!);
      trigger("success");
      router.replace("/saude/farmacias");
    } catch (error) {
      console.error("Erro ao excluir farmácia:", error);
      trigger("error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) return <DetailSkeleton />;
  if (!farmacia) return null;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-400">Hub de Farmácia</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">Detalhes da Farmácia</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => { trigger("vibrate"); setIsMenuFlutuanteOpen(!isMenuFlutuanteOpen); }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
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
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">Adicionar</p>
                      </div>
                      <div className="px-1.5 pb-2">
                        {menuOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.id}
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
              onClick={() => { trigger("vibrate"); router.push(`/saude/farmacias/editar?id=${farmacia.id}`); }}
              aria-label="Editar farmácia"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95 hover:text-amber-400 hover:border-amber-400/30"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              aria-label="Excluir farmácia"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-5">
          <motion.div 
            variants={fadeUp} 
            initial="initial" 
            animate="animate" 
            className="rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4"
            style={{ borderLeft: "6px solid #F59E0B" }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
                <Building2 size={24} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-xl font-bold text-ink-primary truncate">
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

            {analiseFarmacia.ultimaCompra && (
              <div className="pt-2 border-t border-surface-border/40">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Clock size={14} className="text-amber-400" />
                  <span>Última compra: <span className="font-medium text-ink-primary">{formatDateDisplay(analiseFarmacia.ultimaCompra.data)}</span></span>
                  {analiseFarmacia.ultimaCompra.preco && (
                    <span className="font-medium text-emerald-400 ml-1">
                      ({formatCurrency(analiseFarmacia.ultimaCompra.preco)})
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-surface-border/40">
              <div className="rounded-2xl bg-surface-raised p-3">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Vinculados</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                  {analiseFarmacia.medicamentosVinculados.length} medicamento(s)
                </p>
              </div>
              <div className="rounded-2xl bg-surface-raised p-3">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Total Gasto</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-400">
                  {analiseFarmacia.totalGasto > 0 ? formatCurrency(analiseFarmacia.totalGasto) : "R$ 0,00"}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-raised p-3">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Preço Médio</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                  {analiseFarmacia.precoMedio > 0 ? formatCurrency(analiseFarmacia.precoMedio) : "—"}
                </p>
              </div>
            </div>

            {analiseFarmacia.economia && (
              <div className="pt-2 border-t border-surface-border/40">
                <div className={`flex items-center gap-2 text-xs ${analiseFarmacia.economia.economia > 0 ? 'text-emerald-400' : 'text-coral'}`}>
                  {analiseFarmacia.economia.economia > 0 ? (
                    <TrendingDown size={14} />
                  ) : (
                    <TrendingUp size={14} />
                  )}
                  <span>
                    {analiseFarmacia.economia.economia > 0 
                      ? `Economia de ${formatCurrency(Math.abs(analiseFarmacia.economia.economia))} (${Math.abs(analiseFarmacia.economia.percentual)}%) na última compra`
                      : `Aumento de ${formatCurrency(Math.abs(analiseFarmacia.economia.economia))} (${Math.abs(analiseFarmacia.economia.percentual)}%) na última compra`
                    }
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {analiseFarmacia.ultimasRenovacoes.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.03 }} className="space-y-3">
              <h3 className="font-display text-base font-semibold text-ink-primary px-1 flex items-center gap-1.5">
                <Clock size={16} className="text-amber-400" /> Últimas Compras
              </h3>
              <div className="space-y-2">
                {analiseFarmacia.ultimasRenovacoes.map((ren) => (
                  <div
                    key={ren.id}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">{ren.medicamento_nome}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-[11px] text-ink-muted">{formatDateDisplay(ren.data)}</p>
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

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-3">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1 flex items-center gap-1.5">
              <Pill size={16} className="text-amber-400" /> Medicamentos Retirados ({medicamentosComBadge.length})
            </h3>

            {medicamentosComBadge.length === 0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum medicamento vinculado a esta farmácia.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicamentosComBadge.map((med) => (
                  <div
                    key={med.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${med.id}`); }}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 transition-all active:scale-[0.98] hover:border-amber-400/30 cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                        <Pill size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink-primary truncate">{med.nome}</p>
                          {med.receitaVencida && (
                            <span className="shrink-0 text-[8px] font-bold uppercase bg-coral/20 text-coral px-1.5 py-0.5 rounded-full">
                              Vencida
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-muted">{med.dosagem || "Uso contínuo"}</p>
                      </div>
                    </div>
                    <ExternalLink size={15} className="text-ink-faint shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </section>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir farmácia"
          message={`Tem certeza que deseja excluir "${farmacia.nome}"?`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesFarmaciaPage() {
  return <Suspense fallback={<DetailSkeleton />}><DetalhesFarmaciaContent /></Suspense>;
}