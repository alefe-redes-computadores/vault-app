"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Pill, Plus, ChevronRight } from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import {
  computeEstoqueInfo,
  getDaysUntil,
  isControlada,
  TIPO_RECEITA_LABELS,
} from "@/lib/health-utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatDate(date?: string) {
  if (!date) return null;
  try {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return null;
  }
}

export default function MedicamentosListPage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { medicamentos } = useMedicamentos();

  const sorted = useMemo(() => {
    return [...(medicamentos || [])].sort((a, b) => {
      const da = getDaysUntil(a.proxima_renovacao) ?? 9999;
      const db = getDaysUntil(b.proxima_renovacao) ?? 9999;
      return da - db;
    });
  }, [medicamentos]);

  const isLoading = medicamentos === undefined;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Pill size={18} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Meus medicamentos
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                {sorted.length} cadastrado{sorted.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-3 px-5 pt-5">
          {sorted.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="glow-ice mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-ice/15 bg-surface-raised">
                <Pill size={22} className="text-ice/60" />
              </div>
              <h3 className="font-display text-base font-semibold text-ink-primary">
                Nenhum medicamento cadastrado
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Cadastre pra acompanhar renovação de receita e estoque.
              </p>
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/medicamentos/novo");
                }}
                className="glow-ice mt-6 inline-flex items-center gap-2 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void transition-all duration-200 active:scale-95"
              >
                <Plus size={16} />
                Cadastrar medicamento
              </button>
            </motion.div>
          ) : (
            <>
              {sorted.map((med, index) => {
                const estoqueInfo = computeEstoqueInfo(med);
                const controlada = isControlada(med.tipo_receita);

                return (
                  <motion.button
                    key={med.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.3) }}
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/saude/medicamentos/editar?id=${med.id}`);
                    }}
                    className="flex w-full items-start gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                      <Pill size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-display text-sm font-semibold text-ink-primary">
                          {med.nome}
                        </p>
                        {controlada && med.tipo_receita && (
                          <span className="shrink-0 rounded-full bg-violet-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-300">
                            {TIPO_RECEITA_LABELS[med.tipo_receita]}
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-xs text-ink-muted">
                        {med.dosagem} · Dr(a). {med.medico}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
                        <span>
                          Renova em {formatDate(med.proxima_renovacao) || "—"}
                        </span>
                        {estoqueInfo && (
                          <span className="text-ice/80">
                            {estoqueInfo.quantidadeRestante} {estoqueInfo.unidade} restantes
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
                  </motion.button>
                );
              })}

              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/medicamentos/novo");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-dashed border-surface-border/60 bg-surface/40 py-4 text-sm font-medium text-ink-muted transition-all active:scale-[0.985] hover:border-ice/30 hover:text-ice"
              >
                <Plus size={16} />
                Cadastrar medicamento
              </button>
            </>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
