// app/saude/tratamentos/editar/page.tsx
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
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  FolderHeart,
  Loader2,
  MapPin,
  Pill,
  Plus,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useTratamentos,
} from "@/hooks/useTratamentos";

import {
  useCids,
} from "@/hooks/useCids";

import {
  useMedicos,
} from "@/hooks/useMedicos";

import {
  useHospitais,
} from "@/hooks/useHospitais";

import {
  useLocais,
} from "@/hooks/useLocais";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  db,
} from "@/lib/db";

import {
  getClinicalTheme,
} from "@/lib/health-utils";

import {
  Button,
} from "@/components/ui/Button";

import {
  Input,
} from "@/components/ui/Input";

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
  Cid,
  Hospital,
  LocalSaude,
  Medico,
  Medicamento,
  Tratamento,
} from "@/lib/types";

// ============================================================
// ANIMAÇÃO
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
// CONTENT
// ============================================================

function EditarTratamentoContent() {
  const {
    trigger,
  } =
    useHapticFeedback();

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get(
      "id"
    ) ||
    "";

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    getTratamento,
    getMedicamentosDoTratamento,
    updateTratamento,
    deleteTratamentoSafe,
  } =
    useTratamentos();

  const {
    cids = [],
  } =
    useCids();

  const {
    medicos = [],
  } =
    useMedicos();

  const {
    hospitais = [],
  } =
    useHospitais();

  const {
    locais = [],
  } =
    useLocais();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const saveAction =
    useSubmitAction();

  const deleteAction =
    useSubmitAction();

  const isSubmitLocked =
    useRef(
      false
    );

  // ==========================================================
  // ESTADO GERAL
  // ==========================================================

  const [
    tratamento,
    setTratamento,
  ] =
    useState<Tratamento | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
    );

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  // ==========================================================
  // FORMULÁRIO
  // ==========================================================

  const [
    nome,
    setNome,
  ] =
    useState(
      ""
    );

  const [
    cidIds,
    setCidIds,
  ] =
    useState<string[]>(
      []
    );

  const [
    status,
    setStatus,
  ] =
    useState<
      | "ativo"
      | "concluido"
      | "suspenso"
    >(
      "ativo"
    );

  const [
    observacoes,
    setObservacoes,
  ] =
    useState(
      ""
    );

  const [
    medicoIds,
    setMedicoIds,
  ] =
    useState<string[]>(
      []
    );

  const [
    hospitalIds,
    setHospitalIds,
  ] =
    useState<string[]>(
      []
    );

  const [
    localIds,
    setLocalIds,
  ] =
    useState<string[]>(
      []
    );

  /*
   * Estado local da relação com Medicamentos.
   *
   * IMPORTANTE:
   *
   * adicionar/remover aqui NÃO altera Dexie.
   * A reconciliação só acontece ao tocar em Salvar.
   */
  const [
    medicamentoIds,
    setMedicamentoIds,
  ] =
    useState<string[]>(
      []
    );

  // ==========================================================
  // MODAIS
  // ==========================================================

  const [
    isCidModalOpen,
    setIsCidModalOpen,
  ] =
    useState(
      false
    );

  const [
    showAddCidPrompt,
    setShowAddCidPrompt,
  ] =
    useState(
      false
    );

  const [
    isMedicoModalOpen,
    setIsMedicoModalOpen,
  ] =
    useState(
      false
    );

  const [
    isHospitalModalOpen,
    setIsHospitalModalOpen,
  ] =
    useState(
      false
    );

  const [
    isLocalModalOpen,
    setIsLocalModalOpen,
  ] =
    useState(
      false
    );

  const [
    isMedicamentoModalOpen,
    setIsMedicamentoModalOpen,
  ] =
    useState(
      false
    );

  // ==========================================================
  // EXAMES
  //
  // Leitura temporariamente permanece via Dexie porque ainda
  // não temos aqui uma API confirmada de useExames adequada
  // para esta consulta.
  //
  // Diferentemente do código antigo, a leitura é obrigatoriamente
  // limitada à pessoa ativa.
  // ==========================================================

  const exames =
    useLiveQuery(
      async () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.exames
          .where(
            "person_id"
          )
          .equals(
            activePersonId
          )
          .toArray();
      },
      [
        activePersonId,
      ],
      []
    ) ||
    [];

  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(
    () => {
      let cancelled =
        false;

      const loadData =
        async () => {
          setIsLoading(
            true
          );

          if (
            !id ||
            !activePersonId
          ) {
            if (
              !cancelled
            ) {
              setTratamento(
                null
              );

              setIsLoading(
                false
              );
            }

            return;
          }

          try {
            const [
              data,
              medicamentosDoTratamento,
            ] =
              await Promise.all([
                getTratamento(
                  id
                ),

                getMedicamentosDoTratamento(
                  id
                ),
              ]);

            if (
              cancelled
            ) {
              return;
            }

            if (
              !data ||
              data.person_id !==
                activePersonId
            ) {
              setTratamento(
                null
              );

              return;
            }

            setTratamento(
              data
            );

            setNome(
              data.nome ||
                ""
            );

            setCidIds(
              Array.from(
                new Set(
                  data.cid_ids ||
                    []
                )
              )
            );

            setStatus(
              data.status ||
                "ativo"
            );

            setObservacoes(
              data.observacoes ||
                ""
            );

            setMedicoIds(
              Array.from(
                new Set(
                  data.medico_ids ||
                    []
                )
              )
            );

            setHospitalIds(
              Array.from(
                new Set(
                  data.hospital_ids ||
                    []
                )
              )
            );

            setLocalIds(
              Array.from(
                new Set(
                  data.local_ids ||
                    []
                )
              )
            );

            setMedicamentoIds(
              Array.from(
                new Set(
                  medicamentosDoTratamento
                    .map(
                      (
                        medicamento
                      ) =>
                        medicamento.id
                    )
                    .filter(
                      (
                        medicamentoId
                      ): medicamentoId is string =>
                        Boolean(
                          medicamentoId
                        )
                    )
                )
              )
            );

            setError(
              ""
            );
          } catch (
            loadError
          ) {
            console.error(
              "[EditarTratamento] Erro ao carregar tratamento:",
              loadError
            );

            if (
              !cancelled
            ) {
              setTratamento(
                null
              );
            }
          } finally {
            if (
              !cancelled
            ) {
              setIsLoading(
                false
              );
            }
          }
        };

      void loadData();

      return () => {
        cancelled =
          true;
      };
    },
    [
      id,
      activePersonId,
      getTratamento,
      getMedicamentosDoTratamento,
    ]
  );

  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const selectedCids =
    useMemo(
      () =>
        cids.filter(
          (
            cid: Cid
          ) =>
            Boolean(
              cid.id &&
                cidIds.includes(
                  cid.id
                )
            )
        ),
      [
        cids,
        cidIds,
      ]
    );

  const medicosVinculados =
    useMemo(
      () =>
        medicos.filter(
          (
            medico
          ) =>
            Boolean(
              medico.id &&
                medicoIds.includes(
                  medico.id
                )
            )
        ),
      [
        medicos,
        medicoIds,
      ]
    );

  const hospitaisVinculados =
    useMemo(
      () =>
        hospitais.filter(
          (
            hospital
          ) =>
            Boolean(
              hospital.id &&
                hospitalIds.includes(
                  hospital.id
                )
            )
        ),
      [
        hospitais,
        hospitalIds,
      ]
    );

  const locaisVinculados =
    useMemo(
      () =>
        locais.filter(
          (
            local
          ) =>
            Boolean(
              local.id &&
                localIds.includes(
                  local.id
                )
            )
        ),
      [
        locais,
        localIds,
      ]
    );

  const medicamentosVinculados =
    useMemo(
      () =>
        medicamentos.filter(
          (
            medicamento
          ) =>
            Boolean(
              medicamento.id &&
                medicamentoIds.includes(
                  medicamento.id
                )
            )
        ),
      [
        medicamentos,
        medicamentoIds,
      ]
    );

  const examesVinculados =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return exames.filter(
          (
            exame
          ) =>
            exame.person_id ===
              activePersonId &&
            exame.tratamento_ids?.includes(
              id
            )
        );
      },
      [
        exames,
        id,
        activePersonId,
      ]
    );

  const theme =
    getClinicalTheme(
      nome ||
        "Editar Tratamento"
    );

  const PreviewIcon =
    theme.icon;

  const statusOriginal =
    tratamento?.status ||
    "ativo";

  const encerrandoAgora =
    statusOriginal ===
      "ativo" &&
    (
      status ===
        "concluido" ||
      status ===
        "suspenso"
    );

  // ==========================================================
  // SAVE
  // ==========================================================

  const handleSubmit =
    async () => {
      trigger(
        "vibrate"
      );

      if (
        isSubmitLocked.current ||
        saveAction.isSubmitting
      ) {
        return;
      }

      if (
        !id ||
        !tratamento
      ) {
        setError(
          "Tratamento não identificado."
        );

        trigger(
          "error"
        );

        return;
      }

      if (
        !activePersonId ||
        tratamento.person_id !==
          activePersonId
      ) {
        setError(
          "Tratamento não pertence à pessoa ativa."
        );

        trigger(
          "error"
        );

        return;
      }

      if (
        !nome.trim()
      ) {
        setError(
          "Nome do tratamento é obrigatório"
        );

        trigger(
          "error"
        );

        return;
      }

      isSubmitLocked.current =
        true;

      try {
        await saveAction.run(
          async () => {
            await updateTratamento(
              id,
              {
                nome:
                  nome.trim(),

                cid_ids:
                  Array.from(
                    new Set(
                      cidIds
                    )
                  ),

                /*
                 * Campo de comando.
                 *
                 * O repository reconcilia o lado canônico:
                 * Medicamento.tratamento_ids.
                 */
                medicamento_ids:
                  Array.from(
                    new Set(
                      medicamentoIds
                    )
                  ),

                cor:
                  theme.hex,

                status,

                observacoes:
                  observacoes.trim() ||
                  undefined,

                medico_ids:
                  Array.from(
                    new Set(
                      medicoIds
                    )
                  ),

                hospital_ids:
                  Array.from(
                    new Set(
                      hospitalIds
                    )
                  ),

                local_ids:
                  Array.from(
                    new Set(
                      localIds
                    )
                  ),
              }
            );
          },
          {
            successMessage:
              "Tratamento atualizado com sucesso",

            errorMessage:
              "Erro ao atualizar tratamento",

            goBackOnSuccess:
              true,
          }
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
      trigger(
        "vibrate"
      );

      if (
        !id ||
        !tratamento
      ) {
        return;
      }

      deleteAction.run(
        async () => {
          if (
            !activePersonId ||
            tratamento.person_id !==
              activePersonId
          ) {
            throw new Error(
              "Tratamento não pertence à pessoa ativa."
            );
          }

          await deleteTratamentoSafe(
            id
          );

          router.replace(
            "/saude/tratamentos"
          );
        },
        {
          successMessage:
            "Tratamento excluído com sucesso",

          errorMessage:
            "Erro ao excluir tratamento",
        }
      );
    };

  // ==========================================================
  // CIDS
  // ==========================================================

  const handleAddCid =
    (
      cidId:
        string
    ) => {
      trigger(
        "vibrate"
      );

      setCidIds(
        (
          current
        ) =>
          current.includes(
            cidId
          )
            ? current
            : [
                ...current,
                cidId,
              ]
      );

      setIsCidModalOpen(
        false
      );

      setShowAddCidPrompt(
        true
      );
    };

  const handleRemoveCid =
    (
      cidId:
        string
    ) => {
      trigger(
        "vibrate"
      );

      setCidIds(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item !==
              cidId
          )
      );
    };

  // ==========================================================
  // MÉDICOS
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

      trigger(
        "vibrate"
      );

      setMedicoIds(
        (
          current
        ) =>
          current.includes(
            medico.id!
          )
            ? current
            : [
                ...current,
                medico.id!,
              ]
      );

      setIsMedicoModalOpen(
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
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item !==
              medicoId
          )
      );
    };

  // ==========================================================
  // HOSPITAIS
  // ==========================================================

  const handleAddHospital =
    (
      hospital:
        Hospital
    ) => {
      if (
        !hospital.id
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setHospitalIds(
        (
          current
        ) =>
          current.includes(
            hospital.id!
          )
            ? current
            : [
                ...current,
                hospital.id!,
              ]
      );

      setIsHospitalModalOpen(
        false
      );
    };

  const handleRemoveHospital =
    (
      hospitalId:
        string
    ) => {
      trigger(
        "vibrate"
      );

      setHospitalIds(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item !==
              hospitalId
          )
      );
    };

  // ==========================================================
  // LOCAIS
  // ==========================================================

  const handleAddLocal =
    (
      local:
        LocalSaude
    ) => {
      if (
        !local.id
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setLocalIds(
        (
          current
        ) =>
          current.includes(
            local.id!
          )
            ? current
            : [
                ...current,
                local.id!,
              ]
      );

      setIsLocalModalOpen(
        false
      );
    };

  const handleRemoveLocal =
    (
      localId:
        string
    ) => {
      trigger(
        "vibrate"
      );

      setLocalIds(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item !==
              localId
          )
      );
    };

  // ==========================================================
  // MEDICAMENTOS
  //
  // Somente estado React.
  // Nenhuma persistência acontece aqui.
  // ==========================================================

  const handleAddMedicamento =
    (
      medicamento:
        Medicamento
    ) => {
      if (
        !medicamento.id
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setMedicamentoIds(
        (
          current
        ) =>
          current.includes(
            medicamento.id!
          )
            ? current
            : [
                ...current,
                medicamento.id!,
              ]
      );

      setIsMedicamentoModalOpen(
        false
      );
    };

  const handleRemoveMedicamento =
    (
      medicamentoId:
        string
    ) => {
      trigger(
        "vibrate"
      );

      setMedicamentoIds(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item !==
              medicamentoId
          )
      );
    };

  // ==========================================================
  // LOADING / NOT FOUND
  // ==========================================================

  if (
    isLoading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (
    !tratamento
  ) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void px-6 text-center">
        <FolderHeart
          size={
            34
          }
          className="text-ink-muted"
        />

        <p className="mt-4 font-semibold text-ink-primary">
          Tratamento não encontrado
        </p>

        <p className="mt-1 max-w-sm text-sm text-ink-muted">
          O registro não existe ou não pertence à pessoa ativa.
        </p>

        <button
          type="button"
          onClick={
            () =>
              router.replace(
                "/saude/tratamentos"
              )
          }
          className="mt-5 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
        >
          Voltar
        </button>
      </main>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={
                  18
                }
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">
                Editar Tratamento
              </h1>
            </div>
          </div>

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
            className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            aria-label="Excluir tratamento"
          >
            <Trash2
              size={
                16
              }
            />
          </button>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {/* ==================================================
              IDENTIDADE
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className={`rounded-[28px] border bg-surface p-5 shadow-sm transition-all duration-300 ${theme.borderClass}`}
            style={{
              borderLeft:
                `6px solid ${theme.hex}`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-300 ${theme.bgClass} ${theme.textClass} ${theme.borderClass}`}
              >
                <PreviewIcon
                  size={
                    24
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`font-mono text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${theme.textClass}`}
                >
                  IDENTIFICAÇÃO
                </p>

                <h2 className="mt-0.5 line-clamp-2 font-display text-base font-semibold text-ink-primary">
                  {nome ||
                    "A prévia visual aparecerá aqui..."}
                </h2>
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              DADOS PRINCIPAIS
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.02,
            }}
            className="space-y-5 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Nome do Tratamento *"
              placeholder="Ex: Controle de pressão, acompanhamento pós-operatório..."
              value={
                nome
              }
              onChange={
                (
                  event
                ) => {
                  setNome(
                    event.target.value
                  );

                  if (
                    error
                  ) {
                    setError(
                      ""
                    );
                  }
                }
              }
              error={
                error
              }
              required
            />

            {/* =================================================
                CIDS
                ================================================= */}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink-primary">
                Diagnósticos (CIDs Associados)
              </label>

              {selectedCids.length >
                0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {selectedCids.map(
                    (
                      cid
                    ) => (
                      <div
                        key={
                          cid.id
                        }
                        className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5"
                      >
                        <span className="text-xs font-medium text-violet-300">
                          {cid.codigo !==
                          "N/A"
                            ? `${cid.codigo} - `
                            : ""}
                          {
                            cid.descricao
                          }
                        </span>

                        <button
                          type="button"
                          onClick={
                            () =>
                              handleRemoveCid(
                                cid.id!
                              )
                          }
                          className="text-violet-400/60 transition-colors hover:text-coral"
                          aria-label="Remover CID"
                        >
                          <X
                            size={
                              14
                            }
                          />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setIsCidModalOpen(
                      true
                    );
                  }
                }
                className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left transition-all active:scale-95"
              >
                <span className="text-ink-muted">
                  {selectedCids.length >
                  0
                    ? "Adicionar outro CID"
                    : "Toque para vincular CIDs"}
                </span>

                <ChevronRight
                  size={
                    18
                  }
                  className="ml-2 shrink-0 text-ink-muted"
                />
              </button>
            </div>

            {/* =================================================
                STATUS
                ================================================= */}

            <div>
              <label className="mb-2 block text-sm font-medium text-ink-primary">
                Status
              </label>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    "ativo",
                    "concluido",
                    "suspenso",
                  ] as const
                ).map(
                  (
                    currentStatus
                  ) => (
                    <button
                      key={
                        currentStatus
                      }
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setStatus(
                            currentStatus
                          );
                        }
                      }
                      className={`rounded-2xl border px-1 py-2.5 text-center text-xs font-medium transition-all active:scale-95 ${
                        status ===
                        currentStatus
                          ? "border-transparent"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                      }`}
                      style={
                        status ===
                        currentStatus
                          ? {
                              borderColor:
                                theme.hex,

                              color:
                                theme.hex,

                              backgroundColor:
                                `${theme.hex}20`,
                            }
                          : {}
                      }
                    >
                      {currentStatus ===
                      "ativo"
                        ? "Em andamento"
                        : currentStatus ===
                            "concluido"
                          ? "Concluído"
                          : "Suspenso"}
                    </button>
                  )
                )}
              </div>

              {encerrandoAgora && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3">
                  <AlertTriangle
                    size={
                      15
                    }
                    className="mt-0.5 shrink-0 text-amber-400"
                  />

                  <p className="text-[11px] leading-relaxed text-ink-muted">
                    Ao salvar este tratamento como{" "}
                    <span className="font-semibold text-amber-400">
                      {status ===
                      "concluido"
                        ? "concluído"
                        : "suspenso"}
                    </span>
                    , o Vault poderá descontinuar medicamentos vinculados que não pertençam a outro tratamento ativo da mesma pessoa.
                  </p>
                </div>
              )}
            </div>

            {/* =================================================
                OBSERVAÇÕES
                ================================================= */}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">
                Observações
              </label>

              <textarea
                rows={
                  3
                }
                placeholder="Histórico, acompanhamento, informações relevantes..."
                value={
                  observacoes
                }
                onChange={
                  (
                    event
                  ) =>
                    setObservacoes(
                      event.target.value
                    )
                }
                className="w-full resize-none rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-ice/50"
              />
            </div>
          </motion.div>

          {/* ==================================================
              VÍNCULOS
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.04,
            }}
            className="space-y-5 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            {/* =================================================
                MEDICAMENTOS
                ================================================= */}

            <div>
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <Pill
                    size={
                      14
                    }
                    className="text-ice"
                  />

                  Medicamentos Associados
                </h2>

                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setIsMedicamentoModalOpen(
                        true
                      );
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-full bg-ice/10 px-2.5 py-1 text-[10px] font-bold text-ice transition-all active:scale-95"
                >
                  <Plus
                    size={
                      12
                    }
                  />

                  Adicionar
                </button>
              </div>

              {medicamentosVinculados.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center">
                  <p className="text-xs text-ink-muted">
                    Nenhum medicamento vinculado.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {medicamentosVinculados.map(
                    (
                      medicamento
                    ) => (
                      <div
                        key={
                          medicamento.id
                        }
                        className="flex items-center gap-2 rounded-full border border-surface-border/50 bg-surface-raised py-1 pl-3 pr-1"
                      >
                        <span className="max-w-[180px] truncate text-xs font-semibold text-ink-primary">
                          {
                            medicamento.nome
                          }

                          {medicamento.dosagem
                            ? ` · ${medicamento.dosagem}`
                            : ""}
                        </span>

                        <button
                          type="button"
                          onClick={
                            () =>
                              handleRemoveMedicamento(
                                medicamento.id!
                              )
                          }
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted transition-colors hover:bg-coral/20 hover:text-coral"
                          aria-label="Remover medicamento"
                        >
                          <X
                            size={
                              12
                            }
                          />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}

              <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                Alterações nesses vínculos só serão aplicadas quando você salvar o tratamento.
              </p>
            </div>

            {/* =================================================
                MÉDICOS
                ================================================= */}

            <div>
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <Stethoscope
                    size={
                      14
                    }
                    className="text-ice"
                  />

                  Médicos Responsáveis
                </h2>

                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setIsMedicoModalOpen(
                        true
                      );
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-full bg-ice/10 px-2.5 py-1 text-[10px] font-bold text-ice transition-all active:scale-95"
                >
                  <Plus
                    size={
                      12
                    }
                  />

                  Adicionar
                </button>
              </div>

              {medicosVinculados.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center">
                  <p className="text-xs text-ink-muted">
                    Nenhum médico vinculado.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {medicosVinculados.map(
                    (
                      medico
                    ) => (
                      <div
                        key={
                          medico.id
                        }
                        className="flex items-center gap-2 rounded-full border border-surface-border/50 bg-surface-raised py-1 pl-3 pr-1"
                      >
                        <span className="max-w-[180px] truncate text-xs font-semibold text-ink-primary">
                          Dr(a).{" "}
                          {
                            medico.nome
                          }
                        </span>

                        <button
                          type="button"
                          onClick={
                            () =>
                              handleRemoveMedico(
                                medico.id!
                              )
                          }
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted transition-colors hover:bg-coral/20 hover:text-coral"
                          aria-label="Remover médico"
                        >
                          <X
                            size={
                              12
                            }
                          />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* =================================================
                HOSPITAIS
                ================================================= */}

            <div>
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <Building2
                    size={
                      14
                    }
                    className="text-violet-400"
                  />

                  Hospitais / Clínicas
                </h2>

                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setIsHospitalModalOpen(
                        true
                      );
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-full bg-violet-400/10 px-2.5 py-1 text-[10px] font-bold text-violet-400 transition-all active:scale-95"
                >
                  <Plus
                    size={
                      12
                    }
                  />

                  Adicionar
                </button>
              </div>

              {hospitaisVinculados.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center">
                  <p className="text-xs text-ink-muted">
                    Nenhum hospital vinculado.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {hospitaisVinculados.map(
                    (
                      hospital
                    ) => (
                      <div
                        key={
                          hospital.id
                        }
                        className="flex items-center gap-2 rounded-full border border-surface-border/50 bg-surface-raised py-1 pl-3 pr-1"
                      >
                        <span className="max-w-[180px] truncate text-xs font-semibold text-ink-primary">
                          {
                            hospital.nome
                          }
                        </span>

                        <button
                          type="button"
                          onClick={
                            () =>
                              handleRemoveHospital(
                                hospital.id!
                              )
                          }
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted transition-colors hover:bg-coral/20 hover:text-coral"
                          aria-label="Remover hospital"
                        >
                          <X
                            size={
                              12
                            }
                          />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* =================================================
                LOCAIS
                ================================================= */}

            <div>
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <MapPin
                    size={
                      14
                    }
                    className="text-emerald-400"
                  />

                  Postos / Locais de Saúde
                </h2>

                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setIsLocalModalOpen(
                        true
                      );
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 transition-all active:scale-95"
                >
                  <Plus
                    size={
                      12
                    }
                  />

                  Adicionar
                </button>
              </div>

              {locaisVinculados.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center">
                  <p className="text-xs text-ink-muted">
                    Nenhum posto ou local vinculado.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {locaisVinculados.map(
                    (
                      local
                    ) => (
                      <div
                        key={
                          local.id
                        }
                        className="flex items-center gap-2 rounded-full border border-surface-border/50 bg-surface-raised py-1 pl-3 pr-1"
                      >
                        <span className="max-w-[180px] truncate text-xs font-semibold text-ink-primary">
                          {
                            local.nome
                          }
                        </span>

                        <button
                          type="button"
                          onClick={
                            () =>
                              handleRemoveLocal(
                                local.id!
                              )
                          }
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted transition-colors hover:bg-coral/20 hover:text-coral"
                          aria-label="Remover local"
                        >
                          <X
                            size={
                              12
                            }
                          />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* ==================================================
              HISTÓRICO DE EXAMES
              ================================================== */}

          {examesVinculados.length >
            0 && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.06,
              }}
              className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <h2 className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <FolderHeart
                  size={
                    14
                  }
                  className="text-coral"
                />

                Histórico Clínico do Tratamento
              </h2>

              <div>
                <h3 className="mb-2 mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <FlaskConical
                    size={
                      12
                    }
                    className="text-ice"
                  />

                  Avaliações / Exames
                </h3>

                <div className="space-y-2">
                  {examesVinculados
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
                            () => {
                              trigger(
                                "vibrate"
                              );

                              router.push(
                                `/saude/exames/detalhes?id=${exame.id}`
                              );
                            }
                          }
                          className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.98]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink-primary">
                              {
                                exame.nome
                              }
                            </p>

                            {exame.data && (
                              <p className="mt-0.5 text-[10px] text-ink-muted">
                                Data:{" "}
                                {
                                  exame.data
                                }
                              </p>
                            )}
                          </div>

                          <ExternalLink
                            size={
                              14
                            }
                            className="shrink-0 text-ink-faint"
                          />
                        </button>
                      )
                    )}
                </div>

                {examesVinculados.length >
                  3 && (
                  <p className="mt-2 text-center text-[10px] text-ink-muted">
                    E mais{" "}
                    {examesVinculados.length -
                      3}{" "}
                    exame(s) vinculado(s).
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </section>

        {/* ====================================================
            FOOTER
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
              !activePersonId
            }
            className="flex items-center justify-center gap-2 shadow-lg"
          >
            {saveAction.isSubmitting ? (
              <>
                <Loader2
                  size={
                    18
                  }
                  className="animate-spin"
                />

                Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </div>

        {/* ====================================================
            DELETE
            ==================================================== */}

        <ConfirmationModal
          isOpen={
            showDeleteModal
          }
          onClose={
            () =>
              setShowDeleteModal(
                false
              )
          }
          onConfirm={
            handleDelete
          }
          title="Excluir Tratamento"
          message="Excluir este tratamento? Medicamentos e exames serão preservados, mas perderão o vínculo com este tratamento."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={
            deleteAction.isSubmitting
          }
          type="danger"
        />

        {/* ====================================================
            CID
            ==================================================== */}

        <SelectionModal<Cid>
          isOpen={
            isCidModalOpen
          }
          onClose={
            () =>
              setIsCidModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) =>
              handleAddCid(
                item.id!
              )
          }
          items={
            cids.filter(
              (
                cid
              ) =>
                !cid.id ||
                !cidIds.includes(
                  cid.id
                )
            )
          }
          title="Vincular Diagnóstico (CID)"
          placeholder="Buscar por código ou descrição..."
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.descricao
          }
          renderItem={
            (
              item
            ) => (
              <div>
                <p className="font-medium text-ink-primary">
                  {
                    item.descricao
                  }
                </p>

                {item.codigo &&
                  item.codigo !==
                    "N/A" && (
                    <p className="text-xs text-ink-muted">
                      CID:{" "}
                      {
                        item.codigo
                      }
                    </p>
                  )}
              </div>
            )
          }
          onCreateNew={
            () => {
              setIsCidModalOpen(
                false
              );

              router.push(
                "/saude/cids/novo"
              );
            }
          }
          createNewLabel="Cadastrar Novo CID"
        />

        {/* ====================================================
            MÉDICO
            ==================================================== */}

        <SelectionModal<Medico>
          isOpen={
            isMedicoModalOpen
          }
          onClose={
            () =>
              setIsMedicoModalOpen(
                false
              )
          }
          onSelect={
            handleAddMedico
          }
          items={
            medicos.filter(
              (
                medico
              ) =>
                !medico.id ||
                !medicoIds.includes(
                  medico.id
                )
            )
          }
          title="Vincular Médico"
          placeholder="Buscar médico..."
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.nome
          }
          renderItem={
            (
              item
            ) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice">
                  <Stethoscope
                    size={
                      16
                    }
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-primary">
                    Dr(a).{" "}
                    {
                      item.nome
                    }
                  </p>
                </div>
              </div>
            )
          }
          onCreateNew={
            () => {
              setIsMedicoModalOpen(
                false
              );

              router.push(
                "/saude/medicos/novo"
              );
            }
          }
          createNewLabel="Cadastrar Novo Médico"
        />

        {/* ====================================================
            HOSPITAL
            ==================================================== */}

        <SelectionModal<Hospital>
          isOpen={
            isHospitalModalOpen
          }
          onClose={
            () =>
              setIsHospitalModalOpen(
                false
              )
          }
          onSelect={
            handleAddHospital
          }
          items={
            hospitais.filter(
              (
                hospital
              ) =>
                !hospital.id ||
                !hospitalIds.includes(
                  hospital.id
                )
            )
          }
          title="Vincular Hospital"
          placeholder="Buscar hospital..."
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.nome
          }
          renderItem={
            (
              item
            ) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-400/10 text-violet-400">
                  <Building2
                    size={
                      16
                    }
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-primary">
                    {
                      item.nome
                    }
                  </p>
                </div>
              </div>
            )
          }
          onCreateNew={
            () => {
              setIsHospitalModalOpen(
                false
              );

              router.push(
                "/saude/hospitais/novo"
              );
            }
          }
          createNewLabel="Cadastrar Novo Hospital"
        />

        {/* ====================================================
            LOCAL
            ==================================================== */}

        <SelectionModal<LocalSaude>
          isOpen={
            isLocalModalOpen
          }
          onClose={
            () =>
              setIsLocalModalOpen(
                false
              )
          }
          onSelect={
            handleAddLocal
          }
          items={
            locais.filter(
              (
                local
              ) =>
                !local.id ||
                !localIds.includes(
                  local.id
                )
            )
          }
          title="Vincular Posto / Local"
          placeholder="Buscar local..."
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.nome
          }
          renderItem={
            (
              item
            ) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                  <MapPin
                    size={
                      16
                    }
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-primary">
                    {
                      item.nome
                    }
                  </p>
                </div>
              </div>
            )
          }
          onCreateNew={
            () => {
              setIsLocalModalOpen(
                false
              );

              router.push(
                "/saude/locais/novo"
              );
            }
          }
          createNewLabel="Cadastrar Novo Local"
        />

        {/* ====================================================
            MEDICAMENTO
            ==================================================== */}

        <SelectionModal<Medicamento>
          isOpen={
            isMedicamentoModalOpen
          }
          onClose={
            () =>
              setIsMedicamentoModalOpen(
                false
              )
          }
          onSelect={
            handleAddMedicamento
          }
          items={
            medicamentos.filter(
              (
                medicamento
              ) =>
                !medicamento.id ||
                !medicamentoIds.includes(
                  medicamento.id
                )
            )
          }
          title="Vincular Medicamento"
          placeholder="Buscar medicamento..."
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.nome
          }
          renderItem={
            (
              item
            ) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice">
                  <Pill
                    size={
                      16
                    }
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-primary">
                    {
                      item.nome
                    }
                  </p>

                  {item.dosagem && (
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {
                        item.dosagem
                      }
                    </p>
                  )}
                </div>
              </div>
            )
          }
          onCreateNew={
            () => {
              setIsMedicamentoModalOpen(
                false
              );

              router.push(
                "/saude/medicamentos/novo"
              );
            }
          }
          createNewLabel="Cadastrar Novo Medicamento"
        />

        {/* ====================================================
            CONTINUAR ADICIONANDO CID
            ==================================================== */}

        <AnimatePresence>
          {showAddCidPrompt && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
              onClick={
                () =>
                  setShowAddCidPrompt(
                    false
                  )
              }
            >
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.95,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                }}
                onClick={
                  (
                    event
                  ) =>
                    event.stopPropagation()
                }
                className="w-full max-w-sm space-y-4 rounded-[28px] border border-surface-border bg-surface p-6 shadow-xl"
              >
                <div className="flex items-center gap-3 text-violet-400">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10">
                    <FolderHeart
                      size={
                        22
                      }
                    />
                  </div>

                  <div>
                    <h3 className="font-display text-base font-bold text-ink-primary">
                      Adicionar outro CID?
                    </h3>

                    <p className="text-xs text-ink-muted">
                      Você pode vincular múltiplos diagnósticos.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={
                      () => {
                        trigger(
                          "vibrate"
                        );

                        setShowAddCidPrompt(
                          false
                        );
                      }
                    }
                    className="flex-1 rounded-2xl border border-surface-border/50 bg-surface-raised py-3 text-xs font-semibold text-ink-primary transition-all active:scale-95"
                  >
                    Não, finalizar
                  </button>

                  <button
                    type="button"
                    onClick={
                      () => {
                        trigger(
                          "vibrate"
                        );

                        setShowAddCidPrompt(
                          false
                        );

                        setIsCidModalOpen(
                          true
                        );
                      }
                    }
                    className="flex-1 rounded-2xl bg-violet-400 py-3 text-xs font-semibold text-void shadow-md shadow-violet-400/20 transition-all active:scale-95"
                  >
                    Sim, adicionar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function EditarTratamentoPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <EditarTratamentoContent />
    </Suspense>
  );
}