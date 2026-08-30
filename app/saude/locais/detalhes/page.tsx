// app/saude/locais/detalhes/page.tsx
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
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
  ExternalLink,
  FileText,
  FileWarning,
  FlaskConical,
  FolderHeart,
  MapPin,
  Navigation,
  Phone,
  Pill,
  PlusCircle,
  Stethoscope,
  Trash2,
  User,
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
  useMedicos,
} from "@/hooks/useMedicos";
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
  useTratamentos,
} from "@/hooks/useTratamentos";
import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";
import {
  useCids,
} from "@/hooks/useCids";
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
  Cid,
  Cirurgia,
  Consulta,
  Exame,
  LocalSaude,
  Medico,
  Renovacao,
  Tratamento,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

interface LocalTypeStyle {
  label: string;
  shortLabel: string;
  color: string;
  icon: LucideIcon;
}

type ActivityType =
  | "consulta"
  | "exame"
  | "cirurgia"
  | "renovacao";

interface LastActivity {
  type: ActivityType;
  data: string;
}

// ============================================================
// CONFIG
// ============================================================

const LOCAL_TYPE_STYLE: Record<
  string,
  LocalTypeStyle
> = {
  posto_saude: {
    label:
      "Posto de Saúde / UBS",
    shortLabel:
      "Posto / UBS",
    color:
      "#34D399",
    icon:
      PlusCircle,
  },

  laboratorio: {
    label:
      "Laboratório",
    shortLabel:
      "Laboratório",
    color:
      "#A78BFA",
    icon:
      FlaskConical,
  },

  clinica: {
    label:
      "Clínica",
    shortLabel:
      "Clínica",
    color:
      "#38BDF8",
    icon:
      Building2,
  },

  outro: {
    label:
      "Outro Local de Saúde",
    shortLabel:
      "Outro",
    color:
      "#F59E0B",
    icon:
      MapPin,
  },
};

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

function getTodayIso(): string {
  const date =
    new Date();

  return [
    date.getFullYear(),
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    ),
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
}

// ============================================================
// CONTENT
// ============================================================

function DetalhesLocalContent() {
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
    getLocal,
    deleteLocalSafe,
  } =
    useLocais();

  const {
    medicos = [],
  } =
    useMedicos();

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

  const {
    tratamentos = [],
  } =
    useTratamentos();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    cids = [],
  } =
    useCids();

  const deleteAction =
    useSubmitAction();

  const mounted =
    useMounted();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    local,
    setLocal,
  ] =
    useState<LocalSaude | null>(
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
    showAllRenovacoes,
    setShowAllRenovacoes,
  ] =
    useState(false);

  // ==========================================================
  // LOAD GLOBAL LOCAL
  // ==========================================================

  useEffect(() => {
    if (!id) {
      router.replace(
        "/saude/locais"
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
          const result =
            await getLocal(
              id
            );

          if (
            cancelled
          ) {
            return;
          }

          if (
            !result
          ) {
            router.replace(
              "/saude/locais"
            );

            return;
          }

          setLocal(
            result
          );
        } catch (error) {
          console.error(
            "Erro ao carregar local:",
            error
          );

          if (
            !cancelled
          ) {
            router.replace(
              "/saude/locais"
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
    getLocal,
    id,
    router,
  ]);

  // ==========================================================
  // STYLE
  // ==========================================================

  const localStyle =
    useMemo(() => {
      if (!local) {
        return LOCAL_TYPE_STYLE.outro;
      }

      return (
        LOCAL_TYPE_STYLE[
          local.tipo ||
            "outro"
        ] ||
        {
          ...LOCAL_TYPE_STYLE.outro,
          label:
            local.tipo ||
            "Outro Local de Saúde",
          shortLabel:
            local.tipo ||
            "Outro",
        }
      );
    }, [
      local,
    ]);

  const LocalIcon =
    localStyle.icon;

  // ==========================================================
  // INDEXES
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

  const medicamentosById =
    useMemo(() => {
      const map =
        new Map<
          string,
          (typeof medicamentos)[number]
        >();

      medicamentos.forEach(
        (
          medicamento
        ) => {
          if (
            medicamento.id
          ) {
            map.set(
              medicamento.id,
              medicamento
            );
          }
        }
      );

      return map;
    }, [
      medicamentos,
    ]);

  // ==========================================================
  // GLOBAL DIRECT MEDICOS
  // ==========================================================

  const medicosDiretos =
    useMemo(() => {
      const ids =
        new Set(
          local?.medico_ids ||
            []
        );

      return medicos.filter(
        (
          medico
        ) =>
          Boolean(
            medico.id &&
              ids.has(
                medico.id
              )
          )
      );
    }, [
      local?.medico_ids,
      medicos,
    ]);

  // ==========================================================
  // PERSON-SCOPED RELATIONS
  // ==========================================================

  const consultasLocal =
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
            consulta.local_id ===
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

  const examesLocal =
    useMemo(() => {
      if (!id) {
        return [];
      }

      return exames
        .filter(
          (
            exame:
              Exame
          ) =>
            exame.local_id ===
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
      exames,
      id,
    ]);

  const cirurgiasLocal =
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
            cirurgia.local_id ===
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

  const renovacoesLocal =
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
            renovacao.local_id ===
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

  const cidsLocal =
    useMemo(() => {
      if (!id) {
        return [];
      }

      return cids
        .filter(
          (
            cid:
              Cid
          ) =>
            cid.local_id ===
            id
        )
        .sort(
          (
            first,
            second
          ) =>
            (
              second.data_diagnostico ||
              ""
            ).localeCompare(
              first.data_diagnostico ||
                ""
            )
        );
    }, [
      cids,
      id,
    ]);

  const medicamentosLocal =
    useMemo(() => {
      if (!id) {
        return [];
      }

      return medicamentos.filter(
        (
          medicamento
        ) =>
          medicamento.local_id ===
          id
      );
    }, [
      medicamentos,
      id,
    ]);

  // ==========================================================
  // TRATAMENTOS
  // ==========================================================

  const tratamentoIdsDerivados =
    useMemo(() => {
      const ids =
        new Set<string>();

      consultasLocal.forEach(
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

      examesLocal.forEach(
        (
          exame
        ) => {
          (
            exame.tratamento_ids ||
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

      cirurgiasLocal.forEach(
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

      return ids;
    }, [
      consultasLocal,
      examesLocal,
      cirurgiasLocal,
    ]);

  const tratamentosLocal =
    useMemo(() => {
      if (!id) {
        return [];
      }

      return tratamentos.filter(
        (
          tratamento:
            Tratamento
        ) => {
          if (
            activePersonId &&
            tratamento.person_id &&
            tratamento.person_id !==
              activePersonId
          ) {
            return false;
          }

          const direct =
            (
              tratamento.local_ids ||
              []
            ).includes(
              id
            );

          const derived =
            Boolean(
              tratamento.id &&
                tratamentoIdsDerivados.has(
                  tratamento.id
                )
            );

          return (
            direct ||
            derived
          );
        }
      );
    }, [
      activePersonId,
      id,
      tratamentos,
      tratamentoIdsDerivados,
    ]);

  // ==========================================================
  // HISTORICAL MEDICOS
  // ==========================================================

  const medicosHistorico =
    useMemo(() => {
      const ids =
        new Set<string>();

      consultasLocal.forEach(
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

      examesLocal.forEach(
        (
          exame
        ) => {
          if (
            exame.medico_id
          ) {
            ids.add(
              exame.medico_id
            );
          }
        }
      );

      cirurgiasLocal.forEach(
        (
          cirurgia
        ) => {
          if (
            cirurgia.medico_id
          ) {
            ids.add(
              cirurgia.medico_id
            );
          }
        }
      );

      cidsLocal.forEach(
        (
          cid
        ) => {
          if (
            cid.medico_id
          ) {
            ids.add(
              cid.medico_id
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
      consultasLocal,
      examesLocal,
      cirurgiasLocal,
      cidsLocal,
      medicosById,
    ]);

  // ==========================================================
  // UPCOMING CONSULTATIONS
  // ==========================================================

  const hoje =
    useMemo(
      () =>
        getTodayIso(),
      []
    );

  const proximasConsultas =
    useMemo(() => {
      return consultasLocal
        .filter(
          (
            consulta
          ) =>
            Boolean(
              consulta.data &&
                consulta.data >=
                  hoje &&
                consulta.status !==
                  "cancelada"
            )
        )
        .sort(
          (
            first,
            second
          ) =>
            (
              first.data ||
              ""
            ).localeCompare(
              second.data ||
                ""
            )
        );
    }, [
      consultasLocal,
      hoje,
    ]);

  // ==========================================================
  // TOTAL COST
  // ==========================================================

  const totalRegistrado =
    useMemo(() => {
      return renovacoesLocal.reduce(
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
      renovacoesLocal,
    ]);

  // ==========================================================
  // LAST ACTIVITY
  // ==========================================================

  const ultimaAtividade =
    useMemo<LastActivity | null>(
      () => {
        const activities:
          LastActivity[] =
          [];

        consultasLocal.forEach(
          (
            consulta
          ) => {
            if (
              consulta.data
            ) {
              activities.push({
                type:
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
              activities.push({
                type:
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
              activities.push({
                type:
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
              activities.push({
                type:
                  "renovacao",

                data:
                  renovacao.data,
              });
            }
          }
        );

        activities.sort(
          (
            first,
            second
          ) =>
            second.data.localeCompare(
              first.data
            )
        );

        return (
          activities[0] ||
          null
        );
      },
      [
        consultasLocal,
        examesLocal,
        cirurgiasLocal,
        renovacoesLocal,
      ]
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    () => {
      if (
        !local?.id
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      deleteAction.run(
        async () => {
          await deleteLocalSafe(
            local.id!
          );

          router.replace(
            "/saude/locais"
          );
        },
        {
          successMessage:
            "Local excluído com sucesso",

          errorMessage:
            "Erro ao excluir local",

          goBackOnSuccess:
            false,
        }
      );
    };

  // ==========================================================
  // STATES
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
    !local
  ) {
    return null;
  }

  const renovacoesVisiveis =
    showAllRenovacoes
      ? renovacoesLocal
      : renovacoesLocal.slice(
          0,
          5
        );

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
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
                Local global
              </p>

              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">
                Detalhes do Local
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
                  `/saude/locais/editar?id=${local.id}`
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all hover:border-ice/30 hover:text-ice active:scale-95"
              aria-label="Editar local"
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
              aria-label="Excluir local"
            >
              <Trash2
                size={16}
              />
            </button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="space-y-5 rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm"
            style={{
              borderLeft:
                `6px solid ${localStyle.color}`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor:
                      `${localStyle.color}15`,

                    borderColor:
                      `${localStyle.color}35`,

                    color:
                      localStyle.color,
                  }}
                >
                  <LocalIcon
                    size={28}
                  />
                </div>

                <div className="min-w-0 pt-0.5">
                  <div className="mb-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide"
                      style={{
                        backgroundColor:
                          `${localStyle.color}15`,

                        borderColor:
                          `${localStyle.color}35`,

                        color:
                          localStyle.color,
                      }}
                    >
                      <LocalIcon
                        size={10}
                      />

                      {
                        localStyle.label
                      }
                    </span>
                  </div>

                  <h2 className="truncate font-display text-2xl font-bold text-ink-primary">
                    {
                      local.nome
                    }
                  </h2>

                  {local.endereco && (
                    <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-ink-muted">
                      <MapPin
                        size={13}
                        className="mt-0.5 shrink-0 text-ink-faint"
                      />

                      {
                        local.endereco
                      }
                    </p>
                  )}

                  {local.telefone && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                      <Phone
                        size={13}
                        className="shrink-0 text-ink-faint"
                      />

                      {
                        local.telefone
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {local.telefone && (
                  <a
                    href={`tel:${local.telefone}`}
                    onClick={() =>
                      trigger(
                        "vibrate"
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all hover:text-ice active:scale-95"
                    aria-label="Ligar para o local"
                  >
                    <Phone
                      size={16}
                    />
                  </a>
                )}

                {local.endereco && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      local.endereco
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trigger(
                        "vibrate"
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/25 bg-ice/10 text-ice transition-all active:scale-95"
                    aria-label="Abrir endereço no mapa"
                  >
                    <Navigation
                      size={16}
                    />
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/50 px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <User
                  size={15}
                  className="mt-0.5 shrink-0 text-ice"
                />

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Contexto clínico
                  </p>

                  {activePersonId ? (
                    <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                      CIDs, medicamentos, consultas, exames, cirurgias, tratamentos e retiradas abaixo pertencem à pessoa ativa.
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                      Selecione uma pessoa para visualizar o histórico clínico deste local.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-surface-border/40 pt-4">
              <StatCard
                icon={
                  <Calendar
                    size={14}
                  />
                }
                label="Consultas"
                value={String(
                  consultasLocal.length
                )}
              />

              <StatCard
                icon={
                  <FlaskConical
                    size={14}
                  />
                }
                label="Exames"
                value={String(
                  examesLocal.length
                )}
              />

              <StatCard
                icon={
                  <FileWarning
                    size={14}
                  />
                }
                label="CIDs"
                value={String(
                  cidsLocal.length
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
                  tratamentosLocal.length
                )}
              />

              <StatCard
                icon={
                  <Pill
                    size={14}
                  />
                }
                label="Medicamentos"
                value={String(
                  medicamentosLocal.length
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
                  cirurgiasLocal.length
                )}
              />
            </div>

            {ultimaAtividade && (
              <div className="border-t border-surface-border/40 pt-3">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Clock
                    size={14}
                    style={{
                      color:
                        localStyle.color,
                    }}
                  />

                  Última atividade:{" "}
                  <span className="font-medium text-ink-primary">
                    {formatDateDisplay(
                      ultimaAtividade.data
                    )}
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {local.observacoes && (
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
              className="rounded-[24px] border border-surface-border/50 bg-surface p-5 shadow-sm"
            >
              <SectionTitle
                icon={
                  <FileText
                    size={15}
                  />
                }
                title="Observações"
              />

              <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-ink-muted">
                {
                  local.observacoes
                }
              </p>
            </motion.div>
          )}

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
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <Stethoscope
                  size={15}
                />
              }
              title={`Profissionais vinculados (${medicosDiretos.length})`}
            />

            {medicosDiretos.length ===
            0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum médico está cadastrado diretamente nesta unidade.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicosDiretos.map(
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
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left transition-all hover:border-ice/30 active:scale-[0.98]"
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

          {medicosHistorico.length >
            0 && (
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
                  <User
                    size={15}
                  />
                }
                title="Médicos no histórico da pessoa ativa"
              />

              <div className="flex flex-wrap gap-2">
                {medicosHistorico.map(
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

          {cidsLocal.length >
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
                  <FileWarning
                    size={15}
                  />
                }
                title={`Diagnósticos / CIDs (${cidsLocal.length})`}
              />

              <div className="space-y-2">
                {cidsLocal.map(
                  (
                    cid
                  ) => (
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
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left transition-all hover:border-coral/25 active:scale-[0.98]"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-coral">
                          CID{" "}
                          {
                            cid.codigo
                          }
                        </p>

                        <p className="mt-1 truncate text-sm font-semibold text-ink-primary">
                          {
                            cid.descricao
                          }
                        </p>

                        {cid.data_diagnostico && (
                          <p className="mt-1 text-[10px] text-ink-muted">
                            Diagnóstico em{" "}
                            {formatDateDisplay(
                              cid.data_diagnostico
                            )}
                          </p>
                        )}
                      </div>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}

          {tratamentosLocal.length >
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
                title={`Tratamentos relacionados (${tratamentosLocal.length})`}
              />

              <div className="space-y-2">
                {tratamentosLocal.map(
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
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor:
                              `${tratamento.cor || "#8B5CF6"}18`,

                            color:
                              tratamento.cor ||
                              "#8B5CF6",
                          }}
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
                            {(
                              tratamento.local_ids ||
                              []
                            ).includes(
                              local.id!
                            )
                              ? "Vinculado diretamente a esta unidade"
                              : "Relacionado pelo histórico clínico"}
                          </p>
                        </div>
                      </div>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}

          {medicamentosLocal.length >
            0 && (
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
                  <Pill
                    size={15}
                  />
                }
                title={`Medicamentos vinculados (${medicamentosLocal.length})`}
              />

              <div className="space-y-2">
                {medicamentosLocal.map(
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
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left transition-all hover:border-ice/30 active:scale-[0.98]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                          <Pill
                            size={16}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {
                              medicamento.nome
                            }
                          </p>

                          {medicamento.dosagem && (
                            <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                              {
                                medicamento.dosagem
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}

          {proximasConsultas.length >
            0 && (
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
                  <Calendar
                    size={15}
                  />
                }
                title={`Próximas consultas (${proximasConsultas.length})`}
              />

              <div className="space-y-2">
                {proximasConsultas.map(
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
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-ice/20 bg-ice/5 p-3.5 text-left transition-all active:scale-[0.98]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {consulta.especialidade ||
                              "Consulta"}
                          </p>

                          <p className="mt-0.5 text-[11px] text-ink-muted">
                            {formatDateDisplay(
                              consulta.data
                            )}

                            {consulta.horario
                              ? ` às ${consulta.horario}`
                              : ""}
                          </p>

                          {medico && (
                            <p className="mt-0.5 truncate text-[10px] text-ink-faint">
                              Dr(a).{" "}
                              {
                                medico.nome
                              }
                            </p>
                          )}
                        </div>

                        <ChevronRight
                          size={16}
                          className="shrink-0 text-ice"
                        />
                      </button>
                    );
                  }
                )}
              </div>
            </motion.div>
          )}

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
                <FlaskConical
                  size={15}
                />
              }
              title={`Exames (${examesLocal.length})`}
            />

            {examesLocal.length ===
            0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum exame da pessoa ativa está vinculado a este local.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {examesLocal
                  .slice(
                    0,
                    8
                  )
                  .map(
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
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left transition-all hover:border-ice/30 active:scale-[0.98]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {
                              exame.nome
                            }
                          </p>

                          <p className="mt-0.5 text-[11px] text-ink-muted">
                            {formatDateDisplay(
                              exame.data
                            )}

                            {exame.horario
                              ? ` às ${exame.horario}`
                              : ""}
                          </p>
                        </div>

                        <ChevronRight
                          size={16}
                          className="shrink-0 text-ink-faint"
                        />
                      </button>
                    )
                  )}
              </div>
            )}
          </motion.div>

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
                <Calendar
                  size={15}
                />
              }
              title={`Consultas (${consultasLocal.length})`}
            />

            {consultasLocal.length ===
            0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhuma consulta da pessoa ativa está vinculada a este local.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {consultasLocal
                  .slice(
                    0,
                    8
                  )
                  .map(
                    (
                      consulta
                    ) => (
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
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left transition-all hover:border-ice/30 active:scale-[0.98]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {consulta.especialidade ||
                              "Consulta"}
                          </p>

                          <p className="mt-0.5 text-[11px] text-ink-muted">
                            {formatDateDisplay(
                              consulta.data
                            )}
                          </p>
                        </div>

                        <ChevronRight
                          size={16}
                          className="shrink-0 text-ink-faint"
                        />
                      </button>
                    )
                  )}
              </div>
            )}
          </motion.div>

          {cirurgiasLocal.length >
            0 && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.11,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <Activity
                    size={15}
                  />
                }
                title={`Cirurgias (${cirurgiasLocal.length})`}
              />

              <div className="space-y-2">
                {cirurgiasLocal.map(
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
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left transition-all hover:border-coral/30 active:scale-[0.98]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-primary">
                          {
                            cirurgia.procedimento
                          }
                        </p>

                        <p className="mt-0.5 text-[11px] text-ink-muted">
                          {formatDateDisplay(
                            cirurgia.data
                          )}
                        </p>
                      </div>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}

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
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <FileWarning
                  size={15}
                />
              }
              title={`Retiradas / renovações (${renovacoesLocal.length})`}
            />

            {renovacoesLocal.length ===
            0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhuma retirada ou renovação da pessoa ativa está vinculada a este local.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {renovacoesVisiveis.map(
                  (
                    renovacao
                  ) => {
                    const medicamento =
                      medicamentosById.get(
                        renovacao.medicamento_id
                      );

                    return (
                      <div
                        key={
                          renovacao.id
                        }
                        className="rounded-2xl border border-surface-border/50 bg-surface p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-primary">
                              {medicamento?.nome ||
                                "Medicamento"}
                            </p>

                            <p className="mt-0.5 text-[11px] text-ink-muted">
                              {formatDateDisplay(
                                renovacao.data
                              )}
                            </p>

                            {renovacao.tipo_aquisicao && (
                              <p className="mt-1 text-[10px] font-medium uppercase text-ink-faint">
                                {renovacao.tipo_aquisicao ===
                                "sus"
                                  ? "Aquisição SUS"
                                  : renovacao.tipo_aquisicao ===
                                      "gratuito"
                                    ? "Aquisição gratuita"
                                    : "Compra registrada"}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            {typeof renovacao.preco ===
                              "number" &&
                            renovacao.preco >
                              0 ? (
                              <span className="text-xs font-semibold text-ink-primary">
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

                        {renovacao.data_proxima_retirada && (
                          <p className="mt-2 border-t border-surface-border/40 pt-2 text-[10px] text-ink-muted">
                            Próxima retirada prevista:{" "}
                            <span className="font-medium text-ink-primary">
                              {formatDateDisplay(
                                renovacao.data_proxima_retirada
                              )}
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  }
                )}

                {renovacoesLocal.length >
                  5 && (
                  <button
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setShowAllRenovacoes(
                        (
                          value
                        ) =>
                          !value
                      );
                    }}
                    className="w-full py-2 text-center text-xs font-semibold text-ice"
                  >
                    {showAllRenovacoes
                      ? "Ver menos"
                      : `Ver todas (${renovacoesLocal.length})`}
                  </button>
                )}

                {totalRegistrado >
                  0 && (
                  <div className="flex items-center justify-between border-t border-surface-border/40 px-1 pt-3">
                    <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <DollarSign
                        size={13}
                      />

                      Total de preços registrados
                    </span>

                    <span className="text-sm font-bold text-ink-primary">
                      {formatCurrency(
                        totalRegistrado
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </section>

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
          title="Excluir local"
          message={`Tem certeza que deseja excluir "${local.nome}"? Este Local é global. Ele será removido dos vínculos de CIDs, tratamentos, consultas, exames, cirurgias, medicamentos e retiradas de todas as pessoas, mas esses registros clínicos serão preservados.`}
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

export default function DetalhesLocalPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <DetalhesLocalContent />
    </Suspense>
  );
}