// app/hoje/page.tsx
"use client";
import DormantHojePage from "@/components/hoje/DormantHojePage";
import {useMacro02ModeR5} from "@/hooks/useMacro02ModeR5";
import {Macro02AuthorityHoldR5} from "@/components/saude/Macro02AuthorityHoldR5";
import { describeTodayDate } from "@/lib/today/timeline-date-presentation";
import { projectRemindersForDay } from "@/lib/today/reminder-day-projection";
import { TodayRoutinePulse } from "@/components/hoje/TodayRoutinePulse";
import { formatPtBrQuantity } from "@/lib/ui/quantity-ptbr";
import { medicationsForOwner } from "@/lib/health-intelligence/medication-owner-scope";
import { TodayTimelineGuide } from "@/components/hoje/TodayTimelineGuide";
import { TodayRemindersPanel } from "@/components/hoje/TodayRemindersPanel";
import { TodayAgendaOverview } from "@/components/hoje/TodayAgendaOverview";
import { buildTodayAgendaOverview } from "@/lib/today/agenda-overview";
import { countHiddenTodayResolved } from "@/lib/today/timeline-visibility-metrics";
import { todayTimelineGroupContext } from "@/lib/today/timeline-group-context";
import { todayTimelineGroupPresentation } from "@/components/hoje/TodayTimelineGroupPresentation";
import { getDiasRestantesEstilo } from "@/lib/today/withdrawal-urgency-presentation";
import { TodayDateNavigation } from "@/components/hoje/TodayDateNavigation";
import { TodayJourneyRailP5 } from "@/components/hoje/TodayJourneyRailP5";
import { TodayBatchAction } from "@/components/hoje/TodayBatchAction";
import { DosePremiumCenter } from "@/components/hoje/DosePremiumCenter";
import { DoseHistoricalUnitField, unitDraftSnapshot, type UnitDraft } from "@/components/hoje/DoseHistoricalUnitField";
import { readDoseUnit, describeHistoricalDose } from "@/lib/dose-premium/historical-unit";
import { civilDoseInstant } from "@/lib/dose-premium/review-intent";
import { doseLogsRepository } from "@/lib/repositories/doseLogs";
import type { DoseSnapshot } from "@/lib/dose-premium/compatibility";
import type { Medicamento } from "@/lib/types";
import { captureHomeDoseReview, prepareHomeDoseConfirmation, assertHomeReviewScope, type HomeDoseReview } from "@/lib/dose-premium/home-review";
import { observedStockContext, observedStockConversion } from "@/lib/dose-premium/stock-context";
import { comparableDebit } from "@/lib/dose-premium/stock-evidence";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { adaptTodayDoseCenter } from "@/lib/dose-premium/today-adapter";
import { defaultCenterSelection, restoreCenterSelection, projectDoseHistory, type DoseCenterSelection, type CenterRow } from "@/lib/dose-premium/center-view";
import { classifyPlannedDose } from "@/lib/dose-plan-authority";
import { summarizeRecordedDoseTiming, summarizeRecordedStockCoverage } from "@/lib/health-intelligence/dose-routine-insights";
import { buildDoseSlotIndex, resolveDoseSlot } from "@/lib/dose-slot-authority";
import { TodayUnscheduledRoutine } from "@/components/hoje/TodayUnscheduledRoutine";
import { TreatmentContinuityA4 } from "@/components/saude/TreatmentContinuityA4";
import { VaccinationAccessA8 } from "@/components/saude/VaccinationAccessA8";
import { A10ContextLink } from "@/components/saude/A10ContextLink";
import { A9ReadOnlySummary360 } from "@/components/saude/A9ReadOnlySummary360";
import { RehabM5AgendaStrip } from "@/components/saude/RehabM5AgendaStrip";
import { HospitalizationA5AgendaStrip } from "@/components/saude/HospitalizationA5AgendaStrip";
import { HealthDateTimePicker } from "@/components/saude/HealthDateTimePicker";
import { HealthTimePicker } from "@/components/saude/HealthTimePicker";
import { DoseScheduleGroups } from "@/components/saude/DoseScheduleGroups";
import { DoseMonthOverview } from "@/components/saude/DoseMonthOverview";
import { eligibleGroupDoseKeys } from "@/lib/dose-schedule-groups";
import { WithdrawalPreparationView } from "@/components/saude/WithdrawalPreparationSummary";
import { useSupplyOverview } from "@/hooks/useSupplyOverview";

import { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { withReturnTarget } from "@/lib/navigation/return-context";
import {
  buildTodayContextUrlM120,
  consumeTodayActionM120,
  todayOriginM120,
} from "@/lib/navigation/today-context-m120";
import { TodayNavigationContextM120 } from "@/components/hoje/TodayNavigationContextM120";
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
  Bell,
  SmilePlus,
} from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicationRegulatoryProfiles } from "@/hooks/useMedicationRegulatoryProfiles";
import { getMedicationRegulatorySurface } from "@/lib/medication-regulatory-visual";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import {VitalContextCard} from "@/components/vital/VitalContextCard";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { addDaysToLocalDate, getLocalTodayISO, formatLocalDateISO } from "@/lib/health-utils";
import {
  isReceitaVencidaSegura,
  analisarRotinaDiaria,
} from "@/lib/health-insights";
import { useToast } from "@/components/ToastProvider";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useAuth } from "@/hooks/useAuth";
import { useRetiradas } from "@/hooks/useRetiradas";
import { readNativeDoseReview, discardNativeDoseReview, findNativeReviewItem } from "@/lib/dose-premium/native-review";
import { LazyQuickDoseModal as QuickDoseModal } from "@/components/saude/LazyQuickDoseModal";
import { CareFlowSummaryM2 } from "@/components/saude/CareFlowSummaryM2";
import { ExamAgendaM2 } from "@/components/saude/ExamAgendaM2";
import { useHealthReminders } from "@/hooks/useHealthReminders";
import { reminderRunsOnWeekday } from "@/lib/health-reminders/domain";
import { VersiculoDia } from "@/components/VersiculoDia";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";
import { hasKnownEmptyMedicationStock } from "@/lib/medication-availability";
import {
  isOpenWithdrawal,
  isOverdueWithdrawal,
  withdrawalDaysOverdue,
  withdrawalsForAgendaDate,
} from "@/lib/withdrawal-agenda";
import {
  decideMedicationCarePath,
  plannedPrescriptionAgendaState,
} from "@/lib/health-intelligence/medication-care-decision";
import { useBrainV5Pulse } from "@/hooks/useBrainV5Pulse";
import { useSharedHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { TodayActionCenter } from "@/components/hoje/TodayActionCenter";
import { TodayFilterPanel } from "@/components/hoje/TodayFilterPanel";
import { ClinicalDisclosure } from "@/components/saude/ClinicalDisclosure";
import {
  filterTimelineItems,
  groupTimelineItems,
  isScheduledRoutineEvidence,
  summarizeTimeline,
  visibleTimelineItems,
} from "@/lib/today/timeline-summary";
import {
  buildTodayTimelineItems,
  type TodayTimelineItem as DoseItemExt,
} from "@/lib/today/build-timeline-items";
import { buildTodayAppointmentProjection } from "@/lib/today/appointment-projection";
import {
  useTodayPersistedFilters,
  type FiltroStatus,
  type FiltroPeriodo,
} from "@/hooks/useTodayPersistedFilters";
import { TodaySymptomTimelineCard } from "@/components/hoje/TodaySymptomTimelineCard";
import { TodayPrescriptionRenewalCard } from "@/components/hoje/TodayPrescriptionRenewalCard";
import { TodayAppointmentCard } from "@/components/hoje/TodayAppointmentCard";
import { isSameLocalMinute } from "@/lib/today/clock-minute";
import {
  TodayDoseTimelineCard,
  type TodayDoseTimelineCardScope,
} from "@/components/hoje/TodayDoseTimelineCard";
import { TodayDoseGroupHeading } from "@/components/hoje/TodayDoseGroupHeading";
import { todayTimelineEmptyCopy } from "@/lib/today/timeline-empty-copy";
import { describeTodayDoseStatus } from "@/components/hoje/TodayDoseStatusPresentation";
import { TodayRetroReviewPanel } from "@/components/hoje/TodayRetroReviewPanel";
import { buildTodayRetroReviewSummary } from "@/lib/today/retro-review-projection";
import { useTodayOwnerData } from "@/hooks/useTodayOwnerData";
import {
  reconcileTodayTimelineItems,
  type TodayTimelineSnapshot,
} from "@/lib/today/timeline-identity";

type FiltroCompromisso =
  | "todos"
  | "consultas"
  | "cirurgias"
  | "exames"
  | "retiradas";

// P15 R1 R2: estilos de prazo centralizados em lib/today; sem alterar lógica de retiradas.

function PremiumHojePage() {
  const supplyOverview = useSupplyOverview();
  const brainPulse = useBrainV5Pulse();
  const healthIntelligence = useSharedHealthIntelligence({
    includeAudit: false,
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusDoseQueue = searchParams.get("focus") === "doses";
  // P8: selecionar o grupo das 23:00, sem forçar confirmação de doses.
  const focusDoseTime = focusDoseQueue ? searchParams.get("time") : null;

  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const presentationNow = new Date();
  const hoje = formatLocalDateISO(presentationNow);

  const requestedDate = searchParams.get("data");

  const retroReviewMode = searchParams.get("retro") === "1";

  const retroReviewMedicationId = searchParams.get("medicamento");

  const {
    dataSelecionada,
    isHoje,
    isPassado,
    isFuturo,
    ontem,
    amanha,
    dataSelecionadaLabel,
    dataSelecionadaDescricao,
  } = describeTodayDate(hoje, requestedDate);

  // M120: restaura filtros efetivos, data e origem segura ao atravessar módulos.
  // Não transfere autoridade clínica ou ID de pessoa pela URL.
  const buildTimelineUrl = (date: string) =>
    buildTodayContextUrlM120({
      date,
      today: hoje,
      query: searchParams,
      status: filtroStatus,
      period: filtroPeriodo,
      appointment: filtroCompromisso,
      showResolved: mostrarConcluidas,
    });
  const navigateWithReturnM120 = (href: string, premiumState?: DoseCenterSelection) => {
    try {
      sessionStorage.setItem(
        "vault:today:r4-return",
        JSON.stringify({
          user: user?.id,
          person: activePersonId,
          date: dataSelecionada,
          query: buildTimelineUrl(dataSelecionada),
          y: Math.max(0, window.scrollY),
          ...(premiumState ? {premium: premiumState}: {}),
        })
      );
    } catch {
      /* privado/local, falha nao impede navegar */
    }
    router.push(withReturnTarget(href, buildTimelineUrl(dataSelecionada)));
  };
  const originM120 = todayOriginM120(searchParams);

  const navegarData = (delta: number) => {
    const destino = addDaysToLocalDate(dataSelecionada, delta);

    if (!destino) {
      return;
    }

    trigger("vibrate");

    router.replace(buildTimelineUrl(destino));
  };

  const navegarParaData = (date: string) => {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(new Date(`${date}T12:00:00`).getTime())
    )
      return;
    if (date === dataSelecionada) return;
    trigger("vibrate");
    router.replace(buildTimelineUrl(date));
  };

  const voltarParaHoje = () => {
    if (isHoje) {
      return;
    }

    trigger("vibrate");

    router.replace(buildTimelineUrl(hoje));
  };

  const { medicamentos: rawMedicamentos, medicamentosIncluindoDescontinuados: allMedications, isLoading: medicationsLoading } = useMedicamentos();

  const { retiradas } = useRetiradas();

  const { reminders: healthReminders } = useHealthReminders();

  const remindersDoDia = useMemo(
    () => projectRemindersForDay(healthReminders, dataSelecionada),
    [healthReminders, dataSelecionada]
  );
  const remindersForaDaAgenda = useMemo(
    () => remindersDoDia.filter((reminder) => !reminder.careflow_m2?.plan_id),
    [remindersDoDia]
  );

  // R9 R7: único critério de propriedade para Home e Hoje; sem nova leitura.
  const medicamentos = useMemo(
    () => medicationsForOwner(rawMedicamentos, activePersonId, user?.id),
    [rawMedicamentos, activePersonId, user?.id]
  );

  // V196: one indexed lookup shared by timeline, appointments and actions.
  // This avoids repeatedly scanning the full medication collection while rendering.
  const medicamentosById = useMemo(
    () =>
      new Map<string, any>(
        medicamentos.map((medicamento: any) => [medicamento.id, medicamento])
      ),
    [medicamentos]
  );

  const regulatoryProfiles = useMedicationRegulatoryProfiles(medicamentos);

  const {
    doseLogs,
    isLoading: doseSnapshotLoading,
  } = useDoseLogs(
    dataSelecionada,
    // M20: require an authenticated owner before exposing day dose rows.
    user?.id ?? null
  );

  // M16: owner/date reads live in one hook; the page consumes scoped results.
  const {
    tratamentos,
    renovacoes,
    medicos,
    farmacias,
    hospitais,
    consultasHoje,
    cirurgiasHoje,
    examesHoje,
    registrosHoje,
    historicoDosesCompleto,
    ready: todayOwnerReady, historyReady,
  } = useTodayOwnerData({
    userId: user?.id,
    personId: activePersonId,
    date: dataSelecionada,
  });

  const renovacoesReceitaHoje = useMemo(() => {
    if (!activePersonId) {
      return [];
    }

    const renewalsByMedication = new Map<string, typeof renovacoes>();
    for (const renewal of renovacoes) {
      const rows = renewalsByMedication.get(renewal.medicamento_id);
      if (rows) rows.push(renewal);
      else renewalsByMedication.set(renewal.medicamento_id, [renewal]);
    }

    return medicamentos.flatMap((medicamento) => {
      if (!medicamento.id) return [];
      const agenda = plannedPrescriptionAgendaState(
        medicamento.proxima_renovacao,
        dataSelecionada,
        hoje
      );
      if (!agenda.visible) return [];
      const decision = decideMedicationCarePath({
        medication: medicamento,
        renewals: renewalsByMedication.get(medicamento.id!) ?? [],
        today: getLocalTodayISO(),
        needsPrescription: true,
        needsStock: false,
      });
      if (decision.stage === "prescription_needed")
        return [
          {
            id: `renovacao-receita-${medicamento.id}-${dataSelecionada}`,

            tipo: "renovacao_receita" as const,

            medicamentoId: medicamento.id!,

            medicamentoNome: medicamento.nome,

            titulo: `Renovar receita de ${medicamento.nome}`,

            descricao: agenda.overdue
              ? `Planejada para ${agenda.day
                  .split("-")
                  .reverse()
                  .join("/")} · continua pendente até registrar ou reagendar`
              : "Data planejada para renovação da receita",
            atrasada: agenda.overdue,
            actionHref: withReturnTarget(
              decision.actionHref,
              buildTimelineUrl(dataSelecionada)
            ),
          },
        ];
      return [];
    });
  }, [medicamentos, renovacoes, activePersonId, dataSelecionada, hoje]);

  const retiradasHoje = useMemo(
    () => withdrawalsForAgendaDate(retiradas, dataSelecionada, hoje),
    [retiradas, dataSelecionada, hoje]
  );

  const {
    filtroStatus,
    setFiltroStatus,
    filtroPeriodo,
    setFiltroPeriodo,
    hydrated: filtersHydrated,
  } = useTodayPersistedFilters();
  // M44: link da busca aplica o filtro, sem mexer em registros clínicos.
  const commandDoseStatus = searchParams.get("status");
  useEffect(() => {
    if (commandDoseStatus !== "pendentes") return;
    setFiltroStatus("pendentes");
    setFiltroPeriodo("todos");
  }, [commandDoseStatus, setFiltroStatus, setFiltroPeriodo]);
  // M110: links para doses já tomadas/ignoradas preservam o filtro explícito.
  useEffect(() => {
    if (commandDoseStatus !== "tomados" && commandDoseStatus !== "ignorados")
      return;
    setFiltroStatus(commandDoseStatus);
    setFiltroPeriodo("todos");
  }, [commandDoseStatus, setFiltroStatus, setFiltroPeriodo]);
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
  const [mostrarTodosCompromissos, setMostrarTodosCompromissos] =
    useState(false);
  const [filtroCompromisso, setFiltroCompromisso] =
    useState<FiltroCompromisso>("todos");
  // M120: um link explícito prevalece sobre a preferência persistida.
  const periodFromLinkM120 = searchParams.get("periodo");
  const appointmentFromLinkM120 = searchParams.get("compromisso");
  const resolvedFromLinkM120 = searchParams.get("concluidas");
  // M153 visual: a entrada comum em Hoje sempre começa limpa. Persistência só
  // restaura filtros quando a própria URL declara um contexto de visualização.
  useEffect(() => {
    if (!filtersHydrated) return;
    const hasExplicitFilter = Boolean(
      commandDoseStatus ||
        periodFromLinkM120 ||
        appointmentFromLinkM120 ||
        resolvedFromLinkM120
    );
    if (hasExplicitFilter) return;
    setFiltroStatus("todos");
    setFiltroPeriodo("todos");
  }, [
    filtersHydrated,
    commandDoseStatus,
    periodFromLinkM120,
    appointmentFromLinkM120,
    resolvedFromLinkM120,
    setFiltroStatus,
    setFiltroPeriodo,
  ]);
  useEffect(() => {
    if (
      periodFromLinkM120 === "manha" ||
      periodFromLinkM120 === "tarde" ||
      periodFromLinkM120 === "noite"
    ) {
      setFiltroPeriodo(periodFromLinkM120);
    }
  }, [periodFromLinkM120, setFiltroPeriodo]);
  useEffect(() => {
    if (
      appointmentFromLinkM120 === "consultas" ||
      appointmentFromLinkM120 === "cirurgias" ||
      appointmentFromLinkM120 === "exames" ||
      appointmentFromLinkM120 === "retiradas"
    ) {
      setFiltroCompromisso(appointmentFromLinkM120);
    }
  }, [appointmentFromLinkM120]);
  useEffect(() => {
    if (resolvedFromLinkM120 === "1") setMostrarConcluidas(true);
  }, [resolvedFromLinkM120]);

  const [processandoDoseId, setProcessandoDoseId] = useState<string | null>(
    null
  );

  // HOJE V5 — CENTRAL DIÁRIA
  // Relógio reativo: mantém atrasos, próximos horários e ações em lote
  // corretos mesmo quando a PWA permanece aberta por muito tempo.
  const [agora, setAgora] = useState(() => new Date());

  const [processandoTodos, setProcessandoTodos] = useState(false);

  // Mutex síncrono: dois toques antes do próximo render não podem
  // iniciar dois lotes e disputar o mesmo estoque.
  const batchOperationLock = useRef(false);
  // V223: a troca de conta/pessoa invalida o lote ainda em revisão.
  const batchOwnerRef = useRef(`${user?.id || ""}:${activePersonId || ""}`);
  const [batchTargetKeys, setBatchTargetKeys] = useState<string[] | null>(null);

  const [batchFrozen,setBatchFrozen]=useState<{context:string;entries:{item:DoseItemExt;review:HomeDoseReview;key:string;excluded:string|null;knownEmpty:boolean}[]}|null>(null);
  const [batchQuantities,setBatchQuantities]=useState<Record<string,string>>({});
  const [batchDeselected,setBatchDeselected]=useState<string[]>([]);
  const [batchResults,setBatchResults]=useState<{context:string;rows:{key:string;name:string;hour:string;state:'saved'|'excluded'|'failed';detail:string}[]}|null>(null);

  // VAULT_MOTOR_TEMPORAL_V46
  // Slot programado e instante real da tomada são conceitos distintos.
  const [isBatchTimeModalOpen, setIsBatchTimeModalOpen] = useState(false);

  useEffect(() => {
    const key = `${user?.id || ""}:${activePersonId || ""}`;
    if (batchOwnerRef.current === key) return;
    batchOwnerRef.current = key;
    setBatchTargetKeys(null);
    setBatchFrozen(null);setBatchResults(null);setBatchDeselected([]);
    if (!batchOperationLock.current) setIsBatchTimeModalOpen(false);
  }, [user?.id, activePersonId]);

  const [batchCustomTime, setBatchCustomTime] = useState("");
  const [batchUnits,setBatchUnits]=useState<Record<string,UnitDraft>>({});
  const [historicalUnitDraft,setHistoricalUnitDraft]=useState<UnitDraft|null>(null);
  const [historicalReviewScope,setHistoricalReviewScope]=useState<string|null>(null);
  const [historicalExpected,setHistoricalExpected]=useState<DoseSnapshot|null>(null);
  const [historicalQuantity,setHistoricalQuantity]=useState('');
  const historicalLock=useRef(false);
  const [doseCorrection,setDoseCorrection]=useState<{context:string;item:DoseItemExt;expected:DoseSnapshot;action:'cancel'|'remove'|'clear'}|null>(null);
  const correctionLock=useRef(false);
  const [quickDoseSlot,setQuickDoseSlot]=useState<{context:string;medicationId:string;day:string;hour:string}|null>(null);

  const [isDoseModalOpen, setIsDoseModalOpen] = useState(false);
  const [premiumNavigation,setPremiumNavigation]=useState<{context:string;selection:DoseCenterSelection}|null>(null);
  const [premiumReview, setPremiumReview] = useState<{context:string;key:string}|null>(null);

  const [historicalDoseReviewItem, setHistoricalDoseReviewItem] =
    useState<DoseItemExt | null>(null);

  const [historicalCustomTakenAt, setHistoricalCustomTakenAt] = useState("");

  const [historicalCustomMode, setHistoricalCustomMode] = useState(false);

  const [isHistoricalProcessing, setIsHistoricalProcessing] = useState(false);

  useEffect(() => {
    const atualizarRelogio = () => {
      if (document.visibilityState !== "visible") return;
      const instante = new Date();
      setAgora((anterior) =>
        isSameLocalMinute(anterior, instante) ? anterior : instante
      );
    };

    atualizarRelogio();

    const intervalId = window.setInterval(atualizarRelogio, 30_000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        atualizarRelogio();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    const action = searchParams.get("action");

    if (action === "dose") {
      setIsDoseModalOpen(true);
      router.replace(
        consumeTodayActionM120(searchParams, dataSelecionada, hoje)
      );
    } else if (action === "sintoma") {
      router.replace("/saude/registros/novo");
    }
  }, [searchParams, router]);

  const retroReviewSummary = useMemo(
    () =>
      buildTodayRetroReviewSummary({
        enabled: retroReviewMode,
        medicationId: retroReviewMedicationId,
        medications: medicamentos,
        renewals: renovacoes,
        doseLogs: historicoDosesCompleto,
        personId: activePersonId,
        today: hoje,
      }),
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
  const irParaProximoPendenteRetroativo = () => {
    if (!retroReviewSummary || retroReviewSummary.pendingDates.length === 0) {
      showToast("Não há doses retroativas pendentes de revisão", "success");

      return;
    }

    const pendingDates = retroReviewSummary.pendingDates;

    const nextAfterCurrent = pendingDates.find(
      (date) => date > dataSelecionada
    );

    const destino = nextAfterCurrent || pendingDates[0];

    trigger("vibrate");

    router.replace(buildTimelineUrl(destino));
  };

  const sairRevisaoRetroativa = () => {
    trigger("vibrate");

    router.replace(
      dataSelecionada === hoje ? "/hoje" : `/hoje?data=${dataSelecionada}`
    );
  };

  const horaAtual = [
    String(presentationNow.getHours()).padStart(2, "0"),
    String(presentationNow.getMinutes()).padStart(2, "0"),
  ].join(":");

  // M18: past/future timelines have no moving "now" bucket. Keep their
  // projections stable during minute ticks; today still uses the live clock.
  const operationalMinute = isHoje ? horaAtual : "00:00";

  // M22: restore unchanged rows by clinical identity only within the same owner,
  // person, selected day and retroactive review. Snapshot is committed after
  // React has committed the UI, never mutated by speculative renders.
  const committedTimeline = useRef<TodayTimelineSnapshot<DoseItemExt> | null>(
    null
  );
  const doseIdentityContext = JSON.stringify([
    user?.id ?? null,
    activePersonId ?? null,
    dataSelecionada,
    retroReviewMode,
    retroReviewMedicationId ?? null,
  ]);
  const doses = useMemo<DoseItemExt[]>(() => {
    const projected = buildTodayTimelineItems({
      medicamentos,
      doseLogs: doseLogs || [],
      medicos,
      tratamentos,
      farmacias,
      hospitais,
      historicoDoses: historicoDosesCompleto,
      registros: registrosHoje,
      renovacoes,
      dataSelecionada,
      isHoje,
      userId: user?.id,
      personId: activePersonId || undefined,
      retroReviewMode,
      retroReviewMedicationId,
    });
    return reconcileTodayTimelineItems(
      committedTimeline.current,
      doseIdentityContext,
      projected
    ).items;
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
    user?.id,
    activePersonId,
    retroReviewMode,
    retroReviewMedicationId,
    doseIdentityContext,
  ]);
  useLayoutEffect(() => {
    committedTimeline.current = { scopeKey: doseIdentityContext, items: doses };
  }, [doseIdentityContext, doses]);

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

        return !(med.estoque_horarios || []).some((horario: string) =>
          /^([01]\d|2[0-3]):[0-5]\d$/.test(String(horario || "").trim())
        );
      }),
    [medicamentos]
  );

  const compromissosFiltrados = useMemo(
    () =>
      buildTodayAppointmentProjection({
        consultas: consultasHoje,
        cirurgias: cirurgiasHoje,
        exames: examesHoje,
        retiradas: retiradasHoje,
        filter: filtroCompromisso,
      }),
    [consultasHoje, cirurgiasHoje, examesHoje, retiradasHoje, filtroCompromisso]
  );

  const assistenteDiario = useMemo(() => {
    if (!isHoje) {
      return null;
    }

    return analisarRotinaDiaria(doses, compromissosFiltrados);
  }, [isHoje, doses, compromissosFiltrados]);

  const dosesFiltradas = useMemo(
    () => filterTimelineItems(doses, filtroStatus, filtroPeriodo, isHoje),
    [doses, filtroStatus, filtroPeriodo, isHoje]
  );

  const dosesParaExibir = useMemo(
    () =>
      visibleTimelineItems(dosesFiltradas, {
        isToday: isHoje,
        status: filtroStatus,
        showResolved: mostrarConcluidas,
      }),
    [dosesFiltradas, filtroStatus, isHoje, mostrarConcluidas]
  );

  // R9 R8: a contagem de itens recolhidos usa a mesma autoridade da timeline visível.
  const concluidasOcultas = useMemo(
    () =>
      countHiddenTodayResolved(dosesFiltradas, {
        isToday: isHoje,
        status: filtroStatus,
        showResolved: mostrarConcluidas,
      }),
    [dosesFiltradas, isHoje, filtroStatus, mostrarConcluidas]
  );

  const dosesAgrupadas = useMemo(() => {
    // Visual presentation is outside this 168KB page; grouping remains canonical.
    const metadata = todayTimelineGroupPresentation;
    return groupTimelineItems(dosesParaExibir, {
      isToday: isHoje,
      selectedDate: dataSelecionada,
      today: hoje,
      nowTime: operationalMinute,
      // The normal view still hides resolved rows. Co-location is opt-in
      // only after they are explicitly shown by the user.
      coLocatePlannedWithScheduled: isHoje && filtroStatus === "todos" && mostrarConcluidas,
    }).map(([key, items]) => {
      const meta = key === "horarios"
        ? { icon: Clock, label: "Mesmo horário", sub: "Doses regulares e planejamentos" }
        : metadata[key];
      const total = items.filter(isScheduledRoutineEvidence).length;
      const completed = items.reduce(
        (count, item) => count + (isScheduledRoutineEvidence(item) && item.tomada ? 1 : 0),
        0
      );
      const plannedCount = items.filter(item => item.doseKind === "planned").length;
      return [
        key,
        {
          ...meta,
          sub: todayTimelineGroupContext(meta.sub, items.length) +
            (plannedCount ? ` · ${plannedCount} planejada${plannedCount === 1 ? "" : "s"}` : ""),
          items,
          total,
          completed,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
      ] as const;
    });
  }, [dosesParaExibir, operationalMinute, isHoje, hoje, dataSelecionada, filtroStatus, mostrarConcluidas]);

  // M76: read-only agenda projection across categories. It never changes dose state.
  const agendaOverview = useMemo(
    () =>
      buildTodayAgendaOverview({
        doses,
        reminders: remindersDoDia,
        appointments: compromissosFiltrados,
        now: operationalMinute,
      }),
    [doses, remindersDoDia, compromissosFiltrados, operationalMinute]
  );

  // Métricas de adesão contam somente slots programados.
  // SOS/avulsas e sintomas permanecem na linha do tempo, mas não
  // inflam nem derrubam artificialmente o progresso da rotina.
  // P10: esta projeção não deve ser recalculada a cada interação na tela.
  const metricItems = useMemo(
    () =>
      doses.filter(
        (dose) =>
          !dose.isExpectedUnconfirmed &&
          !dose.isDataConflict &&
          !dose.isAvulsa &&
          !dose.isSintoma &&
          isScheduledRoutineEvidence(dose)
      ),
    [doses]
  );
  const {
    totalTomadas,
    totalPendentes,
    totalEsperadasSemConfirmacao,
    totalIgnoradas,
  } = useMemo(() => summarizeTimeline(doses), [doses]);

  // P7: um lembrete de dose navega até o grupo real, após renderização dos dados.
  useEffect(() => {
    if (!focusDoseQueue || !isHoje) return;
    const focus = () =>
      document.getElementById("hoje-doses")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    const frame = window.requestAnimationFrame(focus);
    const late = window.setTimeout(focus, 450);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(late);
    };
  }, [focusDoseQueue, isHoje, totalPendentes]);

  const totalRegistros = metricItems.length;

  const totalCompromissosDoDia = compromissosFiltrados.length;

  // Includes only scheduled withdrawals with dates strictly earlier than today.
  const overdueWithdrawalsForToday = isHoje
    ? retiradasHoje.filter((item) => isOpenWithdrawal(item) && item.data < hoje)
        .length
    : 0;

  const totalEventosMedicamento = renovacoesReceitaHoje.length;

  const totalItensPlanejados =
    totalEsperadasSemConfirmacao +
    totalCompromissosDoDia +
    totalEventosMedicamento;

  const percentualConclusao =
    totalRegistros > 0 ? Math.round((totalTomadas / totalRegistros) * 100) : 0;

  // VAULT_HOJE_DOSES_V45
  // Somente slots programados vencidos/agora e ainda não resolvidos.
  // A chave medicamento+horário impede baixa dupla por dado legado.
  useEffect(() => {
    if (!isBatchTimeModalOpen) setBatchTargetKeys(null);
  }, [isBatchTimeModalOpen]);

  // P10: confirmações só consultam slots elegíveis já resolvidos pelo Hoje.
  // O lote nunca inclui SOS avulso, dose futura, tomada, ignorada ou conflito.
  const dosesElegiveisLote = useMemo(() => {
    const selectedKeys = batchTargetKeys ? new Set(batchTargetKeys) : null;
    return isHoje
      ? Array.from(
          metricItems
            .filter(
              (dose) =>
                Boolean(dose.medicamentoId) &&
                !dose.tomada &&
                !dose.ignorada &&
                !dose.isDataConflict &&
                dose.horario <= operationalMinute && (!selectedKeys || selectedKeys.has(`${dose.medicamentoId}-${dose.horario}`))
            )
            .reduce((map, dose) => {
              const key = `${dose.medicamentoId}-${dose.horario}`;
              if (!map.has(key)) map.set(key, dose);
              return map;
            }, new Map<string, DoseItemExt>())
            .values()
        )
      : [];
  }, [isHoje, metricItems, batchTargetKeys, operationalMinute]);

  // Macro02: the premium center consumes the same owner/day timeline and the same
  // schedule/stock authorities. A pending Dexie scope switch cannot appear as empty.
  const premiumKey = (item: DoseItemExt) => item.logId ? `log:${item.logId}` : JSON.stringify([item.medicamentoId,dataSelecionada,item.horario]);
  const premiumScope = {user_id:user?.id||"",person_id:activePersonId||""};
  const premiumSlots = buildDoseSlotIndex(doseLogs||[],{userId:user?.id,personId:activePersonId||undefined});
  const premiumEligible = new Set(eligibleGroupDoseKeys(metricItems));
  const premiumSelection=premiumNavigation?.context===doseIdentityContext?premiumNavigation.selection:defaultCenterSelection();
  const premiumHistoryMedications=useMemo(()=>medicationsForOwner<Medicamento>(allMedications,activePersonId,user?.id).flatMap(m=>m.id&&m.person_id&&m.user_id?[{id:m.id,user_id:m.user_id,person_id:m.person_id,name:m.nome,format:m.formato,colors:m.cores,concentration:m.dosagem,relationColor:m.cor_principal}]:[]),[allMedications,activePersonId,user?.id]);
  const premiumView = adaptTodayDoseCenter({
    scope:premiumScope,snapshotScope:premiumScope,snapshotDay:dataSelecionada,day:dataSelecionada,today:hoje,now:horaAtual,asOf:presentationNow.toISOString(),
    load:doseSnapshotLoading||medicationsLoading||!todayOwnerReady?"loading":"ready",items:doses,logs:doseLogs||[],
    keyOf:premiumKey,isRoutine:item=>item.scheduleOrigin==="continuous"||item.scheduleOrigin==="temporary_course"||item.scheduleOrigin==="ad_hoc"||isScheduledRoutineEvidence(item)||Boolean(item.isExpectedUnconfirmed&&!item.isAvulsa&&!item.isSintoma),
    isEligible:item=>isHoje&&item.horario<=operationalMinute&&premiumEligible.has(`${item.medicamentoId}-${item.horario}`),
    stockState:item=>{const med=item.medicamentoId?medicamentosById.get(item.medicamentoId):undefined;const q=med?.estoque_quantidade;return typeof q!=="number"||!Number.isFinite(q)?"unknown":q<=0?"unavailable":"available";},
    resolveSlot:item=>resolveDoseSlot(premiumSlots,item.medicamentoId||"",dataSelecionada,item.horario),
    plannedQuantityLabel:item=>typeof item.unidadePorDose==="number"&&Number.isFinite(item.unidadePorDose)&&item.unidadePorDose>0?`${item.unidadePorDose.toLocaleString("pt-BR")} ${item.unidadeDose||"· unidade prevista não informada"}`:undefined,
  });
  const premiumHistory=useMemo(()=>projectDoseHistory({scope:{user_id:user?.id||"",person_id:activePersonId||""},today:hoje,end:dataSelecionada,range:premiumSelection.range,asOf:new Date().toISOString(),load:historyReady&&!medicationsLoading?"ready":"loading",logs:historicoDosesCompleto,medications:premiumHistoryMedications,plannedOrigin:log=>{const origin=classifyPlannedDose(log);return origin==='temporary_course'||origin==='ad_hoc'?origin:'unknown';}}),[user?.id,activePersonId,hoje,dataSelecionada,premiumSelection.range,historyReady,medicationsLoading,historicoDosesCompleto,premiumHistoryMedications,horaAtual]);
  const premiumBrain=useMemo(()=>summarizeRecordedDoseTiming({scope:{user_id:user?.id||"",person_id:activePersonId||""},today:hoje,asOf:new Date().toISOString(),logs:historyReady?historicoDosesCompleto:[],medicationIds:premiumHistoryMedications.map(m=>m.id)}),[user?.id,activePersonId,hoje,horaAtual,historyReady,historicoDosesCompleto,premiumHistoryMedications]);
  const premiumStockCoverage=useMemo(()=>historyReady&&!medicationsLoading?summarizeRecordedStockCoverage({scope:{user_id:user?.id||"",person_id:activePersonId||""},today:hoje,asOf:new Date().toISOString(),logs:historicoDosesCompleto,medications:medicamentos}):[],[user?.id,activePersonId,hoje,horaAtual,historyReady,medicationsLoading,historicoDosesCompleto,medicamentos]);
  // R4: retorno com contexto igual; filtros/dia/perfil diferentes nunca reaproveitam scroll.
  useEffect(() => {
    if(!user?.id||!activePersonId||!filtersHydrated||!premiumView.ready||!historyReady)return;
    let saved: {
      user?: string;
      person?: string;
      date?: string;
      query?: string;
      y?: number;
      premium?: unknown;
    } | null = null;
    try {
      const raw = sessionStorage.getItem("vault:today:r4-return");
      if (raw) saved = JSON.parse(raw);
      if(saved&&(saved.user!==user?.id||saved.person!==activePersonId||saved.date!==dataSelecionada))sessionStorage.removeItem("vault:today:r4-return");
    } catch {
      return;
    }
    if (
      !saved ||
      saved.user !== user?.id ||
      saved.person !== activePersonId ||
      saved.date !== dataSelecionada ||
      saved.query !== buildTimelineUrl(dataSelecionada) ||
      !Number.isFinite(saved.y)
    )
      return;
    try { sessionStorage.removeItem("vault:today:r4-return"); } catch { /* optional navigation cache */ }
    if(saved.premium)setPremiumNavigation({context:doseIdentityContext,selection:restoreCenterSelection(saved.premium)});
    const frame = requestAnimationFrame(() =>
      window.scrollTo({ top: Math.max(0, saved!.y || 0), behavior: "auto" })
    );
    const late = window.setTimeout(
      () =>
        window.scrollTo({ top: Math.max(0, saved!.y || 0), behavior: "auto" }),
      180
    );
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(late);
    };
    // Consumir somente após a leitura vinculada ao escopo e a hidratação dos filtros.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id,activePersonId,filtersHydrated,premiumView.ready,historyReady,doseIdentityContext,buildTimelineUrl(dataSelecionada)]);
  const premiumItemsByKey = new Map<string,DoseItemExt[]>();
  for(const item of doses){const key=premiumKey(item),list=premiumItemsByKey.get(key)||[];list.push(item);premiumItemsByKey.set(key,list);}
  const resolvePremiumItem = (row:CenterRow) => {
    if(!premiumView.ready||row.user_id!==premiumScope.user_id||row.person_id!==premiumScope.person_id||row.day!==dataSelecionada)return undefined;
    const matches=premiumItemsByKey.get(row.key)||[];
    return matches.length===1&&matches[0].medicamentoId===row.medication_id&&matches[0].horario===row.hour?matches[0]:undefined;
  };
  const premiumSelected = premiumReview?.context===doseIdentityContext&&premiumView.ready&&premiumItemsByKey.get(premiumReview.key)?.length===1?premiumItemsByKey.get(premiumReview.key)![0]:null;
  const nativeReviewToken=searchParams.get('native_review');
  const consumedNativeReview=useRef<string|null>(null);
  // A notification opens the exact pending item, never a direct clinical write.
  // Keep any currently open QuickDose draft until the person closes it.
  useEffect(()=>{
    if(!nativeReviewToken||consumedNativeReview.current===nativeReviewToken||!premiumView.ready||isDoseModalOpen)return;
    const request=readNativeDoseReview(nativeReviewToken,premiumScope,dataSelecionada);
    consumedNativeReview.current=nativeReviewToken;
    discardNativeDoseReview(nativeReviewToken);
    if(request){
      const med=medicamentosById.get(request.medicationId);
      const slot=resolveDoseSlot(premiumSlots,request.medicationId,request.day,request.hour);
      const item=med?.user_id===premiumScope.user_id&&med?.person_id===premiumScope.person_id?findNativeReviewItem(request,doses,slot):null;
      if(item){setPremiumReview(null);setQuickDoseSlot({context:doseIdentityContext,medicationId:request.medicationId,day:request.day,hour:request.hour});setIsDoseModalOpen(true);}
      else showToast('O horário já foi resolvido ou mudou. Confira as doses no histórico.','info');
    }else showToast('O contexto da notificação não está mais disponível. Confira a pessoa e as doses.','info');
    router.replace(consumeTodayActionM120(searchParams,dataSelecionada,hoje));
  },[nativeReviewToken,premiumView.ready,doseIdentityContext,isDoseModalOpen,doses,dataSelecionada,router,searchParams,hoje]);
  const isLoading = rawMedicamentos === undefined || doseLogs === undefined;

  if (isLoading) {
    return <CardListSkeleton />;
  }

  const abrirRevisaoHistorica = (item: DoseItemExt) => {
    if (!isPassado || !item.medicamentoId || item.isAvulsa || item.isSintoma) {
      return;
    }

    try{setHistoricalExpected(reviewSnapshot(item));}catch(error){showToast(error instanceof Error?error.message:'Registro inconsistente.','info');return;}
    trigger("vibrate");setHistoricalQuantity('');
    setHistoricalDoseReviewItem(item);
    setHistoricalUnitDraft(null);
    setHistoricalReviewScope(doseIdentityContext);

    setHistoricalCustomTakenAt(`${dataSelecionada}T${item.horario || "00:00"}`);

    setHistoricalCustomMode(false);
  };

  const fecharRevisaoHistorica = () => {
    if (isHistoricalProcessing) {
      return;
    }

    setHistoricalDoseReviewItem(null);

    setHistoricalCustomMode(false);

    setHistoricalCustomTakenAt("");
  };

  const executarRevisaoHistorica = async (
    action: "scheduled" | "custom" | "ignored" | "clear"
  ) => {
    const item = historicalDoseReviewItem;

    if (!item?.medicamentoId || !isPassado || isHistoricalProcessing || historicalLock.current || historicalReviewScope!==doseIdentityContext || !premiumScope.user_id || !premiumScope.person_id) {
      return;
    }

    historicalLock.current=true;setIsHistoricalProcessing(true);

    try {
      const expected=historicalExpected;
      const prior=readDoseUnit(expected??{});
      if(prior.state==='invalid')throw Error("Unidade histórica requer revisão.");
      const unit=prior.state==='known'?prior.fields:historicalUnitDraft?unitDraftSnapshot(historicalUnitDraft):undefined;
      if((action==='scheduled'||action==='custom')&&unit===undefined)throw Error("Declare a unidade administrada ou indique que não foi informada.");
      const quantity=historicalQuantity.trim();
      if((action==='scheduled'||action==='custom')&&(!/^\d+(?:[.,]\d+)?$/.test(quantity)||!Number.isFinite(Number(quantity.replace(',','.')))||Number(quantity.replace(',','.'))<=0))throw Error('Informe a quantidade realmente administrada.');
      const writeHistorical=(status:'taken'|'ignored'|'clear',actualAt?:string)=>doseLogsRepository.setStatus({personId:premiumScope.person_id,medicamentoId:item.medicamentoId!,data:dataSelecionada,horario:item.horario,status,quantidade:status==='taken'?Number(quantity.replace(',','.')):undefined,tomadoEm:actualAt,unit,expected,adjustStock:false});
      if (action === "scheduled") {
        const scheduledLocal = `${dataSelecionada}T${
          item.horario || "00:00"
        }:00`;

        const takenAt = new Date(scheduledLocal);

        if (Number.isNaN(takenAt.getTime())) {
          throw new Error("Horário histórico inválido.");
        }

        await writeHistorical("taken",civilDoseInstant(dataSelecionada,item.horario,new Date().toISOString()));

        trigger("success");

        showToast("Dose histórica confirmada", "success");
      } else if (action === "custom") {
        if (!historicalCustomTakenAt) {
          showToast("Informe quando a dose foi tomada", "error");

          return;
        }

        const customDate = historicalCustomTakenAt.slice(0, 10);

        const takenAt = new Date(historicalCustomTakenAt);

        if (Number.isNaN(takenAt.getTime())) {
          showToast("Data ou horário inválido", "error");

          return;
        }

        await writeHistorical("taken",civilDoseInstant(customDate,historicalCustomTakenAt.slice(11,16),new Date().toISOString()));

        trigger("success");

        showToast("Horário histórico atualizado", "success");
      } else if (action === "ignored") {
        await writeHistorical("ignored");

        trigger("vibrate");

        showToast("Dose marcada como não tomada", "info");
      } else {
        await writeHistorical("clear");

        trigger("vibrate");

        showToast("Confirmação histórica removida", "info");
      }

      setHistoricalDoseReviewItem(null);

      setHistoricalCustomMode(false);

      setHistoricalCustomTakenAt("");
    } catch (error) {
      console.error("Erro ao revisar dose histórica:", error);

      trigger("error");

      showToast(error instanceof Error?error.message:"Erro ao atualizar histórico", "error");
    } finally {
      historicalLock.current=false;setIsHistoricalProcessing(false);
    }
  };

  const openDoseCorrection=(item:DoseItemExt,action:'cancel'|'remove'|'clear')=>{
    if(processandoDoseId||!item.medicamentoId||!premiumScope.user_id||!premiumScope.person_id)return;
    try{
      let expected:DoseSnapshot|null=null;
      if(item.logId){const matches=(doseLogs||[]).filter(log=>log.id===item.logId&&log.user_id===premiumScope.user_id&&log.person_id===premiumScope.person_id&&log.medicamento_id===item.medicamentoId&&log.data===dataSelecionada);const row=matches.length===1?matches[0]:undefined;if(row?.id&&row.person_id)expected={...row,id:row.id,person_id:row.person_id};}
      else expected=reviewSnapshot(item);
      if(!expected||action==='cancel'&&(expected.dose_kind!=='planned'||expected.tomado_em||expected.ignorado_em))throw Error('Registro mudou. Confira o histórico.');
      setPremiumReview(null);setDoseCorrection({context:doseIdentityContext,item,expected,action});trigger('vibrate');
    }catch(error){showToast(error instanceof Error?error.message:'Registro indisponível.','info');}
  };
  const handleCancelPlannedDose=async(item:DoseItemExt)=>openDoseCorrection(item,'cancel');
  const confirmDoseCorrection=async()=>{
    const target=doseCorrection;if(!target||target.context!==doseIdentityContext||correctionLock.current||processandoDoseId)return;
    const expected=target.expected;correctionLock.current=true;setProcessandoDoseId(`log-${expected.id}`);
    try{await doseLogsRepository.removeById({personId:expected.person_id,id:expected.id,expected,adjustStock:target.action!=='cancel'});if(committedTimeline.current?.scopeKey!==target.context)return;trigger('vibrate');showToast('Correção registrada neste aparelho. Aguardando sincronização.','info');setDoseCorrection(null);}
    catch(error){showToast(error instanceof Error?error.message:'Não foi possível corrigir com segurança.','error');}
    finally{correctionLock.current=false;setProcessandoDoseId(null);}
  };

  const handleToggle = async (item: DoseItemExt) => {
    if (!isHoje) {
      trigger("vibrate");

      showToast(
        isPassado
          ? "Histórico em modo de consulta. Nenhuma dose passada será presumida."
          : "Doses futuras só poderão ser registradas no dia correspondente.",
        "info"
      );

      return;
    }

    if (processandoDoseId || !item.medicamentoId) {
      return;
    }

    if(item.isAvulsa&&item.logId&&item.doseKind!=='planned'){openDoseCorrection(item,'remove');return;}
    if(item.tomada){openDoseCorrection(item,'clear');return;}
    if(item.ignorada){openDoseCorrection(item,'clear');return;}
    openIndividualReview(item);trigger('vibrate');
  };

  const openBatchReview=(items:readonly DoseItemExt[])=>{
    if(!isHoje||!premiumScope.user_id||!premiumScope.person_id||processandoTodos||processandoDoseId||batchOperationLock.current||!premiumView.ready)return;
    const seen=new Set<string>();
    const entries=items.flatMap(item=>{
      if(!item.medicamentoId||item.isAvulsa||item.isSintoma||item.doseKind==='sos'||item.doseKind==='extra')return [];
      const key=JSON.stringify([item.medicamentoId,dataSelecionada,item.horario]);if(seen.has(key))return [];seen.add(key);
      const slot=resolveDoseSlot(premiumSlots,item.medicamentoId,dataSelecionada,item.horario);
      const review=captureHomeDoseReview({...premiumScope,medicamento_id:item.medicamentoId,data:dataSelecionada,horario:item.horario},slot.records,item.unidadePorDose);
      const med=medicamentosById.get(item.medicamentoId);
      let excluded=review.blocked;
      if(item.tomada||item.ignorada||item.isDataConflict||item.horario>operationalMinute)excluded='Não é uma pendência vencida elegível.';
      const knownEmpty=!excluded&&Boolean(med&&med.user_id===premiumScope.user_id&&med.person_id===premiumScope.person_id&&hasKnownEmptyMedicationStock(med));
      if(!excluded){try{if(!med)throw Error('Medicamento indisponível.');const stock=observedStockContext(med,{...premiumScope,medicationId:item.medicamentoId});if(!stock.basis||!stock.unit||stock.balance===null||stock.balance<=0)throw Error('Estoque não comprovado ou indisponível; revise individualmente.');}catch(error){excluded=error instanceof Error?error.message:'Estoque requer revisão.';}}
      return [{item,review,key,excluded,knownEmpty}];
    });
    if(entries.length<2)return;
    setBatchTargetKeys(entries.map(({item})=>`${item.medicamentoId}-${item.horario}`));
    setBatchUnits({});setBatchQuantities({});setBatchResults(null);setBatchDeselected(entries.filter(entry=>entry.knownEmpty).map(entry=>entry.key));
    setBatchFrozen({context:doseIdentityContext,entries});setBatchCustomTime(`${dataSelecionada}T${operationalMinute}`);
    trigger('vibrate');setIsBatchTimeModalOpen(true);
  };
  const handleRevisarHorario=(items:DoseItemExt[])=>openBatchReview(items);
  const handleTomarTodos=()=>openBatchReview(dosesElegiveisLote);

  const reviewSnapshot=(item:DoseItemExt):DoseSnapshot|null=>{
    const slot=resolveDoseSlot(premiumSlots,item.medicamentoId||"",dataSelecionada,item.horario);
    if(slot.state==='conflict'||slot.records.length>1)throw Error("Há mais de um registro neste horário. Revise o histórico.");
    const row=slot.records[0];if(!row)return null;
    if(!row.id||!row.person_id||row.user_id!==premiumScope.user_id||row.person_id!==premiumScope.person_id)throw Error("O registro não pertence à pessoa ativa.");
    return {...row,id:row.id,person_id:row.person_id};
  };
  const frozenEntries=batchFrozen?.context===doseIdentityContext?batchFrozen.entries:[];
  const reviewUnitFor=(entry:typeof frozenEntries[number])=>{
    if(entry.excluded)throw Error(entry.excluded);
    const known=readDoseUnit(entry.review.expected??{}),draft=batchUnits[entry.key];
    return prepareHomeDoseConfirmation(entry.review,{quantity:batchQuantities[entry.key]??'',code:draft?.code??null,customLabel:draft?.customLabel??'',unitReviewed:known.state==='known'||Boolean(draft),noStock:false},false,true);
  };
  const batchReadyEntries=frozenEntries.filter(e=>!e.excluded&&!batchDeselected.includes(e.key));
  const batchReviewReady=batchReadyEntries.length>0&&batchReadyEntries.every(e=>{try{reviewUnitFor(e);return true;}catch{return false;}});
  const openIndividualReview=(item:DoseItemExt)=>{
    if(!item.medicamentoId||!premiumScope.person_id||!premiumScope.user_id)return;
    setPremiumReview(null);setQuickDoseSlot({context:doseIdentityContext,medicationId:item.medicamentoId,day:dataSelecionada,hour:item.horario});setIsDoseModalOpen(true);
  };
  type BatchTimeMode = "now" | "scheduled" | "custom";

  const executarTomadaEmLote=async(mode:BatchTimeMode)=>{
    if(batchOperationLock.current||processandoTodos||processandoDoseId||!batchReviewReady||batchFrozen?.context!==doseIdentityContext)return;
    const startedAt=new Date().toISOString(),contextAtStart=doseIdentityContext,ownerAtStart=batchOwnerRef.current;
    let actual:string|null=null;
    try{actual=mode==='now'?startedAt:mode==='custom'?civilDoseInstant(batchCustomTime.slice(0,10),batchCustomTime.slice(11,16),startedAt):null;}catch(error){showToast(error instanceof Error?error.message:'Horário inválido.','error');return;}
    const entries=[...frozenEntries];const rows:NonNullable<typeof batchResults>['rows']=[];
    const confirmed=new Map<string,ReturnType<typeof reviewUnitFor>>();
    try{for(const entry of batchReadyEntries)confirmed.set(entry.key,reviewUnitFor(entry));}catch(error){showToast(error instanceof Error?error.message:'Revise as doses.','error');return;}
    batchOperationLock.current=true;setProcessandoTodos(true);
    try{
      for(const entry of entries){
        const {item,review,key,excluded}=entry,name=item.medicamentoNome||'Medicamento',hour=item.horario;
        const report=(state:'saved'|'excluded'|'failed',detail:string)=>rows.push({key,name,hour,state,detail});
        if(batchOwnerRef.current!==ownerAtStart||committedTimeline.current?.scopeKey!==contextAtStart){report('excluded','Contexto alterado durante o lote.');continue;}
        if(excluded||!confirmed.has(key)){report('excluded',excluded??'Não selecionada nesta revisão.');continue;}
        try{
          assertHomeReviewScope(review,premiumScope,{medicamentoId:item.medicamentoId!,data:dataSelecionada,horario:hour});
          const current=committedTimeline.current?.items.filter(x=>x.medicamentoId===item.medicamentoId&&x.horario===hour&&!x.isAvulsa&&!x.isSintoma&&x.doseKind!=='sos'&&x.doseKind!=='extra')??[];
          if(current.length!==1||current[0].tomada||current[0].ignorada||current[0].isDataConflict)throw Error('Ocorrência mudou. Confira individualmente.');
          const dose=confirmed.get(key)!;const scheduledAt=civilDoseInstant(dataSelecionada,hour,startedAt);const takenAt=actual??scheduledAt;
          const id=await doseLogsRepository.setStatus({personId:review.scope.person_id,medicamentoId:review.scope.medicamento_id,data:review.scope.data,horario:hour,status:'taken',tomadoEm:takenAt,quantidade:dose.quantity,unit:dose.unit,expected:review.expected,requireRegisteredStock:true,onlyIfPending:true});
          const saved=await doseLogsRepository.getById(id,review.scope.person_id);
          const savedUnit=readDoseUnit(saved??{});
          if(!saved||saved.id!==id||saved.user_id!==review.scope.user_id||saved.person_id!==review.scope.person_id||saved.medicamento_id!==review.scope.medicamento_id||saved.data!==review.scope.data||saved.horario.slice(0,5)!==hour||saved.quantidade!==dose.quantity||Boolean(saved.ignorado_em)||savedUnit.state!=='known'||savedUnit.fields.unidade_dose!==dose.unit.unidade_dose||savedUnit.fields.unidade_dose_rotulo!==dose.unit.unidade_dose_rotulo||savedUnit.fields.fonte_unidade!==dose.unit.fonte_unidade||Date.parse(saved.tomado_em??'')!==Date.parse(takenAt))throw Error('Registro local requer conferência antes de nova tentativa.');
          report('saved',`${new Date(takenAt).toLocaleString('pt-BR')} · ${describeHistoricalDose(saved)} · ${saved.estoque_movimento?.state==='applied'?'movimentação registrada':'estoque requer conferência'} · ${saved.synced?'sincronizado':'aguardando sincronização'}`);
        }catch(error){report('failed',error instanceof Error?error.message:'Falha ao registrar. Confira o histórico antes de tentar novamente.');}
      }
    }finally{batchOperationLock.current=false;setProcessandoTodos(false);}
    if(batchOwnerRef.current!==ownerAtStart||committedTimeline.current?.scopeKey!==contextAtStart){setIsBatchTimeModalOpen(false);return;}
    setBatchResults({context:contextAtStart,rows});
    const count=rows.filter(x=>x.state==='saved').length,remaining=rows.length-count;
    trigger(remaining?'vibrate':'success');showToast(`${count} registro(s) local(is); ${remaining} não confirmado(s). Consulte o resultado.`,remaining?'info':'success');
  };

  const stockNonTakeEntries=frozenEntries.filter(entry=>entry.knownEmpty&&!batchDeselected.includes(entry.key));
  const confirmarDosesNaoTomadasPorEstoque=async()=>{
    if(batchOperationLock.current||processandoTodos||processandoDoseId||batchFrozen?.context!==doseIdentityContext||!stockNonTakeEntries.length)return;
    const contextAtStart=doseIdentityContext,ownerAtStart=batchOwnerRef.current;
    const entries=[...frozenEntries],selected=new Set(stockNonTakeEntries.map(entry=>entry.key));
    const rows:NonNullable<typeof batchResults>['rows']=[];
    batchOperationLock.current=true;setProcessandoTodos(true);
    try{
      for(const {item,review,key} of entries){
        const name=item.medicamentoNome||'Medicamento',hour=item.horario;
        const report=(state:'saved'|'excluded'|'failed',detail:string)=>rows.push({key,name,hour,state,detail});
        if(!selected.has(key)){report('excluded','Não selecionada para declaração de falta de estoque.');continue;}
        if(batchOwnerRef.current!==ownerAtStart||committedTimeline.current?.scopeKey!==contextAtStart){report('excluded','Contexto alterado durante o lote.');continue;}
        try{
          assertHomeReviewScope(review,premiumScope,{medicamentoId:item.medicamentoId!,data:dataSelecionada,horario:hour});
          const current=committedTimeline.current?.items.filter(x=>x.medicamentoId===item.medicamentoId&&x.horario===hour&&!x.isAvulsa&&!x.isSintoma&&x.doseKind!=='sos'&&x.doseKind!=='extra')??[];
          if(current.length!==1||current[0].tomada||current[0].ignorada||current[0].isDataConflict)throw Error('Ocorrência mudou. Confira individualmente.');
          const id=await doseLogsRepository.setStatus({personId:review.scope.person_id,medicamentoId:review.scope.medicamento_id,data:review.scope.data,horario:hour,status:'ignored',motivo:'sem_estoque',expected:review.expected,onlyIfPending:true,requireKnownEmptyStock:true,adjustStock:false});
          const saved=await doseLogsRepository.getById(id,review.scope.person_id);
          if(!saved||saved.id!==id||saved.user_id!==review.scope.user_id||saved.person_id!==review.scope.person_id||saved.medicamento_id!==review.scope.medicamento_id||saved.data!==review.scope.data||saved.horario.slice(0,5)!==hour||!saved.ignorado_em||saved.tomado_em||saved.motivo!=='sem_estoque')throw Error('Registro local requer conferência antes de nova tentativa.');
          report('saved',`Não tomada por falta de estoque · sem débito · ${saved.synced?'sincronizado':'aguardando sincronização'}`);
        }catch(error){report('failed',error instanceof Error?error.message:'Falha ao registrar. Confira o histórico.');}
      }
    }finally{batchOperationLock.current=false;setProcessandoTodos(false);}
    if(batchOwnerRef.current!==ownerAtStart||committedTimeline.current?.scopeKey!==contextAtStart){setIsBatchTimeModalOpen(false);return;}
    setBatchResults({context:contextAtStart,rows});
    const count=rows.filter(row=>row.state==='saved').length;
    trigger(count?'success':'error');showToast(`${count} declaração(ões) local(is) de não tomada. Confira o resultado.`,count?'info':'error');
  };

  const handleIgnorar=async(item:DoseItemExt)=>{
    if(!isHoje||processandoDoseId||!item.medicamentoId||item.isDataConflict||item.horario>operationalMinute){showToast('Confira a ocorrência no histórico ou aguarde o horário programado.','info');return;}
    openIndividualReview(item);trigger('vibrate');
  };

  const filtrosAtivosCount =
    Number(filtroStatus !== "todos") +
    Number(filtroPeriodo !== "todos") +
    Number(filtroCompromisso !== "todos") +
    Number(isHoje && mostrarConcluidas);
  const hasFiltrosAtivos = filtrosAtivosCount > 0;

  // Pure empty-state copy never writes a clinical or dose event.
  const emptyTimelineCopy = todayTimelineEmptyCopy({
    hasFilters: hasFiltrosAtivos,
    retroReview: retroReviewMode,
    isToday: isHoje,
    isPast: isPassado,
    selectedDateDescription: dataSelecionadaDescricao,
  });

  const limparFiltros = () => {
    trigger("vibrate");
    setFiltroStatus("todos");
    setFiltroPeriodo("todos");
    setFiltroCompromisso("todos");
    setMostrarConcluidas(false);
  };

  const navegarCompromisso = (item: any) => {
    trigger("vibrate");

    const rotas: Record<string, string> = {
      consulta: "/saude/consultas/detalhes",
      cirurgia: "/saude/cirurgias/detalhes",
      exame: "/saude/exames/detalhes",
      retirada: "/saude/retiradas/detalhes",
    };

    const rota = rotas[item.tipo];

    if (rota && item.id) {
      router.push(
        withReturnTarget(
          `${rota}?id=${encodeURIComponent(String(item.id))}`,
          buildTimelineUrl(dataSelecionada)
        )
      );
    }
  };

  // M17: one interaction context per parent render, shared by every visual dose card.
  // Clinical operations, owner scope, stock authority and idempotent writes stay above.
  const doseCardScope: TodayDoseTimelineCardScope = {
    returnTo: buildTimelineUrl(dataSelecionada),
    isHoje,
    isPassado,
    isFuturo,
    horaAtual,
    regulatoryProfiles,
    processandoDoseId,
    trigger,
    router,
    medicamentosById,
    abrirRevisaoHistorica,
    isHistoricalProcessing,
    handleCancelPlannedDose,
    isProcessing: false,
    handleIgnorar,
    handleToggle,
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom,0px))] vault-adaptive-tail">
        {/* M40 — Cabeçalho compacto: data e progresso, sem filtros redundantes. */}
        <header className="border-b border-surface-border/40 bg-void px-4 pb-3 pt-3 shadow-[0_10px_26px_-24px_rgba(47,227,201,0.4)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-ice/80">
                LINHA DO TEMPO
              </p>
              <h1 className="font-display text-2xl font-semibold capitalize leading-tight text-ink-primary">
                {dataSelecionadaLabel}
              </h1>
            </div>
            {!isHoje && (
              <span className="shrink-0 rounded-lg border border-ice/20 bg-ice/10 px-2 py-1 text-[10px] font-semibold text-ice">
                {isPassado ? "Histórico" : "Planejado"}
              </span>
            )}
          </div>
          <TodayDateNavigation
            label="Escolher data da linha do tempo"
            date={dataSelecionada}
            isHoje={isHoje}
            isPassado={isPassado}
            isFuturo={isFuturo}
            description={dataSelecionadaDescricao}
            onPrevious={() => navegarData(-1)}
            onNext={() => navegarData(1)}
            onToday={voltarParaHoje}
            onSelectDate={navegarParaData}
          />
          <TodayRoutinePulse
            isHoje={isHoje}
            isPassado={isPassado}
            isFuturo={isFuturo}
            pending={totalPendentes}
            unconfirmed={totalEsperadasSemConfirmacao}
            completed={totalTomadas}
            ignored={totalIgnoradas}
            recorded={totalRegistros}
            projected={totalItensPlanejados}
            percentage={percentualConclusao}
          />
          <TodayNavigationContextM120
            status={filtroStatus}
            period={filtroPeriodo}
            time={focusDoseTime}
            isPast={isPassado}
            isFuture={isFuturo}
            origin={originM120}
            showContext={Boolean(
              requestedDate ||
                focusDoseQueue ||
                searchParams.get("status") ||
                searchParams.get("periodo") ||
                searchParams.get("compromisso") ||
                originM120
            )}
            onBack={() => {
              if (originM120) router.push(originM120);
            }}
            onOpenFilters={() => {
              const panel = document.querySelector<HTMLDetailsElement>(
                "[data-vault-today-filters]"
              );
              if (panel) {
                panel.open = true;
                panel.querySelector("summary")?.focus();
              }
            }}
          />
          <span className="sr-only">
            Doses futuras não estão atrasadas antes do horário. Registros
            contraditórios exigem revisão separada.
          </span>
        </header>
        {/* P5: a navegação de seções é uma camada de apresentação sobre dados já selecionados. */}
        <div className="mx-auto max-w-3xl px-4 pt-2">
          <TodayJourneyRailP5
            isToday={isHoje}
            pendingCount={isHoje ? totalPendentes : 0}
            dailySections={isHoje && !retroReviewMode}
            onInteraction={() => trigger("vibrate")}
          />
        </div>
        <section id="hoje-cuidado" aria-label="Cuidado" className="mx-auto max-w-3xl scroll-mt-24 space-y-2 px-4 pt-3">
          <VitalContextCard origin="/hoje" day={dataSelecionada} returnTo={buildTimelineUrl(dataSelecionada)}/>
          <CareFlowSummaryM2 />
        </section>
        <div className="mx-auto max-w-3xl px-4 pt-2">
          <ExamAgendaM2 day={dataSelecionada} />
        </div>

        {/* =========================================================
            CONTEÚDO
        ========================================================= */}
        <section className="space-y-2.5 px-4 pt-2.5">
          {/* M40 — O conteúdo clínico vem antes dos atalhos e painéis complementares. */}
          <span
            id="hoje-agora"
            className="block scroll-mt-24"
            aria-hidden="true"
          />
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink-primary">
                {isFuturo
                  ? "Doses previstas"
                  : isPassado
                  ? "Registros do dia"
                  : "Sua rotina"}
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                {isFuturo
                  ? "Planejamento, sem confirmar tomadas"
                  : isPassado
                  ? "Histórico e registros confirmados"
                  : "Horários, registros e próximas doses"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <TodayTimelineGuide
                isHoje={isHoje}
                isPassado={isPassado}
                isFuturo={isFuturo}
              />
              <TodayFilterPanel
                status={filtroStatus}
                period={filtroPeriodo}
                appointment={filtroCompromisso}
                showResolved={mostrarConcluidas}
                isToday={isHoje}
                isPast={isPassado}
                activeCount={filtrosAtivosCount}
                onStatus={(value) => {
                  trigger("vibrate");
                  setFiltroStatus(value);
                  if (value !== "todos") setMostrarConcluidas(false);
                }}
                onPeriod={(value) => {
                  trigger("vibrate");
                  setFiltroPeriodo(value);
                }}
                onAppointment={(value) => {
                  trigger("vibrate");
                  setFiltroCompromisso(value);
                }}
                onShowResolved={(value) => {
                  trigger("vibrate");
                  setMostrarConcluidas(value);
                }}
                onReset={limparFiltros}
              />
            </div>
          </div>
          {isHoje && filtroStatus !== "todos" && (
            <div
              role="status"
              className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-ice/20 bg-ice/[0.045] px-3 py-1.5 text-xs"
            >
              <span className="min-w-0 text-ink-secondary">
                Exibindo{" "}
                {filtroStatus === "tomados"
                  ? "doses tomadas"
                  : filtroStatus === "ignorados"
                  ? "doses ignoradas"
                  : "doses pendentes"}
                {focusDoseTime ? ` · ${focusDoseTime}` : ""}
              </span>
              <button
                type="button"
                onClick={limparFiltros}
                className="shrink-0 font-semibold text-ice underline underline-offset-2"
              >
                Ver tudo
              </button>
            </div>
          )}
          {retroReviewMode ? (
            <TodayRetroReviewPanel
              summary={retroReviewSummary}
              onNext={irParaProximoPendenteRetroativo}
              onClose={sairRevisaoRetroativa}
            />
          ) : null}

          {/* P14 R4: lote usa a mesma elegibilidade, autoridade e confirmação do Hoje. */}
          {isHoje && dosesElegiveisLote.length > 1 && (
            <TodayBatchAction
              count={dosesElegiveisLote.length}
              processing={processandoTodos}
              disabled={Boolean(processandoTodos || processandoDoseId)}
              onClick={() => void handleTomarTodos()}
            />
          )}

          {/* =======================================================
              TIMELINE / DOSES
          ======================================================= */}
          <span
            id="hoje-doses"
            className="block scroll-mt-24"
            aria-hidden="true"
          />
          <DosePremiumCenter view={premiumView} history={premiumHistory} selection={premiumSelection}
            onSelectionChange={selection=>setPremiumNavigation({context:doseIdentityContext,selection})}
            brain={{...premiumBrain,stockCoverage:premiumStockCoverage,loading:!historyReady||medicationsLoading,periodLabel:premiumBrain.start?`${premiumBrain.start.split('-').reverse().join('/')} – ${hoje.split('-').reverse().join('/')}`:'Últimos 30 dias'}}
            busy={Boolean(processandoTodos||processandoDoseId||isHistoricalProcessing)}
            onOpenMedication={row=>{if(row.user_id!==premiumScope.user_id||row.person_id!==premiumScope.person_id||!premiumHistoryMedications.some(m=>m.id===row.medication_id)){showToast("Medicamento não disponível no contexto atual.","info");return;}trigger("vibrate");navigateWithReturnM120(`/saude/medicamentos/detalhes?id=${encodeURIComponent(row.medication_id)}`,premiumSelection);}}
            onNewRecord={()=>{setQuickDoseSlot(null);setIsDoseModalOpen(true);trigger("vibrate");}}
            onReview={row=>{if(row.user_id!==premiumScope.user_id||row.person_id!==premiumScope.person_id){showToast("O contexto mudou. Confira novamente.","info");return;}
              if(row.log_id&&["confirmed","ignored","conflict"].includes(row.status)){if(premiumHistoryMedications.some(m=>m.id===row.medication_id))navigateWithReturnM120(`/saude/medicamentos/historico?id=${encodeURIComponent(row.medication_id)}&month=${encodeURIComponent(row.day.slice(0,7))}&day=${encodeURIComponent(row.day)}`,premiumSelection);return;}
              const target=resolvePremiumItem(row);if(!target){showToast("O contexto mudou. Confira novamente.","info");return;}trigger("vibrate");setPremiumReview({context:doseIdentityContext,key:row.key});}}
            onReviewGroup={rows=>{const items=rows.map(resolvePremiumItem);if(items.some(item=>!item)){showToast("As doses mudaram. Confira novamente.","info");return;}handleRevisarHorario(items as DoseItemExt[]);}}
            onRetry={()=>{if(typeof window!=="undefined")window.dispatchEvent(new Event("sync:process"));}}/>
          {/* Original clinical timeline remains available, including detailed cards and filters. */}
          <ClinicalDisclosure key={JSON.stringify([doseIdentityContext,hasFiltrosAtivos,focusDoseTime,retroReviewMode])} id="hoje-detalhes-doses" title="Detalhes da linha do tempo" description="Filtros, registros clínicos e ações individuais completas" icon={<ListChecks size={19}/>} defaultOpen={Boolean(hasFiltrosAtivos||focusDoseTime||retroReviewMode)}>
          {isHoje && filtroStatus === "todos" && concluidasOcultas > 0 && (
            <p className="px-1 text-xs text-ink-muted">
              {formatPtBrQuantity(
                concluidasOcultas,
                "registro recolhido",
                "registros recolhidos"
              )}{" "}
              na visualização padrão. Eles continuam disponíveis em Filtros.
            </p>
          )}

          {dosesParaExibir.length === 0 && concluidasOcultas > 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.045] px-3 py-3">
              <p className="text-xs text-ink-secondary">
                Não há outros horários visíveis neste filtro.
              </p>
              <button
                type="button"
                onClick={() => setMostrarConcluidas(true)}
                className="min-h-11 shrink-0 rounded-lg border border-emerald-400/25 px-3 text-[11px] font-semibold text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
              >
                Ver registros
              </button>
            </div>
          ) : dosesParaExibir.length === 0 ? (
            <EmptyState
              icon={Pill}
              title={emptyTimelineCopy.title}
              description={emptyTimelineCopy.description}
              actionLabel={
                !hasFiltrosAtivos && isHoje && !retroReviewMode
                  ? "Registrar Dose Avulsa"
                  : undefined
              }
              onAction={
                !hasFiltrosAtivos && isHoje && !retroReviewMode
                  ? () => {
                      trigger("vibrate");
                      setIsDoseModalOpen(true);
                    }
                  : undefined
              }
              iconClassName="border-ice/20 bg-ice/10 text-ice"
            />
          ) : (
            dosesAgrupadas.map(([key, grupo]) => {
              const total = grupo.total;
              const concluidos = grupo.completed;
              const progresso = grupo.progress;

              return (
                <div key={key} className="vault-deferred-lg space-y-2">
                  <TodayDoseGroupHeading
                    icon={grupo.icon}
                    label={grupo.label}
                    description={grupo.sub}
                    total={total}
                    completed={concluidos}
                    progress={progresso}
                  />

                  <div className="space-y-2">
                    <DoseScheduleGroups
                      items={grupo.items}
                      focusTime={focusDoseTime}
                      renderItem={(item) => (
                        <TodayDoseTimelineCard
                          item={item}
                          scope={doseCardScope}
                        />
                      )}
                      disabled={Boolean(processandoTodos || processandoDoseId)}
                      onTakeGroup={isHoje ? handleRevisarHorario : undefined}
                    />
                  </div>
                </div>
              );
            })
          )}

          </ClinicalDisclosure>
          {/* M150 P5 P5 — depois das doses, orientacoes e agenda reais permanecem acessiveis. */}
          {/* M150 P5 P5: comando do Brain permanece visivel, mas depois da fila de doses. */}
          {/* Conteudo de evidencias separado da autoridade do registro de doses. */}

          {/* R4: Brain na area de prioridades, fora dos grupos cronologicos de doses. */}
          <section id="hoje-brain" aria-label="Prioridades do dia" className="scroll-mt-24 space-y-2">
            {isHoje && !retroReviewMode ? (
              <TodayActionCenter
                pendingDoses={totalPendentes}
                showDoseShortcut={false}
                command={healthIntelligence.careCommand}
                brainFallback={
                  !brainPulse.isLoading && brainPulse.brief.primary
                    ? {
                        insightId: brainPulse.brief.primary.insight_id,
                        headline: brainPulse.brief.headline,
                        title: brainPulse.brief.primary.snapshot.titulo,
                        supporting: brainPulse.brief.supporting,
                      }
                    : null
                }
                onOpenDoses={() => {
                  trigger("vibrate");
                  document
                    .getElementById("hoje-doses")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                onNavigate={(href) => navigateWithReturnM120(href)}
              />
            ) : null}
          </section>
          {/* P4: três atalhos de um toque, sem segunda autoridade de doses ou dados. */}
          {isHoje && !retroReviewMode && (
            <nav
              className="grid min-w-0 grid-cols-3 gap-1.5"
              aria-label="Acessos rápidos do cuidado"
            >
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  document
                    .getElementById("hoje-diario")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-violet-400/20 bg-violet-400/[.055] px-1.5 text-[11px] font-semibold text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
              >
                <Activity size={14} className="shrink-0" aria-hidden="true" />
                <span className="break-words">Check-in</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  navigateWithReturnM120("/saude/central-m144");
                }}
                className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-ice/20 bg-ice/[.055] px-1.5 text-[11px] font-semibold text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
              >
                <Calendar size={14} className="shrink-0" aria-hidden="true" />
                <span className="break-words">Ocorrências</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  navigateWithReturnM120("/saude/plano-seguranca");
                }}
                className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-400/[.055] px-1.5 text-[11px] font-semibold text-rose-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
              >
                <AlertTriangle
                  size={14}
                  className="shrink-0"
                  aria-hidden="true"
                />
                <span className="break-words">Plano pessoal</span>
              </button>
            </nav>
          )}
          {isHoje && !retroReviewMode ? (
            <TodayAgendaOverview
              overview={agendaOverview}
              overdueWithdrawals={overdueWithdrawalsForToday}
              remindersCount={remindersDoDia.length}
              onJump={(section) => {
                trigger("vibrate");
                document
                  .getElementById(section)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              onJumpDose={(time) => {
                trigger("vibrate");
                router.push(
                  `/hoje?focus=doses&status=pendentes&time=${encodeURIComponent(
                    time
                  )}`
                );
              }}
              onOpenReminder={(href) => {
                trigger("vibrate");
                navigateWithReturnM120(href);
              }}
              onOpenWithdrawals={() => {
                trigger("vibrate");
                navigateWithReturnM120("/saude/retiradas");
              }}
            />
          ) : null}
          {/* VAULT_V321_DAILY_FOCUS: acesso preservado; Brain apos doses na P5 P5. */}
          {/* P14 R4: a ausência de horário é qualidade de cadastro, não dose esquecida. */}
          {isHoje && medicamentosSemHorario.length > 0 && (
            <TodayUnscheduledRoutine
              medications={medicamentosSemHorario}
              onEdit={(medicationId) => {
                trigger("vibrate");
                navigateWithReturnM120(
                  `/saude/medicamentos/editar?id=${encodeURIComponent(
                    medicationId
                  )}`
                );
              }}
            />
          )}

          {/* M40 — Orientação complementar discreta; nunca substitui o Brain nem os registros. */}
          {assistenteDiario && (
            <details
              className={`group rounded-xl border px-3 py-2 ${
                assistenteDiario.urgencia === "alta"
                  ? "border-coral/30 bg-coral/[0.04]"
                  : assistenteDiario.urgencia === "media"
                  ? "border-amber-400/25 bg-amber-400/[0.035]"
                  : "border-surface-border/45 bg-surface/40"
              }`}
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
                <Activity
                  size={16}
                  className={
                    assistenteDiario.urgencia === "alta"
                      ? "text-coral"
                      : "text-ice"
                  }
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-primary">
                  {assistenteDiario.titulo}
                </span>
                <span className="text-[10px] text-ink-muted">Dica</span>
                <ChevronRight
                  size={15}
                  className="shrink-0 text-ink-muted transition-transform group-open:rotate-90 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-2 pl-6 text-xs leading-relaxed text-ink-secondary">
                {assistenteDiario.mensagem}
              </p>
            </details>
          )}

          {/* V225 R2 — One-tap journal: reuses existing person-owned repository and sync queue. */}
          {isHoje && !retroReviewMode && (
            <section
              id="hoje-diario"
              aria-label="Diário rápido do dia"
              className="group scroll-mt-24 rounded-[20px] border border-violet-400/15 bg-gradient-to-r from-violet-400/[.065] to-surface px-3 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-primary">
                    Como você está se sentindo?
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    Registro opcional de humor e sintomas.
                  </p>
                </div>
                <Calendar size={15} className="shrink-0 text-violet-300" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    router.push(
                      "/saude/registros/novo?preset=humor&return_to=%2Fhoje"
                    );
                  }}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-violet-400/20 bg-violet-400/[.07] px-2 text-xs font-semibold text-violet-200"
                >
                  <SmilePlus size={15} aria-hidden="true" />
                  Registrar humor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    router.push(
                      "/saude/registros/novo?preset=sintoma&return_to=%2Fhoje"
                    );
                  }}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-sky-300/25 bg-sky-300/[.06] px-2 text-xs font-semibold text-sky-200"
                >
                  <Activity size={15} aria-hidden="true" />
                  Registrar sintoma
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  router.push("/saude/registros/relatorio?return_to=%2Fhoje")
                }
                className="mt-2 min-h-10 w-full rounded-xl text-xs font-semibold text-violet-300"
              >
                Ver resumo longitudinal
              </button>
            </section>
          )}

          {/* VAULT_M144_TODAY_ENTRY — destinos de ocorrência e segurança já estão na grade, quatro eixos continuam acessíveis */}
          {isHoje && !retroReviewMode ? (
            <button
              type="button"
              aria-label="Check-in dos quatro eixos"
              onClick={() => navigateWithReturnM120("/saude/visual-studio")}
              className="mb-2 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-sky-300/20 bg-sky-300/[.04] px-3 text-left text-xs font-semibold text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Activity size={15} aria-hidden="true" />
                Check-in dos 4 eixos{" "}
                <span className="text-[11px] font-normal text-ink-muted">
                  (opcional)
                </span>
              </span>
              <ChevronRight size={15} className="shrink-0" aria-hidden="true" />
            </button>
          ) : null}
          {/* V33: visíveis somente hoje e sem revisão retroativa; ausência não gera cartões vazios. */}
          {isHoje && !retroReviewMode ? (
            <div data-vault-v33="today-care-context" className="space-y-2">
              <TreatmentContinuityA4 context="today" maxItems={2} />
              <RehabM5AgendaStrip />
              <HospitalizationA5AgendaStrip day={dataSelecionada} />
              <VaccinationAccessA8 context="today" />
              <A9ReadOnlySummary360 context="today" />
              <A10ContextLink context="today" compact />
            </div>
          ) : null}
          <span
            id="hoje-agenda"
            className="block scroll-mt-24"
            aria-hidden="true"
          />

          {remindersForaDaAgenda.length > 0 && (
            <TodayRemindersPanel
              reminders={remindersForaDaAgenda}
              onNavigate={(href) => navigateWithReturnM120(href)}
            />
          )}

          {/* =======================================================
              CUIDADOS DO DIA
          ======================================================= */}

          {renovacoesReceitaHoje.length > 0 && (
            <div className="vault-deferred space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <Pill size={16} className="text-emerald-400" />

                  <div>
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">
                      Cuidados do dia
                    </h2>

                    <p className="mt-0.5 text-xs text-ink-faint">
                      Eventos planejados dos seus medicamentos
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-ice/20 bg-ice/10 px-2.5 py-1 font-mono text-[9px] font-bold text-ice">
                  {renovacoesReceitaHoje.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {renovacoesReceitaHoje.map((evento) => (
                  <TodayPrescriptionRenewalCard
                    key={evento.id}
                    event={evento}
                    onOpen={() => {
                      trigger("vibrate");
                      router.push(evento.actionHref);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* =======================================================
              COMPROMISSOS
          ======================================================= */}
          {compromissosFiltrados.length > 0 && (
            <div
              id="hoje-compromissos"
              className="vault-deferred scroll-mt-24 space-y-3"
            >
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-coral" />

                  <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">
                    Compromissos do Dia
                  </h2>
                </div>

                <span className="rounded-full bg-coral/10 px-2 py-1 font-mono text-xs font-bold text-coral">
                  {compromissosFiltrados.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {(mostrarTodosCompromissos
                  ? compromissosFiltrados
                  : compromissosFiltrados.slice(0, 3)
                ).map((item: any) => (
                  <TodayAppointmentCard
                    key={item.id}
                    item={item}
                    medication={
                      item.tipo === "retirada"
                        ? medicamentosById.get(item.medicamento_id)
                        : undefined
                    }
                    today={hoje}
                    dayLabel={dataSelecionadaLabel}
                    overview={supplyOverview}
                    onOpen={() => navegarCompromisso(item)}
                  />
                ))}
                {compromissosFiltrados.length > 3 && (
                  <button
                    type="button"
                    aria-expanded={mostrarTodosCompromissos}
                    onClick={() =>
                      setMostrarTodosCompromissos((value) => !value)
                    }
                    className="min-h-11 w-full rounded-xl border border-surface-border/60 bg-surface-raised/40 px-3 text-xs font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
                  >
                    {mostrarTodosCompromissos
                      ? "Recolher compromissos"
                      : `Ver mais ${
                          compromissosFiltrados.length - 3
                        } compromisso${
                          compromissosFiltrados.length - 3 === 1 ? "" : "s"
                        }`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* VAULT_V321_MONTH_DEFERRED: keep original owner and onNavigate; mount only when requested. */}
          {user?.id && activePersonId && isHoje && (
            <ClinicalDisclosure
              id="hoje-mes"
              title="Mês · doses e planejamento"
              description="Consultar o mês sob demanda · sem antecipar tomadas futuras"
              icon={<Calendar size={18} />}
            >
              <DoseMonthOverview
                userId={user.id}
                personId={activePersonId}
                today={hoje}
                context={healthIntelligence.context}
                onNavigate={(href) => router.push(href)}
              />
            </ClinicalDisclosure>
          )}
          {isHoje && (
            <section className="pt-2" aria-label="Versículo do dia">
              <VersiculoDia />
            </section>
          )}
        </section>

        {/* =========================================================
            V46 — CONFIRMAÇÃO TEMPORAL DO LOTE
        ========================================================= */}
        <BottomSheet isOpen={isBatchTimeModalOpen&&batchFrozen?.context===doseIdentityContext} onClose={()=>{if(!processandoTodos)setIsBatchTimeModalOpen(false);}} title={batchResults?.context===doseIdentityContext?'Resultado da revisão':'Revisar doses selecionadas'} height="auto">
          <div className="space-y-3">
          {batchResults?.context===doseIdentityContext?<><p role="status" className="text-sm text-ink-muted">A confirmação local não equivale à confirmação da nuvem. Revise cada resultado antes de repetir uma ação.</p>{batchResults.rows.map(row=><section key={row.key} className="rounded-xl border border-surface-border p-3"><p className="break-words text-sm font-semibold">{row.name} · {row.hour}</p><p className={`mt-1 text-xs ${row.state==='saved'?'text-emerald-300':'text-amber-300'}`}>{row.state==='saved'?'Registro local confirmado':row.state==='excluded'?'Excluída':'Não confirmada'} · {row.detail}</p></section>)}<button type="button" onClick={()=>setIsBatchTimeModalOpen(false)} className="min-h-12 w-full rounded-xl bg-surface-raised text-sm font-bold">Voltar à Central</button></>:<>
          <p className="text-sm text-ink-muted">{batchReadyEntries.length} elegíveis para conferência, {frozenEntries.length-batchReadyEntries.length} excluídas. Informe o que aconteceu; a quantidade prevista não é uma confirmação.</p>
          {frozenEntries.map(entry=>{const {item,key,review,excluded,knownEmpty}=entry;const selected=!batchDeselected.includes(key);const known=readDoseUnit(review.expected??{});let stockLabel:string|null=null;try{const dose=reviewUnitFor(entry),med=medicamentosById.get(item.medicamentoId!);if(med){const stock=observedStockContext(med,{...premiumScope,medicationId:item.medicamentoId!});const debit=comparableDebit(dose.quantity,dose.unit,stock,observedStockConversion(med,stock));stockLabel=debit!==null&&stock.balance!==null&&stock.basis?`Movimentação prevista: ${debit.toLocaleString('pt-BR')} ${med.estoque_unidade_medida}. Sujeita à conferência transacional.`:'Movimentação não comprovada; o escritor revalidará.';}}catch{}return <section key={key} className="space-y-3 rounded-2xl border border-surface-border bg-surface-raised/60 p-3"><div className="flex min-w-0 items-center gap-3"><MedicationFormatIcon formato={item.formato} cores={item.cores} size={32}/><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{item.medicamentoNome}</p><p className="break-words text-xs text-ink-muted">{item.dosagem||'Concentração não informada'}</p></div><span className="shrink-0 text-sm text-ice">{item.horario}</span></div>{(!excluded||knownEmpty)&&<button type="button" aria-pressed={selected} disabled={processandoTodos} onClick={()=>setBatchDeselected(old=>old.includes(key)?old.filter(x=>x!==key):[...old,key])} className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${selected?'border-emerald-300/40 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-muted'}`}>{selected?<CheckCircle2 size={18} aria-hidden="true"/>:<Circle size={18} aria-hidden="true"/>}{knownEmpty?(selected?'Selecionada para declarar não tomada':'Selecionar para declarar não tomada'):(selected?'Incluída na revisão':'Incluir nesta revisão')}</button>}{excluded?<><p className="text-xs text-amber-300">Excluída · {excluded}</p><button type="button" disabled={processandoTodos} className="min-h-11 w-full rounded-xl border border-surface-border text-sm font-semibold" onClick={()=>{setIsBatchTimeModalOpen(false);openIndividualReview(item);}}>Revisar individualmente</button></>:!selected?<p className="text-xs text-ink-muted">Excluída por você; nenhum registro será alterado.</p>:<><label className="block text-xs text-ink-muted">Quantidade realmente administrada<input inputMode="decimal" value={batchQuantities[key]??''} disabled={processandoTodos} onChange={e=>setBatchQuantities(old=>({...old,[key]:e.target.value}))} placeholder={review.suggestedQuantity?.toLocaleString('pt-BR')||'Informe a quantidade'} className="mt-1 min-h-11 w-full rounded-xl border border-surface-border bg-void px-3 text-sm text-ink-primary"/></label>{known.state==='known'?<p className="text-xs text-emerald-300">Unidade registrada: {describeHistoricalDose({...known.fields,quantidade:1})}</p>:<DoseHistoricalUnitField value={batchUnits[key]??{code:null,customLabel:''}} disabled={processandoTodos} onChange={draft=>setBatchUnits(old=>({...old,[key]:draft}))}/>}<p className="text-xs text-ink-muted">{stockLabel||'Informe quantidade e unidade para conferir o impacto no saldo.'}</p></>}</section>;})}
          {frozenEntries.some(entry=>entry.knownEmpty)&&<section className="space-y-2 rounded-xl border border-amber-300/30 bg-amber-300/5 p-3"><p className="text-sm font-semibold text-amber-200">{stockNonTakeEntries.length} ocorrência(s) selecionada(s) com saldo registrado zerado.</p><p className="text-xs text-ink-muted">Saldo zerado não confirma que a dose não foi tomada. Selecione somente as que realmente não tomou por falta de estoque.</p><button type="button" disabled={processandoTodos||!stockNonTakeEntries.length} onClick={()=>void confirmarDosesNaoTomadasPorEstoque()} className="min-h-12 w-full rounded-xl border border-amber-300/30 text-sm font-bold text-amber-200 disabled:opacity-40">Confirmar que não tomei as selecionadas por falta de estoque</button></section>}
          <button type="button" disabled={processandoTodos||!batchReviewReady} onClick={()=>void executarTomadaEmLote('scheduled')} className="min-h-12 w-full rounded-xl border border-emerald-300/30 bg-emerald-300/10 text-sm font-bold text-emerald-200 disabled:opacity-40">Tomei nos horários previstos</button>
          <button type="button" disabled={processandoTodos||!batchReviewReady} onClick={()=>void executarTomadaEmLote('now')} className="min-h-12 w-full rounded-xl border border-ice/30 bg-ice/10 text-sm font-bold text-ice disabled:opacity-40">Tomei agora</button>
          <label className="block text-sm text-ink-muted">Outra data e horário reais<HealthDateTimePicker value={batchCustomTime} onChange={setBatchCustomTime} max={`${hoje}T23:59`} disabled={processandoTodos}/></label>
          <button type="button" disabled={processandoTodos||!batchReviewReady||!batchCustomTime} onClick={()=>void executarTomadaEmLote('custom')} className="min-h-12 w-full rounded-xl border border-surface-border text-sm font-bold disabled:opacity-40">Registrar neste horário</button>
          {processandoTodos&&<p role="status" className="text-sm text-ice">Conferindo e registrando uma dose de cada vez…</p>}
          </>}
          </div>
        </BottomSheet>

        {/* =========================================================
            MODAL — DOSE AVULSA
        ========================================================= */}
        <BottomSheet isOpen={Boolean(historicalDoseReviewItem&&historicalReviewScope===doseIdentityContext)} onClose={fecharRevisaoHistorica} title="Revisão histórica" height="auto">
          {historicalDoseReviewItem&&historicalReviewScope===doseIdentityContext&&<div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                    <Clock size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ice">
                      Revisão histórica
                    </p>

                    <h3 className="mt-1 truncate text-base font-bold text-ink-primary">
                      {historicalDoseReviewItem.medicamentoNome}
                    </h3>

                    <p className="mt-1 text-xs text-ink-muted">
                      {dataSelecionadaDescricao} •{" "}
                      {historicalDoseReviewItem.horario}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={fecharRevisaoHistorica}
                    disabled={isHistoricalProcessing}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted disabled:opacity-40"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-ice/15 bg-ice/5 p-3">
                  <p className="text-xs leading-relaxed text-ink-muted">
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
                      <CheckCircle2 size={15} className="text-emerald-400" />
                    ) : (
                      <XCircle size={15} className="text-ink-muted" />
                    )}

                    <p className="text-xs text-ink-muted">
                      Estado atual:{" "}
                      <strong className="text-ink-primary">
                        {historicalDoseReviewItem.tomada
                          ? "tomada"
                          : "não tomada"}
                      </strong>
                    </p>
                  </div>
                )}

                {(()=>{const row=historicalExpected;const known=readDoseUnit(row??{});return <div className="mt-3 rounded-xl border border-surface-border bg-surface p-3">{known.state==='known'?<p className="text-sm text-ink-primary">{describeHistoricalDose(row!)}</p>:known.state==='invalid'?<p className="text-sm text-amber-300">Unidade requer revisão.</p>:<DoseHistoricalUnitField value={historicalUnitDraft??{code:null,customLabel:''}} disabled={isHistoricalProcessing} onChange={setHistoricalUnitDraft}/>}</div>;})()}
                <label className="block text-xs text-ink-muted">Quantidade realmente administrada<input inputMode="decimal" value={historicalQuantity} onChange={e=>setHistoricalQuantity(e.target.value)} disabled={isHistoricalProcessing} placeholder={historicalExpected?.quantidade?.toLocaleString('pt-BR')||'Informe a quantidade'} className="mt-1 min-h-11 w-full rounded-xl border border-surface-border bg-void px-3 text-sm text-ink-primary"/></label>
                {!historicalCustomMode ? (
                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      disabled={isHistoricalProcessing}
                      onClick={() => executarRevisaoHistorica("scheduled")}
                      className="flex w-full items-center justify-between rounded-2xl bg-emerald-400 px-4 py-3.5 text-left text-void transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      <div>
                        <p className="text-xs font-bold">Tomei no horário</p>

                        <p className="mt-0.5 text-xs opacity-70">
                          Registrar às {historicalDoseReviewItem.horario}
                        </p>
                      </div>

                      <CheckCircle2 size={18} />
                    </button>

                    <button
                      type="button"
                      disabled={isHistoricalProcessing}
                      onClick={() => setHistoricalCustomMode(true)}
                      className="flex w-full items-center justify-between rounded-2xl border border-ice/25 bg-ice/10 px-4 py-3.5 text-left text-ice transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      <div>
                        <p className="text-xs font-bold">
                          Tomei em outro horário
                        </p>

                        <p className="mt-0.5 text-xs text-ink-muted">
                          Informar quando realmente tomou
                        </p>
                      </div>

                      <Clock size={18} />
                    </button>

                    <button
                      type="button"
                      disabled={isHistoricalProcessing}
                      onClick={() => executarRevisaoHistorica("ignored")}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border bg-surface-raised px-4 py-3.5 text-left text-ink-primary transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      <div>
                        <p className="text-xs font-bold">Não tomei</p>

                        <p className="mt-0.5 text-xs text-ink-muted">
                          Confirmar ausência daquela dose
                        </p>
                      </div>

                      <XCircle size={18} className="text-ink-muted" />
                    </button>

                    <button
                      type="button"
                      disabled={isHistoricalProcessing}
                      onClick={fecharRevisaoHistorica}
                      className="w-full rounded-2xl border border-surface-border/60 px-4 py-3 text-xs font-semibold text-ink-muted transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      Não lembro
                    </button>

                    {(historicalDoseReviewItem.tomada ||
                      historicalDoseReviewItem.ignorada) && (
                      <button
                        type="button"
                        disabled={isHistoricalProcessing}
                        onClick={() => executarRevisaoHistorica("clear")}
                        className="flex w-full items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-[10px] font-semibold text-coral transition-all active:scale-[0.99] disabled:opacity-50"
                      >
                        <RotateCcw size={13} />
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

                      <HealthDateTimePicker
                        value={historicalCustomTakenAt}
                        onChange={setHistoricalCustomTakenAt}
                        max={`${hoje}T23:59`}
                        disabled={isHistoricalProcessing}
                        className="mt-2"
                      />
                    </label>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isHistoricalProcessing}
                        onClick={() => setHistoricalCustomMode(false)}
                        className="rounded-2xl border border-surface-border px-4 py-3 text-xs font-semibold text-ink-muted disabled:opacity-50"
                      >
                        Voltar
                      </button>

                      <button
                        type="button"
                        disabled={
                          isHistoricalProcessing || !historicalCustomTakenAt
                        }
                        onClick={() => executarRevisaoHistorica("custom")}
                        className="rounded-2xl bg-ice px-4 py-3 text-xs font-bold text-void disabled:opacity-50"
                      >
                        {isHistoricalProcessing
                          ? "Salvando..."
                          : "Confirmar horário"}
                      </button>
                    </div>
                  </div>
                )}

                <p className="mt-3 text-center text-xs leading-relaxed text-ink-faint">
                  “Não lembro” não cria nenhum registro e permanece fora das
                  métricas de adesão.
                </p>
              </div>}
        </BottomSheet>
        <BottomSheet isOpen={Boolean(doseCorrection&&doseCorrection.context===doseIdentityContext)} onClose={()=>{if(!correctionLock.current)setDoseCorrection(null);}} title="Conferir correção do registro" height="auto">
          {doseCorrection&&doseCorrection.context===doseIdentityContext&&<div className="space-y-3"><div className="flex items-center gap-3"><MedicationFormatIcon formato={doseCorrection.item.formato} cores={doseCorrection.item.cores} size={34}/><div className="min-w-0"><p className="break-words font-semibold">{doseCorrection.item.medicamentoNome}</p><p className="text-xs text-ink-muted">{doseCorrection.expected.data.split('-').reverse().join('/')} · {doseCorrection.expected.horario} · {describeHistoricalDose(doseCorrection.expected)}</p></div></div><p className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-3 text-sm text-amber-200">{doseCorrection.action==='cancel'?'Cancelar este agendamento sem alterar o estoque.':'A correção só será aplicada se o registro continuar idêntico ao revisado. Uma restituição exige o débito original comprovado e o mesmo ciclo de estoque.'}</p><button type="button" disabled={Boolean(processandoDoseId)} onClick={()=>void confirmDoseCorrection()} className="min-h-12 w-full rounded-xl border border-coral/40 bg-coral/10 text-sm font-semibold text-coral disabled:opacity-40">{doseCorrection.action==='cancel'?'Cancelar agendamento':'Remover este registro'}</button><button type="button" disabled={Boolean(processandoDoseId)} onClick={()=>setDoseCorrection(null)} className="min-h-11 w-full rounded-xl border border-surface-border text-sm font-semibold">Manter registro</button></div>}
        </BottomSheet>

        <BottomSheet isOpen={Boolean(premiumSelected)} onClose={()=>{if(!processandoDoseId)setPremiumReview(null);}} title="Conferir dose" height="auto">
          {premiumSelected&&<TodayDoseTimelineCard item={premiumSelected} scope={{...doseCardScope,abrirRevisaoHistorica:item=>{setPremiumReview(null);abrirRevisaoHistorica(item);}}}/>}
        </BottomSheet>
        <QuickDoseModal
          isOpen={isDoseModalOpen&&(!quickDoseSlot||quickDoseSlot.context===doseIdentityContext)}
          preselectedMedicamentoId={quickDoseSlot?.context===doseIdentityContext?quickDoseSlot.medicationId:undefined}
          initialSlot={quickDoseSlot?.context===doseIdentityContext?{day:quickDoseSlot.day,hour:quickDoseSlot.hour}:undefined}
          onClose={() => {setIsDoseModalOpen(false);setQuickDoseSlot(null);}}
          onSuccess={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("sync:process"));
            }
          }}
        />
      </main>
    </PageTransition>
  );
}

// The dormant release retains the certified legacy UX. Premium remains preserved for the gated cutover.
export default function HojePage(){const mode=useMacro02ModeR5();return mode==='premium'?<PremiumHojePage/>:mode==='legacy'?<DormantHojePage/>:<Macro02AuthorityHoldR5/>;}
