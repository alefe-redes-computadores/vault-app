// app/saude/medicos/detalhes/page.tsx
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
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  Edit3,
  FileText,
  FileWarning,
  FlaskConical,
  FolderHeart,
  Mail,
  MapPin,
  Phone,
  Pill,
  Plus,
  Stethoscope,
  Syringe,
  Trash2,
} from "lucide-react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  db,
} from "@/lib/db";
import {
  useHapticFeedback,
} from "@/lib/haptics";
import {
  analisarComportamentoUso,
  sugerirRenovacao,
} from "@/lib/health-insights";

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

import {
  useMounted,
} from "@/hooks/useMounted";
import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";
import {
  useMedicos,
} from "@/hooks/useMedicos";
import {
  useHospitais,
} from "@/hooks/useHospitais";
import {
  useLocais,
} from "@/hooks/useLocais";
import {
  useTratamentos,
} from "@/hooks/useTratamentos";
import {
  useConsultas,
} from "@/hooks/useConsultas";
import {
  useCirurgias,
} from "@/hooks/useCirurgias";
import {
  useExames,
} from "@/hooks/useExames";
import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";
import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";
import {
  useCids,
} from "@/hooks/useCids";

import type {
  Document,
  DoseLog,
  Medico,
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

  const datePart =
    isoStr.split(
      "T"
    )[0];

  const parts =
    datePart.split(
      "-"
    );

  if (
    parts.length !== 3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function isDateInFuture(
  dateStr?: string
): boolean {
  if (!dateStr) {
    return false;
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const target =
    new Date(
      `${dateStr.split("T")[0]}T00:00:00`
    );

  return (
    target.getTime() >=
    today.getTime()
  );
}

function formatCurrency(
  value: number
): string {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style:
        "currency",
      currency:
        "BRL",
    }
  ).format(
    value
  );
}

// ============================================================
// LOCAL COMPONENTS
// ============================================================

function DetailCard({
  children,
  className = "",
}: {
  children:
    React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-surface-border/50 bg-surface p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function HistoryItem({
  title,
  subtitle,
  onClick,
  icon,
  iconClassName =
    "text-ice",
}: {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  icon?:
    React.ReactNode;
  iconClassName?: string;
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface ${iconClassName}`}
          >
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-primary">
            {title}
          </p>

          {subtitle && (
            <p className="mt-0.5 truncate text-[11px] text-ink-muted">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {onClick && (
        <ChevronRight
          size={14}
          className="shrink-0 text-ink-faint"
        />
      )}
    </>
  );

  if (!onClick) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-surface-border/40 bg-surface-raised p-3">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="flex w-full items-center justify-between rounded-xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-all hover:border-ice/30 active:scale-[0.99]"
    >
      {content}
    </button>
  );
}

function EmptyHistory({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <p className="py-1 text-xs text-ink-muted">
      {children}
    </p>
  );
}

// ============================================================
// CONTENT
// ============================================================

function DetalhesMedicoContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const mounted =
    useMounted();

  const id =
    searchParams.get(
      "id"
    ) || "";

  // ==========================================================
  // MÉDICO
  // ==========================================================

  const {
    getMedico,
    deleteMedicoSafe,
  } =
    useMedicos();

  const [
    medico,
    setMedico,
  ] =
    useState<
      Medico | null
    >(null);

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
    isDeleting,
    setIsDeleting,
  ] =
    useState(false);

  const [
    isMenuFlutuanteOpen,
    setIsMenuFlutuanteOpen,
  ] =
    useState(false);

  // ==========================================================
  // GLOBAL DATA
  // ==========================================================

  const {
    hospitais = [],
  } =
    useHospitais();

  const {
    locais = [],
  } =
    useLocais();

  // ==========================================================
  // ACTIVE PERSON DATA
  //
  // Todos esses hooks trabalham no contexto da pessoa ativa.
  // ==========================================================

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
    exames = [],
  } =
    useExames();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    renovacoes = [],
  } =
    useRenovacoes();

  const {
    cids = [],
  } =
    useCids();

  // ==========================================================
  // DOCUMENTS
  //
  // useDocuments() ainda possui comportamento inseguro quando
  // não existe pessoa ativa, então esta tela faz a consulta
  // explicitamente person-scoped.
  // ==========================================================

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
  // MÉDICO LOAD
  // ==========================================================

  useEffect(
    () => {
      let cancelled =
        false;

      const load =
        async () => {
          if (!id) {
            router.replace(
              "/saude/medicos"
            );

            return;
          }

          try {
            const data =
              await getMedico(
                id
              );

            if (
              cancelled
            ) {
              return;
            }

            if (!data) {
              router.replace(
                "/saude/medicos"
              );

              return;
            }

            setMedico(
              data
            );
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
    },
    [
      id,
      router,
      getMedico,
    ]
  );

  // ==========================================================
  // GLOBAL CANONICAL RELATIONS
  //
  // Hospital.medico_ids[]
  // LocalSaude.medico_ids[]
  // ==========================================================

  const hospitaisVinculados =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return hospitais.filter(
          (
            hospital
          ) =>
            hospital.medico_ids?.includes(
              id
            )
        );
      },
      [
        hospitais,
        id,
      ]
    );

  const locaisVinculados =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return locais.filter(
          (
            local
          ) =>
            local.medico_ids?.includes(
              id
            )
        );
      },
      [
        locais,
        id,
      ]
    );

  // ==========================================================
  // ACTIVE PERSON RELATIONS
  //
  // Tratamento.medico_ids[]
  // Clinical entity.medico_id
  // ==========================================================

  const tratamentosVinculados =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return tratamentos.filter(
          (
            tratamento
          ) =>
            tratamento.medico_ids?.includes(
              id
            )
        );
      },
      [
        tratamentos,
        id,
      ]
    );

  const consultasVinculadas =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return consultas.filter(
          (
            consulta
          ) =>
            consulta.medico_id ===
            id
        );
      },
      [
        consultas,
        id,
      ]
    );

  const cirurgiasVinculadas =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return cirurgias.filter(
          (
            cirurgia
          ) =>
            cirurgia.medico_id ===
            id
        );
      },
      [
        cirurgias,
        id,
      ]
    );

  const examesVinculados =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return exames.filter(
          (
            exame
          ) =>
            exame.medico_id ===
            id
        );
      },
      [
        exames,
        id,
      ]
    );

  const medicamentosVinculados =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return medicamentos.filter(
          (
            medicamento
          ) =>
            medicamento.medico_id ===
            id
        );
      },
      [
        medicamentos,
        id,
      ]
    );

  const renovacoesVinculadas =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return renovacoes.filter(
          (
            renovacao
          ) =>
            renovacao.medico_id ===
            id
        );
      },
      [
        renovacoes,
        id,
      ]
    );

  const cidsVinculados =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return cids.filter(
          (
            cid
          ) =>
            cid.medico_id ===
            id
        );
      },
      [
        cids,
        id,
      ]
    );

  const documentosDoMedico =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return documentos
          .filter(
            (
              documento
            ) =>
              documento.medico_id ===
              id
          )
          .sort(
            (
              a,
              b
            ) =>
              (
                b.created_at ||
                ""
              ).localeCompare(
                a.created_at ||
                  ""
              )
          );
      },
      [
        documentos,
        id,
      ]
    );

  // ==========================================================
  // DOSE LOGS
  //
  // Medicamentos já são da pessoa ativa, mas mantemos o
  // person_id também no filtro dos logs por segurança.
  // ==========================================================

  const medicamentoIds =
    useMemo(
      () =>
        medicamentosVinculados
          .map(
            (
              medicamento
            ) =>
              medicamento.id
          )
          .filter(
            (
              medicamentoId
            ): medicamentoId is string =>
              Boolean(
                medicamentoId
              )
          )
          .sort(),
      [
        medicamentosVinculados,
      ]
    );

  const medicamentoIdsKey =
    useMemo(
      () =>
        medicamentoIds.join(
          ","
        ),
      [
        medicamentoIds,
      ]
    );

  const doseLogs =
    useLiveQuery(
      async () => {
        if (
          !activePersonId ||
          medicamentoIds.length ===
            0
        ) {
          return [];
        }

        const rows =
          await db.doseLogs
            .where(
              "medicamento_id"
            )
            .anyOf(
              medicamentoIds
            )
            .toArray();

        return rows.filter(
          (
            row
          ) =>
            row.person_id ===
            activePersonId
        );
      },
      [
        activePersonId,
        medicamentoIdsKey,
      ],
      []
    ) as DoseLog[];

  // ==========================================================
  // SORTED DATA
  // ==========================================================

  const consultasOrdenadas =
    useMemo(
      () =>
        [
          ...consultasVinculadas,
        ].sort(
          (
            a,
            b
          ) =>
            (
              b.data ||
              ""
            ).localeCompare(
              a.data ||
                ""
            )
        ),
      [
        consultasVinculadas,
      ]
    );

  const cirurgiasOrdenadas =
    useMemo(
      () =>
        [
          ...cirurgiasVinculadas,
        ].sort(
          (
            a,
            b
          ) =>
            (
              b.data ||
              ""
            ).localeCompare(
              a.data ||
                ""
            )
        ),
      [
        cirurgiasVinculadas,
      ]
    );

  const examesOrdenados =
    useMemo(
      () =>
        [
          ...examesVinculados,
        ].sort(
          (
            a,
            b
          ) =>
            (
              b.data ||
              ""
            ).localeCompare(
              a.data ||
                ""
            )
        ),
      [
        examesVinculados,
      ]
    );

  const renovacoesOrdenadas =
    useMemo(
      () =>
        [
          ...renovacoesVinculadas,
        ].sort(
          (
            a,
            b
          ) =>
            (
              b.data ||
              ""
            ).localeCompare(
              a.data ||
                ""
            )
        ),
      [
        renovacoesVinculadas,
      ]
    );

  const cidsOrdenados =
    useMemo(
      () =>
        [
          ...cidsVinculados,
        ].sort(
          (
            a,
            b
          ) =>
            (
              b.data_diagnostico ||
              ""
            ).localeCompare(
              a.data_diagnostico ||
                ""
            )
        ),
      [
        cidsVinculados,
      ]
    );

  // ==========================================================
  // CONSULTATION INSIGHTS
  // ==========================================================

  const proximaConsulta =
    useMemo(
      () => {
        const futuras =
          consultasVinculadas.filter(
            (
              consulta
            ) =>
              isDateInFuture(
                consulta.data
              )
          );

        if (
          futuras.length ===
          0
        ) {
          return null;
        }

        return [
          ...futuras,
        ].sort(
          (
            a,
            b
          ) =>
            (
              a.data ||
              ""
            ).localeCompare(
              b.data ||
                ""
            )
        )[0];
      },
      [
        consultasVinculadas,
      ]
    );

  const ultimaConsulta =
    useMemo(
      () =>
        consultasOrdenadas[
          0
        ] ??
        null,
      [
        consultasOrdenadas,
      ]
    );

  const alertaSemRetorno =
    useMemo(
      () => {
        if (
          proximaConsulta ||
          !ultimaConsulta?.data
        ) {
          return null;
        }

        const dataUltima =
          new Date(
            `${ultimaConsulta.data.split("T")[0]}T00:00:00`
          ).getTime();

        const hoje =
          Date.now();

        const diffDias =
          Math.floor(
            (
              hoje -
              dataUltima
            ) /
              (
                1000 *
                60 *
                60 *
                24
              )
          );

        if (
          diffDias <=
          180
        ) {
          return null;
        }

        const meses =
          Math.max(
            6,
            Math.floor(
              diffDias /
                30
            )
          );

        return `Já se passaram aproximadamente ${meses} meses desde a última consulta registrada com este médico para a pessoa ativa.`;
      },
      [
        ultimaConsulta,
        proximaConsulta,
      ]
    );

  // ==========================================================
  // MEDICATION INSIGHTS
  //
  // Importante:
  // proxima_renovacao NÃO é tratada como validade de receita.
  // ==========================================================

  const alertasMedicamentos =
    useMemo(
      () => {
        return medicamentosVinculados.map(
          (
            medicamento
          ) => {
            const insight =
              sugerirRenovacao(
                medicamento
              );

            const comportamento =
              analisarComportamentoUso(
                medicamento,
                doseLogs.filter(
                  (
                    dose
                  ) =>
                    dose.medicamento_id ===
                    medicamento.id
                )
              );

            return {
              ...medicamento,
              insight,
              comportamento,
            };
          }
        );
      },
      [
        medicamentosVinculados,
        doseLogs,
      ]
    );

  const alertasRenovacao =
    useMemo(
      () =>
        alertasMedicamentos.filter(
          (
            medicamento
          ) =>
            medicamento.insight
              ?.deveRenovar
        ),
      [
        alertasMedicamentos,
      ]
    );

  const alertasComportamento =
    useMemo(
      () =>
        alertasMedicamentos.filter(
          (
            medicamento
          ) =>
            Boolean(
              medicamento.comportamento
            )
        ),
      [
        alertasMedicamentos,
      ]
    );

  const medicamentosAtivos =
    useMemo(
      () =>
        medicamentosVinculados.filter(
          (
            medicamento
          ) =>
            medicamento.status ===
            "ativo"
        ),
      [
        medicamentosVinculados,
      ]
    );

  const possuiAlertas =
    Boolean(
      alertaSemRetorno
    ) ||
    alertasRenovacao.length >
      0 ||
    alertasComportamento.length >
      0;

  // ==========================================================
  // DOCUMENT GROUPS
  // ==========================================================

  const prescricoes =
    useMemo(
      () =>
        documentosDoMedico.filter(
          (
            documento
          ) =>
            documento.type ===
            "receita"
        ),
      [
        documentosDoMedico,
      ]
    );

  const laudosRelatorios =
    useMemo(
      () =>
        documentosDoMedico.filter(
          (
            documento
          ) =>
            documento.type ===
              "laudo" ||
            documento.type ===
              "encaminhamento" ||
            documento.type ===
              "exame_imagem" ||
            documento.type ===
              "exame_sangue"
        ),
      [
        documentosDoMedico,
      ]
    );

  const outrosDocumentos =
    useMemo(
      () =>
        documentosDoMedico.filter(
          (
            documento
          ) =>
            !prescricoes.some(
              (
                item
              ) =>
                item.id ===
                documento.id
            ) &&
            !laudosRelatorios.some(
              (
                item
              ) =>
                item.id ===
                documento.id
            )
        ),
      [
        documentosDoMedico,
        prescricoes,
        laudosRelatorios,
      ]
    );

  // ==========================================================
  // RENEWAL TOTAL
  // ==========================================================

  const totalGastoRenovacoes =
    useMemo(
      () =>
        renovacoesVinculadas.reduce(
          (
            total,
            renovacao
          ) => {
            const preco =
              typeof renovacao.preco ===
              "number"
                ? renovacao.preco
                : Number(
                    renovacao.preco
                  ) ||
                  0;

            return (
              total +
              preco
            );
          },
          0
        ),
      [
        renovacoesVinculadas,
      ]
    );

  // ==========================================================
  // ACTIONS
  // ==========================================================

  const handleDelete =
    async () => {
      if (
        !id ||
        isDeleting
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setIsDeleting(
        true
      );

      try {
        await deleteMedicoSafe(
          id
        );

        trigger(
          "success"
        );

        router.replace(
          "/saude/medicos"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao excluir médico:",
          error
        );

        trigger(
          "error"
        );
      } finally {
        setIsDeleting(
          false
        );

        setShowDeleteModal(
          false
        );
      }
    };

  /*
   * Estes atalhos já existiam e são úteis.
   *
   * A compatibilidade dos parâmetros medico_id com as páginas
   * de destino será validada na auditoria pós-Médicos.
   */
  const menuOptions = [
    {
      id:
        "nova-consulta",
      label:
        "Nova Consulta",
      icon:
        Stethoscope,
      path:
        `/saude/consultas/nova?medico_id=${id}`,
    },
    {
      id:
        "nova-cirurgia",
      label:
        "Nova Cirurgia",
      icon:
        Syringe,
      path:
        `/saude/cirurgias/nova?medico_id=${id}`,
    },
    {
      id:
        "novo-medicamento",
      label:
        "Novo Medicamento",
      icon:
        Pill,
      path:
        `/saude/medicamentos/novo?medico_id=${id}`,
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
  // INITIAL STATES
  // ==========================================================

  if (
    !mounted ||
    isLoading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (!medico) {
    return null;
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl header-safe-top">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={18}
              />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">
                Rede médica
              </p>

              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">
                Perfil Médico
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ADD */}

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsMenuFlutuanteOpen(
                    (
                      open
                    ) =>
                      !open
                  );
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all hover:bg-ice/20 active:scale-95"
                aria-label="Adicionar registro"
                aria-expanded={
                  isMenuFlutuanteOpen
                }
              >
                <Plus
                  size={18}
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
                      className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface shadow-2xl"
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
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-ice/8 active:scale-[0.98]"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                  <Icon
                                    size={15}
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

            {/* EDIT */}

            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.push(
                  `/saude/medicos/editar?id=${medico.id}`
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all hover:border-ice/30 hover:text-ice active:scale-95"
              aria-label="Editar médico"
            >
              <Edit3
                size={16}
              />
            </button>

            {/* DELETE */}

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
              aria-label="Excluir médico"
            >
              <Trash2
                size={16}
              />
            </button>
          </div>
        </header>

        {/* ====================================================
            CONTENT
            ==================================================== */}

        <section className="space-y-5 px-5 pt-6">
          {/* ==================================================
              HERO / GLOBAL PROFILE
              ================================================== */}

          <motion.div
            initial={{
              opacity:
                0,
              y:
                12,
            }}
            animate={{
              opacity:
                1,
              y:
                0,
            }}
            className="overflow-hidden rounded-[32px] border border-surface-border/50 bg-surface shadow-sm"
            style={{
              borderLeft:
                "6px solid #38BDF8",
            }}
          >
            <div className="space-y-5 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-ice/20 bg-ice/10 text-ice">
                  <Stethoscope
                    size={28}
                  />
                </div>

                <div className="min-w-0 pt-1">
                  <h2 className="truncate font-display text-xl font-bold text-ink-primary">
                    Dr(a).{" "}
                    {
                      medico.nome
                    }
                  </h2>

                  {medico.especialidade && (
                    <p className="mt-0.5 text-sm font-medium text-ice">
                      {
                        medico.especialidade
                      }
                    </p>
                  )}

                  {medico.crm && (
                    <p className="mt-1 font-mono text-xs text-ink-muted">
                      CRM:{" "}
                      {
                        medico.crm
                      }
                    </p>
                  )}
                </div>
              </div>

              {(medico.telefone ||
                medico.email) && (
                <div className="space-y-3 border-t border-surface-border/40 pt-4">
                  {medico.telefone && (
                    <DetailInfoRow
                      icon={
                        <Phone
                          size={14}
                        />
                      }
                      iconClassName="bg-surface-raised text-ink-muted"
                      label="Telefone"
                    >
                      <span className="text-sm font-medium text-ink-primary">
                        {
                          medico.telefone
                        }
                      </span>
                    </DetailInfoRow>
                  )}

                  {medico.email && (
                    <DetailInfoRow
                      icon={
                        <Mail
                          size={14}
                        />
                      }
                      iconClassName="bg-surface-raised text-ink-muted"
                      label="E-mail"
                    >
                      <span className="truncate text-sm font-medium text-ink-primary">
                        {
                          medico.email
                        }
                      </span>
                    </DetailInfoRow>
                  )}
                </div>
              )}

              {medico.observacoes && (
                <div className="border-t border-surface-border/40 pt-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    <AlertCircle
                      size={14}
                    />
                    Observações
                  </div>

                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-primary">
                    {
                      medico.observacoes
                    }
                  </p>
                </div>
              )}

              {hospitaisVinculados.length >
                0 && (
                <div className="border-t border-surface-border/40 pt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    <Building2
                      size={14}
                      className="text-ice"
                    />
                    Hospitais onde atende
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {hospitaisVinculados.map(
                      (
                        hospital
                      ) => (
                        <span
                          key={
                            hospital.id
                          }
                          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-ice/20 bg-ice/5 px-3 py-1.5 text-xs text-ink-primary"
                        >
                          <Building2
                            size={11}
                            className="shrink-0 text-ice"
                          />

                          <span className="truncate">
                            {
                              hospital.nome
                            }
                          </span>
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {locaisVinculados.length >
                0 && (
                <div className="border-t border-surface-border/40 pt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    <MapPin
                      size={14}
                      className="text-ice"
                    />
                    Locais de atendimento
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {locaisVinculados.map(
                      (
                        local
                      ) => (
                        <span
                          key={
                            local.id
                          }
                          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1.5 text-xs text-ink-primary"
                        >
                          <MapPin
                            size={11}
                            className="shrink-0 text-ice"
                          />

                          <span className="truncate">
                            {
                              local.nome
                            }
                          </span>
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ==================================================
              ACTIVE PERSON CONTEXT
              ================================================== */}

          <motion.div
            initial={{
              opacity:
                0,
              y:
                12,
            }}
            animate={{
              opacity:
                1,
              y:
                0,
            }}
            transition={{
              delay:
                0.02,
            }}
          >
            <DetailCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SectionTitle
                    icon={
                      <FolderHeart
                        size={15}
                      />
                    }
                    title="Contexto da Pessoa Ativa"
                  />

                  <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                    Os registros abaixo pertencem somente à pessoa atualmente selecionada no Vault.
                  </p>
                </div>
              </div>

              {proximaConsulta ? (
                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    router.push(
                      `/saude/consultas/detalhes?id=${proximaConsulta.id}`
                    );
                  }}
                  className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-ice/20 bg-ice/5 p-3.5 text-left transition-all active:scale-[0.99]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                    <Calendar
                      size={16}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ice">
                      Próxima consulta
                    </p>

                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                      {formatDateDisplay(
                        proximaConsulta.data
                      )}

                      {proximaConsulta.horario &&
                        ` às ${proximaConsulta.horario}`}
                    </p>
                  </div>

                  <ChevronRight
                    size={14}
                    className="shrink-0 text-ink-faint"
                  />
                </button>
              ) : (
                <p className="mt-4 text-xs text-ink-muted">
                  Nenhuma consulta futura registrada com este médico.
                </p>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-surface-raised p-3">
                  <p className="font-display text-lg font-bold text-ink-primary">
                    {
                      consultasVinculadas.length
                    }
                  </p>

                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    Consultas
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-raised p-3">
                  <p className="font-display text-lg font-bold text-ink-primary">
                    {
                      medicamentosVinculados.length
                    }
                  </p>

                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    Medicamentos
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-raised p-3">
                  <p className="font-display text-lg font-bold text-ink-primary">
                    {
                      cidsVinculados.length
                    }
                  </p>

                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    CIDs
                  </p>
                </div>
              </div>
            </DetailCard>
          </motion.div>

          {/* ==================================================
              ALERTS
              ================================================== */}

          {possuiAlertas && (
            <motion.div
              initial={{
                opacity:
                  0,
                y:
                  12,
              }}
              animate={{
                opacity:
                  1,
                y:
                  0,
              }}
              transition={{
                delay:
                  0.03,
              }}
              className="rounded-[24px] border border-amber-400/30 bg-amber-400/5 p-5 shadow-sm"
            >
              <SectionTitle
                icon={
                  <AlertTriangle
                    size={15}
                  />
                }
                title="Alertas"
              />

              <div className="mt-4 space-y-3">
                {alertaSemRetorno && (
                  <div className="flex items-start gap-2 border-b border-amber-400/10 pb-3">
                    <AlertCircle
                      size={14}
                      className="mt-0.5 shrink-0 text-amber-400"
                    />

                    <div>
                      <p className="text-xs font-medium text-ink-primary">
                        Acompanhamento
                      </p>

                      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                        {
                          alertaSemRetorno
                        }
                      </p>
                    </div>
                  </div>
                )}

                {alertasRenovacao
                  .slice(
                    0,
                    3
                  )
                  .map(
                    (
                      medicamento
                    ) => (
                      <div
                        key={`renovar-${medicamento.id}`}
                        className="flex items-start gap-2 border-b border-amber-400/10 pb-3"
                      >
                        <AlertCircle
                          size={14}
                          className="mt-0.5 shrink-0 text-amber-400"
                        />

                        <div>
                          <p className="text-xs font-medium text-ink-primary">
                            {
                              medicamento.nome
                            }
                          </p>

                          {medicamento.insight
                            ?.mensagem && (
                            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                              {
                                medicamento
                                  .insight
                                  .mensagem
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}

                {alertasComportamento
                  .slice(
                    0,
                    3
                  )
                  .map(
                    (
                      medicamento
                    ) => (
                      <div
                        key={`comportamento-${medicamento.id}`}
                        className="flex items-start gap-2 border-b border-surface-border/30 pb-3 last:border-0 last:pb-0"
                      >
                        <Activity
                          size={14}
                          className="mt-0.5 shrink-0 text-ice"
                        />

                        <div>
                          <p className="text-xs font-medium text-ink-primary">
                            {
                              medicamento
                                .comportamento
                                ?.titulo
                            }
                          </p>

                          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                            {
                              medicamento
                                .comportamento
                                ?.mensagem
                            }
                          </p>
                        </div>
                      </div>
                    )
                  )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              CIDS
              ================================================== */}

          {cidsOrdenados.length >
            0 && (
            <motion.div
              initial={{
                opacity:
                  0,
                y:
                  12,
              }}
              animate={{
                opacity:
                  1,
                y:
                  0,
              }}
              transition={{
                delay:
                  0.04,
              }}
            >
              <DetailCard>
                <SectionTitle
                  icon={
                    <Activity
                      size={15}
                    />
                  }
                  title="CIDs Relacionados"
                />

                <div className="mt-4 space-y-2">
                  {cidsOrdenados
                    .slice(
                      0,
                      4
                    )
                    .map(
                      (
                        cid
                      ) => (
                        <HistoryItem
                          key={
                            cid.id
                          }
                          title={`${cid.codigo} · ${cid.descricao}`}
                          subtitle={
                            cid.data_diagnostico
                              ? `Diagnóstico em ${formatDateDisplay(
                                  cid.data_diagnostico
                                )}`
                              : undefined
                          }
                          icon={
                            <Activity
                              size={15}
                            />
                          }
                          iconClassName="text-ice"
                          onClick={() => {
                            trigger(
                              "vibrate"
                            );

                            router.push(
                              `/saude/cid/detalhes?id=${cid.id}`
                            );
                          }}
                        />
                      )
                    )}

                  {cidsOrdenados.length >
                    4 && (
                    <p className="pt-1 text-center text-[10px] text-ink-muted">
                      E mais{" "}
                      {cidsOrdenados.length -
                        4}{" "}
                      registro(s)...
                    </p>
                  )}
                </div>
              </DetailCard>
            </motion.div>
          )}

          {/* ==================================================
              TREATMENTS
              ================================================== */}

          {tratamentosVinculados.length >
            0 && (
            <motion.div
              initial={{
                opacity:
                  0,
                y:
                  12,
              }}
              animate={{
                opacity:
                  1,
                y:
                  0,
              }}
              transition={{
                delay:
                  0.05,
              }}
            >
              <DetailCard>
                <SectionTitle
                  icon={
                    <FolderHeart
                      size={15}
                    />
                  }
                  title="Tratamentos Acompanhados"
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  {tratamentosVinculados.map(
                    (
                      tratamento
                    ) => {
                      const color =
                        tratamento.cor ||
                        "#38BDF8";

                      return (
                        <span
                          key={
                            tratamento.id
                          }
                          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase"
                          style={{
                            backgroundColor:
                              `${color}20`,
                            borderColor:
                              `${color}40`,
                            color,
                          }}
                        >
                          <Activity
                            size={10}
                          />

                          {
                            tratamento.nome
                          }
                        </span>
                      );
                    }
                  )}
                </div>
              </DetailCard>
            </motion.div>
          )}

          {/* ==================================================
              DOCUMENTS
              ================================================== */}

          {documentosDoMedico.length >
            0 && (
            <motion.div
              initial={{
                opacity:
                  0,
                y:
                  12,
              }}
              animate={{
                opacity:
                  1,
                y:
                  0,
              }}
              transition={{
                delay:
                  0.06,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <FileText
                    size={15}
                  />
                }
                title="Documentos"
              />

              {prescricoes.length >
                0 && (
                <DetailCard>
                  <div className="mb-3 flex items-center gap-2">
                    <FileWarning
                      size={16}
                      className="text-ice"
                    />

                    <h5 className="text-sm font-medium text-ink-primary">
                      Prescrições
                    </h5>

                    <span className="ml-auto rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                      {
                        prescricoes.length
                      }
                    </span>
                  </div>

                  <div className="space-y-2">
                    {prescricoes
                      .slice(
                        0,
                        3
                      )
                      .map(
                        (
                          documento
                        ) => (
                          <HistoryItem
                            key={
                              documento.id
                            }
                            title={
                              documento.title
                            }
                            subtitle={formatDateDisplay(
                              documento.created_at
                            )}
                            icon={
                              <FileWarning
                                size={15}
                              />
                            }
                            iconClassName="text-ice"
                          />
                        )
                      )}
                  </div>
                </DetailCard>
              )}

              {laudosRelatorios.length >
                0 && (
                <DetailCard>
                  <div className="mb-3 flex items-center gap-2">
                    <FileText
                      size={16}
                      className="text-ice"
                    />

                    <h5 className="text-sm font-medium text-ink-primary">
                      Laudos e Relatórios
                    </h5>

                    <span className="ml-auto rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                      {
                        laudosRelatorios.length
                      }
                    </span>
                  </div>

                  <div className="space-y-2">
                    {laudosRelatorios
                      .slice(
                        0,
                        3
                      )
                      .map(
                        (
                          documento
                        ) => (
                          <HistoryItem
                            key={
                              documento.id
                            }
                            title={
                              documento.title
                            }
                            subtitle={formatDateDisplay(
                              documento.created_at
                            )}
                            icon={
                              <FileText
                                size={15}
                              />
                            }
                            iconClassName="text-ice"
                          />
                        )
                      )}
                  </div>
                </DetailCard>
              )}

              {outrosDocumentos.length >
                0 && (
                <DetailCard>
                  <div className="mb-3 flex items-center gap-2">
                    <FileText
                      size={16}
                      className="text-ink-muted"
                    />

                    <h5 className="text-sm font-medium text-ink-primary">
                      Outros documentos
                    </h5>

                    <span className="ml-auto rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                      {
                        outrosDocumentos.length
                      }
                    </span>
                  </div>

                  <div className="space-y-2">
                    {outrosDocumentos
                      .slice(
                        0,
                        3
                      )
                      .map(
                        (
                          documento
                        ) => (
                          <HistoryItem
                            key={
                              documento.id
                            }
                            title={
                              documento.title
                            }
                            subtitle={formatDateDisplay(
                              documento.created_at
                            )}
                            icon={
                              <FileText
                                size={15}
                              />
                            }
                            iconClassName="text-ink-muted"
                          />
                        )
                      )}
                  </div>
                </DetailCard>
              )}

              <p className="px-1 text-[10px] leading-relaxed text-ink-faint">
                Os atalhos para abrir documentos individualmente serão conectados quando validarmos a rota oficial do módulo Documentos.
              </p>
            </motion.div>
          )}

          {/* ==================================================
              EXAMS
              ================================================== */}

          {examesOrdenados.length >
            0 && (
            <motion.div
              initial={{
                opacity:
                  0,
                y:
                  12,
              }}
              animate={{
                opacity:
                  1,
                y:
                  0,
              }}
              transition={{
                delay:
                  0.07,
              }}
            >
              <DetailCard>
                <SectionTitle
                  icon={
                    <FlaskConical
                      size={15}
                    />
                  }
                  title="Exames"
                />

                <div className="mt-4 space-y-2">
                  {examesOrdenados
                    .slice(
                      0,
                      3
                    )
                    .map(
                      (
                        exame
                      ) => (
                        <HistoryItem
                          key={
                            exame.id
                          }
                          title={
                            exame.nome
                          }
                          subtitle={formatDateDisplay(
                            exame.data
                          )}
                          icon={
                            <FlaskConical
                              size={15}
                            />
                          }
                          iconClassName="text-ice"
                          onClick={() => {
                            trigger(
                              "vibrate"
                            );

                            router.push(
                              `/saude/exames/detalhes?id=${exame.id}`
                            );
                          }}
                        />
                      )
                    )}

                  {examesOrdenados.length >
                    3 && (
                    <p className="pt-1 text-center text-[10px] text-ink-muted">
                      E mais{" "}
                      {examesOrdenados.length -
                        3}{" "}
                      registro(s)...
                    </p>
                  )}
                </div>
              </DetailCard>
            </motion.div>
          )}

          {/* ==================================================
              RENEWALS
              ================================================== */}

          {renovacoesOrdenadas.length >
            0 && (
            <motion.div
              initial={{
                opacity:
                  0,
                y:
                  12,
              }}
              animate={{
                opacity:
                  1,
                y:
                  0,
              }}
              transition={{
                delay:
                  0.08,
              }}
            >
              <DetailCard>
                <SectionTitle
                  icon={
                    <FileWarning
                      size={15}
                    />
                  }
                  title="Renovações"
                />

                <div className="mt-4 space-y-2">
                  {renovacoesOrdenadas
                    .slice(
                      0,
                      3
                    )
                    .map(
                      (
                        renovacao
                      ) => (
                        <div
                          key={
                            renovacao.id
                          }
                          className="flex items-center justify-between gap-3 rounded-xl border border-surface-border/40 bg-surface-raised p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink-primary">
                              {formatDateDisplay(
                                renovacao.data
                              )}
                            </p>

                            <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                              {renovacao.observacoes ||
                                "Renovação registrada"}
                            </p>
                          </div>

                          <span className="shrink-0 text-xs font-semibold text-ink-muted">
                            {typeof renovacao.preco ===
                              "number"
                              ? formatCurrency(
                                  renovacao.preco
                                )
                              : renovacao.preco !==
                                  undefined &&
                                renovacao.preco !==
                                  null &&
                                Number(
                                  renovacao.preco
                                ) >
                                  0
                              ? formatCurrency(
                                  Number(
                                    renovacao.preco
                                  )
                                )
                              : "Sem preço"}
                          </span>
                        </div>
                      )
                    )}

                  {renovacoesOrdenadas.length >
                    3 && (
                    <p className="pt-1 text-center text-[10px] text-ink-muted">
                      E mais{" "}
                      {renovacoesOrdenadas.length -
                        3}{" "}
                      registro(s)...
                    </p>
                  )}
                </div>

                {totalGastoRenovacoes >
                  0 && (
                  <div className="mt-4 flex items-center justify-between border-t border-surface-border/40 pt-3">
                    <span className="text-xs text-ink-muted">
                      Total registrado
                    </span>

                    <span className="text-xs font-bold text-ink-primary">
                      {formatCurrency(
                        totalGastoRenovacoes
                      )}
                    </span>
                  </div>
                )}
              </DetailCard>
            </motion.div>
          )}

          {/* ==================================================
              CLINICAL HISTORY
              ================================================== */}

          <motion.div
            initial={{
              opacity:
                0,
              y:
                12,
            }}
            animate={{
              opacity:
                1,
              y:
                0,
            }}
            transition={{
              delay:
                0.09,
            }}
            className="space-y-4 pt-2"
          >
            <SectionTitle
              icon={
                <Calendar
                  size={15}
                />
              }
              title="Histórico Clínico"
            />

            <div className="space-y-3">
              {/* CONSULTATIONS */}

              <DetailCard className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar
                    size={16}
                    className="text-ice"
                  />

                  <h4 className="text-sm font-semibold text-ink-primary">
                    Consultas (
                    {
                      consultasVinculadas.length
                    }
                    )
                  </h4>

                  {ultimaConsulta && (
                    <span className="ml-auto rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                      Última:{" "}
                      {formatDateDisplay(
                        ultimaConsulta.data
                      )}
                    </span>
                  )}
                </div>

                {consultasOrdenadas.length ===
                0 ? (
                  <EmptyHistory>
                    Nenhuma consulta registrada.
                  </EmptyHistory>
                ) : (
                  <div className="mt-3 space-y-2">
                    {consultasOrdenadas
                      .slice(
                        0,
                        3
                      )
                      .map(
                        (
                          consulta
                        ) => (
                          <HistoryItem
                            key={
                              consulta.id
                            }
                            title={
                              consulta.especialidade ||
                              "Consulta"
                            }
                            subtitle={[
                              formatDateDisplay(
                                consulta.data
                              ),
                              consulta.status,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                " · "
                              )}
                            icon={
                              <Calendar
                                size={15}
                              />
                            }
                            iconClassName="text-ice"
                            onClick={() => {
                              trigger(
                                "vibrate"
                              );

                              router.push(
                                `/saude/consultas/detalhes?id=${consulta.id}`
                              );
                            }}
                          />
                        )
                      )}

                    {consultasOrdenadas.length >
                      3 && (
                      <p className="pt-1 text-center text-[10px] text-ink-muted">
                        E mais{" "}
                        {consultasOrdenadas.length -
                          3}{" "}
                        registro(s)...
                      </p>
                    )}
                  </div>
                )}
              </DetailCard>

              {/* SURGERIES */}

              <DetailCard className="p-4">
                <div className="flex items-center gap-2">
                  <Activity
                    size={16}
                    className="text-coral"
                  />

                  <h4 className="text-sm font-semibold text-ink-primary">
                    Cirurgias (
                    {
                      cirurgiasOrdenadas.length
                    }
                    )
                  </h4>
                </div>

                {cirurgiasOrdenadas.length ===
                0 ? (
                  <EmptyHistory>
                    Nenhuma cirurgia registrada.
                  </EmptyHistory>
                ) : (
                  <div className="mt-3 space-y-2">
                    {cirurgiasOrdenadas
                      .slice(
                        0,
                        3
                      )
                      .map(
                        (
                          cirurgia
                        ) => (
                          <HistoryItem
                            key={
                              cirurgia.id
                            }
                            title={
                              cirurgia.procedimento
                            }
                            subtitle={formatDateDisplay(
                              cirurgia.data
                            )}
                            icon={
                              <Activity
                                size={15}
                              />
                            }
                            iconClassName="text-coral"
                            onClick={() => {
                              trigger(
                                "vibrate"
                              );

                              router.push(
                                `/saude/cirurgias/detalhes?id=${cirurgia.id}`
                              );
                            }}
                          />
                        )
                      )}

                    {cirurgiasOrdenadas.length >
                      3 && (
                      <p className="pt-1 text-center text-[10px] text-ink-muted">
                        E mais{" "}
                        {cirurgiasOrdenadas.length -
                          3}{" "}
                        registro(s)...
                      </p>
                    )}
                  </div>
                )}
              </DetailCard>

              {/* MEDICATIONS */}

              <DetailCard className="p-4">
                <div className="flex items-center gap-2">
                  <Pill
                    size={16}
                    className="text-ice"
                  />

                  <h4 className="text-sm font-semibold text-ink-primary">
                    Medicamentos (
                    {
                      medicamentosVinculados.length
                    }
                    )
                  </h4>

                  {medicamentosAtivos.length >
                    0 && (
                    <span className="ml-auto rounded-full bg-ice/10 px-2 py-0.5 text-[10px] font-medium text-ice">
                      {
                        medicamentosAtivos.length
                      }{" "}
                      ativos
                    </span>
                  )}
                </div>

                {medicamentosVinculados.length ===
                0 ? (
                  <EmptyHistory>
                    Nenhum medicamento relacionado a este médico.
                  </EmptyHistory>
                ) : (
                  <div className="mt-3 space-y-2">
                    {alertasMedicamentos
                      .slice(
                        0,
                        3
                      )
                      .map(
                        (
                          medicamento
                        ) => (
                          <button
                            key={
                              medicamento.id
                            }
                            type="button"
                            onClick={() => {
                              trigger(
                                "vibrate"
                              );

                              router.push(
                                `/saude/medicamentos/detalhes?id=${medicamento.id}`
                              );
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-all hover:border-ice/30 active:scale-[0.99]"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-medium text-ink-primary">
                                  {
                                    medicamento.nome
                                  }
                                </p>

                                {medicamento.insight
                                  ?.deveRenovar && (
                                  <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400">
                                    Renovar
                                  </span>
                                )}
                              </div>

                              {medicamento.dosagem && (
                                <p className="mt-0.5 text-[11px] text-ink-muted">
                                  {
                                    medicamento.dosagem
                                  }
                                </p>
                              )}
                            </div>

                            <ChevronRight
                              size={14}
                              className="shrink-0 text-ink-faint"
                            />
                          </button>
                        )
                      )}

                    {medicamentosVinculados.length >
                      3 && (
                      <p className="pt-1 text-center text-[10px] text-ink-muted">
                        E mais{" "}
                        {medicamentosVinculados.length -
                          3}{" "}
                        registro(s)...
                      </p>
                    )}
                  </div>
                )}
              </DetailCard>
            </div>
          </motion.div>
        </section>

        {/* ====================================================
            DELETE MODAL
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
          title="Excluir Médico"
          message={`Tem certeza que deseja excluir "${medico.nome}"? Consultas, exames, cirurgias, medicamentos, CIDs, documentos, renovações e tratamentos serão preservados e apenas desvinculados deste profissional.`}
          isLoading={
            isDeleting
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

export default function DetalhesMedicoPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <DetalhesMedicoContent />
    </Suspense>
  );
}