// app/saude/locais/detalhes/page.tsx
"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/db";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useHapticFeedback } from "@/lib/haptics";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import {
  ArrowLeft, FileText, MapPin, Edit3, Trash2, 
  Clock, Plus, Pill, FileWarning
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { formatDateDisplay } from "@/lib/health-utils";
import { calcularEconomia } from "@/lib/health-insights";
import type { LocalSaude, Renovacao, Medicamento } from "@/lib/types";
import { useLocais } from "@/hooks/useLocais";

function formatCurrency(value: number | undefined | null): string {
  const val = typeof value === 'number' ? value : 0;
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function DetalhesLocalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();
  const { deleteLocal } = useLocais();
  const { activePersonId } = useActivePersonId();

  const [local, setLocal] = useState<LocalSaude | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);

  const renovacoes = useLiveQuery(
    () => (id ? db.renovacoes.where("local_id").equals(id).toArray() : Promise.resolve([] as Renovacao[])),
    [id]
  ) || [];

  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];

  const analiseLocal = useMemo(() => {
    if (!id || !renovacoes || !medicamentos) {
      return {
        totalGasto: 0,
        precoMedio: 0,
        ultimaRenovacao: null as Renovacao | null,
        economia: null,
        medicamentosCount: 0,
        renovacoesComMed: [] as Array<Renovacao & { medicamento_nome: string }>,
      };
    }

    try {
      const renovacoesComMed = renovacoes.map((r) => {
        const med = medicamentos.find((m) => m.id === r.medicamento_id);
        return { ...r, medicamento_nome: med?.nome || "Medicamento" };
      });

      const ordenadas = [...renovacoesComMed].sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      );

      let totalGasto = 0;
      renovacoes.forEach((r) => {
        if (typeof r.preco === "number" && r.preco > 0) totalGasto += r.preco;
      });

      const precos = renovacoes
        .filter((r) => typeof r.preco === "number" && r.preco > 0)
        .map((r) => r.preco as number);
      
      const precoMedio = precos.length > 0 ? precos.reduce((a, b) => a + b, 0) / precos.length : 0;
      const ultimaRenovacao = ordenadas.length > 0 ? ordenadas[0] : null;
      const economia = calcularEconomia(renovacoes);
      const medIds = new Set(renovacoes.map((r) => r.medicamento_id).filter(Boolean));

      return {
        totalGasto,
        precoMedio,
        ultimaRenovacao,
        economia,
        medicamentosCount: medIds.size,
        renovacoesComMed: ordenadas,
      };
    } catch (e) {
      console.error("Erro na análise do local:", e);
      return {
        totalGasto: 0,
        precoMedio: 0,
        ultimaRenovacao: null as Renovacao | null,
        economia: null,
        medicamentosCount: 0,
        renovacoesComMed: [],
      };
    }
  }, [id, renovacoes, medicamentos]);

  useEffect(() => {
    if (!id) { router.push("/saude/locais"); return; }
    db.locais.get(id).then((res) => {
      setLocal(res || null);
      setIsLoading(false);
    });
  }, [id, router]);

  const handleDelete = async () => {
    trigger("vibrate");
    if (!id) return;
    try {
      await deleteLocal(id);
      trigger("success");
      router.replace("/saude/locais");
    } catch {
      trigger("error");
    }
  };

  const menuOptions = [
    { id: "nova-renovacao", label: "Nova Renovação", icon: FileWarning, path: `/saude/renovacao/nova?local_id=${id}` },
    { id: "novo-medicamento", label: "Novo Medicamento", icon: Pill, path: `/saude/medicamentos/novo?local_id=${id}` },
    { id: "editar-local", label: "Editar Local", icon: Edit3, path: `/saude/locais/editar?id=${id}` },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  if (isLoading) return <DetailSkeleton />;
  if (!local) return null;

  const hasHistory = Array.isArray(analiseLocal.renovacoesComMed) && analiseLocal.renovacoesComMed.length > 0;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">Unidade</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">Detalhes do Local</h1>
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

            <button onClick={() => { trigger("vibrate"); router.push(`/saude/locais/editar?id=${local.id}`); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary hover:text-emerald-400"><Edit3 size={16} /></button>
            <button onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral"><Trash2 size={16} /></button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-5">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4"
            style={{ 
              borderLeft: `6px solid ${activePersonId ? 'var(--person-accent, #34D399)' : '#34D399'}` 
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                <MapPin size={24} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-xl font-bold text-ink-primary truncate">{local.nome}</h2>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">{local.endereco || "Endereço não informado."}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-surface-border/40">
              <div className="rounded-2xl bg-surface-raised p-3 text-center">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Medicamentos</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-primary">{analiseLocal.medicamentosCount}</p>
              </div>
              <div className="rounded-2xl bg-surface-raised p-3 text-center">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Total Gasto</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-400">{formatCurrency(analiseLocal.totalGasto)}</p>
              </div>
              <div className="rounded-2xl bg-surface-raised p-3 text-center">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Preço Médio</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-primary">{formatCurrency(analiseLocal.precoMedio)}</p>
              </div>
            </div>

            {analiseLocal.ultimaRenovacao && (
              <div className="pt-2 border-t border-surface-border/40">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Clock size={14} className="text-emerald-400" />
                  <span>Última retirada: <span className="font-medium text-ink-primary">{formatDateDisplay(analiseLocal.ultimaRenovacao.data)}</span></span>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-4 pt-2">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1">
              Histórico no Local ({analiseLocal.renovacoesComMed?.length || 0})
            </h3>
            <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
              {(!analiseLocal.renovacoesComMed || analiseLocal.renovacoesComMed.length === 0) ? (
                <p className="text-xs text-ink-muted py-2">Nenhum registro encontrado.</p>
              ) : (
                analiseLocal.renovacoesComMed.slice(0, 10).map((r) => (
                  <div key={r.id} onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/detalhes?id=${r.id}`); }} className="flex items-center justify-between rounded-xl bg-surface-raised p-3.5 border border-surface-border/40 cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface border border-surface-border/40">
                        <FileText size={14} className="text-ink-muted" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-primary truncate">{r.medicamento_nome}</p>
                        <p className="text-[11px] text-ink-muted">{formatDateDisplay(r.data)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400">{formatCurrency(r.preco)}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </section>

        <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Excluir Local" message="Tem certeza que deseja excluir este posto/clínica? Os registros de renovação não serão apagados, mas perderão a associação com este nome." />
      </main>
    </PageTransition>
  );
}

export default function DetalhesLocalPage() {
  return <Suspense fallback={<DetailSkeleton />}><DetalhesLocalContent /></Suspense>;
}