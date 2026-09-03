// app/saude/tratamentos/page.tsx
"use client";

import {
  Suspense,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Activity,
  AlertTriangle,
  History,
  Pill,
  Plus,
  Search,
  X,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

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
  useTratamentos,
} from "@/hooks/useTratamentos";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import type {
  Medicamento,
  Renovacao,
  Tratamento,
} from "@/lib/types";

import {
  formatCurrency,
  getClinicalTheme,
} from "@/lib/health-utils";

import {
  analisarTratamento,
  type TratamentoInsightAlerta,
} from "@/lib/health-insights";

import {
  ListCard,
  ListFilters,
  ListPageHeader,
} from "@/components/list";

// ============================================================
// TIPOS
// ============================================================

type TratamentoStatus =
  | "todos"
  | "ativo"
  | "concluido"
  | "suspenso";

type TratamentoEnriquecido =
  Tratamento & {
    medicamentosCount: number;
    medicamentosAtivosCount: number;
    totalGasto: number;
    alertaPrincipal:
      | TratamentoInsightAlerta
      | null;
  };

// ============================================================
// HELPERS
// ============================================================

function getStatusLabel(
  status: Tratamento["status"]
): string {
  if (
    status ===
    "ativo"
  ) {
    return "Ativo";
  }

  if (
    status ===
    "concluido"
  ) {
    return "Concluído";
  }

  return "Suspenso";
}

function getStatusClasses(
  status: Tratamento["status"]
): string {
  if (
    status ===
    "ativo"
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-400";
  }

  if (
    status ===
    "concluido"
  ) {
    return "border-ice/30 bg-ice/10 text-ice";
  }

  return "border-coral/30 bg-coral/10 text-coral";
}

function getPrecoSeguro(
  value: Renovacao["preco"]
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    ) ||
    value <=
      0
  ) {
    return 0;
  }

  return value;
}

function normalizeSearch(
  value: string
): string {
  return value
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toLocaleLowerCase(
      "pt-BR"
    );
}

// ============================================================
// CONTENT
// ============================================================

function TratamentoListContent() {
  const {
    trigger,
  } =
    useHapticFeedback();

  const router =
    useRouter();

  const [
    filtroStatus,
    setFiltroStatus,
  ] =
    useState<TratamentoStatus>(
      "todos"
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

  /*
   * Os hooks já trabalham com a pessoa ativa.
   *
   * A listagem não mantém um segundo estado de person_id.
   */
  const {
    tratamentos = [],
  } =
    useTratamentos();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    renovacoes = [],
  } =
    useRenovacoes();

  // ==========================================================
  // ÍNDICE — MEDICAMENTOS POR TRATAMENTO
  // ==========================================================

  /*
   * Fonte canônica:
   *
   * Medicamento.tratamento_ids
   */
  const medicamentosPorTratamento =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            Medicamento[]
          >();

        for (
          const medicamento of
          medicamentos
        ) {
          for (
            const tratamentoId of
            medicamento.tratamento_ids ||
            []
          ) {
            const atuais =
              map.get(
                tratamentoId
              ) ||
              [];

            atuais.push(
              medicamento
            );

            map.set(
              tratamentoId,
              atuais
            );
          }
        }

        return map;
      },
      [
        medicamentos,
      ]
    );

  // ==========================================================
  // ÍNDICE — HISTÓRICO FINANCEIRO
  // ==========================================================

  /*
   * Renovacao representa aquisição real.
   *
   * Não somamos Medicamento.preco porque ele representa
   * o valor atual/referencial do medicamento, não uma nova
   * aquisição.
   *
   * IMPORTANTE:
   *
   * Esse total é um indicador do histórico dos medicamentos
   * vinculados ao tratamento. Ele não deve ser interpretado
   * como contabilidade exclusiva do tratamento, porque um
   * medicamento pode participar de mais de um tratamento.
   */
  const gastoPorMedicamento =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            number
          >();

        for (
          const renovacao of
          renovacoes
        ) {
          const medicamentoId =
            renovacao.medicamento_id;

          if (
            !medicamentoId
          ) {
            continue;
          }

          const preco =
            getPrecoSeguro(
              renovacao.preco
            );

          if (
            preco <=
            0
          ) {
            continue;
          }

          map.set(
            medicamentoId,
            (
              map.get(
                medicamentoId
              ) ||
              0
            ) +
              preco
          );
        }

        return map;
      },
      [
        renovacoes,
      ]
    );

  // ==========================================================
  // ENRIQUECIMENTO
  // ==========================================================

  const listaEnriquecida =
    useMemo<
      TratamentoEnriquecido[]
    >(
      () =>
        tratamentos.map(
          (
            tratamento
          ) => {
            if (
              !tratamento.id
            ) {
              return {
                ...tratamento,

                medicamentosCount:
                  0,

                medicamentosAtivosCount:
                  0,

                totalGasto:
                  0,

                alertaPrincipal:
                  null,
              };
            }

            const meds =
              medicamentosPorTratamento.get(
                tratamento.id
              ) ||
              [];

            const medicamentosAtivosCount =
              meds.filter(
                (
                  medicamento
                ) =>
                  medicamento.status !==
                  "descontinuado"
              ).length;

            const totalGasto =
              meds.reduce(
                (
                  total,
                  medicamento
                ) => {
                  if (
                    !medicamento.id
                  ) {
                    return total;
                  }

                  return (
                    total +
                    (
                      gastoPorMedicamento.get(
                        medicamento.id
                      ) ||
                      0
                    )
                  );
                },
                0
              );

            const insight =
              analisarTratamento({
                tratamento,
                medicamentos:
                  meds,
                renovacoes,
              });

            return {
              ...tratamento,

              medicamentosCount:
                meds.length,

              medicamentosAtivosCount,

              totalGasto,

              alertaPrincipal:
                insight.alertas[0] ||
                null,
            };
          }
        ),
      [
        tratamentos,
        medicamentosPorTratamento,
        gastoPorMedicamento,
        renovacoes,
      ]
    );

  // ==========================================================
  // CONTADORES
  // ==========================================================

  const statusCounts =
    useMemo(
      () => {
        let ativos =
          0;

        let concluidos =
          0;

        let suspensos =
          0;

        for (
          const tratamento of
          listaEnriquecida
        ) {
          if (
            tratamento.status ===
            "ativo"
          ) {
            ativos +=
              1;
          } else if (
            tratamento.status ===
            "concluido"
          ) {
            concluidos +=
              1;
          } else if (
            tratamento.status ===
            "suspenso"
          ) {
            suspensos +=
              1;
          }
        }

        return {
          ativos,
          concluidos,
          suspensos,
        };
      },
      [
        listaEnriquecida,
      ]
    );

  // ==========================================================
  // FILTRO / BUSCA / ORDENAÇÃO
  // ==========================================================

  const filteredList =
    useMemo(
      () => {
        const normalizedSearch =
          normalizeSearch(
            search
          );

        const result =
          listaEnriquecida.filter(
            (
              tratamento
            ) => {
              if (
                filtroStatus !==
                  "todos" &&
                tratamento.status !==
                  filtroStatus
              ) {
                return false;
              }

              if (
                !normalizedSearch
              ) {
                return true;
              }

              return normalizeSearch(
                tratamento.nome ||
                  ""
              ).includes(
                normalizedSearch
              );
            }
          );

        return [
          ...result,
        ].sort(
          (
            a,
            b
          ) =>
            String(
              a.nome ||
                ""
            ).localeCompare(
              String(
                b.nome ||
                  ""
              ),
              "pt-BR",
              {
                sensitivity:
                  "base",
              }
            )
        );
      },
      [
        listaEnriquecida,
        filtroStatus,
        search,
      ]
    );

  const hasFilters =
    filtroStatus !==
      "todos" ||
    search.trim().length >
      0;

  // ==========================================================
  // HANDLERS
  // ==========================================================

  const handleStatusFilter =
    (
      status:
        Exclude<
          TratamentoStatus,
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
          status
            ? "todos"
            : status
      );
    };

  const handleClearFilters =
    () => {
      trigger(
        "vibrate"
      );

      setFiltroStatus(
        "todos"
      );

      setSearch(
        ""
      );
    };

  const handleCreate =
    () => {
      trigger(
        "vibrate"
      );

      router.push(
        "/saude/tratamentos/novo"
      );
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-[100dvh] bg-void pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER / FILTROS
            ==================================================== */}

        <ListPageHeader
          title="Seus Tratamentos"
          subtitle={
            filtroStatus ===
              "todos" &&
            !search.trim()
              ? statusCounts.ativos ===
                1
                ? "1 tratamento em andamento"
                : `${statusCounts.ativos} tratamentos em andamento`
              : filteredList.length ===
                  1
                ? "1 resultado"
                : `${filteredList.length} resultados`
          }
        >
          <ListFilters
            onClear={
              hasFilters
                ? handleClearFilters
                : undefined
            }
          >
            <button
              type="button"
              onClick={() =>
                handleStatusFilter(
                  "ativo"
                )
              }
              aria-pressed={
                filtroStatus ===
                "ativo"
              }
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em] transition-all active:scale-95 ${
                filtroStatus ===
                "ativo"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Em andamento
              {statusCounts.ativos >
                0 && (
                <span className="ml-1 opacity-70">
                  {
                    statusCounts.ativos
                  }
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                handleStatusFilter(
                  "concluido"
                )
              }
              aria-pressed={
                filtroStatus ===
                "concluido"
              }
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em] transition-all active:scale-95 ${
                filtroStatus ===
                "concluido"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Concluídos
              {statusCounts.concluidos >
                0 && (
                <span className="ml-1 opacity-70">
                  {
                    statusCounts.concluidos
                  }
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                handleStatusFilter(
                  "suspenso"
                )
              }
              aria-pressed={
                filtroStatus ===
                "suspenso"
              }
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em] transition-all active:scale-95 ${
                filtroStatus ===
                "suspenso"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Suspensos
              {statusCounts.suspensos >
                0 && (
                <span className="ml-1 opacity-70">
                  {
                    statusCounts.suspensos
                  }
                </span>
              )}
            </button>
          </ListFilters>
        </ListPageHeader>

        {/* ====================================================
            BUSCA
            ==================================================== */}

        {listaEnriquecida.length >
          0 && (
          <section className="px-5 pt-4">
            <div className="relative mx-auto max-w-3xl">
              <Search
                size={
                  16
                }
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
              />

              <input
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event
                      .target
                      .value
                  )
                }
                type="search"
                inputMode="search"
                autoComplete="off"
                placeholder="Buscar tratamento..."
                aria-label="Buscar tratamento"
                className="h-11 w-full rounded-[16px] border border-surface-border/40 bg-surface/80 pl-10 pr-10 text-sm text-ink-primary outline-none transition-colors placeholder:text-ink-faint focus:border-ice/40 focus:bg-surface"
              />

              {search.length >
                0 && (
                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    setSearch(
                      ""
                    );
                  }}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary active:scale-95"
                >
                  <X
                    size={
                      15
                    }
                  />
                </button>
              )}
            </div>
          </section>
        )}

        {/* ====================================================
            LISTA
            ==================================================== */}

        <section className="mx-auto max-w-3xl space-y-3.5 px-5 pt-4">
          {filteredList.length ===
          0 ? (
            <EmptyState
              icon={
                Activity
              }
              title={
                hasFilters
                  ? "Nenhum tratamento encontrado"
                  : "Nenhum tratamento cadastrado"
              }
              description={
                hasFilters
                  ? "Nenhum tratamento corresponde à busca ou aos filtros atuais."
                  : "Cadastre tratamentos para organizar medicamentos, diagnósticos, profissionais e o histórico de acompanhamento."
              }
              actionLabel={
                hasFilters
                  ? "Limpar filtros"
                  : "Criar tratamento"
              }
              onAction={
                hasFilters
                  ? handleClearFilters
                  : handleCreate
              }
            />
          ) : (
            filteredList.map(
              (
                tratamento,
                index
              ) => {
                if (
                  !tratamento.id
                ) {
                  return null;
                }

                const theme =
                  getClinicalTheme(
                    tratamento.nome
                  );

                const IconComp =
                  theme.icon;

                return (
                  <ListCard
                    key={
                      tratamento.id
                    }
                    id={
                      tratamento.id
                    }
                    color={
                      theme.hex
                    }
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      router.push(
                        `/saude/tratamentos/detalhes?id=${tratamento.id}`
                      );
                    }}
                    delay={
                      Math.min(
                        index,
                        8
                      ) *
                      0.025
                    }
                    icon={
                      <IconComp
                        size={
                          22
                        }
                      />
                    }
                  >
                    {/* ==========================================
                        IDENTIDADE
                        ========================================== */}

                    <div className="flex min-w-0 items-baseline gap-2">
                      <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                        {
                          tratamento.nome
                        }
                      </h3>

                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${getStatusClasses(
                          tratamento.status
                        )}`}
                      >
                        {getStatusLabel(
                          tratamento.status
                        )}
                      </span>
                    </div>

                    {/* ==========================================
                        MÉTRICAS
                        ========================================== */}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                        <Pill
                          size={
                            10
                          }
                          className="text-ice"
                        />

                        {
                          tratamento.medicamentosCount
                        }{" "}
                        med
                        {tratamento.medicamentosCount !==
                        1
                          ? "s"
                          : ""}
                      </span>

                      {tratamento.status ===
                        "ativo" &&
                        tratamento.medicamentosCount >
                          0 && (
                          <span className="rounded-md border border-emerald-400/15 bg-emerald-400/5 px-2 py-0.5 text-[10px] text-emerald-400">
                            {
                              tratamento.medicamentosAtivosCount
                            }{" "}
                            em uso
                          </span>
                        )}

                      {tratamento.totalGasto >
                        0 && (
                        <span
                          className="flex items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted"
                          title="Histórico de aquisições dos medicamentos atualmente vinculados"
                        >
                          <History
                            size={
                              10
                            }
                            className="text-emerald-400"
                          />

                          {formatCurrency(
                            tratamento.totalGasto
                          )}
                        </span>
                      )}
                    </div>

                    {/* ==========================================
                        ALERTA
                        ========================================== */}

                    {tratamento.alertaPrincipal && (
                      <p className="mt-2 flex w-fit max-w-full items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-400">
                        <AlertTriangle
                          size={
                            10
                          }
                          className="shrink-0"
                        />

                        <span>
                          {
                            tratamento.alertaPrincipal.titulo
                          }
                        </span>
                      </p>
                    )}
                  </ListCard>
                );
              }
            )
          )}
        </section>

        {/* ====================================================
            FAB — NOVO TRATAMENTO
            ==================================================== */}

        <button
          type="button"
          onClick={
            handleCreate
          }
          aria-label="Criar novo tratamento"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-ice/25 bg-ice text-void shadow-[0_12px_32px_rgba(56,189,248,0.24)] transition-transform active:scale-95"
        >
          <Plus
            size={
              22
            }
          />
        </button>
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function TratamentosPage() {
  return (
    <Suspense
      fallback={
        <CardListSkeleton />
      }
    >
      <TratamentoListContent />
    </Suspense>
  );
}
