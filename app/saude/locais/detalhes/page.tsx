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
  ArrowLeft, FileText, MapPin, Edit3, Trash2, 
  Clock, TrendingDown, TrendingUp,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { formatDateDisplay } from "@/lib/health-utils";
import { calcularEconomia } from "@/lib/health-insights";

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

  const [local, setLocal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 🛡️ A MÁGICA DO TYPESCRIPT AQUI: [] as any[] resolve o conflito do PromiseExtended vs never[]
  const renovacoes = useLiveQuery(
    () => (id ? db.renovacoes.where("local_id").equals(id).toArray() : Promise.resolve([] as any[])),
    [id]
  ) || [];

  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];

  const analiseLocal = useMemo(() => {
    // 🛡️ Retorno seguro imediato para evitar erro de 'undefined' no render inicial
    const safeData = {
      totalGasto: 0,
      precoMedio: 0,
      ultimaRenovacao: null as any,
      economia: null as any,
      medicamentosCount: 0,
      renovacoesComMed: [] as any[],
    };

    if (!id || !renovacoes || !medicamentos) return safeData;

    try {
      const renovacoesComMed = renovacoes.map((r) => {
        const med = medicamentos.find((m) => m.id === r.medicamento_id);
        return { ...r, medicamento_nome: med?.nome || "Medicamento" };
      });

      const ordenadas = [...renovacoesComMed].sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      );

      let totalGasto = 0;
      renovacoes.forEach((r: any) => {
        if (typeof r.preco === "number" && r.preco > 0) totalGasto += r.preco;
      });

      const precos = renovacoes
        .filter((r: any) => typeof r.preco === "number" && r.preco > 0)
        .map((r: any) => r.preco);
      
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
        renovacoesComMed: ordenadas || [],
      };
    } catch (e) {
      console.error("Erro na análise do local:", e);
      return safeData;
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
      await db.locais.delete(id);
      trigger("success");
      router.replace("/saude/locais");
    } catch {
      trigger("error");
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!local) return null;

  // 🛡️ Guardrail para o estilo dinâmico
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
            // 🛡️ Estilo com Guardrail para garantir que o length não seja undefined
            style={{ borderLeft: `6px solid ${hasHistory ? '#34D399' : '#6B7280'}` }}
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
                analiseLocal.renovacoesComMed.slice(0, 10).map((r: any) => (
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
        <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} title="Excluir Local" message="Tem certeza?" />
      </main>
    </PageTransition>
  );
}

export default function DetalhesLocalPage() {
  return <Suspense fallback={<LoadingSkeleton />}><DetalhesLocalContent /></Suspense>;
}
