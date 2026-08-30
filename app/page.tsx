
// app/(app)/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Bell,
  Building2,
  Calendar,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  FolderHeart,
  FolderLock,
  HeartPulse,
  Landmark,
  MapPin,
  Pill,
  Stethoscope,
  Store,
  Syringe,
  WalletCards,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";

import { useAuth } from "@/hooks/useAuth";
import { usePersons } from "@/hooks/usePersons";
import { useDocuments } from "@/hooks/useDocuments";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useActivePersonId } from "@/hooks/useActivePersonId";

import { useHapticFeedback } from "@/lib/haptics";
import { db } from "@/lib/db";

import {
  alertLevelColor,
  getDocumentAlerts,
  getLocalTodayISO,
  type AlertLevel,
} from "@/lib/health-utils";

import {
  gerarAlertasVisaoGeral,
  type AlertaVisaoGeral,
} from "@/lib/health-insights";

import { PageTransition } from "@/components/PageTransition";
import { SimpleSpinner } from "@/components/loading/SimpleSpinner";
import { PendingDosesModal } from "@/components/PendingDosesModal";
import { VersiculoDia } from "@/components/VersiculoDia";

// ============================================================
// HELPERS
// ============================================================

function getCurrentTimeHHMM(): string {
  return new Date().toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
}

function getTratamentoIcon(
  nome: string
) {
  const normalized = (
    nome || ""
  ).toLowerCase();

  if (
    normalized.includes(
      "tdah"
    )
  ) {
    return Activity;
  }

  if (
    normalized.includes(
      "dor"
    ) ||
    normalized.includes(
      "neuropática"
    )
  ) {
    return HeartPulse;
  }

  if (
    normalized.includes(
      "depress"
    )
  ) {
    return HeartPulse;
  }

  return Activity;
}

function mapUrgenciaToAlertLevel(
  urgencia:
    AlertaVisaoGeral["urgencia"]
): AlertLevel {
  switch (urgencia) {
    case "alta":
      return "urgente";

    case "media":
      return "atencao";

    default:
      return "ok";
  }
}

// ============================================================
// ALERTAS DA HOME
// ============================================================

type DashboardAlertKind =
  | AlertaVisaoGeral["tipo"]
  | "documento";

type DashboardAlert = {
  id: string;

  title: string;

  subtitle: string;

  level: AlertLevel;

  kind: DashboardAlertKind;

  href: string;

  daysUntil:
    | number
    | null;

  icon:
    React.ReactNode;

  color: string;
};

function getAlertIcon(
  kind: DashboardAlertKind
): React.ReactNode {
  switch (kind) {
    case "consulta":
      return (
        <Stethoscope size={17} />
      );

    case "exame":
      return (
        <FlaskConical size={17} />
      );

    case "cirurgia":
      return (
        <Syringe size={17} />
      );

    case "receita":
      return (
        <FileText size={17} />
      );

    case "estoque":
      return (
        <Pill size={17} />
      );

    case "sus":
      return (
        <Landmark size={17} />
      );

    case "documento":
      return (
        <FolderLock size={17} />
      );

    default:
      return (
        <AlertCircle size={17} />
      );
  }
}

function getAlertKindLabel(
  kind: DashboardAlertKind
): string {
  switch (kind) {
    case "consulta":
      return "Consulta";

    case "exame":
      return "Exame";

    case "cirurgia":
      return "Cirurgia";

    case "receita":
      return "Receita";

    case "estoque":
      return "Estoque";

    case "sus":
      return "SUS";

    case "documento":
      return "Documento";

    default:
      return "Saúde";
  }
}

function getAlertBadgeLabel(
  alert: DashboardAlert
): string {
  if (
    alert.kind === "estoque" &&
    alert.daysUntil !== null &&
    alert.daysUntil >= 0
  ) {
    if (
      alert.daysUntil === 0
    ) {
      return "Sem estoque";
    }

    return `~${alert.daysUntil} ${
      alert.daysUntil === 1
        ? "dia"
        : "dias"
    }`;
  }

  if (
    alert.daysUntil !== null
  ) {
    if (
      alert.daysUntil < 0
    ) {
      const overdue =
        Math.abs(
          alert.daysUntil
        );

      return `${overdue} ${
        overdue === 1
          ? "dia"
          : "dias"
      } atrás`;
    }

    if (
      alert.daysUntil === 0
    ) {
      return "Hoje";
    }

    return `${alert.daysUntil} ${
      alert.daysUntil === 1
        ? "dia"
        : "dias"
    }`;
  }

  switch (alert.level) {
    case "urgente":
      return "Urgente";

    case "atencao":
      return "Atenção";

    default:
      return "Informação";
  }
}

function AlertRow({
  alert,
}: {
  alert: DashboardAlert;
}) {
  const router = useRouter();

  const {
    trigger,
  } = useHapticFeedback();

  return (
    <button
      onClick={() => {
        trigger("vibrate");

        router.push(
          alert.href
        );
      }}
      className="flex w-full min-w-0 items-center justify-between gap-3 rounded-[22px] border bg-surface p-3.5 text-left shadow-sm transition-all active:scale-[0.985]"
      style={{
        borderColor:
          `${alert.color}30`,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor:
              `${alert.color}18`,

            color:
              alert.color,
          }}
        >
          {alert.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="rounded-md border border-surface-border/40 bg-surface-raised px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-muted">
              {getAlertKindLabel(
                alert.kind
              )}
            </span>
          </div>

          <p className="line-clamp-1 text-xs font-bold leading-tight text-ink-primary">
            {alert.title}
          </p>

          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-ink-muted">
            {alert.subtitle}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className="whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold"
          style={{
            backgroundColor:
              `${alert.color}18`,

            color:
              alert.color,
          }}
        >
          {getAlertBadgeLabel(
            alert
          )}
        </span>

        <ChevronRight
          size={14}
          className="text-ink-faint"
        />
      </div>
    </button>
  );
}

// ============================================================
// HOME
// ============================================================

export default function HomePage() {
  const router = useRouter();

  const {
    trigger,
  } = useHapticFeedback();

  const {
    user,
    loading:
      authLoading,
  } = useAuth();

  const persons =
    usePersons();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const hoje =
    getLocalTodayISO();

  // ==========================================================
  // RELÓGIO REATIVO
  // ==========================================================

  const [
    horaAtual,
    setHoraAtual,
  ] =
    useState(
      getCurrentTimeHHMM
    );

  useEffect(() => {
    const updateClock =
      () => {
        setHoraAtual(
          getCurrentTimeHHMM()
        );
      };

    updateClock();

    const interval =
      window.setInterval(
        updateClock,
        30_000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, []);

  // ==========================================================
  // PESSOA ATIVA
  // ==========================================================

  const activePerson =
    useMemo(() => {
      if (
        !activePersonId
      ) {
        return null;
      }

      return (
        persons.find(
          (person) =>
            person.id ===
            activePersonId
        ) || null
      );
    }, [
      persons,
      activePersonId,
    ]);

  const displayName =
    activePerson?.name ||
    user?.user_metadata
      ?.full_name ||
    user?.email?.split(
      "@"
    )[0] ||
    "Usuário";

  const avatarUrl =
    activePerson?.avatar_url ||
    user?.user_metadata
      ?.avatar_url;

  // ==========================================================
  // DOCUMENTOS
  // ==========================================================

  const documents =
    useDocuments(
      activePersonId ||
        undefined
    );

  // ==========================================================
  // MEDICAMENTOS
  // ==========================================================

  const {
    medicamentos:
      medicamentosTodas,
  } =
    useMedicamentos();

  /**
   * useMedicamentos já é person-scoped.
   *
   * Mantemos somente uma defesa adicional estrita:
   * registros sem person_id não entram silenciosamente.
   */
  const medicamentos =
    useMemo(
      () =>
        activePersonId
          ? (
              medicamentosTodas ||
              []
            ).filter(
              (
                medicamento: any
              ) =>
                medicamento.person_id ===
                activePersonId
            )
          : [],
      [
        medicamentosTodas,
        activePersonId,
      ]
    );

  const medicamentosAtivos =
    useMemo(
      () =>
        medicamentos.filter(
          (
            medicamento: any
          ) =>
            medicamento.status !==
            "descontinuado"
        ),
      [medicamentos]
    );

  // ==========================================================
  // ENTIDADES GLOBAIS
  // ==========================================================

  const {
    medicos = [],
  } =
    useMedicos();

  const {
    farmacias = [],
  } =
    useFarmacias();

  const {
    hospitais = [],
  } =
    useHospitais();

  const {
    locais = [],
  } =
    useLocais();

  // ==========================================================
  // DOSE LOGS
  // ==========================================================

  const {
    doseLogs,
    marcarComoTomada:
      marcarDose,
  } =
    useDoseLogs(hoje);

  // ==========================================================
  // ENTIDADES CLÍNICAS PERSON-SCOPED
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
      [activePersonId],
      []
    );

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
      [activePersonId],
      []
    );

  const exames =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.exames
          .where(
            "person_id"
          )
          .equals(
            activePersonId
          )
          .toArray();
      },
      [activePersonId],
      []
    );

  const renovacoes =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.renovacoes
          .where(
            "person_id"
          )
          .equals(
            activePersonId
          )
          .toArray();
      },
      [activePersonId],
      []
    );

  const consultas =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.consultas
          .where(
            "person_id"
          )
          .equals(
            activePersonId
          )
          .toArray();
      },
      [activePersonId],
      []
    );

  const cirurgias =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.cirurgias
          .where(
            "person_id"
          )
          .equals(
            activePersonId
          )
          .toArray();
      },
      [activePersonId],
      []
    );

  // ==========================================================
  // COMPROMISSOS DE HOJE
  // ==========================================================

  const consultasHoje =
    useMemo(
      () =>
        consultas.filter(
          (consulta: any) =>
            consulta.data ===
              hoje &&
            consulta.status ===
              "agendada"
        ),
      [
        consultas,
        hoje,
      ]
    );

  const examesHoje =
    useMemo(
      () =>
        exames.filter(
          (exame: any) =>
            exame.data === hoje
        ),
      [
        exames,
        hoje,
      ]
    );

  const cirurgiasHoje =
    useMemo(
      () =>
        cirurgias.filter(
          (cirurgia: any) =>
            cirurgia.data ===
              hoje &&
            cirurgia.status ===
              "agendada"
        ),
      [
        cirurgias,
        hoje,
      ]
    );

  const totalCompromissosHoje =
    consultasHoje.length +
    examesHoje.length +
    cirurgiasHoje.length;

  // ==========================================================
  // DOSES PENDENTES
  // ==========================================================

  const dosesPendentesAtrasadas =
    useMemo(() => {
      const lista: Array<{
        medicamentoId:
          string;

        nome: string;

        horario: string;
      }> = [];

      for (
        const med of
          medicamentosAtivos
      ) {
        if (
          !med.id ||
          med.tipo_uso !==
            "continuo"
        ) {
          continue;
        }

        const horarios =
          (
            med.estoque_horarios ||
            []
          ).filter(Boolean);

        for (
          const horario of
            horarios
        ) {
          if (
            horario >
            horaAtual
          ) {
            continue;
          }

          const log =
            doseLogs.find(
              (item) =>
                item.medicamento_id ===
                  med.id &&
                item.horario ===
                  horario
            );

          /**
           * Dose tomada ou explicitamente ignorada
           * está resolvida.
           */
          if (
            log?.tomado_em ||
            log?.ignorado_em
          ) {
            continue;
          }

          lista.push({
            medicamentoId:
              med.id,

            nome:
              med.nome,

            horario,
          });
        }
      }

      return lista;
    }, [
      medicamentosAtivos,
      doseLogs,
      horaAtual,
    ]);

  const dosesTomadasHoje =
    useMemo(
      () =>
        doseLogs.filter(
          (log) =>
            Boolean(
              log.tomado_em
            )
        ).length,
      [doseLogs]
    );

  // ==========================================================
  // MOTOR CANÔNICO DE ALERTAS
  // ==========================================================

  const healthInsights =
    useMemo(
      () =>
        gerarAlertasVisaoGeral({
          medicamentos:
            medicamentosAtivos,

          consultas,

          exames,

          cirurgias,
        }),
      [
        medicamentosAtivos,
        consultas,
        exames,
        cirurgias,
      ]
    );

  /**
   * Documentos ainda usam health-utils porque o motor
   * de health-insights atual não recebe Document.
   *
   * Eles entram na MESMA lista visual, evitando um
   * componente de notificações paralelo.
   */
  const documentInsights =
    useMemo(
      () =>
        getDocumentAlerts(
          documents || []
        ).filter(
          (alert) =>
            alert.daysUntil <=
              5 &&
            alert.daysUntil >=
              -7
        ),
      [documents]
    );

  const unifiedAlerts =
    useMemo<
      DashboardAlert[]
    >(() => {
      const result:
        DashboardAlert[] =
        [];

      for (
        const insight of
          healthInsights
      ) {
        const level =
          mapUrgenciaToAlertLevel(
            insight.urgencia
          );

        result.push({
          id:
            insight.id,

          title:
            insight.titulo,

          subtitle:
            insight.mensagem,

          level,

          kind:
            insight.tipo,

          href:
            insight.link,

          daysUntil:
            insight.dias ??
            null,

          icon:
            getAlertIcon(
              insight.tipo
            ),

          color:
            alertLevelColor(
              level
            ),
        });
      }

      for (
        const alert of
          documentInsights
      ) {
        result.push({
          id:
            `documento-${alert.id}`,

          title:
            alert.title,

          subtitle:
            alert.subtitle,

          level:
            alert.level,

          kind:
            "documento",

          href:
            alert.href,

          daysUntil:
            alert.daysUntil,

          icon:
            getAlertIcon(
              "documento"
            ),

          color:
            alertLevelColor(
              alert.level
            ),
        });
      }

      const priority:
        Record<
          AlertLevel,
          number
        > = {
          vencido: 0,
          urgente: 1,
          atencao: 2,
          ok: 3,
        };

      return result
        .sort(
          (a, b) => {
            const byLevel =
              (
                priority[
                  a.level
                ] ?? 4
              ) -
              (
                priority[
                  b.level
                ] ?? 4
              );

            if (
              byLevel !== 0
            ) {
              return byLevel;
            }

            const daysA =
              a.daysUntil ??
              99999;

            const daysB =
              b.daysUntil ??
              99999;

            return (
              daysA -
              daysB
            );
          }
        )
        .slice(0, 6);
    }, [
      healthInsights,
      documentInsights,
    ]);

  // ==========================================================
  // FINANCEIRO
  // ==========================================================

  const metricasFinanceiras =
    useMemo(() => {
      const agora =
        new Date();

      const mesAtual =
        agora.getMonth();

      const anoAtual =
        agora.getFullYear();

      const mesAnterior =
        mesAtual === 0
          ? 11
          : mesAtual - 1;

      const anoMesAnterior =
        mesAtual === 0
          ? anoAtual - 1
          : anoAtual;

      let gastoMesAtual = 0;

      let gastoMesAnterior =
        0;

      /**
       * Fonte financeira canônica na Home:
       * histórico de Renovações/aquisições.
       *
       * Não somamos medicamento.preco novamente,
       * evitando dupla contagem da compra inicial
       * quando ela já possui renovação correspondente.
       */
      for (
        const renovacao of
          renovacoes
      ) {
        if (
          renovacao.tipo_aquisicao ===
            "sus" ||
          renovacao.tipo_aquisicao ===
            "gratuito"
        ) {
          continue;
        }

        const preco =
          Number(
            renovacao.preco
          );

        if (
          !Number.isFinite(
            preco
          ) ||
          preco <= 0 ||
          !renovacao.data
        ) {
          continue;
        }

        const parts =
          renovacao.data.split(
            "-"
          );

        if (
          parts.length !== 3
        ) {
          continue;
        }

        const year =
          Number(
            parts[0]
          );

        const month =
          Number(
            parts[1]
          ) - 1;

        if (
          !Number.isInteger(
            year
          ) ||
          !Number.isInteger(
            month
          )
        ) {
          continue;
        }

        if (
          month ===
            mesAtual &&
          year ===
            anoAtual
        ) {
          gastoMesAtual +=
            preco;

          continue;
        }

        if (
          month ===
            mesAnterior &&
          year ===
            anoMesAnterior
        ) {
          gastoMesAnterior +=
            preco;
        }
      }

      return {
        gastoMesAtual,

        gastoMesAnterior,

        diff:
          gastoMesAtual -
          gastoMesAnterior,
      };
    }, [renovacoes]);

  // ==========================================================
  // MODAL DE DOSES
  // ==========================================================

  const [
    modalPendenciasAberto,
    setModalPendenciasAberto,
  ] =
    useState(false);

  const [
    processandoDoseId,
    setProcessandoDoseId,
  ] =
    useState<
      string | null
    >(null);

  const [
    isProcessandoTudo,
    setIsProcessandoTudo,
  ] =
    useState(false);

  const handleTomarDosePendente =
    async (dose: {
      medicamentoId:
        string;

      nome: string;

      horario: string;
    }) => {
      const processingKey =
        `${dose.medicamentoId}-${dose.horario}`;

      if (
        processandoDoseId ||
        isProcessandoTudo
      ) {
        return;
      }

      setProcessandoDoseId(
        processingKey
      );

      try {
        /**
         * IMPORTANTE:
         *
         * Não alteramos estoque aqui.
         *
         * useDoseLogs
         *   -> doseLogsRepository.setStatus()
         *
         * já registra a tomada, calcula a transição
         * e movimenta estoque de forma centralizada.
         */
        await marcarDose(
          dose.medicamentoId,
          dose.horario
        );

        trigger(
          "success"
        );
      } catch (error) {
        console.error(
          "[Home] Erro ao registrar dose:",
          error
        );

        trigger("error");
      } finally {
        setProcessandoDoseId(
          null
        );
      }
    };

  const handleTomarTodasAtrasadas =
    async () => {
      if (
        isProcessandoTudo ||
        processandoDoseId
      ) {
        return;
      }

      setIsProcessandoTudo(
        true
      );

      try {
        /**
         * Cada registro passa pelo repository.
         *
         * Não há qualquer alteração manual de estoque
         * nesta página.
         */
        for (
          const dose of
            dosesPendentesAtrasadas
        ) {
          await marcarDose(
            dose.medicamentoId,
            dose.horario
          );
        }

        trigger(
          "success"
        );

        setModalPendenciasAberto(
          false
        );
      } catch (error) {
        console.error(
          "[Home] Erro ao registrar doses pendentes:",
          error
        );

        trigger("error");
      } finally {
        setIsProcessandoTudo(
          false
        );
      }
    };

  // ==========================================================
  // AÇÕES
  // ==========================================================

  const quickActions = [
    {
      id:
        "consultas",

      label:
        "Consultas",

      description:
        "Agenda clínica",

      icon:
        Calendar,

      path:
        "/saude/consultas",
    },

    {
      id:
        "exames",

      label:
        "Exames",

      description:
        "Resultados e pedidos",

      icon:
        FlaskConical,

      path:
        "/saude/exames",
    },

    {
      id:
        "medicamentos",

      label:
        "Medicamentos",

      description:
        "Estoque e doses",

      icon:
        Pill,

      path:
        "/saude/medicamentos",
    },

    /**
     * Antes esta posição repetia Prontuário,
     * que já possui um card dedicado logo abaixo.
     */
    {
      id:
        "cirurgias",

      label:
        "Cirurgias",

      description:
        "Procedimentos",

      icon:
        Syringe,

      path:
        "/saude/cirurgias",
    },
  ];

  const redeActions = [
    {
      id:
        "medicos",

      label:
        "Médicos",

      icon:
        Stethoscope,

      path:
        "/saude/medicos",

      count:
        medicos.length,
    },

    {
      id:
        "farmacias",

      label:
        "Farmácias",

      icon:
        Store,

      path:
        "/saude/farmacias",

      count:
        farmacias.length,
    },

    {
      id:
        "hospitais",

      label:
        "Hospitais",

      icon:
        Building2,

      path:
        "/saude/hospitais",

      count:
        hospitais.length,
    },

    {
      id:
        "locais",

      label:
        "Locais",

      icon:
        MapPin,

      path:
        "/saude/locais",

      count:
        locais.length,
    },

    {
      id:
        "cids",

      label:
        "CIDs",

      icon:
        FileText,

      path:
        "/saude/cids",

      count:
        cids.length,
    },
  ];

  // ==========================================================
  // LOADING
  // ==========================================================

  if (authLoading) {
    return (
      <SimpleSpinner />
    );
  }

  // ==========================================================
  // VIEW
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen overflow-y-auto bg-void pb-40">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-safe backdrop-blur-xl">
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
            }}
            className="flex items-center gap-3"
          >
            <button
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.push(
                  "/mais"
                );
              }}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              {avatarUrl ? (
                <span className="glow-ice flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    loading="lazy"
                    className="h-full w-full rounded-full object-cover"
                  />
                </span>
              ) : (
                <div className="ring-gradient glow-ice flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-void">
                  {displayName
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-ice/90">
                  Painel Clínico
                </p>

                <h1 className="mt-1 truncate font-display text-base font-semibold text-ink-primary">
                  Olá,{" "}
                  {
                    displayName.split(
                      " "
                    )[0]
                  }
                </h1>

                <p className="text-xs text-ink-muted">
                  {dosesPendentesAtrasadas.length >
                  0
                    ? `${dosesPendentesAtrasadas.length} dose${
                        dosesPendentesAtrasadas.length >
                        1
                          ? "s"
                          : ""
                      } pendente${
                        dosesPendentesAtrasadas.length >
                        1
                          ? "s"
                          : ""
                      }`
                    : "Rotina de doses atualizada"}
                </p>
              </div>
            </button>
          </motion.div>
        </header>

        <section className="space-y-6 px-5 pt-5">
          {/* ===================================================
              RESUMO DE HOJE
          =================================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.02,
            }}
            className="overflow-hidden rounded-[28px] border border-ice/20 bg-gradient-to-br from-ice/10 via-surface to-surface p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <CalendarDays
                    size={15}
                    className="text-ice"
                  />

                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ice">
                    Resumo de hoje
                  </p>
                </div>

                <p className="font-display text-lg font-semibold text-ink-primary">
                  Seu dia clínico
                </p>

                <p className="mt-1 text-xs text-ink-muted">
                  Compromissos, doses e
                  informações que precisam
                  de atenção.
                </p>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-ice/20 bg-ice/10 text-ice">
                <HeartPulse
                  size={20}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/hoje"
                  );
                }}
                className="rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.97]"
              >
                <div className="flex items-center gap-2">
                  <Calendar
                    size={15}
                    className="text-ice"
                  />

                  <span className="text-[10px] text-ink-muted">
                    Compromissos
                  </span>
                </div>

                <p className="mt-1 font-mono text-lg font-bold text-ink-primary">
                  {
                    totalCompromissosHoje
                  }
                </p>
              </button>

              <button
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/saude/medicamentos"
                  );
                }}
                className="rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.97]"
              >
                <div className="flex items-center gap-2">
                  <Pill
                    size={15}
                    className="text-emerald-400"
                  />

                  <span className="text-[10px] text-ink-muted">
                    Medicamentos ativos
                  </span>
                </div>

                <p className="mt-1 font-mono text-lg font-bold text-ink-primary">
                  {
                    medicamentosAtivos.length
                  }
                </p>
              </button>

              <button
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setModalPendenciasAberto(
                    true
                  );
                }}
                className="rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.97]"
              >
                <div className="flex items-center gap-2">
                  <Clock
                    size={15}
                    className={
                      dosesPendentesAtrasadas.length >
                      0
                        ? "text-coral"
                        : "text-emerald-400"
                    }
                  />

                  <span className="text-[10px] text-ink-muted">
                    Doses pendentes
                  </span>
                </div>

                <p className="mt-1 font-mono text-lg font-bold text-ink-primary">
                  {
                    dosesPendentesAtrasadas.length
                  }
                </p>
              </button>

              <button
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/hoje"
                  );
                }}
                className="rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.97]"
              >
                <div className="flex items-center gap-2">
                  <ClipboardList
                    size={15}
                    className="text-violet-400"
                  />

                  <span className="text-[10px] text-ink-muted">
                    Doses tomadas
                  </span>
                </div>

                <p className="mt-1 font-mono text-lg font-bold text-ink-primary">
                  {
                    dosesTomadasHoje
                  }
                </p>
              </button>
            </div>

            <button
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.push(
                  "/hoje"
                );
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-ice/20 bg-ice/10 px-4 py-3 text-xs font-semibold text-ice transition-all hover:bg-ice/15 active:scale-[0.985]"
            >
              Ver meu dia

              <ChevronRight
                size={15}
              />
            </button>
          </motion.section>

          {/* ===================================================
              ATENÇÃO
          =================================================== */}

          {unifiedAlerts.length >
            0 && (
            <motion.section
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.24,
                delay: 0.04,
              }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-coral/10 text-coral">
                    <Bell
                      size={16}
                    />
                  </div>

                  <div>
                    <h2 className="font-display text-sm font-semibold text-ink-primary">
                      Atenção
                    </h2>

                    <p className="text-[10px] text-ink-muted">
                      Prioridades calculadas
                      a partir dos seus
                      registros
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-coral/10 px-2.5 py-1 text-[10px] font-semibold text-coral">
                  {
                    unifiedAlerts.length
                  }
                </span>
              </div>

              <div
                className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 scrollbar-hide"
                style={{
                  scrollbarWidth:
                    "none",

                  msOverflowStyle:
                    "none",
                }}
              >
                {unifiedAlerts.map(
                  (alert) => (
                    <div
                      key={
                        alert.id
                      }
                      className="w-[90%] max-w-[350px] shrink-0 snap-start"
                    >
                      <AlertRow
                        alert={
                          alert
                        }
                      />
                    </div>
                  )
                )}

                <div className="w-2 shrink-0" />
              </div>
            </motion.section>
          )}

          {/* ===================================================
              COMPROMISSOS DE HOJE
          =================================================== */}

          {totalCompromissosHoje >
            0 && (
            <motion.section
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.24,
                delay: 0.06,
              }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ice/10 text-ice">
                    <Calendar
                      size={16}
                    />
                  </div>

                  <div>
                    <h2 className="font-display text-sm font-semibold text-ink-primary">
                      Hoje
                    </h2>

                    <p className="text-[10px] text-ink-muted">
                      Seus compromissos
                      clínicos
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    router.push(
                      "/hoje"
                    );
                  }}
                  className="text-[10px] font-semibold text-ice"
                >
                  Ver agenda
                </button>
              </div>

              <div
                className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 scrollbar-hide"
                style={{
                  scrollbarWidth:
                    "none",

                  msOverflowStyle:
                    "none",
                }}
              >
                {consultasHoje.map(
                  (
                    consulta: any
                  ) => (
                    <div
                      key={
                        consulta.id
                      }
                      className="w-[85%] max-w-[320px] shrink-0 snap-start"
                    >
                      <button
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/consultas/detalhes?id=${consulta.id}`
                          );
                        }}
                        className="flex w-full items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all hover:border-ice/30 active:scale-[0.985]"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                          <Stethoscope
                            size={
                              18
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {consulta.especialidade ||
                              "Consulta"}
                          </p>

                          <p className="truncate text-[11px] text-ink-muted">
                            {consulta.medico
                              ? `Dr(a). ${consulta.medico}`
                              : "Profissional não informado"}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-mono text-xs font-bold text-coral">
                            {consulta.horario ||
                              "Hoje"}
                          </p>

                          <ChevronRight
                            size={
                              14
                            }
                            className="ml-auto mt-1 text-ink-faint"
                          />
                        </div>
                      </button>
                    </div>
                  )
                )}

                {cirurgiasHoje.map(
                  (
                    cirurgia: any
                  ) => (
                    <div
                      key={
                        cirurgia.id
                      }
                      className="w-[85%] max-w-[320px] shrink-0 snap-start"
                    >
                      <button
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/cirurgias/detalhes?id=${cirurgia.id}`
                          );
                        }}
                        className="flex w-full items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all hover:border-violet-400/30 active:scale-[0.985]"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-400">
                          <Syringe
                            size={
                              18
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {cirurgia.procedimento ||
                              "Cirurgia"}
                          </p>

                          <p className="text-[11px] text-ink-muted">
                            Procedimento
                            agendado
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-mono text-xs font-bold text-coral">
                            Hoje
                          </p>

                          <ChevronRight
                            size={
                              14
                            }
                            className="ml-auto mt-1 text-ink-faint"
                          />
                        </div>
                      </button>
                    </div>
                  )
                )}

                {examesHoje.map(
                  (
                    exame: any
                  ) => (
                    <div
                      key={
                        exame.id
                      }
                      className="w-[85%] max-w-[320px] shrink-0 snap-start"
                    >
                      <button
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/exames/detalhes?id=${exame.id}`
                          );
                        }}
                        className="flex w-full items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all hover:border-emerald-400/30 active:scale-[0.985]"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                          <FlaskConical
                            size={
                              18
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {exame.nome ||
                              "Exame"}
                          </p>

                          <p className="text-[11px] text-ink-muted">
                            Exame para
                            hoje
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-mono text-xs font-bold text-coral">
                            Hoje
                          </p>

                          <ChevronRight
                            size={
                              14
                            }
                            className="ml-auto mt-1 text-ink-faint"
                          />
                        </div>
                      </button>
                    </div>
                  )
                )}

                <div className="w-2 shrink-0" />
              </div>
            </motion.section>
          )}

          {/* ===================================================
              MEDICAMENTOS
          =================================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.08,
            }}
            className="rounded-[26px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <Pill
                    size={19}
                  />
                </div>

                <div>
                  <h2 className="font-display text-sm font-semibold text-ink-primary">
                    Medicamentos
                  </h2>

                  <p className="text-[10px] text-ink-muted">
                    Acompanhamento da
                    rotina de doses
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/saude/medicamentos"
                  );
                }}
                className="text-[10px] font-semibold text-ice"
              >
                Ver todos
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/60 p-3">
                <p className="text-[10px] text-ink-muted">
                  Ativos
                </p>

                <p className="mt-1 font-mono text-xl font-bold text-ink-primary">
                  {
                    medicamentosAtivos.length
                  }
                </p>

                <p className="mt-1 text-[10px] text-ink-muted">
                  medicamentos
                </p>
              </div>

              <div
                className={`rounded-2xl border p-3 ${
                  dosesPendentesAtrasadas.length >
                  0
                    ? "border-coral/20 bg-coral/5"
                    : "border-emerald-400/20 bg-emerald-400/5"
                }`}
              >
                <p className="text-[10px] text-ink-muted">
                  Pendentes
                </p>

                <p
                  className={`mt-1 font-mono text-xl font-bold ${
                    dosesPendentesAtrasadas.length >
                    0
                      ? "text-coral"
                      : "text-emerald-400"
                  }`}
                >
                  {
                    dosesPendentesAtrasadas.length
                  }
                </p>

                <p className="mt-1 text-[10px] text-ink-muted">
                  doses vencidas
                  hoje
                </p>
              </div>
            </div>

            {dosesPendentesAtrasadas.length >
              0 && (
              <button
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setModalPendenciasAberto(
                    true
                  );
                }}
                className="mt-3 flex w-full items-center justify-between rounded-2xl border border-coral/20 bg-coral/5 px-3.5 py-3 text-left transition-all active:scale-[0.985]"
              >
                <div className="flex items-center gap-2.5">
                  <Clock
                    size={16}
                    className="text-coral"
                  />

                  <div>
                    <p className="text-xs font-semibold text-ink-primary">
                      Existem doses
                      pendentes
                    </p>

                    <p className="text-[10px] text-ink-muted">
                      Revise apenas as
                      doses cujo horário
                      já passou
                    </p>
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  className="text-coral"
                />
              </button>
            )}
          </motion.section>

          {/* ===================================================
              TRATAMENTOS
          =================================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.12,
            }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                  <FolderHeart
                    size={16}
                  />
                </div>

                <div>
                  <h2 className="font-display text-sm font-semibold text-ink-primary">
                    Tratamentos
                  </h2>

                  <p className="text-[10px] text-ink-muted">
                    Condições e
                    acompanhamentos
                    registrados
                  </p>
                </div>
              </div>

              {tratamentos.length >
                0 && (
                <button
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    router.push(
                      "/saude/tratamentos"
                    );
                  }}
                  className="text-[10px] font-semibold text-ice"
                >
                  Ver todos
                </button>
              )}
            </div>

            {tratamentos.length ===
            0 ? (
              <div className="rounded-[24px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-6 text-center">
                <FolderHeart
                  size={22}
                  className="mx-auto mb-2 text-ink-faint"
                />

                <p className="text-sm text-ink-muted">
                  Nenhum tratamento
                  cadastrado.
                </p>
              </div>
            ) : (
              <div
                className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 scrollbar-hide"
                style={{
                  scrollbarWidth:
                    "none",

                  msOverflowStyle:
                    "none",
                }}
              >
                {tratamentos.map(
                  (
                    tratamento: any
                  ) => {
                    const Icon =
                      getTratamentoIcon(
                        tratamento.nome
                      );

                    const cor =
                      tratamento.cor ||
                      "#8B5CF6";

                    return (
                      <div
                        key={
                          tratamento.id
                        }
                        className="w-[85%] max-w-[320px] shrink-0 snap-start"
                      >
                        <button
                          onClick={() => {
                            trigger(
                              "vibrate"
                            );

                            router.push(
                              `/saude/tratamentos/detalhes?id=${tratamento.id}`
                            );
                          }}
                          className="flex w-full items-center justify-between overflow-hidden rounded-[22px] border bg-surface p-4 text-left shadow-sm transition-all hover:bg-surface-raised/80 active:scale-[0.985]"
                          style={{
                            borderColor:
                              `${cor}30`,

                            borderLeftWidth:
                              4,

                            borderLeftColor:
                              cor,
                          }}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                              style={{
                                backgroundColor:
                                  `${cor}15`,

                                color:
                                  cor,
                              }}
                            >
                              <Icon
                                size={
                                  19
                                }
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink-primary">
                                {
                                  tratamento.nome
                                }
                              </p>

                              <p className="truncate text-[11px] text-ink-muted">
                                {tratamento.status ===
                                "ativo"
                                  ? "Em andamento"
                                  : tratamento.status ===
                                      "concluido"
                                    ? "Concluído"
                                    : "Suspenso"}
                              </p>
                            </div>
                          </div>

                          <ChevronRight
                            size={
                              16
                            }
                            className="shrink-0 text-ink-faint"
                          />
                        </button>
                      </div>
                    );
                  }
                )}

                <div className="w-2 shrink-0" />
              </div>
            )}
          </motion.section>

          {/* ===================================================
              ACESSO RÁPIDO
          =================================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.14,
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList
                size={15}
                className="text-ice"
              />

              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Acesso rápido
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map(
                (action) => {
                  const Icon =
                    action.icon;

                  return (
                    <button
                      key={
                        action.id
                      }
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          action.path
                        );
                      }}
                      className="flex items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all hover:bg-surface-raised/80 active:scale-[0.985]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        <Icon
                          size={
                            18
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-primary">
                          {
                            action.label
                          }
                        </p>

                        <p className="truncate text-[10px] text-ink-muted">
                          {
                            action.description
                          }
                        </p>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </motion.section>

          {/* ===================================================
              PRONTUÁRIO
          =================================================== */}

          <motion.button
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.16,
            }}
            onClick={() => {
              trigger(
                "vibrate"
              );

              router.push(
                "/saude/registros"
              );
            }}
            className="flex w-full items-center justify-between rounded-[24px] border border-ice/20 bg-gradient-to-r from-ice/10 to-surface p-4 text-left shadow-sm transition-all hover:border-ice/40 active:scale-[0.985]"
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-ice/20 bg-ice/10 text-ice">
                <Activity
                  size={21}
                />
              </div>

              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-ink-primary">
                  Prontuário de
                  sintomas e medições
                </p>

                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  Acompanhe sintomas,
                  medições e evolução
                </p>
              </div>
            </div>

            <ChevronRight
              size={18}
              className="shrink-0 text-ice"
            />
          </motion.button>

          {/* ===================================================
              VERSÍCULO
          =================================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.18,
            }}
          >
            <VersiculoDia />
          </motion.section>

          {/* ===================================================
              MEUS ARQUIVOS
          =================================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.2,
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <FolderHeart
                size={15}
                className="text-ice"
              />

              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Meus arquivos
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/saude/documentos"
                  );
                }}
                className="flex flex-col items-start gap-2 rounded-[22px] border border-ice/20 bg-gradient-to-br from-ice/5 to-surface p-4 text-left shadow-sm transition-all hover:border-ice/40 active:scale-[0.97]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <FolderHeart
                    size={18}
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink-primary">
                    Saúde
                  </p>

                  <p className="text-[10px] leading-tight text-ink-muted">
                    Receitas, laudos e
                    exames
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className="mt-1 self-end text-ice/70"
                />
              </button>

              <button
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/documentos"
                  );
                }}
                className="flex flex-col items-start gap-2 rounded-[22px] border border-ice/20 bg-gradient-to-br from-ice/5 to-surface p-4 text-left shadow-sm transition-all hover:border-ice/40 active:scale-[0.97]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ice/10 text-ice">
                  <FolderLock
                    size={18}
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink-primary">
                    Pessoal
                  </p>

                  <p className="text-[10px] leading-tight text-ink-muted">
                    Documentos,
                    contratos e
                    certidões
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className="mt-1 self-end text-ice/70"
                />
              </button>
            </div>
          </motion.section>

          {/* ===================================================
              RESUMO FINANCEIRO
          =================================================== */}

          <motion.button
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.22,
            }}
            onClick={() => {
              trigger(
                "vibrate"
              );

              router.push(
                "/saude/renovacao"
              );
            }}
            className="flex w-full items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all hover:border-emerald-400/30 active:scale-[0.985]"
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <WalletCards
                  size={21}
                />
              </div>

              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-muted">
                  Compras de
                  medicamentos
                </p>

                <p className="mt-0.5 font-mono text-lg font-bold text-ink-primary">
                  R${" "}
                  {metricasFinanceiras.gastoMesAtual
                    .toFixed(2)
                    .replace(
                      ".",
                      ","
                    )}
                </p>

                {metricasFinanceiras.diff !==
                  0 && (
                  <p
                    className={`mt-0.5 text-[10px] font-bold ${
                      metricasFinanceiras.diff >
                      0
                        ? "text-coral"
                        : "text-emerald-400"
                    }`}
                  >
                    {metricasFinanceiras.diff >
                    0
                      ? "+"
                      : "-"}{" "}
                    R${" "}
                    {Math.abs(
                      metricasFinanceiras.diff
                    )
                      .toFixed(
                        2
                      )
                      .replace(
                        ".",
                        ","
                      )}{" "}
                    vs. mês passado
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-ice">
              <span>
                Histórico
              </span>

              <ChevronRight
                size={15}
              />
            </div>
          </motion.button>

          {/* ===================================================
              REDE
          =================================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.24,
            }}
            className="rounded-[24px] border border-surface-border/50 bg-surface p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-ink-primary">
                  Sua rede
                </h2>

                <p className="mt-0.5 text-[10px] text-ink-muted">
                  Profissionais,
                  estabelecimentos e
                  vínculos clínicos
                </p>
              </div>

              <button
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/saude/rede"
                  );
                }}
                className="rounded-full bg-ice/10 px-3 py-1.5 text-[10px] font-medium text-ice transition-colors hover:bg-ice/20"
              >
                Ver rede
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {redeActions.map(
                (item) => {
                  const Icon =
                    item.icon;

                  const iconClass =
                    item.id ===
                    "medicos"
                      ? "text-ice"
                      : item.id ===
                          "farmacias"
                        ? "text-amber-400"
                        : item.id ===
                            "hospitais"
                          ? "text-ice"
                          : item.id ===
                              "cids"
                            ? "text-violet-400"
                            : "text-emerald-400";

                  return (
                    <button
                      key={
                        item.id
                      }
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          item.path
                        );
                      }}
                      className="flex min-h-[82px] flex-col items-center justify-center rounded-2xl border border-transparent bg-surface-raised/60 px-2 py-3 transition-all hover:border-surface-border/50 hover:bg-surface-raised active:scale-95"
                    >
                      <Icon
                        size={
                          17
                        }
                        className={
                          iconClass
                        }
                      />

                      <p className="mt-1 font-display text-base font-semibold text-ink-primary">
                        {
                          item.count
                        }
                      </p>

                      <p className="text-[10px] text-ink-muted">
                        {
                          item.label
                        }
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </motion.section>
        </section>

        {/* =====================================================
            MODAL DE DOSES
        ===================================================== */}

        <PendingDosesModal
          isOpen={
            modalPendenciasAberto
          }
          onClose={() => {
            trigger(
              "vibrate"
            );

            setModalPendenciasAberto(
              false
            );
          }}
          doses={
            dosesPendentesAtrasadas
          }
          onTomarDose={
            handleTomarDosePendente
          }
          onTomarTodas={
            handleTomarTodasAtrasadas
          }
          isProcessingDose={
            processandoDoseId
          }
          isProcessingAll={
            isProcessandoTudo
          }
          onExpand={() => {
            setModalPendenciasAberto(
              false
            );

            router.push(
              "/hoje"
            );
          }}
        />
      </main>
    </PageTransition>
  );
}