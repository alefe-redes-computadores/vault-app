// app/page.tsx
"use client";
import { selectHomeDocumentAlerts, countHomeTakenDoseLogs, selectHomeOverdueWithdrawals } from "@/lib/home/home-view-projections";
import { projectHomeDashboardAlerts } from "@/lib/home/home-dashboard-alerts";
import { selectHomeAttentionP4R3 } from "@/lib/home/home-attention-authority-p4-r3";
import { safeReturnTarget, withReturnTarget } from "@/lib/navigation/return-context";
import { formatVaultClinicalDateBR } from "@/lib/home/format-clinical-date";
import { getVaultTreatmentIcon } from "@/lib/health-profile/treatment-icon";
import { contextualWithdrawalHrefM2 } from "@/lib/careflow-m2/withdrawal-coherence";
import { CareFlowSummaryM2 } from "@/components/saude/CareFlowSummaryM2";
import { ClinicalEpisodePulseP4 } from "@/components/home/ClinicalEpisodePulseP4";
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
import { nextHomeRoutineDoseP71 } from "@/lib/home/next-routine-dose-p71";
import { routineNarrativeP7R3 } from "@/lib/home/routine-narrative-p7r3";
import { HomeActionNowCardP7R3, type HomeContextKind360 } from "@/components/home/HomeActionNowCardP7R3";
import { countHomeTodayAppointments } from "@/lib/home/appointment-metrics";
import { selectHomeDayEvents } from "@/lib/home/appointment-day-selection";
import { buildHomePendingDoseProjection } from "@/lib/home/pending-dose-projection";
import { buildHomePendingBrief } from "@/lib/home/home-pending-brief";
import { HomeQuickMetrics } from "@/components/home/HomeQuickMetrics";
import { HomeAgendaBreakdown } from "@/components/home/HomeAgendaBreakdown";
import { HomeDoseQuantityFollowUp } from "@/components/home/HomeDoseQuantityFollowUp";
import { HomeDailyHero } from "@/components/home/HomeDailyHero";
import { HomeAttentionRail } from "@/components/home/HomeAttentionRail";
import { homeAdministrativeWithdrawalAlertsP5P4, continuationWithdrawalAlreadyVisibleP5 } from "@/lib/home/home-withdrawal-single-surface-p5-p4";
import { HomeBrainEvidenceGroup } from "@/components/home/HomeBrainEvidenceGroup";
import { groupHomeBrainEvidence } from "@/lib/home/brain-evidence-groups";
import { homeAgendaCountsM147, homeAgendaBucketM147, sortHomeWithdrawalsM147, mergeExactWithdrawalAliasesM147 } from "@/lib/home/home-agenda-m147";
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

  // VAULT_M147_P1_AGENDA: hora local declarada, ordem e visibilidade sem alterar eventos.
  const retiradasAgendaM147 = useMemo(() =>
    sortHomeWithdrawalsM147(retiradasHoje, hoje, horaAtual), [retiradasHoje, hoje, horaAtual]);
  const resumoAgendaM147 = useMemo(() => homeAgendaCountsM147([
    ...consultasHoje.map(item=>({data:item.data,horario:item.horario})),
    ...cirurgiasHoje.map(item=>({data:item.data,horario:item.horario})),
    ...examesHoje.map(item=>({data:item.data,horario:item.horario})),
    ...retiradasHoje.map(item=>({data:item.data,horario:item.horario})),
  ],hoje,horaAtual),[consultasHoje,cirurgiasHoje,examesHoje,retiradasHoje,hoje,horaAtual]);

  // P7 FIX9: o mesmo ID fica em UMA superficie administrativa na Agenda.
  // A origem useRetiradas ja e restrita a user.id + activePersonId.
  const renderRetiradaAgendaP7 = (retirada: (typeof retiradasAgendaM147)[number]) => {
    const medicamentoLigado = medicamentosById.get(retirada.medicamento_id);
    const medicamentoNome = (retirada.medicamento_nome || medicamentoLigado?.nome || "").trim();
    const medicamentoFormato = String(medicamentoLigado?.formato || "").toLowerCase();
    const usaGotas = /gotas|solu[cç][aã]o|l[ií]quido|spray|col[ií]rio/.test(medicamentoFormato);
    const acquisitionKind = String(medicamentoLigado?.tipo_aquisicao || "").toLowerCase();
    const isSusWithdrawal = acquisitionKind === "sus";
    const isPurchasedWithdrawal = acquisitionKind === "comprado";
    const linkedTreatments = tratamentos.filter((treatment: any) =>
      Array.isArray(medicamentoLigado?.tratamento_ids) && medicamentoLigado.tratamento_ids.includes(treatment.id)
    );
    const treatmentAccent = linkedTreatments.length === 1 ? linkedTreatments[0]?.cor || "#8B5CF6" : null;
    const treatmentLabel = linkedTreatments.length === 1
      ? linkedTreatments[0]?.nome
      : linkedTreatments.length > 1 ? `${linkedTreatments.length} tratamentos` : null;
    const bucket = homeAgendaBucketM147(retirada, hoje, horaAtual);
    const dias = withdrawalDaysOverdue(retirada.data, hoje);
    const status = bucket === "pendente_anterior"
      ? `Pendente há ${dias} dia${dias === 1 ? "" : "s"}`
      : bucket === "horario_passado" ? "Horário previsto já passou"
      : bucket === "ainda_hoje" ? "Prevista para hoje"
      : "Sem horário confirmado";
    return <button type="button" key={retirada.id}
      aria-label={`Conferir retirada de ${medicamentoNome || "medicamento não identificado"}. ${status}`}
      onClick={() => { trigger("vibrate"); router.push(withReturnTarget(`/saude/retiradas/detalhes?id=${retirada.id}`, "/")); }}
      data-vault-withdrawal-relational-card
      className="flex min-h-[78px] w-full items-center justify-between gap-3 rounded-[18px] border border-emerald-300/15 bg-gradient-to-r from-emerald-300/[.045] to-surface/65 px-3 py-2.5 text-left shadow-sm transition-colors active:bg-surface-raised/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
      style={treatmentAccent ? { borderLeftWidth: 3, borderLeftColor: treatmentAccent } : undefined}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl border ${medicamentoLigado ? "border-surface-border/40 bg-surface-raised/45" : "border-emerald-300/15 bg-emerald-300/[.065] text-emerald-200"}`} aria-hidden="true">
        {medicamentoLigado ? <MedicationFormatIcon formato={medicamentoLigado.formato} cores={medicamentoLigado.cores} size={27}/> : <Pill size={17}/>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink-primary">{medicamentoNome || "Medicamento não identificado"}</span>
        <span className="mt-0.5 block truncate text-[11px] text-ink-muted">{isSusWithdrawal ? "Retirada programada no SUS" : isPurchasedWithdrawal ? "Retirada em farmácia / compra" : "Retirada programada"}</span>
        {treatmentLabel && <span data-vault-withdrawal-treatment className="mt-1 inline-flex max-w-full truncate rounded-md border px-1.5 py-0.5 text-[9px] font-semibold" style={treatmentAccent ? { borderColor: `${treatmentAccent}35`, backgroundColor: `${treatmentAccent}12`, color: treatmentAccent } : undefined}>{treatmentLabel}</span>}
        <span className={`mt-1 block truncate text-[10px] font-semibold ${bucket === "pendente_anterior" || bucket === "horario_passado" ? "text-coral" : "text-emerald-300"}`}>{status} · {formatVaultClinicalDateBR(retirada.data)}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1"><span className="font-mono text-xs font-bold text-emerald-300">{retirada.horario || "Revisar"}</span><ChevronRight size={14} className="text-emerald-300" aria-hidden="true"/></span>
    </button>;
  };

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
  const proximaDoseContinuosP71 = useMemo(() =>
    nextHomeRoutineDoseP71(medicamentosAtivos, doseLogs || [], horaAtual),
    [medicamentosAtivos, doseLogs, horaAtual]
  );
  const contextoRotinaP71 = proximaDoseContinuosP71
    ? `${proximaDoseContinuosP71.overdue ? "Revisar horário" : "Próxima"}: ${proximaDoseContinuosP71.name} · ${proximaDoseContinuosP71.time}`
    : totalDosesPlanejadasHoje > 0 && dosesTomadasDaRotinaHoje === totalDosesPlanejadasHoje
      ? "Registros de doses contínuas concluídos hoje" : "Confira os horários e registros em Hoje";


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

  const operationalAlerts = useMemo<DashboardAlert[]>(() => {
    const base = projectHomeDashboardAlerts(healthInsights, documentInsights, {
      getLevel: mapUrgenciaToAlertLevel, getIcon: getAlertIcon, getColor: alertLevelColor,
    });
    return base.map(alert=>{
      if(alert.kind==="consulta")return {...alert,icon:<Stethoscope size={18} className="text-sky-300"/>};
      if(!["estoque","receita","sus"].includes(alert.kind))return alert;
      const evidence=healthInsights.find(item=>item.id===alert.id);
      if(!evidence?.entidadeId)return alert;
      const event=retiradas.find(row=>row.id===evidence.entidadeId && row.user_id===user?.id && row.person_id===activePersonId);
      const medId=event?.medicamento_id || (evidence.link.startsWith("/saude/medicamentos/detalhes?")?evidence.entidadeId:null);
      const med=medId ? medicamentosById.get(medId) : null;
      if(!med || med.user_id!==user?.id || med.person_id!==activePersonId)return alert;
      return {...alert,icon:<MedicationFormatIcon formato={med.formato} cores={med.cores} size={26}/>};
    });
  },[healthInsights,documentInsights,retiradas,medicamentosById,user?.id,activePersonId]);

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

  const rawPrimaryCareCommandM2 =
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

  const safePrimaryCareCommandM2=useMemo(()=>contextualWithdrawalHrefM2(rawPrimaryCareCommandM2,medicamentosAtivos,retiradas),[rawPrimaryCareCommandM2,medicamentosAtivos,retiradas]);
  // Mantém a única autoridade usada pela Home, porém já reconciliada.
  const primaryCareCommand = safePrimaryCareCommandM2;

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
                ? `${retiradasAtrasadas.length} retirada${retiradasAtrasadas.length === 1 ? "" : "s"} vencida${retiradasAtrasadas.length === 1 ? "" : "s"} continua${retiradasAtrasadas.length === 1 ? "" : "m"} aberta${retiradasAtrasadas.length === 1 ? "" : "s"} até você concluir, reagendar ou encerrar.`
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

  // UI360 R4: kind is visual presentation of a canonical decision / real destination.
  // Do not derive from medicine names, infer a medical condition or write records.
  const homeContextKind360: HomeContextKind360 = dosesPendentesAtrasadas.length > 0 ? "dose"
    : /\/saude\/careflow(?:\/|[?#]|$)/.test(resumoContextual.href) ? "careflow"
    : /(?:documento\s+SUS|processo p[úu]blico)/i.test(`${resumoContextual.title} ${resumoContextual.description}`) ? "documento"
    : /\/saude\/(?:fornecimento|documentos)(?:\/|[?#]|$)/.test(resumoContextual.href) ? "documento"
    : /\/(?:exames)(?:\/|[?#]|$)/.test(resumoContextual.href) ? "exame"
    : /\/consultas(?:\/|[?#]|$)/.test(resumoContextual.href) ? "consulta"
    : /\/(?:nova-receita|renovacao)(?:\/|[?#]|$)/.test(resumoContextual.href) ? "receita"
    : /\/retiradas(?:\/|[?#]|$)/.test(resumoContextual.href) ? "retirada"
    : /\/(?:estoque|contagem)(?:\/|[?#]|$)/.test(resumoContextual.href) ? "estoque"
    : totalCompromissosHoje > 0 && resumoContextual.href === "/hoje"
      ? consultasHoje.length > 0 && examesHoje.length === 0 && cirurgiasHoje.length === 0 ? "consulta"
        : examesHoje.length > 0 && consultasHoje.length === 0 && cirurgiasHoje.length === 0 ? "exame"
        : "agenda"
    : resumoContextual.href === "/hoje" ? "rotina" : "outro";

  const routineContextP7R3 = routineNarrativeP7R3({
    scheduled:totalDosesPlanejadasHoje, completed:dosesTomadasDaRotinaHoje,
    overdue:dosesPendentesAtrasadas.filter(item=>item.diaLabel==="Hoje" && medicamentosById.get(item.medicamentoId)?.tipo_uso==="continuo").length,
    localHour:Number(horaAtual.slice(0,2)),
  });
  // M130: a decisão principal não volta como um segundo cartão com o mesmo
  // destino. A autoridade e a fila continuam intactas; muda apenas a projeção
  // compacta da Home.
  // A38: a Agenda é a única CTA para o MESMO ID de retirada administrativa.
  // Nenhuma observação independente de receita, estoque ou segurança clínica é ocultada.
  const aliasesRetiradaM147 = useMemo(() => mergeExactWithdrawalAliasesM147(retiradasAgendaM147, operationalAlerts),
    [retiradasAgendaM147,operationalAlerts]);
  const unifiedAlerts = useMemo(
    () => homeAdministrativeWithdrawalAlertsP5P4(
      selectHomeAttentionP4R3(operationalAlerts, resumoContextual, aliasesRetiradaM147.aliasIds),
      retiradasAgendaM147
    ),
    [operationalAlerts, resumoContextual, aliasesRetiradaM147, retiradasAgendaM147]
  );
  const duplicatePrimaryWithdrawalP5 = Boolean(primaryMedicationCareOpportunity && continuationWithdrawalAlreadyVisibleP5(primaryMedicationCareOpportunity.actionHref, retiradasAgendaM147));
  // UX360 R4: evitar segunda superfície de estoque para o mesmo medicamento
  // explicitamente identificado no bloco Atenção; nunca deduzir pelo nome.
  const duplicatePrimaryStockUXR4 = Boolean(primaryMedicationCareOpportunity &&
    primaryMedicationCareOpportunity.level !== "urgent" &&
    ["stock_review","acquisition_needed"].includes(primaryMedicationCareOpportunity.careStage) &&
    unifiedAlerts.some(alert => {
      if (alert.kind !== "estoque") return false;
      try {
        const uri = new URL(alert.href, "https://vault.invalid");
        return (uri.searchParams.get("id") || uri.searchParams.get("medicamento_id")) === primaryMedicationCareOpportunity.medicamentoId;
      } catch { return false; }
    }));
  const quantityFollowUpInsight = healthIntelligence.insights.find(item => item.id.startsWith("quantidade-confirmada-")) ?? null;
  const quantityFollowUpFeedback = quantityFollowUpInsight
    ? healthIntelligence.experienceFeedback.find(item => item.insightId === quantityFollowUpInsight.id)
    : undefined;
  const quantityFollowUpChecked = quantityFollowUpFeedback?.feedback === "already_knew";
  // Mesmo ID de evidência = uma única superfície; medicamentos com títulos parecidos
  // podem representar fatos distintos e não devem ser silenciados por semelhança textual.
  const quantityAlreadyInBrain = Boolean(quantityFollowUpInsight && longitudinalHighlights.some(item =>
    item.id === quantityFollowUpInsight.id
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

  const [mostrarTodosCompromissos, setMostrarTodosCompromissos] = useState(false);

  const [
    mostrarTodosAlertas,
    setMostrarTodosAlertas,
  ] =
    useState(false);

  const hasImmediateAttentionP7 = unifiedAlerts.some(
    item => item.level === "urgente" || item.level === "vencido"
  );
  useEffect(() => {
    // A primeira prioridade continua visível no trilho; as demais sob demanda.
    setMostrarTodosAlertas(false);
  }, [activePersonId]);

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
          {/* VAULT_M144_HOME_ENTRY · M149: item integrado na grade de áreas da Home, não um botão solto. */}
          <p className="sr-only" role="note"><span className="sr-only">Home: prioridades e decisões · Hoje: horários e registros · Brain: explicações e evidências. </span>Prioridades de hoje · acessos principais · demais indicadores sob demanda.</p>


          {/* UI360 R4: evento, rotina e quatro contadores dividem uma superfície. */}
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
            <HomeActionNowCardP7R3 title={resumoContextual.title} description={resumoContextual.description}
              eyebrow={resumoContextual.eyebrow} kind={homeContextKind360}
              urgent={dosesPendentesAtrasadas.length > 0 || primaryCareCommand?.lane === "now" || primaryMedicationCareOpportunity?.level === "urgent"}
              onAction={()=>{trigger("vibrate");if(resumoContextual.href==="/?open=pending-doses")setModalPendenciasAberto(true);else router.push(safeReturnTarget(resumoContextual.href, "/hoje"));}}/>
            {/* R4: rotina sem parágrafo, sem botão avulso, com indicadores abertos. */}
            <HomeDailyHero eyebrow="Rotina de hoje" title={routineContextP7R3.title}
              description={routineContextP7R3.description} color={resumoContextual.color}
              completed={dosesTomadasDaRotinaHoje} scheduled={totalDosesPlanejadasHoje}
              progress={progressoDosesHoje}
              onOpen={() => { trigger("vibrate"); router.push("/hoje?focus=doses"); }}
              onOpenToday={() => { trigger("vibrate"); router.push("/hoje?focus=doses"); }}
              indicators={<HomeQuickMetrics
                appointments={totalCompromissosHoje} className="min-[380px]:grid-cols-4 min-w-0"
                pendingDoses={dosesPendentesAtrasadas.length} medications={medicamentosAtivos.length}
                completedDoses={dosesTomadasDaRotinaHoje}
                extrasTaken={Math.max(0, dosesTomadasHoje - dosesTomadasDaRotinaHoje)}
                onNavigate={href=>{trigger("vibrate");router.push(href);}}
                onOpenPending={()=>{trigger("vibrate");setModalPendenciasAberto(true);}}
              />}
            />
          </motion.section>



          {/* M150 P5 P5: acessos essenciais imediatamente apos o resumo da rotina. */}
          {/* M136: destino clínico mais frequente agora fica na primeira dobra. */}
          <HomeCommandCenter gastoMes={metricasFinanceiras.gastoMesAtual}
            diferencaMes={metricasFinanceiras.diff}
            totalRede={medicos.length + farmacias.length + hospitais.length + locais.length} mode="primary" />
          <CareFlowSummaryM2 />
          {/* P6 P4-A: somente um acompanhamento opcional, evidência de consulta, sem mexer em Ação Agora. */}
          <ClinicalEpisodePulseP4 />
          {/* M145: Compromissos reais primeiro; análises e cards de evidência vêm depois. */}
          {/* ===================================================
              COMPROMISSOS DE HOJE
          =================================================== */}

          {consultasHoje.length + cirurgiasHoje.length + examesHoje.length + retiradasAgendaM147.length >
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
                      {"Agenda de hoje"}
                    </h2>
                  </div>

                  <p className="mt-0.5 text-xs text-ink-muted">
                    "Sua agenda de saúde do dia"
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
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

                {retiradasAgendaM147.length > 0 && (
                  <div className="space-y-1.5" aria-label="Retiradas pendentes na agenda">
                    <p className="px-1 text-[11px] font-semibold text-ink-secondary">Retiradas pendentes · {retiradasAgendaM147.length}</p>
                    {retiradasAgendaM147.slice(0, 3).map(renderRetiradaAgendaP7)}
                    {retiradasAgendaM147.length > 3 && (
                      <button type="button" onClick={() => { trigger("vibrate"); router.push("/saude/retiradas?return_to=%2F"); }} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-surface-border/50 bg-surface-raised/35 px-3 text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
                        Ver mais {retiradasAgendaM147.length - 3} na Agenda <ChevronRight size={14} aria-hidden="true"/>
                      </button>
                    )}
                  </div>
                )}

                {consultasHoje.length + cirurgiasHoje.length + examesHoje.length > 3 && (
                  <button type="button" aria-expanded={mostrarTodosCompromissos} onClick={() => setMostrarTodosCompromissos(value => !value)} className="min-h-11 w-full rounded-xl border border-surface-border/60 bg-surface-raised/40 px-3 text-xs font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
                    {mostrarTodosCompromissos ? "Recolher compromissos" : `Ver mais ${consultasHoje.length + cirurgiasHoje.length + examesHoje.length - 3} compromisso${consultasHoje.length + cirurgiasHoje.length + examesHoje.length - 3 === 1 ? "" : "s"}`}
                  </button>
                )}

              </div>
            </motion.section>
          )}

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
              <HomeAttentionRail alerts={unifiedAlerts} description={hasImmediateAttentionP7 ? "Há registros prioritários para conferir" : "O que merece prioridade agora"} expanded={mostrarTodosAlertas}
                onToggle={() => { trigger("vibrate"); setMostrarTodosAlertas(previous => !previous); }}
                renderAlert={alert => <AlertRow alert={{...alert, href: withReturnTarget(alert.href, "/")}} />} />
            </motion.section>
          )}

          {/* VAULT_BRAIN_V5_4_R2_HOME_INTELLIGENCE_RAIL */}
                    {/* ===================================================
              INTELIGÊNCIA DE SAÚDE — PULSO + RAIL PRIORIZADO
          =================================================== */}

          {(longitudinalHighlights.length > 0 ||
            Boolean(!quantityAlreadyInBrain && quantityFollowUpInsight) ||
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

                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-secondary" aria-label="Leitura humana do VAULT Brain">
                    {longitudinalHighlights[0]?.titulo || (brainV5Pulse.journeys.some(item=>item.requires_attention) ? "Há etapas registradas para revisar no cuidado" : "Observações do seu histórico disponíveis para revisão")}
                  </p>
                  <span className="sr-only">
                    {healthIntelligence.maturity.totalRecords} registros analisados
                    {brainV5Pulse.journeys.some(item => item.requires_attention) ? ` · ${brainV5Pulse.journeys.filter(item => item.requires_attention).length} decisões em atenção` : brainV5Pulse.brief.total > 0 ? ` · ${brainV5Pulse.brief.total} decisões acompanhadas` : ""}
                    {brainV5Pulse.counters.new > 0 ? ` · ${brainV5Pulse.counters.new} novo${brainV5Pulse.counters.new === 1 ? "" : "s"}` : ""}
                  </span>
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

          {/* M93: o mesmo insight de quantidade realmente confirmada, com consulta da pessoa ativa.
              Não gera nova interpretação nem substitui alertas de segurança. */}
          {!quantityAlreadyInBrain && quantityFollowUpInsight && !quantityFollowUpChecked && (
            <details className="group overflow-hidden rounded-[18px] border border-amber-300/20 bg-gradient-to-br from-amber-400/[.045] to-surface" aria-label="Acompanhamento contextual do Brain">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-300/10 text-amber-200"><AlertCircle size={15}/></span>
                <span className="min-w-0 flex-1"><strong className="block text-xs font-bold text-ink-primary">Brain · acompanhamento do registro</strong><span className="block truncate text-[11px] text-amber-200">{quantityFollowUpInsight.titulo}</span></span>
                <span className="shrink-0 rounded-lg bg-amber-300/10 px-2 py-1 text-[10px] font-semibold text-amber-200">{quantityFollowUpInsight.gravidadeSeguranca === "critica" ? "Prioritário" : "Conferir"}</span>
                <ChevronRight size={14} className="shrink-0 text-ink-muted transition-transform group-open:rotate-90"/>
              </summary>
              <div className="border-t border-amber-300/10 p-2">
                <HomeDoseQuantityFollowUp
                  insight={quantityFollowUpInsight}
                  feedback={quantityFollowUpFeedback}
                  nextConsultationDate={consultas.filter(item => item.status === "agendada" && item.data && item.data >= hoje).map(item => item.data!).sort()[0] ?? null}
                  onMarkChecked={async insight => { await healthIntelligence.sendExperienceFeedback(insight, "already_knew"); }}
                  onNavigate={href => { trigger("vibrate"); router.push(href); }}
                />
                <button type="button" onClick={()=>{trigger("vibrate");router.push("/inteligencia/alertas");}} className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-violet-300/20 bg-violet-300/[.055] px-3 text-xs font-semibold text-violet-200"><Activity size={14}/>Explorar observações no VAULT Brain</button>
              </div>
            </details>
          )}

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

          {primaryMedicationCareOpportunity && !duplicatePrimaryWithdrawalP5 && !duplicatePrimaryStockUXR4 && (
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
                <div className="mt-2" data-vault-home-optional-p6="continuity">
                  <div id="home-continuity-other">
                    <MedicationCareOpportunityQueue
                      items={medicationCareOpportunities.slice(1).filter(item => !continuationWithdrawalAlreadyVisibleP5(item.actionHref, retiradasAgendaM147))}
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
                className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2"
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

          <div id="home-organizacao" data-vault-home-optional-p6="organization" className="scroll-mt-24" role="region" aria-label="Acompanhamento de saúde">
            <HomeCommandCenter
              gastoMes={metricasFinanceiras.gastoMesAtual}
              diferencaMes={metricasFinanceiras.diff}
              totalRede={medicos.length + farmacias.length + hospitais.length + locais.length}
              mode="secondary"
              onOpenOccurrences={() => { trigger("vibrate"); router.push("/saude/central-m144?return_to=%2F"); }}
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
