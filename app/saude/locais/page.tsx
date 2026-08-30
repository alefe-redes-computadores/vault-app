// app/saude/locais/page.tsx
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
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  FlaskConical,
  MapPin,
  Plus,
  PlusCircle,
  Stethoscope,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useLocais,
} from "@/hooks/useLocais";

import {
  useConsultas,
} from "@/hooks/useConsultas";

import {
  useExames,
} from "@/hooks/useExames";

import {
  useCirurgias,
} from "@/hooks/useCirurgias";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  useMedicos,
} from "@/hooks/useMedicos";

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
  Cirurgia,
  Consulta,
  Exame,
  LocalSaude,
  Medico,
  Renovacao,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type FiltroTipo =
  | "todos"
  | "posto_saude"
  | "laboratorio"
  | "clinica"
  | "outro";

type FiltroStatus =
  | "todos"
  | "com_registros"
  | "sem_registros";

interface LocalTypeStyle {
  color: string;
  icon: LucideIcon;
  label: string;
  shortLabel: string;
}

type HistoricoTipo =
  | "consulta"
  | "exame"
  | "cirurgia"
  | "renovacao";

interface UltimaAtividade {
  tipo: HistoricoTipo;
  data: string;
}

type LocalComHistorico =
  LocalSaude & {
    consultasCount: number;
    examesCount: number;
    cirurgiasCount: number;
    renovacoesCount: number;

    historicoCount: number;

    proximasConsultasCount: number;

    medicosCount: number;

    totalGasto: number;

    ultimaAtividade:
      | UltimaAtividade
      | null;
  };

// ============================================================
// LOCAL TYPE CONFIG
// ============================================================

const LOCAL_TYPE_STYLE: Record<
  string,
  LocalTypeStyle
> = {
  posto_saude: {
    color:
      "#34D399",

    icon:
      PlusCircle,

    label:
      "Posto de Saúde / UBS",

    shortLabel:
      "Posto / UBS",
  },

  laboratorio: {
    color:
      "#A78BFA",

    icon:
      FlaskConical,

    label:
      "Laboratório",

    shortLabel:
      "Laboratório",
  },

  clinica: {
    color:
      "#38BDF8",

    icon:
      Building2,

    label:
      "Clínica",

    shortLabel:
      "Clínica",
  },

  outro: {
    color:
      "#F59E0B",

    icon:
      MapPin,

    label:
      "Outro Local de Saúde",

    shortLabel:
      "Outro",
  },
};

// ============================================================
// HELPERS
// ============================================================

function formatDateDisplay(
  isoStr?: string
): string {
  if (
    !isoStr
  ) {
    return "";
  }

  const datePart =
    isoStr.includes(
      "T"
    )
      ? isoStr.split(
          "T"
        )[0]
      : isoStr;

  const parts =
    datePart.split(
      "-"
    );

  if (
    parts.length !==
    3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(
  value: number
): string {
  return `R$ ${value
    .toFixed(
      2
    )
    .replace(
      ".",
      ","
    )}`;
}

function getTodayIso(): string {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
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
    .toLocaleLowerCase(
      "pt-BR"
    )
    .trim();
}

// ============================================================
// PAGE
// ============================================================

export default function LocaisPage() {
  const {
    trigger,
  } =
    useHapticFeedback();

  const router =
    useRouter();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

  const [
    filtroTipo,
    setFiltroTipo,
  ] =
    useState<FiltroTipo>(
      "todos"
    );

  const [
    filtroStatus,
    setFiltroStatus,
  ] =
    useState<FiltroStatus>(
      "todos"
    );

  // ==========================================================
  // GLOBAL ENTITIES
  // ==========================================================

  const {
    locais = [],
  } =
    useLocais();

  const {
    medicos = [],
  } =
    useMedicos();

  // ==========================================================
  // PERSON-OWNED CLINICAL ENTITIES
  // ==========================================================

  const {
    consultas = [],
  } =
    useConsultas();

  const {
    exames = [],
  } =
    useExames();

  const {
    cirurgias = [],
  } =
    useCirurgias();

  const {
    renovacoes = [],
  } =
    useRenovacoes();

  const hoje =
    useMemo(
      () =>
        getTodayIso(),
      []
    );

  // ==========================================================
  // PERSON SCOPE
  //
  // Local é global.
  //
  // Porém todo histórico exibido dentro dele é clínico e deve
  // pertencer exatamente à pessoa ativa.
  //
  // Mesmo que os hooks já façam esse filtro, esta tela é
  // agregadora e mantém uma segunda barreira explícita.
  // ==========================================================

  const scopedConsultas =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return consultas.filter(
          (
            consulta:
              Consulta
          ) =>
            consulta.person_id ===
            activePersonId
        );
      },
      [
        consultas,
        activePersonId,
      ]
    );

  const scopedExames =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return exames.filter(
          (
            exame:
              Exame
          ) =>
            exame.person_id ===
            activePersonId
        );
      },
      [
        exames,
        activePersonId,
      ]
    );

  const scopedCirurgias =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return cirurgias.filter(
          (
            cirurgia:
              Cirurgia
          ) =>
            cirurgia.person_id ===
            activePersonId
        );
      },
      [
        cirurgias,
        activePersonId,
      ]
    );

  const scopedRenovacoes =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return renovacoes.filter(
          (
            renovacao:
              Renovacao
          ) =>
            renovacao.person_id ===
            activePersonId
        );
      },
      [
        renovacoes,
        activePersonId,
      ]
    );

  // ==========================================================
  // INDEXES
  // ==========================================================

  const consultasPorLocal =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            Consulta[]
          >();

        scopedConsultas.forEach(
          (
            consulta
          ) => {
            if (
              !consulta.local_id
            ) {
              return;
            }

            const current =
              map.get(
                consulta.local_id
              ) ||
              [];

            current.push(
              consulta
            );

            map.set(
              consulta.local_id,
              current
            );
          }
        );

        return map;
      },
      [
        scopedConsultas,
      ]
    );

  const examesPorLocal =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            Exame[]
          >();

        scopedExames.forEach(
          (
            exame
          ) => {
            if (
              !exame.local_id
            ) {
              return;
            }

            const current =
              map.get(
                exame.local_id
              ) ||
              [];

            current.push(
              exame
            );

            map.set(
              exame.local_id,
              current
            );
          }
        );

        return map;
      },
      [
        scopedExames,
      ]
    );

  const cirurgiasPorLocal =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            Cirurgia[]
          >();

        scopedCirurgias.forEach(
          (
            cirurgia
          ) => {
            if (
              !cirurgia.local_id
            ) {
              return;
            }

            const current =
              map.get(
                cirurgia.local_id
              ) ||
              [];

            current.push(
              cirurgia
            );

            map.set(
              cirurgia.local_id,
              current
            );
          }
        );

        return map;
      },
      [
        scopedCirurgias,
      ]
    );

  const renovacoesPorLocal =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            Renovacao[]
          >();

        scopedRenovacoes.forEach(
          (
            renovacao
          ) => {
            if (
              !renovacao.local_id
            ) {
              return;
            }

            const current =
              map.get(
                renovacao.local_id
              ) ||
              [];

            current.push(
              renovacao
            );

            map.set(
              renovacao.local_id,
              current
            );
          }
        );

        return map;
      },
      [
        scopedRenovacoes,
      ]
    );

  const medicosById =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            Medico
          >();

        medicos.forEach(
          (
            medico
          ) => {
            if (
              medico.id
            ) {
              map.set(
                medico.id,
                medico
              );
            }
          }
        );

        return map;
      },
      [
        medicos,
      ]
    );

  // ==========================================================
  // CROSS DATA
  // ==========================================================

  const locaisEnriquecidos =
    useMemo<
      LocalComHistorico[]
    >(
      () => {
        return locais.map(
          (
            local
          ) => {
            if (
              !local.id
            ) {
              return {
                ...local,

                consultasCount:
                  0,

                examesCount:
                  0,

                cirurgiasCount:
                  0,

                renovacoesCount:
                  0,

                historicoCount:
                  0,

                proximasConsultasCount:
                  0,

                medicosCount:
                  0,

                totalGasto:
                  0,

                ultimaAtividade:
                  null,
              };
            }

            const consultasLocal =
              consultasPorLocal.get(
                local.id
              ) ||
              [];

            const examesLocal =
              examesPorLocal.get(
                local.id
              ) ||
              [];

            const cirurgiasLocal =
              cirurgiasPorLocal.get(
                local.id
              ) ||
              [];

            const renovacoesLocal =
              renovacoesPorLocal.get(
                local.id
              ) ||
              [];

            const proximasConsultasCount =
              consultasLocal.filter(
                (
                  consulta
                ) =>
                  consulta.status ===
                    "agendada" &&
                  Boolean(
                    consulta.data &&
                      consulta.data >=
                        hoje
                  )
              ).length;

            const medicoIds =
              new Set(
                (
                  local.medico_ids ||
                  []
                ).filter(
                  (
                    medicoId
                  ) =>
                    medicosById.has(
                      medicoId
                    )
                )
              );

            const totalGasto =
              renovacoesLocal.reduce(
                (
                  total,
                  renovacao
                ) => {
                  if (
                    typeof renovacao.preco !==
                      "number" ||
                    renovacao.preco <=
                      0
                  ) {
                    return total;
                  }

                  return (
                    total +
                    renovacao.preco
                  );
                },
                0
              );

            const atividades:
              UltimaAtividade[] =
              [];

            consultasLocal.forEach(
              (
                consulta
              ) => {
                if (
                  consulta.data
                ) {
                  atividades.push({
                    tipo:
                      "consulta",

                    data:
                      consulta.data,
                  });
                }
              }
            );

            examesLocal.forEach(
              (
                exame
              ) => {
                if (
                  exame.data
                ) {
                  atividades.push({
                    tipo:
                      "exame",

                    data:
                      exame.data,
                  });
                }
              }
            );

            cirurgiasLocal.forEach(
              (
                cirurgia
              ) => {
                if (
                  cirurgia.data
                ) {
                  atividades.push({
                    tipo:
                      "cirurgia",

                    data:
                      cirurgia.data,
                  });
                }
              }
            );

            renovacoesLocal.forEach(
              (
                renovacao
              ) => {
                if (
                  renovacao.data
                ) {
                  atividades.push({
                    tipo:
                      "renovacao",

                    data:
                      renovacao.data,
                  });
                }
              }
            );

            atividades.sort(
              (
                first,
                second
              ) =>
                second.data.localeCompare(
                  first.data
                )
            );

            const historicoCount =
              consultasLocal.length +
              examesLocal.length +
              cirurgiasLocal.length +
              renovacoesLocal.length;

            return {
              ...local,

              consultasCount:
                consultasLocal.length,

              examesCount:
                examesLocal.length,

              cirurgiasCount:
                cirurgiasLocal.length,

              renovacoesCount:
                renovacoesLocal.length,

              historicoCount,

              proximasConsultasCount,

              medicosCount:
                medicoIds.size,

              totalGasto,

              ultimaAtividade:
                atividades[0] ||
                null,
            };
          }
        );
      },
      [
        locais,
        consultasPorLocal,
        examesPorLocal,
        cirurgiasPorLocal,
        renovacoesPorLocal,
        medicosById,
        hoje,
      ]
    );

  // ==========================================================
  // FILTERING
  // ==========================================================

  const normalizedSearch =
    useMemo(
      () =>
        normalizeSearch(
          search
        ),
      [
        search,
      ]
    );

  const filteredLocais =
    useMemo(
      () => {
        let result =
          locaisEnriquecidos;

        if (
          normalizedSearch
        ) {
          result =
            result.filter(
              (
                local
              ) => {
                const nome =
                  normalizeSearch(
                    local.nome ||
                      ""
                  );

                const endereco =
                  normalizeSearch(
                    local.endereco ||
                      ""
                  );

                const tipo =
                  LOCAL_TYPE_STYLE[
                    local.tipo ||
                      "outro"
                  ] ||
                  LOCAL_TYPE_STYLE.outro;

                return (
                  nome.includes(
                    normalizedSearch
                  ) ||
                  endereco.includes(
                    normalizedSearch
                  ) ||
                  normalizeSearch(
                    tipo.label
                  ).includes(
                    normalizedSearch
                  ) ||
                  normalizeSearch(
                    tipo.shortLabel
                  ).includes(
                    normalizedSearch
                  )
                );
              }
            );
        }

        if (
          filtroTipo !==
          "todos"
        ) {
          result =
            result.filter(
              (
                local
              ) =>
                local.tipo ===
                filtroTipo
            );
        }

        if (
          filtroStatus ===
          "com_registros"
        ) {
          result =
            result.filter(
              (
                local
              ) =>
                local.historicoCount >
                0
            );
        }

        if (
          filtroStatus ===
          "sem_registros"
        ) {
          result =
            result.filter(
              (
                local
              ) =>
                local.historicoCount ===
                0
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
      },
      [
        locaisEnriquecidos,
        normalizedSearch,
        filtroTipo,
        filtroStatus,
      ]
    );

  // ==========================================================
  // ACTIONS
  // ==========================================================

  const handleClearFilters =
    () => {
      trigger(
        "vibrate"
      );

      setFiltroTipo(
        "todos"
      );

      setFiltroStatus(
        "todos"
      );
    };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Locais de Saúde"
          badgeLabel="Rede de Atendimento"
          badgeColor="text-ice"
          icon={
            <MapPin
              size={
                14
              }
            />
          }
          iconColor="text-ice"
        >
          <ListSearch
            value={
              search
            }
            onChange={
              setSearch
            }
            placeholder="Buscar local por nome, endereço ou tipo..."
          />

          <ListFilters
            onClear={
              handleClearFilters
            }
          >
            {(
              [
                [
                  "posto_saude",
                  "Postos / UBS",
                ],
                [
                  "laboratorio",
                  "Laboratórios",
                ],
                [
                  "clinica",
                  "Clínicas",
                ],
                [
                  "outro",
                  "Outros",
                ],
              ] as const
            ).map(
              ([
                type,
                label,
              ]) => (
                <button
                  key={
                    type
                  }
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setFiltroTipo(
                        filtroTipo ===
                          type
                          ? "todos"
                          : type
                      );
                    }
                  }
                  className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                    filtroTipo ===
                    type
                      ? "border-ice bg-ice/15 text-ice"
                      : "border-surface-border/40 bg-surface-raised text-ink-muted"
                  }`}
                >
                  {
                    label
                  }
                </button>
              )
            )}

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setFiltroStatus(
                    filtroStatus ===
                      "com_registros"
                      ? "todos"
                      : "com_registros"
                  );
                }
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "com_registros"
                  ? "border-ice bg-ice/15 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted"
              }`}
            >
              Com histórico
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
                      "sem_registros"
                      ? "todos"
                      : "sem_registros"
                  );
                }
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroStatus ===
                "sem_registros"
                  ? "border-coral bg-coral/15 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted"
              }`}
            >
              Sem histórico
            </button>
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {!activePersonId &&
            locais.length >
              0 && (
              <div className="rounded-2xl border border-ice/15 bg-ice/5 px-3.5 py-3">
                <p className="text-[11px] leading-5 text-ink-muted">
                  Os locais continuam disponíveis porque são globais. Selecione uma pessoa para visualizar consultas, exames, cirurgias e retiradas relacionados.
                </p>
              </div>
            )}

          <button
            type="button"
            onClick={
              () => {
                trigger(
                  "vibrate"
                );

                router.push(
                  "/saude/locais/novo"
                );
              }
            }
            className="group relative w-full overflow-hidden rounded-[24px] border border-ice/25 bg-surface p-4 text-left shadow-sm transition-all hover:border-ice/40 active:scale-[0.985]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                <Plus
                  size={
                    22
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-primary">
                  Cadastrar local de saúde
                </p>

                <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                  Posto/UBS, laboratório, clínica ou outro estabelecimento.
                </p>
              </div>

              <ChevronRight
                size={
                  18
                }
                className="shrink-0 text-ice transition-transform group-hover:translate-x-1"
              />
            </div>
          </button>

          {filteredLocais.length ===
          0 ? (
            <EmptyState
              icon={
                MapPin
              }
              title="Nenhum local encontrado"
              description={
                search ||
                filtroTipo !==
                  "todos" ||
                filtroStatus !==
                  "todos"
                  ? "Nenhum local corresponde aos filtros aplicados."
                  : "Cadastre os locais de saúde usados pelo Vault."
              }
            />
          ) : (
            filteredLocais.map(
              (
                local,
                index
              ) => {
                if (
                  !local.id
                ) {
                  return null;
                }

                const style =
                  LOCAL_TYPE_STYLE[
                    local.tipo ||
                      "outro"
                  ] ||
                  LOCAL_TYPE_STYLE.outro;

                const Icon =
                  style.icon;

                return (
                  <ListCard
                    key={
                      local.id
                    }
                    id={
                      local.id
                    }
                    color={
                      style.color
                    }
                    onClick={
                      () => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/locais/detalhes?id=${local.id}`
                        );
                      }
                    }
                    delay={
                      index *
                      0.025
                    }
                    icon={
                      <Icon
                        size={
                          22
                        }
                      />
                    }
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold uppercase text-ink-primary">
                        {
                          local.nome
                        }
                      </h3>

                      <span className="shrink-0 rounded-full border border-surface-border/50 bg-surface-raised px-2 py-0.5 text-[9px] font-bold uppercase text-ink-muted">
                        {
                          style.shortLabel
                        }
                      </span>
                    </div>

                    {local.endereco && (
                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-muted">
                        <MapPin
                          size={
                            11
                          }
                          className="shrink-0 text-ink-faint"
                        />

                        {
                          local.endereco
                        }
                      </p>
                    )}

                    {local.ultimaAtividade && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-ink-muted">
                        <Clock
                          size={
                            12
                          }
                          className="text-ice"
                        />

                        Última atividade:{" "}
                        {formatDateDisplay(
                          local
                            .ultimaAtividade
                            .data
                        )}
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-surface-border/40 pt-2 sm:grid-cols-4">
                      <div className="rounded-xl bg-surface-raised/60 p-2 text-center">
                        <p className="flex items-center justify-center gap-1 font-mono text-[9px] uppercase text-ink-muted">
                          <Calendar
                            size={
                              10
                            }
                            className="text-ice"
                          />

                          Consultas
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                          {
                            local.consultasCount
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-surface-raised/60 p-2 text-center">
                        <p className="flex items-center justify-center gap-1 font-mono text-[9px] uppercase text-ink-muted">
                          <FlaskConical
                            size={
                              10
                            }
                            className="text-violet-400"
                          />

                          Exames
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                          {
                            local.examesCount
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-surface-raised/60 p-2 text-center">
                        <p className="flex items-center justify-center gap-1 font-mono text-[9px] uppercase text-ink-muted">
                          <Activity
                            size={
                              10
                            }
                            className="text-coral"
                          />

                          Cirurgias
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                          {
                            local.cirurgiasCount
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-surface-raised/60 p-2 text-center">
                        <p className="flex items-center justify-center gap-1 font-mono text-[9px] uppercase text-ink-muted">
                          <FileText
                            size={
                              10
                            }
                            className="text-ink-muted"
                          />

                          Retiradas
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                          {
                            local.renovacoesCount
                          }
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {local.medicosCount >
                        0 && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                          <Stethoscope
                            size={
                              11
                            }
                            className="text-ice"
                          />

                          {
                            local.medicosCount
                          }{" "}
                          médico(s)
                        </span>
                      )}

                      {local.proximasConsultasCount >
                        0 && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-ice/20 bg-ice/5 px-2 py-0.5 text-[10px] text-ice">
                          <Calendar
                            size={
                              11
                            }
                          />

                          {
                            local.proximasConsultasCount
                          }{" "}
                          próxima(s)
                        </span>
                      )}

                      {local.totalGasto >
                        0 && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                          <DollarSign
                            size={
                              11
                            }
                            className="text-ink-faint"
                          />

                          {formatCurrency(
                            local.totalGasto
                          )}
                        </span>
                      )}

                      {local.historicoCount ===
                        0 && (
                        <span className="text-[10px] text-ink-faint">
                          Sem histórico para a pessoa ativa
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