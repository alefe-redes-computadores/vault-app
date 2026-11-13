// app/page.tsx
"use client";
import { selectHomeDocumentAlerts, countHomeTakenDoseLogs, selectHomeOverdueWithdrawals } from "@/lib/home/home-view-projections";
import { projectHomeDashboardAlerts } from "@/lib/home/home-dashboard-alerts";
import { safeReturnTarget, withReturnTarget } from "@/lib/navigation/return-context";
import { formatVaultClinicalDateBR } from "@/lib/home/format-clinical-date";
import { getVaultTreatmentIcon } from "@/lib/health-profile/treatment-icon";
import {WithdrawalPreparationView} from "@/components/saude/WithdrawalPreparationSummary";
import {useSupplyOverview} from "@/hooks/useSupplyOverview";
import {brainV5PriorityReason} from "@/lib/health-intelligence/brain-v5";

import {
  useEffect,
  useMemo,
  useRef,
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
  Droplets,
  Info,
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
import { medicationsForOwner } from "@/lib/health-intelligence/medication-owner-scope";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { doseLogsRepository } from "@/lib/repositories/doseLogs";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useSharedHealthIntelligence as useHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { useBrainV5Pulse } from "@/hooks/useBrainV5Pulse";
import { useRetiradas } from "@/hooks/useRetiradas";
import { MEDICATION_ALERT_PREF_EVENT } from "@/lib/health-intelligence/medication-alert-policy";
import { useLocalDay } from "@/hooks/useLocalDay";
import { isOverdueWithdrawal, openWithdrawalsDueBy, withdrawalDaysOverdue } from "@/lib/withdrawal-agenda";

import { useHapticFeedback } from "@/lib/haptics";
import { db } from "@/lib/db";

import {
  addDaysToLocalDate,
  alertLevelColor,
  getDocumentAlerts,
  type AlertLevel,
} from "@/lib/health-utils";

import {
  gerarAlertasVisaoGeral,
  type AlertaVisaoGeral,
  type HealthInsight,
} from "@/lib/health-insights";

import {
  buildMedicationCareOpportunities,
} from "@/lib/health-intelligence/medication-care-opportunities";
import {
  suppressOperationalOverlap,
} from "@/lib/health-intelligence/home-signal-orchestration";
import { buildDoseSlotIndex, doseSlotIsResolved, resolveDoseSlot } from "@/lib/dose-slot-authority";

import { PageTransition } from "@/components/PageTransition";
import { ClinicalDisclosure } from "@/components/saude/ClinicalDisclosure";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";
import { MedicationCareOpportunityQueue } from "@/components/saude/MedicationCareOpportunityQueue";
import {
  PendingDosesModal,
  type PendingDose,
  type PendingDoseResolution,
} from "@/components/PendingDosesModal";
import { HealthInsightExplanationSheet } from "@/components/health-intelligence/HealthInsightExplanationSheet";
import { HomeCommandCenter } from "@/components/home/HomeCommandCenter";
import { HomeEssentialToggleM118 } from "@/components/home/HomeEssentialToggleM118";
import { buildHomeFinancialSummary } from "@/lib/home/financial-summary";
import { buildHomeDoseProgress } from "@/lib/home/dose-progress";
import { countHomeTodayAppointments } from "@/lib/home/appointment-metrics";
import { selectHomeDayEvents } from "@/lib/home/appointment-day-selection";
import { buildHomePendingDoseProjection } from "@/lib/home/pending-dose-projection";
import { buildHomePendingBrief } from "@/lib/home/home-pending-brief";
import { HomeQuickMetrics } from "@/components/home/HomeQuickMetrics";
import { HomeAgendaBreakdown } from "@/components/home/HomeAgendaBreakdown";
import { HomeDoseQuantityFollowUp } from "@/components/home/HomeDoseQuantityFollowUp";
import { HomeDailyHero } from "@/components/home/HomeDailyHero";
import { HomeAttentionRail } from "@/components/home/HomeAttentionRail";
import { HomeBrainEvidenceGroup } from "@/components/home/HomeBrainEvidenceGroup";
import { groupHomeBrainEvidence } from "@/lib/home/brain-evidence-groups";
import { HomeSectionNav } from "@/components/home/HomeSectionNav";
import { VaultUpdateHomePromptM117 } from "@/components/updates/VaultUpdateHomePromptM117";
import { VaultBrainCommand } from "@/components/health-intelligence/VaultBrainCommand";
import { AlertRow, getAlertIcon, type DashboardAlert } from "@/components/home/HomeAlertRow";

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

function buildLocalDateTimeIso(
  date: string,
  time: string
): string {
  const [
    year,
    month,
    day,
  ] =
    date
      .split("-")
      .map(Number);

  const [
    hour,
    minute,
  ] =
    time
      .split(":")
      .map(Number);

  const parsed =
    new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      0,
      0
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      "Data ou horário inválido."
    );
  }

  return parsed.toISOString();
}

function parseLocalDateTimeInput(
  value: string
): string {
  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      "Data ou horário da tomada inválido."
    );
  }

  return parsed.toISOString();
}

function getTratamentoIcon(nome:string) { return getVaultTreatmentIcon(nome); }

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

// ============================================================
// HOME
// ============================================================

export default function HomePage() {
 const supplyOverview=useSupplyOverview();
 const sourceNotesById=useMemo(() => new Map((supplyOverview?.renewals||[]).filter(r=>r.id).map(r=>[r.id!,r])),[supplyOverview?.renewals]);
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

  // Ledger-only: não executa uma segunda análise clínica na Home.
  const brainV5Pulse = useBrainV5Pulse();

  const hoje = useLocalDay();

  const ontem =
    addDaysToLocalDate(
      hoje,
      -1
    );

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

  // R9 R7: a Home e Hoje compartilham o mesmo isolamento por conta e pessoa.
  const medicamentos = useMemo(
    () => medicationsForOwner(medicamentosTodas, activePersonId, user?.id),
    [medicamentosTodas, activePersonId, user?.id],
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

  const medicamentosById =
    useMemo(
      () => new Map(medicamentos.map((medicamento: any) => [medicamento.id, medicamento])),
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

    marcarComoTomadaEm:
      marcarDoseHojeEm,

    marcarComoIgnorada:
      ignorarDoseHoje,
  } =
    useDoseLogs(
      hoje
    );

  const {
    doseLogs:
      doseLogsOntem,

    marcarComoTomadaEm:
      marcarDoseOntemEm,

    marcarComoIgnorada:
      ignorarDoseOntem,
  } =
    useDoseLogs(
      ontem
    );

  // Um agendamento explícito não desaparece da Home depois de "ontem".
  // A consulta é reativa e restrita à pessoa/conta; só inclui dias anteriores
  // aos slots que os hooks de hoje e ontem já carregam.
  const plannedEarlier = useLiveQuery(
    () => activePersonId && user?.id
      ? db.doseLogs.where("[user_id+person_id]").equals([user.id, activePersonId]).filter(log =>
          log.dose_kind === "planned" &&
          log.data < ontem && !log.tomado_em && !log.ignorado_em).toArray()
      : [],
    [activePersonId, user?.id, ontem],
    []
  );

  // Uma única leitura reativa sustenta a fila limitada de revisão (7 dias).
  // Ausência de log continua sendo apenas "sem desfecho", nunca não adesão.
  const reviewDoseLogs = useLiveQuery(
    () => activePersonId && user?.id
      ? db.doseLogs.where("[user_id+person_id]").equals([user.id, activePersonId]).filter(log =>
          log.data >= addDaysToLocalDate(hoje, -6) && log.data <= hoje).toArray()
      : [],
    [activePersonId, user?.id, hoje],
    []
  );

  // ==========================================================
  // ENTIDADES CLÍNICAS PERSON-SCOPED
  // ==========================================================

  // V260: uma assinatura indexada substitui cinco observadores independentes.
  // O snapshot carrega a identidade do proprietário para nunca renderizar o
  // resultado atrasado da pessoa/conta anterior durante uma troca de perfil.
  const homeClinicalData = useLiveQuery(async () => {
    if (!activePersonId || !user?.id) return null;
    const owner = [user.id, activePersonId] as [string, string];
    const [tratamentos, exames, renovacoes, consultas, cirurgias] = await Promise.all([
      db.tratamentos.where("[user_id+person_id]").equals(owner).toArray(),
      db.exames.where("[user_id+person_id]").equals(owner).toArray(),
      db.renovacoes.where("[user_id+person_id]").equals(owner).toArray(),
      db.consultas.where("[user_id+person_id]").equals(owner).toArray(),
      db.cirurgias.where("[user_id+person_id]").equals(owner).toArray(),
    ]);
    return { userId: user.id, personId: activePersonId, tratamentos, exames, renovacoes, consultas, cirurgias };
  }, [activePersonId, user?.id]);
  const homeClinicalReady = Boolean(homeClinicalData && homeClinicalData.userId === user?.id && homeClinicalData.personId === activePersonId);
  const tratamentos = homeClinicalReady ? homeClinicalData!.tratamentos : [];
  const exames = homeClinicalReady ? homeClinicalData!.exames : [];
  const renovacoes = homeClinicalReady ? homeClinicalData!.renovacoes : [];
  const consultas = homeClinicalReady ? homeClinicalData!.consultas : [];
  const cirurgias = homeClinicalReady ? homeClinicalData!.cirurgias : [];

  const {
    retiradas,
  } =
    useRetiradas();

  // ==========================================================
  // COMPROMISSOS DE HOJE
  // ==========================================================

  const consultasHoje =
    useMemo(
      () =>
        selectHomeDayEvents(consultas, hoje, true),
      [
        consultas,
        hoje,
      ]
    );

  const examesHoje =
    useMemo(
      () =>
        selectHomeDayEvents(exames, hoje, false),
      [
        exames,
        hoje,
      ]
    );

  const cirurgiasHoje =
    useMemo(
      () =>
        selectHomeDayEvents(cirurgias, hoje, true),
      [
        cirurgias,
        hoje,
      ]
    );

  const retiradasHoje =
    useMemo(
      () => openWithdrawalsDueBy(retiradas, hoje),
      [
        retiradas,
        hoje,
      ]
    );

  const retiradasAtrasadas = useMemo(
    () => selectHomeOverdueWithdrawals(retiradasHoje, hoje),
    [retiradasHoje, hoje]
  );

  // R9 R8: contabiliza apenas eventos já filtrados pelos repositórios; nenhuma nova leitura.
  const totalCompromissosHoje = countHomeTodayAppointments({
    consultations: consultasHoje,
    exams: examesHoje,
    surgeries: cirurgiasHoje,
    withdrawals: retiradasHoje,
  });

  // ==========================================================
  // DOSES PENDENTES
  // ==========================================================

  const dosesPendentesAtrasadas = useMemo<PendingDose[]>(() => buildHomePendingDoseProjection({
    medications: medicamentosAtivos,
    reviewLogs: reviewDoseLogs,
    plannedEarlier,
    yesterdayLogs: doseLogsOntem,
    todayLogs: doseLogs,
    userId: user?.id,
    personId: activePersonId || undefined,
    today: hoje,
    yesterday: ontem,
    currentTime: horaAtual,
  }), [
    medicamentosAtivos,
    reviewDoseLogs,
    plannedEarlier,
    doseLogsOntem,
    doseLogs,
    user?.id,
    activePersonId,
    hoje,
    ontem,
    horaAtual,
  ]);

  // P9: explicação enxuta, somente evidência de slots já abertos.
  const homePendingBrief = useMemo(() => buildHomePendingBrief(dosesPendentesAtrasadas), [dosesPendentesAtrasadas]);

  const dosesTomadasHoje = useMemo(
    () => countHomeTakenDoseLogs(doseLogs),
    [doseLogs]
  );

  const doseProgress = useMemo(
    () => buildHomeDoseProgress(medicamentosAtivos, doseLogs),
    [medicamentosAtivos, doseLogs]
  );
  const totalDosesPlanejadasHoje = doseProgress.planned;
  const dosesTomadasDaRotinaHoje = doseProgress.taken;
  const progressoDosesHoje = doseProgress.percentage;

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

          retiradas,
        }),
      [
        medicamentosAtivos,
        consultas,
        exames,
        cirurgias,
        retiradas,
      ]
    );

  const documentInsights = useMemo(
    () => !activePersonId ? [] : selectHomeDocumentAlerts(documents || [], activePersonId),
    [documents, activePersonId]
  );

  const operationalAlerts = useMemo<DashboardAlert[]>(
    () => projectHomeDashboardAlerts(healthInsights, documentInsights, {
      getLevel: mapUrgenciaToAlertLevel,
      getIcon: getAlertIcon,
      getColor: alertLevelColor,
    }),
    [healthInsights, documentInsights]
  );

  /*
   * Alertas imediatos continuam no bloco Atenção.
   *
   * Esta seleção contém somente padrões longitudinais:
   * - com destino navegável;
   * - confiança média ou alta;
   * - sem repetir estoque e renovação;
   * - limitados para não sobrecarregar a Home.
   */
  const rawLongitudinalHighlights =
    healthIntelligence.highlights;

  // V228: atualizar cards quando o usuário personaliza alertas de um SOS.
  const [medAlertRevision,setMedAlertRevision] = useState(0);
  useEffect(() => {
    const updated=()=>setMedAlertRevision(value=>value+1);
    window.addEventListener(MEDICATION_ALERT_PREF_EVENT,updated);
    return ()=>window.removeEventListener(MEDICATION_ALERT_PREF_EVENT,updated);
  },[]);
  const medicationCareOpportunities =
    useMemo(
      () =>
        buildMedicationCareOpportunities({
          medicamentos:
            medicamentosAtivos,

          tratamentos,

          renovacoes,

          retiradas,

          limit:
            8,
        }),
      [
        medicamentosAtivos,
        tratamentos,
        renovacoes,
        retiradas,
        medAlertRevision,
      ]
    );

  const primaryMedicationCareOpportunity =
    medicationCareOpportunities[0] ??
    null;

  const primaryCareCommand =
    healthIntelligence.careCommand?.decision?.lane === "now" ||
    healthIntelligence.careCommand?.decision?.lane === "prepare"
      ? healthIntelligence.careCommand.decision
      : null;

  // VAULT_HOME_INTELLIGENCE_ORCHESTRATION_V96
  // Atenção é operacional; Intelligence é analítico.
  const longitudinalHighlights =
    useMemo(
      () =>
        suppressOperationalOverlap(
          rawLongitudinalHighlights,
          medicationCareOpportunities
        ),
      [
        rawLongitudinalHighlights,
        medicationCareOpportunities,
      ]
    );

  // M133: somente projeção visual; todos os insights originais permanecem na lista.
  const homeBrainGroups = useMemo(() => groupHomeBrainEvidence(longitudinalHighlights), [longitudinalHighlights]);

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
              homePendingBrief.description,

            color:
              "#FB7185",
            href: "/?open=pending-doses",
          };
        }

        // Do not let a generic Brain prescription prompt override the
        // evidence-based purchase step for the SAME medication.
        if (primaryCareCommand && !medicationCareOpportunities.some(
          item => item.medicamentoId === primaryCareCommand.medicationId &&
            item.careStage === "acquisition_needed" &&
            primaryCareCommand.href.includes("/nova-receita")
        )) {
          return {
            eyebrow: primaryCareCommand.lane === "now" ? "Ação agora" : "Próxima etapa",
            title: primaryCareCommand.title,
            description: [primaryCareCommand.reason, primaryCareCommand.supplyRoute ? `Origem: ${primaryCareCommand.supplyRoute}.` : ""].filter(Boolean).join(" "),
            color: primaryCareCommand.lane === "now" ? "#FB7185" : "#FBBF24",
            href: primaryCareCommand.href,
          };
        }

        if (
          primaryMedicationCareOpportunity &&
          primaryMedicationCareOpportunity.level !==
            "planning"
        ) {
          return {
            eyebrow:
              primaryMedicationCareOpportunity.level ===
              "urgent"
                ? "Atenção ao tratamento"
                : "Planejamento",

            title: primaryMedicationCareOpportunity.title,

            description: primaryMedicationCareOpportunity.message,


            color:
              primaryMedicationCareOpportunity.level ===
              "urgent"
                ? "#FB7185"
                : "#FBBF24",
            href: primaryMedicationCareOpportunity.actionHref,
          };
        }

        if (
          totalCompromissosHoje >
          0
        ) {
          return {
            eyebrow:
              retiradasAtrasadas.length > 0 ? "Pendências da agenda" : "Agenda de hoje",

            title:
              totalCompromissosHoje ===
              1
                ? "Você tem um compromisso"
                : `Você tem ${totalCompromissosHoje} compromissos`,

            description:
              retiradasAtrasadas.length > 0
                ? `${retiradasAtrasadas.length} retirada(s) vencida(s) continuam aberta(s) até você concluir, reagendar ou encerrar.`
                : "Sua agenda de saúde está organizada logo abaixo.",

            color:
              "#38BDF8",
            href: "/hoje",
          };
        }

        if (
          operationalAlerts.length >
          0
        ) {
          return {
            eyebrow:
              "Registros disponíveis",

            title:
              "Rotina em dia",

            description:
              `${operationalAlerts.length} lembrete${
                operationalAlerts.length ===
                1
                  ? ""
                  : "s"
              } para planejar com calma.`,

            color:
              "#34D399",
            href: "/hoje",
          };
        }

        return {
          eyebrow:
            "Registros disponíveis",

          title:
            "Nenhuma pendência identificada",

          description:
            "Nenhuma pendência foi identificada nos registros disponíveis. Isso não confirma ausência de necessidade ou sofrimento.",

          color:
            "#34D399",
          href: "/hoje",
        };
      },
      [
        dosesPendentesAtrasadas.length,
        homePendingBrief.description,
        primaryCareCommand,
        primaryMedicationCareOpportunity,
        medicationCareOpportunities,
        retiradasAtrasadas.length,
        totalCompromissosHoje,
        operationalAlerts.length,
      ]
    );

  // M130: a decisão principal não volta como um segundo cartão com o mesmo
  // destino. A autoridade e a fila continuam intactas; muda apenas a projeção
  // compacta da Home.
  const unifiedAlerts = useMemo(
    () => operationalAlerts.filter(alert => safeReturnTarget(alert.href, "") !== safeReturnTarget(resumoContextual.href, "")),
    [operationalAlerts, resumoContextual.href]
  );
  const quantityFollowUpInsight = healthIntelligence.insights.find(item => item.id.startsWith("quantidade-confirmada-")) ?? null;
  const quantityAlreadyInBrain = Boolean(quantityFollowUpInsight && longitudinalHighlights.some(item =>
    item.id === quantityFollowUpInsight.id ||
    (item.entidadeTipo === "medicamento" && Boolean(item.entidadeId) && item.entidadeId === quantityFollowUpInsight.entidadeId &&
      /quantidade confirmada fora do padrão/i.test(item.titulo) &&
      /quantidade confirmada fora do padrão/i.test(quantityFollowUpInsight.titulo))
  ));

  // ==========================================================
  // FINANCEIRO
  // ==========================================================

  const metricasFinanceiras = useMemo(
    () => buildHomeFinancialSummary(renovacoes),
    [renovacoes]
  );
  // MODAL DE DOSES
  // ==========================================================

  const [
    modalPendenciasAberto,
    setModalPendenciasAberto,
  ] =
    useState(false);

  // P7: abertura explícita após biometria, sem confirmar tomada automaticamente.
  useEffect(() => {
    const open = () => setModalPendenciasAberto(true);
    window.addEventListener("vault:open-pending-doses", open);
    const url = new URL(window.location.href);
    if (url.searchParams.get("open") === "pending-doses") {
      open();
      url.searchParams.delete("open");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
    return () => window.removeEventListener("vault:open-pending-doses", open);
  }, []);

  const [mostrarTodasRetiradas, setMostrarTodasRetiradas] = useState(false);
  const [mostrarTodosCompromissos, setMostrarTodosCompromissos] = useState(false);

  const [
    mostrarTodosAlertas,
    setMostrarTodosAlertas,
  ] =
    useState(false);

  const [
    insightExplicado,
    setInsightExplicado,
  ] =
    useState<
      HealthInsight | null
    >(null);

  const [
    mostrarFontesInteligencia,
    setMostrarFontesInteligencia,
  ] =
    useState(false);

  const [
    processandoDoseId,
    setProcessandoDoseId,
  ] =
    useState<
      string | null
    >(
      null
    );
  const doseResolutionLockRef = useRef(false);

  const handleResolveDosePendente =
    async (
      dose:
        PendingDose,
      resolution:
        PendingDoseResolution
    ) => {
      const processingKey =
        [
          dose.data,
          dose.medicamentoId,
          dose.horario,
        ].join(
          ":"
        );

      if (doseResolutionLockRef.current) {
        return;
      }

      doseResolutionLockRef.current = true;
      setProcessandoDoseId(
        processingKey
      );

      try {
        const isToday =
          dose.data ===
          hoje;

        const isYesterday = dose.data === ontem;
        const marcarEm = isToday ? marcarDoseHojeEm : isYesterday ? marcarDoseOntemEm :
          (medicamentoId: string, horario: string, tomadoEm: string, quantidade?: number, requireRegisteredStock = false) => {
            if (!activePersonId) throw new Error("Pessoa ativa não identificada.");
            return doseLogsRepository.setStatus({ personId: activePersonId, medicamentoId,
              data: dose.data, horario, status: "taken", tomadoEm, quantidade, requireRegisteredStock,
              onlyIfPending: true, adjustStock: false });
          };
        const ignorar = isToday ? ignorarDoseHoje : isYesterday ? ignorarDoseOntem :
          (medicamentoId: string, horario: string, quantidade?: number, motivo?: string, _semEstoque?: boolean) => {
            if (!activePersonId) throw new Error("Pessoa ativa não identificada.");
            return doseLogsRepository.setStatus({ personId: activePersonId, medicamentoId,
              data: dose.data, horario, status: "ignored", quantidade, motivo,
              onlyIfPending: true, adjustStock: false });
          };

        switch (
          resolution.kind
        ) {
          case "scheduled": {
            await marcarEm(
              dose.medicamentoId,
              dose.horario,
              buildLocalDateTimeIso(
                dose.data,
                dose.horario
              ), undefined, resolution.requireRegisteredStock
            );

            break;
          }

          case "now": {
            await marcarEm(
              dose.medicamentoId,
              dose.horario,
              new Date()
                .toISOString(), undefined, resolution.requireRegisteredStock
            );

            break;
          }

          case "custom": {
            await marcarEm(
              dose.medicamentoId,
              dose.horario,
              parseLocalDateTimeInput(
                resolution.takenAtLocal
              ), undefined, resolution.requireRegisteredStock
            );

            break;
          }

          case "ignored": {
            await ignorar(
              dose.medicamentoId,
              dose.horario, undefined, resolution.motivo, true
            );

            break;
          }
        }

        trigger(
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "[Home] Erro ao resolver dose pendente:",
          error
        );

        trigger(
          "error"
        );
        throw error;
      } finally {
        doseResolutionLockRef.current = false;
        setProcessandoDoseId(
          null
        );
      }
    };

  // ==========================================================
  // AÇÕES
  // ==========================================================

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

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/85 px-5 pb-3 pt-3 backdrop-blur-xl">
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
            className="mx-auto flex max-w-3xl items-center justify-between gap-2"
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
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-ice/80">
                  Vault Saúde
                </p>

                <h1 className="mt-0.5 truncate font-display text-lg font-semibold tracking-tight text-ink-primary">
                  Olá,{" "}
                  {
                    displayName.split(
                      " "
                    )[0]
                  }
                </h1>
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-1.5">
              <HomeSectionNav
                hasAttention={unifiedAlerts.length > 0}
                hasBrain={longitudinalHighlights.length > 0 || (!brainV5Pulse.isLoading && (brainV5Pulse.counters.active > 0 || brainV5Pulse.counters.new > 0))}
              />
              <VaultBrainCommand data={{
                userId: user?.id,
                personId: activePersonId,
                medications: medicamentos,
                documents,
                treatments: tratamentos,
                appointments: consultas,
                exams: exames,
                 renewals: renovacoes,
                 withdrawals: retiradas,
                 surgeries: cirurgias,
                 doctors: medicos,
                 pharmacies: farmacias,
                 hospitals: hospitais,
                 careLocations: locais,
                 supplyProcesses: supplyOverview?.data?.processos ?? [],
               }} />
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.push("/hoje");
              }}
              aria-label={`Abrir Hoje. Horário atual: ${horaAtual}`}
              className="hidden min-h-11 shrink-0 items-center gap-2 rounded-full border border-surface-border/50 bg-surface px-3 py-2 min-[420px]:flex text-[10px] font-semibold text-ink-muted shadow-sm transition-all active:scale-95"
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
            </div>
          </motion.div>
        </header>

        <section className="mx-auto max-w-3xl space-y-5 px-4 pt-4 sm:px-5">

          <VaultUpdateHomePromptM117 />
          <HomeEssentialToggleM118 />
          <p className="px-1 text-[10px] leading-snug text-ink-muted" role="note"><span className="sr-only">Home: prioridades e decisões · Hoje: horários e registros · Brain: explicações e evidências. </span>Prioridades de hoje · acessos principais · demais indicadores sob demanda.</p>

          {/* ===================================================
              HOJE
          =================================================== */}

          <motion.section
            id="home-agora"
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
            className="relative overflow-hidden rounded-[22px] border border-surface-border bg-gradient-to-br from-surface-raised/50 via-surface to-surface shadow-sm"
          >
            {/* P14 R3: hero puramente visual isolado; contadores continuam na Home. */}
            <HomeDailyHero eyebrow={resumoContextual.eyebrow} title={resumoContextual.title}
              description={resumoContextual.description} color={resumoContextual.color}
              completed={dosesTomadasDaRotinaHoje} scheduled={totalDosesPlanejadasHoje}
              progress={progressoDosesHoje}
              ctaLabel={resumoContextual.href === "/?open=pending-doses" ? "Revisar doses" : resumoContextual.href === "/hoje" ? "Abrir rotina" : "Conferir próximo passo"}
              onOpen={() => {
                trigger("vibrate");
                if (resumoContextual.href === "/?open=pending-doses") setModalPendenciasAberto(true);
                else router.push(safeReturnTarget(resumoContextual.href, "/hoje"));
              }} />
            {/* M136: métricas redundantes permanecem acessíveis, sem tomar a primeira dobra. */}
            <details className="group mx-3 mb-1 overflow-hidden rounded-xl border border-surface-border/40 bg-surface/25">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
                <span className="flex items-center gap-2"><CalendarDays size={14} aria-hidden="true"/> Indicadores da rotina</span>
                <span className="text-[10px] font-normal text-ink-muted">Expandir detalhes <ChevronRight size={14} className="inline-block transition-transform group-open:rotate-90"/></span>
              </summary>
            <HomeQuickMetrics
              appointments={totalCompromissosHoje}
              className="min-[380px]:grid-cols-4 min-w-0"
              pendingDoses={dosesPendentesAtrasadas.length}
              medications={medicamentosAtivos.length}
              completedDoses={dosesTomadasDaRotinaHoje}
              extrasTaken={Math.max(0, dosesTomadasHoje - dosesTomadasDaRotinaHoje)}
              onNavigate={(href) => { trigger("vibrate"); router.push(href); }}
              onOpenPending={() => { trigger("vibrate"); setModalPendenciasAberto(true); }}
            />
            </details>
            <HomeAgendaBreakdown consultations={consultasHoje.length} exams={examesHoje.length}
              surgeries={cirurgiasHoje.length} withdrawals={retiradasHoje.length}
              overdueWithdrawals={retiradasAtrasadas.length}
              onNavigate={(href) => { trigger("vibrate"); router.push(href); }}
              onOpenAgenda={() => { trigger("vibrate"); const target = document.getElementById("home-compromissos"); if (target) target.scrollIntoView({behavior: "smooth", block: "start"}); else router.push("/hoje"); }} />
          </motion.section>

          {/* M145: Compromissos reais primeiro; análises e cards de evidência vêm depois. */}
          {/* ===================================================
              COMPROMISSOS DE HOJE
          =================================================== */}

          {totalCompromissosHoje >
            0 && (
            <motion.section
              id="home-compromissos"
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
                      {retiradasAtrasadas.length > 0 ? "Pendentes e próximos" : "Próximos de hoje"}
                    </h2>
                  </div>

                  <p className="mt-0.5 text-xs text-ink-muted">
                    {retiradasAtrasadas.length > 0
                      ? "Compromissos abertos não somem na virada do dia"
                      : "Sua agenda de saúde do dia"}
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
                {(mostrarTodosCompromissos ? consultasHoje : consultasHoje.slice(0, 3)).map(
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
                          withReturnTarget(`/saude/consultas/detalhes?id=${consulta.id}`, "/")
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

                        <p className="truncate text-xs text-ink-muted">
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

                {(mostrarTodosCompromissos ? cirurgiasHoje : cirurgiasHoje.slice(0, Math.max(0, 3 - consultasHoje.length))).map(
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
                          withReturnTarget(`/saude/cirurgias/detalhes?id=${cirurgia.id}`, "/")
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

                        <p className="text-xs text-ink-muted">
                          Procedimento agendado
                        </p>
                      </div>

                      <span className="shrink-0 font-mono text-[11px] font-semibold text-coral">
                        Hoje
                      </span>
                    </button>
                  )
                )}

                {(mostrarTodosCompromissos ? examesHoje : examesHoje.slice(0, Math.max(0, 3 - consultasHoje.length - cirurgiasHoje.length))).map(
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
                          withReturnTarget(`/saude/exames/detalhes?id=${exame.id}`, "/")
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

                        <p className="text-xs text-ink-muted">
                          Exame programado para hoje
                        </p>
                      </div>

                      <span className="shrink-0 font-mono text-[11px] font-semibold text-coral">
                        Hoje
                      </span>
                    </button>
                  )
                )}

                {consultasHoje.length + cirurgiasHoje.length + examesHoje.length > 3 && (
                  <button type="button" aria-expanded={mostrarTodosCompromissos} onClick={() => setMostrarTodosCompromissos(value => !value)} className="min-h-11 w-full rounded-xl border border-surface-border/60 bg-surface-raised/40 px-3 text-xs font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
                    {mostrarTodosCompromissos ? "Recolher compromissos" : `Ver mais ${consultasHoje.length + cirurgiasHoje.length + examesHoje.length - 3} compromisso(s)`}
                  </button>
                )}

                {(mostrarTodasRetiradas ? retiradasHoje : retiradasHoje.slice(0, 3)).map(
                  (
                    retirada
                  ) => (
                    <button
                      type="button"
                      key={
                        retirada.id
                      }
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          withReturnTarget(`/saude/retiradas/detalhes?id=${retirada.id}`, "/")
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-[20px] border border-ice/25 bg-ice/[0.04] p-3.5 text-left shadow-sm transition-all active:scale-[0.985]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                        <MedicationFormatIcon formato={medicamentosById.get(retirada.medicamento_id)?.formato} cores={medicamentosById.get(retirada.medicamento_id)?.cores} size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-primary">
                          {retirada.medicamento_nome ||
                            "Retirada de medicamento"}
                        </p>

                        <p className="truncate text-xs text-ink-muted">
                          {isOverdueWithdrawal(retirada, hoje)
                            ? `Pendente há ${withdrawalDaysOverdue(retirada.data, hoje)} ${withdrawalDaysOverdue(retirada.data, hoje) === 1 ? "dia" : "dias"} · revise ou reagende`
                            : retirada.tipo === "sus"
                              ? "Retirada programada no SUS"
                              : "Retirada programada"}
                        </p>
                        <WithdrawalPreparationView withdrawalId={retirada.id!} compact overview={supplyOverview} sourceNotesById={sourceNotesById}/>
                      </div>

                      <span className="shrink-0 font-mono text-[11px] font-semibold text-ice">
                        {isOverdueWithdrawal(retirada, hoje)
                          ? "Atrasada"
                          : retirada.horario || "Hoje"}
                      </span>
                    </button>
                  )
                )}

                {retiradasHoje.length > 3 && <button type="button" aria-expanded={mostrarTodasRetiradas} onClick={() => setMostrarTodasRetiradas(value => !value)} className="min-h-11 w-full rounded-xl border border-surface-border/60 bg-surface-raised/40 px-3 text-xs font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">{mostrarTodasRetiradas ? "Recolher retiradas" : `Ver mais ${retiradasHoje.length - 3} retirada(s)`}</button>}
              </div>
            </motion.section>
          )}

          {/* M136: destino clínico mais frequente agora fica na primeira dobra. */}
          <HomeCommandCenter gastoMes={metricasFinanceiras.gastoMesAtual}
            diferencaMes={metricasFinanceiras.diff}
            totalRede={medicos.length + farmacias.length + hospitais.length + locais.length} mode="primary" />
          {/* ===================================================
              ATENÇÃO
          =================================================== */}

          {unifiedAlerts.length >
            0 && (
            <motion.section
              id="home-atencao"
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
              className="vault-deferred space-y-3"
            >
              {/* P15 R8: renderização read-only; a autoridade e a ordem vêm de unifiedAlerts. */}
              <HomeAttentionRail alerts={unifiedAlerts} description="O que merece prioridade agora" expanded={mostrarTodosAlertas}
                onToggle={() => { trigger("vibrate"); setMostrarTodosAlertas(previous => !previous); }}
                renderAlert={alert => <AlertRow alert={alert} />} />
            </motion.section>
          )}

          {/* M93: o mesmo insight de quantidade realmente confirmada, com consulta da pessoa ativa.
              Não gera nova interpretação nem substitui alertas de segurança. */}
          {!quantityAlreadyInBrain&&<HomeDoseQuantityFollowUp
            insight={quantityFollowUpInsight}
            feedback={healthIntelligence.experienceFeedback.find(item => item.insightId === quantityFollowUpInsight?.id)}
            nextConsultationDate={consultas.filter(item => item.status === "agendada" && item.data && item.data >= hoje).map(item => item.data!).sort()[0] ?? null}
            onMarkChecked={async insight => { await healthIntelligence.sendExperienceFeedback(insight, "already_knew"); }}
            onNavigate={href => { trigger("vibrate"); router.push(href); }}
          />}

          {/* VAULT_BRAIN_V5_4_R2_HOME_INTELLIGENCE_RAIL */}
                    {/* ===================================================
              INTELIGÊNCIA DE SAÚDE — PULSO + RAIL PRIORIZADO
          =================================================== */}

          {(longitudinalHighlights.length > 0 ||
            (!brainV5Pulse.isLoading &&
              (brainV5Pulse.counters.active > 0 || brainV5Pulse.counters.new > 0))) && (
            <motion.section
              id="home-brain"
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
              className="vault-deferred space-y-3"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity
                      size={15}
                      className="text-violet-400"
                    />

                    <button type="button" onClick={() => router.push("/inteligencia/alertas")} className="flex items-center gap-1.5 text-left active:scale-[0.98]" aria-label="Abrir Central de Inteligência">
                      <h2 className="font-display text-base font-semibold tracking-tight text-ink-primary">VAULT Brain</h2>
                      <ChevronRight size={13} className="text-violet-300" />
                    </button>
                  </div>

                  <p className="mt-0.5 text-xs text-ink-muted">
                    {healthIntelligence.maturity.totalRecords} registros analisados
                    {brainV5Pulse.journeys.some(item => item.requires_attention) ? ` · ${brainV5Pulse.journeys.filter(item => item.requires_attention).length} decisões em atenção` : brainV5Pulse.brief.total > 0 ? ` · ${brainV5Pulse.brief.total} decisões acompanhadas` : ""}
                    {brainV5Pulse.counters.new > 0 ? ` · ${brainV5Pulse.counters.new} novo${brainV5Pulse.counters.new === 1 ? "" : "s"}` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    setInsightExplicado(
                      null
                    );

                    setMostrarFontesInteligencia(
                      true
                    );
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 font-mono text-[9px] font-semibold text-violet-300 transition-all active:scale-95"
                  aria-label="Ver cobertura e fontes usadas pela inteligência do Vault"
                >
                  <Info
                    size={11}
                  />

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

                  {" cobertura"}
                </button>
              </div>

              {/* VAULT_V321_HOME_EVIDENCE: urgent evidence defaults open; routine analysis stays optional. */}
              {/* M10_HOME_FOCUS: Brain abre em prioridade se não houver trilho operacional; não duplica a atenção. */}
              {longitudinalHighlights.length > 0 && (
                <ClinicalDisclosure
                  key={longitudinalHighlights.some(item => item.gravidadeSeguranca === "critica" || item.gravidadeSeguranca === "importante" || item.gravidadeSeguranca === "atencao") ? "priority" : "routine"}
                  id="home-health-evidence"
                  title="Ver observações do Brain"
                  description={`${homeBrainGroups.length} grupo${homeBrainGroups.length === 1 ? "" : "s"} · ${longitudinalHighlights.length} análise${longitudinalHighlights.length === 1 ? "" : "s"}`}
                  icon={<Activity size={18}/>}
                  defaultOpen={false}
                >
              {() => <>
              <div className="grid grid-cols-1 gap-2 min-[620px]:grid-cols-2" aria-label="Sinais do Brain organizados por prioridade">
                {longitudinalHighlights.map(
                  (
                    insight
                  ) => {
                    const group = homeBrainGroups.find(candidate => candidate.insights[0]?.id === insight.id);
                    // Só o primeiro insight do grupo monta o cartão; os demais ficam acessíveis dentro dele.
                    if (!group) return null;
                    if (group.insights.length > 1) return (
                      <HomeBrainEvidenceGroup key={group.key} insights={group.insights}
                        onOpen={selected => {
                          trigger("vibrate");
                          setMostrarFontesInteligencia(false);
                          setInsightExplicado(selected);
                        }}/>
                    );
                    return (
                    <button
                      key={
                        insight.id
                      }
                      type="button"
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        setMostrarFontesInteligencia(
                          false
                        );

                        setInsightExplicado(
                          insight
                        );
                      }}
                      className={`flex min-w-0 items-start gap-2.5 rounded-[16px] border p-3 text-left transition-colors active:bg-surface-raised ${insight.gravidadeSeguranca === "critica" ? "border-red-400/35 bg-red-400/[0.07]" : insight.gravidadeSeguranca === "importante" ? "border-coral/30 bg-coral/[0.06]" : insight.gravidadeSeguranca === "atencao" ? "border-amber-400/25 bg-amber-400/[0.05]" : "border-violet-400/20 bg-violet-400/[0.04]"}`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${insight.gravidadeSeguranca === "critica" ? "bg-red-400/10 text-red-300" : insight.gravidadeSeguranca === "importante" ? "bg-coral/10 text-coral" : insight.gravidadeSeguranca === "atencao" ? "bg-amber-400/10 text-amber-300" : "bg-violet-400/10 text-violet-300"}`}>
                        {(insight.gravidadeSeguranca === "critica" || insight.gravidadeSeguranca === "importante") ? <AlertCircle size={17}/> : <Activity
                          size={17}
                        />}
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
                          {insight.gravidadeSeguranca && <span className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] uppercase ${insight.gravidadeSeguranca === "critica" ? "bg-red-400/10 text-red-300" : insight.gravidadeSeguranca === "importante" ? "bg-coral/10 text-coral" : insight.gravidadeSeguranca === "atencao" ? "bg-amber-400/10 text-amber-300" : "bg-cyan-400/10 text-cyan-300"}`}>{insight.gravidadeSeguranca}</span>}
                        </div>

                        <p className="mt-1 line-clamp-1 text-xs font-bold text-ink-primary">
                          {
                            insight.titulo
                          }
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">
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
                    );
                  }
                )}
              </div>

              {longitudinalHighlights.length > 1 && (
                <div className="flex items-center justify-between px-1"><span className="text-xs text-ink-muted">Todas as observações continuam acessíveis por sinal</span><span className="font-mono text-[9px] text-violet-300/80">{longitudinalHighlights.length} insights</span></div>
              )}

              </>}

                </ClinicalDisclosure>
              )}

              {longitudinalHighlights.length === 0 && brainV5Pulse.top && (
                <button type="button" onClick={() => router.push(`/inteligencia/alertas?insight=${encodeURIComponent(brainV5Pulse.top!.insight_id)}`)} className="flex w-full items-center gap-3 rounded-[20px] border border-violet-400/20 bg-violet-400/[0.04] p-3.5 text-left active:scale-[0.985]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300"><Activity size={16}/></div>
                  <div className="min-w-0 flex-1"><p className="line-clamp-1 text-xs font-bold text-ink-primary">{brainV5Pulse.top.snapshot.titulo}</p><p className="mt-1 line-clamp-1 text-xs text-ink-muted">{brainV5Pulse.brief.headline} · {brainV5PriorityReason(brainV5Pulse.top)}</p></div>
                  <ChevronRight size={14} className="shrink-0 text-violet-300"/>
                </button>
              )}

            </motion.section>
          )}

          {primaryMedicationCareOpportunity && (
            <motion.section
              initial={{
                opacity:
                  0,
                y:
                  10,
              }}
              animate={{
                opacity:
                  1,
                y:
                  0,
              }}
              transition={{
                duration:
                  0.24,
                delay:
                  0.08,
              }}
              className="vault-deferred"
            >
              <div
                className={`rounded-[20px] border p-3 shadow-sm ${
                  primaryMedicationCareOpportunity.level ===
                  "urgent"
                    ? "border-coral/30 bg-gradient-to-br from-coral/10 via-surface to-surface"
                    : primaryMedicationCareOpportunity.level ===
                        "attention"
                      ? "border-amber-400/25 bg-gradient-to-br from-amber-400/8 via-surface to-surface"
                      : "border-ice/20 bg-gradient-to-br from-ice/8 via-surface to-surface"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      primaryMedicationCareOpportunity.level ===
                      "urgent"
                        ? "bg-coral/15 text-coral"
                        : primaryMedicationCareOpportunity.level ===
                            "attention"
                          ? "bg-amber-400/10 text-amber-400"
                          : "bg-ice/10 text-ice"
                    }`}
                  >
                    <MedicationFormatIcon
                      formato={primaryMedicationCareOpportunity.formato}
                      cores={primaryMedicationCareOpportunity.cores}
                      size={23}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-mono text-[8px] font-bold uppercase tracking-[0.18em] ${
                        primaryMedicationCareOpportunity.level ===
                        "urgent"
                          ? "text-coral"
                          : primaryMedicationCareOpportunity.level ===
                              "attention"
                            ? "text-amber-400"
                            : "text-ice"
                      }`}
                    >
                      Continuidade do tratamento
                    </p>

                    <h2 className="mt-1 text-sm font-bold text-ink-primary">
                      {
                        primaryMedicationCareOpportunity.title
                      }
                    </h2>

                    <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                      {
                        primaryMedicationCareOpportunity.message
                      }
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-surface-border/70 bg-surface-raised px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                        {primaryMedicationCareOpportunity.careStageLabel}
                      </span>
                      {primaryMedicationCareOpportunity.plannedAcquisitionCount ? (
                        <span className="rounded-full border border-violet-400/20 bg-violet-400/8 px-2 py-1 font-mono text-[8px] text-violet-300">
                          Futuro · não altera estoque
                        </span>
                      ) : null}
                    </div>

                    {primaryMedicationCareOpportunity.latestRenewalDate && (
                      <p className="mt-2 font-mono text-xs text-ink-faint">
                        {primaryMedicationCareOpportunity.latestRenewalKind === "receita"
                          ? "Última receita registrada: "
                          : "Última aquisição registrada: "}
                        {formatVaultClinicalDateBR(primaryMedicationCareOpportunity.latestRenewalDate)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      trigger("vibrate");

                      router.push(
                        primaryMedicationCareOpportunity.actionHref
                      );
                    }}
                    className={`rounded-xl px-3 py-2.5 text-[10px] font-bold transition-all active:scale-[0.98] ${
                      primaryMedicationCareOpportunity.level ===
                      "urgent"
                        ? "bg-coral text-white"
                        : "bg-ice text-void"
                    }`}
                  >
                    {primaryMedicationCareOpportunity.actionLabel}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      trigger("vibrate");

                      router.push(
                        primaryMedicationCareOpportunity.medicationHref
                      );
                    }}
                    className="rounded-xl border border-surface-border bg-surface-raised px-3 py-2.5 text-[10px] font-semibold text-ink-primary transition-all active:scale-[0.98]"
                  >
                    Ver medicamento
                  </button>
                </div>

                {primaryMedicationCareOpportunity.treatmentHref && (
                  <button
                    type="button"
                    onClick={() => {
                      trigger("vibrate");

                      router.push(
                        primaryMedicationCareOpportunity.treatmentHref!
                      );
                    }}
                    className="mt-2 flex w-full items-center justify-between rounded-xl border border-surface-border/70 bg-surface-raised/70 px-3 py-2.5 text-left transition-all active:scale-[0.98]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-primary">
                        Ver tratamento vinculado
                      </p>

                      <p className="truncate text-xs text-ink-muted">
                        {
                          primaryMedicationCareOpportunity.treatmentName
                        }
                      </p>
                    </div>

                    <ChevronRight
                      size={14}
                      className="shrink-0 text-ink-faint"
                    />
                  </button>
                )}


                <p className="mt-3 text-center text-xs leading-relaxed text-ink-faint">
                  O Vault cruza seus próprios registros de estoque, renovação e tratamento. Isso não substitui orientação profissional.
                </p>
              </div>
              {medicationCareOpportunities.length > 1 ? (
                <div className="mt-2">
                  <div id="home-continuity-other">
                    <MedicationCareOpportunityQueue
                      items={medicationCareOpportunities.slice(1)}
                      onNavigate={(href)=>{trigger("vibrate");router.push(href);}}
                    />
                  </div>
                </div>
              ) : null}
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
            className="vault-deferred-lg space-y-3"
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

                <p className="mt-0.5 text-xs text-ink-muted">
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

                    <p className="text-xs text-ink-muted">
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
                            withReturnTarget(`/saude/tratamentos/detalhes?id=${tratamento.id}`, "/")
                          );
                        }}
                        className="flex min-h-[70px] w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-[20px] border bg-surface px-3 py-2.5 text-left shadow-sm transition-colors active:scale-[0.985] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
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

                            <p className="truncate text-xs text-ink-muted">
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

          <div id="home-organizacao" className="scroll-mt-24">
            <HomeCommandCenter
              gastoMes={metricasFinanceiras.gastoMesAtual}
              diferencaMes={metricasFinanceiras.diff}
              totalRede={medicos.length + farmacias.length + hospitais.length + locais.length}
              mode="secondary"
            />
          </div>



        </section>

        {/* =====================================================
            EXPLICABILIDADE DA INTELIGÊNCIA
        ===================================================== */}

        <HealthInsightExplanationSheet
          isOpen={
            Boolean(
              insightExplicado
            ) ||
            mostrarFontesInteligencia
          }
          mode={
            mostrarFontesInteligencia
              ? "sources"
              : "insight"
          }
          insight={
            insightExplicado
          }
          sources={
            healthIntelligence
              .maturity
              .sources
          }
          onClose={() => {
            setInsightExplicado(
              null
            );

            setMostrarFontesInteligencia(
              false
            );
          }}
          onNavigate={(
            href
          ) => {
            setInsightExplicado(
              null
            );

            setMostrarFontesInteligencia(
              false
            );

            router.push(
              href
            );
          }}
        />

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
          onResolveDose={
            handleResolveDosePendente
          }
          isProcessingDose={
            processandoDoseId
          }
          onExpand={() => {
            setModalPendenciasAberto(
              false
            );

            // P8: a expansão abre a área de doses, não o topo genérico do Hoje.
            router.push(
              "/hoje?focus=doses"
            );
          }}
        />
      </main>
    </PageTransition>
  );
}
