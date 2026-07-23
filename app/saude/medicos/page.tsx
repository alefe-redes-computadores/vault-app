"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  User,
  Trash2,
  Edit,
  Loader2,
  Stethoscope,
  BadgeInfo,
  Phone,
} from "lucide-react";
import { useMedicos } from "@/hooks/useMedicos";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";

export default function MedicosPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast } = useToast();
  const { medicos, deleteMedico } = useMedicos();

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; nome: string } | null>(null);

  const sortedMedicos = useMemo(() => {
    return [...medicos].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  }, [medicos]);

  const handleDeleteClick = (id: string, nome: string) => {
    setShowDeleteModal({ id, nome });
  };

  const confirmDelete = async () => {
    if (!showDeleteModal) return;

    setIsDeleting(showDeleteModal.id);
    try {
      await deleteMedico(showDeleteModal.id);
      trigger("success");
      showToast("Médico removido com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao remover médico", "error");
      trigger("error");
    } finally {
      setIsDeleting(null);
      setShowDeleteModal(null);
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
                  Médicos
                </h1>
                <p className="mt-1 text-sm text-ink-muted">
                  {sortedMedicos.length} médico{sortedMedicos.length !== 1 ? "s" : ""} cadastrado
                  {sortedMedicos.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/saude/medicos/novo");
              }}
              aria-label="Adicionar médico"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/20 transition-all active:scale-95"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <section className="space-y-3 px-5 pt-6">
          {sortedMedicos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.26 }}
              className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                <Stethoscope size={32} className="text-ink-muted" />
              </div>

              <h3 className="font-display text-lg font-semibold text-ink-primary">
                Nenhum médico cadastrado
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Cadastre profissionais para agilizar receitas, histórico clínico e prontuários.
              </p>

              <Button
                variant="primary"
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/medicos/novo");
                }}
                className="mt-6"
              >
                Adicionar médico
              </Button>
            </motion.div>
          ) : (
            sortedMedicos.map((medico, index) => (
              <motion.article
                key={medico.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: index * 0.04 }}
                className="rounded-[24px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm transition-all duration-200 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                      <User size={18} className="text-ink-muted" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-display text-[15px] font-semibold text-ink-primary">
                        {medico.nome}
                      </h3>

                      {medico.especialidade && (
                        <p className="mt-1 text-sm text-ink-muted">{medico.especialidade}</p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {medico.crm && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[11px] text-ink-muted">
                            <BadgeInfo size={12} />
                            CRM: {medico.crm}
                          </span>
                        )}

                        {medico.telefone && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[11px] text-ink-muted">
                            <Phone size={12} />
                            {medico.telefone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-2 flex items-center gap-1">
                    <button
                      onClick={() => {
                        trigger("vibrate");
                        router.push(`/saude/medicos/editar?id=${medico.id}`);
                      }}
                      aria-label={`Editar ${medico.nome}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors active:scale-95 hover:bg-surface-raised hover:text-ice"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={() => handleDeleteClick(medico.id!, medico.nome)}
                      disabled={isDeleting === medico.id}
                      aria-label={`Remover ${medico.nome}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors active:scale-95 hover:bg-surface-raised hover:text-coral disabled:opacity-50"
                    >
                      {isDeleting === medico.id ? (
                        <Loader2 size={16} className="animate-spin text-coral" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </motion.article>
            ))
          )}
        </section>

        <ConfirmationModal
          isOpen={!!showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          onConfirm={confirmDelete}
          title="Remover médico"
          message={`Tem certeza que deseja remover "${showDeleteModal?.nome}"?`}
          confirmLabel="Remover"
          cancelLabel="Cancelar"
          isLoading={isDeleting !== null}
          type="danger"
        />

        <ScrollToTop threshold={400} />
      </main>
    </PageTransition>
  );
}