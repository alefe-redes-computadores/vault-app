// app/saude/medicamentos/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Droplet,
  Eye,
  EyeOff,
  Info,
  Moon,
  Pill,
  Stethoscope,
  StickyNote,
  Sun,
  Syringe,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  format,
} from "date-fns";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useDoseLogs,
} from "@/hooks/useDoseLogs";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useToast,
} from "@/components/ToastProvider";

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
  QuickDoseModal,
} from "@/components/saude/QuickDoseModal";

import {
  DailyProgress,
} from "@/components/saude/DailyProgress";

import {
  processarListaMedicamentos,
} from "@/lib/health-insights";

import type {
  ProcessedMed,
} from "@/lib/health-insights";

import {
  ListCard,
  ListFilters,
  ListPageHeader,
  ListSearch,
} from "@/components/list";

// ============================================================
// HELPERS
// ============================================================

function getMedicamentoIconComponent(
  formato?: string
) {
  const normalized =
    (
      formato ||
      ""
    )
      .toLowerCase()
      .trim();

  if (
    normalized.includes(
      "gota"
    )
  ) {
    return Droplet;
  }

  if (
    normalized.includes(
      "injecao"
    ) ||
    normalized.includes(
      "injeção"
    )
  ) {
    return Syringe;
  }

  if (
    normalized.includes(
      "adesivo"
    )
  ) {
    return StickyNote;
  }

  if (
    normalized.includes(
      "partido"
    ) ||
    normalized.includes(
      "comprimido"
    ) ||
    normalized.includes(
      "inteiro"
    )
  ) {
    return Circle;
  }

  return Pill;
}

function formatQuantidade(
  value: number
): string {
  if (
    Number.isInteger(
      value
    )
  ) {
    return String(
      value
    );
  }

  return value
    .toFixed(
      2
    )
    .replace(
      /\.00$/,
      ""
    )
    .replace(
      /(\.\d)0$/,
      "$1"
    )
    .replace(
      ".",
      ","
    );
}

// ============================================================
// SECTION TITLE
// ============================================================

const SectionTitle = ({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) => (
  <div className="mb-2 mt-6 flex items-center gap-2 pl-2 opacity-80">
    <Icon
      size={16}
      className="text-ink-muted"
    />

    <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
      {title}
    </h2>
  </div>
);

// ============================================================
// PAGE
// ============================================================

export default function MedicamentosListPage() {
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    showToast,
  } =
    useToast();

  const {
    medicamentos:
      medicamentosTodas,
  } =
    useMedicamentos();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const hojeString =
    useMemo(
      () =>
        format(
          new Date(),
          "yyyy-MM-dd"
        ),
      []
    );

  const {
    doseLogs,
  } =
    useDoseLogs(
      hojeString
    );

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState(
      ""
    );

  const [
    showDescontinuados,
    setShowDescontinuados,
  ] =
    useState(
      false
    );

  const [
    quickDoseMedId,
    setQuickDoseMedId,
  ] =
    useState<
      string | null
    >(
      null
    );

  // ==========================================================
  // PREFERÊNCIA DE SUSPENSOS
  // ==========================================================

  useEffect(
    () => {
      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      const savedSuspended =
        localStorage.getItem(
          "@vault:meds_showSuspended"
        );

      if (
        savedSuspended !==
        null
      ) {
        setShowDescontinuados(
          savedSuspended ===
            "true"
        );
      }
    },
    []
  );

  // ==========================================================
  // PERSON SCOPE
  // ==========================================================

  const medicamentosDaPessoa =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return (
          medicamentosTodas ||
          []
        ).filter(
          (
            medicamento
          ) =>
            medicamento.person_id ===
            activePersonId
        );
      },
      [
        medicamentosTodas,
        activePersonId,
      ]
    );

  // ==========================================================
  // PROCESSAMENTO BASE
  //
  // Esta lista não depende de busca ou de "mostrar suspensos".
  // É a fonte correta para progresso e lembrete diário.
  // ==========================================================

  const listaBase =
    useMemo(
      () =>
        processarListaMedicamentos(
          medicamentosDaPessoa,
          doseLogs ||
            []
        ),
      [
        medicamentosDaPessoa,
        doseLogs,
      ]
    );

  // ==========================================================
  // LISTA VISÍVEL
  // ==========================================================

  const listaProcessada =
    useMemo(
      () => {
        let processados =
          [
            ...listaBase,
          ];

        if (
          !showDescontinuados
        ) {
          processados =
            processados.filter(
              (
                item
              ) =>
                !item.isSuspenso
            );
        }

        const query =
          searchQuery
            .toLowerCase()
            .trim();

        if (
          query
        ) {
          processados =
            processados.filter(
              (
                item
              ) =>
                (
                  item.med.nome
                    ?.toLowerCase() ||
                  ""
                ).includes(
                  query
                ) ||
                (
                  item.med.medico
                    ?.toLowerCase() ||
                  ""
                ).includes(
                  query
                )
            );
        }

        return processados;
      },
      [
        listaBase,
        showDescontinuados,
        searchQuery,
      ]
    );

  // ==========================================================
  // PROGRESSO DIÁRIO REAL POR DOSES
  // ==========================================================

  const statsProgresso =
    useMemo(
      () => {
        const continuos =
          listaBase.filter(
            (
              item
            ) =>
              !item.isSOS &&
              !item.isSuspenso
          );

        const total =
          continuos.reduce(
            (
              acc,
              item
            ) =>
              acc +
              item.dosesEsperadasHoje,
            0
          );

        const completados =
          continuos.reduce(
            (
              acc,
              item
            ) =>
              acc +
              Math.min(
                item.dosesTomadasHoje,
                item.dosesEsperadasHoje
              ),
            0
          );

        return {
          total,
          completados,
          pendentes:
            Math.max(
              0,
              total -
                completados
            ),
        };
      },
      [
        listaBase,
      ]
    );

  // ==========================================================
  // TOAST DE DOSES PENDENTES
  //
  // Aparece no máximo UMA vez por dia para cada pessoa.
  //
  // Abrir um medicamento e voltar para a listagem no mesmo
  // dia não gera um novo toast.
  // ==========================================================

  useEffect(
    () => {
      if (
        typeof window ===
          "undefined" ||
        !activePersonId ||
        statsProgresso.pendentes <=
          0
      ) {
        return;
      }

      const storageKey =
        `@vault:meds_pendingToast:${activePersonId}`;

      const ultimaDataExibida =
        localStorage.getItem(
          storageKey
        );

      if (
        ultimaDataExibida ===
        hojeString
      ) {
        return;
      }

      /*
       * Gravamos antes de mostrar.
       *
       * Isso também evita toast duplicado no StrictMode
       * durante desenvolvimento.
       */
      localStorage.setItem(
        storageKey,
        hojeString
      );

      showToast(
        statsProgresso.pendentes ===
          1
          ? "Você tem 1 dose contínua pendente hoje."
          : `Você tem ${statsProgresso.pendentes} doses contínuas pendentes hoje.`,
        "info"
      );
    },
    [
      activePersonId,
      hojeString,
      statsProgresso.pendentes,
      showToast,
    ]
  );

  // ==========================================================
  // AGRUPAMENTO
  // ==========================================================

  const {
    medsManha,
    medsTardeNoite,
    medsSOS,
    medsSuspensos,
  } =
    useMemo(
      () => {
        const manha:
          ProcessedMed[] = [];

        const tardeNoite:
          ProcessedMed[] = [];

        const sos:
          ProcessedMed[] = [];

        const suspensos:
          ProcessedMed[] = [];

        listaProcessada.forEach(
          (
            item
          ) => {
            if (
              item.isSuspenso
            ) {
              suspensos.push(
                item
              );

              return;
            }

            if (
              item.isSOS
            ) {
              sos.push(
                item
              );

              return;
            }

            /*
             * Mantemos o medicamento em uma única seção.
             *
             * Para medicamentos com vários horários, usamos
             * o primeiro horário configurado apenas para
             * decidir em qual grupo visual o card aparece.
             *
             * O progresso do medicamento NÃO depende disso.
             */
            const primeiroHorario =
              item.med
                .estoque_horarios?.[0];

            if (
              !primeiroHorario
            ) {
              manha.push(
                item
              );

              return;
            }

            const hora =
              Number(
                primeiroHorario.split(
                  ":"
                )[0]
              );

            if (
              Number.isFinite(
                hora
              ) &&
              hora >=
                12
            ) {
              tardeNoite.push(
                item
              );
            } else {
              manha.push(
                item
              );
            }
          }
        );

        return {
          medsManha:
            manha,

          medsTardeNoite:
            tardeNoite,

          medsSOS:
            sos,

          medsSuspensos:
            suspensos,
        };
      },
      [
        listaProcessada,
      ]
    );

  // ==========================================================
  // HANDLERS
  // ==========================================================

  const handleToggleSuspensos =
    () => {
      trigger(
        "vibrate"
      );

      setShowDescontinuados(
        (
          previous
        ) => {
          const next =
            !previous;

          if (
            typeof window !==
            "undefined"
          ) {
            localStorage.setItem(
              "@vault:meds_showSuspended",
              String(
                next
              )
            );
          }

          return next;
        }
      );
    };

  // ==========================================================
  // CARD
  // ==========================================================

  const renderCard =
    (
      item:
        ProcessedMed
    ) => {
      const {
        med,
        isSOS,
        isSuspenso,
        horarioTomado,
        dosesEsperadasHoje,
        dosesTomadasHoje,
        dosesPendentesHoje,
        quantidadeTomadaHoje,
        insight,
        receita,
        textoEstoque,
        isEstoqueZerado,
        isEstoqueCritico,
      } =
        item;

      if (
        !med.id
      ) {
        return null;
      }

      const formatoBanco =
        med.formato
          ?.toLowerCase()
          .trim() ||
        "comprimido";

      const SelectedFormatIcon =
        getMedicamentoIconComponent(
          formatoBanco
        );

      const isCustomIcon =
        [
          "comprimido",
          "partido",
          "capsula",
          "cápsula",
          "inteiro",
        ].some(
          (
            value
          ) =>
            formatoBanco.includes(
              value
            )
        );

      const cor1 =
        med.cores &&
        med.cores.length >
          0
          ? med.cores[
              0
            ]
          : "#60A5FA";

      const hasTwoColors =
        Boolean(
          med.cores &&
          med.cores.length >
            1 &&
          isCustomIcon
        );

      const fillValue =
        hasTwoColors
          ? `url(#grad-${med.id})`
          : isCustomIcon
            ? cor1
            : "none";

      const strokeValue =
        isCustomIcon
          ? "none"
          : cor1;

      const cardColor =
        isSuspenso
          ? "#fb7185"
          : receita
              ?.corBorda ||
            cor1;

      const rotinaParcial =
        !isSOS &&
        !isSuspenso &&
        dosesEsperadasHoje >
          0 &&
        dosesTomadasHoje >
          0 &&
        dosesPendentesHoje >
          0;

      const rotinaConcluida =
        !isSOS &&
        !isSuspenso &&
        dosesEsperadasHoje >
          0 &&
        dosesPendentesHoje ===
          0;

      const sosTomadoHoje =
        isSOS &&
        dosesTomadasHoje >
          0;

      return (
        <ListCard
          key={
            med.id
          }
          id={
            med.id
          }
          color={
            cardColor
          }
          onClick={
            () => {
              trigger(
                "vibrate"
              );

              router.push(
                `/saude/medicamentos/detalhes?id=${med.id}`
              );
            }
          }
          isDisabled={
            isSuspenso
          }
          icon={
            <SelectedFormatIcon
              size={
                24
              }
              fill={
                fillValue
              }
              stroke={
                strokeValue
              }
            />
          }
        >
          <div className="flex h-full min-h-[96px] flex-col">
            {/* LINHA 1 */}

            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-baseline gap-2">
                <h3 className="truncate font-display text-base font-bold uppercase text-ink-primary">
                  {
                    med.nome
                  }
                </h3>

                {med.dosagem && (
                  <span className="shrink-0 text-xs font-semibold text-ink-muted">
                    {
                      med.dosagem
                    }
                  </span>
                )}
              </div>

              {insight?.deveRenovar && (
                <button
                  type="button"
                  onClick={
                    (
                      event
                    ) => {
                      event.stopPropagation();

                      trigger(
                        "light"
                      );

                      showToast(
                        insight.mensagem,
                        insight.urgencia ===
                          "alta"
                          ? "error"
                          : "info"
                      );
                    }
                  }
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
                    insight.urgencia ===
                    "alta"
                      ? "bg-coral/15 text-coral"
                      : "bg-amber-400/15 text-amber-500"
                  }`}
                  aria-label="Ver alerta de renovação"
                >
                  <AlertTriangle
                    size={
                      14
                    }
                  />
                </button>
              )}
            </div>

            {/* LINHA 2 */}

            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-ink-muted">
              {receita && (
                <button
                  type="button"
                  onClick={
                    (
                      event
                    ) => {
                      event.stopPropagation();

                      trigger(
                        "light"
                      );

                      showToast(
                        receita.tooltip,
                        "info"
                      );
                    }
                  }
                  className={`flex items-center gap-0.5 font-bold uppercase transition-transform active:scale-95 ${receita.textColorClass}`}
                >
                  {
                    receita.sigla
                  }

                  <Info
                    size={
                      10
                    }
                    className="opacity-70"
                  />
                </button>
              )}

              {receita &&
                (
                  med.medico ||
                  med.farmacia
                ) && (
                  <span className="text-surface-border/60">
                    •
                  </span>
                )}

              {med.medico && (
                <span className="flex max-w-[90px] items-center gap-1 truncate">
                  <Stethoscope
                    size={
                      10
                    }
                    className="shrink-0 opacity-50"
                  />

                  <span className="truncate">
                    {
                      med.medico
                    }
                  </span>
                </span>
              )}

              <span className="text-surface-border/60">
                •
              </span>

              <span
                className={`font-bold ${
                  isEstoqueZerado
                    ? "text-coral"
                    : isEstoqueCritico
                      ? "text-amber-400"
                      : "text-emerald-400"
                }`}
              >
                Estoque:{" "}
                {
                  textoEstoque
                }
              </span>
            </div>

            {/* LINHA 3 */}

            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
              <div className="flex min-w-0 items-center gap-2">
                {isSOS && (
                  <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                    <Zap
                      size={
                        8
                      }
                      fill="currentColor"
                    />

                    SOS
                  </span>
                )}

                {!isSuspenso && (
                  <>
                    {rotinaConcluida && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                        <CheckCircle2
                          size={
                            12
                          }
                        />

                        {dosesEsperadasHoje >
                        1
                          ? `${dosesTomadasHoje}/${dosesEsperadasHoje} doses hoje`
                          : horarioTomado
                            ? `Tomado às ${horarioTomado}`
                            : "Dose concluída hoje"}
                      </span>
                    )}

                    {rotinaParcial && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                        <CheckCircle2
                          size={
                            12
                          }
                        />

                        {
                          dosesTomadasHoje
                        }
                        /
                        {
                          dosesEsperadasHoje
                        }{" "}
                        doses hoje

                        {horarioTomado
                          ? ` · última ${horarioTomado}`
                          : ""}
                      </span>
                    )}

                    {sosTomadoHoje && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                        <CheckCircle2
                          size={
                            12
                          }
                        />

                        {
                          dosesTomadasHoje
                        }{" "}
                        tomada
                        {dosesTomadasHoje ===
                        1
                          ? ""
                          : "s"}{" "}
                        hoje

                        {quantidadeTomadaHoje >
                        0
                          ? ` · ${formatQuantidade(
                              quantidadeTomadaHoje
                            )} un.`
                          : ""}
                      </span>
                    )}

                    {!rotinaConcluida &&
                      !rotinaParcial &&
                      !sosTomadoHoje &&
                      !isEstoqueZerado && (
                        <button
                          type="button"
                          onClick={
                            (
                              event
                            ) => {
                              event.stopPropagation();

                              trigger(
                                "vibrate"
                              );

                              setQuickDoseMedId(
                                med.id!
                              );
                            }
                          }
                          className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 transition-transform active:scale-95"
                        >
                          <Zap
                            size={
                              10
                            }
                            fill="currentColor"
                          />

                          Tomar
                        </button>
                      )}

                    {rotinaParcial &&
                      !isEstoqueZerado && (
                        <button
                          type="button"
                          onClick={
                            (
                              event
                            ) => {
                              event.stopPropagation();

                              trigger(
                                "vibrate"
                              );

                              setQuickDoseMedId(
                                med.id!
                              );
                            }
                          }
                          className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 transition-transform active:scale-95"
                        >
                          <Zap
                            size={
                              10
                            }
                            fill="currentColor"
                          />

                          Próxima dose
                        </button>
                      )}

                    {isSOS &&
                      sosTomadoHoje &&
                      !isEstoqueZerado && (
                        <button
                          type="button"
                          onClick={
                            (
                              event
                            ) => {
                              event.stopPropagation();

                              trigger(
                                "vibrate"
                              );

                              setQuickDoseMedId(
                                med.id!
                              );
                            }
                          }
                          className="flex items-center gap-1 rounded-lg bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold text-amber-400 transition-transform active:scale-95"
                        >
                          <Zap
                            size={
                              10
                            }
                            fill="currentColor"
                          />

                          Registrar outra
                        </button>
                      )}
                  </>
                )}
              </div>

              {!isSuspenso &&
                insight.deveRenovar && (
                  <button
                    type="button"
                    onClick={
                      (
                        event
                      ) => {
                        event.stopPropagation();

                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/renovacao/nova?medicamento_id=${med.id}`
                        );
                      }
                    }
                    className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-transform active:scale-95 ${
                      insight.urgencia ===
                      "alta"
                        ? "border-coral/30 bg-coral/10 text-coral"
                        : "border-amber-400/30 bg-amber-400/10 text-amber-500"
                    }`}
                  >
                    <Calendar
                      size={
                        10
                      }
                    />

                    Renovar
                  </button>
                )}
            </div>
          </div>
        </ListCard>
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    medicamentosTodas ===
      undefined ||
    doseLogs ===
      undefined
  ) {
    return (
      <CardListSkeleton />
    );
  }

  const totalAtivos =
    listaBase.filter(
      (
        item
      ) =>
        !item.isSuspenso
    ).length;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        {/* GRADIENTES DOS ÍCONES */}

        <svg
          width="0"
          height="0"
          className="absolute"
          aria-hidden="true"
        >
          <defs>
            {listaProcessada.map(
              ({
                med,
              }) => {
                if (
                  !med.id ||
                  !med.cores ||
                  med.cores.length <=
                    1
                ) {
                  return null;
                }

                return (
                  <linearGradient
                    key={`grad-${med.id}`}
                    id={`grad-${med.id}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="50%"
                      stopColor={
                        med.cores[
                          0
                        ]
                      }
                    />

                    <stop
                      offset="50%"
                      stopColor={
                        med.cores[
                          1
                        ]
                      }
                    />
                  </linearGradient>
                );
              }
            )}
          </defs>
        </svg>

        {/* HEADER */}

        <ListPageHeader
          title="Meus medicamentos"
          subtitle={`${totalAtivos} ${
            totalAtivos ===
            1
              ? "ativo"
              : "ativos"
          }`}
          rightAction={
            <button
              type="button"
              onClick={
                handleToggleSuspensos
              }
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
                showDescontinuados
                  ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                  : "border-surface-border/50 bg-surface-raised text-ink-muted"
              }`}
              aria-label={
                showDescontinuados
                  ? "Ocultar medicamentos suspensos"
                  : "Mostrar medicamentos suspensos"
              }
            >
              {showDescontinuados ? (
                <Eye
                  size={
                    18
                  }
                />
              ) : (
                <EyeOff
                  size={
                    18
                  }
                />
              )}
            </button>
          }
        >
          <div className="flex w-full items-center gap-2">
            <ListSearch
              value={
                searchQuery
              }
              onChange={
                setSearchQuery
              }
              placeholder="Buscar remédio ou médico..."
            />
          </div>

          <ListFilters
            onClear={
              showDescontinuados
                ? () => {
                    setShowDescontinuados(
                      false
                    );

                    if (
                      typeof window !==
                      "undefined"
                    ) {
                      localStorage.setItem(
                        "@vault:meds_showSuspended",
                        "false"
                      );
                    }

                    trigger(
                      "vibrate"
                    );
                  }
                : undefined
            }
            clearLabel="Limpar"
          >
            {null}
          </ListFilters>
        </ListPageHeader>

        {/* CONTEÚDO */}

        <section className="px-5 pt-4">
          <DailyProgress
            total={
              statsProgresso.total
            }
            completed={
              statsProgresso.completados
            }
          />

          {listaProcessada.length ===
          0 ? (
            <EmptyState
              icon={
                Pill
              }
              title="Nenhum medicamento encontrado"
              description={
                searchQuery
                  ? "Nenhum medicamento corresponde à busca."
                  : "Nenhum medicamento cadastrado para esta pessoa."
              }
              actionLabel={
                searchQuery
                  ? "Limpar"
                  : undefined
              }
              onAction={
                searchQuery
                  ? () =>
                      setSearchQuery(
                        ""
                      )
                  : undefined
              }
            />
          ) : (
            <div className="space-y-3.5 pb-8">
              {medsManha.length >
                0 && (
                <>
                  <SectionTitle
                    icon={
                      Sun
                    }
                    title="Manhã"
                  />

                  {medsManha.map(
                    renderCard
                  )}
                </>
              )}

              {medsTardeNoite.length >
                0 && (
                <>
                  <SectionTitle
                    icon={
                      Moon
                    }
                    title="Tarde / Noite"
                  />

                  {medsTardeNoite.map(
                    renderCard
                  )}
                </>
              )}

              {medsSOS.length >
                0 && (
                <>
                  <SectionTitle
                    icon={
                      Zap
                    }
                    title="Uso Esporádico (SOS)"
                  />

                  {medsSOS.map(
                    renderCard
                  )}
                </>
              )}

              {medsSuspensos.length >
                0 && (
                <>
                  <SectionTitle
                    icon={
                      EyeOff
                    }
                    title="Suspensos"
                  />

                  {medsSuspensos.map(
                    renderCard
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* DOSE RÁPIDA */}

        <QuickDoseModal
          isOpen={
            Boolean(
              quickDoseMedId
            )
          }
          onClose={
            () =>
              setQuickDoseMedId(
                null
              )
          }
          preselectedMedicamentoId={
            quickDoseMedId ||
            undefined
          }
          onSuccess={
            () => {
              if (
                typeof window !==
                "undefined"
              ) {
                window.dispatchEvent(
                  new Event(
                    "sync:process"
                  )
                );
              }
            }
          }
        />
      </main>
    </PageTransition>
  );
}