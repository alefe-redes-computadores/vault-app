// app/saude/farmacias/page.tsx
"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  Award,
  Clock,
  DollarSign,
  Edit3,
  MapPin,
  Phone,
  Pill,
  Store,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";
import {
  analisarMelhorFarmacia,
} from "@/lib/health-insights";

import {
  useFarmacias,
} from "@/hooks/useFarmacias";
import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";
import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  PageTransition,
} from "@/components/PageTransition";
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
  Farmacia,
  Medicamento,
  Renovacao,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type RankingFarmacia = {
  farmacia_id: string;
  media_preco: number;
  total_compras: number;
};

type FarmaciaComAnalise =
  Farmacia & {
    medicamentosCount: number;
    totalGasto: number;
    estatisticaEconomia:
      | (RankingFarmacia & {
          posicao: number;
        })
      | null;
    isMaisEconomica: boolean;
    ultimaCompra:
      | Renovacao
      | null;
    ultimosMedicamentos:
      string[];
  };

type FiltroStatus =
  | "todos"
  | "com_medicamentos"
  | "mais_economica";

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
    parts.length !== 3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(
  value: number
): string {
  return `R$ ${value
    .toFixed(2)
    .replace(".", ",")}`;
}

// ============================================================
// PAGE
// ============================================================

export default function FarmaciasPage() {
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
    useState("");

  const [
    filtroStatus,
    setFiltroStatus,
  ] =
    useState<FiltroStatus>(
      "todos"
    );

  /*
   * Farmácias:
   * entidade GLOBAL por usuário.
   *
   * Medicamentos e renovações:
   * contexto da PESSOA ATIVA.
   *
   * Portanto a Farmácia continua sempre visível,
   * enquanto suas métricas representam apenas o
   * contexto clínico atualmente selecionado.
   */
  const {
    farmacias = [],
  } =
    useFarmacias();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    renovacoes = [],
  } =
    useRenovacoes();

  // ==========================================================
  // RANKING
  // ==========================================================

  const rankingFarmacias =
    useMemo<
      RankingFarmacia[]
    >(() => {
      const resultado =
        analisarMelhorFarmacia(
          renovacoes
        );

      return resultado.map(
        (item) => ({
          farmacia_id:
            item.farmacia_id,

          media_preco:
            item.media_preco,

          total_compras:
            item.total_compras,
        })
      );
    }, [
      renovacoes,
    ]);

  const rankingMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          RankingFarmacia & {
            posicao: number;
          }
        >();

      rankingFarmacias.forEach(
        (
          ranking,
          index
        ) => {
          map.set(
            ranking.farmacia_id,
            {
              ...ranking,
              posicao:
                index + 1,
            }
          );
        }
      );

      return map;
    }, [
      rankingFarmacias,
    ]);

  // ==========================================================
  // ANALYSIS
  // ==========================================================

  const farmaciasComAnalise =
    useMemo<
      FarmaciaComAnalise[]
    >(() => {
      return farmacias.map(
        (farmacia) => {
          if (!farmacia.id) {
            return {
              ...farmacia,
              medicamentosCount:
                0,
              totalGasto: 0,
              estatisticaEconomia:
                null,
              isMaisEconomica:
                false,
              ultimaCompra:
                null,
              ultimosMedicamentos:
                [],
            };
          }

          /*
           * Estes arrays já vêm person-scoped pelos hooks.
           * Não fazemos nenhuma filtragem por person_id
           * na Farmácia.
           */
          const medsDaFarmacia =
            medicamentos.filter(
              (
                medicamento:
                  Medicamento
              ) =>
                medicamento.farmacia_id ===
                farmacia.id
            );

          const renovacoesDaFarmacia =
            renovacoes.filter(
              (
                renovacao:
                  Renovacao
              ) =>
                renovacao.farmacia_id ===
                farmacia.id
            );

          const renovacoesOrdenadas =
            [
              ...renovacoesDaFarmacia,
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

          const ultimaCompra =
            renovacoesOrdenadas[0] ||
            null;

          const nomesRecentes:
            string[] =
            [];

          renovacoesOrdenadas.forEach(
            (
              renovacao
            ) => {
              const medicamento =
                medicamentos.find(
                  (
                    item
                  ) =>
                    item.id ===
                    renovacao.medicamento_id
                );

              if (
                medicamento?.nome &&
                !nomesRecentes.includes(
                  medicamento.nome
                )
              ) {
                nomesRecentes.push(
                  medicamento.nome
                );
              }
            }
          );

          /*
           * Renovações são a fonte histórica principal.
           */
          let totalGasto =
            renovacoesDaFarmacia.reduce(
              (
                total,
                renovacao
              ) => {
                if (
                  typeof renovacao.preco ===
                    "number" &&
                  renovacao.preco >
                    0
                ) {
                  return (
                    total +
                    renovacao.preco
                  );
                }

                return total;
              },
              0
            );

          /*
           * Mantemos o fallback legado do próprio Medicamento,
           * mas evitamos contar novamente quando já existe uma
           * Renovação equivalente.
           */
          medsDaFarmacia.forEach(
            (
              medicamento
            ) => {
              if (
                typeof medicamento.preco !==
                  "number" ||
                medicamento.preco <=
                  0
              ) {
                return;
              }

              const possuiRenovacaoEquivalente =
                renovacoesDaFarmacia.some(
                  (
                    renovacao
                  ) =>
                    renovacao.medicamento_id ===
                      medicamento.id &&
                    renovacao.preco ===
                      medicamento.preco &&
                    (
                      renovacao.data ===
                        medicamento.data_receita ||
                      renovacao.data ===
                        medicamento.estoque_data_referencia
                    )
                );

              if (
                !possuiRenovacaoEquivalente
              ) {
                totalGasto +=
                  medicamento.preco;
              }

              if (
                medicamento.nome &&
                !nomesRecentes.includes(
                  medicamento.nome
                )
              ) {
                nomesRecentes.push(
                  medicamento.nome
                );
              }
            }
          );

          const estatisticaEconomia =
            rankingMap.get(
              farmacia.id
            ) ||
            null;

          return {
            ...farmacia,

            medicamentosCount:
              medsDaFarmacia.length,

            totalGasto,

            estatisticaEconomia,

            isMaisEconomica:
              estatisticaEconomia?.posicao ===
              1,

            ultimaCompra,

            ultimosMedicamentos:
              nomesRecentes.slice(
                0,
                3
              ),
          };
        }
      );
    }, [
      farmacias,
      medicamentos,
      renovacoes,
      rankingMap,
    ]);

  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredFarmacias =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase(
            "pt-BR"
          );

      let result =
        farmaciasComAnalise;

      if (
        normalizedSearch
      ) {
        result =
          result.filter(
            (
              farmacia
            ) => {
              const nome =
                farmacia.nome
                  .toLocaleLowerCase(
                    "pt-BR"
                  );

              const endereco =
                farmacia.endereco
                  ?.toLocaleLowerCase(
                    "pt-BR"
                  ) ||
                "";

              return (
                nome.includes(
                  normalizedSearch
                ) ||
                endereco.includes(
                  normalizedSearch
                )
              );
            }
          );
      }

      if (
        filtroStatus ===
        "com_medicamentos"
      ) {
        result =
          result.filter(
            (
              farmacia
            ) =>
              farmacia.medicamentosCount >
              0
          );
      }

      if (
        filtroStatus ===
        "mais_economica"
      ) {
        result =
          result.filter(
            (
              farmacia
            ) =>
              farmacia.isMaisEconomica
          );
      }

      return [
        ...result,
      ].sort(
        (
          first,
          second
        ) =>
          first.nome.localeCompare(
            second.nome,
            "pt-BR"
          )
      );
    }, [
      farmaciasComAnalise,
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

  // ==========================================================
  // UI
  // ==========================================================

  const corBase =
    "#F59E0B";

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Farmácias"
          badgeLabel="Farmácias"
          badgeColor="text-amber-400"
          icon={
            <Store
              size={14}
            />
          }
          iconColor="text-amber-400"
        >
          <ListSearch
            value={search}
            onChange={
              setSearch
            }
            placeholder="Buscar por nome ou endereço..."
          />

          <ListFilters
            onClear={
              handleClearFilters
            }
          >
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setFiltroStatus(
                  filtroStatus ===
                    "com_medicamentos"
                    ? "todos"
                    : "com_medicamentos"
                );
              }}
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "com_medicamentos"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Com medicamentos
            </button>

            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setFiltroStatus(
                  filtroStatus ===
                    "mais_economica"
                    ? "todos"
                    : "mais_economica"
                );
              }}
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "mais_economica"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Mais econômica
            </button>
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {filteredFarmacias.length ===
          0 ? (
            <EmptyState
              icon={Store}
              title="Nenhuma farmácia encontrada"
              description={
                search ||
                filtroStatus !==
                  "todos"
                  ? "Tente ajustar a busca ou os filtros aplicados."
                  : "Cadastre farmácias para organizar locais de compra e acompanhar o histórico de medicamentos."
              }
            />
          ) : (
            filteredFarmacias.map(
              (
                farmacia,
                index
              ) => {
                if (
                  !farmacia.id
                ) {
                  return null;
                }

                const cor =
                  farmacia.isMaisEconomica
                    ? "#34D399"
                    : corBase;

                return (
                  <ListCard
                    key={
                      farmacia.id
                    }
                    id={
                      farmacia.id
                    }
                    color={
                      cor
                    }
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      router.push(
                        `/saude/farmacias/detalhes?id=${farmacia.id}`
                      );
                    }}
                    delay={
                      index *
                      0.025
                    }
                    icon={
                      <Store
                        size={22}
                      />
                    }
                    actions={
                      <button
                        type="button"
                        onClick={(
                          event
                        ) => {
                          event.stopPropagation();

                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/farmacias/editar?id=${farmacia.id}`
                          );
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-colors hover:text-amber-400 active:scale-95"
                        aria-label={`Editar ${farmacia.nome}`}
                      >
                        <Edit3
                          size={14}
                        />
                      </button>
                    }
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold uppercase text-ink-primary">
                        {
                          farmacia.nome
                        }
                      </h3>

                      {farmacia.isMaisEconomica && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-bold uppercase text-void">
                          <Award
                            size={10}
                          />

                          Melhor preço
                        </span>
                      )}
                    </div>

                    <div className="mt-1 space-y-0.5 text-xs text-ink-muted">
                      {farmacia.endereco && (
                        <p className="flex items-center gap-1 truncate">
                          <MapPin
                            size={11}
                            className="shrink-0 text-ink-faint"
                          />

                          {
                            farmacia.endereco
                          }
                        </p>
                      )}

                      {farmacia.telefone && (
                        <p className="flex items-center gap-1">
                          <Phone
                            size={11}
                            className="shrink-0 text-ink-faint"
                          />

                          {
                            farmacia.telefone
                          }
                        </p>
                      )}
                    </div>

                    {farmacia
                      .ultimosMedicamentos
                      .length >
                      0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                          Histórico recente:
                        </span>

                        {farmacia.ultimosMedicamentos.map(
                          (
                            nome
                          ) => (
                            <span
                              key={
                                nome
                              }
                              className="max-w-[120px] truncate rounded-full border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[9px] font-bold uppercase text-ink-muted"
                            >
                              {
                                nome
                              }
                            </span>
                          )
                        )}
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-surface-border/40 pt-2">
                      <div className="rounded-xl bg-surface-raised/60 p-2.5">
                        <p className="flex items-center gap-1 font-mono text-[10px] uppercase text-ink-muted">
                          <Pill
                            size={11}
                            className="text-ice"
                          />

                          Medicamentos
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                          {
                            farmacia.medicamentosCount
                          }{" "}
                          vinculado
                          {farmacia.medicamentosCount !==
                          1
                            ? "s"
                            : ""}
                        </p>
                      </div>

                      <div className="rounded-xl bg-surface-raised/60 p-2.5">
                        <p className="flex items-center gap-1 font-mono text-[10px] uppercase text-ink-muted">
                          <DollarSign
                            size={11}
                            className="text-emerald-400"
                          />

                          Total gasto
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                          {formatCurrency(
                            farmacia.totalGasto
                          )}
                        </p>
                      </div>
                    </div>

                    {farmacia.ultimaCompra && (
                      <div className="flex items-center gap-1.5 border-t border-surface-border/30 pt-1 text-[10px] text-ink-muted">
                        <Clock
                          size={12}
                          className="text-ink-faint"
                        />

                        Última compra:{" "}
                        {formatDateDisplay(
                          farmacia
                            .ultimaCompra
                            .data
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