// app/saude/medicos/editar/page.tsx
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
  ExternalLink,
  FlaskConical,
  FolderHeart,
  Loader2,
  MapPin,
  Pill,
  Save,
  Trash2,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";
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
  useTratamentos,
} from "@/hooks/useTratamentos";
import {
  useConsultas,
} from "@/hooks/useConsultas";
import {
  useExames,
} from "@/hooks/useExames";
import {
  useCirurgias,
} from "@/hooks/useCirurgias";
import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

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

function formatPhone(
  value: string
): string {
  const clean =
    value
      .replace(
        /\D/g,
        ""
      )
      .slice(
        0,
        11
      );

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
    )}) ${clean.slice(
      2
    )}`;
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
    )}-${clean.slice(
      6
    )}`;
  }

  return `(${clean.slice(
    0,
    2
  )}) ${clean.slice(
    2,
    7
  )}-${clean.slice(
    7
  )}`;
}

function formatDateDisplay(
  isoStr?: string
): string {
  if (!isoStr) {
    return "";
  }

  const parts =
    isoStr.split("-");

  if (
    parts.length !== 3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function EditarMedicoContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get(
      "id"
    ) || "";

  const {
    trigger,
  } =
    useHapticFeedback();

  const saveAction =
    useSubmitAction();

  const deleteAction =
    useSubmitAction();

  const isSubmitLocked =
    useRef(false);

  // ==========================================================
  // HOOKS
  // ==========================================================

  const {
    getMedico,
    updateMedico,
    deleteMedicoSafe,
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
    tratamentos = [],
  } =
    useTratamentos();

  const {
    consultas = [],
  } =
    useConsultas();

  const {
    exames = [],
  } =
    useExames();

  const {
    cirurgias = [],
  } =
    useCirurgias();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  // ==========================================================
  // PAGE STATE
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
    showDeleteModal,
    setShowDeleteModal,
  ] =
    useState(false);

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    nome,
    setNome,
  ] =
    useState("");

  const [
    especialidade,
    setEspecialidade,
  ] =
    useState("");

  const [
    telefone,
    setTelefone,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    crm,
    setCrm,
  ] =
    useState("");

  const [
    observacoes,
    setObservacoes,
  ] =
    useState("");

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

  // ==========================================================
  // LOAD MÉDICO
  // ==========================================================

  useEffect(
    () => {
      let cancelled =
        false;

      const load =
        async () => {
          if (!id) {
            if (
              !cancelled
            ) {
              setNotFound(
                true
              );

              setIsLoading(
                false
              );
            }

            return;
          }

          try {
            const item =
              await getMedico(
                id
              );

            if (
              cancelled
            ) {
              return;
            }

            if (!item) {
              setNotFound(
                true
              );

              return;
            }

            setNome(
              item.nome ||
                ""
            );

            setEspecialidade(
              item.especialidade ||
                ""
            );

            setTelefone(
              item.telefone ||
                ""
            );

            setEmail(
              item.email ||
                ""
            );

            setCrm(
              item.crm ||
                ""
            );

            setObservacoes(
              item.observacoes ||
                ""
            );
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

      void load();

      return () => {
        cancelled =
          true;
      };
    },
    [
      id,
      getMedico,
    ]
  );

  // ==========================================================
  // RELAÇÕES CANÔNICAS
  //
  // Hospital.medico_ids[]
  // LocalSaude.medico_ids[]
  // Tratamento.medico_ids[]
  // ==========================================================

  const hospitaisVinculados =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return hospitais.filter(
          (
            hospital
          ) =>
            hospital.medico_ids?.includes(
              id
            )
        );
      },
      [
        hospitais,
        id,
      ]
    );

  const locaisVinculados =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return locais.filter(
          (
            local
          ) =>
            local.medico_ids?.includes(
              id
            )
        );
      },
      [
        locais,
        id,
      ]
    );

  /*
   * useTratamentos já fornece somente tratamentos da
   * pessoa ativa.
   */
  const tratamentosVinculados =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return tratamentos.filter(
          (
            tratamento
          ) =>
            tratamento.medico_ids?.includes(
              id
            )
        );
      },
      [
        tratamentos,
        id,
      ]
    );

  // ==========================================================
  // HISTÓRICO DA PESSOA ATIVA
  // ==========================================================

  const consultasVinculadas =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return consultas
          .filter(
            (
              consulta
            ) =>
              consulta.medico_id ===
              id
          )
          .sort(
            (
              a,
              b
            ) =>
              b.data.localeCompare(
                a.data
              )
          );
      },
      [
        consultas,
        id,
      ]
    );

  const examesVinculados =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return exames
          .filter(
            (
              exame
            ) =>
              exame.medico_id ===
              id
          )
          .sort(
            (
              a,
              b
            ) =>
              b.data.localeCompare(
                a.data
              )
          );
      },
      [
        exames,
        id,
      ]
    );

  const cirurgiasVinculadas =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return cirurgias
          .filter(
            (
              cirurgia
            ) =>
              cirurgia.medico_id ===
              id
          )
          .sort(
            (
              a,
              b
            ) =>
              b.data.localeCompare(
                a.data
              )
          );
      },
      [
        cirurgias,
        id,
      ]
    );

  const medicamentosVinculados =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return medicamentos.filter(
          (
            medicamento
          ) =>
            medicamento.medico_id ===
            id
        );
      },
      [
        medicamentos,
        id,
      ]
    );

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validate =
    () => {
      const newErrors: Record<
        string,
        string
      > = {};

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
        ).length === 0
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
            await updateMedico(
              id,
              {
                nome:
                  nome.trim(),

                especialidade:
                  especialidade.trim() ||
                  undefined,

                telefone:
                  telefone.trim() ||
                  undefined,

                email:
                  email.trim() ||
                  undefined,

                crm:
                  crm.trim() ||
                  undefined,

                observacoes:
                  observacoes.trim() ||
                  undefined,
              }
            );
          },
          {
            successMessage:
              "Médico atualizado com sucesso",

            errorMessage:
              "Erro ao atualizar médico",

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
    async () => {
      if (!id) {
        return;
      }

      trigger(
        "vibrate"
      );

      await deleteAction.run(
        async () => {
          await deleteMedicoSafe(
            id
          );

          router.replace(
            "/saude/medicos"
          );
        },
        {
          successMessage:
            "Médico excluído",

          errorMessage:
            "Erro ao excluir médico",
        }
      );

      setShowDeleteModal(
        false
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
    notFound
  ) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void px-6 text-center">
        <p className="font-display text-lg font-semibold text-ink-primary">
          Médico não encontrado
        </p>

        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
        >
          Voltar
        </button>
      </main>
    );
  }

  const hasClinicalHistory =
    consultasVinculadas.length >
      0 ||
    cirurgiasVinculadas.length >
      0 ||
    examesVinculados.length >
      0 ||
    medicamentosVinculados.length >
      0;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
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
              <h1 className="truncate font-display text-xl font-semibold text-ink-primary">
                {nome ||
                  "Editar médico"}
              </h1>

              <p className="mt-1 text-xs text-ink-muted">
                Perfil global do profissional
              </p>
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
              aria-label="Excluir médico"
            >
              <Trash2
                size={16}
              />
            </button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          {/* ==================================================
              DADOS DO PROFISSIONAL
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-ink-muted">
              Dados do profissional
            </h2>

            <Input
              label="Nome *"
              placeholder="Nome completo"
              value={
                nome
              }
              onChange={(
                event
              ) =>
                setNome(
                  event
                    .target
                    .value
                )
              }
              error={
                errors.nome
              }
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Especialidade"
                placeholder="Cardiologia"
                value={
                  especialidade
                }
                onChange={(
                  event
                ) =>
                  setEspecialidade(
                    event
                      .target
                      .value
                  )
                }
              />

              <Input
                label="CRM"
                placeholder="12345-MG"
                value={
                  crm
                }
                onChange={(
                  event
                ) =>
                  setCrm(
                    event
                      .target
                      .value
                  )
                }
              />
            </div>

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

            <Input
              label="E-mail"
              placeholder="medico@email.com"
              value={
                email
              }
              onChange={(
                event
              ) =>
                setEmail(
                  event
                    .target
                    .value
                )
              }
              type="email"
            />

            <TextArea
              label="Observações"
              placeholder="Dias de atendimento, recados ou outras informações..."
              value={
                observacoes
              }
              onChange={(
                event
              ) =>
                setObservacoes(
                  event
                    .target
                    .value
                )
              }
            />
          </motion.div>

          {/* ==================================================
              REDE DE ATENDIMENTO
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
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Rede de atendimento
              </h2>

              <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                Estes vínculos são derivados dos hospitais e locais cadastrados. Para alterá-los, edite a entidade correspondente.
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-1.5 px-1">
                <Building2
                  size={14}
                  className="text-ice"
                />

                <h3 className="text-xs font-semibold text-ink-primary">
                  Hospitais
                </h3>
              </div>

              {hospitaisVinculados.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center">
                  <p className="text-xs text-ink-muted">
                    Nenhum hospital relacionado.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {hospitaisVinculados.map(
                    (
                      hospital
                    ) => (
                      <span
                        key={
                          hospital.id
                        }
                        className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-ice/20 bg-ice/5 px-3 py-1.5 text-xs font-semibold text-ink-primary"
                      >
                        <Building2
                          size={12}
                          className="shrink-0 text-ice"
                        />

                        <span className="truncate">
                          {
                            hospital.nome
                          }
                        </span>
                      </span>
                    )
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-1.5 px-1">
                <MapPin
                  size={14}
                  className="text-ice"
                />

                <h3 className="text-xs font-semibold text-ink-primary">
                  Locais de saúde
                </h3>
              </div>

              {locaisVinculados.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-3 text-center">
                  <p className="text-xs text-ink-muted">
                    Nenhum local relacionado.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {locaisVinculados.map(
                    (
                      local
                    ) => (
                      <span
                        key={
                          local.id
                        }
                        className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1.5 text-xs font-semibold text-ink-primary"
                      >
                        <MapPin
                          size={12}
                          className="shrink-0 text-ice"
                        />

                        <span className="truncate">
                          {
                            local.nome
                          }
                        </span>
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* ==================================================
              TRATAMENTOS DA PESSOA ATIVA
              ================================================== */}

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
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="px-1">
              <div className="flex items-center gap-1.5">
                <Activity
                  size={14}
                  className="text-ice"
                />

                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Tratamentos acompanhados
                </h2>
              </div>

              <p className="mt-1 text-xs text-ink-faint">
                Contexto da pessoa ativa.
              </p>
            </div>

            {tratamentosVinculados.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum tratamento relacionado para a pessoa ativa.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tratamentosVinculados.map(
                  (
                    tratamento
                  ) => {
                    const color =
                      tratamento.cor ||
                      "#38BDF8";

                    return (
                      <span
                        key={
                          tratamento.id
                        }
                        className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
                        style={{
                          borderColor:
                            `${color}40`,
                          backgroundColor:
                            `${color}12`,
                          color,
                        }}
                      >
                        <Activity
                          size={12}
                          className="shrink-0"
                        />

                        <span className="truncate">
                          {
                            tratamento.nome
                          }
                        </span>
                      </span>
                    );
                  }
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              HISTÓRICO DA PESSOA ATIVA
              ================================================== */}

          {hasClinicalHistory && (
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
                <div className="flex items-center gap-1.5">
                  <FolderHeart
                    size={14}
                    className="text-coral"
                  />

                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Histórico da pessoa ativa
                  </h2>
                </div>

                <p className="mt-1 text-xs text-ink-faint">
                  Registros clínicos relacionados diretamente a este médico.
                </p>
              </div>

              {medicamentosVinculados.length >
                0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    <Pill
                      size={12}
                      className="text-ice"
                    />
                    Medicamentos prescritos
                  </h3>

                  <div className="space-y-2">
                    {medicamentosVinculados
                      .slice(
                        0,
                        3
                      )
                      .map(
                        (
                          medicamento
                        ) => (
                          <button
                            key={
                              medicamento.id
                            }
                            type="button"
                            onClick={() => {
                              trigger(
                                "vibrate"
                              );

                              router.push(
                                `/saude/medicamentos/detalhes?id=${medicamento.id}`
                              );
                            }}
                            className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.99]"
                          >
                            <div className="min-w-0">
                              <p
                                className={`truncate text-xs font-semibold ${
                                  medicamento.status ===
                                  "ativo"
                                    ? "text-ink-primary"
                                    : "text-ink-muted line-through"
                                }`}
                              >
                                {
                                  medicamento.nome
                                }
                              </p>

                              {medicamento.dosagem && (
                                <p className="mt-0.5 text-[10px] text-ink-muted">
                                  {
                                    medicamento.dosagem
                                  }
                                </p>
                              )}
                            </div>

                            <ExternalLink
                              size={14}
                              className="shrink-0 text-ink-faint"
                            />
                          </button>
                        )
                      )}
                  </div>
                </div>
              )}

              {(consultasVinculadas.length >
                0 ||
                cirurgiasVinculadas.length >
                  0 ||
                examesVinculados.length >
                  0) && (
                <div>
                  <h3 className="mb-2 mt-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    <Calendar
                      size={12}
                      className="text-ice"
                    />
                    Consultas e procedimentos
                  </h3>

                  <div className="space-y-2.5">
                    {consultasVinculadas
                      .slice(
                        0,
                        2
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
                              trigger(
                                "vibrate"
                              );

                              router.push(
                                `/saude/consultas/detalhes?id=${consulta.id}`
                              );
                            }}
                            className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.99]"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                <Calendar
                                  size={14}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-ink-primary">
                                  Consulta
                                  {consulta.especialidade
                                    ? ` · ${consulta.especialidade}`
                                    : ""}
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
                        2
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
                              trigger(
                                "vibrate"
                              );

                              router.push(
                                `/saude/cirurgias/detalhes?id=${cirurgia.id}`
                              );
                            }}
                            className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.99]"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
                                <Activity
                                  size={14}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-ink-primary">
                                  {
                                    cirurgia.procedimento
                                  }
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

                    {examesVinculados
                      .slice(
                        0,
                        2
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
                            onClick={() => {
                              trigger(
                                "vibrate"
                              );

                              router.push(
                                `/saude/exames/detalhes?id=${exame.id}`
                              );
                            }}
                            className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.99]"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ice">
                                <FlaskConical
                                  size={14}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-ink-primary">
                                  {
                                    exame.nome
                                  }
                                </p>

                                <p className="text-[10px] text-ink-muted">
                                  {formatDateDisplay(
                                    exame.data
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
                </div>
              )}
            </motion.div>
          )}
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
              saveAction.isSubmitting
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
          title="Excluir médico"
          message={`Tem certeza que deseja excluir "${nome}"? Os registros clínicos serão preservados e apenas desvinculados deste médico.`}
          isLoading={
            deleteAction.isSubmitting
          }
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function EditarMedicoPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <EditarMedicoContent />
    </Suspense>
  );
}