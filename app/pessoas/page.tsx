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
  ChevronRight,
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
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { personsRepository } from "@/lib/repositories/persons";
import { documentsRepository } from "@/lib/repositories/documents";

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
      const documents = await db.documents
        .where("person_id")
        .equals(id)
        .toArray();

      for (const document of documents) {
        if (document.id) {
          await documentsRepository.delete(document.id);
        }
      }

      await personsRepository.delete(id);

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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.2) }}
                    className="group relative overflow-hidden rounded-[24px] border bg-surface shadow-md transition-all hover:bg-surface-raised"
                    style={{
                      borderColor: isDefault ? `${person.color || "#38BDF8"}40` : "var(--surface-border)",
                      borderLeft: isDefault ? `6px solid ${person.color || "#38BDF8"}` : undefined,
                    }}
                  >
                    <div className="p-4 pl-5">
                      <button
                        type="button"
                        onClick={() => handlePersonClick(personId)}
                        className="flex w-full items-start gap-3.5 text-left outline-none"
                      >
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner"
                          style={{
                            backgroundColor: `${person.color || "#38BDF8"}15`,
                            borderColor: `${person.color || "#38BDF8"}30`,
                            color: person.color || "#38BDF8",
                          }}
                        >
                          {person.avatar_url ? (
                            <img src={person.avatar_url} alt={person.name} className="h-full w-full rounded-2xl object-cover" />
                          ) : (
                            <span className="text-lg font-bold">{person.name?.charAt(0).toUpperCase() || "P"}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-baseline gap-2">
                            <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                              {person.name}
                            </h3>
                            {isDefault && (
                              <span className="shrink-0 whitespace-nowrap flex items-center gap-0.5 rounded-full bg-ice/15 px-2 py-0.5 text-[9px] font-bold uppercase text-ice border border-ice/20">
                                <CheckCircle size={10} />
                                Ativa
                              </span>
                            )}
                          </div>

                          <div className="mt-1 space-y-1">
                            {person.email && (
                              <p className="flex items-center gap-1.5 text-xs text-ink-muted truncate">
                                <Mail size={12} strokeWidth={1.8} className="shrink-0" />
                                <span className="truncate">{person.email}</span>
                              </p>
                            )}
                            {person.phone && (
                              <p className="flex items-center gap-1.5 text-xs text-ink-muted truncate">
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

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); trigger("vibrate"); router.push(`/pessoas/editar?id=${personId}`); }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-muted transition-colors hover:text-ice active:scale-95"
                            aria-label={`Editar ${person.name}`}
                          >
                            <Edit size={14} />
                          </button>
                          {!isDefault && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteClick(personId, person.name); }}
                              disabled={isDeleting === personId}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-muted transition-colors hover:text-coral hover:border-coral/30 active:scale-95 disabled:opacity-50"
                              aria-label={`Remover ${person.name}`}
                            >
                              {isDeleting === personId ? (
                                <Loader2 size={14} className="animate-spin text-coral" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          )}
                          <ChevronRight size={16} className="text-ink-faint" />
                        </div>
                      </button>
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