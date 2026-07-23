"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, User, Trash2, Loader2, Users, Edit } from "lucide-react";
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
  const { showToast, showSuccess } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null);

  const persons = usePersons();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleDeleteClick = (id: string, name: string) => {
    setShowDeleteModal({ id, name });
  };

  const confirmDelete = async () => {
    if (!showDeleteModal) return;
    const { id, name } = showDeleteModal;

    trigger("vibrate");
    setIsDeleting(id);

    try {
      await db.transaction('rw', db.persons, db.documents, async () => {
        await db.documents.where('person_id').equals(id).delete();
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
        <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Pessoas
              </h1>
              <p className="text-sm text-ink-muted">
                {persons.length} pessoa{persons.length !== 1 ? "s" : ""} cadastrada{persons.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/pessoas/novo");
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ice text-void active:scale-95 transition-all"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          {persons.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center mb-4 border border-surface-border/50">
                <Users size={32} className="text-ink-muted" />
              </div>
              <h3 className="font-display text-lg text-ink-primary">Nenhuma pessoa</h3>
              <p className="text-sm text-ink-muted mt-1 max-w-xs">
                Cadastre pessoas para começar a organizar seus documentos.
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
            persons.map((person, index) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl border border-surface-border/50 bg-surface shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-95"
                onClick={() => handlePersonClick(person.id!)}
              >
                <div className="flex items-center gap-3">
                  {person.avatar_url ? (
                    <img
                      src={person.avatar_url}
                      alt={person.name}
                      className="w-12 h-12 rounded-full border-2 border-ice/20"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center text-ink-muted text-lg font-medium">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-display text-[15px] font-medium text-ink-primary">
                      {person.name}
                    </h3>
                    {person.email && (
                      <p className="text-xs text-ink-muted">{person.email}</p>
                    )}
                    {person.phone && (
                      <p className="text-xs text-ink-muted">{person.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      trigger("vibrate");
                      router.push(`/pessoas/editar?id=${person.id}`);
                    }}
                    className="p-2 rounded-full hover:bg-surface-border transition-colors"
                    title="Editar pessoa"
                  >
                    <Edit size={16} className="text-ink-muted hover:text-ice transition-colors" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(person.id!, person.name);
                    }}
                    disabled={isDeleting === person.id}
                    className="p-2 rounded-full hover:bg-surface-border transition-colors disabled:opacity-50"
                    title="Remover pessoa"
                  >
                    {isDeleting === person.id ? (
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