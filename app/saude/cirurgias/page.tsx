// app/saude/cirurgias/page.tsx
"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  Activity,
  Building2,
} from "lucide-react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  useHapticFeedback,
} from "@/lib/haptics";
import {
  getDaysUntil,
} from "@/lib/health-utils";
import {
  isReceitaVencidaSegura,
} from "@/lib/health-insights";

import {
  useCirurgias,
} from "@/hooks/useCirurgias";
import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  PageTransition,
} from "@/components/PageTransition";
import {
  CardListSkeleton,
} from "@/components/loading/CardListSkeleton";
import {
  EmptyState,
} from "@/components/EmptyState";
import {
  ListCard,
  ListFilters,
  ListPageHeader,
} from "@/components/list";

import type {
  Cirurgia,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type CirurgiaStatus =
  | "agendada"
  | "realizada"
  | "cancelada";

type FiltroStatus =
  | "todos"
  | CirurgiaStatus;

type AbaCirurgia =
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

function formatDateDisplay(
  isoStr: string
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
    parts.length !==
    3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getStatusColor(
  status: string
): string {
  switch (status) {
    case "agendada":
      return "#F59E0B";

    case "realizada":
      return "#34D399";

    case "cancelada":
      return "#EF4444";

    default:
      return "#F59E0B";
  }
}

function getDiasRestantesLabel(
  dias: number | null
): string | null {
  if (
    dias === null
  ) {
    return null;
  }

  if (
    dias === 0
  ) {
    return "Hoje";
  }

  if (
    dias < 0
  ) {
    const absolute =
      Math.abs(
        dias
      );

    return `Há ${absolute} dia${
      absolute > 1
        ? "s"
        : ""
    }`;
  }

  return `Em ${dias} dia${
    dias > 1
      ? "s"
      : ""
  }`;
}

// ============================================================
// PAGE
// ============================================================

export default function CirurgiasPage() {
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
    cirurgias,
  } =
    useCirurgias();

  const [
    abaAtiva,
    setAbaAtiva,
  ] =
    useState<AbaCirurgia>(
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

  const medicosMap =
    useMemo(
      () =>
        new Map(
          medicos.map(
            (
              medico
            ) => [
              medico.id,
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
          hospitais.map(
            (
              hospital
            ) => [
              hospital.id,
              hospital,
            ]
          )
        ),
      [
        hospitais,
      ]
    );

  // ==========================================================
  // PRÓXIMAS / HISTÓRICO
  //
  // useCirurgias já retorna SOMENTE os registros da pessoa
  // ativa. Não existe filtro permissivo por person_id aqui.
  // ==========================================================

  const {
    proximas,
    historico,
  } =
    useMemo(() => {
      const todayISO =
        getTodayISO();

      const next:
        Cirurgia[] = [];

      const history:
        Cirurgia[] = [];

      cirurgias.forEach(
        (
          cirurgia
        ) => {
          const data =
            cirurgia.data ||
            "";

          const isPast =
            Boolean(
              data &&
                data <
                  todayISO
            );

          const belongsToHistory =
            isPast ||
            cirurgia.status ===
              "realizada" ||
            cirurgia.status ===
              "cancelada";

          if (
            belongsToHistory
          ) {
            history.push(
              cirurgia
            );
          } else {
            next.push(
              cirurgia
            );
          }
        }
      );

      next.sort(
        (
          first,
          second
        ) =>
          (
            first.data ||
            ""
          ).localeCompare(
            second.data ||
              ""
          )
      );

      history.sort(
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

      return {
        proximas:
          next,

        historico:
          history,
      };
    }, [
      cirurgias,
    ]);

  const listaBase =
    abaAtiva ===
    "proximas"
      ? proximas
      : historico;

  const listaExibida =
    useMemo(() => {
      if (
        filtroStatus ===
        "todos"
      ) {
        return listaBase;
      }

      return listaBase.filter(
        (
          cirurgia
        ) =>
          cirurgia.status ===
          filtroStatus
      );
    }, [
      listaBase,
      filtroStatus,
    ]);

  // ==========================================================
  // HELPERS DE RELAÇÃO
  // ==========================================================

  const getMedicoNome =
    (
      id?: string
    ) => {
      if (!id) {
        return "Equipe não especificada";
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
      if (!id) {
        return null;
      }

      return (
        hospitaisMap.get(
          id
        )?.nome ||
        null
      );
    };

  // ==========================================================
  // FILTROS
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
        CirurgiaStatus
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
    cirurgias ===
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
          title="Cirurgias"
          subtitle={
            activePersonId
              ? `${cirurgias.length} registros`
              : "Nenhuma pessoa ativa"
          }
          badgeLabel="Clínico"
          badgeColor="text-coral/90"
          icon={
            <Activity
              size={
                14
              }
            />
          }
          iconColor="text-coral"
        >
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-surface-border/40 bg-surface-raised p-1">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setAbaAtiva(
                  "proximas"
                );
              }}
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
              Agendadas (
              {
                proximas.length
              }
              )
            </button>

            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setAbaAtiva(
                  "historico"
                );
              }}
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
              onClick={() =>
                toggleFiltro(
                  "agendada"
                )
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "agendada"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
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
              onClick={() =>
                toggleFiltro(
                  "realizada"
                )
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "realizada"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
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
              onClick={() =>
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
                Activity
              }
              title="Nenhuma pessoa ativa"
              description="Selecione uma pessoa no Vault para visualizar os procedimentos cirúrgicos."
            />
          ) : listaExibida.length ===
            0 ? (
            <EmptyState
              icon={
                Activity
              }
              title={
                abaAtiva ===
                "proximas"
                  ? filtroStatus ===
                    "todos"
                    ? "Nenhuma cirurgia agendada"
                    : "Nenhuma cirurgia com esse status"
                  : filtroStatus ===
                    "todos"
                    ? "Nenhum procedimento no histórico"
                    : "Nenhum procedimento com esse status"
              }
              description={
                filtroStatus !==
                "todos"
                  ? "Tente remover ou alterar o filtro selecionado."
                  : abaAtiva ===
                      "proximas"
                    ? "Cadastre uma nova cirurgia para acompanhar o procedimento."
                    : "Cirurgias realizadas, canceladas ou já ocorridas aparecerão aqui."
              }
            />
          ) : (
            listaExibida.map(
              (
                cirurgia,
                index
              ) => {
                const hospitalNome =
                  getHospitalNome(
                    cirurgia.hospital_id
                  );

                const corBorda =
                  getStatusColor(
                    cirurgia.status
                  );

                const diasRestantes =
                  getDaysUntil(
                    cirurgia.data
                  );

                const vencida =
                  isReceitaVencidaSegura(
                    cirurgia.data
                  );

                const temHorario =
                  Boolean(
                    cirurgia.horario?.trim()
                  );

                return (
                  <ListCard
                    key={
                      cirurgia.id
                    }
                    id={
                      cirurgia.id!
                    }
                    color={
                      corBorda
                    }
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
                    delay={
                      index *
                      0.025
                    }
                    icon={
                      <Activity
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
                          color:
                            corBorda,
                        }}
                      >
                        {
                          formatDateDisplay(
                            cirurgia.data
                          )
                        }
                      </span>

                      {temHorario && (
                        <span className="shrink-0 whitespace-nowrap font-mono text-[10px] text-ink-muted">
                          •{" "}
                          {
                            cirurgia.horario
                          }
                        </span>
                      )}

                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          cirurgia.status ===
                          "agendada"
                            ? "border-amber-400/20 bg-amber-400/10 text-amber-400"
                            : cirurgia.status ===
                                "realizada"
                              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                              : "border-coral/20 bg-coral/10 text-coral"
                        }`}
                      >
                        {
                          cirurgia.status
                        }
                      </span>

                      {vencida &&
                        cirurgia.status ===
                          "agendada" && (
                          <span className="shrink-0 whitespace-nowrap rounded-full border border-coral/20 bg-coral/20 px-2 py-0.5 text-[9px] font-bold uppercase text-coral">
                            Data passada
                          </span>
                        )}

                      {diasRestantes !==
                        null &&
                        diasRestantes >=
                          0 &&
                        cirurgia.status ===
                          "agendada" && (
                          <span
                            className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                              diasRestantes <=
                              2
                                ? "border-amber-400/30 bg-amber-400/20 text-amber-400"
                                : "border-ice/20 bg-ice/10 text-ice"
                            }`}
                          >
                            {
                              getDiasRestantesLabel(
                                diasRestantes
                              )
                            }
                          </span>
                        )}
                    </div>

                    <h3 className="mt-1 truncate text-base font-semibold text-ink-primary">
                      {
                        cirurgia.procedimento
                      }
                    </h3>

                    {hospitalNome && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                        <Building2
                          size={
                            13
                          }
                          className="shrink-0 text-ink-faint"
                        />

                        <span className="truncate">
                          {
                            hospitalNome
                          }
                        </span>
                      </div>
                    )}

                    <p className="mt-1.5 truncate text-xs text-ink-faint">
                      {
                        getMedicoNome(
                          cirurgia.medico_id
                        )
                      }
                    </p>
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