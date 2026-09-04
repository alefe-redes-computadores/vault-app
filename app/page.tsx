// app/page.tsx
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
  CheckCircle2,
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
import { useHealthIntelligence } from "@/hooks/useHealthIntelligence";

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
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
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

  const healthIntelligence =
    useHealthIntelligence();

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

  const totalDosesPlanejadasHoje =
    useMemo(
      () =>
        medicamentosAtivos.reduce(
          (
            total,
            medicamento
          ) =>
            medicamento.tipo_uso ===
            "continuo"
              ? total +
                (
                  medicamento.estoque_horarios ||
                  []
                ).filter(
                  Boolean
                ).length
              : total,
          0
        ),
      [medicamentosAtivos]
    );

  const dosesTomadasDaRotinaHoje =
    useMemo(
      () =>
        medicamentosAtivos.reduce(
          (
            total,
            medicamento
          ) => {
            if (
              !medicamento.id ||
              medicamento.tipo_uso !==
                "continuo"
            ) {
              return total;
            }

            const horarios =
              (
                medicamento.estoque_horarios ||
                []
              ).filter(
                Boolean
              );

            return (
              total +
              horarios.filter(
                (
                  horario
                ) =>
                  doseLogs.some(
                    (
                      log
                    ) =>
                      log.medicamento_id ===
                        medicamento.id &&
                      log.horario ===
                        horario &&
                      Boolean(
                        log.tomado_em
                      )
                  )
              ).length
            );
          },
          0
        ),
      [
        medicamentosAtivos,
        doseLogs,
      ]
    );

  const progressoDosesHoje =
    totalDosesPlanejadasHoje >
    0
      ? Math.min(
          100,
          Math.round(
            (
              dosesTomadasDaRotinaHoje /
              totalDosesPlanejadasHoje
            ) *
              100
          )
        )
      : 0;

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

  /*
   * Alertas imediatos continuam no bloco Atenção.
   *
   * Esta seleção contém somente padrões longitudinais:
   * - com destino navegável;
   * - confiança média ou alta;
   * - sem repetir estoque e renovação;
   * - limitados para não sobrecarregar a Home.
   */
  const longitudinalHighlights =
    healthIntelligence.highlights;

  const resumoContextual =
    useMemo(
      () => {
        if (
          dosesPendentesAtrasadas.length >
          0
        ) {
          return {
            eyebrow:
              "Ação agora",

            title:
              dosesPendentesAtrasadas.length ===
              1
                ? "Uma dose está aguardando"
                : `${dosesPendentesAtrasadas.length} doses estão aguardando`,

            description:
              "Resolva as pendências da rotina sem sair da Home.",

            color:
              "#FB7185",
          };
        }

        if (
          totalCompromissosHoje >
          0
        ) {
          return {
            eyebrow:
              "Agenda de hoje",

            title:
              totalCompromissosHoje ===
              1
                ? "Você tem um compromisso"
                : `Você tem ${totalCompromissosHoje} compromissos`,

            description:
              "Sua agenda clínica está organizada logo abaixo.",

            color:
              "#38BDF8",
          };
        }

        if (
          unifiedAlerts.length >
          0
        ) {
          return {
            eyebrow:
              "Tudo sob controle",

            title:
              "Rotina em dia",

            description:
              `${unifiedAlerts.length} lembrete${
                unifiedAlerts.length ===
                1
                  ? ""
                  : "s"
              } para planejar com calma.`,

            color:
              "#34D399",
          };
        }

        return {
          eyebrow:
            "Tudo sob controle",

          title:
            "Seu dia está tranquilo",

          description:
            "Nenhuma pendência clínica pede atenção agora.",

          color:
            "#34D399",
        };
      },
      [
        dosesPendentesAtrasadas.length,
        totalCompromissosHoje,
        unifiedAlerts.length,
      ]
    );

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

        const dataFinanceira =
          renovacao.data_aquisicao?.trim() ||
          renovacao.data?.trim();

        if (
          !Number.isFinite(
            preco
          ) ||
          preco <= 0 ||
          !dataFinanceira
        ) {
          continue;
        }

        const parts =
          dataFinanceira.split(
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
    mostrarTodosAlertas,
    setMostrarTodosAlertas,
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

      description:
        "Profissionais",

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

      description:
        "Compras e retiradas",

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

      description:
        "Rede hospitalar",

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

      description:
        "Clínicas, UBS e labs",

      icon:
        MapPin,

      path:
        "/saude/locais",

      count:
        locais.length,
    },
  ];

  // ==========================================================
  // LOADING
  // ==========================================================

  if (authLoading) {
    return (
      <main className="min-h-screen bg-void px-5 pb-36 pt-6">
        <div className="mb-6 space-y-3">
          <div className="h-5 w-32 animate-pulse rounded-lg bg-surface-raised" />
          <div className="h-9 w-52 animate-pulse rounded-xl bg-surface-raised" />
        </div>

        <div className="mb-5 h-44 animate-pulse rounded-[28px] border border-surface-border/50 bg-surface" />

        <CardListSkeleton />
      </main>
    );
  }

  // ==========================================================
  // VIEW
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen overflow-x-hidden bg-void pb-36">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/85 px-5 pb-3 pt-safe backdrop-blur-xl">
          <motion.div
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.22,
            }}
            className="flex items-center justify-between gap-3"
          >
            <button
              type="button"
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
                <span className="glow-ice flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
                  <img
                    src={
                      avatarUrl
                    }
                    alt={
                      displayName
                    }
                    loading="lazy"
                    className="h-full w-full rounded-full object-cover"
                  />
                </span>
              ) : (
                <div className="ring-gradient glow-ice flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-void">
                  {displayName
                    .charAt(
                      0
                    )
                    .toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-ice/80">
                  Vault Saúde
                </p>

                <h1 className="mt-0.5 truncate font-display text-base font-semibold text-ink-primary">
                  Olá,{" "}
                  {
                    displayName.split(
                      " "
                    )[0]
                  }
                </h1>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.push(
                  "/hoje"
                );
              }}
              className="flex shrink-0 items-center gap-2 rounded-full border border-surface-border/50 bg-surface px-3 py-2 text-[10px] font-semibold text-ink-muted shadow-sm transition-all active:scale-95"
            >
              <Clock
                size={
                  13
                }
                className="text-ice"
              />

              {
                horaAtual
              }
            </button>
          </motion.div>
        </header>

        <section className="space-y-6 px-5 pt-5">
          {/* ===================================================
              HOJE
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
            className="relative overflow-hidden rounded-[30px] border border-ice/20 bg-gradient-to-br from-ice/10 via-surface to-surface shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
          >
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.push(
                  "/hoje"
                );
              }}
              className="flex w-full items-center justify-between gap-4 px-5 pb-3 pt-5 text-left transition-all active:bg-surface-raised/40"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CalendarDays
                    size={
                      14
                    }
                    className="text-ice"
                  />

                  <p
                    className="font-mono text-[9px] uppercase tracking-[0.22em]"
                    style={{
                      color:
                        resumoContextual.color,
                    }}
                  >
                    {resumoContextual.eyebrow}
                  </p>
                </div>

                <p className="mt-1 font-display text-xl font-semibold leading-tight text-ink-primary">
                  {resumoContextual.title}
                </p>

                <p className="mt-1 max-w-[250px] text-[11px] leading-relaxed text-ink-muted">
                  {resumoContextual.description}
                </p>
              </div>

              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                style={{
                  borderColor:
                    `${resumoContextual.color}35`,

                  backgroundColor:
                    `${resumoContextual.color}14`,

                  color:
                    resumoContextual.color,
                }}
              >
                <HeartPulse
                  size={
                    19
                  }
                />
              </div>
            </button>

            <div className="px-5 pb-4">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-[9px] font-medium text-ink-muted">
                <span>
                  Doses de hoje
                </span>

                <span className="font-mono text-ink-primary">
                  {dosesTomadasDaRotinaHoje}/
                  {totalDosesPlanejadasHoje}
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
                <motion.div
                  initial={{
                    width:
                      0,
                  }}
                  animate={{
                    width:
                      `${progressoDosesHoje}%`,
                  }}
                  transition={{
                    duration:
                      0.45,
                  }}
                  className="h-full rounded-full bg-gradient-to-r from-ice to-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 border-t border-surface-border/40">
              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/hoje"
                  );
                }}
                className="border-r border-surface-border/40 px-2 py-3 text-center transition-colors active:bg-surface-raised/50"
              >
                <div className="flex flex-col items-center gap-1 text-[8px] text-ink-muted">
                  <Calendar
                    size={
                      13
                    }
                    className="text-ice"
                  />

                  Compromissos
                </div>

                <p className="mt-1 font-mono text-base font-bold text-ink-primary">
                  {
                    totalCompromissosHoje
                  }
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setModalPendenciasAberto(
                    true
                  );
                }}
                className="border-r border-surface-border/40 px-2 py-3 text-center transition-colors active:bg-surface-raised/50"
              >
                <div className="flex flex-col items-center gap-1 text-[8px] text-ink-muted">
                  <Clock
                    size={
                      13
                    }
                    className={
                      dosesPendentesAtrasadas.length >
                      0
                        ? "text-coral"
                        : "text-emerald-400"
                    }
                  />

                  Pendentes
                </div>

                <p
                  className={`mt-1 font-mono text-base font-bold ${
                    dosesPendentesAtrasadas.length >
                    0
                      ? "text-coral"
                      : "text-ink-primary"
                  }`}
                >
                  {
                    dosesPendentesAtrasadas.length
                  }
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/saude/medicamentos"
                  );
                }}
                className="border-r border-surface-border/40 px-2 py-3 text-center transition-colors active:bg-surface-raised/50"
              >
                <div className="flex flex-col items-center gap-1 text-[8px] text-ink-muted">
                  <Pill
                    size={
                      13
                    }
                    className="text-emerald-400"
                  />

                  Medicamentos
                </div>

                <p className="mt-1 font-mono text-base font-bold text-ink-primary">
                  {
                    medicamentosAtivos.length
                  }
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/hoje"
                  );
                }}
                className="px-2 py-3 text-center transition-colors active:bg-surface-raised/50"
              >
                <div className="flex flex-col items-center gap-1 text-[8px] text-ink-muted">
                  <CheckCircle2
                    size={
                      13
                    }
                    className="text-violet-400"
                  />

                  Tomadas
                </div>

                <p className="mt-1 font-mono text-base font-bold text-ink-primary">
                  {
                    dosesTomadasHoje
                  }
                </p>
              </button>
            </div>
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
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Bell
                      size={
                        15
                      }
                      className="text-coral"
                    />

                    <h2 className="font-display text-sm font-semibold text-ink-primary">
                      Atenção
                    </h2>
                  </div>

                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    O que merece prioridade agora
                  </p>
                </div>

                <span className="rounded-full border border-coral/20 bg-coral/10 px-2.5 py-1 font-mono text-[9px] font-semibold text-coral">
                  {
                    unifiedAlerts.length
                  }
                </span>
              </div>

              <div
                className="space-y-2"
              >
                {(
                  mostrarTodosAlertas
                    ? unifiedAlerts
                    : unifiedAlerts.slice(
                        0,
                        3
                      )
                ).map(
                  (
                    alert
                  ) => (
                    <div
                      key={
                        alert.id
                      }
                      className="w-full"
                    >
                      <AlertRow
                        alert={
                          alert
                        }
                      />
                    </div>
                  )
                )}

                {unifiedAlerts.length >
                  3 && (
                  <button
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setMostrarTodosAlertas(
                        (
                          previous
                        ) =>
                          !previous
                      );
                    }}
                    className="flex w-full items-center justify-center gap-1 rounded-2xl border border-surface-border/40 bg-surface/50 py-2.5 text-[10px] font-semibold text-ice transition-all active:scale-[0.985]"
                  >
                    {mostrarTodosAlertas
                      ? "Mostrar menos"
                      : `Ver mais ${
                          unifiedAlerts.length -
                          3
                        } lembrete${
                          unifiedAlerts.length -
                            3 ===
                          1
                            ? ""
                            : "s"
                        }`}
                  </button>
                )}

              </div>
            </motion.section>
          )}

          {/* ===================================================
              PADRÕES PERCEBIDOS
          =================================================== */}

          {longitudinalHighlights.length >
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
                delay: 0.05,
              }}
              className="space-y-3"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity
                      size={15}
                      className="text-violet-400"
                    />

                    <h2 className="font-display text-sm font-semibold text-ink-primary">
                      Padrões percebidos
                    </h2>
                  </div>

                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    {
                      healthIntelligence
                        .maturity
                        .label
                    }

                    {" · "}

                    {
                      healthIntelligence
                        .maturity
                        .totalRecords
                    }

                    {" registros analisados"}
                  </p>
                </div>

                <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 font-mono text-[9px] font-semibold text-violet-300">
                  {
                    healthIntelligence
                      .maturity
                      .sourcesWithData
                  }

                  /

                  {
                    healthIntelligence
                      .maturity
                      .totalSources
                  }

                  {" fontes"}
                </span>
              </div>

              <div className="space-y-2">
                {longitudinalHighlights.map(
                  (
                    insight
                  ) => (
                    <button
                      key={
                        insight.id
                      }
                      type="button"
                      onClick={() => {
                        const link =
                          insight.link;

                        if (
                          !link
                        ) {
                          return;
                        }

                        trigger(
                          "vibrate"
                        );

                        router.push(
                          link
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-[22px] border border-violet-400/20 bg-violet-400/[0.04] p-3.5 text-left transition-all active:scale-[0.985]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">
                        <Activity
                          size={17}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-violet-400/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-violet-300">
                            {
                              insight
                                .categoria
                                .replace(
                                  "_",
                                  " "
                                )
                            }
                          </span>

                          <span className="text-[9px] text-ink-faint">
                            Confiança{" "}
                            {
                              insight.confianca
                            }

                            {" · amostra "}

                            {
                              insight.amostra
                            }
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-1 text-xs font-bold text-ink-primary">
                          {
                            insight.titulo
                          }
                        </p>

                        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-ink-muted">
                          {
                            insight.mensagem
                          }
                        </p>
                      </div>

                      <ChevronRight
                        size={15}
                        className="shrink-0 text-violet-300"
                      />
                    </button>
                  )
                )}
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar
                      size={
                        15
                      }
                      className="text-ice"
                    />

                    <h2 className="font-display text-sm font-semibold text-ink-primary">
                      Próximos de hoje
                    </h2>
                  </div>

                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    Sua agenda clínica do dia
                  </p>
                </div>

                <button
                  type="button"
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
                className="space-y-2"
              >
                {consultasHoje.map(
                  (
                    consulta: any
                  ) => (
                    <button
                      type="button"
                      key={
                        consulta.id
                      }
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/consultas/detalhes?id=${consulta.id}`
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-[20px] border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all active:scale-[0.985]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                        <Stethoscope
                          size={
                            17
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-primary">
                          {consulta.especialidade ||
                            "Consulta"}
                        </p>

                        <p className="truncate text-[10px] text-ink-muted">
                          {consulta.medico
                            ? `Dr(a). ${consulta.medico}`
                            : "Profissional não informado"}
                        </p>
                      </div>

                      <span className="shrink-0 font-mono text-[11px] font-semibold text-coral">
                        {consulta.horario ||
                          "Hoje"}
                      </span>
                    </button>
                  )
                )}

                {cirurgiasHoje.map(
                  (
                    cirurgia: any
                  ) => (
                    <button
                      type="button"
                      key={
                        cirurgia.id
                      }
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/cirurgias/detalhes?id=${cirurgia.id}`
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-[20px] border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all active:scale-[0.985]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-400">
                        <Syringe
                          size={
                            17
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-primary">
                          {cirurgia.procedimento ||
                            "Cirurgia"}
                        </p>

                        <p className="text-[10px] text-ink-muted">
                          Procedimento agendado
                        </p>
                      </div>

                      <span className="shrink-0 font-mono text-[11px] font-semibold text-coral">
                        Hoje
                      </span>
                    </button>
                  )
                )}

                {examesHoje.map(
                  (
                    exame: any
                  ) => (
                    <button
                      type="button"
                      key={
                        exame.id
                      }
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/exames/detalhes?id=${exame.id}`
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-[20px] border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all active:scale-[0.985]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                        <FlaskConical
                          size={
                            17
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-primary">
                          {exame.nome ||
                            "Exame"}
                        </p>

                        <p className="text-[10px] text-ink-muted">
                          Exame programado para hoje
                        </p>
                      </div>

                      <span className="shrink-0 font-mono text-[11px] font-semibold text-coral">
                        Hoje
                      </span>
                    </button>
                  )
                )}

              </div>
            </motion.section>
          )}

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
              delay: 0.08,
            }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FolderHeart
                    size={
                      15
                    }
                    className="text-violet-400"
                  />

                  <h2 className="font-display text-sm font-semibold text-ink-primary">
                    Tratamentos
                  </h2>
                </div>

                <p className="mt-0.5 text-[10px] text-ink-muted">
                  Acompanhamentos desta pessoa
                </p>
              </div>

              {tratamentos.length >
                0 && (
                <button
                  type="button"
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
              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/saude/tratamentos"
                  );
                }}
                className="flex w-full items-center justify-between rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-4 text-left transition-all active:scale-[0.985]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                    <FolderHeart
                      size={
                        16
                      }
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-ink-primary">
                      Nenhum tratamento cadastrado
                    </p>

                    <p className="text-[10px] text-ink-muted">
                      Toque para acessar Tratamentos
                    </p>
                  </div>
                </div>

                <ChevronRight
                  size={
                    15
                  }
                  className="text-ink-faint"
                />
              </button>
            ) : (
              <div
                className="grid grid-cols-2 gap-2.5"
              >
                {tratamentos
                  .slice(
                    0,
                    4
                  )
                  .map(
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
                      <button
                        type="button"
                        key={
                          tratamento.id
                        }
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/tratamentos/detalhes?id=${tratamento.id}`
                          );
                        }}
                        className="flex min-h-[82px] w-full items-center justify-between overflow-hidden rounded-[20px] border bg-surface p-3 text-left shadow-sm transition-all active:scale-[0.985]"
                        style={{
                          borderColor:
                            `${cor}30`,

                          borderLeftWidth:
                            3,

                          borderLeftColor:
                            cor,
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor:
                                `${cor}15`,

                              color:
                                cor,
                            }}
                          >
                            <Icon
                              size={
                                17
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-primary">
                              {
                                tratamento.nome
                              }
                            </p>

                            <p className="truncate text-[10px] text-ink-muted">
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
                            15
                          }
                          className="shrink-0 text-ink-faint"
                        />
                      </button>
                    );
                  }
                )}

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
              delay: 0.1,
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList
                size={
                  15
                }
                className="text-ice"
              />

              <div>
                <h2 className="font-display text-sm font-semibold text-ink-primary">
                  Acesso rápido
                </h2>

                <p className="mt-0.5 text-[10px] text-ink-muted">
                  Rotas clínicas mais usadas
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {quickActions.map(
                (
                  action
                ) => {
                  const Icon =
                    action.icon;

                  return (
                    <button
                      type="button"
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
                      className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-[20px] border border-surface-border/50 bg-surface px-2 py-3 text-center shadow-sm transition-all active:scale-[0.975]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        <Icon
                          size={
                            16
                          }
                        />
                      </div>

                      <div className="min-w-0 max-w-full">
                        <p className="truncate text-[10px] font-semibold text-ink-primary">
                          {
                            action.label
                          }
                        </p>

                        <p className="hidden">
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
            type="button"
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
            onClick={() => {
              trigger(
                "vibrate"
              );

              router.push(
                "/saude/registros"
              );
            }}
            className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-ice/20 bg-gradient-to-r from-ice/10 to-surface px-4 py-3.5 text-left shadow-sm transition-all active:scale-[0.985]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                <Activity
                  size={
                    18
                  }
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-primary">
                  Prontuário
                </p>

                <p className="truncate text-[10px] text-ink-muted">
                  Sintomas, medições e evolução
                </p>
              </div>
            </div>

            <ChevronRight
              size={
                16
              }
              className="shrink-0 text-ice"
            />
          </motion.button>

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
              delay: 0.14,
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <FolderLock
                size={
                  15
                }
                className="text-ice"
              />

              <div>
                <h2 className="font-display text-sm font-semibold text-ink-primary">
                  Meus arquivos
                </h2>

                <p className="mt-0.5 text-[10px] text-ink-muted">
                  Saúde e documentos pessoais
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/saude/documentos"
                  );
                }}
                className="flex min-h-[96px] flex-col justify-between rounded-[22px] border border-emerald-400/15 bg-gradient-to-br from-emerald-400/8 to-surface p-3.5 text-left shadow-sm transition-all active:scale-[0.975]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <FolderHeart
                    size={
                      16
                    }
                  />
                </div>

                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-ink-primary">
                      Saúde
                    </p>

                    <p className="mt-0.5 text-[9px] text-ink-muted">
                      Acervo clínico
                    </p>
                  </div>

                  <ChevronRight
                    size={
                      14
                    }
                    className="text-emerald-400/70"
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/documentos"
                  );
                }}
                className="flex min-h-[96px] flex-col justify-between rounded-[22px] border border-ice/15 bg-gradient-to-br from-ice/8 to-surface p-3.5 text-left shadow-sm transition-all active:scale-[0.975]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ice/10 text-ice">
                  <FolderLock
                    size={
                      16
                    }
                  />
                </div>

                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-ink-primary">
                      Pessoal
                    </p>

                    <p className="mt-0.5 text-[9px] text-ink-muted">
                      Cofre de documentos
                    </p>
                  </div>

                  <ChevronRight
                    size={
                      14
                    }
                    className="text-ice/70"
                  />
                </div>
              </button>
            </div>
          </motion.section>

          {/* ===================================================
              FINANCEIRO
          =================================================== */}

          <motion.button
            type="button"
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
                "/saude/renovacao"
              );
            }}
            className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-emerald-400/15 bg-gradient-to-r from-emerald-400/8 via-surface to-surface px-4 py-4 text-left shadow-sm transition-all active:scale-[0.985]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <WalletCards
                  size={
                    18
                  }
                />
              </div>

              <div className="min-w-0">
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink-muted">
                  Compras de medicamentos
                </p>

                <p className="mt-0.5 font-mono text-lg font-bold text-ink-primary">
                  R${" "}
                  {metricasFinanceiras.gastoMesAtual
                    .toFixed(
                      2
                    )
                    .replace(
                      ".",
                      ","
                    )}
                </p>

                {metricasFinanceiras.diff !==
                  0 && (
                  <p
                    className={`mt-0.5 text-[9px] font-semibold ${
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

            <div className="flex shrink-0 items-center gap-1 text-[9px] font-semibold text-ice">
              Histórico

              <ChevronRight
                size={
                  14
                }
              />
            </div>
          </motion.button>

          {/* ===================================================
              SUA REDE
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
            className="space-y-3"
          >
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Stethoscope
                    size={
                      15
                    }
                    className="text-ice"
                  />

                  <h2 className="font-display text-sm font-semibold text-ink-primary">
                    Sua rede
                  </h2>
                </div>

                <p className="mt-0.5 text-[10px] text-ink-muted">
                  Profissionais e estabelecimentos
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    "/saude/rede"
                  );
                }}
                className="text-[10px] font-semibold text-ice"
              >
                Ver rede
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {redeActions.map(
                (
                  item
                ) => {
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
                          ? "text-violet-400"
                          : "text-emerald-400";

                  return (
                    <button
                      type="button"
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
                      className="flex min-h-[78px] items-center gap-3 rounded-[20px] border border-surface-border/50 bg-surface px-3.5 py-3 text-left shadow-sm transition-all active:scale-[0.975]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised">
                        <Icon
                          size={
                            16
                          }
                          className={
                            iconClass
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="font-mono text-base font-bold text-ink-primary">
                          {
                            item.count
                          }
                        </p>

                        <p className="truncate text-[10px] font-medium text-ink-muted">
                          {
                            item.label
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
              VERSÍCULO — ENCERRAMENTO
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
            <VersiculoDia />
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
