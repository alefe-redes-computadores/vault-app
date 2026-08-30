// app/saude/hospitais/page.tsx
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
  Calendar,
  Edit3,
  Hospital as HospitalIcon,
  MapPin,
  Phone,
  Stethoscope,
  Syringe,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useHospitais,
} from "@/hooks/useHospitais";
import {
  useConsultas,
} from "@/hooks/useConsultas";
import {
  useCirurgias,
} from "@/hooks/useCirurgias";
import {
  useMedicos,
} from "@/hooks/useMedicos";
import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  PageTransition,
} from "@/components/PageTransition";
import {
  EmptyState,
} from "@/components/EmptyState";
import {
  ListCard,
  ListPageHeader,
  ListSearch,
} from "@/components/list";

import type {
  Cirurgia,
  Consulta,
  Hospital,
  Medico,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type HospitalComCruzamento =
  Hospital & {
    cirurgiasCount: number;
    consultasCount: number;
    medicosHistoricoCount: number;
    medicosCadastradosCount: number;
    ultimoAtendimento:
      | Consulta
      | null;
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
    parts.length !== 3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ============================================================
// PAGE
// ============================================================

export default function HospitaisPage() {
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
    useState("");

  /*
   * Hospital e Médico são globais.
   *
   * Consultas e Cirurgias são person-scoped.
   *
   * Portanto a lista de Hospitais sempre aparece,
   * enquanto os números clínicos mudam conforme
   * a pessoa ativa.
   */
  const {
    hospitais = [],
  } =
    useHospitais();

  const {
    consultas = [],
  } =
    useConsultas();

  const {
    cirurgias = [],
  } =
    useCirurgias();

  const {
    medicos = [],
  } =
    useMedicos();

  // ==========================================================
  // RELATIONAL INDEXES
  // ==========================================================

  /*
   * Em vez de fazer vários filter() completos dentro de cada
   * hospital, montamos índices uma única vez.
   *
   * Isso mantém o custo mais previsível conforme os históricos
   * crescerem.
   */

  const consultasPorHospital =
    useMemo(() => {
      const map =
        new Map<
          string,
          Consulta[]
        >();

      consultas.forEach(
        (
          consulta
        ) => {
          if (
            !consulta.hospital_id
          ) {
            return;
          }

          const current =
            map.get(
              consulta.hospital_id
            ) ||
            [];

          current.push(
            consulta
          );

          map.set(
            consulta.hospital_id,
            current
          );
        }
      );

      for (
        const items of
        map.values()
      ) {
        items.sort(
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
      }

      return map;
    }, [
      consultas,
    ]);

  const cirurgiasPorHospital =
    useMemo(() => {
      const map =
        new Map<
          string,
          Cirurgia[]
        >();

      cirurgias.forEach(
        (
          cirurgia
        ) => {
          if (
            !cirurgia.hospital_id
          ) {
            return;
          }

          const current =
            map.get(
              cirurgia.hospital_id
            ) ||
            [];

          current.push(
            cirurgia
          );

          map.set(
            cirurgia.hospital_id,
            current
          );
        }
      );

      return map;
    }, [
      cirurgias,
    ]);

  const medicosById =
    useMemo(() => {
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
    }, [
      medicos,
    ]);

  // ==========================================================
  // CROSS DATA
  // ==========================================================

  const hospitaisComCruzamento =
    useMemo<
      HospitalComCruzamento[]
    >(() => {
      return hospitais.map(
        (
          hospital
        ) => {
          if (!hospital.id) {
            return {
              ...hospital,

              cirurgiasCount:
                0,

              consultasCount:
                0,

              medicosHistoricoCount:
                0,

              medicosCadastradosCount:
                0,

              ultimoAtendimento:
                null,
            };
          }

          const consultasDoHospital =
            consultasPorHospital.get(
              hospital.id
            ) ||
            [];

          const cirurgiasDoHospital =
            cirurgiasPorHospital.get(
              hospital.id
            ) ||
            [];

          /*
           * Médicos cadastrados diretamente no Hospital:
           * relação global <-> global.
           */
          const medicoIdsCadastrados =
            new Set(
              (
                hospital.medico_ids ||
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

          /*
           * Médicos encontrados no histórico:
           * relação derivada das Consultas da pessoa ativa.
           */
          const medicoIdsHistorico =
            new Set(
              consultasDoHospital
                .map(
                  (
                    consulta
                  ) =>
                    consulta.medico_id
                )
                .filter(
                  (
                    medicoId
                  ): medicoId is string =>
                    Boolean(
                      medicoId
                    )
                )
            );

          return {
            ...hospital,

            cirurgiasCount:
              cirurgiasDoHospital.length,

            consultasCount:
              consultasDoHospital.length,

            medicosHistoricoCount:
              medicoIdsHistorico.size,

            medicosCadastradosCount:
              medicoIdsCadastrados.size,

            ultimoAtendimento:
              consultasDoHospital[0] ||
              null,
          };
        }
      );
    }, [
      hospitais,
      consultasPorHospital,
      cirurgiasPorHospital,
      medicosById,
    ]);

  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredHospitais =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLocaleLowerCase(
            "pt-BR"
          );

      let result =
        hospitaisComCruzamento;

      if (term) {
        result =
          result.filter(
            (
              hospital
            ) => {
              const nome =
                hospital.nome
                  .toLocaleLowerCase(
                    "pt-BR"
                  );

              const endereco =
                hospital.endereco
                  ?.toLocaleLowerCase(
                    "pt-BR"
                  ) ||
                "";

              return (
                nome.includes(
                  term
                ) ||
                endereco.includes(
                  term
                )
              );
            }
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
      hospitaisComCruzamento,
      search,
    ]);

  // ==========================================================
  // UI
  // ==========================================================

  const HOSPITAL_COLOR =
    "#38BDF8";

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Hospitais"
          badgeLabel="Rede Hospitalar"
          badgeColor="text-ice"
          icon={
            <HospitalIcon
              size={14}
            />
          }
          iconColor="text-ice"
        >
          <ListSearch
            value={search}
            onChange={
              setSearch
            }
            placeholder="Buscar por nome ou endereço..."
          />
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {!activePersonId &&
            hospitais.length >
              0 && (
              <div className="rounded-2xl border border-ice/15 bg-ice/5 px-3.5 py-3">
                <p className="text-[11px] leading-5 text-ink-muted">
                  Os hospitais continuam disponíveis porque são globais. Selecione uma pessoa para visualizar consultas, cirurgias e histórico clínico relacionados.
                </p>
              </div>
            )}

          {filteredHospitais.length ===
          0 ? (
            <EmptyState
              icon={
                HospitalIcon
              }
              title="Nenhum hospital encontrado"
              description={
                search
                  ? "Não encontramos hospitais para essa busca."
                  : "Cadastre hospitais para organizar unidades e cruzar o histórico clínico relacionado."
              }
            />
          ) : (
            filteredHospitais.map(
              (
                hospital,
                index
              ) => {
                if (
                  !hospital.id
                ) {
                  return null;
                }

                return (
                  <ListCard
                    key={
                      hospital.id
                    }
                    id={
                      hospital.id
                    }
                    color={
                      HOSPITAL_COLOR
                    }
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      router.push(
                        `/saude/hospitais/detalhes?id=${hospital.id}`
                      );
                    }}
                    delay={
                      index *
                      0.025
                    }
                    icon={
                      <HospitalIcon
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
                            `/saude/hospitais/editar?id=${hospital.id}`
                          );
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-colors hover:text-ice active:scale-95"
                        aria-label={`Editar ${hospital.nome}`}
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
                          hospital.nome
                        }
                      </h3>

                      <span className="shrink-0 whitespace-nowrap rounded-full border border-ice/30 bg-ice/10 px-2 py-0.5 text-[9px] font-bold uppercase text-ice">
                        Hospital
                      </span>
                    </div>

                    <div className="mt-1 space-y-0.5 text-xs text-ink-muted">
                      {hospital.endereco && (
                        <p className="flex items-center gap-1 truncate">
                          <MapPin
                            size={11}
                            className="shrink-0 text-ink-faint"
                          />

                          {
                            hospital.endereco
                          }
                        </p>
                      )}

                      {hospital.telefone && (
                        <p className="flex items-center gap-1">
                          <Phone
                            size={11}
                            className="shrink-0 text-ink-faint"
                          />

                          {
                            hospital.telefone
                          }
                        </p>
                      )}
                    </div>

                    {hospital.ultimoAtendimento && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-ink-muted">
                        <Calendar
                          size={12}
                          className="text-ice"
                        />

                        Última consulta:{" "}
                        {formatDateDisplay(
                          hospital
                            .ultimoAtendimento
                            .data
                        )}
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-surface-border/40 pt-2 sm:grid-cols-4">
                      <div className="rounded-xl bg-surface-raised/60 p-2 text-center">
                        <p className="flex items-center justify-center gap-1 font-mono text-[10px] uppercase text-ink-muted">
                          <Stethoscope
                            size={10}
                            className="text-ice"
                          />

                          Consultas
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                          {
                            hospital.consultasCount
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-surface-raised/60 p-2 text-center">
                        <p className="flex items-center justify-center gap-1 font-mono text-[10px] uppercase text-ink-muted">
                          <Syringe
                            size={10}
                            className="text-coral"
                          />

                          Cirurgias
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                          {
                            hospital.cirurgiasCount
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-surface-raised/60 p-2 text-center">
                        <p className="flex items-center justify-center gap-1 font-mono text-[10px] uppercase text-ink-muted">
                          <Activity
                            size={10}
                            className="text-emerald-400"
                          />

                          Corpo clínico
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                          {
                            hospital.medicosCadastradosCount
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-surface-raised/60 p-2 text-center">
                        <p className="flex items-center justify-center gap-1 font-mono text-[10px] uppercase text-ink-muted">
                          <Stethoscope
                            size={10}
                            className="text-violet-400"
                          />

                          No histórico
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                          {
                            hospital.medicosHistoricoCount
                          }
                        </p>
                      </div>
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