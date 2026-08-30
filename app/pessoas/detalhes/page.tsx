// app/pessoas/detalhes/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  Activity,
  ArrowLeft,
  Brain,
  CheckCircle,
  ChevronRight,
  Edit3,
  FileText,
  Flame,
  FolderHeart,
  HeartPulse,
  Mail,
  Pill,
  Plus,
  ShieldAlert,
  Star,
  Stethoscope,
  Trash2,
  User,
  Users,
} from "lucide-react";

import {
  db,
} from "@/lib/db";

import {
  personsRepository,
} from "@/lib/repositories/persons";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useMounted,
} from "@/hooks/useMounted";

import {
  useToast,
} from "@/components/ToastProvider";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  DetailSkeleton,
} from "@/components/loading/DetailSkeleton";

import {
  ConfirmationModal,
} from "@/components/ConfirmationModal";

import {
  Button,
} from "@/components/ui/Button";

import {
  DetailInfoRow,
  SectionTitle,
  StatCard,
} from "@/components/detail/DetailComponents";

import type {
  Person,
} from "@/lib/types";

// ============================================================
// HELPERS
// ============================================================

function getTratamentoIcon(
  nome:
    string
) {
  const normalized =
    (
      nome ||
      ""
    ).toLowerCase();

  if (
    normalized.includes(
      "tdah"
    )
  ) {
    return Brain;
  }

  if (
    normalized.includes(
      "dor"
    ) ||
    normalized.includes(
      "neuropática"
    )
  ) {
    return Flame;
  }

  if (
    normalized.includes(
      "depress"
    )
  ) {
    return HeartPulse;
  }

  if (
    normalized.includes(
      "ansied"
    ) ||
    normalized.includes(
      "ansiolítico"
    )
  ) {
    return ShieldAlert;
  }

  return Activity;
}

function getStatusColor(
  status:
    string
) {
  switch (
    status
  ) {
    case "ativo":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";

    case "concluido":
      return "text-ice bg-ice/10 border-ice/20";

    case "suspenso":
      return "text-coral bg-coral/10 border-coral/20";

    default:
      return "text-ink-muted bg-surface-border/20 border-surface-border/30";
  }
}

function getStatusLabel(
  status:
    string
) {
  switch (
    status
  ) {
    case "ativo":
      return "Em andamento";

    case "concluido":
      return "Concluído";

    case "suspenso":
      return "Suspenso";

    default:
      return status;
  }
}

// ============================================================
// PAGE
// ============================================================

export default function PessoaDetalhesPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get(
      "id"
    );

  const mounted =
    useMounted();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    showToast,
  } =
    useToast();

  const {
    activePersonId,
    changePerson,
  } =
    useActivePersonId();

  const [
    person,
    setPerson,
  ] =
    useState<
      Person | null | undefined
    >(
      undefined
    );

  const [
    showDefaultModal,
    setShowDefaultModal,
  ] =
    useState(
      false
    );

  const [
    isSettingDefault,
    setIsSettingDefault,
  ] =
    useState(
      false
    );

  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(
      false
    );

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] =
    useState(
      false
    );

  const [
    isMenuFlutuanteOpen,
    setIsMenuFlutuanteOpen,
  ] =
    useState(
      false
    );

  const isActive =
    Boolean(
      id &&
        activePersonId ===
          id
    );

  // ==========================================================
  // VALIDAR / CARREGAR PESSOA
  // ==========================================================

  useEffect(
    () => {
      let cancelled =
        false;

      const loadPerson =
        async () => {
          if (
            !id
          ) {
            if (
              !cancelled
            ) {
              setPerson(
                null
              );

              router.replace(
                "/pessoas"
              );
            }

            return;
          }

          try {
            const result =
              await personsRepository.getById(
                id
              );

            if (
              !cancelled
            ) {
              setPerson(
                result
              );
            }
          } catch (
            error
          ) {
            console.error(
              "Erro ao carregar pessoa:",
              error
            );

            if (
              !cancelled
            ) {
              setPerson(
                null
              );
            }
          }
        };

      void loadPerson();

      return () => {
        cancelled =
          true;
      };
    },
    [
      id,
      router,
    ]
  );

  const validatedPersonId =
    person?.id ||
    null;

  // ==========================================================
  // DADOS RELACIONADOS
  // ==========================================================

  const documentos =
    useLiveQuery(
      async () => {
        if (
          !validatedPersonId
        ) {
          return [];
        }

        return db.documents
          .where(
            "person_id"
          )
          .equals(
            validatedPersonId
          )
          .toArray();
      },
      [
        validatedPersonId,
      ],
      []
    );

  const medicamentos =
    useLiveQuery(
      async () => {
        if (
          !validatedPersonId
        ) {
          return [];
        }

        return db.medicamentos
          .where(
            "person_id"
          )
          .equals(
            validatedPersonId
          )
          .toArray();
      },
      [
        validatedPersonId,
      ],
      []
    );

  const consultas =
    useLiveQuery(
      async () => {
        if (
          !validatedPersonId
        ) {
          return [];
        }

        return db.consultas
          .where(
            "person_id"
          )
          .equals(
            validatedPersonId
          )
          .toArray();
      },
      [
        validatedPersonId,
      ],
      []
    );

  const exames =
    useLiveQuery(
      async () => {
        if (
          !validatedPersonId
        ) {
          return [];
        }

        return db.exames
          .where(
            "person_id"
          )
          .equals(
            validatedPersonId
          )
          .toArray();
      },
      [
        validatedPersonId,
      ],
      []
    );

  const cirurgias =
    useLiveQuery(
      async () => {
        if (
          !validatedPersonId
        ) {
          return [];
        }

        return db.cirurgias
          .where(
            "person_id"
          )
          .equals(
            validatedPersonId
          )
          .toArray();
      },
      [
        validatedPersonId,
      ],
      []
    );

  const tratamentos =
    useLiveQuery(
      async () => {
        if (
          !validatedPersonId
        ) {
          return [];
        }

        return db.tratamentos
          .where(
            "person_id"
          )
          .equals(
            validatedPersonId
          )
          .toArray();
      },
      [
        validatedPersonId,
      ],
      []
    );

  const cids =
    useLiveQuery(
      async () => {
        if (
          !validatedPersonId
        ) {
          return [];
        }

        return db.cids
          .where(
            "person_id"
          )
          .equals(
            validatedPersonId
          )
          .toArray();
      },
      [
        validatedPersonId,
      ],
      []
    );

  // ==========================================================
  // DERIVED
  // ==========================================================

  const medicamentosAtivos =
    useMemo(
      () =>
        medicamentos.filter(
          (
            medicamento
          ) =>
            medicamento.status !==
            "descontinuado"
        ),
      [
        medicamentos,
      ]
    );

  const consultasFuturas =
    useMemo(
      () => {
        const today =
          new Date()
            .toISOString()
            .slice(
              0,
              10
            );

        return consultas.filter(
          (
            consulta
          ) =>
            consulta.data >=
            today
        );
      },
      [
        consultas,
      ]
    );

  const examesPendentes =
    useMemo(
      () => {
        const now =
          new Date();

        return exames.filter(
          (
            exame
          ) =>
            Boolean(
              exame.data_retorno
            ) &&
            new Date(
              exame.data_retorno!
            ) >=
              now
        );
      },
      [
        exames,
      ]
    );

  const tratamentosAtivos =
    useMemo(
      () =>
        tratamentos.filter(
          (
            tratamento
          ) =>
            tratamento.status ===
            "ativo"
        ),
      [
        tratamentos,
      ]
    );

  // ==========================================================
  // DEFAULT
  // ==========================================================

  const handleSetDefault =
    async () => {
      if (
        !id ||
        !person ||
        isSettingDefault
      ) {
        return;
      }

      setIsSettingDefault(
        true
      );

      try {
        await changePerson(
          id
        );

        setShowDefaultModal(
          false
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao definir pessoa ativa:",
          error
        );
      } finally {
        setIsSettingDefault(
          false
        );
      }
    };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    async () => {
      if (
        !id ||
        !person ||
        isDeleting
      ) {
        return;
      }

      if (
        isActive
      ) {
        setShowDeleteModal(
          false
        );

        trigger(
          "error"
        );

        showToast(
          "A pessoa ativa não pode ser removida. Selecione outra pessoa primeiro.",
          "error"
        );

        return;
      }

      setIsDeleting(
        true
      );

      trigger(
        "vibrate"
      );

      try {
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

        trigger(
          "success"
        );

        showToast(
          `${person.name} removido(a) com sucesso.`,
          "success"
        );

        router.replace(
          "/pessoas"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao remover pessoa:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          error instanceof
            Error
            ? error.message
            : "Erro ao remover pessoa.",
          "error"
        );
      } finally {
        setIsDeleting(
          false
        );

        setShowDeleteModal(
          false
        );
      }
    };

  // ==========================================================
  // MENU
  // ==========================================================

  const menuOptions =
    useMemo(
      () => [
        {
          id:
            "adicionar-documento",

          label:
            "Adicionar Documento",

          icon:
            FileText,

          path:
            "/documentos/novo",
        },

        {
          id:
            "adicionar-medicamento",

          label:
            "Adicionar Medicamento",

          icon:
            Pill,

          path:
            `/saude/medicamentos/novo?person_id=${id}`,
        },

        {
          id:
            "adicionar-consulta",

          label:
            "Adicionar Consulta",

          icon:
            Stethoscope,

          path:
            `/saude/consultas/nova?person_id=${id}`,
        },

        {
          id:
            "adicionar-exame",

          label:
            "Adicionar Exame",

          icon:
            Activity,

          path:
            `/saude/exames/novo?person_id=${id}`,
        },

        {
          id:
            "editar-pessoa",

          label:
            "Editar Pessoa",

          icon:
            Edit3,

          path:
            `/pessoas/editar?id=${id}`,
        },
      ],
      [
        id,
      ]
    );

  const handleMenuOptionClick =
    async (
      optionId:
        string,
      path:
        string
    ) => {
      trigger(
        "vibrate"
      );

      setIsMenuFlutuanteOpen(
        false
      );

      try {
        /*
         * O novo fluxo de Documentos Pessoais não aceita
         * person_id pela URL.
         *
         * Ele sempre cria para a pessoa ativa.
         *
         * Portanto, ao adicionar um documento pela tela de
         * uma pessoa que não está ativa, tornamos primeiro
         * essa pessoa ativa pelo fluxo oficial.
         */
        if (
          optionId ===
            "adicionar-documento" &&
          id &&
          activePersonId !==
            id
        ) {
          await changePerson(
            id
          );
        }

        router.push(
          path
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao abrir opção do menu:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          error instanceof
            Error
            ? error.message
            : "Não foi possível abrir esta opção.",
          "error"
        );
      }
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    !mounted ||
    person ===
      undefined
  ) {
    return (
      <PageTransition>
        <DetailSkeleton />
      </PageTransition>
    );
  }

  // ==========================================================
  // NOT FOUND / ACCESS DENIED
  // ==========================================================

  if (
    !person
  ) {
    return (
      <PageTransition>
        <main className="flex min-h-[100dvh] items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-5 py-8 text-center shadow-sm">
            <Users
              size={
                28
              }
              className="mx-auto text-ink-muted"
              aria-hidden="true"
            />

            <h2 className="mt-4 font-display text-lg font-semibold text-ink-primary">
              Pessoa não encontrada
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Esta pessoa não existe ou não pertence à sua conta.
            </p>

            <Button
              type="button"
              variant="secondary"
              onClick={
                () =>
                  router.replace(
                    "/pessoas"
                  )
              }
              className="mt-5"
            >
              Voltar
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    router.back();
                  }
                }
                aria-label="Voltar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft
                  size={
                    18
                  }
                  className="text-ink-primary"
                  aria-hidden="true"
                />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>

                <h1 className="mt-1 truncate font-display text-xl font-semibold text-ink-primary">
                  {
                    person.name
                  }
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setIsMenuFlutuanteOpen(
                        (
                          current
                        ) =>
                          !current
                      );
                    }
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
                  aria-label="Adicionar registro"
                >
                  <Plus
                    size={
                      18
                    }
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence>
                  {isMenuFlutuanteOpen && (
                    <>
                      <motion.button
                        type="button"
                        aria-label="Fechar menu"
                        initial={{
                          opacity: 0,
                        }}
                        animate={{
                          opacity: 1,
                        }}
                        exit={{
                          opacity: 0,
                        }}
                        transition={{
                          duration:
                            0.16,
                        }}
                        onClick={
                          () =>
                            setIsMenuFlutuanteOpen(
                              false
                            )
                        }
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                      />

                      <motion.div
                        initial={{
                          opacity: 0,
                          y: 10,
                          scale:
                            0.95,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                        }}
                        exit={{
                          opacity: 0,
                          y: 10,
                          scale:
                            0.95,
                        }}
                        transition={{
                          duration:
                            0.18,

                          ease: [
                            0.16,
                            1,
                            0.3,
                            1,
                          ],
                        }}
                        className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface shadow-2xl"
                      >
                        <div className="px-3 pb-2 pt-3.5">
                          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                            Adicionar
                          </p>
                        </div>

                        <div className="px-1.5 pb-2">
                          {menuOptions.map(
                            (
                              option
                            ) => {
                              const Icon =
                                option.icon;

                              return (
                                <button
                                  key={
                                    option.id
                                  }
                                  type="button"
                                  onClick={
                                    () =>
                                      void handleMenuOptionClick(
                                        option.id,
                                        option.path
                                      )
                                  }
                                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                    <Icon
                                      size={
                                        15
                                      }
                                      aria-hidden="true"
                                    />
                                  </div>

                                  <span className="text-sm font-medium text-ink-primary">
                                    {
                                      option.label
                                    }
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {!isActive && (
                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setShowDefaultModal(
                        true
                      );
                    }
                  }
                  className="flex h-10 items-center gap-1.5 rounded-full border border-ice/20 bg-ice/10 px-3.5 py-2 text-xs font-semibold text-ice transition-all active:scale-95 hover:bg-ice/20"
                >
                  <Star
                    size={
                      14
                    }
                    aria-hidden="true"
                  />

                  Definir ativa
                </button>
              )}

              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    router.push(
                      `/pessoas/editar?id=${id}`
                    );
                  }
                }
                aria-label="Editar pessoa"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
              >
                <Edit3
                  size={
                    18
                  }
                  aria-hidden="true"
                />
              </button>

              {!isActive && (
                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setShowDeleteModal(
                        true
                      );
                    }
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95 hover:bg-coral/20"
                  aria-label="Excluir pessoa"
                >
                  <Trash2
                    size={
                      18
                    }
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>
          </div>
        </header>

        <section className="space-y-6 px-5 pt-6">
          <motion.div
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration:
                0.28,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    router.push(
                      `/pessoas/editar?id=${id}`
                    );
                  }
                }
                className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 object-cover"
                style={{
                  borderColor:
                    `${
                      person.color ||
                      "#38BDF8"
                    }55`,
                }}
                aria-label="Editar foto da pessoa"
              >
                {person.avatar_url ? (
                  <img
                    src={
                      person.avatar_url
                    }
                    alt={
                      person.name
                    }
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User
                    size={
                      36
                    }
                    style={{
                      color:
                        person.color ||
                        "#38BDF8",
                    }}
                    aria-hidden="true"
                  />
                )}

                <div className="absolute bottom-0 right-0 rounded-full border border-surface-border bg-void/80 p-0.5">
                  <div className="rounded-full bg-ice/20 p-0.5">
                    <Edit3
                      size={
                        12
                      }
                      className="text-ice"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-display text-2xl font-bold text-ink-primary">
                    {
                      person.name
                    }
                  </h2>

                  {isActive && (
                    <span className="flex items-center gap-0.5 rounded-full border border-ice/20 bg-ice/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-ice">
                      <CheckCircle
                        size={
                          12
                        }
                        aria-hidden="true"
                      />

                      Ativa
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-1.5">
                  {person.email && (
                    <DetailInfoRow
                      icon={
                        <Mail
                          size={
                            14
                          }
                        />
                      }
                      label="E-mail"
                    >
                      {
                        person.email
                      }
                    </DetailInfoRow>
                  )}

                  {person.phone && (
                    <DetailInfoRow
                      icon={
                        <Stethoscope
                          size={
                            14
                          }
                        />
                      }
                      label="Telefone"
                    >
                      {
                        person.phone
                      }
                    </DetailInfoRow>
                  )}

                  {!person.email &&
                    !person.phone && (
                      <p className="text-sm text-ink-faint">
                        Sem informações de contato
                      </p>
                    )}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={
                <FileText
                  size={
                    20
                  }
                />
              }
              label="Documentos"
              value={`${documentos.length}`}
            />

            <StatCard
              icon={
                <Pill
                  size={
                    20
                  }
                />
              }
              label="Ativos"
              value={`${medicamentosAtivos.length}`}
              description="Medicamentos"
            />

            <StatCard
              icon={
                <FolderHeart
                  size={
                    20
                  }
                />
              }
              label="Tratamentos"
              value={`${tratamentos.length}`}
            />
          </div>

          {tratamentosAtivos.length >
            0 && (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration:
                  0.24,

                delay:
                  0.1,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <FolderHeart
                    size={
                      15
                    }
                  />
                }
                title="Tratamentos em andamento"
              />

              <div className="space-y-2">
                {tratamentosAtivos
                  .slice(
                    0,
                    3
                  )
                  .map(
                    (
                      tratamento
                    ) => {
                      const Icon =
                        getTratamentoIcon(
                          tratamento.nome
                        );

                      const cor =
                        tratamento.cor ||
                        "#8B5CF6";

                      return (
                        <button
                          key={
                            tratamento.id
                          }
                          type="button"
                          onClick={
                            () =>
                              router.push(
                                `/saude/tratamentos/detalhes?id=${tratamento.id}`
                              )
                          }
                          className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left transition-all active:scale-[0.98]"
                          style={{
                            borderLeft:
                              `4px solid ${cor}`,
                          }}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                              style={{
                                backgroundColor:
                                  `${cor}20`,

                                color:
                                  cor,
                              }}
                            >
                              <Icon
                                size={
                                  16
                                }
                                aria-hidden="true"
                              />
                            </div>

                            <span className="truncate text-sm font-medium text-ink-primary">
                              {
                                tratamento.nome
                              }
                            </span>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${getStatusColor(
                              tratamento.status
                            )}`}
                          >
                            {getStatusLabel(
                              tratamento.status
                            )}
                          </span>
                        </button>
                      );
                    }
                  )}

                {tratamentosAtivos.length >
                  3 && (
                  <button
                    type="button"
                    onClick={
                      () =>
                        router.push(
                          "/saude/tratamentos"
                        )
                    }
                    className="ml-1 mt-1 flex items-center gap-1 text-xs font-medium text-ice"
                  >
                    Ver todos (
                    {
                      tratamentosAtivos.length
                    }
                    )

                    <ChevronRight
                      size={
                        14
                      }
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {cids.length >
            0 && (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration:
                  0.24,

                delay:
                  0.12,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <FileText
                    size={
                      15
                    }
                  />
                }
                title="Diagnósticos (CIDs)"
              />

              <div className="flex flex-wrap gap-2">
                {cids
                  .slice(
                    0,
                    5
                  )
                  .map(
                    (
                      cid
                    ) => (
                      <span
                        key={
                          cid.id
                        }
                        className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-300"
                      >
                        {
                          cid.codigo
                        }{" "}
                        -{" "}
                        {
                          cid.descricao
                        }
                      </span>
                    )
                  )}

                {cids.length >
                  5 && (
                  <span className="text-xs text-ink-muted">
                    +
                    {cids.length -
                      5}{" "}
                    outros
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {documentos.length >
            0 && (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration:
                  0.24,

                delay:
                  0.14,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <FileText
                    size={
                      15
                    }
                  />
                }
                title="Últimos documentos"
              />

              <div className="space-y-2">
                {documentos
                  .slice(
                    0,
                    3
                  )
                  .map(
                    (
                      doc
                    ) => (
                      <button
                        key={
                          doc.id
                        }
                        type="button"
                        onClick={
                          () => {
                            if (
                              !doc.id
                            ) {
                              return;
                            }

                            router.push(
                              `/documentos/detalhes?id=${encodeURIComponent(
                                doc.id
                              )}`
                            );
                          }
                        }
                        className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left transition-all active:scale-[0.98]"
                      >
                        <span className="truncate text-sm font-medium text-ink-primary">
                          {
                            doc.title
                          }
                        </span>

                        <ChevronRight
                          size={
                            16
                          }
                          className="shrink-0 text-ink-faint"
                          aria-hidden="true"
                        />
                      </button>
                    )
                  )}
              </div>
            </motion.div>
          )}

          {consultasFuturas.length >
            0 && (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration:
                  0.24,

                delay:
                  0.16,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <Stethoscope
                    size={
                      15
                    }
                  />
                }
                title="Próximas consultas"
              />

              <div className="space-y-2">
                {consultasFuturas
                  .slice(
                    0,
                    3
                  )
                  .map(
                    (
                      consulta
                    ) => (
                      <button
                        key={
                          consulta.id
                        }
                        type="button"
                        onClick={
                          () =>
                            router.push(
                              `/saude/consultas/detalhes?id=${consulta.id}`
                            )
                        }
                        className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left transition-all active:scale-[0.98]"
                      >
                        <div className="min-w-0">
                          <span className="truncate text-sm font-medium text-ink-primary">
                            {
                              consulta.especialidade
                            }
                          </span>

                          <p className="truncate text-xs text-ink-muted">
                            Dr(a).{" "}
                            {
                              consulta.medico
                            }
                          </p>
                        </div>

                        <span className="shrink-0 font-mono text-xs font-bold text-ice">
                          {new Date(
                            consulta.data
                          ).toLocaleDateString(
                            "pt-BR",
                            {
                              day:
                                "2-digit",

                              month:
                                "short",
                            }
                          )}
                        </span>
                      </button>
                    )
                  )}
              </div>
            </motion.div>
          )}

          {examesPendentes.length >
            0 && (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration:
                  0.24,

                delay:
                  0.18,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <Activity
                    size={
                      15
                    }
                  />
                }
                title="Exames pendentes"
              />

              <div className="space-y-2">
                {examesPendentes
                  .slice(
                    0,
                    3
                  )
                  .map(
                    (
                      exame
                    ) => (
                      <button
                        key={
                          exame.id
                        }
                        type="button"
                        onClick={
                          () =>
                            router.push(
                              `/saude/exames/detalhes?id=${exame.id}`
                            )
                        }
                        className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left transition-all active:scale-[0.98]"
                      >
                        <span className="truncate text-sm font-medium text-ink-primary">
                          {
                            exame.nome
                          }
                        </span>

                        <span className="shrink-0 font-mono text-xs font-bold text-coral">
                          {exame.data_retorno
                            ? new Date(
                                exame.data_retorno
                              ).toLocaleDateString(
                                "pt-BR",
                                {
                                  day:
                                    "2-digit",

                                  month:
                                    "short",
                                }
                              )
                            : "Sem prazo"}
                        </span>
                      </button>
                    )
                  )}
              </div>
            </motion.div>
          )}

          {!documentos.length &&
            !medicamentos.length &&
            !consultas.length &&
            !exames.length &&
            !cirurgias.length &&
            !tratamentos.length &&
            !cids.length && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration:
                    0.24,

                  delay:
                    0.2,
                }}
                className="rounded-[24px] border border-dashed border-surface-border/50 bg-surface/30 p-8 text-center"
              >
                <Users
                  size={
                    28
                  }
                  className="mx-auto text-ink-faint"
                  aria-hidden="true"
                />

                <p className="mt-3 text-sm text-ink-muted">
                  Nenhum dado vinculado a esta pessoa ainda.
                </p>

                <p className="text-xs text-ink-faint">
                  Comece cadastrando documentos, medicamentos ou consultas.
                </p>
              </motion.div>
            )}
        </section>

        <ConfirmationModal
          isOpen={
            showDefaultModal
          }
          onClose={
            () => {
              if (
                !isSettingDefault
              ) {
                setShowDefaultModal(
                  false
                );
              }
            }
          }
          onConfirm={
            handleSetDefault
          }
          title="Definir pessoa ativa"
          message={`Definir "${person.name}" como a pessoa ativa? O aplicativo passará a usar esta pessoa como referência para os dados filtrados.`}
          confirmLabel="Definir"
          cancelLabel="Cancelar"
          isLoading={
            isSettingDefault
          }
          type="info"
        />

        <ConfirmationModal
          isOpen={
            showDeleteModal
          }
          onClose={
            () => {
              if (
                !isDeleting
              ) {
                setShowDeleteModal(
                  false
                );
              }
            }
          }
          onConfirm={
            handleDelete
          }
          title="Remover pessoa"
          message={`Tem certeza que deseja remover "${person.name}"? Os dados vinculados serão removidos localmente. A cascata definitiva na nuvem será validada durante a auditoria de sincronização da área de Saúde.`}
          confirmLabel="Remover"
          cancelLabel="Cancelar"
          isLoading={
            isDeleting
          }
          type="danger"
        />
      </main>
    </PageTransition>
  );
}