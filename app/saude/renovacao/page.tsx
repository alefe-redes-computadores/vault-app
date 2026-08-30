// app/saude/renovacao/page.tsx
"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FileWarning,
  MessageCircle,
  Pill,
  Receipt,
  Store,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  EmptyState,
} from "@/components/EmptyState";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  analisarValidadeReceita,
} from "@/lib/health-insights";

import {
  formatCurrency,
  getClinicalTheme,
} from "@/lib/health-utils";

import {
  ListCard,
  ListFilters,
  ListPageHeader,
  ListSearch,
} from "@/components/list";

import type {
  Renovacao,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type PeriodFilter =
  | "todos"
  | "30dias"
  | "60dias";

type StatusFilter =
  | "todos"
  | "vencida"
  | "valida";

type AcquisitionFilter =
  | "todos"
  | "comprado"
  | "sus";

type RenovacaoEnriquecida =
  Renovacao & {
    medicamentoNome: string;

    medicamentoDosagem:
      string;

    validadeHistorica:
      string | null;

    validadeConhecida:
      boolean;

    vencida:
      boolean;

    diasRestantes:
      number | null;
  };

// ============================================================
// DATAS
// ============================================================

function formatDateDisplay(
  isoStr?: string
): string {
  if (!isoStr) {
    return "";
  }

  const clean =
    isoStr.split("T")[0];

  const parts =
    clean.split("-");

  if (
    parts.length !==
    3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ============================================================
// PREÇO / AQUISIÇÃO
// ============================================================

function getAcquisitionLabel(
  renovacao: Renovacao
): string {
  if (
    renovacao.tipo_aquisicao ===
    "sus"
  ) {
    return "SUS / Gratuito";
  }

  if (
    typeof renovacao.preco ===
      "number" &&
    Number.isFinite(
      renovacao.preco
    ) &&
    renovacao.preco >=
      0
  ) {
    return formatCurrency(
      renovacao.preco
    );
  }

  return "Valor não informado";
}

// ============================================================
// FILTRO TEMPORAL
// ============================================================

function isWithinLastDays(
  isoDate: string,
  days: number
): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      isoDate
    );

  if (!match) {
    return false;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const registro =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    registro.getFullYear() !==
      year ||
    registro.getMonth() !==
      month - 1 ||
    registro.getDate() !==
      day
  ) {
    return false;
  }

  const hoje =
    new Date();

  hoje.setHours(
    0,
    0,
    0,
    0
  );

  registro.setHours(
    0,
    0,
    0,
    0
  );

  const limite =
    new Date(
      hoje
    );

  limite.setDate(
    limite.getDate() -
      days
  );

  return (
    registro.getTime() >=
      limite.getTime() &&
    registro.getTime() <=
      hoje.getTime()
  );
}

// ============================================================
// PAGE
// ============================================================

export default function RenovacoesPage() {
  const {
    trigger,
  } =
    useHapticFeedback();

  const router =
    useRouter();

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

  const [
    filtroPeriodo,
    setFiltroPeriodo,
  ] =
    useState<PeriodFilter>(
      "todos"
    );

  const [
    filtroStatus,
    setFiltroStatus,
  ] =
    useState<StatusFilter>(
      "todos"
    );

  const [
    filtroAquisicao,
    setFiltroAquisicao,
  ] =
    useState<AcquisitionFilter>(
      "todos"
    );

  const {
    renovacoes,
  } =
    useRenovacoes();

  const {
    medicamentos,
  } =
    useMedicamentos();

  // ==========================================================
  // MEDICAMENTOS
  // ==========================================================

  const medicamentoMap =
    useMemo(
      () =>
        new Map(
          medicamentos.map(
            (
              medicamento
            ) => [
              medicamento.id,
              medicamento,
            ]
          )
        ),
      [
        medicamentos,
      ]
    );

  // ==========================================================
  // ENRIQUECIMENTO HISTÓRICO
  // ==========================================================

  const renovacoesEnriquecidas =
    useMemo<
      RenovacaoEnriquecida[]
    >(
      () =>
        renovacoes.map(
          (
            renovacao
          ) => {
            const medicamento =
              medicamentoMap.get(
                renovacao.medicamento_id
              );

            /*
             * A tela não calcula mais validade.
             *
             * Toda interpretação da receita vem do cérebro
             * transversal do Vault.
             */
            const validade =
              analisarValidadeReceita(
                renovacao.data
              );

            const validadeConhecida =
              validade.status !==
                "sem_data" &&
              Boolean(
                validade.dataValidade
              );

            return {
              ...renovacao,

              medicamentoNome:
                medicamento?.nome ||
                "Medicamento não encontrado",

              medicamentoDosagem:
                medicamento?.dosagem ||
                "",

              validadeHistorica:
                validade.dataValidade,

              validadeConhecida,

              vencida:
                validade.vencida,

              diasRestantes:
                validade.diasRestantes,
            };
          }
        ),
      [
        renovacoes,
        medicamentoMap,
      ]
    );

  // ==========================================================
  // INDICADORES
  // ==========================================================

  const indicadores =
    useMemo(
      () => {
        let vencidas =
          0;

        let proximas =
          0;

        let sus =
          0;

        for (
          const renovacao of
          renovacoesEnriquecidas
        ) {
          if (
            renovacao.validadeConhecida &&
            renovacao.vencida
          ) {
            vencidas +=
              1;
          }

          if (
            renovacao.validadeConhecida &&
            !renovacao.vencida &&
            renovacao.diasRestantes !==
              null &&
            renovacao.diasRestantes >=
              0 &&
            renovacao.diasRestantes <=
              7
          ) {
            proximas +=
              1;
          }

          if (
            renovacao.tipo_aquisicao ===
            "sus"
          ) {
            sus +=
              1;
          }
        }

        return {
          total:
            renovacoesEnriquecidas.length,

          vencidas,

          proximas,

          sus,
        };
      },
      [
        renovacoesEnriquecidas,
      ]
    );

  // ==========================================================
  // FILTROS
  // ==========================================================

  const filteredRenovacoes =
    useMemo(
      () => {
        let result =
          renovacoesEnriquecidas;

        const normalizedSearch =
          search
            .trim()
            .toLocaleLowerCase(
              "pt-BR"
            );

        if (
          normalizedSearch
        ) {
          result =
            result.filter(
              (
                renovacao
              ) => {
                const fields = [
                  renovacao.medicamentoNome,
                  renovacao.medicamentoDosagem,
                  renovacao.observacoes,
                  renovacao.lote,
                ];

                return fields.some(
                  (
                    value
                  ) =>
                    value
                      ?.toLocaleLowerCase(
                        "pt-BR"
                      )
                      .includes(
                        normalizedSearch
                      )
                );
              }
            );
        }

        if (
          filtroPeriodo ===
          "30dias"
        ) {
          result =
            result.filter(
              (
                renovacao
              ) =>
                isWithinLastDays(
                  renovacao.data,
                  30
                )
            );
        }

        if (
          filtroPeriodo ===
          "60dias"
        ) {
          result =
            result.filter(
              (
                renovacao
              ) =>
                isWithinLastDays(
                  renovacao.data,
                  60
                )
            );
        }

        if (
          filtroStatus ===
          "vencida"
        ) {
          result =
            result.filter(
              (
                renovacao
              ) =>
                renovacao.validadeConhecida &&
                renovacao.vencida
            );
        }

        if (
          filtroStatus ===
          "valida"
        ) {
          result =
            result.filter(
              (
                renovacao
              ) =>
                renovacao.validadeConhecida &&
                !renovacao.vencida
            );
        }

        if (
          filtroAquisicao !==
          "todos"
        ) {
          result =
            result.filter(
              (
                renovacao
              ) =>
                renovacao.tipo_aquisicao ===
                filtroAquisicao
            );
        }

        /*
         * useRenovacoes já entrega o histórico ordenado.
         *
         * Criamos nova referência para impedir mutação acidental
         * caso novos tratamentos sejam adicionados depois.
         */
        return [
          ...result,
        ];
      },
      [
        renovacoesEnriquecidas,
        search,
        filtroPeriodo,
        filtroStatus,
        filtroAquisicao,
      ]
    );

  // ==========================================================
  // FILTER ACTIONS
  // ==========================================================

  const handleClearFilters =
    () => {
      trigger(
        "vibrate"
      );

      setFiltroPeriodo(
        "todos"
      );

      setFiltroStatus(
        "todos"
      );

      setFiltroAquisicao(
        "todos"
      );
    };

  const hasActiveFilters =
    filtroPeriodo !==
      "todos" ||
    filtroStatus !==
      "todos" ||
    filtroAquisicao !==
      "todos";

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Histórico de Renovações"
          badgeLabel="RECEITAS E AQUISIÇÕES"
          badgeColor="text-ice"
        >
          <ListSearch
            value={
              search
            }
            onChange={
              setSearch
            }
            placeholder="Buscar medicamento, notas ou lote..."
          />

          {/* ==================================================
              RESUMO
              ================================================== */}

          {indicadores.total >
            0 && (
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised p-2.5 text-center">
                <p className="font-mono text-base font-bold text-ink-primary">
                  {
                    indicadores.total
                  }
                </p>

                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                  Registros
                </p>
              </div>

              <div className="rounded-2xl border border-coral/20 bg-coral/5 p-2.5 text-center">
                <p className="font-mono text-base font-bold text-coral">
                  {
                    indicadores.vencidas
                  }
                </p>

                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                  Expiradas
                </p>
              </div>

              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-2.5 text-center">
                <p className="font-mono text-base font-bold text-amber-400">
                  {
                    indicadores.proximas
                  }
                </p>

                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                  Até 7 dias
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-2.5 text-center">
                <p className="font-mono text-base font-bold text-emerald-400">
                  {
                    indicadores.sus
                  }
                </p>

                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                  SUS
                </p>
              </div>
            </div>
          )}

          {/* ==================================================
              FILTERS
              ================================================== */}

          <ListFilters
            onClear={
              handleClearFilters
            }
          >
            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setFiltroPeriodo(
                    filtroPeriodo ===
                      "30dias"
                      ? "todos"
                      : "30dias"
                  );
                }
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroPeriodo ===
                "30dias"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted"
              }`}
            >
              Últimos 30 dias
            </button>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setFiltroPeriodo(
                    filtroPeriodo ===
                      "60dias"
                      ? "todos"
                      : "60dias"
                  );
                }
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroPeriodo ===
                "60dias"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted"
              }`}
            >
              Últimos 60 dias
            </button>

            <div className="mx-1 h-5 w-px bg-surface-border/40" />

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setFiltroStatus(
                    filtroStatus ===
                      "vencida"
                      ? "todos"
                      : "vencida"
                  );
                }
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "vencida"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted"
              }`}
            >
              Expirada
            </button>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setFiltroStatus(
                    filtroStatus ===
                      "valida"
                      ? "todos"
                      : "valida"
                  );
                }
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "valida"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted"
              }`}
            >
              Dentro da validade
            </button>

            <div className="mx-1 h-5 w-px bg-surface-border/40" />

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setFiltroAquisicao(
                    filtroAquisicao ===
                      "comprado"
                      ? "todos"
                      : "comprado"
                  );
                }
              }
              className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroAquisicao ===
                "comprado"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted"
              }`}
            >
              <Store
                size={
                  10
                }
              />

              Particular
            </button>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setFiltroAquisicao(
                    filtroAquisicao ===
                      "sus"
                      ? "todos"
                      : "sus"
                  );
                }
              }
              className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroAquisicao ===
                "sus"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted"
              }`}
            >
              <Receipt
                size={
                  10
                }
              />

              SUS
            </button>
          </ListFilters>
        </ListPageHeader>

        {/* ====================================================
            LISTA
            ==================================================== */}

        <section className="space-y-3.5 px-5 pt-4">
          {filteredRenovacoes.length ===
          0 ? (
            <EmptyState
              icon={
                FileWarning
              }
              title="Nenhuma renovação encontrada"
              description={
                search ||
                hasActiveFilters
                  ? "Tente ajustar a busca ou os filtros aplicados."
                  : "Registre uma renovação para começar a construir o histórico de receitas e aquisições."
              }
            />
          ) : (
            filteredRenovacoes.map(
              (
                renovacao,
                index
              ) => {
                const theme =
                  getClinicalTheme(
                    renovacao.medicamentoNome
                  );

                const borderColor =
                  renovacao.validadeConhecida &&
                  renovacao.vencida
                    ? "#EF4444"
                    : theme.hex;

                const acquisitionLabel =
                  getAcquisitionLabel(
                    renovacao
                  );

                return (
                  <ListCard
                    key={
                      renovacao.id
                    }
                    id={
                      renovacao.id!
                    }
                    color={
                      borderColor
                    }
                    onClick={
                      () => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/renovacao/detalhes?id=${renovacao.id}`
                        );
                      }
                    }
                    delay={
                      index *
                      0.025
                    }
                    icon={
                      <Pill
                        size={
                          22
                        }
                      />
                    }
                  >
                    {/* ========================================
                        TÍTULO
                        ======================================== */}

                    <div className="flex min-w-0 items-baseline gap-2">
                      <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                        {
                          renovacao.medicamentoNome
                        }
                      </h3>

                      <span
                        className={`shrink-0 whitespace-nowrap text-xs font-mono font-medium ${
                          renovacao.tipo_aquisicao ===
                          "sus"
                            ? "text-emerald-400"
                            : renovacao.preco !==
                                undefined &&
                              renovacao.preco !==
                                null
                              ? "text-emerald-400"
                              : "text-ink-muted"
                        }`}
                      >
                        {
                          acquisitionLabel
                        }
                      </span>
                    </div>

                    {renovacao.medicamentoDosagem && (
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {
                          renovacao.medicamentoDosagem
                        }
                      </p>
                    )}

                    {/* ========================================
                        META
                        ======================================== */}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar
                          size={
                            12
                          }
                          className="text-ice"
                        />

                        {formatDateDisplay(
                          renovacao.data
                        )}
                      </span>

                      {/* AQUISIÇÃO */}

                      <span
                        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          renovacao.tipo_aquisicao ===
                          "sus"
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                            : "border-ice/20 bg-ice/10 text-ice"
                        }`}
                      >
                        {renovacao.tipo_aquisicao ===
                        "sus" ? (
                          <Receipt
                            size={
                              10
                            }
                          />
                        ) : (
                          <Store
                            size={
                              10
                            }
                          />
                        )}

                        {renovacao.tipo_aquisicao ===
                        "sus"
                          ? "SUS"
                          : "Particular"}
                      </span>

                      {/* VALIDADE */}

                      {renovacao.validadeConhecida && (
                        renovacao.vencida ? (
                          <span className="flex items-center gap-1 rounded-full border border-coral/30 bg-coral/20 px-2 py-0.5 text-[10px] font-bold uppercase text-coral">
                            <AlertCircle
                              size={
                                10
                              }
                            />

                            Expirada
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                            <CheckCircle2
                              size={
                                10
                              }
                            />

                            Válida
                          </span>
                        )
                      )}

                      {/* DIAS */}

                      {renovacao.validadeConhecida &&
                        renovacao.diasRestantes !==
                          null &&
                        !renovacao.vencida &&
                        renovacao.diasRestantes >=
                          0 && (
                          <span
                            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                              renovacao.diasRestantes <=
                              7
                                ? "border-amber-400/30 bg-amber-400/20 text-amber-400"
                                : "border-surface-border/40 bg-surface-raised text-ink-muted"
                            }`}
                          >
                            <Clock
                              size={
                                10
                              }
                            />

                            {renovacao.diasRestantes ===
                            0
                              ? "Vence hoje"
                              : `${renovacao.diasRestantes} dia(s)`}
                          </span>
                        )}

                      {/* QUANTIDADE */}

                      {renovacao.quantidade !==
                        undefined &&
                        renovacao.quantidade !==
                          null && (
                          <span className="flex items-center gap-1 rounded-full border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                            <Receipt
                              size={
                                10
                              }
                            />

                            Qtd.{" "}
                            {
                              renovacao.quantidade
                            }
                          </span>
                        )}

                      {/* OBS */}

                      {renovacao.observacoes && (
                        <span className="flex max-w-[180px] items-center gap-1 truncate text-ink-muted">
                          <MessageCircle
                            size={
                              11
                            }
                            className="shrink-0"
                          />

                          <span className="truncate">
                            {
                              renovacao.observacoes
                            }
                          </span>
                        </span>
                      )}
                    </div>
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