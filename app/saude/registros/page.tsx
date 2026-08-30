// app/saude/registros/page.tsx
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
  AlertTriangle,
  Calendar,
  Clock,
  FolderHeart,
  HeartPulse,
  Pill,
  Plus,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  getRegistroTheme,
} from "@/lib/health-utils";

import {
  analisarRegistroSaude,
} from "@/lib/health-insights";

import {
  useRegistrosSaude,
} from "@/hooks/useRegistrosSaude";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useTratamentos,
} from "@/hooks/useTratamentos";

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
  Medicamento,
  Tratamento,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type FiltroCategoria =
  | "todos"
  | "sintoma"
  | "medicao"
  | "humor";

// ============================================================
// HELPERS
// ============================================================

function formatDateToDisplay(
  isoStr?: string | null
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

function getCategoriaLabel(
  categoria?: string
): string {
  if (
    categoria === "sintoma"
  ) {
    return "Sintoma";
  }

  if (
    categoria === "medicao"
  ) {
    return "Medição";
  }

  if (
    categoria === "humor"
  ) {
    return "Humor";
  }

  return "Registro";
}

// ============================================================
// PAGE
// ============================================================

export default function RegistrosSaudePage() {
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    registros,
    isLoading,
  } =
    useRegistrosSaude();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    tratamentos = [],
  } =
    useTratamentos();

  const [
    filtroCategoria,
    setFiltroCategoria,
  ] =
    useState<FiltroCategoria>(
      "todos"
    );

  // ==========================================================
  // ÍNDICES
  // ==========================================================

  const medicamentosMap =
    useMemo(
      () =>
        new Map<
          string,
          Medicamento
        >(
          medicamentos
            .filter(
              (
                medicamento
              ) =>
                Boolean(
                  medicamento.id
                )
            )
            .map(
              (
                medicamento
              ) => [
                medicamento.id!,
                medicamento,
              ]
            )
        ),
      [
        medicamentos,
      ]
    );

  const tratamentosMap =
    useMemo(
      () =>
        new Map<
          string,
          Tratamento
        >(
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
  // CONTADORES
  // ==========================================================

  const counts =
    useMemo(
      () => {
        let sintomas =
          0;

        let medicoes =
          0;

        let humor =
          0;

        for (
          const registro of
          registros
        ) {
          if (
            registro.categoria ===
            "sintoma"
          ) {
            sintomas +=
              1;
          }

          if (
            registro.categoria ===
            "medicao"
          ) {
            medicoes +=
              1;
          }

          if (
            registro.categoria ===
            "humor"
          ) {
            humor +=
              1;
          }
        }

        return {
          sintomas,
          medicoes,
          humor,
        };
      },
      [
        registros,
      ]
    );

  // ==========================================================
  // FILTRO
  // ==========================================================

  const registrosFiltrados =
    useMemo(
      () => {
        if (
          filtroCategoria ===
          "todos"
        ) {
          return registros;
        }

        return registros.filter(
          (
            registro
          ) =>
            registro.categoria ===
            filtroCategoria
        );
      },
      [
        registros,
        filtroCategoria,
      ]
    );

  // ==========================================================
  // HANDLERS
  // ==========================================================

  const handleClearFilters =
    () => {
      trigger(
        "vibrate"
      );

      setFiltroCategoria(
        "todos"
      );
    };

  const handleFilter =
    (
      categoria:
        FiltroCategoria
    ) => {
      trigger(
        "vibrate"
      );

      setFiltroCategoria(
        categoria
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    isLoading
  ) {
    return (
      <CardListSkeleton />
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <ListPageHeader
          title="Sintomas e Medições"
          badgeLabel="Prontuário"
          badgeColor="text-ice/90"
          icon={
            <Activity
              size={
                14
              }
            />
          }
          iconColor="text-ice"
          rightAction={
            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/saude/registros/novo"
                  );
                }
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/20 transition-all active:scale-95"
              aria-label="Adicionar registro"
            >
              <Plus
                size={
                  22
                }
                strokeWidth={
                  2.5
                }
              />
            </button>
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
                  handleFilter(
                    "todos"
                  )
              }
              aria-pressed={
                filtroCategoria ===
                "todos"
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroCategoria ===
                "todos"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Todos (
              {
                registros.length
              }
              )
            </button>

            <button
              type="button"
              onClick={
                () =>
                  handleFilter(
                    "sintoma"
                  )
              }
              aria-pressed={
                filtroCategoria ===
                "sintoma"
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroCategoria ===
                "sintoma"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Sintomas (
              {
                counts.sintomas
              }
              )
            </button>

            <button
              type="button"
              onClick={
                () =>
                  handleFilter(
                    "medicao"
                  )
              }
              aria-pressed={
                filtroCategoria ===
                "medicao"
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroCategoria ===
                "medicao"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Medições (
              {
                counts.medicoes
              }
              )
            </button>

            {counts.humor >
              0 && (
              <button
                type="button"
                onClick={
                  () =>
                    handleFilter(
                      "humor"
                    )
                }
                aria-pressed={
                  filtroCategoria ===
                  "humor"
                }
                className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                  filtroCategoria ===
                  "humor"
                    ? "border-violet-400 bg-violet-400/20 text-violet-300"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <HeartPulse
                  size={
                    10
                  }
                />

                Humor (
                {
                  counts.humor
                }
                )
              </button>
            )}
          </ListFilters>
        </ListPageHeader>

        {/* ====================================================
            LISTA
            ==================================================== */}

        <section className="space-y-3.5 px-5 pt-4">
          {registrosFiltrados.length ===
          0 ? (
            <EmptyState
              icon={
                Activity
              }
              title={
                filtroCategoria !==
                "todos"
                  ? "Nenhum registro com este filtro"
                  : "Nenhum registro de saúde"
              }
              description={
                filtroCategoria !==
                "todos"
                  ? "Tente ajustar o filtro ou cadastre um novo registro."
                  : "Comece a acompanhar sintomas, medições e outras informações de saúde."
              }
              actionLabel="Registrar"
              onAction={
                () => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/saude/registros/novo"
                  );
                }
              }
              iconClassName="bg-ice/10 border-ice/20 text-ice"
            />
          ) : (
            registrosFiltrados.map(
              (
                item,
                index
              ) => {
                if (
                  !item.id
                ) {
                  return null;
                }

                const theme =
                  getRegistroTheme(
                    item.nome
                  );

                const IconComp =
                  theme.icon;

                const insight =
                  analisarRegistroSaude(
                    item.nome,
                    item.valor_medicao,
                    item.intensidade,
                    item.observacoes
                  );

                const medicamento =
                  item.medicamento_id
                    ? medicamentosMap.get(
                        item.medicamento_id
                      )
                    : undefined;

                const tratamentosRelacionados =
                  (
                    item.tratamento_ids ||
                    []
                  )
                    .map(
                      (
                        tratamentoId
                      ) =>
                        tratamentosMap.get(
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
                    );

                return (
                  <ListCard
                    key={
                      item.id
                    }
                    id={
                      item.id
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
                          `/saude/registros/detalhes?id=${item.id}`
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
                        TÍTULO
                        ========================================== */}

                    <div className="flex min-w-0 items-baseline gap-2">
                      <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                        {
                          item.nome
                        }
                      </h3>

                      <span className="shrink-0 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[9px] font-semibold uppercase text-ink-faint">
                        {getCategoriaLabel(
                          item.categoria
                        )}
                      </span>
                    </div>

                    {/* ==========================================
                        VALOR / INTENSIDADE
                        ========================================== */}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {item.intensidade !==
                        undefined && (
                        <span className="shrink-0 whitespace-nowrap rounded-md border border-surface-border/50 bg-surface-raised px-2 py-0.5 font-mono text-[10px] font-bold text-ink-muted">
                          Nível{" "}
                          {
                            item.intensidade
                          }
                          /10
                        </span>
                      )}

                      {item.valor_medicao && (
                        <span className="shrink-0 whitespace-nowrap rounded-md border border-ice/20 bg-ice/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-ice">
                          {
                            item.valor_medicao
                          }
                        </span>
                      )}
                    </div>

                    {/* ==========================================
                        DATA / HORA
                        ========================================== */}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar
                          size={
                            12
                          }
                        />

                        {formatDateToDisplay(
                          item.data
                        )}
                      </span>

                      {item.horario && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock
                            size={
                              12
                            }
                          />

                          {
                            item.horario
                          }
                        </span>
                      )}
                    </div>

                    {/* ==========================================
                        RELAÇÕES
                        ========================================== */}

                    {(medicamento ||
                      tratamentosRelacionados.length >
                        0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {medicamento && (
                          <span className="flex max-w-[140px] items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[9px] font-medium text-amber-400">
                            <Pill
                              size={
                                10
                              }
                              className="shrink-0"
                            />

                            <span className="truncate">
                              {
                                medicamento.nome
                              }
                            </span>
                          </span>
                        )}

                        {tratamentosRelacionados
                          .slice(
                            0,
                            2
                          )
                          .map(
                            (
                              tratamento
                            ) => (
                              <span
                                key={
                                  tratamento.id
                                }
                                className="flex max-w-[140px] items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[9px] font-medium text-violet-400"
                              >
                                <FolderHeart
                                  size={
                                    10
                                  }
                                  className="shrink-0"
                                />

                                <span className="truncate">
                                  {
                                    tratamento.nome
                                  }
                                </span>
                              </span>
                            )
                          )}

                        {tratamentosRelacionados.length >
                          2 && (
                          <span className="text-[9px] text-ink-faint">
                            +
                            {tratamentosRelacionados.length -
                              2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* ==========================================
                        BARRA DE INTENSIDADE
                        ========================================== */}

                    {item.intensidade !==
                      undefined && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-border">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width:
                                `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    (
                                      item.intensidade /
                                      10
                                    ) *
                                      100
                                  )
                                )}%`,

                              backgroundColor:
                                theme.hex,
                            }}
                          />
                        </div>

                        <span className="font-mono text-[9px] text-ink-faint">
                          {
                            item.intensidade
                          }
                          /10
                        </span>
                      </div>
                    )}

                    {/* ==========================================
                        INSIGHT
                        ========================================== */}

                    {insight &&
                      insight.status !==
                        "normal" && (
                        <div
                          className={`mt-2.5 flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                            insight.status ===
                            "critico"
                              ? "border-coral/30 bg-coral/10 text-coral"
                              : insight.status ===
                                  "alerta"
                                ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                                : insight.status ===
                                    "atencao"
                                  ? "border-ice/30 bg-ice/10 text-ice"
                                  : "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                          }`}
                        >
                          <AlertTriangle
                            size={
                              12
                            }
                          />

                          {
                            insight.titulo
                          }
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