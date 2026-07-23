"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Pill,
  Trash2,
  Edit,
  Loader2,
  Calendar,
  AlertTriangle,
  Clock3,
  Stethoscope,
} from "lucide-react";
import { usePaginatedDocuments } from "@/hooks/usePaginatedDocuments";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useToast } from "@/components/ToastProvider";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/Button";

export default function MedicamentosPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast, showSuccess } = useToast();
  const { medicamentos: allMedicamentos, deleteMedicamento } = useMedicamentos();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const {
    documents: paginatedDocs,
    totalCount,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedDocuments({});

  const medicamentos = allMedicamentos || [];

  const sortedMedicamentos = useMemo(() => {
    return [...medicamentos].sort((a, b) => {
      const aDate = a.proxima_renovacao ? new Date(a.proxima_renovacao).getTime() : Infinity;
      const bDate = b.proxima_renovacao ? new Date(b.proxima_renovacao).getTime() : Infinity;
      return aDate - bDate;
    });
  }, [medicamentos]);

  const handleDeleteClick = async (id: string, nome: string) => {
    trigger("vibrate");

    showSuccess(`"${nome}" foi removido`, 5000, {
      label: "Desfazer",
      onClick: () => {
        showToast("Restauração em breve...", "info");
      },
    });

    setIsDeleting(id);
    try {
      await deleteMedicamento(id);
      trigger("success");
    } catch (error) {
      showToast("Erro ao remover medicamento", "error");
      trigger("error");
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getDaysUntilRenewal = (dateStr: string) => {
    try {
      const today = new Date();
      const renewal = new Date(dateStr);
      return differenceInDays(renewal, today);
    } catch {
      return null;
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                aria-label="Voltar"
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Saúde
                </p>
                <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                  Medicamentos
                </h1>
                <p className="mt-1 text-sm text-ink-muted">
                  {sortedMedicamentos.length} medicamento
                  {sortedMedicamentos.length !== 1 ? "s" : ""} cadastrado
                  {sortedMedicamentos.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/saude/medicamentos/novo");
              }}
              aria-label="Adicionar medicamento"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/20 transition-all active:scale-95"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <section className="space-y-3 px-5 pt-6">
          {sortedMedicamentos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.26 }}
              className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                <Pill size={32} className="text-ink-muted" />
              </div>

              <h3 className="font-display text-lg font-semibold text-ink-primary">
                Nenhum medicamento cadastrado
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Cadastre medicamentos para acompanhar receitas, médicos e datas de renovação.
              </p>

              <Button
                variant="primary"
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/medicamentos/novo");
                }}
                className="mt-6"
              >
                Adicionar medicamento
              </Button>
            </motion.div>
          ) : (
            sortedMedicamentos.map((med, index) => {
              const daysUntilRenewal = med.proxima_renovacao
                ? getDaysUntilRenewal(med.proxima_renovacao)
                : null;

              const isExpiring =
                daysUntilRenewal !== null && daysUntilRenewal <= 7 && daysUntilRenewal >= 0;
              const isExpired = daysUntilRenewal !== null && daysUntilRenewal < 0;

              return (
                <motion.article
                  key={med.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.32) }}
                  className={`rounded-[24px] border bg-surface px-4 py-4 shadow-sm transition-all duration-200 active:scale-[0.99] ${
                    isExpired
                      ? "border-coral/45"
                      : isExpiring
                        ? "border-amber-500/45"
                        : "border-surface-border/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-surface-raised ${
                          isExpired
                            ? "border-coral/30"
                            : isExpiring
                              ? "border-amber-500/30"
                              : "border-surface-border/50"
                        }`}
                      >
                        {isExpired || isExpiring ? (
                          <AlertTriangle
                            size={18}
                            className={isExpired ? "text-coral" : "text-amber-400"}
                          />
                        ) : (
                          <Pill size={18} className="text-ink-muted" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-display text-[15px] font-semibold text-ink-primary">
                            {med.nome}
                          </h3>

                          {isExpired && (
                            <span className="rounded-full bg-coral/15 px-2.5 py-1 text-[11px] font-medium text-coral">
                              Vencido
                            </span>
                          )}

                          {isExpiring && !isExpired && (
                            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-400">
                              {daysUntilRenewal === 0 ? "Hoje" : `${daysUntilRenewal}d`}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-ink-muted">{med.dosagem}</p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[11px] text-ink-muted">
                            <Stethoscope size={12} />
                            {med.medico}
                          </span>

                          {med.proxima_renovacao && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[11px] text-ink-muted">
                              <Calendar size={12} />
                              Renovação: {formatDate(med.proxima_renovacao)}
                            </span>
                          )}

                          {daysUntilRenewal !== null && !isExpired && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[11px] text-ink-muted">
                              <Clock3 size={12} />
                              {daysUntilRenewal === 0
                                ? "Renovação hoje"
                                : `${daysUntilRenewal} dia${daysUntilRenewal !== 1 ? "s" : ""}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ml-2 flex items-center gap-1">
                      <button
                        onClick={() => {
                          trigger("vibrate");
                          router.push(`/saude/medicamentos/detalhes?id=${med.id}`);
                        }}
                        aria-label={`Abrir ${med.nome}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors active:scale-95 hover:bg-surface-raised hover:text-ice"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => handleDeleteClick(med.id!, med.nome)}
                        disabled={isDeleting === med.id}
                        aria-label={`Remover ${med.nome}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors active:scale-95 hover:bg-surface-raised hover:text-coral disabled:opacity-50"
                      >
                        {isDeleting === med.id ? (
                          <Loader2 size={16} className="animate-spin text-coral" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })
          )}

          {hasMore && (
            <InfiniteScrollTrigger onIntersect={loadMore} disabled={isLoadingMore} />
          )}
        </section>

        <ScrollToTop threshold={400} />
      </main>
    </PageTransition>
  );
}