"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, User, Trash2, Edit, Loader2 } from "lucide-react";
import { useMedicos } from "@/hooks/useMedicos";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useToast } from "@/components/ToastProvider";

export default function MedicosPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast } = useToast();
  const { medicos, deleteMedico } = useMedicos();
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // ← string
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; nome: string } | null>(null); // ← string

  const handleDeleteClick = (id: string, nome: string) => { // ← string
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
    } finally {
      setIsDeleting(null);
      setShowDeleteModal(null);
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
                <h1 className="font-display text-xl font-semibold text-ink-primary">Médicos</h1>
                <p className="text-sm text-ink-muted">
                  {medicos.length} médico{medicos.length !== 1 ? "s" : ""} cadastrado{medicos.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/saude/medicos/novo");
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ice text-void active:scale-95 transition-all"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          {medicos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center mb-4 border border-surface-border/50">
                <User size={32} className="text-ink-muted" />
              </div>
              <h3 className="font-display text-lg text-ink-primary">Nenhum médico</h3>
              <p className="text-sm text-ink-muted mt-1 max-w-xs">
                Cadastre médicos para facilitar o preenchimento de receitas e prontuários.
              </p>
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/medicos/novo");
                }}
                className="mt-6 flex items-center gap-2 rounded-full bg-ice px-5 py-2 text-void font-medium text-sm active:scale-95 transition-all"
              >
                <Plus size={16} />
                Adicionar médico
              </button>
            </div>
          ) : (
            medicos.map((medico, index) => (
              <motion.div
                key={medico.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl border border-surface-border/50 bg-surface shadow-sm"
              >
                <div>
                  <h3 className="font-display text-[15px] font-medium text-ink-primary">
                    {medico.nome}
                  </h3>
                  {medico.especialidade && (
                    <p className="text-sm text-ink-muted">{medico.especialidade}</p>
                  )}
                  <div className="flex gap-3 mt-1">
                    {medico.crm && (
                      <span className="text-xs text-ink-muted">CRM: {medico.crm}</span>
                    )}
                    {medico.telefone && (
                      <span className="text-xs text-ink-muted">{medico.telefone}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/saude/medicos/editar?id=${medico.id}`);
                    }}
                    className="p-2 rounded-full hover:bg-surface-border/50 transition-colors"
                  >
                    <Edit size={16} className="text-ink-muted hover:text-ice transition-colors" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(medico.id!, medico.nome)}
                    disabled={isDeleting === medico.id}
                    className="p-2 rounded-full hover:bg-surface-border/50 transition-colors disabled:opacity-50"
                  >
                    {isDeleting === medico.id ? (
                      <Loader2 size={16} className="animate-spin text-coral" />
                    ) : (
                      <Trash2 size={16} className="text-ink-muted hover:text-coral transition-colors" />
                    )}
                  </button>
                </div>
              </motion.div>
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