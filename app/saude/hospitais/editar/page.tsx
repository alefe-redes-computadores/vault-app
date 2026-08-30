// app/saude/hospitais/editar/page.tsx
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  motion,
} from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Building2,
  Calendar,
  Eraser,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Stethoscope,
  Trash2,
  User,
  X,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useHospitais,
} from "@/hooks/useHospitais";
import {
  useMedicos,
} from "@/hooks/useMedicos";
import {
  useConsultas,
} from "@/hooks/useConsultas";
import {
  useCirurgias,
} from "@/hooks/useCirurgias";
import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";
import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";

import {
  Button,
} from "@/components/ui/Button";
import {
  Input,
} from "@/components/ui/Input";
import {
  TextArea,
} from "@/components/ui/TextArea";
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
  SelectionModal,
} from "@/components/SelectionModal";

import type {
  Cirurgia,
  Consulta,
  Medico,
} from "@/lib/types";

// ============================================================
// ANIMATION
// ============================================================

const fadeUp = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
};

// ============================================================
// HELPERS
// ============================================================

function formatPhone(
  value: string
): string {
  const clean =
    value
      .replace(/\D/g, "")
      .slice(0, 11);

  if (
    clean.length <= 2
  ) {
    return clean;
  }

  if (
    clean.length <= 6
  ) {
    return `(${clean.slice(
      0,
      2
    )}) ${clean.slice(2)}`;
  }

  if (
    clean.length <= 10
  ) {
    return `(${clean.slice(
      0,
      2
    )}) ${clean.slice(
      2,
      6
    )}-${clean.slice(6)}`;
  }

  return `(${clean.slice(
    0,
    2
  )}) ${clean.slice(
    2,
    7
  )}-${clean.slice(7)}`;
}

function formatDateDisplay(
  isoStr?: string
): string {
  if (!isoStr) {
    return "";
  }

  const datePart =
    isoStr.includes("T")
      ? isoStr.split("T")[0]
      : isoStr;

  const parts =
    datePart.split("-");

  if (
    parts.length !== 3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ============================================================
// CONTENT
// ============================================================

function EditarHospitalContent() {
  const {
    trigger,
  } =
    useHapticFeedback();

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get("id") ||
    "";

  const {
    activePersonId,
  } =
    useActivePersonId();

  /*
   * Hospital e Médicos são globais.
   */
  const {
    getHospital,
    updateHospital,
    deleteHospitalSafe,
  } =
    useHospitais();

  const {
    medicos = [],
  } =
    useMedicos();

  /*
   * Consultas e Cirurgias já vêm limitadas
   * à pessoa ativa.
   */
  const {
    consultas = [],
  } =
    useConsultas();

  const {
    cirurgias = [],
  } =
    useCirurgias();

  const saveAction =
    useSubmitAction();

  const deleteAction =
    useSubmitAction();

  const isSubmitLocked =
    useRef(false);

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    notFound,
    setNotFound,
  ] =
    useState(false);

  const [
    nome,
    setNome,
  ] =
    useState("");

  const [
    endereco,
    setEndereco,
  ] =
    useState("");

  const [
    telefone,
    setTelefone,
  ] =
    useState("");

  const [
    observacoes,
    setObservacoes,
  ] =
    useState("");

  const [
    medicoIds,
    setMedicoIds,
  ] =
    useState<string[]>([]);

  const [
    errors,
    setErrors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    isMedModalOpen,
    setIsMedModalOpen,
  ] =
    useState(false);

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] =
    useState(false);

  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    let cancelled =
      false;

    const load =
      async () => {
        setIsLoading(true);

        try {
          /*
           * Hospital é global.
           * Nenhuma validação por person_id.
           */
          const item =
            await getHospital(
              id
            );

          if (cancelled) {
            return;
          }

          if (!item) {
            setNotFound(true);
            return;
          }

          setNome(
            item.nome ||
              ""
          );

          setEndereco(
            item.endereco ||
              ""
          );

          setTelefone(
            item.telefone ||
              ""
          );

          setObservacoes(
            item.observacoes ||
              ""
          );

          /*
           * Médico também é global.
           */
          setMedicoIds(
            Array.from(
              new Set(
                item.medico_ids ||
                  []
              )
            )
          );

          /*
           * NÃO carregamos item.tratamento_ids.
           *
           * Hospital global não deve armazenar
           * vínculos diretos com Tratamentos
           * person-scoped.
           */
        } catch (error) {
          console.error(
            "Erro ao carregar hospital:",
            error
          );

          if (!cancelled) {
            setNotFound(true);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

    void load();

    return () => {
      cancelled =
        true;
    };
  }, [
    id,
    getHospital,
  ]);

  // ==========================================================
  // GLOBAL MEDICAL TEAM
  // ==========================================================

  const medicosVinculados =
    useMemo(() => {
      const selected =
        new Set(
          medicoIds
        );

      return medicos.filter(
        (
          medico
        ) =>
          Boolean(
            medico.id &&
              selected.has(
                medico.id
              )
          )
      );
    }, [
      medicos,
      medicoIds,
    ]);

  const medicosDisponiveis =
    useMemo(() => {
      const selected =
        new Set(
          medicoIds
        );

      return medicos.filter(
        (
          medico
        ) =>
          Boolean(
            medico.id &&
              !selected.has(
                medico.id
              )
          )
      );
    }, [
      medicos,
      medicoIds,
    ]);

  // ==========================================================
  // PERSON-SCOPED HISTORY
  // ==========================================================

  const consultasVinculadas =
    useMemo(() => {
      if (!id) {
        return [];
      }

      return consultas
        .filter(
          (
            consulta:
              Consulta
          ) =>
            consulta.hospital_id ===
            id
        )
        .sort(
          (
            first,
            second
          ) =>
            (
              second.data ||
              ""
            ).localeCompare(
              first.data ||
                ""
            )
        );
    }, [
      consultas,
      id,
    ]);

  const cirurgiasVinculadas =
    useMemo(() => {
      if (!id) {
        return [];
      }

      return cirurgias
        .filter(
          (
            cirurgia:
              Cirurgia
          ) =>
            cirurgia.hospital_id ===
            id
        )
        .sort(
          (
            first,
            second
          ) =>
            (
              second.data ||
              ""
            ).localeCompare(
              first.data ||
                ""
            )
        );
    }, [
      cirurgias,
      id,
    ]);

  const medicoIdsHistorico =
    useMemo(() => {
      const ids =
        new Set<string>();

      consultasVinculadas.forEach(
        (
          consulta
        ) => {
          if (
            consulta.medico_id
          ) {
            ids.add(
              consulta.medico_id
            );
          }
        }
      );

      return ids;
    }, [
      consultasVinculadas,
    ]);

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const clearError =
    (
      key: string
    ) => {
      setErrors(
        (
          previous
        ) => {
          if (
            !previous[key]
          ) {
            return previous;
          }

          const next = {
            ...previous,
          };

          delete next[key];

          return next;
        }
      );
    };

  const validate =
    () => {
      const newErrors:
        Record<
          string,
          string
        > =
        {};

      if (
        !nome.trim()
      ) {
        newErrors.nome =
          "Nome é obrigatório";
      }

      setErrors(
        newErrors
      );

      return (
        Object.keys(
          newErrors
        ).length ===
        0
      );
    };

  // ==========================================================
  // MEDICAL TEAM ACTIONS
  // ==========================================================

  const handleAddMedico =
    (
      medico:
        Medico
    ) => {
      if (
        !medico.id
      ) {
        return;
      }

      setMedicoIds(
        (
          previous
        ) =>
          previous.includes(
            medico.id!
          )
            ? previous
            : [
                ...previous,
                medico.id!,
              ]
      );

      setIsMedModalOpen(
        false
      );
    };

  const handleRemoveMedico =
    (
      medicoId:
        string
    ) => {
      trigger(
        "vibrate"
      );

      setMedicoIds(
        (
          previous
        ) =>
          previous.filter(
            (
              current
            ) =>
              current !==
              medicoId
          )
      );
    };

  // ==========================================================
  // SAVE
  // ==========================================================

  const handleSubmit =
    async () => {
      trigger(
        "vibrate"
      );

      if (
        !validate()
      ) {
        trigger(
          "error"
        );

        return;
      }

      if (
        !id ||
        isSubmitLocked.current ||
        saveAction.isSubmitting
      ) {
        return;
      }

      isSubmitLocked.current =
        true;

      try {
        await saveAction.run(
          async () => {
            /*
             * Hospital permanece global.
             *
             * Sem:
             * - person_id
             * - tratamento_ids
             *
             * medico_ids permanece por ser
             * relação global <-> global.
             */
            await updateHospital(
              id,
              {
                nome:
                  nome.trim(),

                endereco:
                  endereco.trim() ||
                  undefined,

                telefone:
                  telefone.trim() ||
                  undefined,

                observacoes:
                  observacoes.trim() ||
                  undefined,

                medico_ids:
                  Array.from(
                    new Set(
                      medicoIds
                    )
                  ),

                /*
                 * O módulo atual representa Hospital estrito.
                 *
                 * Mantemos o registro como hospital quando
                 * editado por esta interface.
                 */
                tipo:
                  "hospital",
              }
            );
          },
          {
            successMessage:
              "Hospital atualizado com sucesso",

            errorMessage:
              "Erro ao atualizar hospital",

            goBackOnSuccess:
              false,
          }
        );

        router.replace(
          `/saude/hospitais/detalhes?id=${id}`
        );
      } finally {
        isSubmitLocked.current =
          false;
      }
    };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    () => {
      if (!id) {
        return;
      }

      trigger(
        "vibrate"
      );

      deleteAction.run(
        async () => {
          /*
           * Cleanup GLOBAL:
           *
           * - exclui Hospital;
           * - remove hospital_id dos registros relacionados
           *   de todas as pessoas;
           * - preserva os registros clínicos.
           */
          await deleteHospitalSafe(
            id
          );

          router.replace(
            "/saude/hospitais"
          );
        },
        {
          successMessage:
            "Hospital excluído com sucesso",

          errorMessage:
            "Erro ao excluir hospital",

          goBackOnSuccess:
            false,
        }
      );

      setShowDeleteModal(
        false
      );
    };

  // ==========================================================
  // LOADING / NOT FOUND
  // ==========================================================

  if (isLoading) {
    return (
      <DetailSkeleton />
    );
  }

  if (notFound) {
    return (
      <PageTransition>
        <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void px-6 text-center">
          <Building2
            size={28}
            className="mb-4 text-ice"
          />

          <p className="font-display text-lg font-semibold text-ink-primary">
            Hospital não encontrado
          </p>

          <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
            Este cadastro pode ter sido removido ou não está mais disponível.
          </p>

          <button
            type="button"
            onClick={() =>
              router.replace(
                "/saude/hospitais"
              )
            }
            className="mt-5 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
          >
            Voltar para hospitais
          </button>
        </main>
      </PageTransition>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Building2
                  size={16}
                  className="text-ice"
                />

                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">
                  Entidade global
                </p>
              </div>

              <h1 className="mt-1 truncate font-display text-xl font-semibold text-ink-primary">
                {nome ||
                  "Editar hospital"}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setShowDeleteModal(
                  true
                );
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
              aria-label="Excluir hospital"
            >
              <Trash2
                size={16}
              />
            </button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          {/* ==================================================
              UNIT DATA
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Dados da unidade
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-ink-faint">
                Este cadastro é global no Vault. Alterações aqui afetam a mesma unidade utilizada pelos registros de todas as pessoas.
              </p>
            </div>

            <Input
              label="Nome *"
              placeholder="Ex: Hospital Regional..."
              value={
                nome
              }
              onChange={(
                event
              ) => {
                setNome(
                  event.target.value
                );

                clearError(
                  "nome"
                );
              }}
              error={
                errors.nome
              }
              required
            />

            <Input
              label="Endereço"
              placeholder="Rua, número, bairro"
              value={
                endereco
              }
              onChange={(
                event
              ) =>
                setEndereco(
                  event.target.value
                )
              }
            />

            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={
                telefone
              }
              onChange={(
                event
              ) =>
                setTelefone(
                  formatPhone(
                    event
                      .target
                      .value
                  )
                )
              }
            />

            <TextArea
              label="Observações"
              placeholder="Horários, contatos úteis, referência da unidade..."
              value={
                observacoes
              }
              onChange={(
                event
              ) =>
                setObservacoes(
                  event.target.value
                )
              }
            />
          </motion.div>

          {/* ==================================================
              GLOBAL MEDICAL TEAM
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.05,
            }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <Stethoscope
                    size={14}
                    className="text-ice"
                  />

                  Corpo clínico (
                  {
                    medicoIds.length
                  }
                  )
                </h2>

                <p className="mt-1 text-[10px] leading-4 text-ink-faint">
                  Relação global do Hospital com os médicos cadastrados na unidade.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {medicoIds.length >
                  0 && (
                  <button
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setMedicoIds(
                        []
                      );
                    }}
                    className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-1 text-[10px] font-bold uppercase text-coral transition-all active:scale-95"
                  >
                    <Eraser
                      size={12}
                    />

                    Limpar
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    setIsMedModalOpen(
                      true
                    );
                  }}
                  className="flex items-center gap-1 rounded-full bg-ice/10 px-2.5 py-1 text-[10px] font-bold text-ice transition-all active:scale-95"
                >
                  <Plus
                    size={12}
                  />

                  Adicionar
                </button>
              </div>
            </div>

            {medicosVinculados.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum médico cadastrado diretamente no corpo clínico.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicosVinculados.map(
                  (
                    medico
                  ) => (
                    <div
                      key={
                        medico.id
                      }
                      className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !medico.id
                          ) {
                            return;
                          }

                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/medicos/detalhes?id=${medico.id}`
                          );
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                          <Stethoscope
                            size={15}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink-primary">
                            Dr(a).{" "}
                            {
                              medico.nome
                            }
                          </p>

                          {medico.especialidade && (
                            <p className="mt-0.5 truncate text-[10px] text-ink-muted">
                              {
                                medico.especialidade
                              }
                            </p>
                          )}

                          {medico.id &&
                            medicoIdsHistorico.has(
                              medico.id
                            ) && (
                              <p className="mt-0.5 text-[9px] font-medium text-emerald-400">
                                Já aparece no histórico da pessoa ativa
                              </p>
                            )}
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-2">
                        <ExternalLink
                          size={14}
                          className="text-ink-faint"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveMedico(
                              medico.id!
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted transition-colors hover:bg-coral/20 hover:text-coral"
                          aria-label={`Remover ${medico.nome}`}
                        >
                          <X
                            size={14}
                          />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              PERSON CONTEXT
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.08,
            }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="px-1">
              <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <User
                  size={14}
                  className="text-violet-400"
                />

                Histórico da pessoa ativa
              </h2>

              <p className="mt-1 text-[10px] leading-4 text-ink-faint">
                Estes dados são apenas contexto clínico e não pertencem ao cadastro global do Hospital.
              </p>
            </div>

            {!activePersonId ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Selecione uma pessoa para visualizar o histórico relacionado a esta unidade.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-surface-raised/60 p-3 text-center">
                    <p className="font-mono text-[9px] uppercase text-ink-faint">
                      Consultas
                    </p>

                    <p className="mt-1 text-lg font-semibold text-ink-primary">
                      {
                        consultasVinculadas.length
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl bg-surface-raised/60 p-3 text-center">
                    <p className="font-mono text-[9px] uppercase text-ink-faint">
                      Cirurgias
                    </p>

                    <p className="mt-1 text-lg font-semibold text-ink-primary">
                      {
                        cirurgiasVinculadas.length
                      }
                    </p>
                  </div>
                </div>

                {consultasVinculadas.length ===
                  0 &&
                cirurgiasVinculadas.length ===
                  0 ? (
                  <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                    <p className="text-xs text-ink-muted">
                      Nenhum atendimento da pessoa ativa está relacionado a este Hospital.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {consultasVinculadas
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
                            onClick={() => {
                              if (
                                !consulta.id
                              ) {
                                return;
                              }

                              trigger(
                                "vibrate"
                              );

                              router.push(
                                `/saude/consultas/detalhes?id=${consulta.id}`
                              );
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.98]"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                <Calendar
                                  size={14}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-ink-primary">
                                  {consulta.especialidade ||
                                    "Consulta"}
                                </p>

                                <p className="text-[10px] text-ink-muted">
                                  {formatDateDisplay(
                                    consulta.data
                                  )}
                                </p>
                              </div>
                            </div>

                            <ExternalLink
                              size={14}
                              className="shrink-0 text-ink-faint"
                            />
                          </button>
                        )
                      )}

                    {cirurgiasVinculadas
                      .slice(
                        0,
                        3
                      )
                      .map(
                        (
                          cirurgia
                        ) => (
                          <button
                            key={
                              cirurgia.id
                            }
                            type="button"
                            onClick={() => {
                              if (
                                !cirurgia.id
                              ) {
                                return;
                              }

                              trigger(
                                "vibrate"
                              );

                              router.push(
                                `/saude/cirurgias/detalhes?id=${cirurgia.id}`
                              );
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.98]"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
                                <Activity
                                  size={14}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-ink-primary">
                                  {cirurgia.procedimento ||
                                    "Cirurgia"}
                                </p>

                                <p className="text-[10px] text-ink-muted">
                                  {formatDateDisplay(
                                    cirurgia.data
                                  )}
                                </p>
                              </div>
                            </div>

                            <ExternalLink
                              size={14}
                              className="shrink-0 text-ink-faint"
                            />
                          </button>
                        )
                      )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </section>

        {/* ====================================================
            SAVE
            ==================================================== */}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={
              handleSubmit
            }
            disabled={
              saveAction.isSubmitting ||
              deleteAction.isSubmitting
            }
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {saveAction.isSubmitting ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />

                Salvando...
              </>
            ) : (
              <>
                <Save
                  size={16}
                />

                Salvar alterações
              </>
            )}
          </Button>
        </div>

        {/* ====================================================
            MEDICO MODAL
            ==================================================== */}

        <SelectionModal<Medico>
          isOpen={
            isMedModalOpen
          }
          onClose={() =>
            setIsMedModalOpen(
              false
            )
          }
          onSelect={
            handleAddMedico
          }
          items={
            medicosDisponiveis
          }
          title="Vincular Médico"
          placeholder="Buscar médico..."
          getItemId={(
            item
          ) =>
            item.id!
          }
          getItemLabel={(
            item
          ) =>
            item.nome
          }
          renderItem={(
            item
          ) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice">
                <Stethoscope
                  size={16}
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-primary">
                  Dr(a).{" "}
                  {
                    item.nome
                  }
                </p>

                {item.especialidade && (
                  <p className="mt-0.5 truncate text-[10px] text-ink-muted">
                    {
                      item.especialidade
                    }
                  </p>
                )}
              </div>
            </div>
          )}
          onCreateNew={() => {
            setIsMedModalOpen(
              false
            );

            router.push(
              "/saude/medicos/novo"
            );
          }}
          createNewLabel="Cadastrar Novo Médico"
        />

        {/* ====================================================
            DELETE
            ==================================================== */}

        <ConfirmationModal
          isOpen={
            showDeleteModal
          }
          onClose={() =>
            setShowDeleteModal(
              false
            )
          }
          onConfirm={
            handleDelete
          }
          title="Excluir hospital"
          message={`Tem certeza que deseja excluir "${nome}"? Como esta unidade é global, ela será desvinculada dos registros relacionados de todas as pessoas. Consultas, cirurgias, documentos, medicamentos e renovações não serão apagados.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={
            deleteAction.isSubmitting
          }
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function EditarHospitalPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <EditarHospitalContent />
    </Suspense>
  );
}