// app/saude/tratamentos/page.tsx
"use client";
// VAULT_TREATMENT_DENSITY_V70

import {createLocalSearchIndex,filterLocalSearchIndex} from "@/lib/local-search";
import {
  useDeferredValue,
  Suspense,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  usePathname,
  useSearchParams,
} from "next/navigation";

import {
  Activity,
  AlertTriangle,
  History,
  Pill,
  Plus,
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
  ListSearch,
} from "@/components/list";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";
import { ClinicalListSummary } from "@/components/saude/ClinicalListSummary";
import { getVaultTreatmentIcon } from "@/lib/health-profile/treatment-icon";
import { withReturnTarget } from "@/lib/navigation/return-context";

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
    medicamentosResumo: Medicamento[];
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

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function getTreatmentColor(treatment: Tratamento, fallback: string): string {
  return HEX_COLOR.test(treatment.cor || "") ? treatment.cor! : fallback;
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentHref = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

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

  const [
    showHistory,
    setShowHistory,
  ] = useState(false);

  const deferredSearch = useDeferredValue(search);

  /*
   * Os hooks já trabalham com a pessoa ativa.
   *
   * A listagem não mantém um segundo estado de person_id.
   */
  const {
    tratamentos = [],
    isLoading: treatmentsLoading,
  } =
    useTratamentos();

  const {
    medicamentosIncluindoDescontinuados: medicamentos = [],
    isLoading: medicationsLoading,
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

  const acquisitionsByMedication=useMemo(()=>{
    const map=new Map<string,typeof renovacoes>();
    for(const row of renovacoes){const list=map.get(row.medicamento_id);if(list)list.push(row);else map.set(row.medicamento_id,[row]);}
    return map;
  },[renovacoes]);

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

                medicamentosResumo:
                  [],

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
                renovacoes:meds.flatMap(m=>acquisitionsByMedication.get(m.id||"")||[]),
              });

            return {
              ...tratamento,

              medicamentosCount:
                meds.length,

              medicamentosAtivosCount,

              medicamentosResumo: meds
                .slice()
                .sort((a,b)=>Number(a.status==='descontinuado')-Number(b.status==='descontinuado')||a.nome.localeCompare(b.nome,'pt-BR'))
                .slice(0,4),

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
        acquisitionsByMedication,
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

  const treatmentSearchIndex=useMemo(()=>createLocalSearchIndex(listaEnriquecida,treatment=>[
    treatment.nome,treatment.condicao,treatment.observacoes,...(medicamentosPorTratamento.get(treatment.id||"")||[]).flatMap(m=>[m.nome,m.dosagem])
  ]),[listaEnriquecida,medicamentosPorTratamento]);

  const matchedList =
    useMemo(
      () => {
        const result=filterLocalSearchIndex(treatmentSearchIndex,deferredSearch).filter(tratamento=>filtroStatus==='todos'||tratamento.status===filtroStatus);

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
        treatmentSearchIndex,
        filtroStatus,
        deferredSearch,
      ]
    );

  const filteredList = useMemo(() => {
    const browsingCurrentCare = filtroStatus === "todos" && !deferredSearch.trim();
    if (!browsingCurrentCare || showHistory) return matchedList;
    return matchedList.filter(tratamento => tratamento.status === "ativo");
  }, [deferredSearch, filtroStatus, matchedList, showHistory]);

  const hiddenHistoryCount = useMemo(
    () => matchedList.filter(tratamento => tratamento.status !== "ativo").length,
    [matchedList]
  );

  const hasFilters =
    filtroStatus !==
      "todos" ||
    search.trim().length >
      0;

  const treatmentCommand = useMemo(() => {
    let linkedMedications = 0;
    let activeMedications = 0;
    let insights = 0;

    // V197: o comando clínico é calculado em uma única passagem.
    for (const item of listaEnriquecida) {
      linkedMedications += item.medicamentosCount;
      if (item.status === "ativo") activeMedications += item.medicamentosAtivosCount;
      if (item.alertaPrincipal) insights += 1;
    }

    return { linkedMedications, activeMedications, insights };
  }, [listaEnriquecida]);

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

      setShowHistory(false);
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

  if (treatmentsLoading || medicationsLoading) {
    return (
      <main className="min-h-[100dvh] bg-void px-5 pb-24 pt-6" aria-busy="true" aria-label="Carregando tratamentos">
        <p role="status" className="sr-only">Carregando tratamentos da pessoa selecionada.</p>
        <CardListSkeleton />
      </main>
    );
  }

  return (
    <PageTransition>
      <main className="relative min-h-[100dvh] bg-void pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER / FILTROS
            ==================================================== */}

        <ListPageHeader
          title="Tratamentos"
          badgeLabel="CUIDADO CONECTADO"
          badgeColor="text-emerald-300"
          rightAction={<button type="button" onClick={handleCreate} className="flex h-11 items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/[.08] px-3 text-[10px] font-bold uppercase tracking-wide text-emerald-300 active:scale-95"><Plus size={15}/>Novo</button>}
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
          {listaEnriquecida.length > 0 && (
            <ListSearch
              value={search}
              onChange={setSearch}
              placeholder="Buscar tratamento..."
            />
          )}

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
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em] transition-all active:scale-95 ${
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
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em] transition-all active:scale-95 ${
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
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em] transition-all active:scale-95 ${
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
            LISTA
            ==================================================== */}

        <section className="mx-auto max-w-3xl space-y-3.5 px-5 pt-4">
          {listaEnriquecida.length > 0 ? (
            <ClinicalListSummary
              icon={Activity}
              eyebrow="Comando do cuidado"
              title={statusCounts.ativos ? `${statusCounts.ativos} tratamento${statusCounts.ativos === 1 ? "" : "s"} em andamento` : "Histórico de tratamentos"}
              detail="Medicamentos e aquisições permanecem vinculados sem perder sua origem."
              metrics={[
                { label: "Em uso", value: treatmentCommand.activeMedications, tone: "positive" },
                { label: "Vínculos", value: treatmentCommand.linkedMedications },
                { label: "Revisar", value: treatmentCommand.insights, tone: treatmentCommand.insights ? "attention" : "neutral" },
              ]}
            />
          ) : null}
          {filtroStatus === "todos" && !search.trim() && hiddenHistoryCount > 0 ? (
            <button
              type="button"
              aria-expanded={showHistory}
              onClick={() => {
                trigger("vibrate");
                setShowHistory(current => !current);
              }}
              className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-surface-border/60 bg-surface px-4 text-left text-xs text-ink-muted active:scale-[.99]"
            >
              <span>
                <strong className="block text-sm text-ink-primary">Histórico de tratamentos</strong>
                Concluídos e suspensos ficam recolhidos para priorizar o cuidado atual.
              </span>
              <span className="ml-3 shrink-0 rounded-full bg-surface-raised px-2.5 py-1 font-mono text-[10px]">
                {showHistory ? "Recolher" : hiddenHistoryCount}
              </span>
            </button>
          ) : null}
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
                const treatmentId = tratamento.id;

                const theme = getClinicalTheme(tratamento.nome);

                const IconComp = getVaultTreatmentIcon(tratamento.nome);
                const treatmentColor = getTreatmentColor(tratamento, theme.hex);

                return (
                  <ListCard
                    key={
                      treatmentId
                    }
                    id={
                      treatmentId
                    }
                    color={
                      treatmentColor
                    }
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      router.push(withReturnTarget(`/saude/tratamentos/detalhes?id=${encodeURIComponent(treatmentId)}`, currentHref));
                    }}
                    delay={
                      Math.min(
                        index,
                        8
                      ) *
                      0.025
                    }
                    density="compact"
                    className="[content-visibility:auto] [contain-intrinsic-size:148px]"
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

                    {tratamento.medicamentosResumo.length>0?<div className="mt-2 flex min-w-0 items-center gap-2" aria-label="Medicamentos vinculados"><div className="flex shrink-0 -space-x-1.5">{tratamento.medicamentosResumo.map((medicamento,medIndex)=><span key={medicamento.id||`${medicamento.nome}-${medIndex}`} className="grid size-7 place-items-center rounded-lg border border-surface-border bg-void shadow-sm" title={`${medicamento.nome} ${medicamento.dosagem||''}`.trim()}><MedicationFormatIcon formato={medicamento.formato} cores={medicamento.cores} size={14}/></span>)}</div><p className="min-w-0 flex-1 truncate text-[11px] text-ink-muted">{tratamento.medicamentosResumo.map(m=>m.nome).join(' · ')}{tratamento.medicamentosCount>tratamento.medicamentosResumo.length?` · +${tratamento.medicamentosCount-tratamento.medicamentosResumo.length}`:''}</p></div>:<p className="mt-2 text-[11px] text-ink-muted">Nenhum medicamento vinculado</p>}

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
                        {tratamento.medicamentosCount === 1 ? "medicamento" : "medicamentos"}
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
        </section>      </main>
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
