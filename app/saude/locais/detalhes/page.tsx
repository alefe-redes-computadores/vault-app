"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { db } from "@/lib/db";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useHapticFeedback } from "@/lib/haptics";
import {
  ArrowLeft,
  FileText,
  MapPin,
  Edit3,
  Trash2,
  Calendar,
  Pill,
  DollarSign,
  Clock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
// 🔧 CORRIGIDO: formatDateDisplay vem de health-utils, não health-insights
import { formatDateDisplay } from "@/lib/health-utils";
import { calcularEconomia } from "@/lib/health-insights";

// 🔧 Função local (não existe em health-utils)
function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
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

  const [local, setLocal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const renovacoes = useLiveQuery(
    () => db.renovacoes.where("local_id").equals(id || "").toArray(),
    [id]
  ) || [];

  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];

  // 🔧 Análise completa do local
  const analiseLocal = useMemo(() => {
    if (!id) return {
      totalGasto: 0,
      precoMedio: 0,
      ultimaRenovacao: null,
      economia: null,
      medicamentosCount: 0,
    };

    // Últimas renovações com nome do medicamento
    const renovacoesComMed = renovacoes.map((r) => {
      const med = medicamentos.find((m) => m.id === r.medicamento_id);
      return { ...r, medicamento_nome: med?.nome || "Medicamento" };
    });

    const ordenadas = [...renovacoesComMed].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );

    // Total gasto
    let totalGasto = 0;
    renovacoes.forEach((r: any) => {
      if (typeof r.preco === "number" && r.preco > 0) {
        totalGasto += r.preco;
      }
    });

    // Preço médio
    const precos = renovacoes
      .filter((r: any) => typeof r.preco === "number" && r.preco > 0)
      .map((r: any) => r.preco);
    const precoMedio = precos.length > 0
      ? precos.reduce((a, b) => a + b, 0) / precos.length
      : 0;

    // Última renovação
    const ultimaRenovacao = ordenadas.length > 0 ? ordenadas[0] : null;

    // Economia (via health-insights)
    const economia = calcularEconomia(renovacoes);

    // Medicamentos únicos
    const medIds = new Set(renovacoes.map((r) => r.medicamento_id).filter(Boolean));

    return {
      totalGasto,
      precoMedio,
      ultimaRenovacao,
      economia,
      medicamentosCount: medIds.size,
      renovacoesComMed: ordenadas,
    };
  }, [id, renovacoes, medicamentos]);

  useEffect(() => {
    if (!id) {
      router.push("/saude/locais");
      return;
    }

    db.locais.get(id).then((res) => {
      if (res) {
        setLocal(res);
      } else {
        router.push("/saude/locais");
      }
      setIsLoading(false);
    });
  }, [id, router]);

  const handleDelete = async () => {
    trigger("vibrate");
    if (!id) return;
    try {
      await db.locais.delete(id);
      trigger("success");
      router.replace("/saude/locais");
    } catch (error) {
      console.error("Erro ao excluir local:", error);
      trigger("error");
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!local) return null;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">Unidade</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">Detalhes do Local</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { trigger("vibrate"); router.push(`/saude/locais/editar?id=${local.id}`); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95 hover:text-emerald-400 hover:border-emerald-400/30"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-5">
          {/* Card Principal */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4"
            style={{ borderLeft: `6px solid ${analiseLocal.renovacoesComMed.length > 0 ? '#34D399' : '#6B7280'}` }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                <MapPin size={24} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-xl font-bold text-ink-primary truncate">
                  {local.nome}
                </h2>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                  {local.endereco || "Endereço não informado."}
                </p>
              </div>
            </div>

            {/* 🔧 Bloco analítico */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-surface-border/40">
              <div className="rounded-2xl bg-surface-raised p-3 text-center">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Medicamentos</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-primary">{analiseLocal.medicamentosCount}</p>
              </div>
              <div className="rounded-2xl bg-surface-raised p-3 text-center">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Total Gasto</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-400">
                  {analiseLocal.totalGasto > 0 ? formatCurrency(analiseLocal.totalGasto) : "R$ 0,00"}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-raised p-3 text-center">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Preço Médio</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                  {analiseLocal.precoMedio > 0 ? formatCurrency(analiseLocal.precoMedio) : "—"}
                </p>
              </div>
            </div>

            {/* 🔧 Última renovação */}
            {analiseLocal.ultimaRenovacao && (
              <div className="pt-2 border-t border-surface-border/40">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Clock size={14} className="text-emerald-400" />
                  <span>Última retirada: <span className="font-medium text-ink-primary">{formatDateDisplay(analiseLocal.ultimaRenovacao.data)}</span></span>
                  {analiseLocal.ultimaRenovacao.preco && (
                    <span className="font-medium text-emerald-400 ml-1">
                      ({formatCurrency(analiseLocal.ultimaRenovacao.preco)})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 🔧 Economia (health-insights) */}
            {analiseLocal.economia && (
              <div className="pt-1 border-t border-surface-border/40">
                <div className={`flex items-center gap-2 text-xs ${analiseLocal.economia.economia > 0 ? 'text-emerald-400' : 'text-coral'}`}>
                  {analiseLocal.economia.economia > 0 ? (
                    <TrendingDown size={14} />
                  ) : (
                    <TrendingUp size={14} />
                  )}
                  <span>
                    {analiseLocal.economia.economia > 0
                      ? `Economia de ${formatCurrency(Math.abs(analiseLocal.economia.economia))} (${Math.abs(analiseLocal.economia.percentual)}%) na última compra`
                      : `Aumento de ${formatCurrency(Math.abs(analiseLocal.economia.economia))} (${Math.abs(analiseLocal.economia.percentual)}%) na última compra`
                    }
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Histórico Relacional (Renovações/Retiradas) */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-4 pt-2">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1">
              Histórico no Local ({analiseLocal.renovacoesComMed.length})
            </h3>

            <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-amber-400" />
                <h4 className="text-sm font-semibold text-ink-primary">Renovações e Retiradas</h4>
              </div>

              {analiseLocal.renovacoesComMed.length === 0 ? (
                <p className="text-xs text-ink-muted py-2">Nenhum registro de renovação ou retirada de medicamentos neste local.</p>
              ) : (
                <div className="space-y-2">
                  {analiseLocal.renovacoesComMed.slice(0, 10).map((r: any) => (
                    <div
                      key={r.id}
                      onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/detalhes?id=${r.id}`); }}
                      className="flex items-center justify-between rounded-xl bg-surface-raised p-3.5 border border-surface-border/40 cursor-pointer hover:border-amber-400/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface border border-surface-border/40">
                          <Pill size={14} className="text-ink-muted" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-primary truncate">{r.medicamento_nome}</p>
                          <p className="text-[11px] text-ink-muted">{formatDateDisplay(r.data)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.preco && (
                          <span className="text-sm font-semibold text-emerald-400">
                            {formatCurrency(r.preco)}
                          </span>
                        )}
                        <FileText size={16} className="text-ice/70 ml-1" />
                      </div>
                    </div>
                  ))}
                  {analiseLocal.renovacoesComMed.length > 10 && (
                    <p className="text-[10px] text-center text-ink-muted pt-1">
                      E mais {analiseLocal.renovacoesComMed.length - 10} registro(s)...
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </section>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir Local"
          message="Tem certeza que deseja excluir este posto/clínica? Os registros de renovação não serão apagados, mas perderão a associação com este nome."
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesLocalPage() {
  return <Suspense fallback={<LoadingSkeleton />}><DetalhesLocalContent /></Suspense>;
}