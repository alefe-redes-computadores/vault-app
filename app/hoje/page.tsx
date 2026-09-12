// app/hoje/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Pill,
  Clock,
  AlertTriangle,
  Stethoscope,
  Calendar,
  FlaskConical,
  X,
  DollarSign,
  Filter,
  XCircle,
  FileWarning,
  AlertOctagon,
  Info,
  Activity,
  Sun,
  Moon,
  Sunrise,
  Zap,
  Trash2,
  RotateCcw,
  Loader2,
  ListChecks,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  safeAddRenovacao,
  safeUpdateMedicamento,
} from "@/lib/db";
import { EmptyState } from "@/components/EmptyState";
import {
  addDaysToLocalDate,
  computeEstoqueInfo,
  getLocalTodayISO,
  getDaysUntil,
} from "@/lib/health-utils";
import {
  isReceitaAtualVencida,sugerirRenovacao,
  isReceitaVencidaSegura,
  analisarComportamentoUso,
  analisarRotinaDiaria,
} from "@/lib/health-insights";
import { useToast } from "@/components/ToastProvider";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useRetiradas } from "@/hooks/useRetiradas";
import { QuickDoseModal } from "@/components/saude/QuickDoseModal";

type FiltroStatus = "todos" | "tomados" | "pendentes" | "ignorados";
type FiltroPeriodo = "todos" | "manha" | "tarde" | "noite";
type FiltroCompromisso =
  | "todos"
  | "consultas"
  | "cirurgias"
  | "exames"
  | "retiradas";

function getPeriodoDoDia(horario: string) {
  const safeHorario = horario || "00:00";
  const [h] = safeHorario.split(":").map(Number);

  if (h >= 5 && h < 12) {
    return {
      key: "manha",
      label: "Manhã",
      sub: "Comece o dia com foco",
      icon: Sunrise,
    };
  }

  if (h >= 12 && h < 18) {
    return {
      key: "tarde",
      label: "Tarde",
      sub: "Manutenção e constância",
      icon: Sun,
    };
  }

  return {
    key: "noite",
    label: "Noite",
    sub: "Encerramento e descanso",
    icon: Moon,
  };
}

function getDiasRestantesEstilo(
  dias: number | null | undefined
) {
  if (dias === null || dias === undefined) {
    return {
      cor: "text-ink-muted",
      bg: "bg-surface",
      label: "Indefinido",
      pulse: false,
    };
  }

  if (dias <= 3) {
    return {
      cor: "text-coral",
      bg: "bg-coral/10",
      label: "Urgente",
      pulse: true,
    };
  }

  if (dias <= 7) {
    return {
      cor: "text-amber-400",
      bg: "bg-amber-400/10",
      label: "Em breve",
      pulse: false,
    };
  }

  if (dias <= 14) {
    return {
      cor: "text-amber-300",
      bg: "bg-amber-300/5",
      label: "Atenção",
      pulse: false,
    };
  }

  return {
    cor: "text-emerald-400",
    bg: "bg-emerald-400/10",
    label: "Tranquilo",
    pulse: false,
  };
}

interface DoseItemExt {
  medicamentoId?: string;
  medicamentoNome?: string;
  dosagem?: string;
  horario: string;
  tomada: boolean;
  ignorada: boolean;
  cor: string;
  estoqueRestante?: number;
  estoqueTotal?: number;
  unidadeMedida?: string;
  unidadePorDose?: number;
  unidadeDose?: string;
  medicoNome?: string;
  medicoId?: string;
  tratamentoNome?: string;
  tratamentoId?: string;
  tratamentoCor?: string;
  farmaciaNome?: string;
  farmaciaId?: string;
  estabelecimentoNome?: string;
  estabelecimentoId?: string;
  proximaRenovacao?: string;
  diasRestantes?: number | null;
  insight?: {
    deveRenovar: boolean;
    mensagem: string;
    urgencia: "alta" | "media" | "nenhuma";
  };
  receitaVencida?: boolean;
  comportamento?: any;
  isAvulsa?: boolean;
  motivoAvulsa?: string;
  doseKind?: "sos" | "extra";
  logId?: string;

  /**
   * Slot previsto sem DoseLog real em um dia diferente de hoje.
   * É informativo e não entra nas métricas de adesão.
   */
  isExpectedUnconfirmed?: boolean;

  isSintoma?: boolean;
  sintomaId?: string;
  sintomaNome?: string;
  sintomaTipo?: string;
  intensidade?: number;
  observacoesSintoma?: string;
}

export default function HojePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const { activePersonId } = useActivePersonId();

  const hoje =
    getLocalTodayISO();

  const requestedDate =
    searchParams.get(
      "data"
    );

  const retroReviewMode =
    searchParams.get(
      "retro"
    ) ===
    "1";

  const retroReviewMedicationId =
    searchParams.get(
      "medicamento"
    );

  const requestedDateIsValid =
    Boolean(
      requestedDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(
        requestedDate
      ) &&
      !Number.isNaN(
        new Date(
          `${requestedDate}T12:00:00`
        ).getTime()
      )
    );

  const dataSelecionada =
    requestedDateIsValid &&
    requestedDate
      ? requestedDate
      : hoje;

  const isHoje =
    dataSelecionada ===
    hoje;

  const isPassado =
    dataSelecionada <
    hoje;

  const isFuturo =
    dataSelecionada >
    hoje;

  const ontem =
    addDaysToLocalDate(
      hoje,
      -1
    );

  const amanha =
    addDaysToLocalDate(
      hoje,
      1
    );

  const dataSelecionadaLabel =
    dataSelecionada ===
    hoje
      ? "Hoje"
      : dataSelecionada ===
          ontem
        ? "Ontem"
        : dataSelecionada ===
            amanha
          ? "Amanhã"
          : new Intl.DateTimeFormat(
              "pt-BR",
              {
                weekday:
                  "long",

                day:
                  "2-digit",

                month:
                  "long",
              }
            ).format(
              new Date(
                `${dataSelecionada}T12:00:00`
              )
            );

  const dataSelecionadaDescricao =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",
      }
    ).format(
      new Date(
        `${dataSelecionada}T12:00:00`
      )
    );

  const buildTimelineUrl =
    (
      date:
        string
    ) => {
      const params =
        new URLSearchParams();

      if (
        date !==
        hoje
      ) {
        params.set(
          "data",
          date
        );
      }

      if (
        retroReviewMode &&
        retroReviewMedicationId
      ) {
        params.set(
          "retro",
          "1"
        );

        params.set(
          "medicamento",
          retroReviewMedicationId
        );
      }

      const query =
        params.toString();

      return query
        ? `/hoje?${query}`
        : "/hoje";
    };

  const navegarData =
    (
      delta:
        number
    ) => {
      const destino =
        addDaysToLocalDate(
          dataSelecionada,
          delta
        );

      if (
        !destino
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      router.replace(
        buildTimelineUrl(
          destino
        )
      );
    };

  const voltarParaHoje =
    () => {
      if (
        isHoje
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      router.replace(
        buildTimelineUrl(
          hoje
        )
      );
    };

  const {
    medicamentos: rawMedicamentos,
  } = useMedicamentos();

  const {
    retiradas,
  } =
    useRetiradas();

  const medicamentos =
    useMemo(
      () => {
        if (
          !rawMedicamentos ||
          !activePersonId
        ) {
          return [];
        }

        return rawMedicamentos.filter(
          (
            medicamento:
              any
          ) =>
            medicamento.person_id ===
            activePersonId
        );
      },
      [
        rawMedicamentos,
        activePersonId,
      ]
    );

  const {
    doseLogs,
    marcarComoTomada: marcarDose,
    marcarComoTomadaHistoricaEm,
    marcarComoIgnorada,
    marcarComoIgnoradaHistorica,
    desmarcarDose,
    desmarcarDoseHistorica,
    removerDosePorId,
  } = useDoseLogs(
    dataSelecionada
  );

  const tratamentos =
    useLiveQuery(
      async () => {
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
      ]
    ) || [];

  const renovacoes =
    useLiveQuery(
      async () => {
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
      [
        activePersonId,
      ]
    ) || [];

  const medicos = useLiveQuery(
    () => db.medicos.toArray(),
    []
  ) || [];

  const farmacias = useLiveQuery(
    () => db.farmacias.toArray(),
    []
  ) || [];

  const hospitais = useLiveQuery(
    () => db.hospitais.toArray(),
    []
  ) || [];

  const rawConsultas =
    useLiveQuery(
      () => db.consultas.toArray(),
      []
    ) || [];

  const consultas =
    useMemo(
      () =>
        activePersonId
          ? rawConsultas.filter(
              (
                consulta:
                  any
              ) =>
                consulta.person_id ===
                activePersonId
            )
          : [],
      [
        rawConsultas,
        activePersonId,
      ]
    );

  const rawCirurgias =
    useLiveQuery(
      () => db.cirurgias.toArray(),
      []
    ) || [];

  const cirurgias =
    useMemo(
      () =>
        activePersonId
          ? rawCirurgias.filter(
              (
                cirurgia:
                  any
              ) =>
                cirurgia.person_id ===
                activePersonId
            )
          : [],
      [
        rawCirurgias,
        activePersonId,
      ]
    );

  const rawExames =
    useLiveQuery(
      () => db.exames.toArray(),
      []
    ) || [];

  const exames =
    useMemo(
      () =>
        activePersonId
          ? rawExames.filter(
              (
                exame:
                  any
              ) =>
                exame.person_id ===
                activePersonId
            )
          : [],
      [
        rawExames,
        activePersonId,
      ]
    );

  const rawRegistrosSaude =
    useLiveQuery(
      () => db.table("registros_saude").toArray(),
      []
    ) || [];

  const registrosHoje =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return rawRegistrosSaude.filter(
          (
            registro:
              any
          ) =>
            registro.person_id ===
              activePersonId &&
            registro.data ===
              dataSelecionada
        );
      },
      [
        rawRegistrosSaude,
        activePersonId,
        dataSelecionada,
      ]
    );

  const consultasHoje = useMemo(
    () =>
      consultas.filter(
        (c: any) =>
          c.data ===
          dataSelecionada
      ),
    [
      consultas,
      dataSelecionada,
    ]
  );

  const cirurgiasHoje = useMemo(
    () =>
      cirurgias.filter(
        (c: any) =>
          c.data ===
          dataSelecionada
      ),
    [
      cirurgias,
      dataSelecionada,
    ]
  );

  const examesHoje = useMemo(
    () =>
      exames.filter(
        (e: any) =>
          e.data ===
          dataSelecionada
      ),
    [
      exames,
      dataSelecionada,
    ]
  );

  const renovacoesReceitaHoje =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return medicamentos
          .filter(
            (
              medicamento
            ) =>
              medicamento.id &&
              String(
                medicamento.proxima_renovacao ||
                ""
              ).slice(
                0,
                10
              ) ===
                dataSelecionada
          )
          .map(
            (
              medicamento
            ) => ({
              id:
                `renovacao-receita-${medicamento.id}-${dataSelecionada}`,

              tipo:
                "renovacao_receita" as const,

              medicamentoId:
                medicamento.id!,

              medicamentoNome:
                medicamento.nome,

              titulo:
                `Renovar receita de ${medicamento.nome}`,

              descricao:
                "Data planejada para renovação da receita",
            })
          );
      },
      [
        medicamentos,
        activePersonId,
        dataSelecionada,
      ]
    );

  const retiradasHoje =
    useMemo(
      () =>
        retiradas.filter(
          (
            retirada
          ) =>
            retirada.data ===
            dataSelecionada
        ),
      [
        retiradas,
        dataSelecionada,
      ]
    );

  const [filtroStatus, setFiltroStatus] =
    useState<FiltroStatus>("todos");

  const [filtroPeriodo, setFiltroPeriodo] =
    useState<FiltroPeriodo>("todos");

  const [filtroCompromisso, setFiltroCompromisso] =
    useState<FiltroCompromisso>("todos");

  const [modalAberto, setModalAberto] =
    useState(false);

  const [
    medicamentoSelecionado,
    setMedicamentoSelecionado,
  ] = useState<any>(null);

  const [precoRenovacao, setPrecoRenovacao] =
    useState("");

  const [
    observacoesRenovacao,
    setObservacoesRenovacao,
  ] = useState("");

  const [
    adicionarMaisEstoque,
    setAdicionarMaisEstoque,
  ] = useState(30);

  const [
    processandoDoseId,
    setProcessandoDoseId,
  ] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] =
    useState(false);

  // HOJE V5 — CENTRAL DIÁRIA
  // Relógio reativo: mantém atrasos, próximos horários e ações em lote
  // corretos mesmo quando a PWA permanece aberta por muito tempo.
  const [agora, setAgora] =
    useState(() => new Date());

  const [processandoTodos, setProcessandoTodos] =
    useState(false);

  const [loteConfirmado, setLoteConfirmado] =
    useState<DoseItemExt[]>([]);

  const [isDoseModalOpen, setIsDoseModalOpen] =
    useState(false);

  const [
    historicalDoseReviewItem,
    setHistoricalDoseReviewItem,
  ] =
    useState<DoseItemExt | null>(
      null
    );

  const [
    historicalCustomTakenAt,
    setHistoricalCustomTakenAt,
  ] =
    useState(
      ""
    );

  const [
    historicalCustomMode,
    setHistoricalCustomMode,
  ] =
    useState(
      false
    );

  const [
    isHistoricalProcessing,
    setIsHistoricalProcessing,
  ] =
    useState(
      false
    );

  useEffect(() => {
    const atualizarRelogio = () =>
      setAgora(new Date());

    atualizarRelogio();

    const intervalId = window.setInterval(
      atualizarRelogio,
      30_000
    );

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        atualizarRelogio();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, []);

  useEffect(() => {
    const action = searchParams.get("action");

    if (action === "dose") {
      setIsDoseModalOpen(true);
      router.replace("/hoje");
    } else if (action === "sintoma") {
      router.replace("/saude/registros/novo");
    }
  }, [searchParams, router]);

  const historicoDosesCompleto =
    useLiveQuery(
      () =>
        activePersonId
          ? db.doseLogs
              .where("person_id")
              .equals(activePersonId)
              .toArray()
          : [],
      [activePersonId]
    ) || [];

  const retroReviewSummary =
    useMemo(
      () => {
        if (
          !retroReviewMode ||
          !retroReviewMedicationId
        ) {
          return null;
        }

        const medicamento =
          medicamentos.find(
            (
              item:
                any
            ) =>
              item.id ===
              retroReviewMedicationId
          );

        if (
          !medicamento
        ) {
          return null;
        }

        const horarios =
          Array.from(
            new Set(
              (
                medicamento.estoque_horarios ||
                []
              )
                .map(
                  (
                    horario:
                      string
                  ) =>
                    String(
                      horario ||
                      ""
                    ).trim()
                )
                .filter(
                  (
                    horario:
                      string
                  ) =>
                    /^([01]\d|2[0-3]):[0-5]\d$/.test(
                      horario
                    )
                )
            )
          ).sort();

        const acquisitionDates =
          renovacoes
            .filter(
              (
                renovacao:
                  any
              ) =>
                renovacao.medicamento_id ===
                medicamento.id
            )
            .map(
              (
                renovacao:
                  any
              ) =>
                String(
                  renovacao.data_aquisicao ||
                  renovacao.data ||
                  ""
                ).slice(
                  0,
                  10
                )
            )
            .filter(
              (
                value:
                  string
              ) =>
                /^\d{4}-\d{2}-\d{2}$/.test(
                  value
                )
            )
            .sort();

        const createdDate =
          String(
            medicamento.created_at ||
            ""
          ).slice(
            0,
            10
          );

        const startDate =
          acquisitionDates[0] ||
          (
            /^\d{4}-\d{2}-\d{2}$/.test(
              createdDate
            )
              ? createdDate
              : null
          ) ||
          medicamento.estoque_data_referencia ||
          medicamento.data_receita ||
          null;

        if (
          !startDate ||
          !/^\d{4}-\d{2}-\d{2}$/.test(
            startDate
          ) ||
          horarios.length ===
            0
        ) {
          return {
            medicamento,

            startDate,

            horarios,

            totalSlots:
              0,

            confirmedSlots:
              0,

            pendingSlots:
              0,

            pendingDates:
              [] as string[],

            firstPendingDate:
              null as
                | string
                | null,
          };
        }

        const yesterday =
          addDaysToLocalDate(
            hoje,
            -1
          );

        if (
          !yesterday ||
          startDate >
            yesterday
        ) {
          return {
            medicamento,

            startDate,

            horarios,

            totalSlots:
              0,

            confirmedSlots:
              0,

            pendingSlots:
              0,

            pendingDates:
              [] as string[],

            firstPendingDate:
              null as
                | string
                | null,
          };
        }

        const logsBySlot =
          new Set(
            historicoDosesCompleto
              .filter(
                (
                  log:
                    any
                ) =>
                  log.medicamento_id ===
                    medicamento.id &&
                  log.person_id ===
                    activePersonId
              )
              .map(
                (
                  log:
                    any
                ) =>
                  `${log.data}|${log.horario}`
              )
          );

        let cursor =
          startDate;

        let totalSlots =
          0;

        let confirmedSlots =
          0;

        const pendingDatesSet =
          new Set<string>();

        /*
         * Guard alto apenas evita loop infinito em dado inválido.
         * Dez anos de histórico continuam suportados.
         */
        let guard =
          0;

        while (
          cursor <=
            yesterday &&
          guard <
            3660
        ) {
          for (
            const horario of
              horarios
          ) {
            totalSlots +=
              1;

            const key =
              `${cursor}|${horario}`;

            if (
              logsBySlot.has(
                key
              )
            ) {
              confirmedSlots +=
                1;
            } else {
              pendingDatesSet.add(
                cursor
              );
            }
          }

          const nextDate =
            addDaysToLocalDate(
              cursor,
              1
            );

          if (
            !nextDate ||
            nextDate ===
              cursor
          ) {
            break;
          }

          cursor =
            nextDate;

          guard +=
            1;
        }

        const pendingDates =
          Array.from(
            pendingDatesSet
          ).sort();

        return {
          medicamento,

          startDate,

          horarios,

          totalSlots,

          confirmedSlots,

          pendingSlots:
            Math.max(
              0,
              totalSlots -
                confirmedSlots
            ),

          pendingDates,

          firstPendingDate:
            pendingDates[0] ||
            null,
        };
      },
      [
        retroReviewMode,
        retroReviewMedicationId,
        medicamentos,
        renovacoes,
        historicoDosesCompleto,
        activePersonId,
        hoje,
      ]
    );

  const irParaProximoPendenteRetroativo =
    () => {
      if (
        !retroReviewSummary ||
        retroReviewSummary.pendingDates.length ===
          0
      ) {
        showToast(
          "Não há doses retroativas pendentes de revisão",
          "success"
        );

        return;
      }

      const pendingDates =
        retroReviewSummary.pendingDates;

      const nextAfterCurrent =
        pendingDates.find(
          (
            date
          ) =>
            date >
            dataSelecionada
        );

      const destino =
        nextAfterCurrent ||
        pendingDates[0];

      trigger(
        "vibrate"
      );

      router.replace(
        buildTimelineUrl(
          destino
        )
      );
    };

  const sairRevisaoRetroativa =
    () => {
      trigger(
        "vibrate"
      );

      router.replace(
        dataSelecionada ===
          hoje
          ? "/hoje"
          : `/hoje?data=${dataSelecionada}`
      );
    };

  const horaAtual = [
    String(agora.getHours()).padStart(2, "0"),
    String(agora.getMinutes()).padStart(2, "0"),
  ].join(":");

  const doses = useMemo<DoseItemExt[]>(() => {
    const list: DoseItemExt[] = [];
    const chavesProgramadas = new Set<string>();

    for (const med of medicamentos || []) {
      if (
        retroReviewMode &&
        retroReviewMedicationId &&
        med.id !==
          retroReviewMedicationId
      ) {
        continue;
      }

      if (
        !med.id ||
        med.status === "descontinuado" ||
        med.tipo_uso === "sos" ||
        med.tipo_uso === "esporadico"
      ) {
        continue;
      }

      // Horários são normalizados e deduplicados antes de formar slots.
      // Um medicamento sem horário continua visível na seção de qualidade
      // da rotina, mas jamais vira uma dose fictícia.
      const horariosProgramados = Array.from(
        new Set(
          (med.estoque_horarios || [])
            .map((horario: string) =>
              String(horario || "").trim()
            )
            .filter((horario: string) =>
              /^([01]\d|2[0-3]):[0-5]\d$/.test(horario)
            )
        )
      ).sort();

      if (horariosProgramados.length === 0) {
        continue;
      }

      const acquisitionDates =
        renovacoes
          .filter(
            (
              renovacao:
                any
            ) =>
              renovacao.medicamento_id ===
              med.id
          )
          .map(
            (
              renovacao:
                any
            ) =>
              String(
                renovacao.data_aquisicao ||
                renovacao.data ||
                ""
              ).slice(
                0,
                10
              )
          )
          .filter(
            (
              value:
                string
            ) =>
              /^\d{4}-\d{2}-\d{2}$/.test(
                value
              )
          )
          .sort();

      const createdDate =
        String(
          (med as any).created_at ||
          ""
        ).slice(
          0,
          10
        );

      const knownStartDate =
        acquisitionDates[0] ||
        (
          /^\d{4}-\d{2}-\d{2}$/.test(
            createdDate
          )
            ? createdDate
            : null
        ) ||
        med.estoque_data_referencia ||
        med.data_receita ||
        null;

      if (
        knownStartDate &&
        dataSelecionada <
          knownStartDate
      ) {
        continue;
      }

      const estoqueInfo =
        computeEstoqueInfo(
          med
        );

      const medicoObj = medicos.find(
        (m) => m.id === med.medico_id
      );

      const tratamentoObj =
        tratamentos.find(
          (t) =>
            t.id ===
            (med.tratamento_ids || [])[0]
        );

      const farmaciaObj =
        farmacias.find(
          (f) => f.id === med.farmacia_id
        );

      const estabelecimentoObj =
        hospitais.find(
          (h) => h.id === med.local_id
        );

      const insight =
        sugerirRenovacao(med);

      const receitaVencida =
        isReceitaAtualVencida(med);

      const comportamento =
        analisarComportamentoUso(
          med,
          historicoDosesCompleto.filter(
            (d) =>
              d.medicamento_id === med.id
          )
        );

      for (const horario of horariosProgramados) {
        if (!horario) continue;

        chavesProgramadas.add(
          `${med.id}-${horario}`
        );

        const log = (doseLogs || []).find(
          (l) =>
            l.medicamento_id === med.id &&
            l.horario === horario &&
            l.dose_kind !== "extra" &&
            l.dose_kind !== "sos"
        );

        const tomada = !!log?.tomado_em;
        const ignorada = !!log?.ignorado_em;

        list.push({
          medicamentoId: med.id,
          medicamentoNome: med.nome,
          dosagem: med.dosagem,
          horario,
          tomada,
          ignorada,
          cor:
            tratamentoObj?.cor ||
            med.cor_principal ||
            "#8B5CF6",
          estoqueRestante:
            estoqueInfo?.quantidadeRestante ?? 0,
          estoqueTotal:
            med.estoque_quantidade || 0,
          unidadeMedida:
            med.estoque_unidade_medida ||
            "unidades",
          unidadePorDose:
            med.estoque_unidade_por_dose,
          unidadeDose:
            String(med.forma_farmaceutica || med.formato || "")
              .toLocaleLowerCase("pt-BR")
              .includes("gota")
              ? "gotas"
              : med.estoque_unidade_medida || "unidades",
          medicoNome:
            medicoObj?.nome || med.medico,
          medicoId: medicoObj?.id,
          tratamentoNome:
            tratamentoObj?.nome,
          tratamentoId:
            tratamentoObj?.id,
          tratamentoCor:
            tratamentoObj?.cor,
          farmaciaNome:
            farmaciaObj?.nome,
          farmaciaId:
            farmaciaObj?.id,
          estabelecimentoNome:
            estabelecimentoObj?.nome,
          estabelecimentoId:
            estabelecimentoObj?.id,
          proximaRenovacao:
            med.proxima_renovacao,
          diasRestantes:
            getDaysUntil(
              med.proxima_renovacao
            ),
          insight,
          receitaVencida,
          comportamento,

          isAvulsa:
            false,

          isExpectedUnconfirmed:
            !isHoje &&
            !log,
        });
      }
    }

    for (const log of doseLogs || []) {
      if (!log.medicamento_id) continue;

      const med = medicamentos.find(
        (m) => m.id === log.medicamento_id
      );

      if (!med) continue;

      const chaveProgramada = `${med.id}-${log.horario}`;
      const isOficialTomada =
        chavesProgramadas.has(chaveProgramada);

      if (
        (!isOficialTomada ||
          log.dose_kind === "extra" ||
          log.dose_kind === "sos") &&
        log.tomado_em
      ) {
        const jaExisteAvulsa =
          list.some(
            (item) => item.logId === log.id
          );

        if (!jaExisteAvulsa) {
          const tratamentoObj =
            tratamentos.find(
              (t) =>
                t.id ===
                (med.tratamento_ids || [])[0]
            );

          const medicoObj =
            medicos.find(
              (m) =>
                m.id === med.medico_id
            );

          list.push({
            medicamentoId: med.id!,
            medicamentoNome: med.nome,
            dosagem: med.dosagem,
            horario:
              log.horario || "00:00",
            tomada: true,
            ignorada: false,
            cor:
              tratamentoObj?.cor ||
              med.cor_principal ||
              "#8B5CF6",
            estoqueRestante:
              med.estoque_quantidade ?? 0,
            estoqueTotal:
              med.estoque_quantidade || 0,
            unidadeMedida:
              med.estoque_unidade_medida ||
              "unidades",
            unidadePorDose:
              log.quantidade ??
              med.estoque_unidade_por_dose,
            unidadeDose:
              String(med.forma_farmaceutica || med.formato || "")
                .toLocaleLowerCase("pt-BR")
                .includes("gota")
                ? "gotas"
                : med.estoque_unidade_medida || "unidades",
            medicoNome:
              medicoObj?.nome ||
              med.medico,
            tratamentoNome:
              tratamentoObj?.nome,
            tratamentoId:
              tratamentoObj?.id,
            tratamentoCor:
              tratamentoObj?.cor,
            isAvulsa: true,
            motivoAvulsa:
              log.motivo ||
              (log.dose_kind === "extra"
                ? "Dose extra"
                : "Dose avulsa / SOS"),
            doseKind:
              log.dose_kind === "extra" ? "extra" : "sos",
            logId: log.id,
          });
        }
      }
    }

    for (const reg of registrosHoje) {
      if (reg.categoria === "sintoma") {
        list.push({
          horario:
            reg.horario || "00:00",
          tomada: true,
          ignorada: false,
          cor: "#F59E0B",
          isSintoma: true,
          sintomaId: reg.id,
          sintomaNome:
            reg.nome ||
            reg.tipo ||
            "Sintoma registrado",
          sintomaTipo: reg.tipo,
          intensidade: reg.intensidade,
          observacoesSintoma:
            reg.observacoes,
        });
      }
    }

    return list.sort((a, b) =>
      a.horario.localeCompare(b.horario)
    );
  }, [
    medicamentos,
    doseLogs,
    medicos,
    tratamentos,
    farmacias,
    hospitais,
    historicoDosesCompleto,
    registrosHoje,
    renovacoes,
    dataSelecionada,
    isHoje,
    retroReviewMode,
    retroReviewMedicationId,
  ]);

  const medicamentosSemHorario = useMemo(
    () =>
      medicamentos.filter((med) => {
        if (
          !med.id ||
          med.status === "descontinuado" ||
          med.tipo_uso !== "continuo"
        ) {
          return false;
        }

        return !(med.estoque_horarios || []).some(
          (horario: string) =>
            /^([01]\d|2[0-3]):[0-5]\d$/.test(
              String(horario || "").trim()
            )
        );
      }),
    [medicamentos]
  );

  const compromissosFiltrados = useMemo(() => {
    let items: any[] = [];

    if (
      filtroCompromisso === "todos" ||
      filtroCompromisso === "consultas"
    ) {
      items = [
        ...items,
        ...consultasHoje.map((c) => ({
          ...c,
          tipo: "consulta",
        })),
      ];
    }

    if (
      filtroCompromisso === "todos" ||
      filtroCompromisso === "cirurgias"
    ) {
      items = [
        ...items,
        ...cirurgiasHoje.map((c) => ({
          ...c,
          tipo: "cirurgia",
        })),
      ];
    }

    if (
      filtroCompromisso === "todos" ||
      filtroCompromisso === "exames"
    ) {
      items = [
        ...items,
        ...examesHoje.map((e) => ({
          ...e,
          tipo: "exame",
        })),
      ];
    }

    if (
      filtroCompromisso === "todos" ||
      filtroCompromisso === "retiradas"
    ) {
      items = [
        ...items,
        ...retiradasHoje.map(
          (
            retirada
          ) => ({
            ...retirada,
            tipo:
              "retirada",
          })
        ),
      ];
    }

    return items.sort((a, b) =>
      (a.horario || "00:00").localeCompare(
        b.horario || "00:00"
      )
    );
  }, [
    consultasHoje,
    cirurgiasHoje,
    examesHoje,
    retiradasHoje,
    filtroCompromisso,
  ]);

  const assistenteDiario = useMemo(
    () => {
      if (
        !isHoje
      ) {
        return null;
      }

      return analisarRotinaDiaria(
        doses,
        compromissosFiltrados
      );
    },
    [
      isHoje,
      doses,
      compromissosFiltrados,
    ]
  );

  const dosesFiltradas = useMemo(() => {
    let result = doses;

    if (filtroStatus === "tomados") {
      result = result.filter(
        (d) => d.tomada
      );
    } else if (
      filtroStatus === "pendentes"
    ) {
      result =
        isHoje
          ? result.filter(
              (d) =>
                !d.tomada &&
                !d.ignorada &&
                !d.isSintoma &&
                !d.isExpectedUnconfirmed
            )
          : result.filter(
              (d) =>
                !d.tomada &&
                !d.ignorada &&
                !d.isSintoma &&
                d.isExpectedUnconfirmed
            );
    } else if (
      filtroStatus === "ignorados"
    ) {
      result = result.filter(
        (d) => d.ignorada
      );
    }

    if (filtroPeriodo !== "todos") {
      result = result.filter(
        (d) =>
          getPeriodoDoDia(d.horario).key ===
          filtroPeriodo
      );
    }

    return result;
  }, [
    doses,
    filtroStatus,
    filtroPeriodo,
    isHoje,
  ]);

  const dosesAgrupadas = useMemo(() => {
    const grupos: Record<
      string,
      {
        label: string;
        sub: string;
        icon: any;
        items: DoseItemExt[];
      }
    > = {
      manha: {
        label: "Manhã",
        sub: "Início do dia",
        icon: Sunrise,
        items: [],
      },
      tarde: {
        label: "Tarde",
        sub: "Período da tarde",
        icon: Sun,
        items: [],
      },
      noite: {
        label: "Noite",
        sub: "Final do dia",
        icon: Moon,
        items: [],
      },
    };

    dosesFiltradas.forEach((d) => {
      const periodo =
        getPeriodoDoDia(d.horario);

      if (grupos[periodo.key]) {
        grupos[periodo.key].items.push(d);
      }
    });

    return Object.entries(grupos).filter(
      ([, grupo]) =>
        grupo.items.length > 0
    );
  }, [dosesFiltradas]);

  // Métricas de adesão contam somente slots programados.
  // SOS/avulsas e sintomas permanecem na linha do tempo, mas não
  // inflam nem derrubam artificialmente o progresso da rotina.
  const metricItems =
    doses.filter(
      (dose) =>
        !dose.isExpectedUnconfirmed &&
        !dose.isAvulsa &&
        !dose.isSintoma
    );

  const totalTomadas =
    metricItems.filter(
      (
        dose
      ) =>
        dose.tomada
    ).length;

  const totalPendentes =
    metricItems.filter(
      (
        dose
      ) =>
        !dose.tomada &&
        !dose.ignorada &&
        !dose.isSintoma
    ).length;

  const totalEsperadasSemConfirmacao =
    doses.filter(
      (
        dose
      ) =>
        dose.isExpectedUnconfirmed
    ).length;

  const totalIgnoradas =
    metricItems.filter(
      (
        dose
      ) =>
        dose.ignorada
    ).length;

  const totalRegistros =
    metricItems.length;

  const totalCompromissosDoDia =
    compromissosFiltrados.length;

  const totalEventosMedicamento =
    renovacoesReceitaHoje.length;

  const totalItensPlanejados =
    totalEsperadasSemConfirmacao +
    totalCompromissosDoDia +
    totalEventosMedicamento;

  const percentualConclusao =
    totalRegistros > 0
      ? Math.round(
          (totalTomadas / totalRegistros) *
            100
        )
      : 0;

  const dosesElegiveisLote =
    isHoje
      ? metricItems.filter(
          (dose) =>
            Boolean(dose.medicamentoId) &&
            !dose.tomada &&
            !dose.ignorada &&
            dose.horario <= horaAtual
        )
      : [];

  const isLoading =
    rawMedicamentos === undefined ||
    doseLogs === undefined;

  if (isLoading) {
    return <CardListSkeleton />;
  }

  const abrirRevisaoHistorica =
    (
      item:
        DoseItemExt
    ) => {
      if (
        !isPassado ||
        !item.medicamentoId ||
        item.isAvulsa ||
        item.isSintoma
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setHistoricalDoseReviewItem(
        item
      );

      setHistoricalCustomTakenAt(
        `${dataSelecionada}T${item.horario || "00:00"}`
      );

      setHistoricalCustomMode(
        false
      );
    };

  const fecharRevisaoHistorica =
    () => {
      if (
        isHistoricalProcessing
      ) {
        return;
      }

      setHistoricalDoseReviewItem(
        null
      );

      setHistoricalCustomMode(
        false
      );

      setHistoricalCustomTakenAt(
        ""
      );
    };

  const executarRevisaoHistorica =
    async (
      action:
        | "scheduled"
        | "custom"
        | "ignored"
        | "clear"
    ) => {
      const item =
        historicalDoseReviewItem;

      if (
        !item?.medicamentoId ||
        !isPassado ||
        isHistoricalProcessing
      ) {
        return;
      }

      setIsHistoricalProcessing(
        true
      );

      try {
        if (
          action ===
          "scheduled"
        ) {
          const scheduledLocal =
            `${dataSelecionada}T${item.horario || "00:00"}:00`;

          const takenAt =
            new Date(
              scheduledLocal
            );

          if (
            Number.isNaN(
              takenAt.getTime()
            )
          ) {
            throw new Error(
              "Horário histórico inválido."
            );
          }

          await marcarComoTomadaHistoricaEm(
            item.medicamentoId,
            item.horario,
            takenAt.toISOString()
          );

          trigger(
            "success"
          );

          showToast(
            "Dose histórica confirmada",
            "success"
          );
        } else if (
          action ===
          "custom"
        ) {
          if (
            !historicalCustomTakenAt
          ) {
            showToast(
              "Informe quando a dose foi tomada",
              "error"
            );

            return;
          }

          const customDate =
            historicalCustomTakenAt.slice(
              0,
              10
            );

          if (
            customDate !==
            dataSelecionada
          ) {
            showToast(
              "O horário informado precisa pertencer ao dia selecionado",
              "error"
            );

            return;
          }

          const takenAt =
            new Date(
              historicalCustomTakenAt
            );

          if (
            Number.isNaN(
              takenAt.getTime()
            )
          ) {
            showToast(
              "Data ou horário inválido",
              "error"
            );

            return;
          }

          await marcarComoTomadaHistoricaEm(
            item.medicamentoId,
            item.horario,
            takenAt.toISOString()
          );

          trigger(
            "success"
          );

          showToast(
            "Horário histórico atualizado",
            "success"
          );
        } else if (
          action ===
          "ignored"
        ) {
          await marcarComoIgnoradaHistorica(
            item.medicamentoId,
            item.horario
          );

          trigger(
            "vibrate"
          );

          showToast(
            "Dose marcada como não tomada",
            "info"
          );
        } else {
          await desmarcarDoseHistorica(
            item.medicamentoId,
            item.horario
          );

          trigger(
            "vibrate"
          );

          showToast(
            "Confirmação histórica removida",
            "info"
          );
        }

        setHistoricalDoseReviewItem(
          null
        );

        setHistoricalCustomMode(
          false
        );

        setHistoricalCustomTakenAt(
          ""
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao revisar dose histórica:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao atualizar histórico",
          "error"
        );
      } finally {
        setIsHistoricalProcessing(
          false
        );
      }
    };

  const handleToggle = async (
    item: DoseItemExt
  ) => {
    if (
      !isHoje
    ) {
      trigger(
        "vibrate"
      );

      showToast(
        isPassado
          ? "Histórico em modo de consulta. Nenhuma dose passada será presumida."
          : "Doses futuras só poderão ser registradas no dia correspondente.",
        "info"
      );

      return;
    }

    if (
      processandoDoseId ||
      !item.medicamentoId
    ) {
      return;
    }

    const chaveDose = item.logId
      ? `log-${item.logId}`
      : `${item.medicamentoId}-${item.horario}`;

    setProcessandoDoseId(
      chaveDose
    );

    try {
      // ======================================================
      // DOSE AVULSA / SOS
      //
      // A remoção passa obrigatoriamente pelo repository.
      //
      // Ele é responsável por:
      //
      // - validar person_id;
      // - validar usuário;
      // - recuperar a quantidade histórica;
      // - restaurar estoque quando calculável;
      // - excluir o DoseLog;
      // - enfileirar DELETE para sincronização.
      // ======================================================

      if (
        item.isAvulsa &&
        item.logId
      ) {
        await removerDosePorId(
          item.logId
        );

        trigger(
          "vibrate"
        );

        showToast(
          "Dose avulsa removida",
          "info"
        );

        return;
      }

      // ======================================================
      // DOSE PROGRAMADA JÁ TOMADA → DESFAZER
      //
      // Nenhuma alteração manual de estoque é feita aqui.
      //
      // O repository usa a quantidade histórica do DoseLog para
      // restaurar exatamente o consumo que havia sido registrado.
      // ======================================================

      if (
        item.tomada
      ) {
        await desmarcarDose(
          item.medicamentoId,
          item.horario
        );

        trigger(
          "vibrate"
        );

        return;
      }

      // ======================================================
      // DOSE PROGRAMADA PENDENTE → TOMADA
      //
      // O repository registra o DoseLog e movimenta o estoque.
      // ======================================================

      await marcarDose(
        item.medicamentoId,
        item.horario
      );

      trigger(
        "success"
      );
    } catch (error) {
      console.error(
        "Erro ao atualizar dose:",
        error
      );

      trigger(
        "error"
      );

      showToast(
        "Erro ao atualizar dose",
        "error"
      );
    } finally {
      setProcessandoDoseId(
        null
      );
    }
  };

  const handleTomarTodos = async () => {
    if (
      processandoTodos ||
      processandoDoseId ||
      dosesElegiveisLote.length < 2
    ) {
      return;
    }

    setProcessandoTodos(true);
    setLoteConfirmado([]);

    const confirmadas: DoseItemExt[] = [];
    let falhas = 0;

    // Serial de propósito: duas doses do mesmo medicamento nunca
    // disputam a leitura/gravação do saldo de estoque.
    for (const dose of dosesElegiveisLote) {
      if (!dose.medicamentoId) continue;

      try {
        await marcarDose(
          dose.medicamentoId,
          dose.horario,
          dose.unidadePorDose
        );

        confirmadas.push(dose);
      } catch (error) {
        falhas += 1;
        console.error(
          "Erro ao registrar dose no lote:",
          error
        );
      }
    }

    setLoteConfirmado(confirmadas);
    setProcessandoTodos(false);

    if (confirmadas.length > 0) {
      trigger("success");
      showToast(
        `${confirmadas.length} ${
          confirmadas.length === 1 ? "dose registrada" : "doses registradas"
        }`,
        "success"
      );
    }

    if (falhas > 0) {
      trigger("error");
      showToast(
        `${falhas} ${falhas === 1 ? "dose não foi registrada" : "doses não foram registradas"}`,
        "error"
      );
    }
  };

  const handleDesfazerLote = async () => {
    if (
      processandoTodos ||
      processandoDoseId ||
      loteConfirmado.length === 0
    ) {
      return;
    }

    setProcessandoTodos(true);

    const naoDesfeitas: DoseItemExt[] = [];

    for (const dose of loteConfirmado) {
      if (!dose.medicamentoId) continue;

      try {
        await desmarcarDose(
          dose.medicamentoId,
          dose.horario
        );
      } catch (error) {
        naoDesfeitas.push(dose);
        console.error(
          "Erro ao desfazer dose do lote:",
          error
        );
      }
    }

    setLoteConfirmado(naoDesfeitas);
    setProcessandoTodos(false);

    if (naoDesfeitas.length === 0) {
      trigger("vibrate");
      showToast("Lote desfeito com segurança", "info");
    } else {
      trigger("error");
      showToast(
        "Algumas doses não puderam ser desfeitas",
        "error"
      );
    }
  };

  const handleIgnorar = async (
    item: DoseItemExt
  ) => {
    if (
      !isHoje
    ) {
      trigger(
        "vibrate"
      );

      showToast(
        isPassado
          ? "Histórico em modo de consulta."
          : "Ainda não é possível ignorar uma dose futura.",
        "info"
      );

      return;
    }

    if (
      processandoDoseId ||
      !item.medicamentoId
    ) {
      return;
    }

    setProcessandoDoseId(
      `${item.medicamentoId}-${item.horario}`
    );

    trigger("vibrate");

    try {
      await marcarComoIgnorada(
        item.medicamentoId,
        item.horario
      );

      showToast(
        "Dose ignorada",
        "info"
      );
    } catch (error) {
      console.error(
        "Erro ao ignorar dose:",
        error
      );

      trigger(
        "error"
      );

      showToast(
        "Erro ao ignorar dose",
        "error"
      );
    } finally {
      setProcessandoDoseId(null);
    }
  };

  const handleSalvarRenovacaoDoModal =
    async () => {
      if (
        !medicamentoSelecionado?.id ||
        isProcessing
      ) {
        return;
      }

      setIsProcessing(true);
      trigger("success");

      try {
        await safeAddRenovacao({
          user_id:
            medicamentoSelecionado.user_id,
          medicamento_id:
            medicamentoSelecionado.id,
          data: hoje,
          preco: precoRenovacao
            ? Number(
                precoRenovacao.replace(
                  ",",
                  "."
                )
              )
            : undefined,
          observacoes:
            observacoesRenovacao ||
            "Renovação rápida via alerta",
        });

        const estoqueAtual =
          medicamentoSelecionado.estoque_quantidade ||
          0;

        await safeUpdateMedicamento(
          medicamentoSelecionado.id,
          {
            estoque_quantidade:
              estoqueAtual +
              Number(adicionarMaisEstoque),
            estoque_data_referencia:
              hoje,
          }
        );

        showToast(
          "Sucesso!",
          "success"
        );

        setModalAberto(false);
        setPrecoRenovacao("");
        setObservacoesRenovacao("");
      } catch (error) {
        console.error(
          "Erro ao renovar:",
          error
        );

        showToast(
          "Erro ao renovar",
          "error"
        );
      } finally {
        setIsProcessing(false);
      }
    };

  const hasFiltrosAtivos =
    filtroStatus !== "todos" ||
    filtroPeriodo !== "todos" ||
    filtroCompromisso !== "todos";

  const limparFiltros = () => {
    trigger("vibrate");
    setFiltroStatus("todos");
    setFiltroPeriodo("todos");
    setFiltroCompromisso("todos");
  };

  const navegarCompromisso = (
    item: any
  ) => {
    trigger("vibrate");

    const rotas: Record<
      string,
      string
    > = {
      consulta: "/saude/consultas/detalhes",
      cirurgia:
        "/saude/cirurgias/detalhes",
      exame:
        "/saude/exames/detalhes",
      retirada:
        "/saude/retiradas/detalhes",
    };

    const rota = rotas[item.tipo];

    if (rota && item.id) {
      router.push(
        `${rota}?id=${item.id}`
      );
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        {/* =========================================================
            HEADER
        ========================================================= */}
        <header className="relative z-10 border-b border-surface-border/30 bg-void px-4 pb-3 pt-safe">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Clock
                  size={16}
                  className="shrink-0 text-ice"
                />

                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-ice/90">
                  Linha do Tempo
                </p>
              </div>

              <h1 className="mt-1 font-display text-xl font-semibold capitalize text-ink-primary">
                {
                  dataSelecionadaLabel
                }
              </h1>

              {!isHoje && (
                <p className="mt-0.5 font-mono text-[9px] text-ink-faint">
                  {
                    dataSelecionadaDescricao
                  }
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <span className="inline-flex items-center rounded-full border border-ice/20 bg-ice/10 px-3 py-1.5 font-mono text-[10px] font-bold text-ice">
                {isFuturo ? (
                  <>
                    {totalItensPlanejados}{" "}
                    {totalItensPlanejados ===
                    1
                      ? "item"
                      : "itens"}{" "}
                    previstos
                  </>
                ) : (
                  <>
                    {totalTomadas}{" "}
                    {totalTomadas === 1
                      ? "dose"
                      : "doses"}
                  </>
                )}
              </span>
            </div>
          </div>

          {/* NAVEGAÇÃO TEMPORAL */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={
                () =>
                  navegarData(
                    -1
                  )
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-border/50 bg-surface-raised text-ink-muted transition-all active:scale-95"
              aria-label="Dia anterior"
            >
              <ChevronLeft
                size={
                  16
                }
              />
            </button>

            <div className="min-w-0 flex-1 rounded-xl border border-surface-border/40 bg-surface-raised/70 px-3 py-2 text-center">
              <p className="truncate text-[10px] font-semibold capitalize text-ink-primary">
                {
                  dataSelecionadaLabel
                }
              </p>

              <p className="mt-0.5 font-mono text-[8px] text-ink-faint">
                {
                  dataSelecionadaDescricao
                }
              </p>
            </div>

            <button
              type="button"
              onClick={
                () =>
                  navegarData(
                    1
                  )
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-border/50 bg-surface-raised text-ink-muted transition-all active:scale-95"
              aria-label="Próximo dia"
            >
              <ChevronRight
                size={
                  16
                }
              />
            </button>

            {!isHoje && (
              <button
                type="button"
                onClick={
                  voltarParaHoje
                }
                className="shrink-0 rounded-xl border border-ice/25 bg-ice/10 px-3 py-2 font-mono text-[9px] font-bold text-ice transition-all active:scale-95"
              >
                Hoje
              </button>
            )}
          </div>

          {!isHoje && (
            <div className="mt-2 flex items-start gap-2 rounded-xl border border-ice/15 bg-ice/5 px-3 py-2.5">
              <Info
                size={
                  13
                }
                className="mt-0.5 shrink-0 text-ice"
              />

              <p className="text-[9px] leading-relaxed text-ink-muted">
                {isPassado
                  ? "Visualização histórica. Slots sem registro são apenas previsões da rotina e não contam como tomada, falta ou adesão."
                  : "Planejamento futuro. As doses aparecem como previstas e não podem ser registradas antecipadamente."}
              </p>
            </div>
          )}

          {/* RESUMO */}
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/70 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  size={13}
                  className="text-emerald-400"
                />
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                  Concluídos
                </span>
              </div>

              <p className="mt-1 font-mono text-sm font-bold text-emerald-400">
                {totalTomadas}
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/70 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle
                  size={13}
                  className="text-coral"
                />
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                  {isHoje
                    ? "Pendentes"
                    : isPassado
                      ? "Sem confirmação"
                      : "Previstas"}
                </span>
              </div>

              <p className="mt-1 font-mono text-sm font-bold text-coral">
                {isHoje
                  ? totalPendentes
                  : totalEsperadasSemConfirmacao}
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/70 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Activity
                  size={13}
                  className="text-ice"
                />
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                  {isFuturo
                    ? "Eventos"
                    : "Progresso"}
                </span>
              </div>

              <p className="mt-1 font-mono text-sm font-bold text-ice">
                {isFuturo
                  ? totalCompromissosDoDia +
                    totalEventosMedicamento
                  : `${percentualConclusao}%`}
              </p>
            </div>
          </div>

          {/* FILTROS */}
          <div className="mt-2 -mx-1 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex min-w-max items-center gap-2 px-1">
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-surface-border/40 bg-surface-raised px-3 py-1.5">
                <Filter
                  size={13}
                  className="text-ink-muted"
                />

                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                  Filtros
                </span>
              </div>

              <button
                onClick={() => {
                  trigger("vibrate");

                  setFiltroStatus(
                    filtroStatus ===
                      "pendentes"
                      ? "todos"
                      : "pendentes"
                  );
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  filtroStatus ===
                  "pendentes"
                    ? "border-coral bg-coral/20 text-coral"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                {isFuturo ? (
                  <Clock size={12} />
                ) : (
                  <AlertTriangle size={12} />
                )}

                {isHoje
                  ? `Pendentes (${totalPendentes})`
                  : isPassado
                    ? `Sem confirmação (${totalEsperadasSemConfirmacao})`
                    : `Previstas (${totalEsperadasSemConfirmacao})`}
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");

                  setFiltroStatus(
                    filtroStatus ===
                      "tomados"
                      ? "todos"
                      : "tomados"
                  );
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  filtroStatus ===
                  "tomados"
                    ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <CheckCircle2 size={12} />
                Concluídos
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");

                  setFiltroStatus(
                    filtroStatus ===
                      "ignorados"
                      ? "todos"
                      : "ignorados"
                  );
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  filtroStatus ===
                  "ignorados"
                    ? "border-ink-muted bg-surface-raised text-ink-muted"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <XCircle size={12} />
                Ignorados ({totalIgnoradas})
              </button>

              <div className="h-5 w-px shrink-0 bg-surface-border/40" />

              <button
                onClick={() => {
                  trigger("vibrate");

                  setFiltroPeriodo(
                    filtroPeriodo === "manha"
                      ? "todos"
                      : "manha"
                  );
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  filtroPeriodo === "manha"
                    ? "border-ice bg-ice/20 text-ice"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <Sunrise size={12} />
                Manhã
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");

                  setFiltroPeriodo(
                    filtroPeriodo === "tarde"
                      ? "todos"
                      : "tarde"
                  );
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  filtroPeriodo === "tarde"
                    ? "border-ice bg-ice/20 text-ice"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <Sun size={12} />
                Tarde
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");

                  setFiltroPeriodo(
                    filtroPeriodo === "noite"
                      ? "todos"
                      : "noite"
                  );
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  filtroPeriodo === "noite"
                    ? "border-ice bg-ice/20 text-ice"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <Moon size={12} />
                Noite
              </button>

              {hasFiltrosAtivos && (
                <button
                  onClick={limparFiltros}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-coral/10 px-3 py-1.5 text-[10px] font-medium text-coral"
                >
                  <X size={12} />
                  Limpar
                </button>
              )}
            </div>
          </div>
        </header>

        {/* =========================================================
            CONTEÚDO
        ========================================================= */}
        <section className="space-y-5 px-4 pt-4">
          {isHoje && dosesElegiveisLote.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[26px] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-ice/5 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400">
                  <ListChecks size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                    Agora
                  </p>
                  <h2 className="mt-1 text-sm font-bold text-ink-primary">
                    {dosesElegiveisLote.length} doses aguardando
                  </h2>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
                    Confirma somente doses programadas que já chegaram ao horário. SOS e doses futuras ficam de fora.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleTomarTodos()}
                disabled={processandoTodos || Boolean(processandoDoseId)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-xs font-bold text-void transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {processandoTodos ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                {processandoTodos
                  ? "Registrando com segurança..."
                  : `Tomar todas (${dosesElegiveisLote.length})`}
              </button>
            </motion.div>
          )}

          {isHoje && medicamentosSemHorario.length > 0 && (
            <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink-primary">
                    Rotina sem horário
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
                    Estes medicamentos estão ativos, mas não geram doses pendentes porque nenhum horário válido foi configurado.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {medicamentosSemHorario.map((med) => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => {
                          trigger("vibrate");
                          router.push(
                            `/saude/medicamentos/editar?id=${med.id}`
                          );
                        }}
                        className="rounded-full border border-amber-400/20 bg-void/30 px-3 py-1.5 text-[10px] font-semibold text-amber-300"
                      >
                        {med.nome} · configurar
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {retroReviewMode && (
            <motion.div
              initial={{
                opacity:
                  0,

                y:
                  8,
              }}
              animate={{
                opacity:
                  1,

                y:
                  0,
              }}
              className="rounded-[26px] border border-ice/25 bg-ice/5 p-4 shadow-sm"
            >
              {retroReviewSummary ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/15 text-ice">
                      <Clock
                        size={
                          19
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ice">
                        Revisão retroativa assistida
                      </p>

                      <h2 className="mt-1 truncate text-sm font-bold text-ink-primary">
                        {
                          retroReviewSummary
                            .medicamento
                            .nome
                        }
                      </h2>

                      {retroReviewSummary.startDate && (
                        <p className="mt-1 text-[10px] text-ink-muted">
                          Período conhecido desde{" "}
                          <strong className="text-ink-primary">
                            {new Intl.DateTimeFormat(
                              "pt-BR"
                            ).format(
                              new Date(
                                `${retroReviewSummary.startDate}T12:00:00`
                              )
                            )}
                          </strong>
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={
                        sairRevisaoRetroativa
                      }
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted"
                      aria-label="Sair da revisão retroativa"
                    >
                      <X
                        size={
                          14
                        }
                      />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/70 p-3">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-ink-faint">
                        Previstas
                      </p>

                      <p className="mt-1 font-mono text-sm font-bold text-ink-primary">
                        {
                          retroReviewSummary
                            .totalSlots
                        }
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-400/80">
                        Revisadas
                      </p>

                      <p className="mt-1 font-mono text-sm font-bold text-emerald-400">
                        {
                          retroReviewSummary
                            .confirmedSlots
                        }
                      </p>
                    </div>

                    <div className="rounded-2xl border border-ice/20 bg-ice/5 p-3">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-ice/80">
                        Sem confirmação
                      </p>

                      <p className="mt-1 font-mono text-sm font-bold text-ice">
                        {
                          retroReviewSummary
                            .pendingSlots
                        }
                      </p>
                    </div>
                  </div>

                  {retroReviewSummary.totalSlots >
                    0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[9px] text-ink-muted">
                          Progresso da revisão
                        </span>

                        <span className="font-mono text-[9px] font-bold text-ice">
                          {Math.round(
                            (
                              retroReviewSummary
                                .confirmedSlots /
                              retroReviewSummary
                                .totalSlots
                            ) *
                              100
                          )}
                          %
                        </span>
                      </div>

                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-border">
                        <div
                          className="h-full rounded-full bg-ice transition-all duration-500"
                          style={{
                            width:
                              `${Math.round(
                                (
                                  retroReviewSummary
                                    .confirmedSlots /
                                  retroReviewSummary
                                    .totalSlots
                                ) *
                                  100
                              )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-3">
                    <Info
                      size={
                        13
                      }
                      className="mt-0.5 shrink-0 text-amber-300"
                    />

                    <p className="text-[9px] leading-relaxed text-ink-muted">
                      Os slots são reconstruídos usando a{" "}
                      <strong className="text-ink-primary">
                        rotina atualmente conhecida
                      </strong>
                      . Se os horários ou a frequência eram diferentes no passado, revise conscientemente antes de confirmar.
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={
                        irParaProximoPendenteRetroativo
                      }
                      disabled={
                        retroReviewSummary.pendingSlots ===
                        0
                      }
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-ice px-4 py-3 text-[10px] font-bold text-void transition-all active:scale-[0.99] disabled:opacity-40"
                    >
                      <ChevronRight
                        size={
                          14
                        }
                      />

                      {retroReviewSummary.pendingSlots >
                      0
                        ? "Próximo sem confirmação"
                        : "Revisão concluída"}
                    </button>

                    <button
                      type="button"
                      onClick={
                        sairRevisaoRetroativa
                      }
                      className="rounded-2xl border border-surface-border px-4 py-3 text-[10px] font-semibold text-ink-muted transition-all active:scale-[0.99]"
                    >
                      Sair
                    </button>
                  </div>

                  <p className="mt-3 text-center text-[9px] leading-relaxed text-ink-faint">
                    Nada é confirmado automaticamente. “Não lembro” continua sem registro e fora das métricas.
                  </p>
                </>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={
                      17
                    }
                    className="mt-0.5 shrink-0 text-amber-400"
                  />

                  <div>
                    <p className="text-xs font-bold text-ink-primary">
                      Medicamento não encontrado
                    </p>

                    <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
                      Não foi possível iniciar a revisão retroativa para este medicamento.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ASSISTENTE DIÁRIO */}
          {assistenteDiario && (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className={`rounded-[26px] border p-4 shadow-sm ${
                assistenteDiario.urgencia ===
                "alta"
                  ? "border-coral/30 bg-coral/5"
                  : assistenteDiario.urgencia ===
                    "media"
                  ? "border-amber-400/30 bg-amber-400/5"
                  : "border-ice/30 bg-ice/5"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    assistenteDiario.urgencia ===
                    "alta"
                      ? "bg-coral/20 text-coral"
                      : assistenteDiario.urgencia ===
                        "media"
                      ? "bg-amber-400/20 text-amber-400"
                      : "bg-ice/20 text-ice"
                  }`}
                >
                  <Activity size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={`text-sm font-bold ${
                        assistenteDiario.urgencia ===
                        "alta"
                          ? "text-coral"
                          : assistenteDiario.urgencia ===
                            "media"
                          ? "text-amber-400"
                          : "text-ice"
                      }`}
                    >
                      {assistenteDiario.titulo}
                    </h3>

                    <span className="text-xs text-ink-faint">
                      Dica
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-relaxed text-ink-primary">
                    {assistenteDiario.mensagem}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* =======================================================
              CUIDADOS DO DIA
          ======================================================= */}

          {renovacoesReceitaHoje.length >
            0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <Pill
                    size={
                      16
                    }
                    className="text-ice"
                  />

                  <div>
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">
                      Cuidados do dia
                    </h2>

                    <p className="mt-0.5 text-[9px] text-ink-faint">
                      Eventos planejados dos seus medicamentos
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-ice/20 bg-ice/10 px-2.5 py-1 font-mono text-[9px] font-bold text-ice">
                  {
                    renovacoesReceitaHoje.length
                  }
                </span>
              </div>

              <div className="space-y-2.5">
                {renovacoesReceitaHoje.map(
                  (
                    evento
                  ) => {
                    const isRetirada =
                      false;

                    return (
                      <motion.button
                        key={
                          evento.id
                        }
                        type="button"
                        whileTap={{
                          scale:
                            0.985,
                        }}
                        onClick={
                          () => {
                            trigger(
                              "vibrate"
                            );

                            router.push(
                              `/saude/medicamentos/detalhes?id=${evento.medicamentoId}`
                            );
                          }
                        }
                        className={`w-full rounded-[22px] border p-3.5 text-left transition-all ${
                          isRetirada
                            ? "border-ice/25 bg-ice/[0.055]"
                            : "border-amber-400/25 bg-amber-400/[0.055]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              isRetirada
                                ? "bg-ice/15 text-ice"
                                : "bg-amber-400/15 text-amber-400"
                            }`}
                          >
                            <FileWarning
                              size={
                                18
                              }
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[13px] font-bold text-ink-primary">
                                {
                                  evento.titulo
                                }
                              </p>

                              <span
                                className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wide ${
                                  isRetirada
                                    ? "bg-ice/10 text-ice"
                                    : "bg-amber-400/10 text-amber-400"
                                }`}
                              >
                                Receita
                              </span>
                            </div>

                            <p className="mt-1 text-[10px] text-ink-muted">
                              {
                                evento.descricao
                              }
                            </p>
                          </div>

                          <ChevronRight
                            size={
                              16
                            }
                            className="shrink-0 text-ink-faint"
                          />
                        </div>
                      </motion.button>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* =======================================================
              COMPROMISSOS
          ======================================================= */}
          {compromissosFiltrados.length >
            0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <Calendar
                    size={16}
                    className="text-coral"
                  />

                  <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">
                    Compromissos do Dia
                  </h2>
                </div>

                <span className="rounded-full bg-coral/10 px-2 py-1 font-mono text-[9px] font-bold text-coral">
                  {compromissosFiltrados.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {compromissosFiltrados.map(
                  (item: any) => {
                    const isConsulta =
                      item.tipo ===
                      "consulta";

                    const isCirurgia =
                      item.tipo ===
                      "cirurgia";

                    const isRetirada =
                      item.tipo ===
                      "retirada";

                    const compromissoConcluido =
                      item.status === "realizada";

                    const compromissoCancelado =
                      item.status === "cancelada" ||
                      item.status === "nao_realizada";

                    const getIcon = () => {
                      if (isConsulta) {
                        return (
                          <Stethoscope
                            size={18}
                            className="text-ice"
                          />
                        );
                      }

                      if (isCirurgia) {
                        return (
                          <Activity
                            size={18}
                            className="text-coral"
                          />
                        );
                      }

                      if (isRetirada) {
                        return (
                          <Pill
                            size={18}
                            className="text-ice"
                          />
                        );
                      }

                      return (
                        <FlaskConical
                          size={18}
                          className="text-emerald-400"
                        />
                      );
                    };

                    const getColor =
                      () => {
                        if (compromissoConcluido) {
                          return "border-emerald-400/35 bg-emerald-400/8";
                        }

                        if (compromissoCancelado) {
                          return "border-surface-border/50 bg-surface/60 opacity-70";
                        }
                        if (isConsulta) {
                          return "border-ice/30 bg-ice/5";
                        }

                        if (isCirurgia) {
                          return "border-coral/30 bg-coral/5";
                        }

                        if (isRetirada) {
                          return "border-ice/30 bg-ice/5";
                        }

                        return "border-emerald-400/30 bg-emerald-400/5";
                      };

                    const getLabel =
                      () => {
                        if (compromissoConcluido) {
                          return "Compromisso concluído";
                        }

                        if (compromissoCancelado) {
                          return "Compromisso encerrado";
                        }
                        if (isConsulta) {
                          return "Consulta agendada";
                        }

                        if (isCirurgia) {
                          return "Procedimento cirúrgico";
                        }

                        if (isRetirada) {
                          return "Retirada de medicamento";
                        }

                        return "Realização de exame";
                      };

                    const descricao =
                      item.especialidade ||
                      item.procedimento ||
                      item.nome ||
                      item.medicamento_nome ||
                      "Compromisso de saúde";

                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        whileTap={{
                          scale: 0.985,
                        }}
                        onClick={() =>
                          navegarCompromisso(
                            item
                          )
                        }
                        className={`w-full rounded-[24px] border p-4 text-left transition-all ${getColor()}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised">
                            {getIcon()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-ink-primary">
                                {getLabel()}
                              </p>

                              <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                  compromissoConcluido
                                    ? "bg-emerald-400/15 text-emerald-400"
                                    : compromissoCancelado
                                      ? "bg-ink-muted/10 text-ink-muted"
                                  : isConsulta
                                    ? "bg-ice/10 text-ice"
                                    : isCirurgia
                                    ? "bg-coral/10 text-coral"
                                    : isRetirada
                                      ? "bg-ice/10 text-ice"
                                      : "bg-emerald-400/10 text-emerald-400"
                                }`}
                              >
                                {
                                  compromissoConcluido
                                    ? "Concluído"
                                    : compromissoCancelado
                                      ? "Encerrado"
                                      : dataSelecionadaLabel
                                }
                              </span>
                            </div>

                            <p className="mt-1 truncate text-xs text-ink-muted">
                              {descricao}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            {item.horario && (
                              <span className={`rounded-lg px-2 py-1 font-mono text-[10px] font-bold ${compromissoConcluido ? "bg-emerald-400/10 text-emerald-400" : "bg-coral/10 text-coral"}`}>
                                {item.horario}
                              </span>
                            )}

                            <span className="rounded-full bg-ice/10 px-2.5 py-1 text-[9px] font-medium text-ice">
                              Ver
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* =======================================================
              TIMELINE / DOSES
          ======================================================= */}
          {dosesFiltradas.length === 0 ? (
            <EmptyState
              icon={Pill}
              title={
                hasFiltrosAtivos
                  ? "Nada com esses filtros"
                  : retroReviewMode
                    ? "Nenhum slot para revisar neste dia"
                    : isHoje
                      ? "Nenhum registro hoje"
                      : `Nenhum registro em ${dataSelecionadaDescricao}`
              }
              description={
                hasFiltrosAtivos
                  ? "Tente ajustar os filtros para ver mais itens."
                  : isHoje
                    ? "Registre uma dose avulsa ou adicione um sintoma para preencher sua linha do tempo."
                    : isPassado
                      ? "Não há registros confirmados ou previsões conhecidas para este dia."
                      : "Não há eventos previstos para este dia."
              }
              actionLabel={
                !hasFiltrosAtivos &&
                isHoje &&
                !retroReviewMode
                  ? "Registrar Dose Avulsa"
                  : undefined
              }
              onAction={
                !hasFiltrosAtivos &&
                isHoje &&
                !retroReviewMode
                  ? () => {
                      trigger(
                        "vibrate"
                      );
                      setIsDoseModalOpen(
                        true
                      );
                    }
                  : undefined
              }
              iconClassName="border-ice/20 bg-ice/10 text-ice"
            />
          ) : (
            dosesAgrupadas.map(
              ([key, grupo]) => {
                const total =
                  grupo.items.length;

                const concluidos =
                  grupo.items.filter(
                    (i) => i.tomada
                  ).length;

                const progresso =
                  total > 0
                    ? Math.round(
                        (concluidos /
                          total) *
                          100
                      )
                    : 0;

                const GrupoIcon = grupo.icon;

                return (
                  <div
                    key={key}
                    className="space-y-2"
                  >
                    <div className="flex items-end justify-between gap-4 px-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-raised text-ice border border-surface-border/40">
                          <GrupoIcon size={15} />
                        </div>
                        <div>
                          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">
                            {grupo.label}
                          </h2>
                          <p className="text-[11px] text-ink-muted">
                            {grupo.sub}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5">
                        <div className="hidden w-20 overflow-hidden rounded-full bg-surface-border sm:block">
                          <div
                            className="h-1.5 rounded-full bg-emerald-400 transition-all duration-500"
                            style={{
                              width: `${progresso}%`,
                            }}
                          />
                        </div>

                        <span className="font-mono text-[10px] text-ink-faint">
                          {concluidos}/
                          {total}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {grupo.items.map(
                        (item) => {
                          if (
                            item.isSintoma
                          ) {
                            return (
                              <motion.button
                                key={`sintoma-${item.sintomaId}`}
                                type="button"
                                whileTap={{
                                  scale: 0.985,
                                }}
                                onClick={() => {
                                  trigger(
                                    "vibrate"
                                  );

                                  router.push(
                                    `/saude/registros/detalhes?id=${item.sintomaId}`
                                  );
                                }}
                                style={{
                                  borderLeft: `6px solid ${item.cor}`,
                                }}
                                className="group relative flex w-full flex-col gap-3 rounded-[24px] border border-amber-400/30 bg-amber-400/5 p-4 text-left shadow-sm transition-all hover:border-amber-400/60"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
                                    <Activity
                                      size={20}
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                        <AlertTriangle size={12} /> Sintoma
                                      </span>

                                      <span className="text-[10px] text-ink-faint">
                                        •
                                      </span>

                                      <span className="font-mono text-[10px] text-ink-faint">
                                        {
                                          item.horario
                                        }
                                      </span>
                                    </div>

                                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                                      {
                                        item.sintomaNome
                                      }
                                    </p>

                                    {item.intensidade && (
                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-medium text-ink-muted">
                                          Intensidade:
                                        </span>

                                        <div className="flex gap-0.5">
                                          {[
                                            1,
                                            2,
                                            3,
                                            4,
                                            5,
                                          ].map(
                                            (
                                              nivel
                                            ) => (
                                              <div
                                                key={
                                                  nivel
                                                }
                                                className={`h-1.5 w-3.5 rounded-full ${
                                                  nivel <=
                                                  (item.intensidade ||
                                                    1)
                                                    ? "bg-amber-400"
                                                    : "bg-surface-border"
                                                }`}
                                              />
                                            )
                                          )}
                                        </div>

                                        <span className="font-mono text-[10px] font-bold text-amber-400">
                                          {
                                            item.intensidade
                                          }
                                          /5
                                        </span>
                                      </div>
                                    )}

                                    {item.observacoesSintoma && (
                                      <p className="mt-2 line-clamp-2 text-xs italic text-ink-muted">
                                        "
                                        {
                                          item.observacoesSintoma
                                        }
                                        "
                                      </p>
                                    )}
                                  </div>

                                  <span className="shrink-0 rounded-full bg-amber-400/10 px-2 py-1 text-[9px] font-semibold text-amber-400">
                                    Ver
                                  </span>
                                </div>
                              </motion.button>
                            );
                          }

                          const isAtrasado =
                            isHoje &&
                            !item.tomada &&
                            !item.ignorada &&
                            item.horario <
                              horaAtual &&
                            !item.isAvulsa;

                          const isProximo =
                            isHoje &&
                            !item.tomada &&
                            !item.ignorada &&
                            item.horario >=
                              horaAtual &&
                            !item.isAvulsa;

                          const isPrevistoFuturo =
                            isFuturo &&
                            !item.tomada &&
                            !item.ignorada &&
                            !item.isAvulsa;

                          const isHistoricoSemConfirmacao =
                            isPassado &&
                            item.isExpectedUnconfirmed &&
                            !item.tomada &&
                            !item.ignorada &&
                            !item.isAvulsa;

                          const isEstoqueZerado =
                            (item.estoqueRestante ??
                              0) <= 0;

                          const tratamentoCor =
                            item.tratamentoCor ||
                            item.cor ||
                            "#8B5CF6";

                          const isProcessando =
                            processandoDoseId ===
                            (item.logId
                              ? `log-${item.logId}`
                              : `${item.medicamentoId}-${item.horario}`);

                          const diasEstilo =
                            getDiasRestantesEstilo(
                              item.diasRestantes
                            );

                          let statusIcon =
                            null;

                          let statusText =
                            "";

                          let statusColor =
                            "";

                          if (
                            item.tomada
                          ) {
                            statusIcon = (
                              <CheckCircle2
                                size={12}
                                className="text-emerald-400"
                              />
                            );

                            statusText =
                              item.isAvulsa
                                ? "Tomada · Avulsa"
                                : "Tomada";

                            statusColor =
                              "text-emerald-400";
                          } else if (
                            item.ignorada
                          ) {
                            statusIcon = (
                              <XCircle
                                size={12}
                                className="text-ink-muted"
                              />
                            );

                            statusText =
                              "Ignorada";

                            statusColor =
                              "text-ink-muted";
                          } else if (
                            isPrevistoFuturo
                          ) {
                            statusIcon = (
                              <Clock
                                size={12}
                                className="text-violet-300"
                              />
                            );

                            statusText =
                              "Prevista";

                            statusColor =
                              "text-violet-300";
                          } else if (
                            isHistoricoSemConfirmacao
                          ) {
                            statusIcon = (
                              <Clock
                                size={12}
                                className="text-ice"
                              />
                            );

                            statusText =
                              "Sem confirmação";

                            statusColor =
                              "text-ice";
                          } else if (
                            isAtrasado
                          ) {
                            statusIcon = (
                              <AlertTriangle
                                size={12}
                                className="text-coral"
                              />
                            );

                            statusText =
                              "Atrasado";

                            statusColor =
                              "text-coral";
                          } else if (
                            isProximo
                          ) {
                            statusIcon = (
                              <Clock
                                size={12}
                                className="text-amber-400"
                              />
                            );

                            statusText =
                              "Próximo";

                            statusColor =
                              "text-amber-400";
                          } else {
                            statusIcon = (
                              <Circle
                                size={12}
                                className="text-ink-faint"
                              />
                            );

                            statusText =
                              item.horario;

                            statusColor =
                              "text-ink-faint";
                          }

                          return (
                            <motion.div
                              key={
                                item.logId ||
                                `${item.medicamentoId}-${item.horario}`
                              }
                              role="button"
                              tabIndex={0}
                              aria-label="Abrir detalhes do medicamento"
                              onClick={() => {
                                if (!item.medicamentoId) return;

                                trigger("vibrate");

                                router.push(
                                  "/saude/medicamentos/detalhes?id=" +
                                    item.medicamentoId
                                );
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key !== "Enter" &&
                                  event.key !== " "
                                ) return;

                                event.preventDefault();

                                if (item.medicamentoId) {
                                  router.push(
                                    "/saude/medicamentos/detalhes?id=" +
                                      item.medicamentoId
                                  );
                                }
                              }}
                              whileTap={{
                                scale: 0.99,
                              }}
                              style={{
                                borderLeft: `4px solid ${tratamentoCor}`,
                              }}
                              className={`group relative w-full cursor-pointer rounded-[18px] border px-3 py-2.5 pr-8 text-left shadow-sm transition-all ${
                                item.tomada
                                  ? "border-emerald-400/30 bg-emerald-400/5 opacity-90"
                                  : item.ignorada
                                  ? "border-ink-muted/20 bg-surface-raised/50 opacity-60"
                                  : isPrevistoFuturo
                                  ? "border-violet-400/25 bg-violet-400/[0.045]"
                                  : isHistoricoSemConfirmacao
                                  ? "border-ice/20 bg-ice/[0.035]"
                                  : isAtrasado
                                  ? "border-coral/50 bg-coral/5"
                                  : isProximo
                                  ? "border-amber-400/20 bg-amber-400/5"
                                  : "border-surface-border/50 bg-surface"
                              } ${
                                isProcessando
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }`}
                            >
                              <ChevronRight
                                size={16}
                                aria-hidden="true"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ice/60 transition-transform group-active:translate-x-0.5"
                              />

                              <div className="space-y-1.5">
                                <div className="flex items-start gap-2.5">
                                  <div className="shrink-0 pt-0.5">
                                    {item.tomada ? (
                                      <CheckCircle2
                                        size={20}
                                        className="text-emerald-400"
                                      />
                                    ) : item.ignorada ? (
                                      <XCircle
                                        size={20}
                                        className="text-ink-muted"
                                      />
                                    ) : (
                                      <Circle
                                        size={20}
                                        className="text-ink-faint"
                                      />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <span
                                        className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold ${statusColor}`}
                                      >
                                        {statusIcon}
                                        {statusText}
                                      </span>

                                      <span className="text-[10px] text-ink-faint">
                                        •
                                      </span>

                                      <span className="font-mono text-[10px] text-ink-faint">
                                        {
                                          item.horario
                                        }
                                      </span>

                                      {item.isAvulsa && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                                          <Zap size={10} /> SOS / Avulsa
                                        </span>
                                      )}
                                    </div>

                                    <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
                                      <p
                                      className={`min-w-0 truncate text-sm font-semibold ${
                                        item.ignorada
                                          ? "text-ink-muted line-through"
                                          : "text-ink-primary"
                                      }`}
                                    >
                                      {
                                        item.medicamentoNome
                                      }
                                    </p>

                                    {item.dosagem && (
                                      <span className="shrink-0 text-[11px] font-medium text-ink-muted">
                                        {
                                          item.dosagem
                                        }
                                      </span>
                                    )}
                                    </div>

                                    {item.isAvulsa &&
                                      item.motivoAvulsa && (
                                        <p className="mt-2 w-fit max-w-full rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                                          Motivo:{" "}
                                          {
                                            item.motivoAvulsa
                                          }
                                        </p>
                                      )}

                                    {(item.tratamentoNome ||
                                      item.medicoNome ||
                                      item.farmaciaNome) && (
                                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        {item.tratamentoNome &&
                                          item.tratamentoId && (
                                            <span
                                              className="max-w-full truncate rounded-md px-2 py-0.5 text-[9px] font-bold uppercase"
                                              style={{
                                                backgroundColor: `${tratamentoCor}20`,
                                                color: tratamentoCor,
                                              }}
                                            >
                                              {
                                                item.tratamentoNome
                                              }
                                            </span>
                                          )}

                                        {item.medicoNome && (
                                          <span className="flex max-w-full items-center gap-1 truncate text-[10px] text-ink-muted">
                                            <Stethoscope
                                              size={
                                                10
                                              }
                                              className="shrink-0"
                                            />
                                            <span className="truncate">
                                              Dr(a).{" "}
                                              {
                                                item.medicoNome
                                              }
                                            </span>
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {!item.isAvulsa && (
                                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                                          Dose: {item.unidadePorDose !== undefined
                                            ? `${item.unidadePorDose} ${item.unidadeDose || "unidades"}`
                                            : "quantidade não informada"}
                                        </span>
                                        {(
                                          item.estoqueRestante ??
                                          0
                                        ) >= 0 && (
                                          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                                            Estoque:{" "}
                                            {
                                              item.estoqueRestante
                                            }{" "}
                                            {
                                              item.unidadeMedida
                                            }
                                          </span>
                                        )}

                                        {item.diasRestantes !==
                                          undefined &&
                                          item.diasRestantes !==
                                            null &&
                                          item.diasRestantes >=
                                            0 &&
                                          item.diasRestantes <=
                                            90 && (
                                            <span
                                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${diasEstilo.cor} ${diasEstilo.bg}`}
                                            >
                                              <Calendar
                                                size={
                                                  11
                                                }
                                              />

                                              {
                                                item.diasRestantes
                                              }{" "}
                                              dias
                                            </span>
                                          )}
                                      </div>
                                    )}

                                    {!item.isAvulsa &&
                                      isEstoqueZerado && (
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-coral">
                                            <AlertTriangle
                                              size={
                                                14
                                              }
                                            />
                                            Estoque zerado!
                                          </span>

                                          <button
                                            type="button"
                                            onClick={(
                                              e
                                            ) => {
                                              e.stopPropagation();

                                              trigger(
                                                "vibrate"
                                              );

                                              const med =
                                                medicamentos.find(
                                                  (
                                                    m
                                                  ) =>
                                                    m.id ===
                                                    item.medicamentoId
                                                );

                                              if (
                                                med
                                              ) {
                                                setMedicamentoSelecionado(
                                                  med
                                                );

                                                setModalAberto(
                                                  true
                                                );
                                              }
                                            }}
                                            className="rounded-full bg-coral/20 px-2.5 py-1 text-[9px] font-bold text-coral transition-colors hover:bg-coral/30"
                                          >
                                            Renovar
                                          </button>
                                        </div>
                                      )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                                  {!isHoje &&
                                  !item.isAvulsa ? (
                                    isPassado ? (
                                      <button
                                        type="button"
                                        onClick={(
                                          e
                                        ) => {
                                          e.stopPropagation();

                                          abrirRevisaoHistorica(
                                            item
                                          );
                                        }}
                                        disabled={
                                          isHistoricalProcessing
                                        }
                                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[9px] font-bold transition-all active:scale-95 disabled:opacity-50 ${
                                          item.tomada
                                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                            : item.ignorada
                                              ? "border-surface-border/50 bg-surface-raised text-ink-muted"
                                              : "border-ice/30 bg-ice/10 text-ice"
                                        }`}
                                      >
                                        {item.tomada ? (
                                          <>
                                            <CheckCircle2
                                              size={
                                                12
                                              }
                                            />
                                            Revisar tomada
                                          </>
                                        ) : item.ignorada ? (
                                          <>
                                            <XCircle
                                              size={
                                                12
                                              }
                                            />
                                            Revisar
                                          </>
                                        ) : (
                                          <>
                                            <Clock
                                              size={
                                                12
                                              }
                                            />
                                            Revisar histórico
                                          </>
                                        )}
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[9px] font-medium text-violet-300">
                                        <Clock
                                          size={
                                            11
                                          }
                                        />
                                        Prevista
                                      </span>
                                    )
                                  ) : (
                                    <>
                                      {!item.tomada &&
                                        !item.ignorada &&
                                        !item.isAvulsa && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={(
                                                e
                                              ) => {
                                                e.stopPropagation();

                                                handleIgnorar(
                                                  item
                                                );
                                              }}
                                              disabled={
                                                isProcessando ||
                                                isProcessing
                                              }
                                              className="rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[9px] font-medium text-ink-muted transition-all hover:bg-ink-muted/10 active:scale-95 disabled:opacity-50"
                                            >
                                              Ignorar
                                            </button>

                                            <button
                                              type="button"
                                              onClick={(
                                                e
                                              ) => {
                                                e.stopPropagation();

                                                handleToggle(
                                                  item
                                                );
                                              }}
                                              disabled={
                                                isProcessando ||
                                                isProcessing
                                              }
                                              className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-3 py-1 text-[9px] font-bold text-void shadow-sm transition-all hover:bg-emerald-300 active:scale-95 disabled:opacity-50"
                                            >
                                              <CheckCircle2
                                                size={
                                                  13
                                                }
                                              />

                                              {isProcessando
                                                ? "..."
                                                : "Tomar"}
                                            </button>
                                          </>
                                        )}

                                      {item.tomada && (
                                        <button
                                          type="button"
                                          onClick={(
                                            e
                                          ) => {
                                            e.stopPropagation();

                                            handleToggle(
                                              item
                                            );
                                          }}
                                          disabled={
                                            isProcessando ||
                                            isProcessing
                                          }
                                          className="inline-flex items-center gap-1 rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[9px] font-medium text-ink-muted transition-all hover:bg-ink-muted/10 active:scale-95 disabled:opacity-50"
                                        >
                                          {item.isAvulsa ? (
                                            <>
                                              <Trash2
                                                size={
                                                  12
                                                }
                                              />
                                              Excluir
                                            </>
                                          ) : (
                                            <>
                                              <RotateCcw
                                                size={
                                                  12
                                                }
                                              />
                                              Desfazer
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              }
            )
          )}
        </section>

        {/* =========================================================
            MODAL — DOSE AVULSA
        ========================================================= */}
        <AnimatePresence>
          {historicalDoseReviewItem && (
            <>
              <motion.button
                type="button"
                aria-label="Fechar revisão histórica"
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
                onClick={
                  fecharRevisaoHistorica
                }
                className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm"
              />

              <motion.div
                initial={{
                  opacity:
                    0,

                  y:
                    36,
                }}
                animate={{
                  opacity:
                    1,

                  y:
                    0,
                }}
                exit={{
                  opacity:
                    0,

                  y:
                    36,
                }}
                transition={{
                  duration:
                    0.18,
                }}
                className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[120] mx-auto max-w-lg rounded-[30px] border border-surface-border bg-surface p-5 shadow-2xl"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                    <Clock
                      size={
                        20
                      }
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ice">
                      Revisão histórica
                    </p>

                    <h3 className="mt-1 truncate text-base font-bold text-ink-primary">
                      {
                        historicalDoseReviewItem
                          .medicamentoNome
                      }
                    </h3>

                    <p className="mt-1 text-xs text-ink-muted">
                      {
                        dataSelecionadaDescricao
                      }{" "}
                      •{" "}
                      {
                        historicalDoseReviewItem
                          .horario
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      fecharRevisaoHistorica
                    }
                    disabled={
                      isHistoricalProcessing
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted disabled:opacity-40"
                  >
                    <X
                      size={
                        16
                      }
                    />
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-ice/15 bg-ice/5 p-3">
                  <p className="text-[10px] leading-relaxed text-ink-muted">
                    Esta revisão altera apenas o histórico.{" "}
                    <strong className="text-ink-primary">
                      O estoque atual não será movimentado.
                    </strong>
                  </p>
                </div>

                {(historicalDoseReviewItem.tomada ||
                  historicalDoseReviewItem.ignorada) && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-surface-border bg-surface-raised px-3 py-2.5">
                    {historicalDoseReviewItem.tomada ? (
                      <CheckCircle2
                        size={
                          15
                        }
                        className="text-emerald-400"
                      />
                    ) : (
                      <XCircle
                        size={
                          15
                        }
                        className="text-ink-muted"
                      />
                    )}

                    <p className="text-[10px] text-ink-muted">
                      Estado atual:{" "}
                      <strong className="text-ink-primary">
                        {historicalDoseReviewItem.tomada
                          ? "tomada"
                          : "não tomada"}
                      </strong>
                    </p>
                  </div>
                )}

                {!historicalCustomMode ? (
                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      disabled={
                        isHistoricalProcessing
                      }
                      onClick={
                        () =>
                          executarRevisaoHistorica(
                            "scheduled"
                          )
                      }
                      className="flex w-full items-center justify-between rounded-2xl bg-emerald-400 px-4 py-3.5 text-left text-void transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      <div>
                        <p className="text-xs font-bold">
                          Tomei no horário
                        </p>

                        <p className="mt-0.5 text-[9px] opacity-70">
                          Registrar às{" "}
                          {
                            historicalDoseReviewItem
                              .horario
                          }
                        </p>
                      </div>

                      <CheckCircle2
                        size={
                          18
                        }
                      />
                    </button>

                    <button
                      type="button"
                      disabled={
                        isHistoricalProcessing
                      }
                      onClick={
                        () =>
                          setHistoricalCustomMode(
                            true
                          )
                      }
                      className="flex w-full items-center justify-between rounded-2xl border border-ice/25 bg-ice/10 px-4 py-3.5 text-left text-ice transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      <div>
                        <p className="text-xs font-bold">
                          Tomei em outro horário
                        </p>

                        <p className="mt-0.5 text-[9px] text-ink-muted">
                          Informar quando realmente tomou
                        </p>
                      </div>

                      <Clock
                        size={
                          18
                        }
                      />
                    </button>

                    <button
                      type="button"
                      disabled={
                        isHistoricalProcessing
                      }
                      onClick={
                        () =>
                          executarRevisaoHistorica(
                            "ignored"
                          )
                      }
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border bg-surface-raised px-4 py-3.5 text-left text-ink-primary transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      <div>
                        <p className="text-xs font-bold">
                          Não tomei
                        </p>

                        <p className="mt-0.5 text-[9px] text-ink-muted">
                          Confirmar ausência daquela dose
                        </p>
                      </div>

                      <XCircle
                        size={
                          18
                        }
                        className="text-ink-muted"
                      />
                    </button>

                    <button
                      type="button"
                      disabled={
                        isHistoricalProcessing
                      }
                      onClick={
                        fecharRevisaoHistorica
                      }
                      className="w-full rounded-2xl border border-surface-border/60 px-4 py-3 text-xs font-semibold text-ink-muted transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      Não lembro
                    </button>

                    {(historicalDoseReviewItem.tomada ||
                      historicalDoseReviewItem.ignorada) && (
                      <button
                        type="button"
                        disabled={
                          isHistoricalProcessing
                        }
                        onClick={
                          () =>
                            executarRevisaoHistorica(
                              "clear"
                            )
                        }
                        className="flex w-full items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-[10px] font-semibold text-coral transition-all active:scale-[0.99] disabled:opacity-50"
                      >
                        <RotateCcw
                          size={
                            13
                          }
                        />
                        Remover confirmação histórica
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <label className="block">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                        Quando tomou?
                      </span>

                      <input
                        type="datetime-local"
                        value={
                          historicalCustomTakenAt
                        }
                        min={
                          `${dataSelecionada}T00:00`
                        }
                        max={
                          `${dataSelecionada}T23:59`
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setHistoricalCustomTakenAt(
                              event.target.value
                            )
                        }
                        className="mt-2 w-full rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 font-mono text-sm text-ink-primary outline-none transition-colors focus:border-ice/50"
                      />
                    </label>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={
                          isHistoricalProcessing
                        }
                        onClick={
                          () =>
                            setHistoricalCustomMode(
                              false
                            )
                        }
                        className="rounded-2xl border border-surface-border px-4 py-3 text-xs font-semibold text-ink-muted disabled:opacity-50"
                      >
                        Voltar
                      </button>

                      <button
                        type="button"
                        disabled={
                          isHistoricalProcessing ||
                          !historicalCustomTakenAt
                        }
                        onClick={
                          () =>
                            executarRevisaoHistorica(
                              "custom"
                            )
                        }
                        className="rounded-2xl bg-ice px-4 py-3 text-xs font-bold text-void disabled:opacity-50"
                      >
                        {isHistoricalProcessing
                          ? "Salvando..."
                          : "Confirmar horário"}
                      </button>
                    </div>
                  </div>
                )}

                <p className="mt-3 text-center text-[9px] leading-relaxed text-ink-faint">
                  “Não lembro” não cria nenhum registro e permanece fora das métricas de adesão.
                </p>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {loteConfirmado.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-md rounded-[22px] border border-emerald-400/25 bg-surface/95 p-3 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400">
                  <CheckCircle2 size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink-primary">
                    {loteConfirmado.length} {loteConfirmado.length === 1 ? "dose registrada" : "doses registradas"}
                  </p>
                  <p className="mt-0.5 text-[9px] text-ink-muted">
                    Estoque movimentado pela quantidade real de cada dose.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDesfazerLote()}
                  disabled={processandoTodos}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-surface-raised px-3 py-2 text-[10px] font-bold text-ice disabled:opacity-50"
                >
                  {processandoTodos ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <RotateCcw size={13} />
                  )}
                  Desfazer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <QuickDoseModal
          isOpen={isDoseModalOpen}
          onClose={() =>
            setIsDoseModalOpen(false)
          }
          onSuccess={() => {
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
          }}
        />

        {/* =========================================================
            MODAL — ESTOQUE BAIXO
        ========================================================= */}
        <AnimatePresence>
          {modalAberto &&
            medicamentoSelecionado && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-md"
                onClick={() => {
                  trigger("vibrate");
                  setModalAberto(false);
                }}
              >
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.95,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    y: 10,
                  }}
                  transition={{
                    duration: 0.18,
                  }}
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                  className="w-full max-w-md overflow-hidden rounded-[32px] border border-surface-border bg-surface shadow-2xl"
                >
                  <div className="border-b border-surface-border/50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral/20 text-coral">
                          <AlertTriangle
                            size={21}
                          />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-display text-base font-bold text-ink-primary">
                            Estoque baixo
                          </h3>

                          <p className="truncate text-xs text-ink-muted">
                            {
                              medicamentoSelecionado.nome
                            }
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );
                          setModalAberto(
                            false
                          );
                        }}
                        className="shrink-0 rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="rounded-2xl border border-coral/20 bg-coral/5 p-3">
                      <p className="text-xs leading-relaxed text-ink-muted">
                        Deseja registrar a
                        renovação e repor o
                        estoque no sistema?
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium text-ink-muted">
                          Unidades a adicionar
                        </label>

                        <input
                          type="number"
                          min="0"
                          value={
                            adicionarMaisEstoque
                          }
                          onChange={(e) =>
                            setAdicionarMaisEstoque(
                              Number(
                                e.target.value
                              )
                            )
                          }
                          className="w-full rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none transition-colors focus:border-ice"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium text-ink-muted">
                          Preço pago (R$)
                          <span className="ml-1 text-ink-faint">
                            — opcional
                          </span>
                        </label>

                        <div className="relative">
                          <DollarSign
                            size={16}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400"
                          />

                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={
                              precoRenovacao
                            }
                            onChange={(e) =>
                              setPrecoRenovacao(
                                e.target
                                  .value
                              )
                            }
                            className="w-full rounded-2xl border border-surface-border bg-surface-raised py-3 pl-10 pr-4 font-mono text-sm text-ink-primary outline-none transition-colors focus:border-ice"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium text-ink-muted">
                          Observações
                        </label>

                        <input
                          type="text"
                          placeholder="Ex: Farmácia X / SUS"
                          value={
                            observacoesRenovacao
                          }
                          onChange={(e) =>
                            setObservacoesRenovacao(
                              e.target
                                .value
                            )
                          }
                          className="w-full rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none transition-colors focus:border-ice"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-surface-border/50 p-5">
                    <button
                      type="button"
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );
                        setModalAberto(
                          false
                        );
                      }}
                      className="flex-1 rounded-2xl border border-surface-border bg-surface-raised py-3 text-xs font-semibold text-ink-muted transition-all active:scale-95"
                    >
                      Depois
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleSalvarRenovacaoDoModal
                      }
                      disabled={
                        isProcessing
                      }
                      className="flex-1 rounded-2xl bg-emerald-400 py-3 text-xs font-semibold text-void shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isProcessing
                        ? "Salvando..."
                        : "Repor e Renovar"}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}
