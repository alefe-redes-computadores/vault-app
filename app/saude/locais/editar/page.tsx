// app/saude/locais/editar/page.tsx
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
  ArrowLeft,
  Building2,
  Calendar,
  Eraser,
  ExternalLink,
  FileText,
  FlaskConical,
  Loader2,
  MapPin,
  Plus,
  PlusCircle,
  Save,
  Stethoscope,
  Trash2,
  User,
  X,
} from "lucide-react";
import type {
  LucideIcon,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";
import {
  useLocais,
} from "@/hooks/useLocais";
import {
  useMedicos,
} from "@/hooks/useMedicos";
import {
  useConsultas,
} from "@/hooks/useConsultas";
import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";
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
  Consulta,
  Medico,
  Renovacao,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type KnownLocalTipo =
  | "posto_saude"
  | "laboratorio"
  | "clinica"
  | "outro";

interface LocalTypeOption {
  id: KnownLocalTipo;
  label: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
  activeClass: string;
}

// ============================================================
// CONFIG
// ============================================================

const TIPOS_LOCAL:
  LocalTypeOption[] = [
  {
    id: "posto_saude",
    label: "Posto / UBS",
    description:
      "Unidade básica, posto de saúde ou atendimento primário.",
    icon: PlusCircle,
    colorClass:
      "text-emerald-400",
    activeClass:
      "border-emerald-400/40 bg-emerald-400/10",
  },
  {
    id: "laboratorio",
    label: "Laboratório",
    description:
      "Coleta, análises clínicas e exames laboratoriais.",
    icon: FlaskConical,
    colorClass:
      "text-violet-400",
    activeClass:
      "border-violet-400/40 bg-violet-400/10",
  },
  {
    id: "clinica",
    label: "Clínica",
    description:
      "Clínica médica, especializada ou centro de atendimento.",
    icon: Building2,
    colorClass:
      "text-ice",
    activeClass:
      "border-ice/40 bg-ice/10",
  },
  {
    id: "outro",
    label: "Outro",
    description:
      "Outro estabelecimento de saúde ainda não classificado.",
    icon: MapPin,
    colorClass:
      "text-amber-400",
    activeClass:
      "border-amber-400/40 bg-amber-400/10",
  },
];

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

  if (parts.length !== 3) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatPhone(
  value: string
): string {
  const clean =
    value
      .replace(/\D/g, "")
      .slice(0, 11);

  if (clean.length <= 2) {
    return clean;
  }

  if (clean.length <= 6) {
    return `(${clean.slice(
      0,
      2
    )}) ${clean.slice(2)}`;
  }

  if (clean.length <= 10) {
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

function isKnownLocalTipo(
  value?: string
): value is KnownLocalTipo {
  return TIPOS_LOCAL.some(
    (
      option
    ) =>
      option.id ===
      value
  );
}

// ============================================================
// CONTENT
// ============================================================

function EditarLocalContent() {
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

  const {
    getLocal,
    updateLocal,
    deleteLocalSafe,
  } =
    useLocais();

  const {
    medicos = [],
  } =
    useMedicos();

  const {
    consultas = [],
  } =
    useConsultas();

  const {
    renovacoes = [],
  } =
    useRenovacoes();

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

  /*
   * string de propósito.
   *
   * Isso preserva tipos antigos ou futuros que ainda não
   * estejam na lista visual atual.
   */
  const [
    tipo,
    setTipo,
  ] =
    useState<string>(
      "posto_saude"
    );

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
    isMedicoModalOpen,
    setIsMedicoModalOpen,
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
      setNotFound(
        true
      );

      setIsLoading(
        false
      );

      return;
    }

    let cancelled =
      false;

    const load =
      async () => {
        setIsLoading(
          true
        );

        try {
          const item =
            await getLocal(
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

          setMedicoIds(
            Array.from(
              new Set(
                item.medico_ids ||
                  []
              )
            )
          );

          /*
           * Preserva exatamente o valor existente.
           *
           * Não convertemos silenciosamente CAPS/UPA/etc.
           * para "outro".
           */
          setTipo(
            item.tipo ||
              "outro"
          );
        } catch (error) {
          console.error(
            "Erro ao carregar local:",
            error
          );

          if (
            !cancelled
          ) {
            setNotFound(
              true
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

    void load();

    return () => {
      cancelled =
        true;
    };
  }, [
    getLocal,
    id,
  ]);

  // ==========================================================
  // TYPE
  // ==========================================================

  const selectedType =
    useMemo(
      () =>
        TIPOS_LOCAL.find(
          (
            option
          ) =>
            option.id ===
            tipo
        ),
      [
        tipo,
      ]
    );

  const SelectedTypeIcon =
    selectedType?.icon ||
    MapPin;

  const tipoConhecido =
    isKnownLocalTipo(
      tipo
    );

  // ==========================================================
  // GLOBAL MEDICOS
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
            consulta.local_id ===
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

  const renovacoesVinculadas =
    useMemo(() => {
      if (!id) {
        return [];
      }

      return renovacoes
        .filter(
          (
            renovacao:
              Renovacao
          ) =>
            renovacao.local_id ===
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
      renovacoes,
      id,
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
  // MEDICOS
  // ==========================================================

  const handleAddMedico =
    (
      medico:
        Medico
    ) => {
      if (!medico.id) {
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
            await updateLocal(
              id,
              {
                nome:
                  nome.trim(),

                tipo,

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
              }
            );
          },
          {
            successMessage:
              "Local atualizado com sucesso",

            errorMessage:
              "Erro ao atualizar local",

            goBackOnSuccess:
              false,
          }
        );

        router.replace(
          `/saude/locais/detalhes?id=${id}`
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
          await deleteLocalSafe(
            id
          );

          router.replace(
            "/saude/locais"
          );
        },
        {
          successMessage:
            "Local excluído com sucesso",

          errorMessage:
            "Erro ao excluir local",

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
      <PageTransition>
        <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void px-6 text-center">
          <MapPin
            size={28}
            className="mb-4 text-ice"
          />

          <p className="font-display text-lg font-semibold text-ink-primary">
            Local não encontrado
          </p>

          <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
            Este cadastro pode ter sido removido ou não está mais disponível.
          </p>

          <button
            type="button"
            onClick={() =>
              router.replace(
                "/saude/locais"
              )
            }
            className="mt-5 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
          >
            Voltar para locais
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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">
                Entidade global
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-2">
                <h1 className="min-w-0 truncate font-display text-xl font-semibold text-ink-primary">
                  {nome ||
                    "Editar local"}
                </h1>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-surface-border/50 bg-surface-raised px-2 py-0.5 text-[9px] font-bold uppercase ${
                    selectedType?.colorClass ||
                    "text-ink-muted"
                  }`}
                >
                  <SelectedTypeIcon
                    size={10}
                  />

                  {selectedType?.label ||
                    tipo}
                </span>
              </div>
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
              aria-label="Excluir local"
            >
              <Trash2
                size={16}
              />
            </button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Dados do local
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-ink-faint">
                Alterações neste cadastro afetam a mesma unidade utilizada pelos registros de todas as pessoas.
              </p>
            </div>

            <Input
              label="Nome *"
              placeholder="Ex: UBS Central..."
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

            <div>
              <label className="mb-2 block text-sm font-medium text-ink-primary">
                Tipo de local
              </label>

              {!tipoConhecido && (
                <div className="mb-3 rounded-2xl border border-ice/20 bg-ice/5 px-3.5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ice">
                    Classificação existente preservada
                  </p>

                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    Este registro usa a classificação{" "}
                    <span className="font-semibold text-ink-primary">
                      {tipo}
                    </span>
                    . Ela continuará preservada enquanto você não escolher outra categoria abaixo.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TIPOS_LOCAL.map(
                  (
                    option
                  ) => {
                    const Icon =
                      option.icon;

                    const selected =
                      tipo ===
                      option.id;

                    return (
                      <button
                        key={
                          option.id
                        }
                        type="button"
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );

                          setTipo(
                            option.id
                          );
                        }}
                        aria-pressed={
                          selected
                        }
                        className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
                          selected
                            ? option.activeClass
                            : "border-surface-border/50 bg-surface-raised/60"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface ${option.colorClass}`}
                        >
                          <Icon
                            size={16}
                          />
                        </div>

                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold ${
                              selected
                                ? option.colorClass
                                : "text-ink-primary"
                            }`}
                          >
                            {
                              option.label
                            }
                          </p>

                          <p className="mt-0.5 text-[10px] leading-4 text-ink-muted">
                            {
                              option.description
                            }
                          </p>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

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

            <div>
              <label
                htmlFor="observacoes"
                className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-primary"
              >
                <FileText
                  size={14}
                  className="text-ink-faint"
                />

                Observações
              </label>

              <textarea
                id="observacoes"
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
                rows={5}
                placeholder="Informações úteis sobre atendimento, horários, acesso ou outras observações..."
                className="w-full resize-none rounded-2xl border border-surface-border/60 bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none transition-colors placeholder:text-ink-faint focus:border-ice/50"
              />
            </div>
          </motion.div>

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
            <div className="flex items-start justify-between gap-3 px-1">
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <Stethoscope
                    size={14}
                    className="text-ice"
                  />

                  Médicos do local (
                  {
                    medicoIds.length
                  }
                  )
                </h2>

                <p className="mt-1 text-[10px] leading-4 text-ink-faint">
                  Relação estrutural global de profissionais que atendem nesta unidade.
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

                    setIsMedicoModalOpen(
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
                  Nenhum médico vinculado diretamente a este local.
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

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.07,
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
                Estes registros são apenas contexto e não fazem parte do cadastro global do Local.
              </p>
            </div>

            {!activePersonId ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Selecione uma pessoa para visualizar o histórico relacionado.
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
                      Retiradas
                    </p>

                    <p className="mt-1 text-lg font-semibold text-ink-primary">
                      {
                        renovacoesVinculadas.length
                      }
                    </p>
                  </div>
                </div>

                {consultasVinculadas.length ===
                  0 &&
                renovacoesVinculadas.length ===
                  0 ? (
                  <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                    <p className="text-xs text-ink-muted">
                      Nenhum registro da pessoa ativa está relacionado a este local.
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

                    {renovacoesVinculadas
                      .slice(
                        0,
                        3
                      )
                      .map(
                        (
                          renovacao
                        ) => (
                          <div
                            key={
                              renovacao.id
                            }
                            className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                              <Calendar
                                size={14}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-ink-primary">
                                Retirada / renovação
                              </p>

                              <p className="mt-0.5 text-[10px] text-ink-muted">
                                {formatDateDisplay(
                                  renovacao.data
                                )}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </section>

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

        <SelectionModal<Medico>
          isOpen={
            isMedicoModalOpen
          }
          onClose={() =>
            setIsMedicoModalOpen(
              false
            )
          }
          onSelect={
            handleAddMedico
          }
          items={
            medicosDisponiveis
          }
          title="Selecionar Médico"
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ice/10 text-ice">
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
            setIsMedicoModalOpen(
              false
            );

            router.push(
              "/saude/medicos/novo"
            );
          }}
          createNewLabel="Cadastrar Novo Médico"
        />

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
          title="Excluir local"
          message={`Tem certeza que deseja excluir "${nome}"? Como este Local é global, ele será desvinculado dos registros relacionados de todas as pessoas. CIDs, tratamentos, consultas, exames, cirurgias, medicamentos e renovações serão preservados.`}
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

export default function EditarLocalPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <EditarLocalContent />
    </Suspense>
  );
}