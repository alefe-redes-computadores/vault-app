"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Pill, Trash2, Edit, Loader2, Calendar, AlertTriangle } from "lucide-react";
import { usePaginatedDocuments } from "@/hooks/usePaginatedDocuments";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useToast } from "@/components/ToastProvider";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MedicamentosPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast, showSuccess } = useToast();
  const { medicamentos: allMedicamentos, deleteMedicamento } = useMedicamentos();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // ============================================================
  // PAGINAÇÃO para medicamentos
  // ============================================================
  const {
    documents: paginatedDocs,
    totalCount,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedDocuments({
    // Medicamentos são documentos com category_id = 'saude' e type = 'receita'
    // Por enquanto usamos o hook antigo, mas podemos adaptar
  });

  // Usar todos os medicamentos (se for poucos, mantém; se for muitos, paginar)
  const medicamentos = allMedicamentos || [];

  const handleDeleteClick = async (id: string, nome: string) => {
    trigger("vibrate");

    const toastId = showSuccess(
      `"${nome}" foi removido`,
      5000,
      {
        label: "Desfazer",
        onClick: () => {
          showToast("Restauração em breve...", "info");
        }
      }
    );

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
        <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              <div>
                <h1 className="font-display text-xl font-semibold text-ink-primary">Medicamentos</h1>
                <p className="text-sm text-ink-muted">
                  {medicamentos.length} medicamento{medicamentos.length !== 1 ? "s" : ""} cadastrado{medicamentos.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/saude/medicamentos/novo");
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ice text-void active:scale-95 transition-all"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          {medicamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center mb-4 border border-surface-border/50">
                <Pill size={32} className="text-ink-muted" />
              </div>
              <h3 className="font-display text-lg text-ink-primary">Nenhum medicamento</h3>
              <p className="text-sm text-ink-muted mt-1 max-w-xs">
                Cadastre medicamentos para controlar suas receitas e renovações.
              </p>
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/medicamentos/novo");
                }}
                className="mt-6 flex items-center gap-2 rounded-full bg-ice px-5 py-2 text-void font-medium text-sm active:scale-95 transition-all"
              >
                <Plus size={16} />
                Adicionar medicamento
              </button>
            </div>
          ) : (
            medicamentos.map((med, index) => {
              const daysUntilRenewal = med.proxima_renovacao 
                ? getDaysUntilRenewal(med.proxima_renovacao) 
                : null;
              const isExpiring = daysUntilRenewal !== null && daysUntilRenewal <= 7 && daysUntilRenewal >= 0;
              const isExpired = daysUntilRenewal !== null && daysUntilRenewal < 0;

              return (
                <motion.div
                  key={med.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.5) }}
                  className={`flex items-center justify-between p-4 rounded-xl border bg-surface shadow-sm ${
                    isExpired 
                      ? "border-coral/50" 
                      : isExpiring 
                        ? "border-amber-500/50" 
                        : "border-surface-border/50"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-[15px] font-medium text-ink-primary">
                        {med.nome}
                      </h3>
                      {isExpired && (
                        <span className="text-xs bg-coral/20 text-coral px-2 py-0.5 rounded-full">
                          Vencido
                        </span>
                      )}
                      {isExpiring && !isExpired && (
                        <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">
                          {daysUntilRenewal}d
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-muted">{med.dosagem}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-ink-muted">Médico: {med.medico}</span>
                      {med.proxima_renovacao && (
                        <span className="text-xs text-ink-muted flex items-center gap-1">
                          <Calendar size={12} />
                          Renovação: {formatDate(med.proxima_renovacao)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        trigger("vibrate");
                        router.push(`/saude/medicamentos/detalhes?id=${med.id}`);
                      }}
                      className="p-2 rounded-full hover:bg-surface-border/50 transition-colors"
                    >
                      <Edit size={16} className="text-ink-muted hover:text-ice transition-colors" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(med.id!, med.nome)}
                      disabled={isDeleting === med.id}
                      className="p-2 rounded-full hover:bg-surface-border/50 transition-colors disabled:opacity-50"
                    >
                      {isDeleting === med.id ? (
                        <Loader2 size={16} className="animate-spin text-coral" />
                      ) : (
                        <Trash2 size={16} className="text-ink-muted hover:text-coral transition-colors" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </section>

        <ScrollToTop threshold={400} />
      </main>
    </PageTransition>
  );
}