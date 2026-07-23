"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash2, Loader2, Users, Edit, Mail, Phone, User } from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function PessoasPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null);

  const persons = usePersons();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 420);
    return () => clearTimeout(timer);
  }, []);

  const sortedPersons = useMemo(() => {
    return [...persons].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [persons]);

  const handleDeleteClick = (id: string, name: string) => {
    setShowDeleteModal({ id, name });
  };

  const confirmDelete = async () => {
    if (!showDeleteModal) return;

    const { id, name } = showDeleteModal;

    trigger("vibrate");
    setIsDeleting(id);

    try {
      await db.transaction("rw", db.persons, db.documents, async () => {
        await db.documents.where("person_id").equals(id).delete();
        await db.persons.delete(id);
      });

      trigger("success");
      showToast(`"${name}" foi removido(a)`, "success");
    } catch (error) {
      console.error("Erro ao remover pessoa:", error);
      trigger("error");
      showToast("Erro ao remover pessoa", "error");
    } finally {
      setIsDeleting(null);
      setShowDeleteModal(null);
    }
  };

  const handlePersonClick = (id: string) => {
    trigger("vibrate");
    router.push(`/pessoas/editar?id=${id}`);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Pessoas
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                {sortedPersons.length} pessoa
                {sortedPersons.length !== 1 ? "s" : ""} cadastrada
                {sortedPersons.length !== 1 ? "s" : ""}
              </p>
            </div>

            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/pessoas/novo");
              }}
              aria-label="Adicionar pessoa"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/20 transition-all active:scale-95"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6">
          {sortedPersons.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28 }}
              className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                <Users size={32} className="text-ink-muted" />
              </div>

              <h3 className="font-display text-lg font-semibold text-ink-primary">
                Nenhuma pessoa cadastrada
              </h3>

              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Cadastre pessoas para vincular documentos e deixar sua organização mais rápida.
              </p>

              <Button
                variant="primary"
                onClick={() => {
                  trigger("vibrate");
                  router.push("/pessoas/novo");
                }}
                className="mt-6"
              >
                Adicionar pessoa
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {sortedPersons.map((person, index) => (
                <motion.article
                  key={person.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: index * 0.04 }}
                  className="group flex items-center justify-between rounded-[22px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm transition-all duration-200 active:scale-[0.99]"
                >
                  <button
                    onClick={() => handlePersonClick(person.id!)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {person.avatar_url ? (
                      <img
                        src={person.avatar_url}
                        alt={person.name}
                        className="h-12 w-12 rounded-full border border-surface-border/50 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-sm font-semibold text-ink-primary">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h3 className="truncate font-display text-[15px] font-semibold text-ink-primary">
                        {person.name}
                      </h3>

                      <div className="mt-1 space-y-1">
                        {person.email && (
                          <p className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
                            <Mail size={12} className="shrink-0" />
                            <span className="truncate">{person.email}</span>
                          </p>
                        )}

                        {person.phone && (
                          <p className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
                            <Phone size={12} className="shrink-0" />
                            <span className="truncate">{person.phone}</span>
                          </p>
                        )}

                        {!person.email && !person.phone && (
                          <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                            <User size={12} className="shrink-0" />
                            <span>Sem informações adicionais</span>
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
                        router.push(`/pessoas/editar?id=${person.id}`);
                      }}
                      aria-label={`Editar ${person.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors active:scale-95 hover:bg-surface-raised hover:text-ice"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(person.id!, person.name);
                      }}
                      disabled={isDeleting === person.id}
                      aria-label={`Remover ${person.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors active:scale-95 hover:bg-surface-raised hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDeleting === person.id ? (
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
          title="Remover pessoa"
          message={`Tem certeza que deseja remover "${showDeleteModal?.name}"?`}
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