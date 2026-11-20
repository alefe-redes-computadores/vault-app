// app/saude/medicamentos/page.tsx
"use client";
import { formatQuantidade } from "@/lib/health-intelligence/medication-detail-presenters";
import { OblongPillIcon, ScoredOblongPillIcon } from "@/lib/medications/form-presentation";

import { indexScheduledWithdrawalsByOwner, medicationWithdrawalKey, medicationAccessAction, activeScheduledWithdrawalP5P4 } from "@/lib/medication-access-action";
import { classifyWithdrawalLinkP71B } from "@/lib/medications/withdrawal-link-p71b";
import { withdrawalConflictForMedicationM2 } from "@/lib/careflow-m2/withdrawal-coherence";
import {withdrawalEvidenceForMedicationP6, withdrawalNavigationEvidenceP6} from "@/lib/health-intelligence/withdrawal-evidence-p6";
import { medicationBrainActionWithVerifiedWithdrawalM150P4 } from "@/lib/health-intelligence/medication-withdrawal-brain-authority-m150-p4";
import { useRetiradas } from "@/hooks/useRetiradas";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { MedicationProvenanceLineM150P3 } from "@/components/saude/MedicationProvenanceLineM150P3";
import { medicationListDisplayNameM150P3 } from "@/lib/medications/medication-list-provenance-m150-p3";
import { reconcileMedicationP6,medicationListEvidenceLabelP6 } from "@/lib/health-intelligence/pharmalens-reconciliation-p6";
import { medicationCardActionLayoutM150P3 } from "@/lib/medications/medication-card-action-layout-m150-p3";
import { createMedicationDayComparatorM149 } from "@/lib/health-intelligence/medication-day-sort-m149";
import { medicationStockLabelM149 } from "@/lib/health-intelligence/medication-stock-display-m149";
import { useLocalDay } from "@/hooks/useLocalDay";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";
import { readManufacturerMetadata } from "@/lib/medications/manufacturer-experience";
import { isPrescriptionOnly, isFutureAcquisition, renewalEventDate } from "@/lib/health-supply/renewal-event";
import { decideMedicationCarePath, medicationCarePresentation, medicationCareStageIsPlanning, medicationCareStageNeedsAttention } from "@/lib/health-intelligence/medication-care-decision";
import { indexMedicationRenewals } from "@/lib/health-intelligence/medication-workspace";
import { ownedMedicationRenewals } from "@/lib/health-intelligence/medication-owner-events";
import { hasConfirmedControlledRegime } from "@/lib/medication-intelligence/controlled-filter";
// A origem completa continua em supplyRoute e no detalhamento de evidencias.
import { MedicationOperationalStrip } from "@/components/saude/MedicationOperationalStrip";
import { MedicationRestockAction } from "@/components/saude/MedicationRestockAction";
import { isRestockDestination, medicationRestockHref, medicationStockCountHref } from "@/lib/health-intelligence/medication-restock-navigation";
import { getClinicalStockSnapshot } from "@/lib/health-intelligence/clinical-stock";
import { createLocalSearchIndex, filterLocalSearchIndex } from "@/lib/local-search";
import {
  useEffect,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  useRouter,
} from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";

import {
  AlertTriangle,
  Calendar,
  Clock3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Ellipsis,
  ShoppingBag,
  Factory,
  FileCheck2,
  Repeat2,
  MinusCircle,
  Circle,
  Droplet,
  Eye,
  EyeOff,
  History,
  Pill,
  Search,
  SlidersHorizontal,
  Info,
  StickyNote,
  Syringe,
  X,
  Zap,
} from "lucide-react";


import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/db";
import { indexMedicationTreatmentsP7, safeTreatmentColorP7 } from "@/lib/health-intelligence/medication-treatment-links-p7";

import {
  useDoseLogs,
} from "@/hooks/useDoseLogs";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  CardListSkeleton,
} from "@/components/loading/CardListSkeleton";

import {
  EmptyState,
} from "@/components/EmptyState";

import {
  LazyQuickDoseModal as QuickDoseModal,
} from "@/components/saude/LazyQuickDoseModal";

import {
  processarListaMedicamentos,
} from "@/lib/health-insights";

import type {
  ProcessedMed,
} from "@/lib/health-insights";

import {
  ListCard,
  ListPageHeader,
  ListSearch,
} from "@/components/list";

import {
  useMedicationCatalogProfiles,
} from "@/hooks/useMedicationRegulatoryProfiles";
import { medicationIgnoredStatus } from "@/lib/medication-availability";
import { medicationStockUnitReview } from "@/lib/health-intelligence/medication-presentation-review";
import { normalizeMedicationText } from "@/lib/medication-intelligence/normalize";
import { getMedicationRegulatorySurface, medicationRegulatoryShortLabel } from "@/lib/medication-regulatory-visual";
import { medicationPersonalAccent, medicationPersonalAccentStyle } from "@/lib/medications/list-personal-accent";
import type { MedicationRegulatoryVisual } from "@/lib/medication-regulatory-visual";
import { useSharedHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { ClinicalCollectionGroup } from "@/components/saude/ClinicalCollectionGroup";
import { MedicationListGroupNavigation } from "@/components/saude/MedicationWorkspaceNavigation";
import { ClinicalDisclosure } from "@/components/saude/ClinicalDisclosure";
import { MedicationPortfolioOverview } from "@/components/saude/MedicationPortfolioOverview";
import { MedicationFilterBar } from "@/components/saude/MedicationFilterBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { MedicationActionsSheetR4, type MedicationActionsR4 } from "@/components/saude/MedicationActionsSheetR4";
import { MedicationSheet360R3, type Medication360Value, type Medication360Tab } from "@/components/saude/MedicationSheet360R3";
import { resolveMedicationKnowledgeM153P4 } from "@/lib/medication-intelligence/knowledge-resolver-m153p4";
import { getVaultTreatmentIcon } from "@/lib/health-profile/treatment-icon";
import { MedicationContextSheetP7R3, type MedicationContextP7R3 } from "@/components/saude/MedicationContextSheetP7R3";
import { MedicationListActiveFilter } from "@/components/saude/MedicationListActiveFilter";
import { medicationListPresentation } from "@/lib/health-intelligence/medication-list-presentation";
import { resolveMedicationCardAction } from "@/lib/health-intelligence/medication-card-action";
import { medicationListAttentionReasonsM143, medicationNextPendingClockM143 } from "@/lib/health-intelligence/medication-list-attention-m143";
import { createMedicationPendingPriorityP5 } from "@/lib/health-intelligence/medication-pending-priority-p5";

type MedicationListFilter =
  | "todos"
  | "atencao"
  | "continuos"
  | "temporarios"
  | "sos"
  | "controlados"
  | "encerrados";

// ============================================================
// HELPERS
// ============================================================

function getMedicamentoIconComponent(
  formato?: string
) {
  const normalized =
    (
      formato ||
      ""
    )
      .toLowerCase()
      .trim();

  // M92: formatos oblongos têm silhuetas próprias, sem reinterpretar dose.
  if (normalized.includes("oblongo_sulcado")) return ScoredOblongPillIcon;
  if (normalized.includes("oblongo")) return OblongPillIcon;
  if (
    normalized.includes(
      "gota"
    )
  ) {
    return Droplet;
  }

  if (
    normalized.includes(
      "injecao"
    ) ||
    normalized.includes(
      "injeção"
    )
  ) {
    return Syringe;
  }

  if (
    normalized.includes(
      "adesivo"
    )
  ) {
    return StickyNote;
  }

  if (
    normalized.includes(
      "partido"
    ) ||
    normalized.includes(
      "comprimido"
    ) ||
    normalized.includes(
      "inteiro"
    )
  ) {
    return Circle;
  }

  return Pill;
}

// ============================================================
// PAGE
// ============================================================

export default function MedicamentosListPage() {
  const healthIntelligence = useSharedHealthIntelligence();
  const { user: treatmentOwner } = useAuth();
  const { retiradas, isLoading: withdrawalsLoading } = useRetiradas();
  const { renovacoes = [], isLoading: renewalsLoading } = useRenovacoes();
  // P14 R5: conta + pessoa + medicamento — nunca por ID isolado.
  const scheduledWithdrawals = useMemo(() => indexScheduledWithdrawalsByOwner(retiradas), [retiradas]);
  const renewalsByMedication = useMemo(() => indexMedicationRenewals(renovacoes), [renovacoes]);
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    medicamentosIncluindoDescontinuados:
      medicamentosTodas,
    isLoading: medicationsLoading,
  } =
    useMedicamentos();

  const {
    activePersonId,
  } =
    useActivePersonId();
  // MACRO2: somente documentos da pessoa ativa; não procurar receita pelo nome.
  const prescriptionDocumentsP6=useLiveQuery(async()=>{
    if(!treatmentOwner?.id||!activePersonId)return [];
    return db.documents.where('[user_id+person_id]').equals([treatmentOwner.id,activePersonId]).filter(d=>d.type==='receita').toArray();
  },[treatmentOwner?.id,activePersonId]);

  // M153 P7 R2: consulta reativa de tratamentos explicitamente vinculados ao titular.
  const linkedTreatmentsP7 = useLiveQuery(async () => {
    if (!treatmentOwner?.id || !activePersonId) return [];
    return db.tratamentos.where("[user_id+person_id]").equals([treatmentOwner.id, activePersonId]).toArray();
  }, [treatmentOwner?.id, activePersonId], []);
  const treatmentsByMedication = useMemo(() => indexMedicationTreatmentsP7({
    userId: treatmentOwner?.id,
    personId: activePersonId,
    medications: medicamentosTodas || [],
    treatments: linkedTreatmentsP7 || [],
  }), [treatmentOwner?.id, activePersonId, medicamentosTodas, linkedTreatmentsP7]);

  // M149: virada de dia e retorno do APK sincronizam o dia exibido.
  const hojeString = useLocalDay();

  const {
    doseLogs,
    isLoading: doseLogsLoading,
  } =
    useDoseLogs(
      hojeString
    );

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState(
      ""
    );
  const deferredSearchQuery=useDeferredValue(searchQuery);

  /*
   * MEDICATION_LIST_VISUAL_V25_3
   *
   * A busca permanece recolhida enquanto não estiver em uso.
   * Isso preserva espaço sem remover a funcionalidade.
   */
  const [
    isSearchOpen,
    setIsSearchOpen,
  ] =
    useState(
      false
    );

  const searchInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  useEffect(
    () => {
      if (
        !isSearchOpen
      ) {
        return;
      }

      const frame =
        window.requestAnimationFrame(
          () => {
            searchInputRef.current?.focus();
          }
        );

      return () =>
        window.cancelAnimationFrame(
          frame
        );
    },
    [
      isSearchOpen,
    ]
  );

  // VAULT_MEDICATION_EXPERIENCE_V97
  const [medicationFilter, setMedicationFilter] =
    useState<MedicationListFilter>("todos");
  // M80: view preference changes presentation only; the same filtered rows and
  // clinical actions remain authoritative in both modes.
  const [unifiedList, setUnifiedList] = useState(true);
  // M132: preferencia exclusivamente visual, sem mudar dados, filtros ou dose.
  const [compactCards, setCompactCards] = useState(true);
  const [visualFilterSheetOpenR1, setVisualFilterSheetOpenR1] = useState(false);
  useEffect(() => {
    try { setCompactCards(window.localStorage.getItem("@vault:meds_density_v1") !== "comfortable"); }
    catch { /* preferencia opcional; privacidade/armazenamento bloqueado nao quebra a lista */ }
  }, []);
  const chooseCardDensity = (next: boolean) => {
    trigger("vibrate");
    setCompactCards(next);
    try { window.localStorage.setItem("@vault:meds_density_v1", next ? "compact" : "comfortable"); }
    catch { /* somente apresentacao, sem impacto clinico */ }
  };
  // M83: a lista única é incremental para evitar montar centenas de cards
  // no Android. Busca e filtros continuam operando no conjunto completo.
  const [unifiedVisibleCount, setUnifiedVisibleCount] = useState(24);

  const showDescontinuados =
    medicationFilter === "encerrados";

  const [
    quickDoseMedId,
    setQuickDoseMedId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [secondaryActionSheetR4, setSecondaryActionSheetR4] = useState<MedicationActionsR4 | null>(null);
  const [medicationSheet360, setMedicationSheet360] = useState<Medication360Value | null>(null);
  const [medicationContextP7R3, setMedicationContextP7R3] = useState<MedicationContextP7R3 | null>(null);
  const [selectedRegulatory, setSelectedRegulatory] =
    useState<MedicationRegulatoryVisual | null>(null);
  const [selectedRegulatoryAuthority, setSelectedRegulatoryAuthority] =
    useState<"confirmed" | "compatible" | "possible_divergence" | "unvalidated">("unvalidated");

  // ==========================================================
  // PREFERÊNCIA DE FILTRO
  // ==========================================================
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("@vault:meds_filter_v97") as MedicationListFilter | null;
    if (saved && ["todos","atencao","continuos","temporarios","sos","controlados","encerrados"].includes(saved)) {
      setMedicationFilter(saved);
    }
  }, []);

  const selectMedicationFilter = (next: MedicationListFilter) => {
    trigger("vibrate");
    setMedicationFilter(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("@vault:meds_filter_v97", next);
    }
  };

  // ==========================================================
  // PERSON SCOPE
  // ==========================================================

  const medicamentosDaPessoa =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return (
          medicamentosTodas ||
          []
        ).filter(
          (
            medicamento
          ) =>
            medicamento.person_id ===
            activePersonId
        );
      },
      [
        medicamentosTodas,
        activePersonId,
      ]
    );

  const {
    regulatoryProfiles,
    catalogIdentities,
  } = useMedicationCatalogProfiles(
    medicamentosDaPessoa
  );

  // ==========================================================
  // PROCESSAMENTO BASE
  //
  // Esta lista não depende de busca ou de "mostrar suspensos".
  // É a fonte correta para progresso e lembrete diário.
  // ==========================================================

  const listaBase =
    useMemo(
      () =>
        processarListaMedicamentos(
          medicamentosDaPessoa,
          doseLogs ||
            []
        ),
      [
        medicamentosDaPessoa,
        doseLogs,
      ]
    );

  const careDecisionsByMedication = useMemo(() => {
    const decisions = new Map<string, ReturnType<typeof decideMedicationCarePath>>();
    for (const item of listaBase) {
      const id = item.med.id;
      if (!id || item.isSuspenso) continue;
      decisions.set(id, decideMedicationCarePath({
        medication: item.med,
        renewals: ownedMedicationRenewals(renewalsByMedication.get(id) ?? [], item.med),
        withdrawal: scheduledWithdrawals.get(medicationWithdrawalKey(item.med) ?? "") ?? null,
        today: hojeString,
        needsPrescription: Boolean(item.insight?.deveRenovar && item.insight.motivo === "receita"),
        needsStock: item.isEstoqueZerado || item.isEstoqueCritico,
      }));
    }
    return decisions;
  }, [listaBase, renewalsByMedication, scheduledWithdrawals, hojeString]);
  const withdrawalEvidenceByMedicationP6 = useMemo(() => new Map(
    listaBase.filter(item=>Boolean(item.med.id)).map(item=>[item.med.id!,withdrawalEvidenceForMedicationP6(item.med,retiradas)] as const)
  ),[listaBase,retiradas]);
  const brainCareByMedication = useMemo(() => new Map(
    (healthIntelligence.careCommand?.plan.items ?? []).filter(item => item.medicationId).map(item => [item.medicationId!, item])
  ), [healthIntelligence.careCommand]);
  const supplyRouteByMedication = useMemo(() => new Map(
    (healthIntelligence.careCommand?.readiness.items ?? []).map(item => [item.medicationId, item.route])
  ), [healthIntelligence.careCommand]);

  // ==========================================================
  // LISTA VISÍVEL
  // ==========================================================

  const medicationSearchIndex=useMemo(()=>createLocalSearchIndex(listaBase,item=>{
    const identity=catalogIdentities[item.med.id||""];
    return [item.med.nome,item.med.medico,item.med.dosagem,identity?.canonicalName,identity?.activeIngredient,...(identity?.activeIngredients||[])];
  }),[listaBase,catalogIdentities]);
  const medicationSearchMatches=useMemo(()=>new Set(filterLocalSearchIndex(medicationSearchIndex,deferredSearchQuery)),[medicationSearchIndex,deferredSearchQuery]);

  const [attentionClockM143,setAttentionClockM143]=useState("");
  useEffect(()=>{
    const update=()=>setAttentionClockM143(new Date().toTimeString().slice(0,5));
    update();
    const handle=window.setInterval(update,60000);
    return ()=>window.clearInterval(handle);
  },[]);
  const attentionReasonsM143=useMemo(()=>{
    const map=new Map<string,string[]>();
    for(const item of listaBase){
      if(!item.med.id)continue;
      map.set(item.med.id,medicationListAttentionReasonsM143(
        item,careDecisionsByMedication.get(item.med.id)?.stage??"stable",
        brainCareByMedication.get(item.med.id)?.lane,
        doseLogs||[],attentionClockM143
      ));
    }
    return map;
  },[listaBase,careDecisionsByMedication,brainCareByMedication,doseLogs,attentionClockM143]);

  const listaProcessada =
    useMemo(() => {
      const processados = listaBase.filter((item) => {
        if (!medicationSearchMatches.has(item)) return false;
        const medId = item.med.id || "";
        const regulatoryProfile = regulatoryProfiles[medId];

        if (medicationFilter === "encerrados") return item.isSuspenso;
        if (item.isSuspenso) return false;

        if (medicationFilter === "atencao") {
          const brainLane=brainCareByMedication.get(medId)?.lane;
          const decisionNeedsAttention=medicationCareStageNeedsAttention(careDecisionsByMedication.get(medId)?.stage??"stable");
          const reasons=attentionReasonsM143.get(medId)??[];
          const executiveReason=(brainLane === "now" || brainLane === "prepare") &&
            reasons.includes("Prioridade atual do Brain");
          return decisionNeedsAttention || executiveReason ||
            reasons.some(reason=>reason!=="Prioridade atual do Brain");
        }

        if (medicationFilter === "continuos") {
          return !item.isSOS && item.med.tipo_uso === "continuo";
        }

        if (medicationFilter === "temporarios") return item.med.tipo_uso === "temporario";

        if (medicationFilter === "sos") return item.isSOS;

        if (medicationFilter === "controlados") {
          // P14 R5: receita comum verificada não significa medicamento controlado.
          return hasConfirmedControlledRegime(regulatoryProfile);
        }

        return true;
      });

      return processados;
    }, [
      listaBase,
      medicationFilter,
      medicationSearchMatches,
      regulatoryProfiles,
      attentionReasonsM143,
    ]);

  // M149: para uso por período, a hora vem dos slots planejados do dia ativo.
  const compareDayM149 = useMemo(() => createMedicationDayComparatorM149(doseLogs || []), [doseLogs]);
  const pendingPriorityP5 = useMemo(() => createMedicationPendingPriorityP5(doseLogs || []), [doseLogs]);
  const listaCronologica = useMemo(() => [...listaProcessada].sort((a,b) => pendingPriorityP5(a,b) || compareDayM149(a,b)), [listaProcessada, compareDayM149, pendingPriorityP5]);

  // ==========================================================
  // PROGRESSO DIÁRIO REAL POR DOSES
  // ==========================================================

  const statsProgresso =
    useMemo(
      () => {
        let total = 0;
        let completados = 0;
        let ignoradas = 0;
        let ativos = 0;

        // V197: uma única passagem alimenta resumo e cabeçalho da lista.
        for (const item of listaBase) {
          if (!item.isSuspenso) ativos += 1;
          if (item.isSOS || item.isSuspenso) continue;

          total += item.dosesEsperadasHoje;
          completados += Math.min(item.dosesTomadasHoje, item.dosesEsperadasHoje);
          ignoradas += Math.min(
            item.dosesIgnoradasHoje,
            Math.max(0, item.dosesEsperadasHoje - item.dosesTomadasHoje),
          );
        }

        return {
          ativos,
          total,
          completados,
          ignoradas,
          pendentes:
            Math.max(
              0,
              total -
                completados - ignoradas
            ),
        };
      },
      [
        listaBase,
      ]
    );

  // ==========================================================
  // ==========================================================
  // AVISO DE DOSES
  //
  // O progresso já comunica as doses pendentes na própria
  // página, evitando um toast automático redundante.
  // ==========================================================

  // AGRUPAMENTO
  // ==========================================================

  const {
    medsPrioridade,
    medsPendentesHoje,
    medsPlanejados,
    medsEmDia,
    medsSOS,
    medsSuspensos,
  } =
    useMemo(
      () => {
        const pendentesHoje: ProcessedMed[] = [];
        const prioridade:
          ProcessedMed[] = [];

        const emDia:
          ProcessedMed[] = [];

        const planejados:
          ProcessedMed[] = [];

        const sos:
          ProcessedMed[] = [];

        const suspensos:
          ProcessedMed[] = [];

        listaProcessada.forEach(
          (
            item
          ) => {
            if (
              item.isSuspenso
            ) {
              suspensos.push(
                item
              );

              return;
            }

            if (
              item.isSOS
            ) {
              sos.push(
                item
              );

              return;
            }

            // M153 P5: pendência programada vem antes de concluídos e não é paginada.
            // A classificação depende do dia selecionado e dos registros, nunca da bula.
            if (item.dosesPendentesHoje > 0) {
              pendentesHoje.push(item);
              return;
            }

            // M146: a mesma regra executiva alimenta tanto o filtro como o agrupamento.
            const medId = item.med.id || "";
            const brainLane = brainCareByMedication.get(medId)?.lane;
            const evidenceP6=withdrawalEvidenceByMedicationP6.get(medId);
            const brainHrefP6=brainCareByMedication.get(medId)?.href;
            const staleClosedBrainP6=Boolean(evidenceP6&&brainHrefP6&&evidenceP6.active.length===0&&withdrawalNavigationEvidenceP6(brainHrefP6,evidenceP6).kind==="completed");
            const decisionNeedsAttention = medicationCareStageNeedsAttention(careDecisionsByMedication.get(medId)?.stage ?? "stable");
            const reasons = attentionReasonsM143.get(medId) ?? [];
            const executiveReason = !staleClosedBrainP6 && (brainLane === "now" || brainLane === "prepare") &&
              reasons.includes("Prioridade atual do Brain");
            const precisaAcao = decisionNeedsAttention || executiveReason ||
              reasons.some(reason => reason !== "Prioridade atual do Brain");

            if (precisaAcao) {
              prioridade.push(
                item
              );

              return;
            }

            if ((brainCareByMedication.get(item.med.id || "")?.lane === "discuss" && !staleClosedBrainP6) || medicationCareStageIsPlanning(careDecisionsByMedication.get(item.med.id || "")?.stage ?? "stable")) {
              planejados.push(item);
              return;
            }

            emDia.push(
              item
            );
          }
        );

        prioridade.sort(
          (a, b) => {
            const score =
              (item: ProcessedMed) =>
                item.isEstoqueZerado
                  ? 0
                  : item.insight
                        .urgencia ===
                      "alta"
                    ? 1
                    : item.isEstoqueCritico
                      ? 2
                      : item.dosesPendentesHoje >
                          0
                        ? 3
                        : 4;

            const byPriority =
              score(a) -
              score(b);

            if (byPriority !== 0) {
              return byPriority;
            }

            return compareDayM149(a,b);
          }
        );

        pendentesHoje.sort((a,b) => pendingPriorityP5(a,b) || compareDayM149(a,b));
        emDia.sort(compareDayM149);

        planejados.sort(compareDayM149);

        sos.sort(compareDayM149);
        suspensos.sort(compareDayM149);

        return {
          medsPrioridade:
            prioridade,
          medsPendentesHoje: pendentesHoje,

          medsEmDia:
            emDia,

          medsPlanejados:
            planejados,

          medsSOS:
            sos,

          medsSuspensos:
            suspensos,
        };
      },
      [
        listaProcessada,
        attentionReasonsM143,
        careDecisionsByMedication,
        brainCareByMedication,
        withdrawalEvidenceByMedicationP6,
        compareDayM149,
        pendingPriorityP5,
      ]
    );

  // ==========================================================
  // HANDLERS
  // ==========================================================

  // ==========================================================
  // CARD
  // ==========================================================

  const humanizeStockText =
    (
      text:
        string
    ) =>
      text
        .replace(
          /(\d+(?:[.,]\d+)?)\s+comprimido\(s\)/gi,
          (
            _match,
            value
          ) =>
            `${value} ${
              Number(
                String(
                  value
                ).replace(
                  ",",
                  "."
                )
              ) === 1
                ? "comprimido"
                : "comprimidos"
            }`
        )
        .replace(
          /(\d+(?:[.,]\d+)?)\s+gota\(s\)/gi,
          (
            _match,
            value
          ) =>
            `${value} ${
              Number(
                String(
                  value
                ).replace(
                  ",",
                  "."
                )
              ) === 1
                ? "gota"
                : "gotas"
            }`
        )
        .replace(
          /(\d+(?:[.,]\d+)?)\s+cápsula\(s\)/gi,
          (
            _match,
            value
          ) =>
            `${value} ${
              Number(
                String(
                  value
                ).replace(
                  ",",
                  "."
                )
              ) === 1
                ? "cápsula"
                : "cápsulas"
            }`
        );

  const renderCard =
    (
      item:
        ProcessedMed
    ) => {
      const {
        med,
        isSOS,
        isSuspenso,
        horarioTomado,
        dosesEsperadasHoje,
        dosesTomadasHoje,
        dosesIgnoradasHoje,
        dosesPendentesHoje,
        quantidadeTomadaHoje,
        insight,
        receita,
        textoDose,
        doseUnidade,
        textoEstoquePrincipal,
        textoEstoqueSecundario,
        isEstoqueZerado,
        isEstoqueCritico,
      } =
        item;
      const cardTreatments = med.id ? (treatmentsByMedication.get(med.id) || []) : [];
      // R4: tratamento individual com ícone e cor canônicos; sem resumo duplicado.
      const medicationKnowledge360 = resolveMedicationKnowledgeM153P4(med);
      const openMedicationContextP7R3 = (kind: "regime" | "manufacturer" | "origin" | "dose" | "treatment") => {
        const origin = med.tipo_aquisicao === "sus" ? "SUS (declarado no cadastro)" : med.tipo_aquisicao === "comprado" ? "Comprado (declarado no cadastro)" : med.tipo_aquisicao === "gratuito" ? "Gratuito (declarado no cadastro)" : "Origem não informada";
        const schedules = Array.isArray(med.estoque_horarios) ? med.estoque_horarios.filter(hour=>/^([01]\d|2[0-3]):[0-5]\d$/.test(hour)) : [];
        const entries: Record<typeof kind, MedicationContextP7R3> = {
          regime: {title:"Regime e tratamento", description:`${med.nome} · cadastro da pessoa ativa`, details:[`Regime: ${isSOS ? "SOS / eventual" : isTemporary ? "Por período" : med.tipo_uso === "continuo" ? "Contínuo" : "Não informado"}`,cardTreatments.length ? `Tratamentos vinculados: ${cardTreatments.map(t=>t.nome).join(" · ")}` : "Tratamento vinculado: não informado", "O regime cadastrado não comprova dose tomada nem data de término."]},
          manufacturer:{title:"Fabricante e referência",description:`${med.nome} · referências disponíveis`,details:[`Etiqueta declarada: ${med.laboratorio_etiqueta || "Não informada"}`,`Último fabricante registrado em aquisição: ${latestManufacturer || "Não informado"}`,"Etiqueta e fabricante de uma aquisição são fontes distintas. Lote só é comprovado com registro/documento." ]},
          origin:{title:"Obtenção e fornecimento",description:`${med.nome} · rota registrada`,details:[origin,`Última aquisição vinculada: ${latestAcquisition?.data_aquisicao || "Não informada"}`,"Origem cadastrada ou retirada planejada não confirma recebimento nem altera saldo." ]},
          dose:{title:"Posologia e horários",description:`${med.nome} · programação cadastrada`,details:[`Dose cadastrada: ${textoDose || "Não informada"}`,schedules.length?`Horários cadastrados: ${schedules.join(" · ")}`:"Horários: não informados", "Horário previsto não equivale a tomada confirmada." ]},
          treatment:{title:"Tratamentos vinculados",description:`${med.nome} · vínculos explícitos`,details:cardTreatments.length ? cardTreatments.map(t=>t.nome) : ["Nenhum tratamento explicitamente vinculado"]},
        };
        // R3: preserva o contexto de descricao P7 sem abrir outra gaveta.
        void entries[kind];
        openMedicationSheet360(kind === "dose" || kind === "regime" ? "rotina" : kind === "treatment" ? "ficha" : kind === "origin" ? "estoque" : "ficha");
      };
      const isTemporary = med.tipo_uso === "temporario";
      // M147: status administrativo não autoriza CTA primário de uso.
      const isSuspendedSOSM147 = isSOS && med.status === "descontinuado";
      const stockSnapshot = getClinicalStockSnapshot(med);
      const stockUnknown = stockSnapshot.state === "unknown";
      const stockNegative = stockSnapshot.state === "negative";
      const stockEmpty = stockSnapshot.state === "empty" || stockNegative;
      const stockReview = medicationStockUnitReview(med);

      if (
        !med.id
      ) {
        return null;
      }

      const formatoBanco =
        med.formato
          ?.toLowerCase()
          .trim() ||
        "comprimido";

      const SelectedFormatIcon =
        getMedicamentoIconComponent(
          formatoBanco
        );

      const isCustomIcon =
        [
          "comprimido",
          "partido",
          "capsula",
          "cápsula",
          "inteiro",
          "oblongo",
        ].some(
          (
            value
          ) =>
            formatoBanco.includes(
              value
            )
        );

      const cor1 =
        med.cores &&
        med.cores.length >
          0
          ? med.cores[
              0
            ]
          : "#60A5FA";

      const hasTwoColors =
        Boolean(
          med.cores &&
          med.cores.length >
            1 &&
          isCustomIcon
        );

      const fillValue =
        hasTwoColors
          ? `url(#grad-${med.id})`
          : isCustomIcon
            ? cor1
            : "none";

      const strokeValue =
        isCustomIcon
          ? "none"
          : cor1;

      /*
       * VAULT_REGULATORY_IDENTITY_V59
       *
       * Identidade principal do medicamento = classificação regulatória.
       * Tratamento permanece como contexto clínico secundário.
       * SOS, estoque, rotina e renovação continuam estados operacionais
       * independentes e nunca substituem a identidade regulatória.
       */
      const regulatoryProfile =
        regulatoryProfiles[med.id];

      const catalogIdentity =
        catalogIdentities[med.id];
      const reconciliationP6=reconcileMedicationP6({medication:med,documents:prescriptionDocumentsP6||[],
        renewals:renewalsByMedication.get(med.id||'')||[],userId:treatmentOwner?.id||'',personId:activePersonId||'',regulatory:regulatoryProfile});
      const prescriptionIdentityP6=medicationListEvidenceLabelP6(reconciliationP6,regulatoryProfile);
      const prescriptionReview360 = medicationKnowledge360.conflicts.some(f => f.kind === "prescription_type") && regulatoryProfile?.verified === true && catalogIdentity?.authorityState === "confirmed";

      const activeIngredients =
        catalogIdentity?.activeIngredients?.length
          ? catalogIdentity.activeIngredients
          : catalogIdentity?.activeIngredient
            ? [catalogIdentity.activeIngredient]
            : [];

      const activeIngredient =
        activeIngredients.join(" + ");

      // M148 P3: when name == active ingredient this is STILL verified identity.
      // Do not hide clonazepam or any generic-name ingredient.
      const showActiveIngredient = activeIngredients.length > 0;

      const regulatorySurface =
        getMedicationRegulatorySurface(
          regulatoryProfile,
          receita?.corBorda
        );

      const regulatoryBorderColor =
        regulatorySurface.rail;
      const personalAccent = medicationPersonalAccent(med);

      const regulatoryMeaning =
        regulatoryProfile
          ? `${regulatoryProfile.label}: ${regulatoryProfile.detail}${regulatoryProfile.sourceLabel ? ` Fonte: ${regulatoryProfile.sourceLabel}.` : ""}`
          : receita?.tooltip ||
            "Sem categoria regulatória especial registrada";

      const rotinaParcial =
        !isSOS &&
        !isSuspenso &&
        dosesEsperadasHoje >
          0 &&
        dosesTomadasHoje >
          0 &&
        dosesPendentesHoje >
          0;

      const rotinaResolvida =
        !isSOS &&
        !isSuspenso &&
        dosesEsperadasHoje >
          0 &&
        dosesPendentesHoje ===
          0;

      const rotinaConcluida = rotinaResolvida && dosesIgnoradasHoje === 0 && dosesTomadasHoje === dosesEsperadasHoje;

      const sosTomadoHoje =
        isSOS &&
        dosesTomadasHoje >
          0;

      const estoqueTone =
        stockUnknown ? "border-surface-border bg-surface-raised text-ink-muted" :
        isEstoqueZerado
          ? "border-coral/25 bg-coral/[0.07] text-coral"
          : isEstoqueCritico
            ? "border-amber-400/25 bg-amber-400/[0.07] text-amber-400"
            : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400";

      const estoqueStatus =
        stockUnknown ? "Estoque não informado" : stockNegative ? "Saldo divergente" :
        isEstoqueZerado
          ? "Sem estoque"
          : isEstoqueCritico
            ? "Estoque baixo"
            : "Estoque disponível";

      const todayStatusBaseM143 =
        isSuspenso
          ? {
              label:
                "Medicamento suspenso",
              detail:
                "Fora da rotina atual",
              tone:
                "text-rose-400",
            }
          : isSOS
            ? sosTomadoHoje
              ? {
                  label:
                    `${dosesTomadasHoje} registro${dosesTomadasHoje === 1 ? "" : "s"} hoje`,
                  detail:
                    quantidadeTomadaHoje >
                    0
                      ? `${formatQuantidade(
                          quantidadeTomadaHoje
                        )} ${doseUnidade}`
                      : "Uso se necessário",
                  tone:
                    "text-emerald-400",
                }
              : {
                  label:
                    "Quando necessário",
                  detail:
                    "Nenhum uso hoje",
                  tone:
                    "text-ink-muted",
                }
            : dosesIgnoradasHoje > 0
              ? medicationIgnoredStatus({ taken: dosesTomadasHoje, ignored: dosesIgnoradasHoje, pending: dosesPendentesHoje, emptyStock: isEstoqueZerado })
            : rotinaConcluida
              ? {
                  label:
                    dosesEsperadasHoje >
                    1
                      ? `${dosesTomadasHoje}/${dosesEsperadasHoje} doses concluídas`
                      : horarioTomado
                        ? `Tomado às ${horarioTomado}`
                        : "Dose concluída",
                  detail:
                    "Tudo certo hoje",
                  tone:
                    "text-emerald-400",
                }
              : rotinaParcial
                ? {
                    label:
                      `${dosesTomadasHoje}/${dosesEsperadasHoje} doses`,
                    detail:
                      horarioTomado
                        ? `Última às ${horarioTomado}`
                        : `${dosesPendentesHoje} pendente${dosesPendentesHoje === 1 ? "" : "s"}`,
                    tone:
                      "text-amber-400",
                  }
                : dosesPendentesHoje >
                    0
                  ? {
                      label:
                        `${dosesPendentesHoje} dose${dosesPendentesHoje === 1 ? "" : "s"} pendente${dosesPendentesHoje === 1 ? "" : "s"}`,
                      detail:
                        "Rotina de hoje",
                      tone:
                        "text-amber-400",
                    }
                  : {
                      label:
                        "Sem dose prevista",
                      detail:
                        "Nada pendente hoje",
                      tone:
                        "text-ink-muted",
                    };

      // M143 P3: a future unconfirmed dose is not an overdue dose.
      const nextPendingClockM143 = medicationNextPendingClockM143(med, doseLogs || [], attentionClockM143);
      const futureScheduleOnlyM143 = Boolean(nextPendingClockM143) && !isSOS && !isSuspenso &&
        dosesPendentesHoje > 0 && dosesIgnoradasHoje === 0 &&
        !(attentionReasonsM143.get(med.id || "") || []).includes("Dose do horário já vencido");
      const todayStatus = futureScheduleOnlyM143 ? {
        ...todayStatusBaseM143,
        label: rotinaParcial ? `${dosesTomadasHoje}/${dosesEsperadasHoje} doses · próxima às ${nextPendingClockM143}` : `Próxima dose às ${nextPendingClockM143}`,
        detail: "Horário futuro · não está atrasado",
        tone: "text-emerald-400",
      } : todayStatusBaseM143;

      const canQuickDose =
        !isSuspenso &&
        !isSuspendedSOSM147 &&
        (!isEstoqueZerado || isSOS);

      const quickDoseLabel =
        isSOS
          ? sosTomadoHoje
            ? "Registrar outra"
            : "Registrar uso"
          : rotinaParcial
            ? "Próxima dose"
            : rotinaResolvida
              ? null
              : "Tomar";

      const accessAction = insight
        ? medicationAccessAction(insight, med.id!, "/saude/medicamentos", {
            tipoUso: med.tipo_uso,
            tipoAquisicao: med.tipo_aquisicao,
            scheduledWithdrawalId: scheduledWithdrawals.get(medicationWithdrawalKey(med) ?? "")?.id,
          })
        : null;
      const careDecision = careDecisionsByMedication.get(med.id!) ?? decideMedicationCarePath({ medication: med, renewals: [], today: hojeString, needsPrescription: false, needsStock: false });
      const brainCareItem = brainCareByMedication.get(med.id!);
      const supplyRoute = supplyRouteByMedication.get(med.id!);
      // Fabricante é evidência da última aquisição concluída, nunca identidade fixa do princípio ativo.
      const latestAcquisition = ownedMedicationRenewals(renewalsByMedication.get(med.id!) ?? [], med)
        .filter(row => !isPrescriptionOnly(row) && !isFutureAcquisition(row, hojeString))
        .sort((a, b) => renewalEventDate(b).localeCompare(renewalEventDate(a)))[0];
      const latestManufacturer = readManufacturerMetadata(latestAcquisition?.observacoes).manufacturer;
      // A33: aquisição SUS posterior à data prevista pede conferência do vínculo,
      // não inferência de conclusão nem nova entrada fictícia de estoque.
      const currentWithdrawalP5P4 = scheduledWithdrawals.get(medicationWithdrawalKey(med) ?? "");
      const acquisitionDayP5P4 = latestAcquisition?.tipo_aquisicao === "sus" ? (latestAcquisition.data_aquisicao || "").slice(0,10) : "";
      const withdrawalNeedsLinkReviewP5P4 = Boolean(currentWithdrawalP5P4 && /^\d{4}-\d{2}-\d{2}$/.test(acquisitionDayP5P4) && acquisitionDayP5P4 >= currentWithdrawalP5P4.data);
      // V299: preservar prioridade Brain, exceto contradicao com aquisicao/retirada comprovada.
      const brainSuggestion = brainCareItem && brainCareItem.lane === "now"
        ? medicationBrainActionWithVerifiedWithdrawalM150P4(
            { href: brainCareItem.href, label: brainCareItem.title, description: brainCareItem.reason },
            scheduledWithdrawals.get(medicationWithdrawalKey(med) ?? "")?.id ?? null,
          )
        : null;
      // M2: reconciliar APENAS ações de retirada contraditórias, preservando
      // a precedência e identidade do Brain (contratos V299 / P15 / R2).
      const conflictM2 = withdrawalConflictForMedicationM2(med, retiradas);
      const reviewWithdrawalActionM2 = <T extends { href: string } | null | undefined>(candidate: T): T => {
        if (!candidate || !conflictM2 || !/\/retiradas\//.test(candidate.href)) return candidate;
        return { ...candidate,
          href: `/saude/retiradas?review=${encodeURIComponent(conflictM2.pendingId)}`,
          label: 'Conferir vínculo',
          description: 'Conflito entre retirada agendada e concluída no mesmo ciclo e dia. Conferir histórico.'
        } as T;
      };
      const brainAction = brainSuggestion
        ? reviewWithdrawalActionM2(resolveMedicationCardAction(careDecision, brainSuggestion, null))
        : null;
      const sosHasOperationalException = isEstoqueZerado || isEstoqueCritico || careDecision.stage === "withdrawal_overdue";
      // V299: Brain NOW remains first; only the non-Brain fallback is quiet for stocked SOS.
      const careAction = brainAction ?? (isSOS && !sosHasOperationalException ? null : (careDecision.stage !== "stable"
        ? reviewWithdrawalActionM2({ href: careDecision.actionHref, label: careDecision.actionLabel, description: careDecision.explanation })
        : reviewWithdrawalActionM2(accessAction)));
      const carePresentation = medicationCarePresentation(careDecision, insight?.urgencia);
      const careActionClass = brainAction && careAction === brainAction && brainCareItem?.lane === "now" ? "border-coral/25 bg-coral/[0.08] text-coral" : carePresentation.actionClass;

      // VAULT_V318_CONTEXTUAL_ACTION: visual text only; never reinterpret the care decision.
      const contextualActionLabel = careAction
        ? isRestockDestination(careAction.href, med.id!) ? "Repor estoque"
          : /\/retiradas\/detalhes(?:\?|$)/i.test(careAction.href) ? (withdrawalNeedsLinkReviewP5P4 ? "Conferir vínculo" : "Abrir retirada")
          : /\/retiradas\/nova(?:\?|$)/i.test(careAction.href) ? (/reposi/i.test(careAction.label) ? "Planejar reposição" : "Planejar retirada")
          : /retirad/i.test(careAction.href) ? careAction.label
          : /aquisi|compra/i.test(`${careAction.label} ${careAction.href}`) ? "Registrar aquisição"
          : /receita|renova/i.test(`${careAction.label} ${careAction.href}`) ? "Renovar receita"
          : /document/i.test(`${careAction.label} ${careAction.href}`) ? "Preparar documentos"
          : /conferir vínculo do processo SUS|vínculo do processo SUS/i.test(careAction.label) ? "Conferir SUS"
          : /revisar continuidade/i.test(careAction.label) ? "Revisar continuidade"
          : careAction.label.startsWith(`${med.nome}: `) ? careAction.label.slice(med.nome.length + 2)
          : careAction.label
        : "";

      // R4: rótulo de UMA palavra é apenas apresentação. O contexto completo,
      // descricao e evento canônico seguem presentes na acessibilidade e handlers.
      const compactCareActionLabelR4 =
        /\/retiradas\/nova(?:\?|$)/i.test(careAction?.href || "") ? "Planejar"
        : /\/retiradas\/detalhes(?:\?|$)/i.test(careAction?.href || "") ? (withdrawalNeedsLinkReviewP5P4 ? "Conferir" : "Retirar")
        : /^Repor estoque$/i.test(contextualActionLabel) ? "Repor"
        : /^Planejar /i.test(contextualActionLabel) ? "Planejar"
        : /^Registrar /i.test(contextualActionLabel) ? "Registrar"
        : /^Renovar /i.test(contextualActionLabel) ? "Renovar"
        : /^Preparar /i.test(contextualActionLabel) ? "Preparar"
        : /^Conferir /i.test(contextualActionLabel) ? "Conferir"
        : /^Revisar /i.test(contextualActionLabel) ? "Revisar"
        : contextualActionLabel.split(/\s+/)[0] || "Abrir";

      // P7: a closed, exact-ID, same-owner withdrawal cannot keep a green actionable CTA.
      // A conflicting acquisition alone is NOT proof of closure: it remains "Conferir vínculo".
      const linkedWithdrawalIdP7 = /\/retiradas\/detalhes\?id=([^&#]+)/.exec(careAction?.href || "")?.[1];
      const withdrawalLinkP71B = classifyWithdrawalLinkP71B(careAction?.href, med, retiradas);
      const snapshotP6=withdrawalEvidenceByMedicationP6.get(med.id!) ?? withdrawalEvidenceForMedicationP6(med,retiradas);
      const navigationP6=withdrawalNavigationEvidenceP6(careAction?.href,snapshotP6);
      const exactClosedWithdrawalP7 = Boolean(linkedWithdrawalIdP7 && retiradas.some(row =>
        row.id === withdrawalLinkP71B.eventId &&
        row.user_id === med.user_id && row.person_id === med.person_id &&
        !activeScheduledWithdrawalP5P4(row) && withdrawalLinkP71B.state === "completed"
      ));
      // M150 P3: keep original business handlers; only classify presentation.
      const quickActionButtonM150P3 = !isSuspenso && canQuickDose && quickDoseLabel ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      trigger("vibrate");
                      setQuickDoseMedId(med.id!);
                    }}
                    className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all active:scale-[0.97] ${isSOS ? "border-amber-400/20 bg-amber-400/[0.07] text-amber-400" : "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-400"}`}
                    aria-label={`${quickDoseLabel} ${med.nome}${isSOS && isEstoqueZerado ? ". Saldo registrado zerado: confirme a situação no formulário" : ""}`}
                  >
                    <Zap size={12} fill="currentColor" />
                    {isSOS ? "SOS" : "Tomar"}
                    {isSOS && isEstoqueZerado ? <span className="sr-only">Estoque zerado no cadastro</span> : null}
                  </button>
                ) : null;
      const historyActionButtonM150P3 = isSuspendedSOSM147 ? (
                  <button type="button"
                    aria-label={`Registrar uso já ocorrido de ${med.nome}, registrado como suspenso. Não retoma o tratamento.`}
                    title="Somente documenta uso já ocorrido. Cadastro suspenso; sem autorização de retomada."
                    className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-surface-border/60 bg-surface-raised/50 px-2 text-[11px] font-semibold text-ink-secondary"
                    onClick={(event) => { event.preventDefault(); event.stopPropagation(); trigger("vibrate"); setQuickDoseMedId(med.id!); }}
                  ><History size={14}/>Registrar uso já ocorrido</button>
                ) : null;
      const careActionButtonM150P3 = careAction && !exactClosedWithdrawalP7 ? (
                  navigationP6.kind === "completed" ? null : (<button
                    type="button"
                    className={`inline-flex min-h-10 max-w-full items-center justify-center gap-1 rounded-xl border px-3 py-1 text-xs font-bold transition-all active:scale-[0.97] ${/\/retiradas\/(?:detalhes|nova)/.test(careAction.href) ? "border-sky-400/35 bg-sky-400/[.10] text-sky-300" : isRestockDestination(careAction.href, med.id!) ? "border-amber-400/35 bg-amber-400/[.10] text-amber-300" : careActionClass}`}
                    title={withdrawalNeedsLinkReviewP5P4 && /\/retiradas\/detalhes(?:\?|$)/i.test(careAction.href) ? "Existe aquisição SUS registrada após a data prevista. Confira se corresponde a esta retirada antes de criar outra." : careAction.description}
                    aria-label={`${careAction.description} para ${med.nome}`}
                    aria-description={withdrawalNeedsLinkReviewP5P4 && /\/retiradas\/detalhes(?:\?|$)/i.test(careAction.href) ? "Há aquisição SUS registrada após a data agendada. Confira se corresponde a esta retirada; nenhuma conclusão foi feita automaticamente." : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      trigger("vibrate");
                      if (withdrawalLinkP71B.state === "review" || navigationP6.kind === "review") router.push("/saude/retiradas");
                      else router.push(careAction.href);
                    }}
                  >
                    <AlertTriangle size={12} className="shrink-0" />
                    <span className="min-w-0 line-clamp-1 break-words">{withdrawalLinkP71B.state === "review" ? "Conferir" : compactCareActionLabelR4}</span>
                    <span className="sr-only">{careAction.label}</span>
                  </button>)
                ) : null;
      const stockActionButtonM150P3 = !isSuspenso && med.id && ((stockUnknown || stockNegative) && careAction?.href !== medicationStockCountHref(med.id, `/saude/medicamentos/detalhes?id=${encodeURIComponent(med.id)}`) ||
                  (stockEmpty && !stockNegative && !isRestockDestination(careAction?.href, med.id))) ? (
                  <MedicationRestockAction name={med.nome} tone="amber"
                    label={stockUnknown ? "Informar" : stockNegative ? "Revisar" : "Repor"}
                    onOpen={() => {
                      trigger("vibrate");
                      router.push(stockUnknown || stockNegative
                        ? medicationStockCountHref(med.id!, "/saude/medicamentos")
                        : medicationRestockHref(med.id!, "/saude/medicamentos"));
                    }} />
                ) : null;
      const actionLayoutM150P3 = medicationCardActionLayoutM150P3({
        dose: Boolean(quickActionButtonM150P3),
        care: Boolean(careActionButtonM150P3),
        stock: Boolean(stockActionButtonM150P3),
        suspended: isSuspenso,
        history: Boolean(historyActionButtonM150P3),
      });

      // VAULT_UI360_R3_MEDICATION_SHEET_SHARED — os dados sao projecoes dos registros existentes.
      const openMedicationSheet360 = (initialTab: Medication360Tab = "ficha") => {
        if (!med.id) return;
        trigger("vibrate");
        const knowledge = medicationKnowledge360;
        const officialPresentations = knowledge.facts.find(f => f.kind === "presentation")?.value || null;
        const knownClass = (() => {
          if (!regulatoryProfile?.verified) return null;
          const ref = med.catalog_snapshot?.reference;
          if (!ref || typeof ref !== "object" || !("regulatoryRules" in ref)) return null;
          const rules = (ref as {regulatoryRules?: unknown}).regulatoryRules;
          if (!Array.isArray(rules)) return null;
          const today = hojeString;
          const safe = rules.filter(r => r && typeof r === "object" &&
            (!r.effectiveFrom || r.effectiveFrom <= today) &&
            (!r.effectiveUntil || r.effectiveUntil >= today) &&
            !r.hasMalformedExceptions && (!Array.isArray(r.exceptions) || r.exceptions.length === 0) &&
            typeof r.regulatoryClass === "string" && r.regulatoryClass.trim());
          if (safe.length !== 1) return null;
          return String(safe[0].regulatoryClass).trim();
        })();
        const controls: ReactNode[] = [];
        if (quickActionButtonM150P3) controls.push(quickActionButtonM150P3);
        if (careActionButtonM150P3) controls.push(careActionButtonM150P3);
        if (stockActionButtonM150P3) controls.push(stockActionButtonM150P3);
        if (historyActionButtonM150P3) controls.push(historyActionButtonM150P3);
        const detailHref = `/saude/medicamentos/detalhes?id=${encodeURIComponent(med.id)}&return_to=${encodeURIComponent("/saude/medicamentos")}`;
        setMedicationSheet360({
          id: med.id,
          name: med.nome,
          dosage: med.dosagem || "",
          activeIngredient,
          icon: <MedicationFormatIcon formato={med.formato} cores={med.cores} size={23}/>,
          initialTab,
          manufacturer: latestManufacturer || null,
          catalogManufacturer: catalogIdentity?.manufacturer || null,
          declaredManufacturer: med.laboratorio_etiqueta || null,
          form: med.formato || null,
          route: "Consultar apresentação e bula; via não registrada separadamente",
          officialPresentations,
          catalogCoverage: knowledge.coverage,
          regulatoryClass: knownClass,
          origin: med.tipo_aquisicao === "sus" ? "SUS / Governo (cadastrado)" : med.tipo_aquisicao === "comprado" ? "Comprado (cadastrado)" : med.tipo_aquisicao === "gratuito" ? "Gratuito (cadastrado)" : null,
          regime: isSOS ? "SOS / eventual" : isTemporary ? "Por período" : med.tipo_uso === "continuo" ? "Contínuo" : "Não informado",
          dose: textoDose || "",
          schedules: (med.estoque_horarios || []).filter((h):h is string => typeof h === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(h)),
          todayLabel: todayStatus.label,
          todayDetail: todayStatus.detail,
          stockLabel: stockUnknown ? "Saldo desconhecido" : medicationStockLabelM149(stockSnapshot, med.estoque_unidade_medida, humanizeStockText(textoEstoquePrincipal)),
          stockDetail: stockUnknown ? "Estoque não informado no cadastro" : textoEstoqueSecundario || estoqueStatus,
          stockReview: stockReview || null,
          regulatory: { label: regulatoryProfile?.label || receita?.sigla || "Classificação não confirmada", detail: regulatoryProfile?.detail || "Conforme cadastro; sem regra confirmada na referência", source: regulatoryProfile?.sourceLabel || null, verified: Boolean(regulatoryProfile?.verified), authority: catalogIdentity?.authorityState === "confirmed" ? "Referência confirmada" : catalogIdentity?.authorityState === "compatible" ? "Referência compatível" : catalogIdentity?.authorityState === "possible_divergence" ? "Divergência a conferir" : "Não validada", declared: med.tipo_receita || null },
          prescriptionDate: med.data_receita || null,
          renewalDate: med.proxima_renovacao || null,
          treatments: cardTreatments.map(t => ({id:t.id,name:t.nome,color:safeTreatmentColorP7(t.cor)})),
          conflicts: knowledge.conflicts.map(f => ({declared:f.value,reference:f.officialValue || "Referência diferente",limitation:f.limitation})),
          provenance: <MedicationProvenanceLineM150P3 onContext={openMedicationContextP7R3}
            latestManufacturer={latestManufacturer} declaredManufacturer={med.laboratorio_etiqueta}
            acquisitionType={med.tipo_aquisicao} routeMode={supplyRoute?.mode} routeLabels={supplyRoute?.labels} doseText={textoDose}/>,
          controls,
          detailHref,
          editHref: `/saude/medicamentos/editar?id=${encodeURIComponent(med.id)}`,
        });
      };

      // VAULT_MEDICATION_LIST_DENSITY_V72
      return (
        <ListCard
          key={
            med.id
          }
          id={
            med.id
          }
          color={
            regulatoryBorderColor
          }
          onClick={
            () => {
              trigger(
                "vibrate"
              );

              router.push(
                `/saude/medicamentos/detalhes?id=${encodeURIComponent(med.id!)}&return_to=${encodeURIComponent("/saude/medicamentos")}`
              );
            }
          }
          isDisabled={
            isSuspenso
          }
          density="compact"
          compactTight={compactCards}
          medicationFlow
          interactiveContent
          className="min-h-0"
          showChevron={false}
          navigationLabel={`Ver detalhes de ${med.nome}`}
          railSize="label"
          rail={(regulatoryProfile || receita) ? (
            <button
              type="button"
              title={regulatoryMeaning}
              aria-label={`Ver classificação da receita: ${regulatoryProfile?.label || receita?.sigla || "Receita"}`}
              aria-haspopup={regulatoryProfile ? "dialog" : undefined}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                trigger("vibrate");
                if (regulatoryProfile) {
                  setSelectedRegulatory(regulatoryProfile);
                  setSelectedRegulatoryAuthority(catalogIdentity?.authorityState ?? "unvalidated");
                }
                else router.push(`/saude/medicamentos/detalhes?id=${encodeURIComponent(med.id!)}&return_to=${encodeURIComponent("/saude/medicamentos")}#medicamento-agora`);
              }}
              className="relative z-20 flex h-full w-full cursor-pointer items-center justify-center overflow-hidden py-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ice"
            >
              <span aria-hidden="true" className="flex max-h-[calc(100%-1rem)] flex-col items-center justify-center gap-1.5"><span className="whitespace-nowrap font-sans text-[10px] font-semibold uppercase tracking-[.14em] text-void [writing-mode:vertical-rl] rotate-180">
                {prescriptionIdentityP6 ?? medicationRegulatoryShortLabel(regulatoryProfile, receita?.sigla)}
              </span></span>
              <span className="sr-only">Abrir classificação: {prescriptionIdentityP6 ?? medicationRegulatoryShortLabel(regulatoryProfile, receita?.sigla)}. {reconciliationP6.hasDocumentEvidence?"Receita existente vinculada, sem confirmar classificação regulatória.":""}</span>
            </button>
          ) : null}
          icon={
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl border ${regulatorySurface.iconClass} ${regulatorySurface.glowClass}`}
              title={personalAccent ? "Identidade visual personalizada e classificação regulatória acessível" : regulatoryMeaning}
              style={medicationPersonalAccentStyle(med)}
            >
              {(med.formato || med.cores?.length) ? (
                <MedicationFormatIcon formato={med.formato} cores={med.cores} size={24} />
              ) : (
                <SelectedFormatIcon size={18} fill={fillValue} stroke={strokeValue} />
              )}
            </span>
          }
        >
              <div data-vault-executive-density={compactCards?"compact":"comfort"} className={`relative flex min-w-0 flex-col ${compactCards ? "gap-0" : "gap-1"}`}>


            {/* IDENTIDADE · VAULT_V318_COMPACT_IDENTITY · M86_ALIGNED_IDENTITY */}
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <div data-vault-med360-header className="flex min-w-0 w-full items-center gap-1.5 pl-11">
                  <button type="button" aria-haspopup="dialog" data-vault-med360-entry="name" aria-label={`Abrir Gaveta 360 de ${med.nome}`} onClick={event=>{event.preventDefault();event.stopPropagation();openMedicationSheet360("ficha");}}
                    className="pointer-events-auto relative z-20 flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg px-0.5 text-left transition-transform active:scale-[.99] active:bg-surface-raised/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
                    <span title={medicationListDisplayNameM150P3(med.nome, catalogIdentity?.authorityState === "confirmed" ? catalogIdentity.canonicalName : null)} className="min-w-0 max-w-full line-clamp-2 break-words font-display text-[15px] font-bold uppercase tracking-[.015em] leading-[1.22rem] text-ink-primary">
                      {medicationListDisplayNameM150P3(med.nome, catalogIdentity?.authorityState === "confirmed" ? catalogIdentity.canonicalName : null)}
                    </span>
                    {med.dosagem && <span title={med.dosagem} className="shrink-0 text-[11px] font-medium leading-snug text-ink-secondary">{med.dosagem}</span>}
                    <ChevronRight size={14} className="shrink-0 text-ink-faint" aria-hidden="true"/>
                  </button>
                  <button type="button" aria-haspopup="dialog" aria-label={`Abrir menu 360 de ${med.nome}`} data-vault-med360-entry="menu"
                    onClick={event=>{event.preventDefault();event.stopPropagation();openMedicationSheet360("acoes");}}
                    className="pointer-events-auto relative z-20 grid size-11 shrink-0 place-items-center rounded-xl border border-transparent bg-transparent text-ink-secondary transition-transform active:scale-[.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><Ellipsis size={19} aria-hidden="true"/></button>
                </div>

              </div>
              {!activeIngredients.length && !isSuspenso && (
                <span className="sr-only">Princípio ativo · confirmar referência nos detalhes</span>
              )}
              {showActiveIngredient && (
                <>
                {/* Compacto e Conforto: princípio ativo visível quando há referência real. */}
                <p className="sr-only" title={`Princípio ativo: ${activeIngredient}`}>
                  Princípio ativo: {activeIngredient}
                </p>
                {(
                  <p aria-hidden="true" data-vault-r5-active-ingredient className={`min-w-0 pl-11 line-clamp-1 break-words font-normal text-ink-muted ${compactCards ? "text-[10px] leading-tight" : "text-xs leading-snug"}`} title={`Princípio ativo: ${activeIngredient}`}>
                    {activeIngredient}
                  </p>
                )}
                </>
              )}
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0 text-[10px] leading-tight">
                <button type="button" onClick={event=>{event.preventDefault();event.stopPropagation();openMedicationSheet360("rotina");}} data-vault-r5-context="regime" className={`pointer-events-auto relative z-20 inline-flex min-h-6 shrink-0 items-center gap-1 text-[10px] font-semibold ${compactCards ? (isSOS ? "text-amber-300" : isTemporary ? "text-sky-200" : "text-ink-secondary") : isSOS ? "min-h-7 rounded-md border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-amber-300" : isTemporary ? "min-h-7 rounded-md border border-sky-300/20 bg-sky-300/[.05] px-1.5 py-0.5 text-sky-200" : "min-h-7 rounded-md border border-surface-border/50 bg-surface/40 px-1.5 py-0.5 text-ink-secondary"}`} aria-label={`Abrir rotina e regime de ${med.nome}`}>
                  <Repeat2 size={12} aria-hidden="true"/>
                  {isSOS ? "SOS" : isTemporary ? "Por período" : med.tipo_uso === "continuo" ? "Contínuo" : "Conferir regime"}
                </button>
                {isSOS && med.status === "descontinuado" && <button type="button" aria-label={`Conferir regime suspenso SOS de ${med.nome}`} title="Cadastro descontinuado; registro factual de uso passado não significa retomada." onClick={event=>{event.preventDefault();event.stopPropagation();openMedicationSheet360("rotina");}} className="pointer-events-auto relative z-20 inline-flex min-h-6 items-center rounded-md border border-amber-300/20 bg-amber-300/[0.045] px-1.5 text-[10px] font-semibold text-amber-200">Suspenso · SOS</button>}
                {compactCards && (activeIngredient || latestManufacturer || med.laboratorio_etiqueta || med.tipo_aquisicao) &&
                  <span data-vault-compact-medication-meta className="sr-only">
                    {[activeIngredient, latestManufacturer || med.laboratorio_etiqueta, med.tipo_aquisicao].filter(Boolean).join(" · ")}
                  </span>}
                {catalogIdentity?.authorityState === "possible_divergence" && (
                  <button type="button" aria-label={`Conferir identidade divergente de ${med.nome}`} onClick={event=>{event.preventDefault();event.stopPropagation();openMedicationSheet360("ficha");}} className="pointer-events-auto relative z-20 inline-flex min-h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold text-amber-300">Revisar identidade</button>
                )}
                {careDecision.stage !== "stable" && !careAction && (!isSOS || sosHasOperationalException) && (
                  <button type="button" title={careDecision.explanation} aria-label={`Abrir ações para ${med.nome}: ${careDecision.label}`} onClick={event=>{event.preventDefault();event.stopPropagation();openMedicationSheet360("acoes");}} className={`pointer-events-auto relative z-20 inline-flex min-h-6 items-center rounded-md px-1.5 text-[10px] font-semibold ${carePresentation.badgeClass}`}>
                    {careDecision.label}
                  </button>
                )}
              {Boolean(cardTreatments.length > 0) && <div data-vault-med360-treatment-tags className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0">
                {cardTreatments.slice(0,compactCards ? 2 : 3).map(t=>{
                  const TreatmentIcon = getVaultTreatmentIcon(t.nome);
                  const color = safeTreatmentColorP7(t.cor);
                  return <button key={t.id || t.nome} type="button" data-vault-r5-context="tratamento"
                    onClick={event=>{event.preventDefault();event.stopPropagation();trigger("vibrate");if(t.id) router.push(`/saude/tratamentos/detalhes?id=${encodeURIComponent(t.id)}`);else openMedicationSheet360("ficha");}}
                    aria-label={`Abrir tratamento ${t.nome}`} className={`pointer-events-auto relative z-20 inline-flex min-h-6 max-w-full items-center gap-1 text-[10px] font-semibold ${compactCards ? "min-h-6 border-0 bg-transparent px-0" : "min-h-7 rounded-lg border border-surface-border/50 bg-surface/40 px-2"}`}
                    style={color ? (compactCards ? {color} : {borderColor:`${color}66`,backgroundColor:`${color}12`,color}) : undefined}>
                    <TreatmentIcon size={12} aria-hidden="true"/><span className="max-w-[10rem] truncate">{t.nome}</span>
                  </button>;
                })}
                {!compactCards && cardTreatments.length>3&&<button type="button" data-vault-r5-context="mais-tratamentos" aria-label={`Conferir todos os ${cardTreatments.length} tratamentos vinculados de ${med.nome}`} onClick={event=>{event.preventDefault();event.stopPropagation();openMedicationSheet360("ficha");}} className="pointer-events-auto relative z-20 inline-flex min-h-6 items-center text-[10px] text-ink-secondary underline underline-offset-2">+{cardTreatments.length-3} tratamentos na gaveta</button>}
              </div>}
              </div>
              {!compactCards && <div data-vault-r5-comfort-context className="pointer-events-auto relative z-20 flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5" aria-label="Contextos adicionais do medicamento">
                {med.tipo_aquisicao && <button type="button" data-vault-r5-context="origem" aria-label={`Conferir origem registrada de ${med.nome}`} onClick={event=>{event.preventDefault();event.stopPropagation();openMedicationSheet360("ficha");}}
                  className="pointer-events-auto relative z-20 inline-flex min-h-7 max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-sky-300/20 bg-sky-300/[.04] px-2 text-[10px] font-semibold text-sky-200"><ShoppingBag size={12} aria-hidden="true"/>
                  {supplyRoute?.mode === "hybrid" ? "Origens históricas · conferir" : med.tipo_aquisicao === "sus" ? "SUS · cadastrado" : med.tipo_aquisicao === "comprado" ? "Comprado · cadastrado" : med.tipo_aquisicao === "gratuito" ? "Gratuito · cadastrado" : "Origem cadastrada"}
                </button>}
                {(latestManufacturer || med.laboratorio_etiqueta) && <button type="button" data-vault-r5-context="fabricante" aria-label={`Conferir fabricante e procedência de ${med.nome}`} onClick={event=>{event.preventDefault();event.stopPropagation();openMedicationSheet360("ficha");}}
                  className="pointer-events-auto relative z-20 inline-flex min-h-7 max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-surface-border/45 bg-surface/35 px-2 text-[10px] font-semibold text-ink-secondary"><Factory size={12} aria-hidden="true"/><span className="min-w-0 max-w-[10rem] truncate">{latestManufacturer ? `Última aquisição: ${latestManufacturer}` : `Etiqueta: ${med.laboratorio_etiqueta}`}</span>
                </button>}
                {reconciliationP6.hasDocumentEvidence && <button type="button" data-vault-r5-context="receita" aria-label={`Conferir documento vinculado de ${med.nome}`} onClick={event=>{event.preventDefault();event.stopPropagation();openMedicationSheet360("receita");}}
                  className="pointer-events-auto relative z-20 inline-flex min-h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-violet-300/25 bg-violet-300/[.04] px-2 text-[10px] font-semibold text-violet-200"><FileCheck2 size={12} aria-hidden="true"/>Documento vinculado</button>}
              </div>}
              {/* VAULT_V318_OPERATIONAL_STRIP: resumo clinico unico, antes das acoes; sem painel duplicado. */}
              {(attentionReasonsM143.get(med.id||"")||[]).length>0 && !(stockReview || prescriptionReview360 || (!stockUnknown && (isEstoqueCritico || isEstoqueZerado))) && <p className="mt-1 text-xs leading-relaxed text-amber-200" aria-label="Motivo da atenção">Atenção: {(attentionReasonsM143.get(med.id||"")||[]).join(" · ")}</p>}
              <div data-vault-r5-operational className={`${actionLayoutM150P3.primary ? "grid grid-cols-[minmax(0,1fr)_88px]" : "flex"} min-w-0 items-end gap-1.5`}>
                <div className="min-w-0 flex-1">
              <MedicationOperationalStrip today={todayStatus} compact={compactCards}
              stockLabel={stockUnknown ? "Não informado" : medicationStockLabelM149(stockSnapshot, med.estoque_unidade_medida, humanizeStockText(textoEstoquePrincipal))}
              stockDetail={stockUnknown ? "Saldo ainda não informado" : textoEstoqueSecundario || estoqueStatus}
              stockTone={stockUnknown ? "unknown" : stockEmpty ? "empty" : isEstoqueCritico ? "low" : "known"}
              doseOutcome={dosesIgnoradasHoje>0&&!isSOS?"ignored":rotinaConcluida||sosTomadoHoje?"completed":"unconfirmed"}/>
                </div>
                {actionLayoutM150P3.primary && <div aria-label="Ações do medicamento" data-vault-r4-main-action className="relative flex min-h-11 w-[88px] min-w-0 items-end justify-end [&>button]:min-h-11 [&>button]:w-full [&>button]:max-w-full [&>button]:min-w-0 [&>button]:whitespace-normal [&>button]:px-1 [&>button]:text-center [&>button]:text-[10px]">
                  {actionLayoutM150P3.primary === "dose" ? quickActionButtonM150P3 : null}
                  {actionLayoutM150P3.primary === "care" ? careActionButtonM150P3 : null}
                  {actionLayoutM150P3.primary === "stock" ? stockActionButtonM150P3 : null}
                </div>}
              </div>
              {/* R4: acoes secundarias somente na gaveta; o card nao cresce. */}
            </div>

            {/* VAULT_MEDICATION_LIST_HIERARCHY_V98
                Indicações, médico e tratamentos ficam nos Detalhes.
                A lista preserva apenas identidade, rotina, estoque e exceções. */}

            {(stockReview || prescriptionReview360 || (!stockUnknown && (isEstoqueCritico || isEstoqueZerado))) && <button type="button" data-vault-med360-microbanner
              onClick={event=>{event.preventDefault();event.stopPropagation();openMedicationSheet360(stockReview ? "estoque" : prescriptionReview360 ? "receita" : "estoque");}}
              aria-label={`Conferir ${stockReview ? "unidade de estoque" : prescriptionReview360 ? "tipo de receita" : "saldo"} de ${med.nome}`}
              className={`pointer-events-auto relative z-20 mt-1 flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[11px] font-semibold text-amber-200 transition-transform active:scale-[.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${compactCards ? "border-t border-amber-300/15 bg-amber-300/[.025] py-1" : "border border-amber-300/25 bg-amber-300/[.055] py-1.5"}`}>
              <AlertTriangle size={14} className="shrink-0" aria-hidden="true"/>
              <span className="min-w-0 flex-1 truncate">{stockReview ? "Unidade do estoque diferente · conferir" : prescriptionReview360 ? "Receita e catálogo: conferir" : isEstoqueZerado ? "Sem estoque registrado · conferir" : "Estoque baixo · conferir"}</span>
              <ChevronRight size={14} className="shrink-0" aria-hidden="true"/>
            </button>}

            {/* VAULT_CARD_RHYTHM_V97_2_R1
                Ações rápidas ficam após a situação de dose/estoque.
                Nenhuma faixa inferior altera a altura do card. */}
          </div>
        </ListCard>
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    medicationsLoading ||
    doseLogsLoading ||
    withdrawalsLoading ||
    renewalsLoading
  ) {
    return (
      <main className="min-h-screen bg-void px-5 pb-28 pt-6 vault-adaptive-tail" aria-busy="true" aria-label="Carregando medicamentos">
        <p role="status" className="sr-only">Carregando medicamentos e contexto de cuidado da pessoa selecionada.</p>
        <CardListSkeleton />
      </main>
    );
  }

  const totalAtivos = statsProgresso.ativos;
  // P14 R2: projeção textual pura; dados permanecem nos hooks existentes.
  const listPresentation = medicationListPresentation(medicationFilter,searchQuery,listaProcessada.length);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28 vault-adaptive-tail">
        {/* GRADIENTES DOS ÍCONES */}

        <svg
          width="0"
          height="0"
          className="absolute"
          aria-hidden="true"
        >
          <defs>
            {listaProcessada.map(
              ({
                med,
              }) => {
                if (
                  !med.id ||
                  !med.cores ||
                  med.cores.length <=
                    1
                ) {
                  return null;
                }

                return (
                  <linearGradient
                    key={`grad-${med.id}`}
                    id={`grad-${med.id}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="50%"
                      stopColor={
                        med.cores[
                          0
                        ]
                      }
                    />

                    <stop
                      offset="50%"
                      stopColor={
                        med.cores[
                          1
                        ]
                      }
                    />
                  </linearGradient>
                );
              }
            )}
          </defs>
        </svg>

        {/* HEADER */}

        <ListPageHeader
          title="Medicamentos"
          subtitle={`${totalAtivos} ${
            totalAtivos ===
            1
              ? "ativo"
              : "ativos"
          }`}
          rightAction={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsSearchOpen(
                    true
                  );
                }}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
                  isSearchOpen ||
                  searchQuery
                    ? "border-emerald-300/30 bg-emerald-300/[.06] text-emerald-200"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
                aria-label="Pesquisar medicamentos"
                title="Pesquisar"
              >
                <Search size={17} />
              </button>

              {/* P0: Retiradas permanece na area proprio/fluxos clinicos.
                  O espaco do cabecalho pertence a busca; criacao tem CTA dedicado. */}

            </div>
          }
        >
          {isSearchOpen && (
            <div className="flex w-full items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                />

                <input
                  ref={
                    searchInputRef
                  }
                  type="search"
                  value={
                    searchQuery
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setSearchQuery(
                        event.target.value
                      )
                  }
                  placeholder="Nome, princípio ativo, dose ou médico..."
                  aria-label="Buscar medicamento"
                  className="h-11 w-full rounded-2xl border border-emerald-300/20 bg-surface-raised pl-10 pr-10 text-sm text-ink-primary outline-none transition-colors placeholder:text-ink-faint focus:border-emerald-300/45"
                />

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery(
                      ""
                    );

                    setIsSearchOpen(
                      false
                    );

                    trigger(
                      "vibrate"
                    );
                  }}
                  aria-label="Fechar pesquisa"
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-ink-muted active:scale-95"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </ListPageHeader>

        {/* P7: one compact control surface, with stored density from @vault:meds_density_v1. */}
        <section className="mx-4 mt-1 rounded-[18px] border border-emerald-300/20 bg-gradient-to-br from-emerald-300/[.045] via-surface to-surface p-1.5 shadow-sm" aria-label="Organizar medicamentos">
          <div className="flex min-w-0 items-center justify-between gap-2 px-1">
            <span className="text-xs font-bold text-ink-primary">Medicamentos <span className="font-normal text-ink-muted">· rotina programada</span></span>
            <button type="button" aria-label="Explicar o progresso da rotina de medicamentos" onClick={()=>setMedicationContextP7R3({title:"Progresso das doses",description:"Registros programados da pessoa ativa no dia selecionado.",details:[`${statsProgresso.completados} horários confirmados de ${statsProgresso.total} programados.`,`Ignorados registrados: ${statsProgresso.ignoradas}.`,`Esse contador pode ser diferente da Home e de Hoje porque os recortes são diferentes. Ausência de confirmação não prova dose não tomada.`]})} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 font-mono text-sm font-bold tabular-nums text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">{statsProgresso.completados}/{statsProgresso.total}<Info size={14} aria-hidden="true"/></button>
          </div>
          <div role="progressbar" aria-label="Doses programadas confirmadas hoje" aria-valuemin={0} aria-valuemax={100} aria-valuenow={statsProgresso.total>0?Math.min(100,Math.round(statsProgresso.completados/statsProgresso.total*100)):0} className="mx-1 mt-1.5 h-1 overflow-hidden rounded-full bg-surface-raised">
            <div className="h-full bg-emerald-400" style={{width:`${statsProgresso.total>0?Math.min(100,Math.round(statsProgresso.completados/statsProgresso.total*100)):0}%`}}/>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-xl border border-surface-border/60 bg-surface-raised/30 p-0.5" role="group" aria-label="Exibição dos medicamentos">
              <button type="button" aria-pressed={unifiedList} onClick={()=>setUnifiedList(true)} className={`min-h-11 rounded-lg px-3 text-[11px] font-semibold ${unifiedList?"bg-emerald-300/10 text-emerald-200":"text-ink-muted"}`}>Lista</button>
              <button type="button" aria-pressed={!unifiedList} onClick={()=>setUnifiedList(false)} className={`min-h-11 rounded-lg px-3 text-[11px] font-semibold ${!unifiedList?"bg-emerald-300/10 text-emerald-200":"text-ink-muted"}`}>Grupos</button>
            </div>
            <div className="inline-flex rounded-xl border border-surface-border/60 bg-surface-raised/30 p-0.5" role="group" aria-label="Escolher densidade dos cartões" data-vault-density-control="canonical-single" data-vault-density-options="one-group">
              <button type="button" aria-pressed={compactCards} onClick={()=>chooseCardDensity(true)} className={`inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold ${compactCards?"bg-emerald-300/10 text-emerald-200":"text-ink-muted"}`}><Pill size={13}/>Compactos</button>
              <button type="button" aria-pressed={!compactCards} onClick={()=>chooseCardDensity(false)} className={`min-h-11 rounded-lg px-2 text-[11px] font-semibold ${!compactCards?"bg-emerald-300/10 text-emerald-200":"text-ink-muted"}`}>Conforto</button>
            </div>
            <button type="button" aria-label="Abrir filtros de medicamentos" aria-expanded={visualFilterSheetOpenR1} onClick={()=>{trigger("vibrate");setVisualFilterSheetOpenR1(true);}} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border border-surface-border/55 bg-surface-raised/30 px-2 text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><SlidersHorizontal size={18}/>{medicationFilter!=="todos"&&<span aria-label="Filtro ativo" className="size-1.5 rounded-full bg-amber-300"/>}</button>
          </div>
        </section>

        <BottomSheet isOpen={visualFilterSheetOpenR1} onClose={()=>setVisualFilterSheetOpenR1(false)} title="Filtros dos medicamentos" height="auto">
          <div className="space-y-3" data-vault-filter-sheet="r1">
            <p className="text-xs text-ink-muted">Filtre sem ocultar registros. O filtro ativo também aparece acima da lista.</p>
            <MedicationFilterBar value={medicationFilter} onChange={selectMedicationFilter}/>
            <div className="flex flex-wrap gap-2 border-t border-surface-border/50 pt-3">
              <button type="button" onClick={()=>{trigger("vibrate");setSearchQuery("");selectMedicationFilter("todos");setVisualFilterSheetOpenR1(false);}} className="min-h-11 rounded-xl border border-surface-border/70 bg-surface-raised/45 px-3 text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Limpar filtros</button>
              <button type="button" onClick={()=>setVisualFilterSheetOpenR1(false)} className="min-h-11 flex-1 rounded-xl border border-emerald-300/25 bg-emerald-300/[.085] px-3 text-xs font-bold text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Ver medicamentos</button>
            </div>
          </div>
          {/* R4: advanced navigation/information remains, but ONLY in the filter drawer. */}
        {/* P7 R3: ferramentas transversais e inteligencia depois da lista. */}
        <section className="mt-3 space-y-2 border-t border-surface-border/40 pt-3" aria-label="Ferramentas de apoio da lista">
          {/* M153 P7.1-B: ferramentas acessíveis sem ficarem aninhadas no filtro. */}
          <div className="mt-1.5" aria-label="Ferramentas complementares da lista">
                <details className="group rounded-xl border border-surface-border/40 bg-surface/35 px-2" aria-label="Mais opções da lista">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold text-ink-secondary">Mais opções e ajuda <ChevronDown size={14} className="transition-transform group-open:rotate-180"/></summary>
                  <div className="space-y-1.5 border-t border-surface-border/35 pb-2 pt-2">
                {/* VAULT_M144_LIST_ENTRY · central acessivel no controle compacto P7. */}
                <button type="button" onClick={()=>router.push("/saude/central-m144?return_to=%2Fsaude%2Fmedicamentos")} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-surface-border/45 bg-surface-raised/30 px-3 text-left"><span><span className="block text-xs font-semibold">Ocorrências, ciclos e vacinas</span><span className="block text-[10px] text-ink-muted">Histórico complementar de saúde</span></span><ChevronDown size={14} className="-rotate-90"/></button>

                <button type="button" onClick={()=>router.push("/ajuda?topico=medications&return_to=%2Fsaude%2Fmedicamentos")} className="flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-[11px] text-ice">Ajuda sobre medicamentos <Info size={14}/></button>
                {!unifiedList && <details className="rounded-xl border border-surface-border/40 px-2">
                  <summary className="flex min-h-11 cursor-pointer items-center text-[11px] text-ink-secondary">Ir para um grupo · navegação, não filtro</summary>
                  <MedicationListGroupNavigation attention={medsPrioridade.length} stable={medsEmDia.length} planned={medsPlanejados.length} sos={medsSOS.length} suspended={medsSuspensos.length}/>
                </details>}

                  </div>
                </details>
          </div>

                <details id="medicamentos-panorama" className="group mx-2 rounded-xl border border-surface-border/35 bg-surface/30 px-3" aria-label="Panorama detalhado dos medicamentos">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Entender indicadores, doses e estados <ChevronDown size={15} className="shrink-0 transition-transform group-open:rotate-180"/></summary>
                  <div className="border-t border-surface-border/35 pb-3 pt-2">
                    <MedicationPortfolioOverview portfolio={healthIntelligence.careCommand?.medications}
                      decision={healthIntelligence.careCommand?.decision}
                      doses={{total:statsProgresso.total,completed:statsProgresso.completados,ignored:statsProgresso.ignoradas}}
                      listActiveCount={statsProgresso.ativos} condensedInList onNavigate={href=>router.push(href)}/>
                  </div>
                </details>
        </section>

        </BottomSheet>

        {/* CONTEÚDO */}
        <section className="px-4 pt-2.5">
          <MedicationListActiveFilter view={listPresentation} onClear={() => { trigger("vibrate"); setSearchQuery(""); selectMedicationFilter("todos"); }} />
          <div className="mb-2 flex min-w-0 items-center justify-between gap-2" aria-label="Organização da lista de medicamentos">
            <div className="min-w-0"><h2 className="text-sm font-bold tracking-tight text-ink-primary">Seus medicamentos</h2>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-muted">{unifiedList ? "Lista única · acesso direto aos medicamentos" : "Prioridades primeiro · rotina e SOS separados"}</p></div>
            {medsPrioridade.length > 0 ? <span className="shrink-0 rounded-lg border border-amber-400/20 bg-amber-400/[.07] px-2 py-1 text-[10px] font-semibold text-amber-200">{medsPrioridade.length} em atenção</span> : null}
          </div>

          {listaProcessada.length ===
          0 ? (
            <EmptyState
              icon={
                Pill
              }
              title="Nenhum medicamento encontrado"
              variant={listPresentation.active ? "no-results" : "default"}
              description={listPresentation.emptyDescription}
              actionLabel={listPresentation.active ? listPresentation.clearLabel : undefined}
              onAction={listPresentation.active ? () => { setSearchQuery(""); selectMedicationFilter("todos"); } : undefined}
            />
          ) : (
            unifiedList ? (
              <div className="space-y-2 pb-8" aria-label="Todos os medicamentos encontrados">
                <p role="status" className="text-xs text-ink-muted">
                  Exibindo {(medicationFilter !== "todos" || deferredSearchQuery.trim()) ? listaProcessada.length : Math.min(unifiedVisibleCount, listaProcessada.length)} de {listaProcessada.length} medicamentos
                </p>
                {(medicationFilter !== "todos" || deferredSearchQuery.trim()
                  ? listaCronologica
                  : listaCronologica.slice(0, unifiedVisibleCount)).map(renderCard)}
                {medicationFilter === "todos" && !deferredSearchQuery.trim() && unifiedVisibleCount < listaProcessada.length && (
                  <button type="button" onClick={() => setUnifiedVisibleCount(count => count + 12)}
                    className="flex min-h-12 w-full items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-300/[.06] px-4 text-xs font-bold text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
                    Mostrar mais {Math.min(12, listaProcessada.length - unifiedVisibleCount)} medicamentos
                  </button>
                )}
              </div>
            ) : (
            <div className="space-y-2 pb-8">
              <ClinicalCollectionGroup id="medicamentos-pendentes-hoje" title="Próximas doses de hoje" description="Doses ainda não resolvidas · horários reais primeiro" count={medsPendentesHoje.length} icon={Clock3} tone="attention" defaultOpen forceOpen progressive={false} compact={compactCards}>{medsPendentesHoje.map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-atencao" title="Precisa de atenção" description="Doses, estoque ou próxima etapa que exigem ação" count={medsPrioridade.length} icon={AlertTriangle} tone="attention" defaultOpen forceOpen={Boolean(searchQuery)||medicationFilter!=="todos"} progressive={medicationFilter === "todos" && !searchQuery} compact={compactCards}>{(limit) => limit === undefined ? medsPrioridade.map(renderCard) : medsPrioridade.slice(0, limit).map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-em-dia" title="Em dia" description="Sem doses programadas pendentes hoje" count={medsEmDia.length} icon={CheckCircle2} tone="positive" defaultOpen={medsPrioridade.length===0&&medsEmDia.length<=4} forceOpen={Boolean(searchQuery)||medicationFilter!=="todos"} progressive={medicationFilter === "todos" && !searchQuery} compact={compactCards}>{(limit) => limit === undefined ? medsEmDia.map(renderCard) : medsEmDia.slice(0, limit).map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-planejados" title="Planejamento e acompanhamento" description="Registros futuros ou temas para consulta · não são doses atrasadas" count={medsPlanejados.length} icon={Calendar} forceOpen={Boolean(searchQuery)||medicationFilter!=="todos"} progressive={medicationFilter === "todos" && !searchQuery} compact={compactCards}>{(limit) => limit === undefined ? medsPlanejados.map(renderCard) : medsPlanejados.slice(0, limit).map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-sos" title="SOS / conforme necessidade" description="Uso eventual, separado da rotina programada" count={medsSOS.length} icon={Zap} tone="sos" forceOpen={Boolean(searchQuery)||medicationFilter==="sos"} progressive={medicationFilter === "todos" && !searchQuery} compact={compactCards}>{(limit) => limit === undefined ? medsSOS.map(renderCard) : medsSOS.slice(0, limit).map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-suspensos" title="Suspensos" description="Histórico preservado fora do cuidado atual" count={medsSuspensos.length} icon={EyeOff} forceOpen={Boolean(searchQuery)||medicationFilter==="encerrados"} progressive={medicationFilter === "todos" && !searchQuery} compact={compactCards}>{(limit) => limit === undefined ? medsSuspensos.map(renderCard) : medsSuspensos.slice(0, limit).map(renderCard)}</ClinicalCollectionGroup>
            </div>
            )
          )}


        </section>

                <MedicationContextSheetP7R3 value={medicationContextP7R3} onClose={()=>setMedicationContextP7R3(null)}/>
                <MedicationSheet360R3 value={medicationSheet360} onClose={()=>setMedicationSheet360(null)} onNavigate={href=>router.push(href)}/>

        <MedicationActionsSheetR4 value={secondaryActionSheetR4} onClose={()=>setSecondaryActionSheetR4(null)}/>

        {/* DOSE RÁPIDA */}

        <QuickDoseModal
          isOpen={
            Boolean(
              quickDoseMedId
            )
          }
          onClose={
            () =>
              setQuickDoseMedId(
                null
              )
          }
          preselectedMedicamentoId={
            quickDoseMedId ||
            undefined
          }
          onSuccess={
            () => {
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
            }
          }
        />

        {/* VAULT_REGULATORY_COMPACT_DIALOG_V76_1 */}
        {selectedRegulatory && (
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] vault-r3-dialog-top-inset backdrop-blur-md min-[480px]:items-center min-[480px]:px-5"
            role="presentation"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setSelectedRegulatory(
                  null
                );
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="vault-regulatory-dialog-title"
              className="vault-r3-regulatory-height w-full max-w-[380px] overflow-y-auto overscroll-contain rounded-[24px] border border-surface-border/60 bg-surface-raised p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
              style={{
                boxShadow:
                  `0 20px 60px rgba(0,0,0,.45), inset 3px 0 0 ${selectedRegulatory.accent}`,
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-8 w-1 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      selectedRegulatory.accent,
                  }}
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-ink-faint">
                    Classificação da receita
                  </p>

                  <h2
                    id="vault-regulatory-dialog-title"
                    className="mt-1 font-display text-base font-semibold text-ink-primary"
                  >
                    {
                      selectedRegulatory.label
                    }
                  </h2>

                  <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                    {
                      selectedRegulatory.detail
                    }
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Fechar classificação da receita"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-surface-border/60 bg-black/10 text-ink-muted transition-transform active:scale-95"
                  onClick={() =>
                    setSelectedRegulatory(
                      null
                    )
                  }
                >
                  <X size={15} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-surface-border/40 pt-3">
                <span className="rounded-full border border-surface-border/50 bg-black/[0.06] px-2.5 py-1 text-[9px] font-semibold text-ink-secondary">
                  {
                    selectedRegulatory.sourceLabel ||
                    "Cadastro do medicamento"
                  }
                </span>

                <span className="rounded-full border border-surface-border/50 bg-black/[0.06] px-2.5 py-1 text-[9px] font-semibold text-ink-secondary">
                  {
                    selectedRegulatory.verified
                      ? "Confirmada"
                      : "Receita não confirmada"
                  }
                </span>
              </div>

              {!selectedRegulatory.verified && (
                <p className="mt-2.5 text-xs leading-relaxed text-amber-200">
                  {selectedRegulatoryAuthority === "confirmed"
                    ? "Medicamento identificado no catálogo, mas a receita ainda não foi confirmada na fonte regulatória atual."
                    : selectedRegulatoryAuthority === "compatible"
                      ? "Referência farmacêutica compatível encontrada; a correspondência e o tipo de receita ainda exigem conferência."
                      : selectedRegulatoryAuthority === "possible_divergence"
                        ? "Há possível divergência entre o cadastro e a referência encontrada. Confira a identidade e a receita antes de usá-las como comprovadas."
                        : "Identidade farmacêutica ainda não confirmada pelo catálogo; o tipo de receita também não está confirmado."}
                </p>
              )}

              <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
                Informação para organização de receitas e renovações.
              </p>
            </section>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
