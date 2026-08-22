// app/saude/tratamentos/detalhes/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Pill, 
  Edit3,
  ChevronRight,
  History,
  FileText,
  Stethoscope,
  ArrowLeftRight,
  Clock,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Plus,
  FolderHeart,
  X,
  Receipt,
  Users,
  FileStack,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { DocumentCard } from "@/components/DocumentCard";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type { Tratamento, Document, Medicamento, Renovacao, Medico, Cid } from "@/lib/types";
import { 
  isReceitaVencidaSegura, 
  calcularEconomia,
  sugerirRenovacao
} from "@/lib/health-insights";
import { getCidInsights } from "@/lib/health-insights";
import { getClinicalTheme, formatCurrency } from "@/lib/health-utils"; // INJEÇÃO DO TEMA VISUAL
import { useMounted } from "@/hooks/useMounted";

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

interface MedicamentoComAlertas extends Medicamento {
  receitaVencida?: boolean;
  insight?: ReturnType<typeof sugerirRenovacao>;
}

interface DocumentMetadata {
  tratamento_id?: string;
  cid_id?: string;
  [key: string]: unknown;
}

function TratamentoContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { favorite } = useSafeDb();
  const { medicamentos } = useMedicamentos();
  const { medicos } = useMedicos();
  const { activePersonId } = useActivePersonId();
  const mounted = useMounted();

  const [tratamento, setTratamento] = useState<Tratamento | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);

  const [dismissEconomia, setDismissEconomia] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`dismissEconomia_${id}`);
      return stored === "true";
    }
    return false;
  });

  useEffect(() => {
    const handleClickOutside = () => setIsMenuFlutuanteOpen(false);
    if (isMenuFlutuanteOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuFlutuanteOpen]);

  useEffect(() => {
    if (!id) {
      router.push("/saude");
      return;
    }

    const fetchTratamento = async () => {
      try {
        const data = await db.tratamentos.get(id);
        if (data) {
          setTratamento(data);
        } else {
          router.push("/saude");
        }
      } catch (error) {
        console.error("Erro ao buscar tratamento:", error);
        router.push("/saude");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTratamento();
  }, [id, router]);

  if (!mounted) return <DetailSkeleton />;

  const allDocuments = useLiveQuery(() => db.documents.toArray(), []) || [];
  const allRenovacoes = useLiveQuery(() => db.renovacoes.toArray(), []) || [];

  const cidsVinculados = useLiveQuery(() => {
    if (!tratamento?.cid_ids || tratamento.cid_ids.length === 0) return [];
    return db.cids.where('id').anyOf(tratamento.cid_ids).toArray();
  }, [tratamento?.cid_ids]) || [];

  const linkedMedicamentos = useMemo(() => {
    if (!id || !medicamentos) return [];
    return medicamentos.filter((m: Medicamento) => {
      return m.tratamento_ids && m.tratamento_ids.includes(id);
    });
  }, [medicamentos, id]);

  const linkedRenovacoes = useMemo(() => {
    const medIds = new Set(linkedMedicamentos.map((m: Medicamento) => m.id).filter(Boolean));
    return allRenovacoes
      .filter((r: Renovacao) => r.medicamento_id && medIds.has(r.medicamento_id))
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [linkedMedicamentos, allRenovacoes]);

  const linkedDocuments = useMemo(() => {
    if (!id) return [];
    return allDocuments.filter((doc: Document) => {
      const meta = doc.metadata as DocumentMetadata;
      return meta.tratamento_id === id;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allDocuments, id]);

  const custoTotalTratamento = useMemo(() => {
    let total = 0;
    linkedRenovacoes.forEach((r: Renovacao) => {
      if (typeof r.preco === "number" && r.preco > 0) {
        total += r.preco;
      }
    });
    return total;
  }, [linkedRenovacoes]);

  const economiaInfo = useMemo(() => {
    return calcularEconomia(linkedRenovacoes);
  }, [linkedRenovacoes]);

  const linkedMedicos = useMemo(() => {
    const medIds = new Set(linkedMedicamentos.map((m: Medicamento) => m.medico_id).filter(Boolean));
    return medicos.filter((med: Medico) => med.id && medIds.has(med.id));
  }, [linkedMedicamentos, medicos]);

  const medicamentosComAlertas = useMemo(() => {
    return linkedMedicamentos.map((med: Medicamento): MedicamentoComAlertas => {
      const receitaVencida = isReceitaVencidaSegura(med.proxima_renovacao);
      const insight = sugerirRenovacao(med);
      return { ...med, receitaVencida, insight };
    });
  }, [linkedMedicamentos]);

  const cidsInsights = useMemo(() => {
    return cidsVinculados.map((cid: Cid) => {
      const insight = getCidInsights(cid.codigo);
      return { ...cid, insight };
    });
  }, [cidsVinculados]);

  const handleFavoriteToggle = async (docId: string) => {
    await favorite(docId);
    trigger("vibrate");
  };

  const handleDismissEconomia = () => {
    localStorage.setItem(`dismissEconomia_${id}`, "true");
    setDismissEconomia(true);
    trigger("vibrate");
  };

  const menuOptions = [
    { id: "adicionar-cid", label: "Adicionar CID", icon: FolderHeart, path: `/saude/cids?tratamento_id=${id}` },
    { id: "novo-medicamento", label: "Novo Medicamento", icon: Pill, path: `/saude/medicamentos/novo?tratamento_id=${id}` },
    { id: "adicionar-documento", label: "Adicionar Documento", icon: FileText, path: `/novo?tratamento_id=${id}` },
    { id: "editar-tratamento", label: "Editar Tratamento", icon: Edit3, path: `/saude/tratamentos/editar?id=${id}` },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  if (isLoading) return <DetailSkeleton />;
  if (!tratamento) return null;

  // TEMA VISUAL DINÂMICO
  const theme = getClinicalTheme(tratamento.nome);
  const IconComp = theme.icon;
  
  const medicamentosAtivos = medicamentosComAlertas.filter((m) => m.status !== "descontinuado");
  const medicamentosDescontinuados = medicamentosComAlertas.filter((m) => m.status === "descontinuado");

  const medicosNomesDosMedicamentos = [...new Set(linkedMedicamentos.map(m => m.medico).filter(Boolean))];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => { trigger("vibrate"); router.back(); }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              
              <div className="min-w-0">
                <p className={`font-mono text-[11px] uppercase tracking-[0.28em] ${theme.textClass}`}>Painel Clínico</p>
                <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">Visão Geral</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); trigger("vibrate"); setIsMenuFlutuanteOpen(!isMenuFlutuanteOpen); }}
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
                        onClick={(e) => e.stopPropagation()}
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
                onClick={() => { trigger("vibrate"); router.push(`/saude/tratamentos/editar?id=${tratamento.id}`); }}
                aria-label="Editar tratamento"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
              >
                <Edit3 size={16} />
              </button>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          {/* HERO CARD DINÂMICO DO TRATAMENTO */}
          <motion.div 
            variants={fadeUp} 
            initial="initial" 
            animate="animate" 
            className={`relative overflow-hidden rounded-[32px] border bg-surface p-6 shadow-sm ${theme.borderClass}`}
            style={{ borderLeft: `6px solid ${theme.hex}` }}
          >
            <div className={`absolute -right-4 -top-4 opacity-5 pointer-events-none ${theme.textClass}`}>
              <IconComp size={140} />
            </div>
            
            <div className="relative z-10 flex items-start gap-4">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-sm border ${theme.bgClass} ${theme.borderClass} ${theme.textClass}`}>
                <IconComp size={28} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-2xl font-bold text-ink-primary leading-tight">{tratamento.nome}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    tratamento.status === "ativo" ? "bg-emerald-400/10 border border-emerald-400/20 text-emerald-400" : 
                    tratamento.status === "concluido" ? "bg-ice/10 border border-ice/20 text-ice" : 
                    "bg-coral/10 border border-coral/20 text-coral"
                  }`}>
                    {tratamento.status === "ativo" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
                    {tratamento.status === "ativo" ? "Em andamento" : tratamento.status === "concluido" ? "Concluído" : "Suspenso"}
                  </span>
                </div>
              </div>
            </div>

            {cidsVinculados.length > 0 && (
              <div className="relative z-10 mt-4 rounded-xl bg-surface-raised/50 border border-surface-border/40 p-3 space-y-2">
                <p className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
                  <FolderHeart size={14} className="text-violet-400" /> Diagnósticos vinculados:
                </p>
                <div className="flex flex-wrap gap-2">
                  {cidsInsights.map((cid) => {
                    const cidTheme = getClinicalTheme(cid.descricao || cid.codigo);
                    const CidIcon = cidTheme.icon;
                    return (
                      <div key={cid.id} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${cidTheme.tagClass}`}>
                        <CidIcon size={12} />
                        <span className="text-[10px] font-semibold">{cid.codigo}</span>
                        <span className="text-[10px] opacity-80">- {cid.descricao}</span>
                        {cid.insight && <Sparkles size={12} className="opacity-80" />}
                      </div>
                    );
                  })}
                </div>
                {cidsInsights.some(c => c.insight) && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-400/5 border border-amber-400/20 p-2.5">
                    <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-ink-muted leading-relaxed">
                      <span className="font-medium text-amber-400">Dica clínica:</span> {cidsInsights.map(c => c.insight?.alertaClinico).filter(Boolean).join(' • ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 border-t border-surface-border/50 pt-5">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-1 text-ink-muted">
                  <Pill size={14} />
                  <span className="text-[10px] font-medium uppercase tracking-wider">Medicamentos</span>
                </div>
                <span className="font-mono text-xl font-semibold text-ink-primary mt-1">
                  {medicamentosAtivos.length} <span className="text-xs font-normal text-ink-faint">ativos</span>
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-1 text-ink-muted">
                  <FileStack size={14} />
                  <span className="text-[10px] font-medium uppercase tracking-wider">Laudos</span>
                </div>
                <span className="font-mono text-xl font-semibold text-ink-primary mt-1">{linkedDocuments.length}</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-1 text-ink-muted">
                  <Receipt size={14} />
                  <span className="text-[10px] font-medium uppercase tracking-wider">Custo Total</span>
                </div>
                <span className="font-mono text-base font-semibold text-emerald-400 mt-1">
                  {custoTotalTratamento > 0 ? formatCurrency(custoTotalTratamento) : "R$ 0,00"}
                </span>
              </div>
            </div>
          </motion.div>

          {economiaInfo && isFinite(economiaInfo.percentual) && !dismissEconomia && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-4 border flex items-center justify-between ${
                economiaInfo.economia > 0 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-coral/10 border-coral/30'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-full ${economiaInfo.economia > 0 ? 'bg-emerald-500/20' : 'bg-coral/20'}`}>
                  {economiaInfo.economia > 0 ? (
                    <TrendingDown size={20} className="text-emerald-400" />
                  ) : (
                    <TrendingUp size={20} className="text-coral" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-primary">
                    {economiaInfo.economia > 0 ? '💰 Economia na última compra' : '📈 Aumento de custo'}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {economiaInfo.economia > 0 
                      ? `Você economizou ${formatCurrency(Math.abs(economiaInfo.economia))} (${Math.abs(economiaInfo.percentual).toFixed(1)}%) em relação à média anterior.`
                      : `A última compra custou ${formatCurrency(Math.abs(economiaInfo.economia))} (${Math.abs(economiaInfo.percentual).toFixed(1)}%) a mais que a média.`
                    }
                  </p>
                </div>
              </div>
              <button 
                onClick={handleDismissEconomia}
                className="p-1.5 rounded-full hover:bg-void/20 transition-colors shrink-0 ml-2"
                aria-label="Fechar alerta"
              >
                <X size={16} className="text-ink-muted" />
              </button>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.03 }} className="space-y-3">
            <div className="flex items-center gap-2 pl-1">
              <Users size={16} className="text-ice" />
              <h3 className="font-display text-base font-semibold text-ink-primary">Equipe Clínica</h3>
            </div>
            {linkedMedicos.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  {medicosNomesDosMedicamentos.length > 0 
                    ? `Médico(s) mencionado(s): ${medicosNomesDosMedicamentos.join(', ')}`
                    : 'Nenhum médico vinculado aos medicamentos deste tratamento.'
                  }
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {linkedMedicos.map((m: Medico) => (
                  <button 
                    key={m.id} 
                    onClick={() => { trigger("vibrate"); router.push(`/saude/medicos/detalhes?id=${m.id}`); }} 
                    className="rounded-full bg-surface border border-surface-border px-4 py-2 text-sm font-medium text-ink-primary shadow-sm hover:border-ice/30 transition-all active:scale-95"
                  >
                    Dr(a). {m.nome}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {linkedRenovacoes.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.04 }} className="space-y-3">
              <div className="flex items-center gap-2 pl-1">
                <Clock size={16} className="text-amber-400" />
                <h3 className="font-display text-base font-semibold text-ink-primary">Últimas Compras</h3>
              </div>
              <div className="space-y-2">
                {linkedRenovacoes.slice(0, 5).map((ren: Renovacao) => {
                  const med = linkedMedicamentos.find((m: Medicamento) => m.id === ren.medicamento_id);
                  return (
                    <div key={ren.id} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 shadow-sm">
                      <div>
                        <p className="text-sm font-semibold text-ink-primary">{med?.nome || "Medicamento"}</p>
                        <p className="text-[11px] text-ink-muted">{formatDateDisplay(ren.data)}</p>
                      </div>
                      {ren.preco && (
                        <span className="text-sm font-semibold text-emerald-400">{formatCurrency(ren.preco)}</span>
                      )}
                    </div>
                  );
                })}
                {linkedRenovacoes.length > 5 && (
                  <p className="text-[10px] text-center text-ink-muted pt-1">E mais {linkedRenovacoes.length - 5} compra(s)...</p>
                )}
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-3">
            <div className="flex items-center gap-2 pl-1">
              <Pill size={16} className="text-ice" />
              <h3 className="font-display text-base font-semibold text-ink-primary">Medicamentos em Uso</h3>
            </div>

            {medicamentosAtivos.length === 0 ? (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface-raised/50 p-6 text-center">
                <p className="text-sm text-ink-muted">Nenhum medicamento ativo vinculado a este tratamento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {medicamentosAtivos.map((med) => (
                  <div
                    key={med.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${med.id}`); }}
                    className="group cursor-pointer rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm transition-all active:scale-[0.98] hover:border-ice/30 relative overflow-hidden"
                    style={{ 
                      borderLeft: `4px solid ${activePersonId ? 'var(--person-accent, #38BDF8)' : '#38BDF8'}` 
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice border border-ice/10">
                          <Pill size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-ink-primary text-[15px]">{med.nome}</p>
                            {med.receitaVencida && (
                              <span className="text-[8px] font-bold uppercase bg-coral/20 text-coral px-1.5 py-0.5 rounded-full">
                                Vencida
                              </span>
                            )}
                            {med.insight?.deveRenovar && (
                              <span className="text-[8px] font-bold uppercase bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                                Renovar
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-ink-muted mt-0.5">{med.dosagem} • Dr(a). {med.medico}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-ink-faint group-hover:text-ice transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {medicamentosDescontinuados.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="space-y-3">
              <div className="flex items-center gap-2 pl-1">
                <History size={16} className="text-coral" />
                <h3 className="font-display text-base font-semibold text-ink-primary">Histórico (Descontinuados)</h3>
              </div>
              <div className="space-y-3 border-l-2 border-surface-border/50 ml-3 pl-4">
                {medicamentosDescontinuados.map((med) => (
                  <div key={med.id} onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${med.id}`); }} className="relative rounded-2xl border border-coral/10 bg-surface-raised/60 p-3.5 cursor-pointer">
                    <div className="absolute -left-[23px] top-4 h-2.5 w-2.5 rounded-full bg-coral border-2 border-void ring-1 ring-surface-border/50"></div>
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-ink-primary text-sm line-through opacity-70">{med.nome} {med.dosagem}</p>
                      <span className="text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md">SUSPENSO</span>
                    </div>
                    {med.motivo_descontinuacao && (
                      <p className="text-xs text-ink-muted italic mb-2">"{med.motivo_descontinuacao}"</p>
                    )}
                    {med.substituido_por_id && (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-ice mt-2 bg-ice/10 w-fit px-2 py-1 rounded-md border border-ice/10">
                        <ArrowLeftRight size={10} />
                        Substituído por outro medicamento
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="space-y-3">
            <div className="flex items-center justify-between pl-1 pr-1">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                <h3 className="font-display text-base font-semibold text-ink-primary">Receitas e Laudos</h3>
              </div>
            </div>

            {linkedDocuments.length === 0 ? (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface-raised/50 p-6 text-center">
                <p className="text-sm text-ink-muted">Nenhum documento ou laudo vinculado a este tratamento.</p>
              </div>
            ) : (
              <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-4">
                {linkedDocuments.map((doc) => (
                  <motion.div key={doc.id} variants={cardVariants}>
                    <DocumentCard document={doc} onFavoriteToggle={handleFavoriteToggle} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>

        </section>
      </main>
    </PageTransition>
  );
}

export default function TratamentoPage() {
  return <Suspense fallback={<DetailSkeleton />}><TratamentoContent /></Suspense>;
}
