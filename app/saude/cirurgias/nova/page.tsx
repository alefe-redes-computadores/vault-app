// app/saude/cirurgias/novo/page.tsx
"use client";

import {
  useRef,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  motion,
} from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Brain,
  Building2,
  Calendar,
  Clock,
  Eraser,
  Flame,
  HeartPulse,
  Loader2,
  MapPin,
  Plus,
  ShieldAlert,
  UserCheck,
  X,
} from "lucide-react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  useHapticFeedback,
} from "@/lib/haptics";
import {
  getClinicalTheme,
} from "@/lib/health-utils";
import {
  tratamentosRepository,
} from "@/lib/repositories/tratamentos";
import {
  cidsRepository,
} from "@/lib/repositories/cids";

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
  SelectionModal,
} from "@/components/SelectionModal";
import {
  BottomSheet,
} from "@/components/ui/BottomSheet";
import {
  useToast,
} from "@/components/ToastProvider";

import type {
  Cid,
  Hospital,
  LocalSaude,
  Medico,
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
// HELPERS
// ============================================================

function getTodayISO(): string {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function formatDateToDisplay(
  isoStr: string
): string {
  if (!isoStr) {
    return "";
  }

  const parts =
    isoStr.split("-");

  if (
    parts.length !==
    3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseDateToISO(
  displayStr: string
): string | undefined {
  const clean =
    displayStr.replace(
      /\D/g,
      ""
    );

  if (
    clean.length !==
    8
  ) {
    return undefined;
  }

  const day =
    Number(
      clean.slice(
        0,
        2
      )
    );

  const month =
    Number(
      clean.slice(
        2,
        4
      )
    );

  const year =
    Number(
      clean.slice(
        4,
        8
      )
    );

  const parsed =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    parsed.getFullYear() !==
      year ||
    parsed.getMonth() !==
      month - 1 ||
    parsed.getDate() !==
      day
  ) {
    return undefined;
  }

  return `${String(
    year
  ).padStart(
    4,
    "0"
  )}-${String(
    month
  ).padStart(
    2,
    "0"
  )}-${String(
    day
  ).padStart(
    2,
    "0"
  )}`;
}

function handleDateMask(
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
        8
      );

  if (
    clean.length >
    4
  ) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(
      2,
      4
    )}/${clean.slice(4)}`;
  }

  if (
    clean.length >
    2
  ) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(2)}`;
  }

  return clean;
}

function handleTimeMask(
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
        4
      );

  if (
    clean.length >
    2
  ) {
    return `${clean.slice(
      0,
      2
    )}:${clean.slice(2)}`;
  }

  return clean;
}

function isValidTime(
  value: string
): boolean {
  if (!value) {
    return true;
  }

  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value
  );
}

function getTratamentoIcon(
  nome: string
) {
  const normalized =
    nome.toLowerCase();

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

// ============================================================
// PAGE
// ============================================================

export default function NovaCirurgiaPage() {
  const router =
    useRouter();

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
  } =
    useActivePersonId();

  const {
    addCirurgia,
  } =
    useCirurgias();

  const {
    run,
    isSubmitting,
  } =
    useSubmitAction();

  const isSubmitLocked =
    useRef(false);

  // ==========================================================
  // CADASTROS GLOBAIS
  // ==========================================================

  const medicos =
    useLiveQuery(
      () =>
        db.medicos.toArray(),
      [],
      []
    ) || [];

  const hospitais =
    useLiveQuery(
      () =>
        db.hospitais.toArray(),
      [],
      []
    ) || [];

  const locais =
    useLiveQuery(
      () =>
        db.locais.toArray(),
      [],
      []
    ) || [];

  // ==========================================================
  // DADOS DA PESSOA ATIVA
  // ==========================================================

  const tratamentos =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.tratamentos
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
    ) || [];

  const cids =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.cids
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
    ) || [];

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    procedimento,
    setProcedimento,
  ] =
    useState("");

  const [
    medicoId,
    setMedicoId,
  ] =
    useState("");

  const [
    hospitalId,
    setHospitalId,
  ] =
    useState("");

  const [
    localId,
    setLocalId,
  ] =
    useState("");

  const [
    dataDisplay,
    setDataDisplay,
  ] =
    useState(
      formatDateToDisplay(
        getTodayISO()
      )
    );

  const [
    horario,
    setHorario,
  ] =
    useState("");

  const [
    status,
    setStatus,
  ] =
    useState<
      | "agendada"
      | "realizada"
      | "cancelada"
    >(
      "agendada"
    );

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
  // MODAIS
  // ==========================================================

  const [
    isMedicoModalOpen,
    setIsMedicoModalOpen,
  ] =
    useState(false);

  const [
    isHospitalModalOpen,
    setIsHospitalModalOpen,
  ] =
    useState(false);

  const [
    isLocalModalOpen,
    setIsLocalModalOpen,
  ] =
    useState(false);

  const [
    tratamentosSelecionados,
    setTratamentosSelecionados,
  ] =
    useState<string[]>(
      []
    );

  const [
    cidsSelecionados,
    setCidsSelecionados,
  ] =
    useState<string[]>(
      []
    );

  const [
    isTratamentoModalOpen,
    setIsTratamentoModalOpen,
  ] =
    useState(false);

  const [
    isCidModalOpen,
    setIsCidModalOpen,
  ] =
    useState(false);

  // ==========================================================
  // CRIAÇÃO RÁPIDA
  // ==========================================================

  const [
    isCreatingTratamento,
    setIsCreatingTratamento,
  ] =
    useState(false);

  const [
    newTratamentoName,
    setNewTratamentoName,
  ] =
    useState("");

  const [
    isSavingTratamento,
    setIsSavingTratamento,
  ] =
    useState(false);

  const [
    isCreatingCid,
    setIsCreatingCid,
  ] =
    useState(false);

  const [
    newCidCodigo,
    setNewCidCodigo,
  ] =
    useState("");

  const [
    newCidDescricao,
    setNewCidDescricao,
  ] =
    useState("");

  const [
    isSavingCid,
    setIsSavingCid,
  ] =
    useState(false);

  // ==========================================================
  // SELECIONADOS
  // ==========================================================

  const selectedMedico =
    medicos.find(
      (
        medico
      ) =>
        medico.id ===
        medicoId
    );

  const selectedHospital =
    hospitais.find(
      (
        hospital
      ) =>
        hospital.id ===
        hospitalId
    );

  const selectedLocal =
    locais.find(
      (
        local
      ) =>
        local.id ===
        localId
    );

  // ==========================================================
  // ERROS
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
            !previous[
              key
            ]
          ) {
            return previous;
          }

          const next = {
            ...previous,
          };

          delete next[
            key
          ];

          return next;
        }
      );
    };

  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  const validate =
    (): boolean => {
      const newErrors: Record<
        string,
        string
      > = {};

      if (
        !activePersonId
      ) {
        newErrors.person_id =
          "Pessoa ativa não identificada";
      }

      if (
        !procedimento.trim()
      ) {
        newErrors.procedimento =
          "O nome do procedimento é obrigatório";
      }

      if (
        !parseDateToISO(
          dataDisplay
        )
      ) {
        newErrors.data =
          "Informe uma data válida";
      }

      if (
        !isValidTime(
          horario
        )
      ) {
        newErrors.horario =
          "Horário inválido (use HH:MM)";
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
  // CRIAÇÃO RÁPIDA — TRATAMENTO
  // ==========================================================

  const handleCreateTratamento =
    async () => {
      const nome =
        newTratamentoName.trim();

      if (
        !nome ||
        isSavingTratamento
      ) {
        return;
      }

      if (
        !activePersonId
      ) {
        trigger(
          "error"
        );

        showToast(
          "Selecione uma pessoa antes de criar um tratamento.",
          "error"
        );

        return;
      }

      setIsSavingTratamento(
        true
      );

      trigger(
        "vibrate"
      );

      try {
        const newId =
          await tratamentosRepository.create(
            {
              nome,

              status:
                "ativo",

              person_id:
                activePersonId,
            }
          );

        setTratamentosSelecionados(
          (
            previous
          ) =>
            previous.includes(
              newId
            )
              ? previous
              : [
                  ...previous,
                  newId,
                ]
        );

        showToast(
          "Tratamento cadastrado",
          "success"
        );

        setIsCreatingTratamento(
          false
        );

        setNewTratamentoName(
          ""
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao cadastrar tratamento:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao cadastrar tratamento",
          "error"
        );
      } finally {
        setIsSavingTratamento(
          false
        );
      }
    };

  // ==========================================================
  // CRIAÇÃO RÁPIDA — CID
  // ==========================================================

  const handleCreateCid =
    async () => {
      const codigo =
        newCidCodigo.trim();

      const descricao =
        newCidDescricao.trim();

      if (
        !codigo ||
        !descricao ||
        isSavingCid
      ) {
        return;
      }

      if (
        !activePersonId
      ) {
        trigger(
          "error"
        );

        showToast(
          "Selecione uma pessoa antes de criar um CID.",
          "error"
        );

        return;
      }

      setIsSavingCid(
        true
      );

      trigger(
        "vibrate"
      );

      try {
        const newId =
          await cidsRepository.create(
            {
              codigo,

              descricao,

              person_id:
                activePersonId,
            }
          );

        setCidsSelecionados(
          (
            previous
          ) =>
            previous.includes(
              newId
            )
              ? previous
              : [
                  ...previous,
                  newId,
                ]
        );

        showToast(
          "CID cadastrado",
          "success"
        );

        setIsCreatingCid(
          false
        );

        setNewCidCodigo(
          ""
        );

        setNewCidDescricao(
          ""
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao cadastrar CID:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao cadastrar CID",
          "error"
        );
      } finally {
        setIsSavingCid(
          false
        );
      }
    };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    () => {
      trigger(
        "vibrate"
      );

      if (
        !validate()
      ) {
        trigger(
          "error"
        );

        showToast(
          "Revise os campos antes de salvar.",
          "error"
        );

        return;
      }

      if (
        !activePersonId
      ) {
        trigger(
          "error"
        );

        showToast(
          "Pessoa ativa não identificada.",
          "error"
        );

        return;
      }

      if (
        isSubmitLocked.current ||
        isSubmitting
      ) {
        return;
      }

      isSubmitLocked.current =
        true;

      run(
        async () => {
          try {
            const dataISO =
              parseDateToISO(
                dataDisplay
              );

            if (!dataISO) {
              throw new Error(
                "Data inválida"
              );
            }

            /*
             * A página não injeta user_id nem person_id.
             * useCirurgias garante a pessoa ativa e o
             * repository injeta o usuário autenticado.
             */
            await addCirurgia(
              {
                procedimento:
                  procedimento.trim(),

                medico_id:
                  medicoId ||
                  undefined,

                hospital_id:
                  hospitalId ||
                  undefined,

                local_id:
                  localId ||
                  undefined,

                data:
                  dataISO,

                horario:
                  horario ||
                  undefined,

                status,

                observacoes:
                  observacoes.trim() ||
                  undefined,

                tratamento_ids:
                  tratamentosSelecionados.length >
                  0
                    ? Array.from(
                        new Set(
                          tratamentosSelecionados
                        )
                      )
                    : undefined,

                cid_ids:
                  cidsSelecionados.length >
                  0
                    ? Array.from(
                        new Set(
                          cidsSelecionados
                        )
                      )
                    : undefined,
              }
            );
          } finally {
            isSubmitLocked.current =
              false;
          }
        },
        {
          successMessage:
            "Cirurgia criada com sucesso",

          errorMessage:
            "Erro ao criar cirurgia",

          goBackOnSuccess:
            true,
        }
      );
    };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
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
                size={
                  18
                }
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Activity
                  size={
                    16
                  }
                  className="text-coral"
                />

                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-coral/90">
                  Clínico
                </p>
              </div>

              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Nova Cirurgia
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {!activePersonId && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              className="rounded-[24px] border border-coral/30 bg-coral/10 p-4"
            >
              <p className="text-sm font-semibold text-coral">
                Pessoa ativa não identificada
              </p>

              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Selecione uma pessoa no Vault antes de cadastrar uma cirurgia.
              </p>
            </motion.div>
          )}

          {/* ==================================================
              PROCEDIMENTO
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Procedimento / Cirurgia"
              placeholder="Ex: Artrodese, Apendicectomia..."
              value={
                procedimento
              }
              onChange={(
                event
              ) => {
                setProcedimento(
                  event.target.value
                );

                clearError(
                  "procedimento"
                );
              }}
              error={
                errors.procedimento
              }
              required
            />
          </motion.div>

          {/* ==================================================
              TRATAMENTOS / CIDS
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
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Activity
                  size={
                    16
                  }
                  className="shrink-0 text-violet-400"
                />

                <label className="text-sm font-semibold text-ink-primary">
                  Tratamentos e CIDs Relacionados
                </label>
              </div>

              {(tratamentosSelecionados.length >
                0 ||
                cidsSelecionados.length >
                  0) && (
                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    setTratamentosSelecionados(
                      []
                    );

                    setCidsSelecionados(
                      []
                    );
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                >
                  <Eraser
                    size={
                      12
                    }
                  />

                  Limpar
                </button>
              )}
            </div>

            {tratamentosSelecionados.length >
              0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {tratamentosSelecionados.map(
                  (
                    tratamentoId
                  ) => {
                    const tratamento =
                      tratamentos.find(
                        (
                          item
                        ) =>
                          item.id ===
                          tratamentoId
                      );

                    if (
                      !tratamento
                    ) {
                      return null;
                    }

                    const IconComp =
                      getTratamentoIcon(
                        tratamento.nome
                      );

                    return (
                      <div
                        key={
                          tratamentoId
                        }
                        className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5"
                      >
                        <IconComp
                          size={
                            14
                          }
                          className="text-violet-400"
                        />

                        <span className="text-xs font-medium text-violet-300">
                          {
                            tratamento.nome
                          }
                        </span>

                        <button
                          type="button"
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();

                            trigger(
                              "vibrate"
                            );

                            setTratamentosSelecionados(
                              (
                                previous
                              ) =>
                                previous.filter(
                                  (
                                    item
                                  ) =>
                                    item !==
                                    tratamentoId
                                )
                            );
                          }}
                          className="ml-1 text-violet-400/60 transition-colors hover:text-coral"
                          aria-label={`Remover ${tratamento.nome}`}
                        >
                          <X
                            size={
                              14
                            }
                          />
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {cidsSelecionados.length >
              0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {cidsSelecionados.map(
                  (
                    cidId
                  ) => {
                    const cid =
                      cids.find(
                        (
                          item
                        ) =>
                          item.id ===
                          cidId
                      );

                    if (
                      !cid
                    ) {
                      return null;
                    }

                    const theme =
                      getClinicalTheme(
                        cid.descricao ||
                          cid.codigo
                      );

                    const IconComp =
                      theme.icon;

                    return (
                      <div
                        key={
                          cidId
                        }
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${theme.tagClass}`}
                      >
                        <IconComp
                          size={
                            14
                          }
                        />

                        <span className="text-xs font-medium">
                          {
                            cid.codigo
                          }
                        </span>

                        <button
                          type="button"
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();

                            trigger(
                              "vibrate"
                            );

                            setCidsSelecionados(
                              (
                                previous
                              ) =>
                                previous.filter(
                                  (
                                    item
                                  ) =>
                                    item !==
                                    cidId
                                )
                            );
                          }}
                          className="ml-1 text-current/60 transition-colors hover:text-coral"
                          aria-label={`Remover ${cid.codigo}`}
                        >
                          <X
                            size={
                              14
                            }
                          />
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={
                  !activePersonId
                }
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsTratamentoModalOpen(
                    true
                  );
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-4 py-3 text-violet-300 transition-colors hover:bg-violet-400/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus
                  size={
                    16
                  }
                />

                <span className="text-sm font-medium">
                  Vincular Tratamento
                </span>
              </button>

              <button
                type="button"
                disabled={
                  !activePersonId
                }
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsCidModalOpen(
                    true
                  );
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-emerald-300 transition-colors hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus
                  size={
                    16
                  }
                />

                <span className="text-sm font-medium">
                  Vincular CID
                </span>
              </button>
            </div>
          </motion.div>

          {/* ==================================================
              EQUIPE / LOCAL
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.03,
            }}
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-ink-primary">
                  Médico / Cirurgião
                </label>

                {medicoId &&
                  selectedMedico && (
                    <button
                      type="button"
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        setMedicoId(
                          ""
                        );
                      }}
                      className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                    >
                      <Eraser
                        size={
                          12
                        }
                      />

                      Limpar
                    </button>
                  )}
              </div>

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
                className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserCheck
                    size={
                      16
                    }
                    className="shrink-0 text-coral"
                  />

                  <span className="truncate">
                    {selectedMedico
                      ? `Dr(a). ${selectedMedico.nome}`
                      : "Selecionar equipe médica"}
                  </span>
                </div>
              </button>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-ink-primary">
                  Hospital
                </label>

                {hospitalId &&
                  selectedHospital && (
                    <button
                      type="button"
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        setHospitalId(
                          ""
                        );
                      }}
                      className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                    >
                      <Eraser
                        size={
                          12
                        }
                      />

                      Limpar
                    </button>
                  )}
              </div>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsHospitalModalOpen(
                    true
                  );
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Building2
                    size={
                      16
                    }
                    className="shrink-0 text-violet-400"
                  />

                  <span className="truncate">
                    {selectedHospital
                      ? selectedHospital.nome
                      : "Vincular hospital..."}
                  </span>
                </div>
              </button>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-ink-primary">
                  Clínica / Ambulatório
                </label>

                {localId &&
                  selectedLocal && (
                    <button
                      type="button"
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        setLocalId(
                          ""
                        );
                      }}
                      className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                    >
                      <Eraser
                        size={
                          12
                        }
                      />

                      Limpar
                    </button>
                  )}
              </div>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsLocalModalOpen(
                    true
                  );
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <MapPin
                    size={
                      16
                    }
                    className="shrink-0 text-emerald-400"
                  />

                  <span className="truncate">
                    {selectedLocal
                      ? selectedLocal.nome
                      : "Vincular local..."}
                  </span>
                </div>
              </button>
            </div>
          </motion.div>

          {/* ==================================================
              DATA / HORÁRIO / STATUS
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.09,
            }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">
                  Data{" "}
                  <span className="text-coral">
                    *
                  </span>
                </label>

                <div className="relative">
                  <Calendar
                    size={
                      16
                    }
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  />

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/AAAA"
                    maxLength={
                      10
                    }
                    value={
                      dataDisplay
                    }
                    onChange={(
                      event
                    ) => {
                      setDataDisplay(
                        handleDateMask(
                          event.target.value
                        )
                      );

                      clearError(
                        "data"
                      );
                    }}
                    className={`w-full rounded-2xl border ${
                      errors.data
                        ? "border-coral/50"
                        : "border-surface-border/50"
                    } bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none focus:border-coral/50`}
                    aria-label="Data da cirurgia"
                  />
                </div>

                {errors.data && (
                  <p className="ml-1 text-xs text-coral">
                    {
                      errors.data
                    }
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">
                  Horário
                </label>

                <div className="relative">
                  <Clock
                    size={
                      16
                    }
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  />

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="00:00"
                    maxLength={
                      5
                    }
                    value={
                      horario
                    }
                    onChange={(
                      event
                    ) => {
                      setHorario(
                        handleTimeMask(
                          event.target.value
                        )
                      );

                      clearError(
                        "horario"
                      );
                    }}
                    className={`w-full rounded-2xl border ${
                      errors.horario
                        ? "border-coral/50 text-coral"
                        : "border-surface-border/50 text-ink-primary"
                    } bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm outline-none focus:border-coral/50`}
                    aria-label="Horário da cirurgia"
                  />
                </div>

                {errors.horario && (
                  <p className="ml-1 text-xs text-coral">
                    {
                      errors.horario
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 border-t border-surface-border/30 pt-2">
              <label className="text-sm font-medium text-ink-primary">
                Status
              </label>

              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    "agendada",
                    "realizada",
                    "cancelada",
                  ] as const
                ).map(
                  (
                    item
                  ) => (
                    <button
                      key={
                        item
                      }
                      type="button"
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        setStatus(
                          item
                        );
                      }}
                      className={`rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        status ===
                        item
                          ? "bg-coral text-void shadow-sm"
                          : "border border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                      aria-pressed={
                        status ===
                        item
                      }
                    >
                      {
                        item
                      }
                    </button>
                  )
                )}
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              OBSERVAÇÕES
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.12,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Orientações e Preparo"
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
              placeholder="Jejum, medicações, documentos, itens para levar..."
            />
          </motion.div>
        </section>

        {/* ====================================================
            SALVAR
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
              isSubmitting ||
              !activePersonId
            }
            className="border-none bg-coral text-void hover:bg-coral-light"
          >
            {isSubmitting ? (
              <>
                <Loader2
                  size={
                    16
                  }
                  className="animate-spin"
                />

                Salvando...
              </>
            ) : (
              "Salvar Cirurgia"
            )}
          </Button>
        </div>

        {/* ====================================================
            MÉDICO
            ==================================================== */}

        <SelectionModal<Medico>
          isOpen={
            isMedicoModalOpen
          }
          onClose={() =>
            setIsMedicoModalOpen(
              false
            )
          }
          onSelect={(
            item
          ) => {
            if (
              !item.id
            ) {
              return;
            }

            trigger(
              "vibrate"
            );

            setMedicoId(
              item.id
            );

            setIsMedicoModalOpen(
              false
            );
          }}
          items={
            medicos
          }
          title="Selecionar Cirurgião"
          renderItem={(
            item
          ) => (
            <div>
              <p className="font-medium text-ink-primary">
                Dr(a).{" "}
                {
                  item.nome
                }
              </p>

              {item.especialidade && (
                <p className="text-xs text-ink-muted">
                  {
                    item.especialidade
                  }
                </p>
              )}
            </div>
          )}
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

        {/* ====================================================
            HOSPITAL
            ==================================================== */}

        <SelectionModal<Hospital>
          isOpen={
            isHospitalModalOpen
          }
          onClose={() =>
            setIsHospitalModalOpen(
              false
            )
          }
          onSelect={(
            item
          ) => {
            if (
              !item.id
            ) {
              return;
            }

            trigger(
              "vibrate"
            );

            setHospitalId(
              item.id
            );

            setIsHospitalModalOpen(
              false
            );
          }}
          items={
            hospitais
          }
          title="Selecionar Hospital"
          renderItem={(
            item
          ) => (
            <div>
              <p className="font-medium text-ink-primary">
                {
                  item.nome
                }
              </p>

              {item.endereco && (
                <p className="text-xs text-ink-muted">
                  {
                    item.endereco
                  }
                </p>
              )}
            </div>
          )}
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
          onCreateNew={() => {
            setIsHospitalModalOpen(
              false
            );

            router.push(
              "/saude/hospitais/novo"
            );
          }}
          createNewLabel="Cadastrar Novo Hospital"
        />

        {/* ====================================================
            LOCAL
            ==================================================== */}

        <SelectionModal<LocalSaude>
          isOpen={
            isLocalModalOpen
          }
          onClose={() =>
            setIsLocalModalOpen(
              false
            )
          }
          onSelect={(
            item
          ) => {
            if (
              !item.id
            ) {
              return;
            }

            trigger(
              "vibrate"
            );

            setLocalId(
              item.id
            );

            setIsLocalModalOpen(
              false
            );
          }}
          items={
            locais
          }
          title="Selecionar Local / Clínica"
          renderItem={(
            item
          ) => (
            <div>
              <p className="font-medium text-ink-primary">
                {
                  item.nome
                }
              </p>

              {item.endereco && (
                <p className="text-xs text-ink-muted">
                  {
                    item.endereco
                  }
                </p>
              )}
            </div>
          )}
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
          onCreateNew={() => {
            setIsLocalModalOpen(
              false
            );

            router.push(
              "/saude/locais/novo"
            );
          }}
          createNewLabel="Cadastrar Novo Local"
        />

        {/* ====================================================
            TRATAMENTOS
            ==================================================== */}

        <SelectionModal<Tratamento>
          isOpen={
            isTratamentoModalOpen
          }
          onClose={() =>
            setIsTratamentoModalOpen(
              false
            )
          }
          onSelect={(
            item
          ) => {
            if (
              !item.id
            ) {
              return;
            }

            trigger(
              "vibrate"
            );

            setTratamentosSelecionados(
              (
                previous
              ) =>
                previous.includes(
                  item.id!
                )
                  ? previous
                  : [
                      ...previous,
                      item.id!,
                    ]
            );
          }}
          items={
            tratamentos
          }
          title="Vincular Tratamentos"
          placeholder="Buscar tratamento..."
          renderItem={(
            item
          ) => {
            const IconComp =
              getTratamentoIcon(
                item.nome
              );

            const isSelected =
              Boolean(
                item.id &&
                  tratamentosSelecionados.includes(
                    item.id
                  )
              );

            return (
              <div className="flex w-full items-center gap-2">
                <IconComp
                  size={
                    16
                  }
                  className="text-violet-400"
                />

                <span
                  className={`text-sm font-medium ${
                    isSelected
                      ? "text-violet-400"
                      : "text-ink-primary"
                  }`}
                >
                  {
                    item.nome
                  }
                </span>

                {isSelected && (
                  <span className="ml-auto text-[10px] text-emerald-400">
                    ✓
                  </span>
                )}
              </div>
            );
          }}
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
          onCreateNew={() => {
            setIsTratamentoModalOpen(
              false
            );

            setIsCreatingTratamento(
              true
            );
          }}
          createNewLabel="Cadastrar Novo Tratamento"
        />

        {/* ====================================================
            CIDS
            ==================================================== */}

        <SelectionModal<Cid>
          isOpen={
            isCidModalOpen
          }
          onClose={() =>
            setIsCidModalOpen(
              false
            )
          }
          onSelect={(
            item
          ) => {
            if (
              !item.id
            ) {
              return;
            }

            trigger(
              "vibrate"
            );

            setCidsSelecionados(
              (
                previous
              ) =>
                previous.includes(
                  item.id!
                )
                  ? previous
                  : [
                      ...previous,
                      item.id!,
                    ]
            );
          }}
          items={
            cids
          }
          title="Vincular CIDs"
          placeholder="Buscar CID..."
          renderItem={(
            item
          ) => {
            const theme =
              getClinicalTheme(
                item.descricao ||
                  item.codigo
              );

            const IconComp =
              theme.icon;

            const isSelected =
              Boolean(
                item.id &&
                  cidsSelecionados.includes(
                    item.id
                  )
              );

            return (
              <div className="flex w-full items-center gap-2">
                <IconComp
                  size={
                    16
                  }
                  className={
                    theme.textClass
                  }
                />

                <span
                  className={`text-sm font-medium ${
                    isSelected
                      ? theme.textClass
                      : "text-ink-primary"
                  }`}
                >
                  {
                    item.codigo
                  }{" "}
                  -{" "}
                  {
                    item.descricao
                  }
                </span>

                {isSelected && (
                  <span className="ml-auto text-[10px] text-emerald-400">
                    ✓
                  </span>
                )}
              </div>
            );
          }}
          getItemId={(
            item
          ) =>
            item.id!
          }
          getItemLabel={(
            item
          ) =>
            `${item.codigo} - ${item.descricao}`
          }
          onCreateNew={() => {
            setIsCidModalOpen(
              false
            );

            setIsCreatingCid(
              true
            );
          }}
          createNewLabel="Cadastrar Novo CID"
        />

        {/* ====================================================
            CRIAÇÃO RÁPIDA — TRATAMENTO
            ==================================================== */}

        <BottomSheet
          isOpen={
            isCreatingTratamento
          }
          onClose={() =>
            setIsCreatingTratamento(
              false
            )
          }
          title="Novo Tratamento"
        >
          <div className="space-y-4 px-1 pb-2">
            <Input
              label="Nome do Tratamento"
              value={
                newTratamentoName
              }
              onChange={(
                event
              ) =>
                setNewTratamentoName(
                  event.target.value
                )
              }
              autoFocus
            />

            <Button
              variant="primary"
              fullWidth
              onClick={
                handleCreateTratamento
              }
              disabled={
                !newTratamentoName.trim() ||
                isSavingTratamento ||
                !activePersonId
              }
            >
              {isSavingTratamento ? (
                <Loader2
                  size={
                    16
                  }
                  className="animate-spin"
                />
              ) : (
                "Salvar e Selecionar"
              )}
            </Button>
          </div>
        </BottomSheet>

        {/* ====================================================
            CRIAÇÃO RÁPIDA — CID
            ==================================================== */}

        <BottomSheet
          isOpen={
            isCreatingCid
          }
          onClose={() =>
            setIsCreatingCid(
              false
            )
          }
          title="Novo CID"
        >
          <div className="space-y-4 px-1 pb-2">
            <Input
              label="Código CID"
              placeholder="Ex: F90.0"
              value={
                newCidCodigo
              }
              onChange={(
                event
              ) =>
                setNewCidCodigo(
                  event.target.value
                )
              }
              autoFocus
            />

            <Input
              label="Descrição"
              placeholder="Ex: Transtorno de déficit de atenção"
              value={
                newCidDescricao
              }
              onChange={(
                event
              ) =>
                setNewCidDescricao(
                  event.target.value
                )
              }
            />

            <Button
              variant="primary"
              fullWidth
              onClick={
                handleCreateCid
              }
              disabled={
                !newCidCodigo.trim() ||
                !newCidDescricao.trim() ||
                isSavingCid ||
                !activePersonId
              }
            >
              {isSavingCid ? (
                <Loader2
                  size={
                    16
                  }
                  className="animate-spin"
                />
              ) : (
                "Salvar e Selecionar"
              )}
            </Button>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}