// app/pessoas/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Trash2,
  Loader2,
  Users,
  Edit,
  Mail,
  Phone,
  User,
  CheckCircle,
  Info,
} from "lucide-react";

import { usePersons } from "@/hooks/usePersons";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { useActivePersonId } from "@/hooks/useActivePersonId";

export default function PessoasPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast } = useToast();
  const { activePersonId, changePerson } = useActivePersonId();

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const persons = usePersons();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 420);
    return () => clearTimeout(timer);
  }, []);

  const sortedPersons = useMemo(() => {
    return [...(persons || [])].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "pt-BR", {
        sensitivity: "base",
      })
    );
  }, [persons]);

  const handlePersonClick = async (id: string) => {
    trigger("vibrate");
    await changePerson(id);
  };

  const handleDeleteClick = (id: string, name: string) => {
    trigger("vibrate");
    setShowDeleteModal({ id, name });
  };

  const confirmDelete = async () => {
    if (!showDeleteModal) return;

    const { id, name } = showDeleteModal;

    trigger("vibrate");
    setIsDeleting(id);

    try {
      await db.transaction(
        "rw",
        [db.persons, db.documents],
        async () => {
          const documents = await db.documents
            .where("person_id")
            .equals(id)
            .toArray();

          for (const document of documents) {
            if (document.id) {
              await enfileirarOperacao("documents", "delete", { id: document.id });
            }
          }

          await db.documents.where("person_id").equals(id).delete();
          await db.persons.delete(id);
          await enfileirarOperacao("persons", "delete", { id });
        }
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sync:process"));
      }

      trigger("success");
      showToast(`"${name}" foi removido(a)`, "success");
    } catch (error) {
      console.error("Erro ao remover pessoa:", error);
      trigger("error");
      showToast("Não foi possível remover a pessoa", "error");
    } finally {
      setIsDeleting(null);
      setShowDeleteModal(null);
    }
  };

  if (isLoading) {
    return <CardListSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Pessoas
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                {sortedPersons.length} pessoa
                {sortedPersons.length !== 1 ? "s" : ""} cadastrada
                {sortedPersons.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6">
          {/* Banner informativo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="mb-5 flex items-start gap-3 rounded-[22px] border border-ice/20 bg-ice/5 p-4 shadow-sm"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ice/15 text-ice">
              <Info size={16} />
            </div>
            <p className="text-sm leading-6 text-ink-primary">
              Toque no card de uma pessoa para torná-la <span className="font-semibold text-ice">ativa</span>. O app passará a filtrar documentos e dados por ela automaticamente.
            </p>
          </motion.div>

          {sortedPersons.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28 }}
              className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                <Users size={32} strokeWidth={1.8} className="text-ink-muted" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-primary">
                Nenhuma pessoa cadastrada
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Cadastre pessoas para vincular documentos e deixar sua organização mais rápida.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {sortedPersons.map((person, index) => {
                const personId = person.id!;
                const isDefault = activePersonId === personId;

                return (
                  <motion.article
                    key={personId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.22,
                      delay: Math.min(index * 0.04, 0.28),
                    }}
                    className="group flex items-center justify-between rounded-[22px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm transition-all duration-200 hover:border-surface-border active:scale-[0.99]"
                    style={{
                      borderLeft: isDefault ? `4px solid ${person.color || "#38BDF8"}` : undefined,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handlePersonClick(personId)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      {person.avatar_url ? (
                        <img
                          src={person.avatar_url}
                          alt={person.name}
                          className="h-12 w-12 shrink-0 rounded-full border border-surface-border/50 object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-surface-border/50 text-sm font-semibold text-white"
                          style={{
                            backgroundColor: person.color || "#38BDF8",
                          }}
                        >
                          {person.name?.charAt(0).toUpperCase() || "P"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="truncate font-display text-[15px] font-semibold text-ink-primary">
                            {person.name}
                          </h3>
                          {isDefault && (
                            <span className="flex items-center gap-0.5 rounded-full bg-ice/15 px-2 py-0.5 text-[9px] font-bold uppercase text-ice border border-ice/20">
                              <CheckCircle size={10} />
                              Ativa
                            </span>
                          )}
                        </div>

                        <div className="mt-1 space-y-1">
                          {person.email && (
                            <p className="flex min-w-0 items-center gap-1.5 text-xs text-ink-muted">
                              <Mail size={12} strokeWidth={1.8} className="shrink-0" />
                              <span className="truncate">{person.email}</span>
                            </p>
                          )}
                          {person.phone && (
                            <p className="flex min-w-0 items-center gap-1.5 text-xs text-ink-muted">
                              <Phone size={12} strokeWidth={1.8} className="shrink-0" />
                              <span className="truncate">{person.phone}</span>
                            </p>
                          )}
                          {!person.email && !person.phone && (
                            <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                              <User size={12} strokeWidth={1.8} className="shrink-0" />
                              <span>Sem informações adicionais</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="ml-3 flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          trigger("vibrate");
                          router.push(`/pessoas/editar?id=${personId}`);
                        }}
                        aria-label={`Editar ${person.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-all duration-200 hover:bg-surface-raised hover:text-ice active:scale-95"
                      >
                        <Edit size={16} strokeWidth={1.9} />
                      </button>

                      {!isDefault && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteClick(personId, person.name);
                          }}
                          disabled={isDeleting === personId}
                          aria-label={`Remover ${person.name}`}
                          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-all duration-200 hover:bg-surface-raised hover:text-coral active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting === personId ? (
                            <Loader2 size={16} className="animate-spin text-coral" />
                          ) : (
                            <Trash2 size={16} strokeWidth={1.9} />
                          )}
                        </button>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>

        <ConfirmationModal
          isOpen={!!showDeleteModal}
          onClose={() => {
            if (!isDeleting) {
              setShowDeleteModal(null);
            }
          }}
          onConfirm={confirmDelete}
          title="Remover pessoa"
          message={
            showDeleteModal
              ? `Tem certeza que deseja remover "${showDeleteModal.name}"? Os documentos vinculados a esta pessoa também serão removidos.`
              : ""
          }
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