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
  Search,
  X,
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

function normalizeSearchValue(
  value?: string | null
): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
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

  const [
    busca,
    setBusca,
  ] = useState("");

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
        const termo =
          normalizeSearchValue(
            busca
          );

        return registros.filter(
          (registro) => {
            if (
              filtroCategoria !== "todos" &&
              registro.categoria !== filtroCategoria
            ) {
              return false;
            }

            if (!termo) {
              return true;
            }

            const medicamento =
              registro.medicamento_id
                ? medicamentosMap.get(
                    registro.medicamento_id
                  )
                : undefined;

            const nomesTratamentos =
              (registro.tratamento_ids || [])
                .map((tratamentoId) =>
                  tratamentosMap.get(tratamentoId)?.nome
                )
                .filter(Boolean)
                .join(" ");

            const searchable = [
              registro.nome,
              registro.tipo,
              registro.valor_medicao,
              registro.observacoes,
              medicamento?.nome,
              nomesTratamentos,
            ]
              .map(normalizeSearchValue)
              .join(" ");

            return searchable.includes(
              termo
            );
          }
        );
      },
      [
        registros,
        filtroCategoria,
        busca,
        medicamentosMap,
        tratamentosMap,
      ]
    );

  const alertasVisiveis =
    useMemo(
      () =>
        registrosFiltrados.reduce(
          (total, registro) => {
            const insight =
              analisarRegistroSaude(
                registro.nome,
                registro.valor_medicao,
                registro.intensidade,
                registro.observacoes
              );

            return insight &&
              insight.status !== "normal"
              ? total + 1
              : total;
          },
          0
        ),
      [registrosFiltrados]
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

      setBusca("");
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
          <div className="relative mt-3 w-full">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />

              <input
                type="search"
                value={busca}
                onChange={(event) =>
                  setBusca(event.target.value)
                }
                placeholder="Buscar registro, medicamento ou tratamento"
                className="h-10 w-full rounded-xl border border-surface-border/50 bg-surface-raised pl-9 pr-10 text-sm text-ink-primary outline-none transition-colors placeholder:text-ink-faint focus:border-ice/50"
                aria-label="Buscar registros de saúde"
              />

              {busca && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setBusca("");
                  }}
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-border/40 hover:text-ink-primary active:scale-95"
                  aria-label="Limpar busca"
                >
                  <X size={15} />
                </button>
              )}
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
          {alertasVisiveis > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-3.5 py-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                <AlertTriangle size={16} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-200">
                  {alertasVisiveis === 1
                    ? "1 registro destacado nesta lista"
                    : `${alertasVisiveis} registros destacados nesta lista`}
                </p>

                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                  São leituras dos valores registrados nas respectivas datas, não uma avaliação do estado atual nem um diagnóstico.
                </p>
              </div>
            </div>
          )}

          {registrosFiltrados.length ===
          0 ? (
            <EmptyState
              icon={
                Activity
              }
              title={
                filtroCategoria !==
                  "todos" || busca
                  ? "Nenhum registro com este filtro"
                  : "Nenhum registro de saúde"
              }
              description={
                filtroCategoria !==
                  "todos" || busca
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
