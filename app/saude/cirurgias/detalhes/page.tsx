// app/saude/cirurgias/detalhes/page.tsx
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
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Edit3,
  FileText,
  FlaskConical,
  MapPin,
  Pill,
  Plus,
  Stethoscope,
  Trash2,
  UserCheck,
} from "lucide-react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  useHapticFeedback,
} from "@/lib/haptics";
import {
  getDaysUntil,
  getClinicalTheme,
} from "@/lib/health-utils";

import {
  useCirurgias,
} from "@/hooks/useCirurgias";
import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";
import {
  useMounted,
} from "@/hooks/useMounted";

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
  DetailInfoRow,
  SectionTitle,
} from "@/components/detail/DetailComponents";

import type {
  Cid,
  Cirurgia,
  Exame,
  Hospital,
  LocalSaude,
  Medicamento,
  Medico,
  Tratamento,
} from "@/lib/types";

// ============================================================
// ANIMAÇÃO
// ============================================================

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
    return "Não informado";
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

function getDiasRestantesLabel(
  dias: number | null
): string | null {
  if (
    dias === null
  ) {
    return null;
  }

  if (
    dias === 0
  ) {
    return "Hoje";
  }

  if (
    dias < 0
  ) {
    const absolute =
      Math.abs(
        dias
      );

    return `Há ${absolute} dia${
      absolute > 1
        ? "s"
        : ""
    }`;
  }

  return `Em ${dias} dia${
    dias > 1
      ? "s"
      : ""
  }`;
}

function belongsToPerson(
  entity:
    | {
        person_id?: string;
      }
    | null
    | undefined,
  personId: string
): boolean {
  return (
    entity?.person_id ===
    personId
  );
}

function intersects(
  ids:
    | string[]
    | undefined,
  referenceIds:
    Set<string>
): boolean {
  if (
    !ids?.length ||
    referenceIds.size ===
      0
  ) {
    return false;
  }

  return ids.some(
    (
      id
    ) =>
      referenceIds.has(
        id
      )
  );
}

function getStatusColor(
  status: string
): string {
  switch (
    status
  ) {
    case "realizada":
      return "#34D399";

    case "cancelada":
      return "#EF4444";

    case "agendada":
    default:
      return "#F59E0B";
  }
}

function getStatusLabel(
  status: string
): string {
  switch (
    status
  ) {
    case "realizada":
      return "Realizada";

    case "cancelada":
      return "Cancelada";

    case "agendada":
    default:
      return "Agendada";
  }
}

// ============================================================
// CONTENT
// ============================================================

function DetalhesCirurgiaContent() {
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

  const mounted =
    useMounted();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    getCirurgia,
    updateCirurgia,
    deleteCirurgia,
  } =
    useCirurgias();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    cirurgia,
    setCirurgia,
  ] =
    useState<Cirurgia | null>(
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

  const [
    isMenuFlutuanteOpen,
    setIsMenuFlutuanteOpen,
  ] =
    useState(false);

  const [
    isUpdatingStatus,
    setIsUpdatingStatus,
  ] =
    useState(false);

  // ==========================================================
  // GLOBAL ENTITIES
  // ==========================================================

  const medicos =
    useLiveQuery(
      () =>
        db.medicos.toArray(),
      [],
      []
    ) || [];

  const hospitais =
    useLiveQuery(
      () =>
        db.hospitais.toArray(),
      [],
      []
    ) || [];

  const locais =
    useLiveQuery(
      () =>
        db.locais.toArray(),
      [],
      []
    ) || [];

  // ==========================================================
  // PERSON-OWNED ENTITIES
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

  const cids =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.cids
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

  /*
   * Por enquanto mantemos leitura direta dessas tabelas,
   * mas o filtro por pessoa acontece ANTES de cruzar relações.
   *
   * Quando os módulos de Medicamentos/Exames forem refatorados,
   * isso pode migrar para hooks/repositories próprios.
   */
  const medicamentos =
    useLiveQuery(
      () =>
        db.medicamentos.toArray(),
      [],
      []
    ) || [];

  const exames =
    useLiveQuery(
      () =>
        db.exames.toArray(),
      [],
      []
    ) || [];

  // ==========================================================
  // LOAD CIRURGIA
  // ==========================================================

  useEffect(() => {
    if (!id) {
      router.replace(
        "/saude/cirurgias"
      );

      return;
    }

    if (
      !activePersonId
    ) {
      setCirurgia(
        null
      );

      setIsLoading(
        false
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
          const data =
            await getCirurgia(
              id
            );

          if (
            cancelled
          ) {
            return;
          }

          if (!data) {
            router.replace(
              "/saude/cirurgias"
            );

            return;
          }

          setCirurgia(
            data
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao buscar detalhes da cirurgia:",
            error
          );

          if (
            !cancelled
          ) {
            router.replace(
              "/saude/cirurgias"
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
    id,
    activePersonId,
    getCirurgia,
    router,
  ]);

  // ==========================================================
  // DIRECT GLOBAL RELATIONS
  // ==========================================================

  const medico =
    useMemo<
      Medico | null
    >(() => {
      if (
        !cirurgia?.medico_id
      ) {
        return null;
      }

      return (
        medicos.find(
          (
            item
          ) =>
            item.id ===
            cirurgia.medico_id
        ) ||
        null
      );
    }, [
      cirurgia?.medico_id,
      medicos,
    ]);

  const hospital =
    useMemo<
      Hospital | null
    >(() => {
      if (
        !cirurgia?.hospital_id
      ) {
        return null;
      }

      return (
        hospitais.find(
          (
            item
          ) =>
            item.id ===
            cirurgia.hospital_id
        ) ||
        null
      );
    }, [
      cirurgia?.hospital_id,
      hospitais,
    ]);

  const local =
    useMemo<
      LocalSaude | null
    >(() => {
      if (
        !cirurgia?.local_id
      ) {
        return null;
      }

      return (
        locais.find(
          (
            item
          ) =>
            item.id ===
            cirurgia.local_id
        ) ||
        null
      );
    }, [
      cirurgia?.local_id,
      locais,
    ]);

  // ==========================================================
  // DIRECT PERSON RELATIONS
  // ==========================================================

  const tratamentoIds =
    useMemo(
      () =>
        new Set(
          cirurgia?.tratamento_ids ||
            []
        ),
      [
        cirurgia?.tratamento_ids,
      ]
    );

  const cidIds =
    useMemo(
      () =>
        new Set(
          cirurgia?.cid_ids ||
            []
        ),
      [
        cirurgia?.cid_ids,
      ]
    );

  const tratamentosRelacionados =
    useMemo<
      Tratamento[]
    >(() => {
      if (
        !cirurgia ||
        !activePersonId
      ) {
        return [];
      }

      return tratamentos.filter(
        (
          tratamento
        ) =>
          Boolean(
            tratamento.id &&
              tratamentoIds.has(
                tratamento.id
              )
          )
      );
    }, [
      cirurgia,
      activePersonId,
      tratamentos,
      tratamentoIds,
    ]);

  const cidsRelacionados =
    useMemo<
      Cid[]
    >(() => {
      if (
        !cirurgia ||
        !activePersonId
      ) {
        return [];
      }

      return cids.filter(
        (
          cid
        ) =>
          Boolean(
            cid.id &&
              cidIds.has(
                cid.id
              )
          )
      );
    }, [
      cirurgia,
      activePersonId,
      cids,
      cidIds,
    ]);

  // ==========================================================
  // MEDICAMENTOS VIA TRATAMENTOS
  // ==========================================================

  const medicamentosRelacionados =
    useMemo<
      Medicamento[]
    >(() => {
      if (
        !cirurgia ||
        !activePersonId ||
        tratamentoIds.size ===
          0
      ) {
        return [];
      }

      return medicamentos.filter(
        (
          medicamento
        ) =>
          belongsToPerson(
            medicamento,
            activePersonId
          ) &&
          intersects(
            medicamento.tratamento_ids,
            tratamentoIds
          )
      );
    }, [
      cirurgia,
      activePersonId,
      medicamentos,
      tratamentoIds,
    ]);

  // ==========================================================
  // EXAMES VIA TRATAMENTOS
  // ==========================================================

  const examesRelacionados =
    useMemo<
      Exame[]
    >(() => {
      if (
        !cirurgia ||
        !activePersonId ||
        tratamentoIds.size ===
          0
      ) {
        return [];
      }

      return exames.filter(
        (
          exame
        ) =>
          belongsToPerson(
            exame,
            activePersonId
          ) &&
          intersects(
            exame.tratamento_ids,
            tratamentoIds
          )
      );
    }, [
      cirurgia,
      activePersonId,
      exames,
      tratamentoIds,
    ]);

  // ==========================================================
  // DATE / STATUS
  // ==========================================================

  const diasRestantes =
    useMemo(() => {
      if (
        !cirurgia?.data
      ) {
        return null;
      }

      return getDaysUntil(
        cirurgia.data
      );
    }, [
      cirurgia?.data,
    ]);

  const dataJaPassou =
    Boolean(
      diasRestantes !==
        null &&
        diasRestantes <
          0
    );

  const corBorda =
    cirurgia
      ? getStatusColor(
          cirurgia.status
        )
      : "#F59E0B";

  const temHorario =
    Boolean(
      cirurgia?.horario?.trim()
    );

  // ==========================================================
  // SUMMARY
  // ==========================================================

  const totalRegistrosRelacionados =
    tratamentosRelacionados.length +
    cidsRelacionados.length +
    medicamentosRelacionados.length +
    examesRelacionados.length;

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    !mounted ||
    isLoading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (
    !activePersonId ||
    !cirurgia
  ) {
    return null;
  }

  // ==========================================================
  // ACTIONS
  // ==========================================================

  const handleStatusChange =
    async (
      novoStatus:
        | "agendada"
        | "realizada"
        | "cancelada"
    ) => {
      if (
        !id ||
        isUpdatingStatus
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setIsUpdatingStatus(
        true
      );

      try {
        await updateCirurgia(
          id,
          {
            status:
              novoStatus,
          }
        );

        setCirurgia(
          (
            previous
          ) =>
            previous
              ? {
                  ...previous,

                  status:
                    novoStatus,
                }
              : previous
        );

        trigger(
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao atualizar status da cirurgia:",
          error
        );

        trigger(
          "error"
        );
      } finally {
        setIsUpdatingStatus(
          false
        );
      }
    };

  const handleDelete =
    async () => {
      if (!id) {
        return;
      }

      trigger(
        "vibrate"
      );

      try {
        await deleteCirurgia(
          id
        );

        trigger(
          "success"
        );

        router.replace(
          "/saude/cirurgias"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao excluir cirurgia:",
          error
        );

        trigger(
          "error"
        );
      }
    };

  // ==========================================================
  // MENU
  //
  // Estes parâmetros apenas pré-preenchem entidades globais.
  // Não estamos alegando que criam relação com a cirurgia.
  // ==========================================================

  const menuOptions = [
    {
      id:
        "nova-consulta",

      label:
        "Nova Consulta",

      icon:
        Stethoscope,

      path:
        `/saude/consultas/nova?medico_id=${
          cirurgia.medico_id ||
          ""
        }&hospital_id=${
          cirurgia.hospital_id ||
          ""
        }`,
    },

    {
      id:
        "novo-exame",

      label:
        "Novo Exame",

      icon:
        FlaskConical,

      path:
        `/saude/exames/novo?medico_id=${
          cirurgia.medico_id ||
          ""
        }&hospital_id=${
          cirurgia.hospital_id ||
          ""
        }`,
    },

    {
      id:
        "novo-medicamento",

      label:
        "Novo Medicamento",

      icon:
        Pill,

      path:
        `/saude/medicamentos/novo?medico_id=${
          cirurgia.medico_id ||
          ""
        }`,
    },
  ];

  const handleMenuOptionClick =
    (
      path: string
    ) => {
      trigger(
        "vibrate"
      );

      setIsMenuFlutuanteOpen(
        false
      );

      router.push(
        path
      );
    };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
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
                  size={
                    18
                  }
                  className="text-ink-primary"
                />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-coral">
                  Prontuário
                </p>

                <h1 className="truncate font-display text-lg font-semibold text-ink-primary">
                  Detalhes da Cirurgia
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* ==============================================
                  ADD MENU
                  ============================================== */}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    setIsMenuFlutuanteOpen(
                      (
                        previous
                      ) =>
                        !previous
                    );
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
                  aria-label="Adicionar registro"
                >
                  <Plus
                    size={
                      18
                    }
                  />
                </button>

                <AnimatePresence>
                  {isMenuFlutuanteOpen && (
                    <>
                      <motion.div
                        initial={{
                          opacity:
                            0,
                        }}
                        animate={{
                          opacity:
                            1,
                        }}
                        exit={{
                          opacity:
                            0,
                        }}
                        transition={{
                          duration:
                            0.16,
                        }}
                        onClick={() =>
                          setIsMenuFlutuanteOpen(
                            false
                          )
                        }
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                      />

                      <motion.div
                        initial={{
                          opacity:
                            0,

                          y:
                            10,

                          scale:
                            0.95,
                        }}
                        animate={{
                          opacity:
                            1,

                          y:
                            0,

                          scale:
                            1,
                        }}
                        exit={{
                          opacity:
                            0,

                          y:
                            10,

                          scale:
                            0.95,
                        }}
                        transition={{
                          duration:
                            0.18,

                          ease: [
                            0.16,
                            1,
                            0.3,
                            1,
                          ],
                        }}
                        className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface shadow-2xl"
                      >
                        <div className="px-3 pb-2 pt-3.5">
                          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                            Adicionar
                          </p>
                        </div>

                        <div className="px-1.5 pb-2">
                          {menuOptions.map(
                            (
                              option
                            ) => {
                              const Icon =
                                option.icon;

                              return (
                                <button
                                  key={
                                    option.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    handleMenuOptionClick(
                                      option.path
                                    )
                                  }
                                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                    <Icon
                                      size={
                                        15
                                      }
                                    />
                                  </div>

                                  <span className="text-sm font-medium text-ink-primary">
                                    {
                                      option.label
                                    }
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    `/saude/cirurgias/editar?id=${cirurgia.id}`
                  );
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95 hover:bg-coral/20"
                aria-label="Editar cirurgia"
              >
                <Edit3
                  size={
                    16
                  }
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
                aria-label="Excluir cirurgia"
              >
                <Trash2
                  size={
                    16
                  }
                />
              </button>
            </div>
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
            className="relative space-y-4 overflow-hidden rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm"
            style={{
              borderLeft:
                `6px solid ${corBorda}`,
            }}
          >
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-coral/5" />

            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-coral/20 bg-coral/10 text-coral">
                  <Activity
                    size={
                      24
                    }
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Calendar
                      size={
                        14
                      }
                      className="text-coral"
                    />

                    <span className="font-mono text-sm font-bold text-coral">
                      {
                        formatDateDisplay(
                          cirurgia.data
                        )
                      }
                    </span>

                    {temHorario && (
                      <span className="font-mono text-sm text-ink-muted">
                        •{" "}
                        {
                          cirurgia.horario
                        }
                      </span>
                    )}

                    {dataJaPassou &&
                      cirurgia.status ===
                        "agendada" && (
                        <span className="rounded-full border border-coral/20 bg-coral/20 px-2 py-0.5 text-[9px] font-bold uppercase text-coral">
                          Data passada
                        </span>
                      )}

                    {diasRestantes !==
                      null &&
                      diasRestantes >=
                        0 &&
                      cirurgia.status ===
                        "agendada" && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                            diasRestantes <=
                            2
                              ? "border-amber-400/30 bg-amber-400/20 text-amber-400"
                              : "border-ice/20 bg-ice/10 text-ice"
                          }`}
                        >
                          {
                            getDiasRestantesLabel(
                              diasRestantes
                            )
                          }
                        </span>
                      )}
                  </div>

                  <h2 className="mt-1 font-display text-xl font-bold text-ink-primary">
                    {
                      cirurgia.procedimento
                    }
                  </h2>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  cirurgia.status ===
                  "agendada"
                    ? "border-amber-400/20 bg-amber-400/10 text-amber-400"
                    : cirurgia.status ===
                        "realizada"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                      : "border-coral/20 bg-coral/10 text-coral"
                }`}
              >
                {
                  getStatusLabel(
                    cirurgia.status
                  )
                }
              </span>
            </div>

            {/* ================================================
                SUMMARY
                ================================================ */}

            <div className="relative z-10 grid grid-cols-3 gap-2 border-t border-surface-border/40 pt-4">
              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/60 p-3">
                <p className="font-mono text-lg font-semibold text-ink-primary">
                  {
                    tratamentosRelacionados.length
                  }
                </p>

                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
                  Tratamentos
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/60 p-3">
                <p className="font-mono text-lg font-semibold text-ink-primary">
                  {
                    cidsRelacionados.length
                  }
                </p>

                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
                  CIDs
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/60 p-3">
                <p className="font-mono text-lg font-semibold text-ink-primary">
                  {
                    totalRegistrosRelacionados
                  }
                </p>

                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
                  Relações
                </p>
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              DADOS DO PROCEDIMENTO
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.02,
            }}
            className="space-y-4"
          >
            <SectionTitle
              icon={
                <Activity
                  size={
                    15
                  }
                />
              }
              title="Dados do Procedimento"
            />

            <div className="space-y-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              <DetailInfoRow
                icon={
                  <UserCheck
                    size={
                      18
                    }
                  />
                }
                iconClassName="bg-coral/10 text-coral"
                label="Cirurgião Responsável"
              >
                {medico?.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      router.push(
                        `/saude/medicos/detalhes?id=${medico.id}`
                      );
                    }}
                    className="truncate text-left text-sm font-medium text-ink-primary transition-colors hover:text-coral"
                  >
                    Dr(a).{" "}
                    {
                      medico.nome
                    }
                  </button>
                ) : (
                  <p className="truncate text-sm font-medium text-ink-muted">
                    Não vinculado
                  </p>
                )}
              </DetailInfoRow>

              <DetailInfoRow
                icon={
                  <Building2
                    size={
                      18
                    }
                  />
                }
                iconClassName="bg-violet-400/10 text-violet-400"
                label="Hospital"
              >
                <p className="truncate text-sm font-medium text-ink-primary">
                  {hospital?.nome ||
                    "Não informado"}
                </p>
              </DetailInfoRow>

              <DetailInfoRow
                icon={
                  <MapPin
                    size={
                      18
                    }
                  />
                }
                iconClassName="bg-emerald-400/10 text-emerald-400"
                label="Clínica / Local"
              >
                <p className="truncate text-sm font-medium text-ink-primary">
                  {local?.nome ||
                    "Não informado"}
                </p>
              </DetailInfoRow>
            </div>

            {cirurgia.observacoes && (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <p className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-muted">
                  <FileText
                    size={
                      13
                    }
                    className="text-coral"
                  />

                  Orientações, Preparo e Pós-Operatório
                </p>

                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-primary">
                  {
                    cirurgia.observacoes
                  }
                </p>
              </div>
            )}
          </motion.div>

          {/* ==================================================
              TRATAMENTOS
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
                <Activity
                  size={
                    15
                  }
                />
              }
              title={`Tratamentos Relacionados (${tratamentosRelacionados.length})`}
            />

            <section className="space-y-2 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              {tratamentosRelacionados.length ===
              0 ? (
                <p className="py-2 text-xs leading-5 text-ink-muted">
                  Nenhum tratamento foi vinculado diretamente a esta cirurgia.
                </p>
              ) : (
                tratamentosRelacionados.map(
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
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-colors hover:border-violet-400/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-primary">
                          {
                            tratamento.nome
                          }
                        </p>

                        <p className="mt-0.5 text-[11px] capitalize text-ink-muted">
                          Status:{" "}
                          {
                            tratamento.status ||
                              "não informado"
                          }
                        </p>
                      </div>

                      <span className="shrink-0 font-mono text-xs text-violet-300">
                        Ver
                      </span>
                    </button>
                  )
                )
              )}
            </section>
          </motion.div>

          {/* ==================================================
              CIDS
              ================================================== */}

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
                <Stethoscope
                  size={
                    15
                  }
                />
              }
              title={`CIDs Relacionados (${cidsRelacionados.length})`}
            />

            <section className="space-y-2 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              {cidsRelacionados.length ===
              0 ? (
                <p className="py-2 text-xs leading-5 text-ink-muted">
                  Nenhum CID foi vinculado diretamente a esta cirurgia.
                </p>
              ) : (
                cidsRelacionados.map(
                  (
                    cid
                  ) => {
                    const theme =
                      getClinicalTheme(
                        cid.descricao ||
                          cid.codigo
                      );

                    const Icon =
                      theme.icon;

                    return (
                      <button
                        key={
                          cid.id
                        }
                        type="button"
                        onClick={() => {
                          if (
                            !cid.id
                          ) {
                            return;
                          }

                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/cids/detalhes?id=${cid.id}`
                          );
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-colors hover:border-emerald-400/30"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${theme.tagClass}`}
                          >
                            <Icon
                              size={
                                16
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-semibold text-emerald-300">
                              {
                                cid.codigo
                              }
                            </p>

                            <p className="mt-0.5 truncate text-sm text-ink-primary">
                              {
                                cid.descricao
                              }
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 font-mono text-xs text-emerald-300">
                          Ver
                        </span>
                      </button>
                    );
                  }
                )
              )}
            </section>
          </motion.div>

          {/* ==================================================
              MEDICAMENTOS
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
                <Pill
                  size={
                    15
                  }
                />
              }
              title={`Medicamentos via Tratamentos (${medicamentosRelacionados.length})`}
            />

            <section className="space-y-2 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              {tratamentoIds.size ===
              0 ? (
                <p className="py-2 text-xs leading-5 text-ink-muted">
                  Vincule tratamentos à cirurgia para cruzar medicamentos relacionados com segurança.
                </p>
              ) : medicamentosRelacionados.length ===
                0 ? (
                <p className="py-2 text-xs leading-5 text-ink-muted">
                  Nenhum medicamento da pessoa ativa utiliza os tratamentos vinculados a esta cirurgia.
                </p>
              ) : (
                medicamentosRelacionados.map(
                  (
                    medicamento
                  ) => (
                    <button
                      key={
                        medicamento.id
                      }
                      type="button"
                      onClick={() => {
                        if (
                          !medicamento.id
                        ) {
                          return;
                        }

                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/medicamentos/detalhes?id=${medicamento.id}`
                        );
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-colors hover:border-coral/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-primary">
                          {
                            medicamento.nome
                          }

                          {medicamento.dosagem && (
                            <span className="text-coral">
                              {" "}
                              ·{" "}
                              {
                                medicamento.dosagem
                              }
                            </span>
                          )}
                        </p>

                        {medicamento.data_receita && (
                          <p className="mt-0.5 text-[11px] text-ink-muted">
                            Receita:{" "}
                            {
                              formatDateDisplay(
                                medicamento.data_receita
                              )
                            }
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 font-mono text-xs text-coral">
                        Ver
                      </span>
                    </button>
                  )
                )
              )}
            </section>
          </motion.div>

          {/* ==================================================
              EXAMES
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.1,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <FlaskConical
                  size={
                    15
                  }
                />
              }
              title={`Exames via Tratamentos (${examesRelacionados.length})`}
            />

            <section className="space-y-2 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              {tratamentoIds.size ===
              0 ? (
                <p className="py-2 text-xs leading-5 text-ink-muted">
                  Vincule tratamentos à cirurgia para cruzar exames relacionados com segurança.
                </p>
              ) : examesRelacionados.length ===
                0 ? (
                <p className="py-2 text-xs leading-5 text-ink-muted">
                  Nenhum exame da pessoa ativa utiliza os tratamentos vinculados a esta cirurgia.
                </p>
              ) : (
                examesRelacionados.map(
                  (
                    exame
                  ) => (
                    <button
                      key={
                        exame.id
                      }
                      type="button"
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
                          `/saude/exames/detalhes?id=${exame.id}`
                        );
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-colors hover:border-ice/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-primary">
                          {
                            exame.nome
                          }
                        </p>

                        {exame.data && (
                          <p className="mt-0.5 text-[11px] text-ink-muted">
                            Data:{" "}
                            {
                              formatDateDisplay(
                                exame.data
                              )
                            }
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 font-mono text-xs text-ice">
                        Ver
                      </span>
                    </button>
                  )
                )
              )}
            </section>
          </motion.div>

          {/* ==================================================
              STATUS
              ================================================== */}

          {cirurgia.status ===
            "agendada" && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.12,
              }}
              className="space-y-3 pt-2"
            >
              <SectionTitle
                icon={
                  <CheckCircle2
                    size={
                      15
                    }
                  />
                }
                title="Atualizar Procedimento"
              />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={
                    isUpdatingStatus
                  }
                  onClick={() =>
                    handleStatusChange(
                      "realizada"
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3.5 text-sm font-medium text-emerald-300 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <CheckCircle2
                    size={
                      18
                    }
                  />

                  Marcar como Realizada
                </button>

                <button
                  type="button"
                  disabled={
                    isUpdatingStatus
                  }
                  onClick={() =>
                    handleStatusChange(
                      "cancelada"
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3.5 text-sm font-medium text-coral transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Trash2
                    size={
                      17
                    }
                  />

                  Marcar como Cancelada
                </button>
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
          title="Excluir Cirurgia"
          message="Tem certeza que deseja excluir este procedimento cirúrgico? Os tratamentos, CIDs, medicamentos e exames relacionados não serão excluídos."
        />
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function DetalhesCirurgiaPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <DetalhesCirurgiaContent />
    </Suspense>
  );
}