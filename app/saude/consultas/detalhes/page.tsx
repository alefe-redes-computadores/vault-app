// app/saude/consultas/detalhes/page.tsx
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
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
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  FileText,
  FlaskConical,
  MapPin,
  Paperclip,
  Pill,
  Stethoscope,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  getClinicalTheme,
  getDaysUntil,
} from "@/lib/health-utils";

import {
  useConsultas,
} from "@/hooks/useConsultas";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useMounted,
} from "@/hooks/useMounted";

import {
  useTratamentos,
} from "@/hooks/useTratamentos";

import {
  useCids,
} from "@/hooks/useCids";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useExames,
} from "@/hooks/useExames";

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
  PageTransition,
} from "@/components/PageTransition";

import {
  DetailSkeleton,
} from "@/components/loading/DetailSkeleton";

import {
  ConfirmationModal,
} from "@/components/ConfirmationModal";

import {
  DetailInfoRow,
  SectionTitle,
} from "@/components/detail/DetailComponents";

import type {
  Cid,
  Consulta,
  Exame,
  Hospital,
  LocalSaude,
  Medicamento,
  Medico,
  Tratamento,
} from "@/lib/types";

// ============================================================
// HELPERS
// ============================================================

const fadeUp = {
  initial: {
    opacity:
      0,

    y:
      12,
  },

  animate: {
    opacity:
      1,

    y:
      0,
  },
};

function getCivilDate(
  value?: string
): string {
  if (
    !value
  ) {
    return "";
  }

  return value.includes(
    "T"
  )
    ? value.split(
        "T"
      )[0]
    : value;
}

function formatDateDisplay(
  isoStr?: string
): string {
  if (
    !isoStr
  ) {
    return "Não informado";
  }

  const datePart =
    getCivilDate(
      isoStr
    );

  const parts =
    datePart.split(
      "-"
    );

  if (
    parts.length !==
    3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getStatusConfig(
  status: string
): {
  color: string;

  icon:
    | typeof Clock
    | typeof CheckCircle2
    | typeof XCircle
    | typeof Stethoscope;
} {
  switch (
    status
  ) {
    case "agendada":
      return {
        color:
          "#34D399",

        icon:
          Clock,
      };

    case "realizada":
      return {
        color:
          "#38BDF8",

        icon:
          CheckCircle2,
      };

    case "cancelada":
      return {
        color:
          "#EF4444",

        icon:
          XCircle,
      };

    default:
      return {
        color:
          "#38BDF8",

        icon:
          Stethoscope,
      };
  }
}

function getStatusLabel(
  status: string
): string {
  switch (
    status
  ) {
    case "agendada":
      return "Agendada";

    case "realizada":
      return "Realizada";

    case "cancelada":
      return "Cancelada";

    default:
      return status;
  }
}

function getDiasRestantesLabel(
  dias: number | null
): string | null {
  if (
    dias ===
    null
  ) {
    return null;
  }

  if (
    dias ===
    0
  ) {
    return "Hoje";
  }

  if (
    dias <
    0
  ) {
    const absolute =
      Math.abs(
        dias
      );

    return `Há ${absolute} dia${
      absolute >
      1
        ? "s"
        : ""
    }`;
  }

  return `Em ${dias} dia${
    dias >
    1
      ? "s"
      : ""
  }`;
}

function intersects(
  ids:
    | string[]
    | undefined,
  referenceIds:
    Set<string>
): boolean {
  if (
    !ids?.length ||
    referenceIds.size ===
      0
  ) {
    return false;
  }

  return ids.some(
    (
      id
    ) =>
      referenceIds.has(
        id
      )
  );
}

// ============================================================
// CONTENT
// ============================================================

function DetalhesConsultaContent() {
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
    activePersonId,
  } =
    useActivePersonId();

  const {
    getConsulta,
    updateConsulta,
    deleteConsulta,
  } =
    useConsultas();

  // ==========================================================
  // DOMAIN DATA
  // ==========================================================

  const {
    tratamentos = [],
  } =
    useTratamentos();

  const {
    cids = [],
  } =
    useCids();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    exames = [],
  } =
    useExames();

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

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    consulta,
    setConsulta,
  ] =
    useState<Consulta | null>(
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
    isUpdatingStatus,
    setIsUpdatingStatus,
  ] =
    useState(
      false
    );

  // ==========================================================
  // PERSON-OWNED SECOND BARRIERS
  //
  // Os hooks já devem devolver somente a pessoa ativa.
  //
  // Esta tela cruza vários domínios clínicos, portanto mantém
  // uma segunda barreira explícita antes de qualquer relação.
  // ==========================================================

  const scopedTratamentos =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return tratamentos.filter(
          (
            tratamento
          ) =>
            tratamento.person_id ===
            activePersonId
        );
      },
      [
        tratamentos,
        activePersonId,
      ]
    );

  const scopedCids =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return cids.filter(
          (
            cid
          ) =>
            cid.person_id ===
            activePersonId
        );
      },
      [
        cids,
        activePersonId,
      ]
    );

  const scopedMedicamentos =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return medicamentos.filter(
          (
            medicamento
          ) =>
            medicamento.person_id ===
            activePersonId
        );
      },
      [
        medicamentos,
        activePersonId,
      ]
    );

  const scopedExames =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return exames.filter(
          (
            exame
          ) =>
            exame.person_id ===
            activePersonId
        );
      },
      [
        exames,
        activePersonId,
      ]
    );

  // ==========================================================
  // LOAD CONSULTA
  // ==========================================================

  useEffect(
    () => {
      if (
        !id
      ) {
        router.replace(
          "/saude/consultas"
        );

        return;
      }

      if (
        !activePersonId
      ) {
        setConsulta(
          null
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
            const data =
              await getConsulta(
                id
              );

            if (
              cancelled
            ) {
              return;
            }

            /*
             * getConsulta() já é person-scoped, porém a tela
             * mantém uma segunda validação de ownership.
             */
            if (
              !data ||
              data.person_id !==
                activePersonId
            ) {
              router.replace(
                "/saude/consultas"
              );

              return;
            }

            setConsulta(
              data
            );
          } catch (
            error
          ) {
            console.error(
              "Erro ao buscar detalhes da consulta:",
              error
            );

            if (
              !cancelled
            ) {
              router.replace(
                "/saude/consultas"
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
    },
    [
      id,
      activePersonId,
      getConsulta,
      router,
    ]
  );

  // ==========================================================
  // GLOBAL RELATIONS
  // ==========================================================

  const medico =
    useMemo<
      Medico | null
    >(
      () => {
        if (
          !consulta?.medico_id
        ) {
          return null;
        }

        return (
          medicos.find(
            (
              item
            ) =>
              item.id ===
              consulta.medico_id
          ) ||
          null
        );
      },
      [
        consulta?.medico_id,
        medicos,
      ]
    );

  const hospital =
    useMemo<
      Hospital | null
    >(
      () => {
        if (
          !consulta?.hospital_id
        ) {
          return null;
        }

        return (
          hospitais.find(
            (
              item
            ) =>
              item.id ===
              consulta.hospital_id
          ) ||
          null
        );
      },
      [
        consulta?.hospital_id,
        hospitais,
      ]
    );

  const local =
    useMemo<
      LocalSaude | null
    >(
      () => {
        if (
          !consulta?.local_id
        ) {
          return null;
        }

        return (
          locais.find(
            (
              item
            ) =>
              item.id ===
              consulta.local_id
          ) ||
          null
        );
      },
      [
        consulta?.local_id,
        locais,
      ]
    );

  // ==========================================================
  // DIRECT RELATION IDS
  // ==========================================================

  const tratamentoIds =
    useMemo(
      () =>
        new Set(
          consulta?.tratamento_ids ||
            []
        ),
      [
        consulta?.tratamento_ids,
      ]
    );

  const cidIds =
    useMemo(
      () =>
        new Set(
          consulta?.cid_ids ||
            []
        ),
      [
        consulta?.cid_ids,
      ]
    );

  // ==========================================================
  // TRATAMENTOS DIRETOS
  // ==========================================================

  const tratamentosRelacionados =
    useMemo<
      Tratamento[]
    >(
      () => {
        if (
          !consulta ||
          !activePersonId
        ) {
          return [];
        }

        return scopedTratamentos.filter(
          (
            tratamento
          ) =>
            Boolean(
              tratamento.id &&
                tratamentoIds.has(
                  tratamento.id
                )
            )
        );
      },
      [
        consulta,
        activePersonId,
        scopedTratamentos,
        tratamentoIds,
      ]
    );

  // ==========================================================
  // CIDS DIRETOS
  // ==========================================================

  const cidsRelacionados =
    useMemo<
      Cid[]
    >(
      () => {
        if (
          !consulta ||
          !activePersonId
        ) {
          return [];
        }

        return scopedCids.filter(
          (
            cid
          ) =>
            Boolean(
              cid.id &&
                cidIds.has(
                  cid.id
                )
            )
        );
      },
      [
        consulta,
        activePersonId,
        scopedCids,
        cidIds,
      ]
    );

  // ==========================================================
  // MEDICAMENTOS VIA TRATAMENTOS
  //
  // Não existe aqui uma relação direta Consulta → Medicamento.
  //
  // O vínculo exibido é contextual:
  //
  // Consulta
  //   → Tratamento vinculado
  //     → Medicamento que usa o mesmo tratamento
  // ==========================================================

  const medicamentosRelacionados =
    useMemo<
      Medicamento[]
    >(
      () => {
        if (
          !consulta ||
          !activePersonId ||
          tratamentoIds.size ===
            0
        ) {
          return [];
        }

        return scopedMedicamentos.filter(
          (
            medicamento
          ) =>
            intersects(
              medicamento.tratamento_ids,
              tratamentoIds
            )
        );
      },
      [
        consulta,
        activePersonId,
        scopedMedicamentos,
        tratamentoIds,
      ]
    );

  // ==========================================================
  // EXAMES VIA TRATAMENTOS
  //
  // Também é um vínculo contextual, e não direto.
  // ==========================================================

  const examesRelacionados =
    useMemo<
      Exame[]
    >(
      () => {
        if (
          !consulta ||
          !activePersonId ||
          tratamentoIds.size ===
            0
        ) {
          return [];
        }

        return scopedExames.filter(
          (
            exame
          ) =>
            intersects(
              exame.tratamento_ids,
              tratamentoIds
            )
        );
      },
      [
        consulta,
        activePersonId,
        scopedExames,
        tratamentoIds,
      ]
    );

  // ==========================================================
  // DATE
  // ==========================================================

  const diasRestantes =
    useMemo(
      () => {
        if (
          !consulta?.data
        ) {
          return null;
        }

        return getDaysUntil(
          getCivilDate(
            consulta.data
          )
        );
      },
      [
        consulta?.data,
      ]
    );

  const dataPassada =
    Boolean(
      diasRestantes !==
        null &&
        diasRestantes <
          0
    );

  // ==========================================================
  // SUMMARY
  // ==========================================================

  const totalRelacoes =
    tratamentosRelacionados.length +
    cidsRelacionados.length +
    medicamentosRelacionados.length +
    examesRelacionados.length;

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    !mounted ||
    isLoading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (
    !activePersonId ||
    !consulta ||
    consulta.person_id !==
      activePersonId
  ) {
    return null;
  }

  // ==========================================================
  // VISUAL
  // ==========================================================

  const {
    color:
      statusColor,
    icon:
      StatusIcon,
  } =
    getStatusConfig(
      consulta.status
    );

  const finalBorderColor =
    dataPassada &&
    consulta.status ===
      "agendada"
      ? "#EF4444"
      : statusColor;

  const temHorario =
    Boolean(
      consulta.horario?.trim()
    );

  // ==========================================================
  // STATUS
  // ==========================================================

  const handleStatusChange =
    async (
      novoStatus:
        | "agendada"
        | "realizada"
        | "cancelada"
    ) => {
      if (
        !id ||
        !activePersonId ||
        !consulta ||
        consulta.person_id !==
          activePersonId ||
        isUpdatingStatus
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setIsUpdatingStatus(
        true
      );

      try {
        await updateConsulta(
          id,
          {
            status:
              novoStatus,
          }
        );

        setConsulta(
          (
            previous
          ) =>
            previous &&
            previous.person_id ===
              activePersonId
              ? {
                  ...previous,

                  status:
                    novoStatus,
                }
              : previous
        );

        trigger(
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao atualizar status da consulta:",
          error
        );

        trigger(
          "error"
        );
      } finally {
        setIsUpdatingStatus(
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
        !activePersonId ||
        !consulta ||
        consulta.person_id !==
          activePersonId
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      try {
        await deleteConsulta(
          id
        );

        trigger(
          "success"
        );

        router.replace(
          "/saude/consultas"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao excluir consulta:",
          error
        );

        trigger(
          "error"
        );
      }
    };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
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
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">
                  Painel Clínico
                </p>

                <h1 className="truncate font-display text-lg font-semibold text-ink-primary">
                  Detalhes do Atendimento
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={
                  () => {
                    if (
                      !consulta.id
                    ) {
                      return;
                    }

                    trigger(
                      "vibrate"
                    );

                    router.push(
                      `/saude/consultas/editar?id=${consulta.id}`
                    );
                  }
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
                aria-label="Editar consulta"
              >
                <Edit3
                  size={
                    16
                  }
                />
              </button>

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
                aria-label="Excluir consulta"
              >
                <Trash2
                  size={
                    16
                  }
                />
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          {/* ==================================================
              HERO
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="relative space-y-4 overflow-hidden rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm"
            style={{
              borderLeft:
                `6px solid ${finalBorderColor}`,
            }}
          >
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-ice/5" />

            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor:
                      `${finalBorderColor}15`,

                    color:
                      finalBorderColor,

                    borderColor:
                      `${finalBorderColor}30`,
                  }}
                >
                  <StatusIcon
                    size={
                      24
                    }
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Calendar
                      size={
                        14
                      }
                      style={{
                        color:
                          finalBorderColor,
                      }}
                    />

                    <span
                      className="font-mono text-sm font-bold"
                      style={{
                        color:
                          finalBorderColor,
                      }}
                    >
                      {formatDateDisplay(
                        consulta.data
                      )}
                    </span>

                    {temHorario && (
                      <span className="font-mono text-sm text-ink-muted">
                        •{" "}
                        {
                          consulta.horario
                        }
                      </span>
                    )}

                    {dataPassada &&
                      consulta.status ===
                        "agendada" && (
                        <span className="rounded-full border border-coral/20 bg-coral/20 px-2 py-0.5 text-[9px] font-bold uppercase text-coral">
                          Data passada
                        </span>
                      )}

                    {diasRestantes !==
                      null &&
                      diasRestantes >=
                        0 &&
                      consulta.status ===
                        "agendada" && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                            diasRestantes <=
                            2
                              ? "border-amber-400/30 bg-amber-400/20 text-amber-400"
                              : "border-ice/20 bg-ice/10 text-ice"
                          }`}
                        >
                          {getDiasRestantesLabel(
                            diasRestantes
                          )}
                        </span>
                      )}
                  </div>

                  <h2 className="mt-1 truncate font-display text-xl font-bold text-ink-primary">
                    {medico
                      ? `Dr(a). ${medico.nome}`
                      : consulta.medico
                        ? `Dr(a). ${consulta.medico}`
                        : "Médico não vinculado"}
                  </h2>

                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {medico?.especialidade ||
                      consulta.especialidade ||
                      "Especialidade não informada"}
                  </p>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  consulta.status ===
                  "agendada"
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                    : consulta.status ===
                        "realizada"
                      ? "border-ice/20 bg-ice/10 text-ice"
                      : "border-coral/20 bg-coral/10 text-coral"
                }`}
              >
                {getStatusLabel(
                  consulta.status
                )}
              </span>
            </div>

            {/* ================================================
                SUMMARY
                ================================================ */}

            <div className="relative z-10 grid grid-cols-3 gap-2 border-t border-surface-border/40 pt-4">
              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/60 p-3">
                <p className="font-mono text-lg font-semibold text-ink-primary">
                  {
                    tratamentosRelacionados.length
                  }
                </p>

                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
                  Tratamentos
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/60 p-3">
                <p className="font-mono text-lg font-semibold text-ink-primary">
                  {
                    cidsRelacionados.length
                  }
                </p>

                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
                  CIDs
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/60 p-3">
                <p className="font-mono text-lg font-semibold text-ink-primary">
                  {
                    totalRelacoes
                  }
                </p>

                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
                  Relações
                </p>
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              ATENDIMENTO
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
            className="space-y-4"
          >
            <SectionTitle
              icon={
                <Stethoscope
                  size={
                    15
                  }
                />
              }
              title="Atendimento"
            />

            <div className="space-y-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              <DetailInfoRow
                icon={
                  <UserCheck
                    size={
                      18
                    }
                  />
                }
                iconClassName="bg-ice/10 text-ice"
                label="Médico"
              >
                {medico?.id ? (
                  <button
                    type="button"
                    onClick={
                      () => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/medicos/detalhes?id=${medico.id}`
                        );
                      }
                    }
                    className="truncate text-left text-sm font-medium text-ink-primary transition-colors hover:text-ice"
                  >
                    Dr(a).{" "}
                    {
                      medico.nome
                    }
                  </button>
                ) : (
                  <p className="truncate text-sm font-medium text-ink-primary">
                    {consulta.medico
                      ? `Dr(a). ${consulta.medico}`
                      : "Não informado"}
                  </p>
                )}
              </DetailInfoRow>

              <DetailInfoRow
                icon={
                  <Building2
                    size={
                      18
                    }
                  />
                }
                iconClassName="bg-violet-400/10 text-violet-400"
                label="Hospital"
              >
                {hospital?.id ? (
                  <button
                    type="button"
                    onClick={
                      () => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/hospitais/detalhes?id=${hospital.id}`
                        );
                      }
                    }
                    className="truncate text-left text-sm font-medium text-ink-primary transition-colors hover:text-violet-300"
                  >
                    {
                      hospital.nome
                    }
                  </button>
                ) : (
                  <p className="truncate text-sm font-medium text-ink-primary">
                    Não informado
                  </p>
                )}
              </DetailInfoRow>

              <DetailInfoRow
                icon={
                  <MapPin
                    size={
                      18
                    }
                  />
                }
                iconClassName="bg-emerald-400/10 text-emerald-400"
                label="Clínica / Posto"
              >
                {local?.id ? (
                  <button
                    type="button"
                    onClick={
                      () => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/locais/detalhes?id=${local.id}`
                        );
                      }
                    }
                    className="truncate text-left text-sm font-medium text-ink-primary transition-colors hover:text-emerald-300"
                  >
                    {
                      local.nome
                    }
                  </button>
                ) : (
                  <p className="truncate text-sm font-medium text-ink-primary">
                    Não informado
                  </p>
                )}
              </DetailInfoRow>
            </div>

            {consulta.motivo && (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <p className="mb-1 text-xs font-medium text-ink-muted">
                  Motivo / Assunto
                </p>

                <p className="text-sm italic leading-relaxed text-ink-primary">
                  “
                  {
                    consulta.motivo
                  }
                  ”
                </p>
              </div>
            )}

            {consulta.observacoes && (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <FileText
                    size={
                      14
                    }
                    className="text-ice"
                  />

                  <p className="text-xs font-medium text-ink-muted">
                    Anotações
                  </p>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-primary">
                  {
                    consulta.observacoes
                  }
                </p>
              </div>
            )}

            {consulta.anexo_url && (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Paperclip
                    size={
                      14
                    }
                    className="text-ice"
                  />

                  <p className="text-xs font-medium text-ink-muted">
                    Anexo da Consulta
                  </p>
                </div>

                <a
                  href={
                    consulta.anexo_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-ice/20 bg-ice/5 px-4 py-3 text-sm font-medium text-ice transition-colors hover:bg-ice/10"
                >
                  <span className="truncate">
                    Abrir anexo
                  </span>

                  <ExternalLink
                    size={
                      15
                    }
                    className="shrink-0"
                  />
                </a>
              </div>
            )}
          </motion.div>

          {/* ==================================================
              TRATAMENTOS
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
              title={`Tratamentos Relacionados (${tratamentosRelacionados.length})`}
            />

            <section className="space-y-2 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              {tratamentosRelacionados.length ===
              0 ? (
                <p className="py-2 text-xs leading-5 text-ink-muted">
                  Nenhum tratamento foi vinculado diretamente a esta consulta.
                </p>
              ) : (
                tratamentosRelacionados.map(
                  (
                    tratamento
                  ) => (
                    <button
                      key={
                        tratamento.id
                      }
                      type="button"
                      onClick={
                        () => {
                          if (
                            !tratamento.id
                          ) {
                            return;
                          }

                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/tratamentos/detalhes?id=${tratamento.id}`
                          );
                        }
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-colors hover:border-violet-400/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-primary">
                          {
                            tratamento.nome
                          }
                        </p>

                        <p className="mt-0.5 text-[11px] capitalize text-ink-muted">
                          Status:{" "}
                          {
                            tratamento.status ||
                              "não informado"
                          }
                        </p>
                      </div>

                      <span className="shrink-0 font-mono text-xs text-violet-300">
                        Ver
                      </span>
                    </button>
                  )
                )
              )}
            </section>
          </motion.div>

          {/* ==================================================
              CIDS
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
              title={`CIDs Relacionados (${cidsRelacionados.length})`}
            />

            <section className="space-y-2 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              {cidsRelacionados.length ===
              0 ? (
                <p className="py-2 text-xs leading-5 text-ink-muted">
                  Nenhum CID foi vinculado diretamente a esta consulta.
                </p>
              ) : (
                cidsRelacionados.map(
                  (
                    cid
                  ) => {
                    const theme =
                      getClinicalTheme(
                        cid.descricao ||
                          cid.codigo
                      );

                    const Icon =
                      theme.icon;

                    return (
                      <button
                        key={
                          cid.id
                        }
                        type="button"
                        onClick={
                          () => {
                            if (
                              !cid.id
                            ) {
                              return;
                            }

                            trigger(
                              "vibrate"
                            );

                            router.push(
                              `/saude/cids/detalhes?id=${cid.id}`
                            );
                          }
                        }
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-colors hover:border-emerald-400/30"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${theme.tagClass}`}
                          >
                            <Icon
                              size={
                                16
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-semibold text-emerald-300">
                              {
                                cid.codigo
                              }
                            </p>

                            <p className="mt-0.5 truncate text-sm text-ink-primary">
                              {
                                cid.descricao
                              }
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 font-mono text-xs text-emerald-300">
                          Ver
                        </span>
                      </button>
                    );
                  }
                )
              )}
            </section>
          </motion.div>

          {/* ==================================================
              MEDICAMENTOS
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
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <Pill
                  size={
                    15
                  }
                />
              }
              title={`Medicamentos via Tratamentos (${medicamentosRelacionados.length})`}
            />

            <section className="space-y-2 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              {tratamentoIds.size ===
              0 ? (
                <p className="py-2 text-xs leading-5 text-ink-muted">
                  Vincule tratamentos à consulta para cruzar medicamentos relacionados com segurança.
                </p>
              ) : medicamentosRelacionados.length ===
                0 ? (
                <p className="py-2 text-xs leading-5 text-ink-muted">
                  Nenhum medicamento da pessoa ativa utiliza os tratamentos vinculados a esta consulta.
                </p>
              ) : (
                medicamentosRelacionados.map(
                  (
                    medicamento
                  ) => (
                    <button
                      key={
                        medicamento.id
                      }
                      type="button"
                      onClick={
                        () => {
                          if (
                            !medicamento.id
                          ) {
                            return;
                          }

                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/medicamentos/detalhes?id=${medicamento.id}`
                          );
                        }
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-colors hover:border-ice/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-primary">
                          {
                            medicamento.nome
                          }

                          {medicamento.dosagem && (
                            <span className="text-ice">
                              {" "}
                              ·{" "}
                              {
                                medicamento.dosagem
                              }
                            </span>
                          )}
                        </p>

                        {medicamento.data_receita && (
                          <p className="mt-0.5 text-[11px] text-ink-muted">
                            Receita:{" "}
                            {formatDateDisplay(
                              medicamento.data_receita
                            )}
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 font-mono text-xs text-ice">
                        Ver
                      </span>
                    </button>
                  )
                )
              )}
            </section>
          </motion.div>

          {/* ==================================================
              EXAMES
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.1,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <FlaskConical
                  size={
                    15
                  }
                />
              }
              title={`Exames via Tratamentos (${examesRelacionados.length})`}
            />

            <section className="space-y-2 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              {tratamentoIds.size ===
              0 ? (
                <p className="py-2 text-xs leading-5 text-ink-muted">
                  Vincule tratamentos à consulta para cruzar exames relacionados com segurança.
                </p>
              ) : examesRelacionados.length ===
                0 ? (
                <p className="py-2 text-xs leading-5 text-ink-muted">
                  Nenhum exame da pessoa ativa utiliza os tratamentos vinculados a esta consulta.
                </p>
              ) : (
                examesRelacionados.map(
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
                          if (
                            !exame.id
                          ) {
                            return;
                          }

                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/exames/detalhes?id=${exame.id}`
                          );
                        }
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-colors hover:border-ice/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-primary">
                          {
                            exame.nome
                          }
                        </p>

                        {exame.data && (
                          <p className="mt-0.5 text-[11px] text-ink-muted">
                            Data:{" "}
                            {formatDateDisplay(
                              exame.data
                            )}
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 font-mono text-xs text-ice">
                        Ver
                      </span>
                    </button>
                  )
                )
              )}
            </section>
          </motion.div>

          {/* ==================================================
              STATUS ACTIONS
              ================================================== */}

          {consulta.status ===
            "agendada" && (
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
              className="space-y-3 pt-2"
            >
              <SectionTitle
                icon={
                  <CheckCircle2
                    size={
                      15
                    }
                  />
                }
                title="Ações de Acompanhamento"
              />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={
                    isUpdatingStatus
                  }
                  onClick={
                    () =>
                      handleStatusChange(
                        "realizada"
                      )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3.5 text-sm font-medium text-emerald-300 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <CheckCircle2
                    size={
                      18
                    }
                  />

                  Marcar como Realizada
                </button>

                <button
                  type="button"
                  disabled={
                    isUpdatingStatus
                  }
                  onClick={
                    () =>
                      handleStatusChange(
                        "cancelada"
                      )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3.5 text-sm font-medium text-coral transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <XCircle
                    size={
                      18
                    }
                  />

                  Marcar como Cancelada
                </button>
              </div>
            </motion.div>
          )}
        </section>

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
          title="Excluir Consulta"
          message="Tem certeza que deseja excluir esta consulta? Tratamentos, CIDs, medicamentos e exames relacionados não serão excluídos."
        />
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function DetalhesConsultaPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <DetalhesConsultaContent />
    </Suspense>
  );
}