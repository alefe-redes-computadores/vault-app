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
  DollarSign,
  Pill,
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
    medicamentosCount:
      number;

    medicamentosAtivosCount:
      number;

    totalGasto:
      number;

    alertaSemMedicamento:
      boolean;
  };

// ============================================================
// HELPERS
// ============================================================

function getStatusLabel(
  status:
    Tratamento["status"]
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
  status:
    Tratamento["status"]
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
  value:
    Renovacao["preco"]
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

  /*
   * Todos os três hooks já respeitam a pessoa ativa.
   *
   * Não fazemos um segundo filtro person_id na UI.
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
  // ÍNDICES
  // ==========================================================

  /*
   * Montamos um índice:
   *
   * tratamentoId -> medicamentos atualmente vinculados
   *
   * A fonte canônica da relação é:
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

  /*
   * Índice do histórico financeiro por medicamento.
   *
   * Aqui usamos apenas Renovacoes porque elas representam
   * eventos reais de aquisição.
   *
   * Não somamos Medicamento.preco, evitando contar o preço
   * atual junto com o histórico e duplicar o custo.
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
      () => {
        return tratamentos.map(
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

                alertaSemMedicamento:
                  tratamento.status ===
                  "ativo",
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

            const alertaSemMedicamento =
              tratamento.status ===
                "ativo" &&
              meds.length ===
                0;

            return {
              ...tratamento,

              medicamentosCount:
                meds.length,

              medicamentosAtivosCount,

              totalGasto,

              alertaSemMedicamento,
            };
          }
        );
      },
      [
        tratamentos,
        medicamentosPorTratamento,
        gastoPorMedicamento,
      ]
    );

  // ==========================================================
  // FILTRO / ORDENAÇÃO
  // ==========================================================

  const filteredList =
    useMemo(
      () => {
        const result =
          filtroStatus ===
          "todos"
            ? listaEnriquecida
            : listaEnriquecida.filter(
                (
                  tratamento
                ) =>
                  tratamento.status ===
                  filtroStatus
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
      ]
    );

  // ==========================================================
  // CONTADORES
  // ==========================================================

  const tratamentosAtivos =
    useMemo(
      () =>
        listaEnriquecida.filter(
          (
            tratamento
          ) =>
            tratamento.status ===
            "ativo"
        ).length,
      [
        listaEnriquecida,
      ]
    );

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
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        {/* ====================================================
            HEADER / FILTROS
            ==================================================== */}

        <ListPageHeader
          title="Seus Tratamentos"
          subtitle={
            filtroStatus ===
            "todos"
              ? tratamentosAtivos ===
                1
                ? "1 tratamento em andamento"
                : `${tratamentosAtivos} tratamentos em andamento`
              : filteredList.length ===
                  1
                ? "1 resultado"
                : `${filteredList.length} resultados`
          }
        >
          <ListFilters
            onClear={
              handleClearFilters
            }
          >
            <button
              type="button"
              onClick={
                () =>
                  handleStatusFilter(
                    "ativo"
                  )
              }
              aria-pressed={
                filtroStatus ===
                "ativo"
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "ativo"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Em andamento
            </button>

            <button
              type="button"
              onClick={
                () =>
                  handleStatusFilter(
                    "concluido"
                  )
              }
              aria-pressed={
                filtroStatus ===
                "concluido"
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "concluido"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Concluído
            </button>

            <button
              type="button"
              onClick={
                () =>
                  handleStatusFilter(
                    "suspenso"
                  )
              }
              aria-pressed={
                filtroStatus ===
                "suspenso"
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "suspenso"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Suspenso
            </button>
          </ListFilters>
        </ListPageHeader>

        {/* ====================================================
            LISTA
            ==================================================== */}

        <section className="space-y-3.5 px-5 pt-4">
          {filteredList.length ===
          0 ? (
            <EmptyState
              icon={
                Activity
              }
              title={
                filtroStatus !==
                "todos"
                  ? "Nenhum tratamento com esse status"
                  : "Nenhum tratamento cadastrado"
              }
              description={
                filtroStatus !==
                "todos"
                  ? "Ajuste os filtros para visualizar outros tratamentos."
                  : "Cadastre tratamentos para organizar medicamentos, diagnósticos, profissionais e o histórico de acompanhamento."
              }
            />
          ) : (
            filteredList.map(
              (
                tratamento,
                index
              ) => {
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
                      tratamento.id!
                    }
                    color={
                      theme.hex
                    }
                    onClick={
                      () => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/tratamentos/detalhes?id=${tratamento.id}`
                        );
                      }
                    }
                    delay={
                      index *
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
                        <span className="flex items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                          <DollarSign
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

                    {tratamento.alertaSemMedicamento && (
                      <p className="mt-2 flex w-fit items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                        <AlertTriangle
                          size={
                            10
                          }
                        />

                        Tratamento ativo sem medicamento vinculado
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