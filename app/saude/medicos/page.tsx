// app/saude/medicos/page.tsx
"use client";

import {
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Activity,
  Building2,
  Calendar,
  ChevronRight,
  Edit3,
  FileText,
  MapPin,
  Phone,
  Pill,
  Stethoscope,
} from "lucide-react";

import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { sugerirRenovacao } from "@/lib/health-insights";

import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";

import {
  ListCard,
  ListFilters,
  ListPageHeader,
  ListSearch,
  ListSort,
} from "@/components/list";

import { useMedicos } from "@/hooks/useMedicos";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useConsultas } from "@/hooks/useConsultas";
import { useCirurgias } from "@/hooks/useCirurgias";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { useActivePersonId } from "@/hooks/useActivePersonId";

import type {
  Consulta,
  Hospital,
  LocalSaude,
  Medico,
  Tratamento,
} from "@/lib/types";

// ============================================================
// HELPERS
// ============================================================

function formatDateDisplay(
  isoStr?: string
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

function normalizeText(
  value?: string | null
): string {
  return (
    value
      ?.trim()
      .toLocaleLowerCase(
        "pt-BR"
      ) ?? ""
  );
}

// ============================================================
// TYPES
// ============================================================

type TratamentoComCor =
  Tratamento & {
    color: string;
  };

type MedicoComMetadados =
  Medico & {
    medicamentosCount: number;
    consultasCount: number;
    cirurgiasCount: number;
    documentosCount: number;

    tratamentos:
      TratamentoComCor[];

    hospitais:
      Hospital[];

    locais:
      LocalSaude[];

    ultimaConsulta:
      Consulta | null;

    ultimoHospital:
      Hospital | null;

    temAlertaUrgente:
      boolean;
  };

// ============================================================
// SORT
// ============================================================

type SortOption =
  | "name"
  | "recent";

const SORT_OPTIONS: {
  value: SortOption;
  label: string;
}[] = [
  {
    value:
      "name",
    label:
      "Nome",
  },
  {
    value:
      "recent",
    label:
      "Última consulta",
  },
];

// ============================================================
// PAGE
// ============================================================

export default function MedicosPage() {
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    activePersonId,
  } =
    useActivePersonId();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    sortBy,
    setSortBy,
  ] =
    useState<SortOption>(
      "name"
    );

  const [
    filtroTratamento,
    setFiltroTratamento,
  ] =
    useState<
      string | null
    >(null);

  const [
    filtroHospital,
    setFiltroHospital,
  ] =
    useState<
      string | null
    >(null);

  const [
    filtroLocal,
    setFiltroLocal,
  ] =
    useState<
      string | null
    >(null);

  // ==========================================================
  // DATA
  //
  // Médico, Hospital e Local são globais.
  //
  // Medicamentos, Tratamentos, Consultas, Cirurgias e
  // Documentos pertencem à pessoa ativa.
  // ==========================================================

  const {
    medicos = [],
  } =
    useMedicos();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    tratamentos = [],
  } =
    useTratamentos();

  const {
    consultas = [],
  } =
    useConsultas();

  const {
    cirurgias = [],
  } =
    useCirurgias();

  const {
    hospitais = [],
  } =
    useHospitais();

  const {
    locais = [],
  } =
    useLocais();

  /*
   * Não usamos useDocuments() aqui porque sua implementação
   * atual retorna todos os documentos quando não há pessoa
   * ativa.
   *
   * Nesta tela clínica isso seria um vazamento entre pessoas.
   */
  const documentos =
    useLiveQuery(
      async () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.documents
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
    );

  // ==========================================================
  // MAPS
  // ==========================================================

  const hospitalMap =
    useMemo(
      () =>
        new Map(
          hospitais.map(
            (
              hospital
            ) => [
              hospital.id,
              hospital,
            ]
          )
        ),
      [
        hospitais,
      ]
    );

  // ==========================================================
  // ENRIQUECIMENTO
  // ==========================================================

  const medicosComMetadados =
    useMemo<
      MedicoComMetadados[]
    >(
      () => {
        return medicos.map(
          (
            medico
          ) => {
            const medicoNome =
              normalizeText(
                medico.nome
              );

            /*
             * medico_id é a relação canônica.
             *
             * O nome é usado apenas como fallback para dados
             * legados que ainda não possuem medico_id.
             */
            const medsDoMedico =
              medicamentos.filter(
                (
                  medicamento
                ) => {
                  if (
                    medicamento.medico_id
                  ) {
                    return (
                      medicamento.medico_id ===
                      medico.id
                    );
                  }

                  return (
                    medicoNome.length >
                      0 &&
                    normalizeText(
                      medicamento.medico
                    ) ===
                      medicoNome
                  );
                }
              );

            const temAlertaUrgente =
              medsDoMedico.some(
                (
                  medicamento
                ) => {
                  const insight =
                    sugerirRenovacao(
                      medicamento
                    );

                  return (
                    insight.urgencia ===
                    "alta"
                  );
                }
              );

            // --------------------------------------------------
            // CONTEXTO DA PESSOA ATIVA
            // --------------------------------------------------

            const consultasDoMedico =
              consultas.filter(
                (
                  consulta
                ) =>
                  consulta.medico_id ===
                  medico.id
              );

            const cirurgiasDoMedico =
              cirurgias.filter(
                (
                  cirurgia
                ) =>
                  cirurgia.medico_id ===
                  medico.id
              );

            const docsDoMedico =
              documentos.filter(
                (
                  documento
                ) =>
                  documento.medico_id ===
                  medico.id
              );

            /*
             * Relação canônica:
             *
             * Tratamento.medico_ids[]
             *
             * Não inferimos mais Tratamento a partir dos
             * medicamentos relacionados ao médico.
             */
            const tratamentosDoMedico =
              tratamentos
                .filter(
                  (
                    tratamento
                  ) =>
                    tratamento.medico_ids?.includes(
                      medico.id!
                    )
                )
                .map(
                  (
                    tratamento
                  ) => ({
                    ...tratamento,

                    color:
                      tratamento.cor ||
                      "#38BDF8",
                  })
                );

            // --------------------------------------------------
            // RELAÇÕES GLOBAIS
            // --------------------------------------------------

            /*
             * Relações canônicas:
             *
             * Hospital.medico_ids[]
             * LocalSaude.medico_ids[]
             *
             * Os arrays legados medico.hospital_ids /
             * medico.local_ids deixam de ser fonte de verdade.
             */
            const hospitaisDoMedico =
              hospitais.filter(
                (
                  hospital
                ) =>
                  hospital.medico_ids?.includes(
                    medico.id!
                  )
              );

            const locaisDoMedico =
              locais.filter(
                (
                  local
                ) =>
                  local.medico_ids?.includes(
                    medico.id!
                  )
              );

            // --------------------------------------------------
            // ÚLTIMA CONSULTA
            // --------------------------------------------------

            const ultimaConsulta =
              consultasDoMedico.length >
              0
                ? consultasDoMedico.reduce(
                    (
                      latest,
                      current
                    ) =>
                      current.data >
                      latest.data
                        ? current
                        : latest
                  )
                : null;

            const ultimoHospital =
              ultimaConsulta?.hospital_id
                ? hospitalMap.get(
                    ultimaConsulta.hospital_id
                  ) ??
                  null
                : null;

            return {
              ...medico,

              medicamentosCount:
                medsDoMedico.length,

              consultasCount:
                consultasDoMedico.length,

              cirurgiasCount:
                cirurgiasDoMedico.length,

              documentosCount:
                docsDoMedico.length,

              tratamentos:
                tratamentosDoMedico,

              hospitais:
                hospitaisDoMedico,

              locais:
                locaisDoMedico,

              ultimaConsulta,

              ultimoHospital,

              temAlertaUrgente,
            };
          }
        );
      },
      [
        medicos,
        medicamentos,
        consultas,
        cirurgias,
        documentos,
        tratamentos,
        hospitais,
        locais,
        hospitalMap,
      ]
    );

  // ==========================================================
  // FILTER / SORT
  // ==========================================================

  const filteredMedicos =
    useMemo(
      () => {
        let result =
          [
            ...medicosComMetadados,
          ];

        const term =
          normalizeText(
            search
          );

        if (term) {
          result =
            result.filter(
              (
                medico
              ) =>
                normalizeText(
                  medico.nome
                ).includes(
                  term
                ) ||
                normalizeText(
                  medico.especialidade
                ).includes(
                  term
                ) ||
                normalizeText(
                  medico.crm
                ).includes(
                  term
                )
            );
        }

        if (
          filtroTratamento
        ) {
          result =
            result.filter(
              (
                medico
              ) =>
                medico.tratamentos.some(
                  (
                    tratamento
                  ) =>
                    tratamento.id ===
                    filtroTratamento
                )
            );
        }

        if (
          filtroHospital
        ) {
          result =
            result.filter(
              (
                medico
              ) =>
                medico.hospitais.some(
                  (
                    hospital
                  ) =>
                    hospital.id ===
                    filtroHospital
                )
            );
        }

        if (
          filtroLocal
        ) {
          result =
            result.filter(
              (
                medico
              ) =>
                medico.locais.some(
                  (
                    local
                  ) =>
                    local.id ===
                    filtroLocal
                )
            );
        }

        result.sort(
          (
            a,
            b
          ) => {
            if (
              sortBy ===
              "name"
            ) {
              return a.nome.localeCompare(
                b.nome,
                "pt-BR"
              );
            }

            const aDate =
              a.ultimaConsulta
                ?.data ??
              "";

            const bDate =
              b.ultimaConsulta
                ?.data ??
              "";

            return bDate.localeCompare(
              aDate
            );
          }
        );

        return result;
      },
      [
        medicosComMetadados,
        search,
        filtroTratamento,
        filtroHospital,
        filtroLocal,
        sortBy,
      ]
    );

  // ==========================================================
  // AVAILABLE FILTERS
  // ==========================================================

  const tratamentosUnicos =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            TratamentoComCor
          >();

        for (
          const medico of
          medicosComMetadados
        ) {
          for (
            const tratamento of
            medico.tratamentos
          ) {
            if (
              tratamento.id
            ) {
              map.set(
                tratamento.id,
                tratamento
              );
            }
          }
        }

        return Array.from(
          map.values()
        ).sort(
          (
            a,
            b
          ) =>
            a.nome.localeCompare(
              b.nome,
              "pt-BR"
            )
        );
      },
      [
        medicosComMetadados,
      ]
    );

  const hospitaisUnicos =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            Hospital
          >();

        for (
          const medico of
          medicosComMetadados
        ) {
          for (
            const hospital of
            medico.hospitais
          ) {
            if (
              hospital.id
            ) {
              map.set(
                hospital.id,
                hospital
              );
            }
          }
        }

        return Array.from(
          map.values()
        ).sort(
          (
            a,
            b
          ) =>
            a.nome.localeCompare(
              b.nome,
              "pt-BR"
            )
        );
      },
      [
        medicosComMetadados,
      ]
    );

  const locaisUnicos =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            LocalSaude
          >();

        for (
          const medico of
          medicosComMetadados
        ) {
          for (
            const local of
            medico.locais
          ) {
            if (
              local.id
            ) {
              map.set(
                local.id,
                local
              );
            }
          }
        }

        return Array.from(
          map.values()
        ).sort(
          (
            a,
            b
          ) =>
            a.nome.localeCompare(
              b.nome,
              "pt-BR"
            )
        );
      },
      [
        medicosComMetadados,
      ]
    );

  // ==========================================================
  // ACTIONS
  // ==========================================================

  const handleSortChange =
    (
      value: string
    ) => {
      trigger(
        "vibrate"
      );

      setSortBy(
        value as SortOption
      );
    };

  const handleClearFilters =
    () => {
      trigger(
        "vibrate"
      );

      setFiltroTratamento(
        null
      );

      setFiltroHospital(
        null
      );

      setFiltroLocal(
        null
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (!medicos) {
    return (
      <CardListSkeleton />
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  const hasFilters =
    Boolean(
      search ||
        filtroTratamento ||
        filtroHospital ||
        filtroLocal
    );

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Médicos"
          subtitle={`${filteredMedicos.length} ${
            filteredMedicos.length ===
            1
              ? "profissional"
              : "profissionais"
          }`}
          badgeLabel="Rede médica"
          badgeColor="text-ice"
          icon={
            <Stethoscope
              size={14}
            />
          }
          iconColor="text-ice"
        >
          <div className="flex items-center gap-2">
            <ListSearch
              value={
                search
              }
              onChange={
                setSearch
              }
              placeholder="Buscar nome, especialidade ou CRM..."
            />

            <ListSort
              options={
                SORT_OPTIONS
              }
              value={
                sortBy
              }
              onChange={
                handleSortChange
              }
            />
          </div>

          <ListFilters
            onClear={
              handleClearFilters
            }
          >
            {tratamentosUnicos
              .slice(
                0,
                4
              )
              .map(
                (
                  tratamento
                ) => {
                  const selected =
                    filtroTratamento ===
                    tratamento.id;

                  return (
                    <button
                      key={
                        tratamento.id
                      }
                      type="button"
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        setFiltroTratamento(
                          selected
                            ? null
                            : tratamento.id!
                        );
                      }}
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase transition-all ${
                        selected
                          ? "bg-ice/20"
                          : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                      }`}
                      style={
                        selected
                          ? {
                              borderColor:
                                tratamento.color,
                              color:
                                tratamento.color,
                            }
                          : undefined
                      }
                    >
                      <Activity
                        size={10}
                        className="mr-1 inline"
                      />

                      {
                        tratamento.nome
                      }
                    </button>
                  );
                }
              )}

            {hospitaisUnicos
              .slice(
                0,
                3
              )
              .map(
                (
                  hospital
                ) => (
                  <button
                    key={
                      hospital.id
                    }
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setFiltroHospital(
                        filtroHospital ===
                          hospital.id
                          ? null
                          : hospital.id!
                      );
                    }}
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase transition-all ${
                      filtroHospital ===
                      hospital.id
                        ? "border-ice bg-ice/20 text-ice"
                        : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                    }`}
                  >
                    <Building2
                      size={10}
                      className="mr-1 inline"
                    />

                    <span className="inline-block max-w-[100px] truncate align-bottom">
                      {
                        hospital.nome
                      }
                    </span>
                  </button>
                )
              )}

            {locaisUnicos
              .slice(
                0,
                3
              )
              .map(
                (
                  local
                ) => (
                  <button
                    key={
                      local.id
                    }
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setFiltroLocal(
                        filtroLocal ===
                          local.id
                          ? null
                          : local.id!
                      );
                    }}
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase transition-all ${
                      filtroLocal ===
                      local.id
                        ? "border-ice bg-ice/20 text-ice"
                        : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                    }`}
                  >
                    <MapPin
                      size={10}
                      className="mr-1 inline"
                    />

                    <span className="inline-block max-w-[100px] truncate align-bottom">
                      {
                        local.nome
                      }
                    </span>
                  </button>
                )
              )}
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {filteredMedicos.length ===
          0 ? (
            <EmptyState
              icon={
                Stethoscope
              }
              title={
                hasFilters
                  ? "Nenhum médico encontrado"
                  : "Nenhum médico cadastrado"
              }
              description={
                hasFilters
                  ? "Tente ajustar os filtros ou a busca."
                  : "Cadastre médicos para centralizar sua rede de cuidado."
              }
            />
          ) : (
            filteredMedicos.map(
              (
                medico,
                index
              ) => {
                const primaryColor =
                  medico
                    .tratamentos[
                    0
                  ]?.color ||
                  "#38BDF8";

                return (
                  <ListCard
                    key={
                      medico.id
                    }
                    id={
                      medico.id!
                    }
                    color={
                      primaryColor
                    }
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      router.push(
                        `/saude/medicos/detalhes?id=${medico.id}`
                      );
                    }}
                    delay={
                      index *
                      0.025
                    }
                    icon={
                      <Stethoscope
                        size={22}
                      />
                    }
                    actions={
                      <>
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
                              `/saude/consultas/nova?medico_id=${medico.id}`
                            );
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-ice/20 bg-ice/5 px-3 py-1.5 text-[10px] font-semibold text-ice transition-all hover:bg-ice/10 active:scale-95"
                        >
                          <Calendar
                            size={13}
                          />
                          Agendar
                        </button>

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
                              `/saude/medicos/editar?id=${medico.id}`
                            );
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-surface-border/40 bg-surface-raised px-3 py-1.5 text-[10px] font-medium text-ink-muted transition-all hover:bg-surface-border/30 active:scale-95"
                        >
                          <Edit3
                            size={13}
                          />
                          Editar
                        </button>

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
                              `/saude/medicos/detalhes?id=${medico.id}`
                            );
                          }}
                          className="ml-auto flex items-center gap-1 rounded-xl bg-ice/10 px-3 py-1.5 text-[10px] font-semibold text-ink-primary transition-all hover:bg-ice/20 active:scale-95"
                        >
                          Ver perfil
                          <ChevronRight
                            size={13}
                          />
                        </button>
                      </>
                    }
                  >
                    {/* ==================================================
                        IDENTIDADE
                        ================================================== */}

                    <div className="flex min-w-0 items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-display text-base font-bold text-ink-primary">
                          Dr(a).{" "}
                          {
                            medico.nome
                          }
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {medico.especialidade && (
                            <span className="rounded-full border border-ice/20 bg-ice/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ice">
                              {
                                medico.especialidade
                              }
                            </span>
                          )}

                          {medico.temAlertaUrgente && (
                            <span className="flex items-center gap-1 rounded-full bg-coral/10 px-2 py-0.5 text-[9px] font-bold text-coral">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral" />
                              Atenção
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ==================================================
                        CONTATO / ÚLTIMO ATENDIMENTO
                        ================================================== */}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
                      {medico.crm && (
                        <span className="font-mono text-[10px] text-ink-faint">
                          CRM{" "}
                          {
                            medico.crm
                          }
                        </span>
                      )}

                      {medico.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone
                            size={11}
                            className="text-ink-faint"
                          />

                          {
                            medico.telefone
                          }
                        </span>
                      )}

                      {medico.ultimaConsulta && (
                        <span className="flex items-center gap-1">
                          <Calendar
                            size={11}
                            className="text-ice"
                          />

                          Última{" "}
                          {formatDateDisplay(
                            medico
                              .ultimaConsulta
                              .data
                          )}
                        </span>
                      )}

                      {medico.ultimoHospital && (
                        <span className="flex max-w-[180px] items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                          <Building2
                            size={11}
                          />

                          <span className="truncate">
                            {
                              medico
                                .ultimoHospital
                                .nome
                            }
                          </span>
                        </span>
                      )}
                    </div>

                    {/* ==================================================
                        RELAÇÕES
                        ================================================== */}

                    {(medico.tratamentos.length >
                      0 ||
                      medico.hospitais.length >
                        0 ||
                      medico.locais.length >
                        0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {medico.tratamentos
                          .slice(
                            0,
                            3
                          )
                          .map(
                            (
                              tratamento
                            ) => (
                              <span
                                key={
                                  tratamento.id
                                }
                                className="inline-flex max-w-[120px] items-center gap-1 truncate rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase"
                                style={{
                                  backgroundColor:
                                    `${tratamento.color}15`,
                                  borderColor:
                                    `${tratamento.color}40`,
                                  color:
                                    tratamento.color,
                                }}
                              >
                                <Activity
                                  size={10}
                                />

                                <span className="truncate">
                                  {
                                    tratamento.nome
                                  }
                                </span>
                              </span>
                            )
                          )}

                        {medico.tratamentos.length >
                          3 && (
                          <span className="text-[9px] text-ink-faint">
                            +
                            {medico
                              .tratamentos
                              .length -
                              3}
                          </span>
                        )}

                        {medico.hospitais.length >
                          0 && (
                          <span className="inline-flex max-w-[150px] items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[9px] font-medium text-ink-muted">
                            <Building2
                              size={10}
                            />

                            <span className="truncate">
                              {
                                medico
                                  .hospitais[
                                  0
                                ].nome
                              }

                              {medico
                                .hospitais
                                .length >
                                1 &&
                                ` +${
                                  medico
                                    .hospitais
                                    .length -
                                  1
                                }`}
                            </span>
                          </span>
                        )}

                        {medico.locais.length >
                          0 && (
                          <span className="inline-flex max-w-[150px] items-center gap-1 rounded-md border border-surface-border/40 bg-surface-raised px-2 py-0.5 text-[9px] font-medium text-ink-muted">
                            <MapPin
                              size={10}
                            />

                            <span className="truncate">
                              {
                                medico
                                  .locais[
                                  0
                                ].nome
                              }

                              {medico
                                .locais
                                .length >
                                1 &&
                                ` +${
                                  medico
                                    .locais
                                    .length -
                                  1
                                }`}
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* ==================================================
                        ATIVIDADE DA PESSOA ATIVA
                        ================================================== */}

                    {(medico.consultasCount >
                      0 ||
                      medico.cirurgiasCount >
                        0 ||
                      medico.medicamentosCount >
                        0 ||
                      medico.documentosCount >
                        0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {medico.consultasCount >
                          0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-ice/10 px-2 py-0.5 text-[10px] font-medium text-ice">
                            <Calendar
                              size={12}
                            />
                            {
                              medico.consultasCount
                            }
                          </span>
                        )}

                        {medico.cirurgiasCount >
                          0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-medium text-coral">
                            <Activity
                              size={12}
                            />
                            {
                              medico.cirurgiasCount
                            }
                          </span>
                        )}

                        {medico.medicamentosCount >
                          0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                            <Pill
                              size={12}
                            />
                            {
                              medico.medicamentosCount
                            }
                          </span>
                        )}

                        {medico.documentosCount >
                          0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                            <FileText
                              size={12}
                            />
                            {
                              medico.documentosCount
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