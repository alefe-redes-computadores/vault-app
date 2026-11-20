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
  ChartNoAxesCombined,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FlaskConical,
  Plus,
  ChevronRight,
  ChevronDown,
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
import { ClinicalListSummary } from "@/components/saude/ClinicalListSummary";
import { useReturnContext } from "@/hooks/useReturnContext";
import { useCareFlowM2 } from "@/hooks/useCareFlowM2";
import { projectExamOrdersM2 } from "@/lib/careflow-m2/domain";
import { buildUnifiedExamWorkspaceR6 } from "@/lib/clinical-unified-r6";

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
  const { backTarget, preserveReturn } = useReturnContext("/saude/rede");

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

  const {events:careflowEvents=[],userId:careflowUserId,activePersonId:careflowPersonId}=useCareFlowM2();
  const careflowOrders=useMemo(()=>projectExamOrdersM2(careflowEvents,careflowUserId||'',careflowPersonId||''),[careflowEvents,careflowUserId,careflowPersonId]);
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
      return exames.filter(exame => Boolean(activePersonId) && exame.person_id === activePersonId).map(
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
      activePersonId,
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

  // R6: a LISTA principal é uma projeção única de exames existentes e pedidos agrupados.
  // Não há migração/duplicação: cada linha mantém origem e ID próprios.
  const unifiedRows = useMemo(() => buildUnifiedExamWorkspaceR6(
    filteredExames, careflowOrders, search, filtroStatus === "todos"
  ), [filteredExames, careflowOrders, search, filtroStatus]);
  const exameStats = useMemo(() => {
    let upcoming = 0, expired = 0;
    for (const exame of examesComStatus) {
      if (exame.vencido) expired += 1;
      else if (exame.proximo) upcoming += 1;
    }
    return { upcoming, expired };
  }, [examesComStatus]);

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
      <main className="relative min-h-screen bg-void pb-28 vault-adaptive-tail">
        <ListPageHeader
          title="Exames e Laudos"
          backUrl={backTarget}
          subtitle={
            activePersonId
              ? `${exames.length} exames · ${careflowOrders.length} pedidos`
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
            activeCount={filtroStatus !== "todos" ? 1 : 0}
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
        <section className="mx-5 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-300/20 bg-surface px-4 py-3" aria-label="Criar pedidos de exames">
          <div className="min-w-0"><h2 className="text-xs font-bold text-ink-primary">Pedidos de exames ({careflowOrders.length})</h2><p className="mt-1 text-[11px] text-ink-muted">Pedidos e exames aparecem juntos na lista abaixo. São registros de naturezas diferentes.</p></div>
          <button type="button" onClick={()=>router.push(preserveReturn('/saude/careflow/exames?novo=1'))} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-300 px-3 text-xs font-bold text-void"><Plus size={16}/>Novo pedido</button>
        </section>
                <section className="space-y-3.5 px-5 pt-4">
          {activePersonId && (
            <ClinicalListSummary
              icon={ChartNoAxesCombined}
              eyebrow="Acompanhamento"
              title={unifiedRows.length ? "Exames e pedidos organizados" : "Nenhum exame ou pedido cadastrado"}
              detail="Situação calculada somente pelas datas registradas"
              metrics={[{label:"Registros",value:examesComStatus.length},{label:"Próximos",value:exameStats.upcoming,tone:"attention"},{label:"Vencidos",value:exameStats.expired,tone:exameStats.expired?"critical":"neutral"}]}
            />
          )}
          {!activePersonId ? (
            <EmptyState
              icon={
                FlaskConical
              }
              title="Nenhuma pessoa ativa"
              description="Selecione uma pessoa no Vault para visualizar seus exames."
            />
          ) : unifiedRows.length ===
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
            unifiedRows.map(
              (
                entry,
                index
              ) => {
                if (entry.kind === 'order') {
                  const {order,items} = entry;
                  const received=items.filter(x=>x.state==='result_received').length;
                  const collected=items.filter(x=>x.state==='collected').length;
                  const pending=items.filter(x=>x.state==='pending').length;
                  const cancelled=items.filter(x=>x.state==='cancelled').length;
                  const statusLabel={pending:'Pendente',collected:'Coletado',result_received:'Resultado recebido',cancelled:'Cancelado'} as const;
                  return (
                    <details key={entry.key} id={`careflow-pedido-${order.id}`}
                      className="group overflow-hidden rounded-[22px] border border-sky-300/25 bg-surface shadow-[0_8px_28px_rgba(0,0,0,0.12)] transition-colors open:border-sky-300/40">
                      <summary className="flex min-h-[98px] cursor-pointer list-none items-start gap-3 px-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 [&::-webkit-details-marker]:hidden">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-sky-300/20 bg-sky-300/[.08] text-sky-300"><FlaskConical size={21}/></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5"><span className="text-[10px] font-bold uppercase tracking-[.08em] text-sky-200">Pedido de exames</span><span className="rounded-full bg-sky-300/[.09] px-2 py-0.5 text-[10px] font-bold tabular-nums text-sky-200">{items.length} {items.length===1?'exame':'exames'}</span></span>
                          <strong className="mt-1.5 block break-words text-sm font-bold text-ink-primary">{String(order.payload.title||'Pedido registrado')}</strong>
                          <span className="mt-1 block text-[11px] text-ink-muted">Solicitado em {String(order.payload.date||'').split('-').reverse().join('/')} · a solicitação não comprova realização</span>
                          <span className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold tabular-nums">
                            {received>0&&<span className="rounded-md bg-emerald-300/[.08] px-2 py-1 text-emerald-300">{received} com situação de resultado recebido</span>}
                            {collected>0&&<span className="rounded-md bg-cyan-300/[.08] px-2 py-1 text-cyan-200">{collected} coletados</span>}
                            {pending>0&&<span className="rounded-md bg-amber-300/[.07] px-2 py-1 text-amber-200">{pending} pendentes</span>}
                            {cancelled>0&&<span className="rounded-md bg-rose-300/[.06] px-2 py-1 text-rose-200">{cancelled} cancelados</span>}
                          </span>
                        </span>
                        <ChevronDown size={18} className="mt-1 shrink-0 text-sky-300 transition-transform group-open:rotate-180" aria-hidden="true"/>
                      </summary>
                      <div className="space-y-3 border-t border-surface-border/50 px-4 pb-4 pt-3">
                        <p className="text-xs text-ink-muted">Itens deste pedido · os estados e os resultados são individuais. Nenhum exame foi cadastrado novamente.</p>
                        <ul className="divide-y divide-surface-border/40 rounded-xl border border-surface-border/50 bg-void/20">
                          {items.map(({item,state})=><li key={item.id}>
                            <button type="button" onClick={()=>router.push(preserveReturn(`/saude/careflow/exames#careflow-exame-${encodeURIComponent(item.id)}`))}
                              className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
                              <span className="min-w-0 flex-1 break-words font-medium text-ink-primary">{String(item.payload.name||'Exame sem nome')}</span>
                              <span className="shrink-0 text-[10px] text-ink-muted">{statusLabel[state]}</span>
                              <ChevronRight size={14} className="shrink-0 text-sky-300" aria-hidden="true"/>
                            </button>
                          </li>)}
                        </ul>
                        <button type="button" onClick={()=>router.push(preserveReturn(`/saude/careflow/exames#careflow-pedido-${encodeURIComponent(order.id)}`))}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-300/30 bg-sky-300/[.06] px-3 text-xs font-bold text-sky-200">Abrir pedido e gerenciar resultados <ChevronRight size={15}/></button>
                      </div>
                    </details>
                  );
                }
                const exame=entry.exame;
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
                        preserveReturn(`/saude/exames/detalhes?id=${exame.id}`)
                      );
                    }}
                    delay={
                      index *
                      0.025
                    }
                    density="compact"
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
