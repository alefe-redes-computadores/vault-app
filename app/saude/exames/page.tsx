// app/saude/exames/page.tsx
"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FlaskConical,
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
  getDaysUntil,
} from "@/lib/health-utils";

import {
  useExames,
} from "@/hooks/useExames";
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
  ListSearch,
} from "@/components/list";

import type {
  Exame,
  Tratamento,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type FiltroStatus =
  | "todos"
  | "vencido"
  | "valido"
  | "proximo";

type ExameComStatus =
  Exame & {
    vencido: boolean;
    proximo: boolean;
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

  if (
    parts.length !==
    3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ============================================================
// PAGE
// ============================================================

export default function ExamesPage() {
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
    exames,
  } =
    useExames();

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    filtroStatus,
    setFiltroStatus,
  ] =
    useState<FiltroStatus>(
      "todos"
    );

  // ==========================================================
  // PERSON-OWNED RELATIONS
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

  const tratamentoMap =
    useMemo(
      () =>
        new Map(
          tratamentos
            .filter(
              (
                tratamento
              ) =>
                Boolean(
                  tratamento.id
                )
            )
            .map(
              (
                tratamento
              ) => [
                tratamento.id!,
                tratamento,
              ]
            )
        ),
      [
        tratamentos,
      ]
    );

  // ==========================================================
  // STATUS
  // ==========================================================

  const examesComStatus =
    useMemo<
      ExameComStatus[]
    >(() => {
      return exames.map(
        (
          exame
        ) => {
          const dias =
            exame.data_retorno
              ? getDaysUntil(
                  exame.data_retorno
                )
              : null;

          const vencido =
            Boolean(
              exame.data_retorno &&
                dias !== null &&
                dias <
                  0
            );

          const proximo =
            Boolean(
              exame.data_retorno &&
                dias !== null &&
                dias >=
                  0 &&
                dias <=
                  7
            );

          return {
            ...exame,
            vencido,
            proximo,
          };
        }
      );
    }, [
      exames,
    ]);

  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredExames =
    useMemo<
      ExameComStatus[]
    >(() => {
      let result =
        examesComStatus;

      const term =
        search
          .trim()
          .toLowerCase();

      if (term) {
        result =
          result.filter(
            (
              exame
            ) =>
              exame.nome
                ?.toLowerCase()
                .includes(
                  term
                ) ||
              exame.laboratorio
                ?.toLowerCase()
                .includes(
                  term
                ) ||
              exame.medico
                ?.toLowerCase()
                .includes(
                  term
                ) ||
              exame.motivo
                ?.toLowerCase()
                .includes(
                  term
                )
          );
      }

      if (
        filtroStatus ===
        "vencido"
      ) {
        result =
          result.filter(
            (
              exame
            ) =>
              exame.vencido
          );
      } else if (
        filtroStatus ===
        "proximo"
      ) {
        result =
          result.filter(
            (
              exame
            ) =>
              exame.proximo
          );
      } else if (
        filtroStatus ===
        "valido"
      ) {
        result =
          result.filter(
            (
              exame
            ) =>
              Boolean(
                exame.data_retorno
              ) &&
              !exame.vencido &&
              !exame.proximo
          );
      }

      return [
        ...result,
      ].sort(
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
      examesComStatus,
      search,
      filtroStatus,
    ]);

  // ==========================================================
  // ACTIONS
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
      filtro:
        Exclude<
          FiltroStatus,
          "todos"
        >
    ) => {
      trigger(
        "vibrate"
      );

      setFiltroStatus(
        (
          current
        ) =>
          current ===
          filtro
            ? "todos"
            : filtro
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    exames ===
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
          title="Exames e Laudos"
          subtitle={
            activePersonId
              ? `${exames.length} registros`
              : "Nenhuma pessoa ativa"
          }
          badgeLabel="REGISTROS CLÍNICOS"
          badgeColor="text-emerald-400"
          icon={
            <FlaskConical
              size={
                14
              }
            />
          }
          iconColor="text-emerald-400"
        >
          <ListSearch
            value={
              search
            }
            onChange={
              setSearch
            }
            placeholder="Buscar exame, laboratório ou médico..."
          />

          <ListFilters
            onClear={
              handleClearFilters
            }
          >
            <button
              type="button"
              onClick={() =>
                toggleFiltro(
                  "vencido"
                )
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "vencido"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
              aria-pressed={
                filtroStatus ===
                "vencido"
              }
            >
              Vencidos
            </button>

            <button
              type="button"
              onClick={() =>
                toggleFiltro(
                  "proximo"
                )
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "proximo"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
              aria-pressed={
                filtroStatus ===
                "proximo"
              }
            >
              Próximos
            </button>

            <button
              type="button"
              onClick={() =>
                toggleFiltro(
                  "valido"
                )
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "valido"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
              aria-pressed={
                filtroStatus ===
                "valido"
              }
            >
              Válidos
            </button>
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {!activePersonId ? (
            <EmptyState
              icon={
                FlaskConical
              }
              title="Nenhuma pessoa ativa"
              description="Selecione uma pessoa no Vault para visualizar seus exames."
            />
          ) : filteredExames.length ===
            0 ? (
            <EmptyState
              icon={
                FlaskConical
              }
              title={
                search ||
                filtroStatus !==
                  "todos"
                  ? "Nenhum exame encontrado"
                  : "Nenhum exame cadastrado"
              }
              description={
                search ||
                filtroStatus !==
                  "todos"
                  ? "Tente ajustar a busca ou os filtros."
                  : "Cadastre exames, resultados e laudos desta pessoa."
              }
            />
          ) : (
            filteredExames.map(
              (
                exame,
                index
              ) => {
                const corBorda =
                  exame.vencido
                    ? "#EF4444"
                    : exame.proximo
                      ? "#F59E0B"
                      : "#10B981";

                const temHorario =
                  Boolean(
                    exame.horario?.trim()
                  );

                const primeirosTratamentos =
                  (
                    exame.tratamento_ids ||
                    []
                  )
                    .map(
                      (
                        tratamentoId
                      ) =>
                        tratamentoMap.get(
                          tratamentoId
                        )
                    )
                    .filter(
                      (
                        tratamento
                      ): tratamento is Tratamento =>
                        Boolean(
                          tratamento
                        )
                    )
                    .slice(
                      0,
                      2
                    );

                const totalTratamentosValidos =
                  (
                    exame.tratamento_ids ||
                    []
                  ).filter(
                    (
                      tratamentoId
                    ) =>
                      tratamentoMap.has(
                        tratamentoId
                      )
                  ).length;

                return (
                  <ListCard
                    key={
                      exame.id
                    }
                    id={
                      exame.id!
                    }
                    color={
                      corBorda
                    }
                    onClick={() => {
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
                    }}
                    delay={
                      index *
                      0.025
                    }
                    icon={
                      <FlaskConical
                        size={
                          22
                        }
                        className="text-emerald-400"
                      />
                    }
                  >
                    <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                      <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                        {
                          exame.nome
                        }
                      </h3>

                      {exame.vencido ? (
                        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-coral/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-coral">
                          <AlertTriangle
                            size={
                              10
                            }
                          />

                          Vencido
                        </span>
                      ) : exame.proximo ? (
                        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400">
                          <Clock
                            size={
                              10
                            }
                          />

                          Próximo
                        </span>
                      ) : exame.data_retorno ? (
                        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-400">
                          <CheckCircle2
                            size={
                              10
                            }
                          />

                          Válido
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      {exame.laboratorio && (
                        <span className="flex min-w-0 items-center gap-1">
                          <Building2
                            size={
                              12
                            }
                            className="shrink-0 text-ink-faint"
                          />

                          <span className="truncate">
                            {
                              exame.laboratorio
                            }
                          </span>
                        </span>
                      )}

                      {exame.data && (
                        <span className="flex items-center gap-1">
                          <Calendar
                            size={
                              12
                            }
                            className="text-ink-faint"
                          />

                          {
                            formatDateDisplay(
                              exame.data
                            )
                          }
                        </span>
                      )}

                      {temHorario && (
                        <span className="font-mono text-[10px] text-ink-muted">
                          •{" "}
                          {
                            exame.horario
                          }
                        </span>
                      )}
                    </div>

                    {primeirosTratamentos.length >
                      0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {primeirosTratamentos.map(
                          (
                            tratamento
                          ) => {
                            const theme =
                              getClinicalTheme(
                                tratamento.nome
                              );

                            const Icon =
                              theme.icon;

                            return (
                              <span
                                key={
                                  tratamento.id
                                }
                                className={`inline-flex max-w-[120px] items-center gap-0.5 truncate rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${theme.tagClass}`}
                              >
                                <Icon
                                  size={
                                    9
                                  }
                                />

                                {
                                  tratamento.nome
                                }
                              </span>
                            );
                          }
                        )}

                        {totalTratamentosValidos >
                          2 && (
                          <span className="text-[8px] text-ink-muted">
                            +
                            {
                              totalTratamentosValidos -
                              2
                            }
                          </span>
                        )}
                      </div>
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