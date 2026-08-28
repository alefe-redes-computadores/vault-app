// app/pessoas/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Edit,
  Info,
  Loader2,
  Mail,
  Phone,
  Trash2,
  User,
  Users,
} from "lucide-react";

import { usePersons } from "@/hooks/usePersons";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { personsRepository } from "@/lib/repositories/persons";

import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { useToast } from "@/components/ToastProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ConfirmationModal } from "@/components/ConfirmationModal";

import {
  ListCard,
  ListPageHeader,
} from "@/components/list";

export default function PessoasPage() {
  const router = useRouter();

  const { trigger } =
    useHapticFeedback();

  const { showToast } =
    useToast();

  const {
    activePersonId,
    changePerson,
    loading: activePersonLoading,
  } = useActivePersonId();

  const persons = usePersons();

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState<string | null>(
    null
  );

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // ==========================================================
  // SKELETON / TRANSIÇÃO
  // ==========================================================

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setIsLoading(false);
      }, 420);

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, []);

  // ==========================================================
  // ORDENAÇÃO
  // ==========================================================

  const sortedPersons =
    useMemo(() => {
      return [...persons].sort(
        (a, b) =>
          (a.name ?? "").localeCompare(
            b.name ?? "",
            "pt-BR",
            {
              sensitivity:
                "base",
            }
          )
      );
    }, [persons]);

  // ==========================================================
  // TROCAR PESSOA
  // ==========================================================

  const handlePersonClick =
    async (id: string) => {
      if (
        !id ||
        id === activePersonId
      ) {
        return;
      }

      try {
        await changePerson(id);
      } catch (error) {
        /**
         * O contexto já exibe feedback e registra o erro.
         * Mantemos o catch aqui para evitar Promise rejeitada
         * não tratada no evento de clique.
         */
        console.error(
          "Erro ao alterar pessoa ativa:",
          error
        );
      }
    };

  // ==========================================================
  // EDITAR
  // ==========================================================

  const handleEditPerson = (
    event: React.MouseEvent<HTMLButtonElement>,
    personId: string
  ) => {
    event.stopPropagation();

    trigger("vibrate");

    router.push(
      `/pessoas/editar?id=${personId}`
    );
  };

  // ==========================================================
  // EXCLUSÃO
  // ==========================================================

  const handleDeleteClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    id: string,
    name: string
  ) => {
    event.stopPropagation();

    if (
      id === activePersonId
    ) {
      trigger("error");

      showToast(
        "A pessoa ativa não pode ser removida.",
        "error"
      );

      return;
    }

    trigger("vibrate");

    setShowDeleteModal({
      id,
      name,
    });
  };

  const confirmDelete =
    async () => {
      if (
        !showDeleteModal ||
        isDeleting
      ) {
        return;
      }

      const {
        id,
        name,
      } = showDeleteModal;

      if (
        id === activePersonId
      ) {
        setShowDeleteModal(
          null
        );

        trigger("error");

        showToast(
          "A pessoa ativa não pode ser removida.",
          "error"
        );

        return;
      }

      setIsDeleting(id);

      trigger("vibrate");

      try {
        /**
         * A exclusão e sua cascata local pertencem ao
         * personsRepository.
         *
         * Não excluímos documentos separadamente aqui para
         * evitar dois fluxos de exclusão diferentes.
         */
        await personsRepository.delete(
          id
        );

        if (
          typeof window !==
          "undefined"
        ) {
          window.dispatchEvent(
            new Event(
              "sync:process"
            )
          );
        }

        trigger("success");

        showToast(
          `"${name}" foi removido(a).`,
          "success"
        );
      } catch (error) {
        console.error(
          "Erro ao remover pessoa:",
          error
        );

        trigger("error");

        showToast(
          error instanceof Error
            ? error.message
            : "Não foi possível remover a pessoa.",
          "error"
        );
      } finally {
        setIsDeleting(null);

        setShowDeleteModal(
          null
        );
      }
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    isLoading ||
    activePersonLoading
  ) {
    return (
      <CardListSkeleton />
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-[100dvh] bg-void pb-28">
        <ListPageHeader
          title="Pessoas"
          subtitle={`${
            sortedPersons.length
          } pessoa${
            sortedPersons.length !==
            1
              ? "s"
              : ""
          } cadastrada${
            sortedPersons.length !==
            1
              ? "s"
              : ""
          }`}
        />

        <section className="px-5 pt-6">
          <div className="mb-5 flex items-start gap-3 rounded-[22px] border border-ice/20 bg-ice/5 p-4 shadow-sm">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ice/15 text-ice">
              <Info
                size={16}
                aria-hidden="true"
              />
            </div>

            <p className="text-sm leading-6 text-ink-primary">
              Toque no card de uma
              pessoa para torná-la{" "}
              <span className="font-semibold text-ice">
                ativa
              </span>
              . O Vault usará essa
              pessoa para filtrar os
              dados vinculados a ela.
            </p>
          </div>

          {sortedPersons.length ===
          0 ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                <Users
                  size={32}
                  strokeWidth={1.8}
                  className="text-ink-muted"
                  aria-hidden="true"
                />
              </div>

              <h3 className="font-display text-lg font-semibold text-ink-primary">
                Nenhuma pessoa cadastrada
              </h3>

              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Cadastre uma pessoa para
                organizar documentos,
                saúde e outros registros
                de forma individual.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPersons.map(
                (
                  person,
                  index
                ) => {
                  if (!person.id) {
                    return null;
                  }

                  const personId =
                    person.id;

                  const isActive =
                    activePersonId ===
                    personId;

                  const personColor =
                    person.color ||
                    "#38BDF8";

                  return (
                    <ListCard
                      key={
                        personId
                      }
                      id={
                        personId
                      }
                      color={
                        personColor
                      }
                      onClick={() =>
                        void handlePersonClick(
                          personId
                        )
                      }
                      delay={Math.min(
                        index *
                          0.025,
                        0.25
                      )}
                      icon={
                        person.avatar_url ? (
                          <img
                            src={
                              person.avatar_url
                            }
                            alt={
                              person.name
                            }
                            className="h-full w-full rounded-2xl object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold">
                            {person.name
                              ?.charAt(
                                0
                              )
                              .toUpperCase() ||
                              "P"}
                          </span>
                        )
                      }
                      isDisabled={
                        false
                      }
                      actions={
                        <>
                          <button
                            type="button"
                            onClick={(
                              event
                            ) =>
                              handleEditPerson(
                                event,
                                personId
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-colors hover:text-ice active:scale-95"
                            aria-label={`Editar ${person.name}`}
                          >
                            <Edit
                              size={
                                14
                              }
                              aria-hidden="true"
                            />
                          </button>

                          {!isActive && (
                            <button
                              type="button"
                              onClick={(
                                event
                              ) =>
                                handleDeleteClick(
                                  event,
                                  personId,
                                  person.name
                                )
                              }
                              disabled={
                                isDeleting ===
                                personId
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-colors hover:border-coral/30 hover:text-coral active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Remover ${person.name}`}
                            >
                              {isDeleting ===
                              personId ? (
                                <Loader2
                                  size={
                                    14
                                  }
                                  className="animate-spin text-coral"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Trash2
                                  size={
                                    14
                                  }
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          )}
                        </>
                      }
                    >
                      <div className="flex min-w-0 items-baseline gap-2">
                        <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                          {
                            person.name
                          }
                        </h3>

                        {isActive && (
                          <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full border border-ice/20 bg-ice/15 px-2 py-0.5 text-[9px] font-bold uppercase text-ice">
                            <CheckCircle
                              size={
                                10
                              }
                              aria-hidden="true"
                            />
                            Ativa
                          </span>
                        )}
                      </div>

                      <div className="mt-1 space-y-1">
                        {person.email && (
                          <p className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
                            <Mail
                              size={
                                12
                              }
                              strokeWidth={
                                1.8
                              }
                              className="shrink-0"
                              aria-hidden="true"
                            />

                            <span className="truncate">
                              {
                                person.email
                              }
                            </span>
                          </p>
                        )}

                        {person.phone && (
                          <p className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
                            <Phone
                              size={
                                12
                              }
                              strokeWidth={
                                1.8
                              }
                              className="shrink-0"
                              aria-hidden="true"
                            />

                            <span className="truncate">
                              {
                                person.phone
                              }
                            </span>
                          </p>
                        )}

                        {!person.email &&
                          !person.phone && (
                            <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                              <User
                                size={
                                  12
                                }
                                strokeWidth={
                                  1.8
                                }
                                className="shrink-0"
                                aria-hidden="true"
                              />

                              <span>
                                Sem informações adicionais
                              </span>
                            </p>
                          )}
                      </div>
                    </ListCard>
                  );
                }
              )}
            </div>
          )}
        </section>

        <ConfirmationModal
          isOpen={Boolean(
            showDeleteModal
          )}
          onClose={() => {
            if (
              !isDeleting
            ) {
              setShowDeleteModal(
                null
              );
            }
          }}
          onConfirm={
            confirmDelete
          }
          title="Remover pessoa"
          message={
            showDeleteModal
              ? `Tem certeza que deseja remover "${showDeleteModal.name}"? Os dados vinculados a esta pessoa também serão removidos localmente. A exclusão definitiva na nuvem será validada na auditoria de sincronização.`
              : ""
          }
          confirmLabel="Remover"
          cancelLabel="Cancelar"
          isLoading={
            isDeleting !== null
          }
          type="danger"
        />

        <ScrollToTop
          threshold={400}
        />
      </main>
    </PageTransition>
  );
}