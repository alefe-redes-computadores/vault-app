// app/saude/consultas/page.tsx
"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  Stethoscope,
  XCircle,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  getDaysUntil,
} from "@/lib/health-utils";

import {
  useConsultas,
} from "@/hooks/useConsultas";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

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
  EmptyState,
} from "@/components/EmptyState";

import {
  CardListSkeleton,
} from "@/components/loading/CardListSkeleton";

import {
  ListCard,
  ListFilters,
  ListPageHeader,
} from "@/components/list";

import type {
  Consulta,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type ConsultaStatus =
  | "agendada"
  | "realizada"
  | "cancelada";

type FiltroStatus =
  | "todos"
  | ConsultaStatus;

type AbaConsulta =
  | "proximas"
  | "historico";

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
      now.getMonth() +
        1
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
  isoStr: string
): string {
  if (
    !isoStr
  ) {
    return "";
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

// ============================================================
// PAGE
// ============================================================

export default function ConsultasPage() {
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    consultas,
  } =
    useConsultas();

  // ==========================================================
  // GLOBAL ENTITIES
  // ==========================================================

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
  // UI STATE
  // ==========================================================

  const [
    abaAtiva,
    setAbaAtiva,
  ] =
    useState<AbaConsulta>(
      "proximas"
    );

  const [
    filtroStatus,
    setFiltroStatus,
  ] =
    useState<FiltroStatus>(
      "todos"
    );

  // ==========================================================
  // GLOBAL INDEXES
  // ==========================================================

  const medicosMap =
    useMemo(
      () =>
        new Map(
          medicos
            .filter(
              (
                medico
              ) =>
                Boolean(
                  medico.id
                )
            )
            .map(
              (
                medico
              ) => [
                medico.id!,
                medico,
              ]
            )
        ),
      [
        medicos,
      ]
    );

  const hospitaisMap =
    useMemo(
      () =>
        new Map(
          hospitais
            .filter(
              (
                hospital
              ) =>
                Boolean(
                  hospital.id
                )
            )
            .map(
              (
                hospital
              ) => [
                hospital.id!,
                hospital,
              ]
            )
        ),
      [
        hospitais,
      ]
    );

  const locaisMap =
    useMemo(
      () =>
        new Map(
          locais
            .filter(
              (
                local
              ) =>
                Boolean(
                  local.id
                )
            )
            .map(
              (
                local
              ) => [
                local.id!,
                local,
              ]
            )
        ),
      [
        locais,
      ]
    );

  // ==========================================================
  // PERSON SCOPE
  //
  // useConsultas já deve retornar somente a pessoa ativa.
  //
  // Como esta é uma tela clínica, mantemos uma segunda barreira
  // explícita antes de renderizar ou agregar os registros.
  // ==========================================================

  const scopedConsultas =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return (
          consultas ||
          []
        ).filter(
          (
            consulta:
              Consulta
          ) =>
            consulta.person_id ===
            activePersonId
        );
      },
      [
        consultas,
        activePersonId,
      ]
    );

  // ==========================================================
  // PRÓXIMAS / HISTÓRICO
  // ==========================================================

  const {
    proximas,
    historico,
  } =
    useMemo(
      () => {
        const todayISO =
          getTodayISO();

        const next:
          Consulta[] =
          [];

        const history:
          Consulta[] =
          [];

        scopedConsultas.forEach(
          (
            consulta
          ) => {
            const data =
              getCivilDate(
                consulta.data
              );

            const isPast =
              Boolean(
                data &&
                  data <
                    todayISO
              );

            const belongsToHistory =
              isPast ||
              consulta.status ===
                "realizada" ||
              consulta.status ===
                "cancelada";

            if (
              belongsToHistory
            ) {
              history.push(
                consulta
              );

              return;
            }

            next.push(
              consulta
            );
          }
        );

        next.sort(
          (
            first,
            second
          ) => {
            const dateComparison =
              getCivilDate(
                first.data
              ).localeCompare(
                getCivilDate(
                  second.data
                )
              );

            if (
              dateComparison !==
              0
            ) {
              return dateComparison;
            }

            return (
              first.horario ||
              ""
            ).localeCompare(
              second.horario ||
                ""
            );
          }
        );

        history.sort(
          (
            first,
            second
          ) => {
            const dateComparison =
              getCivilDate(
                second.data
              ).localeCompare(
                getCivilDate(
                  first.data
                )
              );

            if (
              dateComparison !==
              0
            ) {
              return dateComparison;
            }

            return (
              second.horario ||
              ""
            ).localeCompare(
              first.horario ||
                ""
            );
          }
        );

        return {
          proximas:
            next,

          historico:
            history,
        };
      },
      [
        scopedConsultas,
      ]
    );

  const listaBase =
    abaAtiva ===
    "proximas"
      ? proximas
      : historico;

  const listaExibida =
    useMemo(
      () => {
        if (
          filtroStatus ===
          "todos"
        ) {
          return listaBase;
        }

        return listaBase.filter(
          (
            consulta
          ) =>
            consulta.status ===
            filtroStatus
        );
      },
      [
        listaBase,
        filtroStatus,
      ]
    );

  // ==========================================================
  // RELATION HELPERS
  // ==========================================================

  const getMedicoNome =
    (
      id?: string
    ) => {
      if (
        !id
      ) {
        return "Médico não vinculado";
      }

      const medico =
        medicosMap.get(
          id
        );

      return medico
        ? `Dr(a). ${medico.nome}`
        : "Médico não encontrado";
    };

  const getHospitalNome =
    (
      id?: string
    ) => {
      if (
        !id
      ) {
        return null;
      }

      return (
        hospitaisMap.get(
          id
        )?.nome ||
        null
      );
    };

  const getLocalNome =
    (
      id?: string
    ) => {
      if (
        !id
      ) {
        return null;
      }

      return (
        locaisMap.get(
          id
        )?.nome ||
        null
      );
    };

  // ==========================================================
  // FILTER ACTIONS
  // ==========================================================

  const handleClearFilters =
    () => {
      trigger(
        "vibrate"
      );

      setFiltroStatus(
        "todos"
      );
    };

  const toggleFiltro =
    (
      status:
        ConsultaStatus
    ) => {
      trigger(
        "vibrate"
      );

      setFiltroStatus(
        (
          current
        ) =>
          current ===
          status
            ? "todos"
            : status
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    consultas ===
    undefined
  ) {
    return (
      <CardListSkeleton />
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Consultas Médicas"
          subtitle={
            activePersonId
              ? `${scopedConsultas.length} registros`
              : "Nenhuma pessoa ativa"
          }
          badgeLabel="Agenda"
          badgeColor="text-ice/90"
          icon={
            <Stethoscope
              size={
                14
              }
            />
          }
          iconColor="text-ice"
        >
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-surface-border/40 bg-surface-raised p-1">
            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setAbaAtiva(
                    "proximas"
                  );
                }
              }
              className={`rounded-xl py-2.5 text-xs font-medium transition-all ${
                abaAtiva ===
                "proximas"
                  ? "border border-surface-border/50 bg-surface text-ink-primary shadow-sm"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
              aria-pressed={
                abaAtiva ===
                "proximas"
              }
            >
              Próximas (
              {
                proximas.length
              }
              )
            </button>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setAbaAtiva(
                    "historico"
                  );
                }
              }
              className={`rounded-xl py-2.5 text-xs font-medium transition-all ${
                abaAtiva ===
                "historico"
                  ? "border border-surface-border/50 bg-surface text-ink-primary shadow-sm"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
              aria-pressed={
                abaAtiva ===
                "historico"
              }
            >
              Histórico (
              {
                historico.length
              }
              )
            </button>
          </div>

          <ListFilters
            onClear={
              handleClearFilters
            }
          >
            <button
              type="button"
              onClick={
                () =>
                  toggleFiltro(
                    "agendada"
                  )
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "agendada"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
              aria-pressed={
                filtroStatus ===
                "agendada"
              }
            >
              Agendada
            </button>

            <button
              type="button"
              onClick={
                () =>
                  toggleFiltro(
                    "realizada"
                  )
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "realizada"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
              aria-pressed={
                filtroStatus ===
                "realizada"
              }
            >
              Realizada
            </button>

            <button
              type="button"
              onClick={
                () =>
                  toggleFiltro(
                    "cancelada"
                  )
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "cancelada"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
              aria-pressed={
                filtroStatus ===
                "cancelada"
              }
            >
              Cancelada
            </button>
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {!activePersonId ? (
            <EmptyState
              icon={
                Stethoscope
              }
              title="Nenhuma pessoa ativa"
              description="Selecione uma pessoa no Vault para visualizar as consultas médicas."
            />
          ) : listaExibida.length ===
            0 ? (
            <EmptyState
              icon={
                Stethoscope
              }
              title={
                filtroStatus !==
                "todos"
                  ? "Nenhuma consulta com esse status"
                  : abaAtiva ===
                      "proximas"
                    ? "Nenhuma consulta agendada"
                    : "Nenhuma consulta no histórico"
              }
              description={
                filtroStatus !==
                "todos"
                  ? "Tente remover ou alterar o filtro selecionado."
                  : abaAtiva ===
                      "proximas"
                    ? "Agende uma nova consulta."
                    : "Consultas realizadas, canceladas ou já ocorridas aparecerão aqui."
              }
            />
          ) : (
            listaExibida.map(
              (
                consulta,
                index
              ) => {
                const hospitalNome =
                  getHospitalNome(
                    consulta.hospital_id
                  );

                const localNome =
                  getLocalNome(
                    consulta.local_id
                  );

                const {
                  color,
                  icon:
                    StatusIcon,
                } =
                  getStatusConfig(
                    consulta.status
                  );

                const diasRestantes =
                  getDaysUntil(
                    getCivilDate(
                      consulta.data
                    )
                  );

                const dataPassada =
                  Boolean(
                    diasRestantes !==
                      null &&
                      diasRestantes <
                        0
                  );

                const temHorario =
                  Boolean(
                    consulta.horario?.trim()
                  );

                return (
                  <ListCard
                    key={
                      consulta.id
                    }
                    id={
                      consulta.id!
                    }
                    color={
                      color
                    }
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
                          `/saude/consultas/detalhes?id=${consulta.id}`
                        );
                      }
                    }
                    delay={
                      index *
                      0.025
                    }
                    icon={
                      <StatusIcon
                        size={
                          22
                        }
                      />
                    }
                  >
                    <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                      <span
                        className="shrink-0 whitespace-nowrap font-mono text-xs font-semibold"
                        style={{
                          color,
                        }}
                      >
                        {formatDateDisplay(
                          consulta.data
                        )}
                      </span>

                      {temHorario && (
                        <span className="shrink-0 whitespace-nowrap font-mono text-[10px] text-ink-muted">
                          •{" "}
                          {
                            consulta.horario
                          }
                        </span>
                      )}

                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          consulta.status ===
                          "agendada"
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                            : consulta.status ===
                                "realizada"
                              ? "border-ice/20 bg-ice/10 text-ice"
                              : "border-coral/20 bg-coral/10 text-coral"
                        }`}
                      >
                        {
                          consulta.status
                        }
                      </span>

                      {dataPassada &&
                        consulta.status ===
                          "agendada" && (
                          <span className="shrink-0 whitespace-nowrap rounded-full border border-coral/20 bg-coral/20 px-2 py-0.5 text-[9px] font-bold uppercase text-coral">
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
                            className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
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

                    <h3 className="mt-1 truncate text-base font-semibold text-ink-primary">
                      {getMedicoNome(
                        consulta.medico_id
                      )}
                    </h3>

                    {(hospitalNome ||
                      localNome) && (
                      <div className="mt-1.5 space-y-1">
                        {hospitalNome && (
                          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <Building2
                              size={
                                13
                              }
                              className="shrink-0 text-violet-400"
                            />

                            <span className="truncate">
                              {
                                hospitalNome
                              }
                            </span>
                          </div>
                        )}

                        {localNome && (
                          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <MapPin
                              size={
                                13
                              }
                              className="shrink-0 text-emerald-400"
                            />

                            <span className="truncate">
                              {
                                localNome
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {consulta.motivo && (
                      <p className="mt-1.5 truncate text-xs italic text-ink-faint">
                        “
                        {
                          consulta.motivo
                        }
                        ”
                      </p>
                    )}
                  </ListCard>
                );
              }
            )
          )}
        </section>
      </main>
    </PageTransition>
  );
}