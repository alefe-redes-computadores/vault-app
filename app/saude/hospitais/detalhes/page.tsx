// app/saude/hospitais/detalhes/page.tsx
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  motion,
} from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Calendar,
  Clock,
  Edit3,
  ExternalLink,
  FileWarning,
  FolderHeart,
  Hospital as HospitalIcon,
  MapPin,
  Navigation,
  Phone,
  ReceiptText,
  Stethoscope,
  Trash2,
  User,
} from "lucide-react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";
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
  useRenovacoes,
} from "@/hooks/useRenovacoes";
import {
  useMounted,
} from "@/hooks/useMounted";
import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";

import {
  PageTransition,
} from "@/components/PageTransition";
import {
  DetailSkeleton,
} from "@/components/loading/DetailSkeleton";
import {
  ConfirmationModal,
} from "@/components/ConfirmationModal";
import {
  SectionTitle,
  StatCard,
} from "@/components/detail/DetailComponents";

import type {
  Cirurgia,
  Consulta,
  Hospital,
  Medico,
  Renovacao,
  Tratamento,
} from "@/lib/types";

// ============================================================
// CONSTANTS
// ============================================================

const HOSPITAL_COLOR =
  "#38BDF8";

const fadeUp = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
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

function formatCurrency(
  value: number
): string {
  return `R$ ${value
    .toFixed(2)
    .replace(".", ",")}`;
}

// ============================================================
// CONTENT
// ============================================================

function DetalhesHospitalContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get(
      "id"
    );

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    getHospital,
    deleteHospitalSafe,
  } =
    useHospitais();

  /*
   * Estes hooks clínicos já estão person-scoped.
   *
   * Hospital continua global.
   */
  const {
    consultas = [],
  } =
    useConsultas();

  const {
    cirurgias = [],
  } =
    useCirurgias();

  const {
    renovacoes = [],
  } =
    useRenovacoes();

  /*
   * Médico é global.
   */
  const {
    medicos = [],
  } =
    useMedicos();

  const deleteAction =
    useSubmitAction();

  const mounted =
    useMounted();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    hospital,
    setHospital,
  ] =
    useState<Hospital | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] =
    useState(false);

  // ==========================================================
  // LOAD HOSPITAL
  // ==========================================================

  useEffect(() => {
    if (!id) {
      router.replace(
        "/saude/hospitais"
      );

      return;
    }

    let cancelled =
      false;

    const load =
      async () => {
        setIsLoading(
          true
        );

        try {
          /*
           * Hospital é entidade global.
           * Nenhum person_id entra nesta consulta.
           */
          const item =
            await getHospital(
              id
            );

          if (
            cancelled
          ) {
            return;
          }

          if (!item) {
            router.replace(
              "/saude/hospitais"
            );

            return;
          }

          setHospital(
            item
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao carregar hospital:",
            error
          );

          if (
            !cancelled
          ) {
            router.replace(
              "/saude/hospitais"
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setIsLoading(
              false
            );
          }
        }
      };

    void load();

    return () => {
      cancelled =
        true;
    };
  }, [
    getHospital,
    id,
    router,
  ]);

  // ==========================================================
  // PERSON
  // ==========================================================

  const activePerson =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return undefined;
        }

        return db.persons.get(
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // CONSULTAS
  // ==========================================================

  const consultasDoHospital =
    useMemo(() => {
      if (!id) {
        return [];
      }

      return consultas
        .filter(
          (
            consulta:
              Consulta
          ) =>
            consulta.hospital_id ===
            id
        )
        .sort(
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
      consultas,
      id,
    ]);

  // ==========================================================
  // CIRURGIAS
  // ==========================================================

  const cirurgiasDoHospital =
    useMemo(() => {
      if (!id) {
        return [];
      }

      return cirurgias
        .filter(
          (
            cirurgia:
              Cirurgia
          ) =>
            cirurgia.hospital_id ===
            id
        )
        .sort(
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
      cirurgias,
      id,
    ]);

  // ==========================================================
  // RENOVACOES
  // ==========================================================

  const renovacoesDoHospital =
    useMemo(() => {
      if (!id) {
        return [];
      }

      return renovacoes
        .filter(
          (
            renovacao:
              Renovacao
          ) =>
            renovacao.hospital_id ===
            id
        )
        .sort(
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
      renovacoes,
      id,
    ]);

  // ==========================================================
  // MEDICOS
  // ==========================================================

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

  /*
   * Relação global declarada no próprio Hospital.
   */
  const corpoClinico =
    useMemo(() => {
      const medicoIds =
        new Set(
          hospital?.medico_ids ||
            []
        );

      return medicos.filter(
        (
          medico
        ) =>
          Boolean(
            medico.id &&
              medicoIds.has(
                medico.id
              )
          )
      );
    }, [
      hospital?.medico_ids,
      medicos,
    ]);

  /*
   * Relação inferida exclusivamente do histórico
   * da pessoa ativa.
   */
  const medicosDoHistorico =
    useMemo(() => {
      const ids =
        new Set<string>();

      consultasDoHospital.forEach(
        (
          consulta
        ) => {
          if (
            consulta.medico_id
          ) {
            ids.add(
              consulta.medico_id
            );
          }
        }
      );

      return Array.from(
        ids
      )
        .map(
          (
            medicoId
          ) =>
            medicosById.get(
              medicoId
            )
        )
        .filter(
          (
            medico
          ): medico is Medico =>
            Boolean(
              medico
            )
        );
    }, [
      consultasDoHospital,
      medicosById,
    ]);

  // ==========================================================
  // TREATMENT IDS DERIVED FROM CLINICAL HISTORY
  // ==========================================================

  const tratamentoIdsHistorico =
    useMemo(() => {
      const ids =
        new Set<string>();

      consultasDoHospital.forEach(
        (
          consulta
        ) => {
          (
            consulta.tratamento_ids ||
            []
          ).forEach(
            (
              tratamentoId
            ) =>
              ids.add(
                tratamentoId
              )
          );
        }
      );

      cirurgiasDoHospital.forEach(
        (
          cirurgia
        ) => {
          (
            cirurgia.tratamento_ids ||
            []
          ).forEach(
            (
              tratamentoId
            ) =>
              ids.add(
                tratamentoId
              )
          );
        }
      );

      return Array.from(
        ids
      );
    }, [
      consultasDoHospital,
      cirurgiasDoHospital,
    ]);

  /*
   * Leitura derivada temporária.
   *
   * Não usamos hospital.tratamento_ids.
   *
   * Como o vínculo nasce de Consultas/Cirurgias já person-scoped,
   * ainda reforçamos person_id antes de exibir.
   *
   * Quando Tratamentos for auditado, vale substituir isso
   * pelo boundary/hook definitivo daquele módulo.
   */
  const tratamentosDoHistorico =
    useLiveQuery(
      async () => {
        if (
          !activePersonId ||
          tratamentoIdsHistorico.length ===
            0
        ) {
          return [] as Tratamento[];
        }

        const encontrados =
          await db.tratamentos
            .where(
              "id"
            )
            .anyOf(
              tratamentoIdsHistorico
            )
            .toArray();

        return encontrados.filter(
          (
            tratamento
          ) =>
            tratamento.person_id ===
            activePersonId
        );
      },
      [
        activePersonId,
        tratamentoIdsHistorico,
      ],
      []
    );

  // ==========================================================
  // METRICS
  // ==========================================================

  const totalGastoRenovacoes =
    useMemo(() => {
      return renovacoesDoHospital.reduce(
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
    }, [
      renovacoesDoHospital,
    ]);

  const ultimaAtividade =
    useMemo(() => {
      const eventos: {
        tipo:
          | "consulta"
          | "cirurgia"
          | "renovacao";
        data: string;
      }[] = [];

      consultasDoHospital.forEach(
        (
          consulta
        ) => {
          if (
            consulta.data
          ) {
            eventos.push({
              tipo:
                "consulta",
              data:
                consulta.data,
            });
          }
        }
      );

      cirurgiasDoHospital.forEach(
        (
          cirurgia
        ) => {
          if (
            cirurgia.data
          ) {
            eventos.push({
              tipo:
                "cirurgia",
              data:
                cirurgia.data,
            });
          }
        }
      );

      renovacoesDoHospital.forEach(
        (
          renovacao
        ) => {
          if (
            renovacao.data
          ) {
            eventos.push({
              tipo:
                "renovacao",
              data:
                renovacao.data,
            });
          }
        }
      );

      return eventos.sort(
        (
          first,
          second
        ) =>
          second.data.localeCompare(
            first.data
          )
      )[0] || null;
    }, [
      consultasDoHospital,
      cirurgiasDoHospital,
      renovacoesDoHospital,
    ]);

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    () => {
      if (
        !hospital?.id
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      deleteAction.run(
        async () => {
          /*
           * Hospital global => cleanup global.
           *
           * Registros clínicos permanecem.
           * Apenas hospital_id é removido.
           */
          await deleteHospitalSafe(
            hospital.id!
          );

          router.replace(
            "/saude/hospitais"
          );
        },
        {
          successMessage:
            "Hospital excluído com sucesso",

          errorMessage:
            "Erro ao excluir hospital",

          goBackOnSuccess:
            false,
        }
      );
    };

  // ==========================================================
  // RENDER STATE
  // ==========================================================

  if (
    !mounted ||
    isLoading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (!hospital) {
    return null;
  }

  const activePersonName =
    activePerson?.name ||
    "pessoa ativa";

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">
                Hospital global
              </p>

              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">
                Detalhes do Hospital
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.push(
                  `/saude/hospitais/editar?id=${hospital.id}`
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all hover:border-ice/30 hover:text-ice active:scale-95"
              aria-label="Editar hospital"
            >
              <Edit3
                size={16}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setShowDeleteModal(
                  true
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
              aria-label="Excluir hospital"
            >
              <Trash2
                size={16}
              />
            </button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          {/* ==================================================
              HERO
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="space-y-5 rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm"
            style={{
              borderLeft:
                `6px solid ${HOSPITAL_COLOR}`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor:
                      `${HOSPITAL_COLOR}15`,

                    color:
                      HOSPITAL_COLOR,

                    borderColor:
                      `${HOSPITAL_COLOR}30`,
                  }}
                >
                  <HospitalIcon
                    size={28}
                  />
                </div>

                <div className="min-w-0 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display text-2xl font-bold uppercase text-ink-primary">
                      {
                        hospital.nome
                      }
                    </h2>

                    <span className="shrink-0 rounded-full border border-ice/30 bg-ice/10 px-2 py-0.5 text-[9px] font-bold uppercase text-ice">
                      Hospital
                    </span>
                  </div>

                  {hospital.endereco && (
                    <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-ink-muted">
                      <MapPin
                        size={13}
                        className="mt-0.5 shrink-0 text-ink-faint"
                      />

                      <span>
                        {
                          hospital.endereco
                        }
                      </span>
                    </p>
                  )}

                  {hospital.telefone && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                      <Phone
                        size={13}
                        className="shrink-0 text-ink-faint"
                      />

                      {
                        hospital.telefone
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 pt-1">
                {hospital.telefone && (
                  <a
                    href={`tel:${hospital.telefone}`}
                    onClick={() =>
                      trigger(
                        "vibrate"
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 transition-all active:scale-95"
                    title="Ligar para hospital"
                    aria-label="Ligar para hospital"
                  >
                    <Phone
                      size={16}
                    />
                  </a>
                )}

                {hospital.endereco && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      hospital.endereco
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trigger(
                        "vibrate"
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/30 bg-ice/10 text-ice transition-all active:scale-95"
                    title="Abrir no mapa"
                    aria-label="Abrir no mapa"
                  >
                    <Navigation
                      size={16}
                    />
                  </a>
                )}
              </div>
            </div>

            {/* ================================================
                PERSON CONTEXT
                ================================================ */}

            <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/45 px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <User
                  size={15}
                  className="mt-0.5 shrink-0 text-violet-400"
                />

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Contexto clínico
                  </p>

                  {activePersonId ? (
                    <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                      Consultas, cirurgias, tratamentos e renovações abaixo pertencem a{" "}
                      <span className="font-semibold text-ink-primary">
                        {
                          activePersonName
                        }
                      </span>
                      .
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                      Selecione uma pessoa para visualizar o histórico clínico relacionado a este Hospital.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ================================================
                LAST ACTIVITY
                ================================================ */}

            {ultimaAtividade && (
              <div className="border-t border-surface-border/40 pt-3">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Clock
                    size={14}
                    className="text-ice"
                  />

                  <span>
                    Última atividade registrada:{" "}
                    <span className="font-medium text-ink-primary">
                      {formatDateDisplay(
                        ultimaAtividade.data
                      )}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* ================================================
                METRICS
                ================================================ */}

            <div className="grid grid-cols-2 gap-2 border-t border-surface-border/40 pt-4">
              <StatCard
                icon={
                  <Calendar
                    size={14}
                  />
                }
                label="Consultas"
                value={String(
                  consultasDoHospital.length
                )}
              />

              <StatCard
                icon={
                  <Activity
                    size={14}
                  />
                }
                label="Cirurgias"
                value={String(
                  cirurgiasDoHospital.length
                )}
              />

              <StatCard
                icon={
                  <FolderHeart
                    size={14}
                  />
                }
                label="Tratamentos"
                value={String(
                  tratamentosDoHistorico.length
                )}
              />

              <StatCard
                icon={
                  <FileWarning
                    size={14}
                  />
                }
                label="Renovações"
                value={String(
                  renovacoesDoHospital.length
                )}
              />
            </div>
          </motion.div>

          {/* ==================================================
              OBSERVACOES
              ================================================== */}

          {hospital.observacoes && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.03,
              }}
              className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <SectionTitle
                icon={
                  <ReceiptText
                    size={15}
                  />
                }
                title="Observações"
              />

              <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-ink-muted">
                {
                  hospital.observacoes
                }
              </p>
            </motion.div>
          )}

          {/* ==================================================
              CORPO CLINICO GLOBAL
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.04,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <Stethoscope
                  size={15}
                />
              }
              title={`Corpo clínico (${corpoClinico.length})`}
            />

            {corpoClinico.length ===
            0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum médico foi cadastrado diretamente no corpo clínico deste Hospital.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {corpoClinico.map(
                  (
                    medico
                  ) => (
                    <button
                      key={
                        medico.id
                      }
                      type="button"
                      onClick={() => {
                        if (
                          !medico.id
                        ) {
                          return;
                        }

                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/medicos/detalhes?id=${medico.id}`
                        );
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all hover:border-ice/30 active:scale-[0.98]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                          <Stethoscope
                            size={16}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            Dr(a).{" "}
                            {
                              medico.nome
                            }
                          </p>

                          {medico.especialidade && (
                            <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                              {
                                medico.especialidade
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <ExternalLink
                        size={15}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              HISTORICAL DOCTORS
              ================================================== */}

          {medicosDoHistorico.length >
            0 && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.05,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <User
                    size={15}
                  />
                }
                title={`Médicos no histórico de ${activePersonName}`}
              />

              <div className="flex flex-wrap gap-2">
                {medicosDoHistorico.map(
                  (
                    medico
                  ) => (
                    <button
                      key={
                        medico.id
                      }
                      type="button"
                      onClick={() => {
                        if (
                          !medico.id
                        ) {
                          return;
                        }

                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/medicos/detalhes?id=${medico.id}`
                        );
                      }}
                      className="rounded-full border border-surface-border/60 bg-surface px-3.5 py-2 text-xs font-medium text-ink-primary transition-all hover:border-ice/30 active:scale-95"
                    >
                      Dr(a).{" "}
                      {
                        medico.nome
                      }
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              TREATMENTS DERIVED
              ================================================== */}

          {tratamentosDoHistorico.length >
            0 && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.06,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <FolderHeart
                    size={15}
                  />
                }
                title={`Tratamentos relacionados (${tratamentosDoHistorico.length})`}
              />

              <div className="space-y-2">
                {tratamentosDoHistorico.map(
                  (
                    tratamento
                  ) => (
                    <button
                      key={
                        tratamento.id
                      }
                      type="button"
                      onClick={() => {
                        if (
                          !tratamento.id
                        ) {
                          return;
                        }

                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/tratamentos/detalhes?id=${tratamento.id}`
                        );
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left transition-all active:scale-[0.98]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400"
                          style={
                            tratamento.cor
                              ? {
                                  borderLeft:
                                    `3px solid ${tratamento.cor}`,
                                }
                              : undefined
                          }
                        >
                          <FolderHeart
                            size={16}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {
                              tratamento.nome
                            }
                          </p>

                          <p className="mt-0.5 text-[10px] text-ink-muted">
                            Derivado do histórico clínico nesta unidade
                          </p>
                        </div>
                      </div>

                      <ExternalLink
                        size={15}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              CONSULTAS
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.07,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <Calendar
                  size={15}
                />
              }
              title={`Consultas (${consultasDoHospital.length})`}
            />

            {consultasDoHospital.length ===
            0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhuma consulta da pessoa ativa está vinculada a este Hospital.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {consultasDoHospital
                  .slice(
                    0,
                    5
                  )
                  .map(
                    (
                      consulta
                    ) => {
                      const medico =
                        consulta.medico_id
                          ? medicosById.get(
                              consulta.medico_id
                            )
                          : undefined;

                      return (
                        <button
                          key={
                            consulta.id
                          }
                          type="button"
                          onClick={() => {
                            if (
                              !consulta.id
                            ) {
                              return;
                            }

                            trigger(
                              "vibrate"
                            );

                            router.push(
                              `/saude/consultas/detalhes?id=${consulta.id}`
                            );
                          }}
                          className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all hover:border-ice/30 active:scale-[0.98]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                              <Calendar
                                size={16}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink-primary">
                                {consulta.especialidade ||
                                  "Consulta"}
                              </p>

                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="text-[11px] text-ink-muted">
                                  {formatDateDisplay(
                                    consulta.data
                                  )}
                                </span>

                                {medico && (
                                  <span className="text-[10px] text-ink-faint">
                                    Dr(a).{" "}
                                    {
                                      medico.nome
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <ExternalLink
                            size={15}
                            className="shrink-0 text-ink-faint"
                          />
                        </button>
                      );
                    }
                  )}

                {consultasDoHospital.length >
                  5 && (
                  <p className="pt-1 text-center text-[10px] text-ink-muted">
                    +{" "}
                    {consultasDoHospital.length -
                      5}{" "}
                    consulta(s) anterior(es)
                  </p>
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              SURGERIES
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.08,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <Activity
                  size={15}
                />
              }
              title={`Cirurgias (${cirurgiasDoHospital.length})`}
            />

            {cirurgiasDoHospital.length ===
            0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhuma cirurgia da pessoa ativa está vinculada a este Hospital.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {cirurgiasDoHospital.map(
                  (
                    cirurgia
                  ) => (
                    <button
                      key={
                        cirurgia.id
                      }
                      type="button"
                      onClick={() => {
                        if (
                          !cirurgia.id
                        ) {
                          return;
                        }

                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/cirurgias/detalhes?id=${cirurgia.id}`
                        );
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all hover:border-coral/30 active:scale-[0.98]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
                          <Activity
                            size={16}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {cirurgia.procedimento ||
                              "Cirurgia"}
                          </p>

                          <p className="mt-0.5 text-[11px] text-ink-muted">
                            {cirurgia.data
                              ? formatDateDisplay(
                                  cirurgia.data
                                )
                              : "Data não informada"}
                          </p>
                        </div>
                      </div>

                      <ExternalLink
                        size={15}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              RENOVATIONS
              ================================================== */}

          {renovacoesDoHospital.length >
            0 && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.09,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <FileWarning
                    size={15}
                  />
                }
                title={`Renovações / retiradas (${renovacoesDoHospital.length})`}
              />

              <div className="space-y-2">
                {renovacoesDoHospital
                  .slice(
                    0,
                    5
                  )
                  .map(
                    (
                      renovacao
                    ) => (
                      <div
                        key={
                          renovacao.id
                        }
                        className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                            <FileWarning
                              size={16}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink-primary">
                              {formatDateDisplay(
                                renovacao.data
                              )}
                            </p>

                            <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                              {renovacao.observacoes ||
                                "Renovação ou retirada registrada"}
                            </p>

                            {renovacao.data_proxima_retirada && (
                              <p className="mt-0.5 text-[10px] text-ink-faint">
                                Próxima retirada prevista:{" "}
                                {formatDateDisplay(
                                  renovacao.data_proxima_retirada
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {typeof renovacao.preco ===
                            "number" &&
                          renovacao.preco >
                            0 ? (
                            <span className="text-xs font-semibold text-emerald-400">
                              {formatCurrency(
                                renovacao.preco
                              )}
                            </span>
                          ) : (
                            <span className="text-[10px] text-ink-faint">
                              Sem preço
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  )}

                {totalGastoRenovacoes >
                  0 && (
                  <div className="flex items-center justify-between border-t border-surface-border/40 px-1 pt-3">
                    <span className="text-xs text-ink-muted">
                      Total registrado
                    </span>

                    <span className="text-sm font-bold text-emerald-400">
                      {formatCurrency(
                        totalGastoRenovacoes
                      )}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </section>

        {/* ====================================================
            DELETE
            ==================================================== */}

        <ConfirmationModal
          isOpen={
            showDeleteModal
          }
          onClose={() =>
            setShowDeleteModal(
              false
            )
          }
          onConfirm={
            handleDelete
          }
          title="Excluir hospital"
          message={`Tem certeza que deseja excluir "${hospital.nome}"? Como este Hospital é global, ele será desvinculado dos registros relacionados de todas as pessoas. Os registros clínicos não serão excluídos.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={
            deleteAction.isSubmitting
          }
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function DetalhesHospitalPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <DetalhesHospitalContent />
    </Suspense>
  );
}