"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Building2,
  Trash2,
  Edit,
  Loader2,
  MapPin,
  Phone,
} from "lucide-react";
import { useHospitais } from "@/hooks/useHospitais";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";

export default function HospitaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast } = useToast();
  const { hospitais, deleteHospital } = useHospitais();

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; nome: string } | null>(null);

  const sortedHospitais = useMemo(() => {
    return [...hospitais].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  }, [hospitais]);

  const handleDeleteClick = (id: string, nome: string) => {
    setShowDeleteModal({ id, nome });
  };

  const confirmDelete = async () => {
    if (!showDeleteModal) return;

    setIsDeleting(showDeleteModal.id);

    try {
      await deleteHospital(showDeleteModal.id);
      trigger("success");
      showToast("Hospital removido com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao remover hospital", "error");
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
                  Hospitais
                </h1>
                <p className="mt-1 text-sm text-ink-muted">
                  {sortedHospitais.length} hospital
                  {sortedHospitais.length !== 1 ? "s" : ""} cadastrado
                  {sortedHospitais.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/saude/hospitais/novo");
              }}
              aria-label="Adicionar hospital"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/20 transition-all active:scale-95"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6">
          {sortedHospitais.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28 }}
              className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                <Building2 size={32} className="text-ink-muted" />
              </div>

              <h3 className="font-display text-lg font-semibold text-ink-primary">
                Nenhum hospital cadastrado
              </h3>

              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Cadastre hospitais para agilizar o preenchimento de prontuários, exames e laudos.
              </p>

              <Button
                variant="primary"
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/hospitais/novo");
                }}
                className="mt-6"
              >
                Adicionar hospital
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {sortedHospitais.map((hospital, index) => (
                <motion.article
                  key={hospital.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: index * 0.04 }}
                  className="group flex items-center justify-between rounded-[22px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm transition-all duration-200 active:scale-[0.99]"
                >
                  <button
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/saude/hospitais/editar?id=${hospital.id}`);
                    }}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
                      <Building2 size={20} className="text-ice" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-display text-[15px] font-semibold text-ink-primary">
                        {hospital.nome}
                      </h3>

                      <div className="mt-1 space-y-1">
                        {hospital.endereco && (
                          <p className="flex items-start gap-1.5 text-xs leading-5 text-ink-muted">
                            <MapPin size={12} className="mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{hospital.endereco}</span>
                          </p>
                        )}

                        {hospital.telefone && (
                          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <Phone size={12} className="shrink-0" />
                            <span className="truncate">{hospital.telefone}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="ml-3 flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        trigger("vibrate");
                        router.push(`/saude/hospitais/editar?id=${hospital.id}`);
                      }}
                      aria-label={`Editar ${hospital.nome}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors active:scale-95 hover:bg-surface-raised hover:text-ice"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(hospital.id!, hospital.nome);
                      }}
                      disabled={isDeleting === hospital.id}
                      aria-label={`Remover ${hospital.nome}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors active:scale-95 hover:bg-surface-raised hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDeleting === hospital.id ? (
                        <Loader2 size={16} className="animate-spin text-coral" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>

        <ConfirmationModal
          isOpen={!!showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          onConfirm={confirmDelete}
          title="Remover hospital"
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