// app/saude/medicamentos/detalhes/page.tsx
"use client";

import { MedicationRestockAction } from "@/components/saude/MedicationRestockAction";
import { medicationRestockHref } from "@/lib/health-intelligence/medication-restock-navigation";
import { normalizeMedicationQualityText, formatDate, getDateDaysAgoISO, getDoseSortTimestamp, formatQuantidade, getKnownDoseQuantity, summarizeKnownQuantity, formatKnownQuantitySummary } from "@/lib/health-intelligence/medication-detail-presenters";
import {HealthSupplyEntry} from "@/components/saude/HealthSupplyEntry";
import { TemporaryCourseMedicationCard } from "@/components/saude/TemporaryCourseMedicationCard";
import { MedicationAlertPreferences } from "@/components/saude/MedicationAlertPreferences";
import { medicationAccessAction, scheduledWithdrawalForOwnedMedication } from "@/lib/medication-access-action";
import { isPrescriptionOnly, isFutureAcquisition, renewalEventDate } from "@/lib/health-supply/renewal-event";
import { useRetiradas } from "@/hooks/useRetiradas";
import { decideMedicationCarePath, medicationCarePresentation } from "@/lib/health-intelligence/medication-care-decision";
import { buildMedicationJourneySnapshot } from "@/lib/health-intelligence/medication-workspace";
import { MedicationJourneySummary } from "@/components/saude/MedicationJourneySummary";
import { summarizeMedicationCosts } from "@/lib/health-intelligence/medication-cost-summary";
import { MedicationPurchaseRhythmCard } from "@/components/saude/MedicationPurchaseRhythmBrief";
import { MedicationDetailNavigation } from "@/components/saude/MedicationWorkspaceNavigation";
import { MedicationDecisionAuthority } from "@/components/saude/MedicationDecisionAuthority";
import { MedicationDecisionEvidenceContext } from "@/components/saude/MedicationDecisionEvidenceContext";
import { MedicationCareNetworkDetails } from "@/components/saude/MedicationCareNetworkDetails";
import { MedicationPrescriptionCard } from "@/components/saude/MedicationPrescriptionCard";
import { MedicationStockOverview } from "@/components/saude/MedicationStockOverview";
import { MedicationSuspensionSummary } from "@/components/saude/MedicationSuspensionSummary";
import { MedicationRoutineSummary } from "@/components/saude/MedicationRoutineSummary";
import { MedicationRenewalAttention } from "@/components/saude/MedicationRenewalAttention";
import { MedicationBehaviorEvidence } from "@/components/saude/MedicationBehaviorEvidence";
import { MedicationCatalogNameComparison } from "@/components/saude/MedicationCatalogNameComparison";
import { MedicationAcquisitionHistoryCard } from "@/components/saude/MedicationAcquisitionHistoryCard";
import { MedicationPaidCostCards } from "@/components/saude/MedicationPaidCostCards";
import { MedicationDoseEvolutionTimeline } from "@/components/saude/MedicationDoseEvolutionTimeline";
import { MedicationDoseHistoryLink } from "@/components/saude/MedicationDoseHistoryLink";
import { MedicationBestPriceLink } from "@/components/saude/MedicationBestPriceLink";
import { ClinicalDisclosure } from "@/components/saude/ClinicalDisclosure";
import { useSharedHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { resolveMedicationCareNavigation } from "@/lib/health-intelligence/medication-care-navigation";
// VAULT_MEDICATION_BACK_CONTRACT_V65
// VAULT_MEDICATION_NAV_RELIABILITY_V70
// Detalhes de medicamento sempre retornam à lista de medicamentos.

import { ContextualHealthIntelligence } from "@/components/vault-intelligence/ContextualHealthIntelligence";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
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
  ArrowRightLeft,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Copy,
  DollarSign,
  Droplet,
  Edit3,
  ExternalLink,
  FileText,
  FileWarning,
  Gift,
  Info,
  LineChart,
  MoreHorizontal,
  Package,
  Pill,
  Plus,
  Share2,
  StickyNote,
  Stethoscope,
  Syringe,
  Trash2,
  Zap,
} from "lucide-react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  format,
} from "date-fns";

import {
  ptBR,
} from "date-fns/locale";

import {
  db,
} from "@/lib/db";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";
import { useMedicationCatalogIdentities, useMedicationRegulatoryProfiles } from "@/hooks/useMedicationRegulatoryProfiles";
import { getMedicationRegulatorySurface } from "@/lib/medication-regulatory-visual";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";
import { useBiometric } from "@/hooks/useBiometric";
import { isVaultNative } from "@/lib/native-runtime";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  DetailSkeleton,
} from "@/components/loading/DetailSkeleton";

import {
  BottomSheet,
} from "@/components/ui/BottomSheet";

import {
  ConfirmationModal,
} from "@/components/ConfirmationModal";

import {
  QuickDoseModal,
} from "@/components/saude/QuickDoseModal";

import {
  ListIcon,
} from "@/components/list/ListIcon";

import {
  SectionTitle,
} from "@/components/detail/DetailComponents";

import {
  computeEstoqueInfo,
  getClinicalTheme,
  getDaysUntil,
  getLocalTodayISO,
  parseLocalDate,
  TIPO_RECEITA_LABELS,
  VALIDADE_RECEITA_DIAS,
} from "@/lib/health-utils";

import {
  analisarValidadeReceita,
  analisarComportamentoUso,
  analisarMelhorFarmacia,
  sugerirRenovacao,
} from "@/lib/health-insights";


import {
  supabaseMedicationCatalogProvider,
} from "@/lib/medication-catalog";

import type {
  MedicationCatalogSearchResult,
} from "@/lib/medication-catalog";

import {
  medicamentosRepository,
} from "@/lib/repositories/medicamentos";

import {
  healthIntelligenceDecisionsRepository,
} from "@/lib/repositories/healthIntelligenceDecisions";
import { loadMedicationDetailRelations } from "@/lib/medication-detail-relations";
import type { Cid, Tratamento } from "@/lib/types";

const EMPTY_PHARMACY_NAME_MAP = new Map<string, string>();

// ============================================================
// TIPOS
// ============================================================

// VAULT_BUP_DOSAGE_DISPLAY_V70
function formatMedicationDosageDisplay(
  nome: string,
  value: string
): string {
  const isBupropiona =
    /\bbup(?:ropiona)?\b/i.test(
      String(nome || "")
    );

  if (!isBupropiona) {
    return value;
  }

  return String(value || "").replace(
    /(\d+(?:[.,]\d+)?)\s*ng\b/gi,
    "$1 mg"
  );
}

// ============================================================
// ÍCONE DE COMPRIMIDO PARTIDO
// ============================================================

const SplitPillIcon = ({
  size,
  fill = "currentColor",
  stroke = "currentColor",
  strokeWidth = 2,
}: {
  size?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      fill={fill}
    />

    <line
      x1="12"
      y1="2"
      x2="12"
      y2="22"
      stroke="rgba(0,0,0,0.3)"
      strokeWidth="2"
    />
  </svg>
);

// ============================================================
// FORMATOS
// ============================================================

const FORMATOS = [
  {
    id:
      "comprimido",
    label:
      "Inteiro",
    icon:
      Circle,
  },
  {
    id:
      "partido",
    label:
      "Partido",
    icon:
      SplitPillIcon,
  },
  {
    id:
      "capsula",
    label:
      "Cápsula",
    icon:
      Pill,
  },
  {
    id:
      "gota",
    label:
      "Gotas",
    icon:
      Droplet,
  },
  {
    id:
      "injecao",
    label:
      "Injeção",
    icon:
      Syringe,
  },
  {
    id:
      "adesivo",
    label:
      "Adesivo",
    icon:
      StickyNote,
  },
];

// ============================================================
// RECEITA
// ============================================================

function getReceitaBadgeProps(
  tipo?: string
) {
  if (
    !tipo ||
    tipo ===
      "comum"
  ) {
    return null;
  }

  const map:
    Record<
      string,
      {
        label: string;
        colorClass: string;
      }
    > = {
    amarela: {
      label:
        "Receita Amarela",

      colorClass:
        "border-amber-400/30 bg-amber-400/10 text-amber-400",
    },

    azul: {
      label:
        "Receita Azul",

      colorClass:
        "border-blue-400/30 bg-blue-400/10 text-blue-400",
    },

    branca_controle: {
      label:
        "Receita Branca (C)",

      colorClass:
        "border-slate-300/30 bg-slate-400/10 text-slate-300",
    },

    branca: {
      label:
        "Receita Branca",

      colorClass:
        "border-slate-300/30 bg-slate-400/10 text-slate-300",
    },

    especial: {
      label:
        "Receita Especial",

      colorClass:
        "border-purple-400/30 bg-purple-400/10 text-purple-400",
    },
  };

  return (
    map[tipo] || {
      label:
        "Controle especial",

      colorClass:
        "border-blue-400/30 bg-blue-400/10 text-blue-400",
    }
  );
}

// ============================================================
// CONTENT
// ============================================================

function MedicamentoDetalhesContent() {
  const healthIntelligence = useSharedHealthIntelligence();
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

  // VAULT_SAFE_BACK_V71_1
  // WebView/PWA pode abrir a tela sem histórico interno confiável.
  // Tenta o histórico e possui fallback determinístico para a lista.
  const handleSafeBack =
    () => {
      trigger("vibrate");

      if (
        typeof window !== "undefined" &&
        window.history.length > 1
      ) {
        router.back();

        window.setTimeout(
          () => {
            if (
              window.location.pathname.includes(
                "/saude/medicamentos/detalhes"
              )
            ) {
              router.replace(
                "/saude/medicamentos"
              );
            }
          },
          350
        );

        return;
      }

      router.replace(
        "/saude/medicamentos"
      );
    };

  const {
    deleteMedicamento,
    getMedicamento,
    medicamentos:
      medicamentosDaPessoa,
  } =
    useMedicamentos();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    renovacoes,
  } =
    useRenovacoes(
      id ||
        undefined
    );
  const { retiradas } = useRetiradas(id || undefined);

  // ==========================================================
  // ESTADO
  // ==========================================================

  const [
    infoModalOpen,
    setInfoModalOpen,
  ] =
    useState(
      false
    );

  const [
    showAllRenovacoes,
    setShowAllRenovacoes,
  ] =
    useState(
      false
    );

  const [
    toastMessage,
    setToastMessage,
  ] =
    useState<{
      text: string;

      type:
        | "success"
        | "error"
        | "loading";
    } | null>(
      null
    );

  const [
    isMenuFlutuanteOpen,
    setIsMenuFlutuanteOpen,
  ] =
    useState(
      false
    );


  const menuFlutuanteRef =
    useRef<HTMLDivElement>(
      null
    );

  const menuFlutuanteTriggerRef =
    useRef<HTMLButtonElement>(
      null
    );

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] =
    useState(
      false
    );

  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(
      false
    );

  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleteAuthorized, setDeleteAuthorized] = useState(false);
  const {
    authenticate: authenticateDeletion,
    isAvailable: deletionBiometricAvailable,
  } = useBiometric({
    title: "Remover da rotina",
    subtitle: "Preservação do prontuário",
    description: "Confirme sua identidade para continuar.",
    fallbackTitle: "Usar credencial do aparelho",
  });

  const [
    isQuickDoseOpen,
    setIsQuickDoseOpen,
  ] =
    useState(
      false
    );


  const [
    catalogNameSuggestion,
    setCatalogNameSuggestion,
  ] =
    useState<
      MedicationCatalogSearchResult | null
    >(
      null
    );

  const [
    isQualityChecking,
    setIsQualityChecking,
  ] =
    useState(
      false
    );

  const [
    isQualityActionPending,
    setIsQualityActionPending,
  ] =
    useState(
      false
    );

  // ==========================================================
  // MEDICAMENTO
  //
  // O id da URL sozinho nunca autoriza o acesso.
  //
  // A leitura passa pelo hook/repository person-scoped.
  // ==========================================================

  const med =
    useLiveQuery(
      async () => {
        if (
          !id ||
          !activePersonId
        ) {
          return null;
        }

        const item =
          await getMedicamento(
            id
          );

        return (
          item ||
          null
        );
      },
      [
        id,
        activePersonId,
        getMedicamento,
      ]
    );

  // VAULT_MEDICATION_REGULATORY_STABILITY_V92_5
  // Nunca entregar [med] inline ao hook: a nova identidade a cada render
  // reativa seu efeito/setProfiles e forma um ciclo React #185.
  const regulatoryMedicationInput =
    useMemo(
      () =>
        med
          ? [med]
          : [],
      [med]
    );

  const regulatoryProfiles =
    useMedicationRegulatoryProfiles(
      regulatoryMedicationInput
    );

  const catalogIdentities =
    useMedicationCatalogIdentities(
      regulatoryMedicationInput
    );

  const regulatoryProfile =
    med?.id
      ? regulatoryProfiles[med.id]
      : undefined;

  const catalogIdentity =
    med?.id
      ? catalogIdentities[med.id]
      : undefined;

  const regulatorySurface =
    getMedicationRegulatorySurface(
      regulatoryProfile
    );

  // ==========================================================
  // QUALIDADE DO CADASTRO — NOME
  //
  // Busca somente quando o medicamento já existe.
  //
  // A inteligência nunca altera o cadastro silenciosamente.
  // ==========================================================

  useEffect(
    () => {
      const nomeAtual =
        med?.nome?.trim() ??
        "";

      if (
        !med?.id ||
        nomeAtual.length < 4
      ) {
        setCatalogNameSuggestion(
          null
        );

        setIsQualityChecking(
          false
        );

        return;
      }

      let cancelled =
        false;

      const timer =
        window.setTimeout(
          async () => {
            setIsQualityChecking(
              true
            );

            try {
              const results =
                await supabaseMedicationCatalogProvider.searchLight(
                  nomeAtual,
                  {
                    limit:
                      5,
                  }
                );

              if (
                cancelled
              ) {
                return;
              }

              /*
               * Se o catálogo contém correspondência exata,
               * não existe motivo para gerar alerta de nome.
               */
              const normalizedCurrentName =
                normalizeMedicationQualityText(
                  nomeAtual
                );

              // V95.1: matchedText exato pode ser marca, alias ou princípio ativo válido.
              const exact =
                results.find(
                  (
                    result
                  ) =>
                    normalizeMedicationQualityText(
                      result.matchedText
                    ) ===
                      normalizedCurrentName ||
                    normalizeMedicationQualityText(
                      result.canonicalName
                    ) ===
                      normalizedCurrentName
                );

              if (
                exact
              ) {
                setCatalogNameSuggestion(
                  null
                );

                return;
              }

              /*
               * O provider já aplica o threshold fuzzy
               * calibrado anteriormente.
               *
               * Aqui não inventamos um segundo algoritmo.
               */
              const quickSuggestion =
                results[0] ??
                null;

              if (
                !quickSuggestion
              ) {
                setCatalogNameSuggestion(
                  null
                );

                return;
              }

              /*
               * A busca visual foi leve.
               *
               * Só agora hidratamos UM candidato — aquele
               * que realmente poderá virar alerta.
               */
              const hydratedSuggestion =
                await supabaseMedicationCatalogProvider.hydrateQuickResult(
                  quickSuggestion
                );

              if (
                cancelled
              ) {
                return;
              }

              setCatalogNameSuggestion(
                hydratedSuggestion
              );
            } catch (
              error
            ) {
              console.warn(
                "[Medication Intelligence] Não foi possível revisar o nome:",
                error
              );

              if (
                !cancelled
              ) {
                setCatalogNameSuggestion(
                  null
                );
              }
            } finally {
              if (
                !cancelled
              ) {
                setIsQualityChecking(
                  false
                );
              }
            }
          },
          450
        );

      return () => {
        cancelled =
          true;

        window.clearTimeout(
          timer
        );
      };
    },
    [
      med?.id,
      med?.nome,
    ]
  );

  const nameQualityDecision =
    useLiveQuery(
      async () => {
        if (
          !med?.id ||
          !med.user_id ||
          !activePersonId ||
          !catalogNameSuggestion
        ) {
          return null;
        }

        return healthIntelligenceDecisionsRepository.find({
          userId:
            med.user_id,

          personId:
            activePersonId,

          entityType:
            "medicamento",

          entityId:
            med.id,

          issueKey:
            "possible_name_typo",

          detectedValue:
            med.nome,

          suggestedValue:
            catalogNameSuggestion.reference.canonicalName,
        });
      },
      [
        med?.id,
        med?.user_id,
        med?.nome,
        activePersonId,
        catalogNameSuggestion
          ?.reference
          .canonicalName,
      ]
    );

  // Uma única assinatura Dexie acompanha as relações da tela. Além de reduzir
  // re-renderizações, a projeção valida conta e pessoa antes de expor vínculos.
  const relationSnapshot = useLiveQuery(
    () => med?.id && med.user_id && activePersonId
      ? loadMedicationDetailRelations({
          medicationId: med.id,
          userId: med.user_id,
          personId: activePersonId,
          doctorId: med.medico_id,
          discontinuationDoctorId: med.medico_descontinuacao_id,
          hospitalId: med.hospital_id,
          locationId: med.local_id,
          pharmacyId: med.farmacia_id,
          documentId: med.document_id,
          treatmentIds: med.tratamento_ids,
          cidIds: med.cid_ids,
        })
      : undefined,
    [med?.id, med?.user_id, activePersonId, med?.medico_id, med?.medico_descontinuacao_id, med?.hospital_id, med?.local_id, med?.farmacia_id, med?.document_id, med?.tratamento_ids, med?.cid_ids]
  );
  const medico = relationSnapshot?.medico;
  const medicoDescontinuacao = relationSnapshot?.medicoDescontinuacao;
  const hospital = relationSnapshot?.hospital;
  const local = relationSnapshot?.local;
  const farmacia = relationSnapshot?.farmacia;
  const documento = relationSnapshot?.documento;
  const doseLogs = relationSnapshot?.doseLogs ?? [];
  const tratamentos = relationSnapshot?.tratamentos ?? [];
  const cids = relationSnapshot?.cids ?? [];
  const farmaciasMap = relationSnapshot?.farmaciasMap ?? EMPTY_PHARMACY_NAME_MAP;

  // ==========================================================
  // LOADING / NOT FOUND
  //
  // Todos os Hooks já foram executados acima.
  // ==========================================================

  // ==========================================================
  // MENU — HOOK DE FECHAMENTO
  //
  // IMPORTANTE:
  // precisa permanecer antes de qualquer return condicional
  // para preservar a ordem dos Hooks entre renders.
  // ==========================================================

  useEffect(
    () => {
      if (
        !isMenuFlutuanteOpen
      ) {
        return;
      }

      const handlePointerDown =
        (
          event:
            PointerEvent
        ) => {
          const target =
            event.target as Node;

          if (
            menuFlutuanteRef.current?.contains(
              target
            ) ||
            menuFlutuanteTriggerRef.current?.contains(
              target
            )
          ) {
            return;
          }

          setIsMenuFlutuanteOpen(
            false
          );
        };

      const handleKeyDown =
        (
          event:
            KeyboardEvent
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            setIsMenuFlutuanteOpen(
              false
            );
          }
        };

      document.addEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        document.removeEventListener(
          "pointerdown",
          handlePointerDown
        );

        document.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      isMenuFlutuanteOpen,
    ]
  );

  // VAULT_MEDICATION_DETAIL_DIRECT_NAVIGATION_V92_3
  // Detalhes segue o mesmo contrato das demais telas de detalhe:
  // cada ação navega diretamente pelo App Router.
  // Não existe helper nativo, reload, retry ou normalização de rota.
  const menuOptions = [
    {
      id: "editar-medicamento",
      label: "Editar medicamento",
      icon: Edit3,
      path: `/saude/medicamentos/editar?id=${id}`,
    },
    {
      id:
        "nova-renovacao",

      label:
        "Registrar aquisição",

      icon:
        FileWarning,

      path:
        `/saude/renovacao/nova?medicamento_id=${id}&return_to=${encodeURIComponent(`/saude/medicamentos/detalhes?id=${id}`)}`,
    },

    ...(
      med?.tipo_uso === "continuo" ||
      (med?.tipo_receita && med.tipo_receita !== "comum")
        ? [
            {
              id: "nova-receita",
              label: "Adicionar nova receita",
              icon: FileText,
              path: `/saude/renovacao/nova-receita?medicamento_id=${id}&return_to=${encodeURIComponent(`/saude/medicamentos/detalhes?id=${id}`)}`,
            },
          ]
        : []
    ),

    // V136 MEDICATION SUPPLY: contextual access to existing supply records.
    { id: "fornecimento-relacional", label: "Fornecimento, SUS e aquisições", icon: Package, path: `/saude/fornecimento?medicamento_id=${encodeURIComponent(id || "")}` },
    {
      id:
        "duplicar-medicamento",

      label:
        "Duplicar Medicamento",

      icon:
        Copy,

      path:
        `/saude/medicamentos/novo?duplicar=${id}`,
    },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };


  // V299: React hooks must run on EVERY render, even while the medication loads.
  // Previously useMemo was below the loading/not-found/deleting returns and
  // crashed the details page as soon as the Dexie query returned a medication.
  const journeyToday = getLocalTodayISO();
  const journeySnapshot = useMemo(() => med ? buildMedicationJourneySnapshot({
    medication: med,
    renewals: renovacoes,
    withdrawals: retiradas,
    today: journeyToday,
  }) : {
    prescriptions: 0,
    completedAcquisitions: 0,
    plannedAcquisitions: 0,
    pendingWithdrawals: 0,
    overdueWithdrawals: 0,
    latestPrescriptionDate: null,
    latestAcquisitionDate: null,
    nextPlannedAcquisitionDate: null,
    nextWithdrawalDate: null,
  }, [med, renovacoes, retiradas, journeyToday]);

  if (
    med ===
    undefined
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (
    med ===
      null ||
    !activePersonId
  ) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral/10 text-coral">
          <AlertTriangle
            size={
              26
            }
          />
        </div>

        <p className="mt-4 font-semibold text-ink-primary">
          Medicamento não encontrado
        </p>

        <p className="mt-1 max-w-sm text-sm text-ink-muted">
          O registro não existe ou não pertence à pessoa ativa.
        </p>

        <button
          type="button"
          onClick={
            () =>
              router.replace(
                "/saude/medicamentos"
              )
          }
          className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
        >
          Voltar aos medicamentos
        </button>
      </main>
    );
  }

  if (
    isDeleting
  ) {
    return (
      <div className="min-h-screen bg-void" />
    );
  }

  // ==========================================================
  // DADOS DERIVADOS
  // ==========================================================

  const isTemporary = med.tipo_uso === "temporario";
  const isSOS = med.tipo_uso === "esporadico" || med.tipo_uso === "sos";

  const estoqueInfo =
    computeEstoqueInfo(
      med
    );

  const temEstoque =
    typeof med.estoque_quantidade ===
      "number" &&
    Number.isFinite(
      med.estoque_quantidade
    );

  const saldoRegistrado =
    temEstoque
      ? Number(
          med.estoque_quantidade
        )
      : null;

  const quantidadeDisponivel =
    estoqueInfo
      ?.quantidadeRestante ??
    (
      saldoRegistrado !==
      null
        ? Math.max(
            0,
            saldoRegistrado
          )
        : 0
    );

  const estoqueNegativo =
    Boolean(
      estoqueInfo
        ?.estoqueNegativo
    );

  const unidadePorDoseRaw =
    Number(
      med.estoque_unidade_por_dose
    );

  const unidadePorDose =
    Number.isFinite(
      unidadePorDoseRaw
    ) &&
    unidadePorDoseRaw >
      0
      ? unidadePorDoseRaw
      : null;

  const dosesDisponiveis =
    estoqueInfo &&
    estoqueInfo.estimativaDosesDisponivel
      ? estoqueInfo.dosesRestantes
      : null;

  const validadeReceitaAtual = analisarValidadeReceita(
    med.data_receita,
    med.tipo_receita || "comum"
  );

  const alertaInteligente =
    sugerirRenovacao(
      med
    );

  const accessAction = medicationAccessAction(
    alertaInteligente,
    med.id!,
    `/saude/medicamentos/detalhes?id=${med.id}`,
    {
      tipoUso: med.tipo_uso,
      tipoAquisicao: med.tipo_aquisicao,
      scheduledWithdrawalId: scheduledWithdrawalForOwnedMedication(retiradas, med)?.id,
    }
  );

  const diasAteRenovacao =
    med.proxima_renovacao
      ? getDaysUntil(
          med.proxima_renovacao
        )
      : null;

  const comportamento =
    analisarComportamentoUso(
      med,
      doseLogs
    );

  // ==========================================================
  // DOSES
  // ==========================================================

  const hoje =
    getLocalTodayISO();

  const careDecision = decideMedicationCarePath({
    medication: med,
    renewals: renovacoes,
    withdrawal: scheduledWithdrawalForOwnedMedication(retiradas, med),
    today: hoje,
    needsPrescription: Boolean(alertaInteligente.deveRenovar && alertaInteligente.motivo === "receita"),
    needsStock: saldoRegistrado !== null && saldoRegistrado <= 5,
  });
  const carePresentation = medicationCarePresentation(careDecision, alertaInteligente.urgencia);
  const brainCareItem = healthIntelligence.careCommand?.plan.items.find(item => item.medicationId === med.id) ?? null;
  const supplyRoute = healthIntelligence.careCommand?.readiness.items.find(item => item.medicationId === med.id)?.route ?? null;
  const brainCareAction = brainCareItem && (brainCareItem.lane === "now" || brainCareItem.lane === "prepare") ? brainCareItem : null;
  // VAULT_V328_CARE_NAVIGATION: a self-referencing Brain action reveals a useful
  // detail section instead of router.push() silently re-opening this same URL.
  const navigateCareAction = (href: string, title: string, reason: string) => {
    const destination = resolveMedicationCareNavigation({ href, currentMedicationId: med.id!, title, reason });
    trigger("vibrate");
    if (destination.kind === "route") {
      router.push(destination.href);
      return;
    }
    if (typeof window !== "undefined") {
      if (window.location.hash === `#${destination.sectionId}`) {
        window.dispatchEvent(new Event("hashchange"));
      } else {
        window.location.hash = destination.sectionId;
      }
      document.getElementById(destination.sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const seteDiasAtras =
    getDateDaysAgoISO(
      6
    );

  const dosesTomadas =
    doseLogs.filter(
      (log) =>
        Boolean(
          log.tomado_em
        )
    );

  const dosesTomadasHoje =
    dosesTomadas.filter(
      (log) =>
        log.data ===
        hoje
    );

  const dosesTomadasUltimos7Dias =
    dosesTomadas.filter(
      (log) =>
        Boolean(
          log.data &&
            log.data >=
              seteDiasAtras &&
            log.data <=
              hoje
        )
    );

  const quantidadeHoje =
    summarizeKnownQuantity(
      dosesTomadasHoje
    );

  const quantidadeUltimos7Dias =
    summarizeKnownQuantity(
      dosesTomadasUltimos7Dias
    );

  const ultimaDose =
    [
      ...dosesTomadas,
    ]
      .sort(
        (
          first,
          second
        ) =>
          getDoseSortTimestamp(
            second
          ) -
          getDoseSortTimestamp(
            first
          )
      )[0] ||
    null;

  const logsHoje =
    doseLogs.filter(
      (log) =>
        log.data ===
        hoje
    );

  const horariosConfigurados = Array.from(new Set(
    (isTemporary
      ? logsHoje.filter(log => log.dose_kind === "planned").map(log => log.horario)
      : med.tipo_uso === "continuo" && Array.isArray(med.estoque_horarios)
        ? med.estoque_horarios
        : [])
      .map(horario => String(horario || "").trim())
      .filter(Boolean)
  ));

  const horariosTomadosHoje =
    new Set(
      logsHoje
        .filter(
          (log) =>
            Boolean(
              log.tomado_em
            ) &&
            Boolean(
              log.horario
            ) &&
            horariosConfigurados.includes(
              log.horario!
            )
        )
        .map(
          (log) =>
            log.horario!
        )
    );

  const horariosIgnoradosHoje =
    new Set(
      logsHoje
        .filter(
          (log) =>
            Boolean(
              log.ignorado_em
            ) &&
            Boolean(
              log.horario
            ) &&
            horariosConfigurados.includes(
              log.horario!
            )
        )
        .map(
          (log) =>
            log.horario!
        )
    );

  const dosesEsperadasHoje =
    (med.tipo_uso === "continuo" || isTemporary)
      ? horariosConfigurados.length
      : 0;

  const dosesTomadasProgramadasHoje =
    horariosConfigurados.filter(
      (horario) =>
        horariosTomadosHoje.has(
          horario
        )
    ).length;

  const dosesIgnoradasProgramadasHoje =
    horariosConfigurados.filter(
      (horario) =>
        horariosIgnoradosHoje.has(
          horario
        )
    ).length;

  const dosesResolvidasHoje =
    horariosConfigurados.filter(
      (horario) =>
        horariosTomadosHoje.has(
          horario
        ) ||
        horariosIgnoradosHoje.has(
          horario
        )
    ).length;

  // ==========================================================
  // SUBSTITUTO
  // ==========================================================

  const medicamentoSubstituto =
    med.substituido_por_id
      ? (
          medicamentosDaPessoa ||
          []
        ).find(
          (item) =>
            item.id ===
            med.substituido_por_id
        )
      : undefined;

  // ==========================================================
  // OUTROS MEDICAMENTOS DO MÉDICO
  // ==========================================================

  const outrosMedsDesteMedico =
    med.medico_id
      ? (
          medicamentosDaPessoa ||
          []
        ).filter(
          (item) =>
            item.medico_id ===
              med.medico_id &&
            item.id !==
              med.id &&
            item.status !==
              "descontinuado"
        )
      : [];

  // ==========================================================
  // ESTOQUE / GOTAS
  // ==========================================================

  const formatoNormalizado =
    String(
      med.formato ||
        ""
    )
      .trim()
      .toLowerCase();

  const formaFarmaceuticaNormalizada =
    String(
      med.forma_farmaceutica ||
        ""
    )
      .trim()
      .toLowerCase();

  const isGota =
    formatoNormalizado.includes(
      "gota"
    ) ||
    formaFarmaceuticaNormalizada.includes(
      "gota"
    );

  const unidadeEstoque =
    String(
      med.estoque_unidade_medida ||
        ""
    )
      .trim()
      .toLowerCase();

  const gotasPorMlRaw =
    Number(
      med.estoque_gotas_por_ml
    );

  const gotasPorMl =
    Number.isFinite(
      gotasPorMlRaw
    ) &&
    gotasPorMlRaw >
      0
      ? gotasPorMlRaw
      : null;

  /*
   * Só convertemos para ml quando o saldo está explicitamente
   * armazenado em gotas.
   *
   * Se o estoque já estiver em ml, ele já é exibido como ml.
   */
  const estoqueEquivalenteMl =
    isGota &&
    unidadeEstoque.includes(
      "gota"
    ) &&
    gotasPorMl !==
      null
      ? quantidadeDisponivel /
        gotasPorMl
      : null;

  const getEstoqueStyle =
    () => {
      if (
        estoqueNegativo
      ) {
        return {
          color:
            "text-coral font-bold",

          icon:
            AlertTriangle,

          label:
            "RECONCILIAR",

          bg:
            "bg-coral/10",

          border:
            "border-coral/20",
        };
      }

      if (
        quantidadeDisponivel <=
        0
      ) {
        return {
          color:
            "text-coral font-bold",

          icon:
            AlertTriangle,

          label:
            "SEM ESTOQUE",

          bg:
            "bg-coral/10",

          border:
            "border-coral/20",
        };
      }

      if (
        !isSOS &&
        estoqueInfo?.diasRestantes !==
          null &&
        estoqueInfo?.diasRestantes !==
          undefined
      ) {
        if (
          estoqueInfo.diasRestantes <=
          2
        ) {
          return {
            color:
              "text-coral font-bold",

            icon:
              AlertTriangle,

            label:
              "CRÍTICO",

            bg:
              "bg-coral/10",

            border:
              "border-coral/20",
          };
        }

        if (
          estoqueInfo.diasRestantes <=
          5
        ) {
          return {
            color:
              "text-amber-400 font-semibold",

            icon:
              AlertTriangle,

            label:
              "BAIXO",

            bg:
              "bg-amber-400/10",

            border:
              "border-amber-400/20",
          };
        }
      }

      if (
        isSOS &&
        dosesDisponiveis !==
          null
      ) {
        if (
          dosesDisponiveis <=
          2
        ) {
          return {
            color:
              "text-coral font-bold",

            icon:
              AlertTriangle,

            label:
              "CRÍTICO",

            bg:
              "bg-coral/10",

            border:
              "border-coral/20",
          };
        }

        if (
          dosesDisponiveis <=
          5
        ) {
          return {
            color:
              "text-amber-400 font-semibold",

            icon:
              AlertTriangle,

            label:
              "BAIXO",

            bg:
              "bg-amber-400/10",

            border:
              "border-amber-400/20",
          };
        }
      }

      if (
        !estoqueInfo
          ?.estimativaDosesDisponivel
      ) {
        return {
          color:
            "text-ice font-semibold",

          icon:
            Info,

          label:
            "SEM ESTIMATIVA",

          bg:
            "bg-ice/10",

          border:
            "border-ice/20",
        };
      }

      return {
        color:
          "text-emerald-400 font-bold",

        icon:
          CheckCircle2,

        label:
          "OK",

        bg:
          "bg-emerald-400/10",

        border:
          "border-emerald-400/20",
      };
    };

  const estoqueStatus =
    getEstoqueStyle();

  const EstoqueStatusIcon =
    estoqueStatus.icon;

  // ==========================================================
  // MELHOR FARMÁCIA
  //
  // Não usamos useMemo aqui para não criar Hook depois de
  // retornos condicionais.
  // ==========================================================

  const diaFinanceiro = getLocalTodayISO();
  // V221: somente aquisicoes efetivadas e pagas; nao contar receitas nem agendamentos.
  const medicationCosts = summarizeMedicationCosts(renovacoes, diaFinanceiro);
  const comprasPagas = medicationCosts.realized;

  const rankingFarmacias =
    analisarMelhorFarmacia(
      comprasPagas
    );

  const melhorFarmacia =
    rankingFarmacias.length >
      0
      ? rankingFarmacias[
          0
        ]
      : null;

  // ==========================================================
  // RECEITA
  // ==========================================================

  const tipoReceitaLabel =
    TIPO_RECEITA_LABELS[
      med.tipo_receita as keyof typeof TIPO_RECEITA_LABELS
    ] ||
    med.tipo_receita ||
    "Comum";

  const receitaBadge =
    getReceitaBadgeProps(
      med.tipo_receita
    );

  const validadeReceitaReferencia =
    VALIDADE_RECEITA_DIAS[
      (
        med.tipo_receita as keyof typeof VALIDADE_RECEITA_DIAS
      ) ||
        "comum"
    ];

  // ==========================================================
  // RENOVAÇÕES
  // ==========================================================

  const ultimaRenovacao = renovacoes.find((item) =>
    !isPrescriptionOnly(item) && !isFutureAcquisition(item, diaFinanceiro)
  ) ?? null;

  const ultimaRenovacaoSemCusto =
    ultimaRenovacao
      ? (
          ultimaRenovacao.tipo_aquisicao ===
            "gratuito" ||
          ultimaRenovacao.tipo_aquisicao ===
            "sus"
        )
      : false;

  const displayedRenovacoes =
    showAllRenovacoes
      ? renovacoes
      : renovacoes.slice(
          0,
          3
        );

  // ==========================================================
  // FINANCEIRO
  // ==========================================================

  const renovacoesPagas =
    comprasPagas;

  const custoHistoricoRenovacoes = medicationCosts.realizedTotal;

  const precoMedioRenovacoes = medicationCosts.realizedAverage ?? 0;
  const hasFinancialSection = renovacoesPagas.length > 0 || medicationCosts.planned.length > 0 || typeof med.preco === "number";
  const hasRoutineSection = med.status !== "descontinuado" || isSOS;

  // ==========================================================
  // IDENTIDADE
  // ==========================================================


  const color1 =
    med.cores &&
    med.cores.length >
      0
      ? med.cores[
          0
        ]
      : "#60A5FA";

  const color2 =
    med.cores &&
    med.cores.length >
      1
      ? med.cores[
          1
        ]
      : undefined;

  const personAccent =
    "var(--person-accent, #38BDF8)";

  // ==========================================================
  // QUALIDADE DO CADASTRO — AÇÕES
  // ==========================================================

  const buildNameQualityTarget =
    () => {
      if (
        !med?.id ||
        !med.user_id ||
        !activePersonId ||
        !catalogNameSuggestion
      ) {
        return null;
      }

      return {
        userId:
          med.user_id,

        personId:
          activePersonId,

        entityType:
          "medicamento",

        entityId:
          med.id,

        issueKey:
          "possible_name_typo",

        detectedValue:
          med.nome,

        suggestedValue:
          catalogNameSuggestion.reference.canonicalName,
      };
    };

  const handleAcceptNameCorrection =
    async () => {
      const target =
        buildNameQualityTarget();

      if (
        !target ||
        !med?.id ||
        !activePersonId ||
        !catalogNameSuggestion
      ) {
        return;
      }

      setIsQualityActionPending(
        true
      );

      setToastMessage({
        text:
          "Corrigindo cadastro...",

        type:
          "loading",
      });

      try {
        const suggestedName =
          catalogNameSuggestion
            .reference
            .canonicalName;

        /*
         * Atualização passa pelo repository canônico:
         * Dexie + syncQueue + notificações.
         */
        await medicamentosRepository.update(
          med.id,
          activePersonId,
          {
            nome:
              suggestedName,
          }
        );

        await healthIntelligenceDecisionsRepository.accept(
          target
        );

        setCatalogNameSuggestion(
          null
        );

        trigger(
          "success"
        );

        setToastMessage({
          text:
            "Nome corrigido com sucesso!",

          type:
            "success",
        });

        setTimeout(
          () =>
            setToastMessage(
              null
            ),
          3000
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao corrigir nome do medicamento:",
          error
        );

        trigger(
          "error"
        );

        setToastMessage({
          text:
            "Não foi possível corrigir o cadastro.",

          type:
            "error",
        });

        setTimeout(
          () =>
            setToastMessage(
              null
            ),
          3000
        );
      } finally {
        setIsQualityActionPending(
          false
        );
      }
    };

  const handleDismissNameCorrection =
    async () => {
      const target =
        buildNameQualityTarget();

      if (
        !target
      ) {
        return;
      }

      setIsQualityActionPending(
        true
      );

      try {
        await healthIntelligenceDecisionsRepository.dismiss(
          target
        );

        trigger(
          "success"
        );

        setToastMessage({
          text:
            "Revisado. O Vault manterá o nome atual.",

          type:
            "success",
        });

        setTimeout(
          () =>
            setToastMessage(
              null
            ),
          3000
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao registrar decisão da inteligência:",
          error
        );

        trigger(
          "error"
        );

        setToastMessage({
          text:
            "Não foi possível registrar sua decisão.",

          type:
            "error",
        });

        setTimeout(
          () =>
            setToastMessage(
              null
            ),
          3000
        );
      } finally {
        setIsQualityActionPending(
          false
        );
      }
    };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    async () => {
      if (
        !med.id
      ) {
        return;
      }

      setIsDeleting(
        true
      );

      setToastMessage({
        text:
          "Removendo medicamento da rotina...",

        type:
          "loading",
      });

      try {
        await deleteMedicamento(
          med.id
        );

        trigger(
          "success"
        );

        setToastMessage({
          text:
            "Medicamento removido da rotina; histórico preservado.",

          type:
            "success",
        });

        router.replace(
          "/saude/medicamentos"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao excluir medicamento:",
          error
        );

        trigger(
          "error"
        );

        setToastMessage({
          text:
            "Erro ao remover medicamento da rotina.",

          type:
            "error",
        });

        setTimeout(
          () =>
            setToastMessage(
              null
            ),
          3000
        );

        setIsDeleting(
          false
        );

        setShowDeleteModal(
          false
        );
      }
    };

  const requestDelete = async () => {
    trigger("vibrate");
    setDeletePhrase("");
    setDeleteAuthorized(false);

    if (isVaultNative() && deletionBiometricAvailable) {
      const authenticated = await authenticateDeletion();
      if (!authenticated) {
        setToastMessage({
          text: "Exclusão cancelada: identidade não confirmada.",
          type: "error",
        });
        window.setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      setDeleteAuthorized(true);
    }

    setShowDeleteModal(true);
  };

  // ==========================================================
  // AÇÕES
  // ==========================================================

  const abrirNoMapa =
    (
      enderecoStr?:
        string
    ) => {
      if (
        !enderecoStr
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          enderecoStr
        )}`,
        "_blank",
        "noopener,noreferrer"
      );
    };

  const abrirAnexo =
    () => {
      const url =
        documento
          ?.attachments?.[
          0
        ]?.url;

      if (!url) {
        return;
      }

      trigger(
        "vibrate"
      );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    };

  const compartilharWhatsApp =
    () => {
      trigger(
        "vibrate"
      );

      const linhas = [
        `*${med.nome}*`,

        `Dosagem: ${med.dosagem}`,

        `Uso: ${
          isTemporary ? "Temporário / por período" : isSOS ? "Esporádico / SOS" : "Contínuo"
        }`,
      ];

      if (
        med.proxima_renovacao
      ) {
        linhas.push(
          `Próxima renovação: ${formatDate(
            med.proxima_renovacao
          )}`
        );
      }

      if (
        saldoRegistrado !==
        null
      ) {
        linhas.push(
          `Estoque informado: ${formatQuantidade(
            Math.max(
              0,
              saldoRegistrado
            )
          )} ${
            med.estoque_unidade_medida ||
            "unidade(s)"
          }`
        );
      }

      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          linhas.join(
            "\n"
          )
        )}`,
        "_blank",
        "noopener,noreferrer"
      );
    };

  const copiarInfo =
    async () => {
      trigger(
        "vibrate"
      );

      const linhas = [
        med.nome,

        `Dosagem: ${med.dosagem}`,

        `Uso: ${
          isTemporary ? "Temporário / por período" : isSOS ? "Esporádico / SOS" : "Contínuo"
        }`,
      ];

      if (
        med.proxima_renovacao
      ) {
        linhas.push(
          `Próxima renovação: ${formatDate(
            med.proxima_renovacao
          )}`
        );
      }

      if (
        saldoRegistrado !==
        null
      ) {
        linhas.push(
          `Estoque: ${formatQuantidade(
            Math.max(
              0,
              saldoRegistrado
            )
          )} ${
            med.estoque_unidade_medida ||
            "unidade(s)"
          }`
        );
      }

      try {
        await navigator.clipboard.writeText(
          linhas.join(
            "\n"
          )
        );

        setToastMessage({
          text:
            "Informações copiadas!",

          type:
            "success",
        });
      } catch {
        setToastMessage({
          text:
            "Não foi possível copiar as informações.",

          type:
            "error",
        });
      }

      setTimeout(
        () =>
          setToastMessage(
            null
          ),
        3000
      );
    };

  const ligar =
    (
      telefone?:
        string
    ) => {
      if (
        !telefone
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      window.open(
        `tel:${telefone}`
      );
    };

  const abrirQuickDose =
    () => {
      trigger(
        "vibrate"
      );

      setIsQuickDoseOpen(
        true
      );
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        {/* ====================================================
            TOAST
            ==================================================== */}

        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{
                opacity:
                  0,

                y:
                  50,

                scale:
                  0.9,
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
                  20,

                scale:
                  0.9,
              }}
              className="fixed bottom-24 left-5 right-5 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-ice/30 bg-surface p-4 shadow-vault backdrop-blur-xl"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  toastMessage.type ===
                  "error"
                    ? "bg-coral/10 text-coral"
                    : "bg-ice/15 text-ice"
                }`}
              >
                {toastMessage.type ===
                  "success" && (
                  <Check
                    size={
                      20
                    }
                  />
                )}

                {toastMessage.type ===
                  "loading" && (
                  <Activity
                    size={
                      20
                    }
                    className="animate-pulse"
                  />
                )}

                {toastMessage.type ===
                  "error" && (
                  <AlertTriangle
                    size={
                      20
                    }
                  />
                )}
              </div>

              <p className="text-sm font-semibold text-ink-primary">
                {
                  toastMessage.text
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/85 px-5 pb-3 pt-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  handleSafeBack();
                }
              }
              aria-label="Voltar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-transform active:scale-95"
            >
              <ArrowLeft
                size={
                  18
                }
              />
            </button>

            <div className="min-w-0 flex-1 px-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-ice/80">
                Medicamento
              </p>

              <h1 className="truncate text-base font-semibold text-ink-primary">
                Detalhes
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={
                  copiarInfo
                }
                aria-label="Copiar informações"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised text-ink-muted transition-all hover:text-ice active:scale-95"
              >
                <Copy
                  size={
                    17
                  }
                />
              </button>

              <button
                type="button"
                onClick={
                  compartilharWhatsApp
                }
                aria-label="Compartilhar no WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-400 transition-all active:scale-95"
              >
                <Share2
                  size={
                    17
                  }
                />
              </button>

              <button
                ref={
                  menuFlutuanteTriggerRef
                }
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setIsMenuFlutuanteOpen(
                      (
                        previous
                      ) =>
                        !previous
                    );
                  }
                }
                aria-label="Mais ações"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95"
              >
                <MoreHorizontal
                  size={
                    18
                  }
                />
              </button>

              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    router.push(`/saude/medicamentos/editar?id=${id}`);
                  }
                }
                aria-label="Editar medicamento"
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised text-ice transition-all active:scale-95 sm:flex"
              >
                <Edit3
                  size={
                    17
                  }
                />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isMenuFlutuanteOpen && (
              <>
                <motion.button
                  type="button"
                  aria-label="Fechar menu"
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
                  onPointerDown={
                    () =>
                      setIsMenuFlutuanteOpen(
                        false
                      )
                  }
                  className="fixed inset-0 z-40 cursor-default bg-black/40 backdrop-blur-sm"
                />

                <motion.div
                  ref={
                    menuFlutuanteRef
                  }
                  onPointerDown={
                    (
                      event
                    ) =>
                      event.stopPropagation()
                  }
                  initial={{
                    opacity:
                      0,

                    y:
                      8,

                    scale:
                      0.96,
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
                      8,

                    scale:
                      0.96,
                  }}
                  className="absolute right-5 top-[68px] z-50 w-60 overflow-hidden rounded-[18px] border border-surface-border/60 bg-surface p-1.5 shadow-2xl"
                >
                  <div className="px-3 pb-2 pt-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-faint">
                      Ações
                    </p>
                  </div>

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
                          onClick={
                            () =>
                              handleMenuOptionClick(
                                option.path
                              )
                          }
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-surface-raised active:scale-[0.98]"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                            <Icon
                              size={
                                16
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

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuFlutuanteOpen(false);
                      void requestDelete();
                    }}
                    className="mt-1 flex w-full items-center gap-3 rounded-2xl border-t border-surface-border/50 px-3 py-2.5 text-left text-coral transition-colors hover:bg-coral/10 active:scale-[0.98]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
                      <Trash2 size={16} />
                    </div>
                    <span className="text-sm font-medium">Remover da rotina</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </header>



        <div className="mx-auto max-w-3xl space-y-3 px-4 pt-3 sm:px-5">
          <MedicationDetailNavigation hasRoutine={hasRoutineSection} hasStock={Boolean(temEstoque && (med.status !== "descontinuado" || isSOS))} hasFinancial={hasFinancialSection} historyCount={renovacoes.length}/>
          <span id="medicamento-agora" className="block scroll-mt-24" aria-hidden="true"/>
          {/* VAULT_MEDICATION_HIERARCHY_V72 */}
          {/* ==================================================
              HERO
              ================================================== */}

          <section className="relative overflow-hidden rounded-[18px] border border-surface-border/70 bg-surface shadow-sm">
            <div
              className="absolute bottom-0 left-0 top-0 w-1.5"
              style={{
                backgroundColor:
                  med.status ===
                  "descontinuado"
                    ? "#fb7185"
                    : regulatorySurface.rail,
              }}
            />

            <div className="p-3 pl-4 sm:p-4 sm:pl-5">
              <div className="flex min-w-0 items-start gap-3">
                <ListIcon
                  color={
                    color1
                  }
                  color2={
                    color2
                  }
                  isGradient={
                    Boolean(
                      color2
                    )
                  }
                  size={
                    32
                  }
                  icon={
                    <MedicationFormatIcon formato={med.formato} cores={med.cores} size={30} />
                  }
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-lg font-bold uppercase tracking-wide text-ink-primary sm:text-xl">
                      {
                        med.nome
                      }
                    </h2>

                    {med.status ===
                      "descontinuado" && (
                      <span className="rounded-full border border-coral/20 bg-coral/10 px-2 py-0.5 text-[9px] font-bold uppercase text-coral">
                        {isSOS
                          ? "Tratamento suspenso · SOS atual"
                          : "Suspenso"}
                      </span>
                    )}

                    {regulatoryProfile && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${regulatorySurface.badgeClass}`}
                        title={regulatoryProfile.detail}
                      >
                        {regulatoryProfile.label}
                        {!regulatoryProfile.verified &&
                        regulatoryProfile.tone !==
                          "unknown"
                          ? " · cadastro"
                          : ""}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-medium text-ink-muted">
                    {med.dosagem}
                    <span>
                      {" "}•{" "}
                      {isTemporary ? "Uso Temporário / Por período" : isSOS ? "Uso Esporádico / SOS" : "Uso Contínuo"}
                    </span>
                  </p>

                  {catalogIdentity && catalogIdentity.authorityState !== "unvalidated" && (
                    <details className="group mt-2 rounded-xl border border-surface-border/60 bg-void/20 px-3 py-1">
                      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 py-2 text-left">
                        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-ice">
                          Identidade farmacêutica
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                          catalogIdentity.authorityState === "possible_divergence"
                            ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                            : "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                        }`}>
                          {catalogIdentity.authorityLabel}
                        </span>
                      <span className="ml-auto text-[10px] font-medium text-ice/80 group-open:hidden">Ver ficha</span>
                      </summary>

                      {catalogIdentity.activeIngredients.length > 0 && (
                        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                          <span className="text-ink-muted/60">Princípio ativo · </span>
                          {catalogIdentity.activeIngredients.join(" + ")}
                        </p>
                      )}

                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ink-muted/70">
                        <span>{catalogIdentity.referenceType === "product" ? "Produto regulatório" : "Substância de referência"}</span>
                        {catalogIdentity.registrationNumber && <span>Registro {catalogIdentity.registrationNumber}</span>}
                        {catalogIdentity.presentationCount > 0 && <span>{catalogIdentity.presentationCount} apresentação{catalogIdentity.presentationCount === 1 ? "" : "ões"}</span>}
                        {catalogIdentity.sourceLabel && <span>Fonte · {catalogIdentity.sourceLabel}</span>}
                      </div>
                    </details>
                  )}

                  {tratamentos.length >
                    0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tratamentos.map(
                        (
                          tratamento:
                            Tratamento
                        ) => (
                          <span
                            key={
                              tratamento.id
                            }
                            className="rounded-full border border-surface-border bg-surface-raised px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-ink-muted"
                          >
                            {
                              tratamento.nome
                            }
                          </span>
                        )
                      )}
                    </div>
                  )}

                  {cids.length >
                    0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {cids.map(
                        (
                          cid:
                            Cid
                        ) => {
                          const theme =
                            getClinicalTheme(
                              cid.descricao ||
                                cid.codigo
                            );

                          const Icon =
                            theme.icon;

                          return (
                            <span
                              key={
                                cid.id
                              }
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${theme.tagClass}`}
                            >
                              <Icon
                                size={
                                  10
                                }
                              />

                              {
                                cid.codigo
                              }
                            </span>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* VAULT_V320_QUICK_DOSE_TOP: same clinical owner/handler, moved above analytic sections */}
          {(med.status !== "descontinuado" || isSOS) && (
            <div className="rounded-[14px] border border-emerald-400/15 bg-emerald-400/[0.025] p-1.5">
                <button
                  type="button"
                  onClick={
                    abrirQuickDose
                  }
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-void transition-all active:scale-[0.98]"
                >
                  <Zap
                    size={
                      18
                    }
                    fill="currentColor"
                  />

                  {isSOS ? "Registrar uso SOS" : isTemporary ? "Registrar dose do período" : "Registrar dose"}
                </button>
            </div>
          )}

          {(careDecision.stage !== "stable" || brainCareAction) && (
            <section className="rounded-[18px] border border-surface-border/70 bg-gradient-to-br from-surface-raised/70 via-surface to-surface p-3">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${carePresentation.badgeClass}`}>
                  <Activity size={17}/>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-ink-muted">Linha de cuidado</p>
                    <MedicationDecisionAuthority stage={careDecision.stage} />
                  </div>
                  <h2 className="mt-1 text-sm font-bold text-ink-primary">{brainCareAction?.title || careDecision.label}</h2>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">{brainCareAction?.reason || careDecision.explanation}</p>
                  {/* V332_CARE_EVIDENCE_DISCLOSURE: full evidence stays available, action stays visible. */}
                  <details className="mt-2 rounded-xl border border-surface-border/40 bg-surface/30 px-2.5 py-1.5">
                    <summary className="min-h-9 cursor-pointer py-1.5 text-[10px] font-semibold text-ink-secondary">Ver evidências e origem</summary>
                    <MedicationDecisionEvidenceContext
                      source={brainCareAction ? "brain" : "record"}
                      routeRecorded={Boolean(supplyRoute && supplyRoute.mode !== "none")}
                      evidenceCount={(brainCareAction?.evidence || careDecision.evidence).length}
                      stage={careDecision.stage}
                    />
                    <div className="flex flex-wrap gap-1.5 border-t border-surface-border/40 py-2">
{(brainCareAction?.evidence || careDecision.evidence).slice(0,3).map(item=><span key={item} className="rounded-lg border border-surface-border/70 bg-surface-raised px-2 py-1 text-[9px] text-ink-muted">{item}</span>)}
                      {(brainCareAction?.evidence || careDecision.evidence).slice(3).map((item,index)=><span key={`${index + 3}-${item}`} className="rounded-lg border border-surface-border/70 bg-surface-raised px-2 py-1 text-[9px] text-ink-muted">{item}</span>)}
                      {supplyRoute && supplyRoute.mode !== "none" && <span className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.045] px-2 py-1 text-[9px] text-emerald-200">Origem: {supplyRoute.labels.join(" + ")}</span>}
                    </div>
                  </details>
                </div>
              </div>
              <button type="button" onClick={() => navigateCareAction(brainCareAction?.href || careDecision.actionHref, brainCareAction?.title || careDecision.label, brainCareAction?.reason || careDecision.explanation)} className={`mt-2 min-h-11 w-full rounded-xl border px-3 text-[11px] font-bold active:scale-[0.98] ${brainCareAction?.lane === "now" ? "border-coral/25 bg-coral/[0.08] text-coral" : carePresentation.actionClass}`}>
                {brainCareAction ? "Abrir próxima etapa" : careDecision.actionLabel}
              </button>
            </section>
          )}
          {/* V300: details open with the medicine's identity, followed by
              important action and progressively disclosed historical tools. */}
          {activePersonId && <TemporaryCourseMedicationCard med={med} doseLogs={doseLogs} personId={activePersonId} today={getLocalTodayISO()} onEdit={() => router.push(`/saude/medicamentos/editar?id=${encodeURIComponent(med.id!)}&intent=posologia`)} />}
          {/* ==================================================
              INTELIGÊNCIA E ATENÇÃO — V72
              A identidade essencial permanece sempre primeiro.
              ================================================== */}

          <div className="space-y-3">
            <ContextualHealthIntelligence
          entityType="medicamento"
          entityId={id}
          className="pt-4"
        />
          </div>

          <div className="space-y-3">
{/* ==================================================
              QUALIDADE DO CADASTRO
              ================================================== */}

          <AnimatePresence>
            {catalogNameSuggestion &&
              !nameQualityDecision && (
                <motion.section
                  initial={{
                    opacity:
                      0,

                    y:
                      -8,
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

                    height:
                      0,
                  }}
                  className="overflow-hidden rounded-[20px] border border-amber-400/25 bg-amber-400/[0.07]"
                >
                  <div className="p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
                        <FileWarning
                          size={
                            20
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-400">
                            Qualidade do cadastro
                          </p>
                        </div>

                        <h2 className="mt-1 text-sm font-semibold text-ink-primary">
                          Referência semelhante encontrada
                        </h2>

                        {/* M10_NAME_SUGGESTION_ON_DEMAND: referência semelhante não é erro. */}
                        <details className="group mt-2 rounded-xl border border-amber-400/15 bg-void/25 px-3 py-1.5">
                          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">Comparar nomes e revisar sugestão <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180"/></summary>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                          O catálogo encontrou uma referência semelhante, mas isso pode representar marca, princípio ativo, alias ou outra identificação válida. Revise apenas se quiser padronizar o nome.
                        </p>

                        {/* P15 R8: comparação isolada; decisão continua nos handlers autorizados. */}
                        <MedicationCatalogNameComparison currentName={med.nome}
                          referenceName={catalogNameSuggestion.reference.canonicalName}
                          activeIngredients={catalogNameSuggestion.reference.activeIngredients?.join(" + ") ?? catalogNameSuggestion.reference.activeIngredient}
                          score={catalogNameSuggestion.score} />

                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            disabled={
                              isQualityActionPending
                            }
                            onClick={
                              handleAcceptNameCorrection
                            }
                            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ice px-4 py-2.5 text-xs font-bold text-void transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isQualityActionPending ? (
                              <Activity
                                size={
                                  15
                                }
                                className="animate-pulse"
                              />
                            ) : (
                              <CheckCircle2
                                size={
                                  15
                                }
                              />
                            )}

                            Usar nome da referência
                          </button>

                          <button
                            type="button"
                            disabled={
                              isQualityActionPending
                            }
                            onClick={
                              handleDismissNameCorrection
                            }
                            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-surface-border bg-surface-raised px-4 py-2.5 text-xs font-semibold text-ink-muted transition-all hover:text-ink-primary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Check
                              size={
                                15
                              }
                            />

                            Manter como está
                          </button>
                        </div>

                        <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">
                          Manter o nome atual registra apenas que você revisou esta sugestão. O Vault não considera automaticamente o cadastro incorreto.
                        </p>
                        </details>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}
          </AnimatePresence>

          {/* ==================================================
              RENOVAÇÃO
              ================================================== */}

          <AnimatePresence>
            {accessAction &&
              med.status !==
                "descontinuado" && (
                <MedicationRenewalAttention
                  urgent={alertaInteligente.urgencia === "alta"}
                  kind={alertaInteligente.motivo}
                  message={alertaInteligente.mensagem}
                  cta={accessAction.cta}
                  daysRemaining={diasAteRenovacao}
                  onOpen={() => navigateCareAction(accessAction.href, accessAction.cta, alertaInteligente.mensagem)}
                />
              )}
          </AnimatePresence>


          {/* ==================================================
              COMPORTAMENTO
              ================================================== */}

          {comportamento && (
            <details open={comportamento.tipo === "alerta_adesao"} className="group rounded-[18px] border border-violet-400/20 bg-violet-400/[0.035] px-3 py-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-2 text-left text-xs font-semibold text-violet-300">
                <span className="min-w-0 break-words">{comportamento.tipo === "alerta_adesao" ? "Atenção ao registro" : "Padrão observado"} · {comportamento.titulo}</span>
                <ChevronRight size={15} className="shrink-0 transition-transform group-open:rotate-90"/>
              </summary>
            <MedicationBehaviorEvidence
              alert={comportamento.tipo === "alerta_adesao"}
              title={comportamento.titulo}
              message={comportamento.mensagem}
              suggestedAction={comportamento.acaoSugerida}
              confidence={comportamento.confianca}
              sample={comportamento.amostra}
            />
            </details>

          )}
          </div>

{/* ==================================================
              ROTINA E DOSES
              ================================================== */}

          {(med.status !==
            "descontinuado" ||
            isSOS) && (
            <section id="medicamento-rotina" className="vault-deferred scroll-mt-24 space-y-3">
              <SectionTitle
                icon={
                  <Clock
                    size={
                      15
                    }
                  />
                }
                title="Rotina & Uso"
              />

              {/* P15 R6: toda a autoridade do slot e dos registros fica nesta página. */}
              <MedicationRoutineSummary
                sos={isSOS}
                takenToday={dosesTomadasHoje.length}
                todayQuantity={formatKnownQuantitySummary(quantidadeHoje)}
                todayQuantityLabel="Quantidade registrada hoje"
                todayQuantityPartial={!quantidadeHoje.complete && quantidadeHoje.totalCount > 0}
                takenLast7Days={dosesTomadasUltimos7Dias.length}
                last7DaysQuantity={formatKnownQuantitySummary(quantidadeUltimos7Dias)}
                last7DaysQuantityPartial={!quantidadeUltimos7Dias.complete && quantidadeUltimos7Dias.totalCount > 0}
                resolvedToday={dosesResolvidasHoje}
                plannedToday={dosesEsperadasHoje}
                takenScheduledToday={dosesTomadasProgramadasHoje}
                ignoredScheduledToday={dosesIgnoradasProgramadasHoje}
                quantityPerDose={unidadePorDose !== null ? formatQuantidade(unidadePorDose) : null}
                doseUnit={med.estoque_unidade_medida || "unidade(s)"}
                hours={horariosConfigurados}
                takenHours={horariosTomadosHoje}
                ignoredHours={horariosIgnoradosHoje}
                lastDose={ultimaDose ? {date:formatDate(ultimaDose.data),time:ultimaDose.horario || ""} : null}
                hasStockControl={temEstoque}
              />
            </section>
          )}

          {/* ==================================================
              HISTÓRICO DE DOSES
              ================================================== */}
          <MedicationDoseHistoryLink onOpen={() => {
            trigger("vibrate");
            // P14 R6 R4: URL segura preservando o destino canônico exigido pelo V70.
            const id = encodeURIComponent(med.id ?? "");
            router.push(`/saude/medicamentos/historico?id=${id}`);
          }}/>

          {/* ==================================================
              ESTOQUE
              ================================================== */}

          {(med.status !==
              "descontinuado" ||
              isSOS) &&
            temEstoque && (
              <section
                id="medicamento-estoque"
                className={`vault-deferred scroll-mt-24 overflow-hidden rounded-[22px] border ${estoqueStatus.border} ${estoqueStatus.bg} p-1`}
              >
                <MedicationStockOverview
                  statusLabel={estoqueStatus.label} statusColor={estoqueStatus.color}
                  statusBackground={estoqueStatus.bg} statusIcon={<EstoqueStatusIcon size={10}/>}
                  quantity={quantidadeDisponivel} unit={med.estoque_unidade_medida || "unidade(s)"}
                  equivalentMl={estoqueEquivalenteMl}
                  negative={estoqueNegativo} registeredBalance={saldoRegistrado}
                  sos={isSOS} daysRemaining={estoqueInfo?.diasRestantes ?? null}
                  dosesAvailable={dosesDisponiveis ?? null}
                  hasStockProjection={Boolean(estoqueInfo)}
                  doseEstimatePossible={Boolean(estoqueInfo?.estimativaDosesDisponivel)}
                  doseQuantity={unidadePorDose}
                  referenceDay={formatDate(med.estoque_data_referencia)}
                  dropsConversionMissing={isGota && (unidadeEstoque.includes("ml") || unidadeEstoque.includes("frasco")) && gotasPorMl === null}
                  formatQuantity={formatQuantidade}
                />
                {med.id && med.status !== "descontinuado" ? (
                  <div className="flex justify-end px-3 pb-3">
                    <MedicationRestockAction name={med.nome} onOpen={() => {
                      trigger("vibrate");
                      router.push(medicationRestockHref(med.id!, `/saude/medicamentos/detalhes?${searchParams.toString()}#medicamento-estoque`));
                    }} />
                  </div>
                ) : null}
              </section>
            )}

          {/* ==================================================
              SUSPENSÃO / SUBSTITUIÇÃO
              ================================================== */}

          {med.status ===
            "descontinuado" && (
            <section className="vault-deferred space-y-3">
              <SectionTitle
                icon={
                  <AlertCircle
                    size={
                      15
                    }
                  />
                }
                title="Suspensão"
              />

              <MedicationSuspensionSummary
                discontinuedAt={formatDate(med.data_descontinuacao)}
                reason={med.motivo_descontinuacao}
                physician={medicoDescontinuacao?.nome || med.medico_descontinuacao_nome}
                replacement={medicamentoSubstituto ? {
                  id:medicamentoSubstituto.id,
                  name:medicamentoSubstituto.nome,
                  dosage:medicamentoSubstituto.dosagem,
                } : null}
                onOpenReplacement={() => medicamentoSubstituto?.id && router.push(`/saude/medicamentos/detalhes?id=${encodeURIComponent(medicamentoSubstituto.id)}`)}
              />
            </section>
          )}

          {/* ==================================================
              MELHOR FARMÁCIA
              ================================================== */}
          {melhorFarmacia && <MedicationBestPriceLink mean={melhorFarmacia.media_preco}
            purchases={melhorFarmacia.total_compras} label="Menor preço médio por farmácia:" onOpen={() => {
              // P14 R6: a âncora dispara o revealHash do ClinicalDisclosure.
              if (window.location.hash !== "#historico-aquisicoes") window.location.hash = "historico-aquisicoes";
              document.getElementById("historico-aquisicoes")?.scrollIntoView({behavior:"smooth",block:"start"});
            }}/>}

          {/* P14 R5: rotina/estoque antes de contexto secundário (âncoras preservadas). */}
          <ClinicalDisclosure id="medicamento-jornada" title="Jornada do medicamento" description="Próximas etapas e vínculos entre receita, aquisição e retirada" icon={<CalendarDays size={18}/>} iconClassName="text-sky-300">
            <MedicationJourneySummary snapshot={journeySnapshot} medicationId={med.id} onNavigate={href=>router.push(href)}/>
          </ClinicalDisclosure>
          <ClinicalDisclosure id="medicamento-fornecimento" title="Fornecimento e documentos" description="Processos SUS, compras particulares e vínculos" icon={<Package size={18}/>} iconClassName="text-emerald-300">
            <HealthSupplyEntry medicamentoId={med.id!}/>
          </ClinicalDisclosure>
          {med.id && activePersonId === med.person_id && (
            <ClinicalDisclosure id="medicamento-lembretes" title="Alertas e lembretes" description="Preferências de aviso para este medicamento" icon={<Clock size={18}/>} iconClassName="text-amber-300">
              <MedicationAlertPreferences med={med} withdrawals={retiradas} today={getLocalTodayISO()}/>
            </ClinicalDisclosure>
          )}


          {/* ==================================================
              EVOLUÇÃO — P15 R1 R2: visualização extraída, formato e dados canônicos preservados
              ================================================== */}
          {med.historico_dosagens && med.historico_dosagens.length > 0 && (
            <MedicationDoseEvolutionTimeline currentDose={med.dosagem}
              className="vault-deferred" history={med.historico_dosagens}
              formatDose={(dose)=>formatMedicationDosageDisplay(med.nome,dose)}
              formatDay={formatDate}/>
          )}

          {/* ==================================================
              FINANCEIRO
              ================================================== */}

          {hasFinancialSection && (
            <ClinicalDisclosure id="medicamento-financeiro" title="Financeiro" description="Compras realizadas, valores informados e planejamento futuro" icon={<LineChart size={18}/> } iconClassName="text-amber-300">
              {()=><>

              {/* P15 R2: compras realizadas e médias são visuais; planejamento segue separado. */}
              <MedicationPaidCostCards paidCount={renovacoesPagas.length}
                paidTotal={custoHistoricoRenovacoes} paidAverage={precoMedioRenovacoes}
                referencePrice={med.preco}/>
              {medicationCosts.planned.length > 0 && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-3">
                  <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Planejado · não realizado</span><strong className="text-xs text-ink-primary">{medicationCosts.plannedWithPrice ? `R$ ${medicationCosts.plannedKnownTotal.toFixed(2)}` : "Valor não informado"}</strong></div>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">{medicationCosts.planned.length} aquisição(ões) futura(s). Não entram no gasto, no preço médio nem no estoque até serem confirmadas.</p>
                </div>
              )}
              {/* VAULT_V320_FINANCE_PROGRESSIVE: calculations retained, advanced projection optional */}
              <details className="group rounded-xl border border-surface-border/60 bg-surface/40 px-3 py-1">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-2 text-xs font-semibold text-ink-primary">
                  <span>Ritmo de aquisição e previsão</span>
                  <ChevronRight size={15} className="text-ink-muted transition group-open:rotate-90"/>
                </summary>
                <div className="border-t border-surface-border/50 py-3">
                  <MedicationPurchaseRhythmCard events={renovacoes} medicationId={med.id!} todayISO={diaFinanceiro}/>
                </div>
              </details>
              </>}
            </ClinicalDisclosure>
          )}

          {/* ==================================================
              REDE — P15 R3: relações selecionadas na página, apresentação modular.
              ================================================== */}
          <ClinicalDisclosure id="medicamento-rede" title="Prescrição e rede de cuidado" description="Profissionais, locais e farmácias vinculados" icon={<Stethoscope size={18}/> } iconClassName="text-teal-300">
            {() => <MedicationCareNetworkDetails
              doctor={{id:medico?.id,name:medico?.nome || med.medico || "Não informado",otherMedicationCount:outrosMedsDesteMedico.length}}
              hospital={hospital ? {id:hospital.id,name:hospital.nome,address:hospital.endereco,phone:hospital.telefone} : null}
              location={local ? {id:local.id,name:local.nome,address:local.endereco,phone:local.telefone,kind:local.tipo} : null}
              pharmacy={farmacia || med.farmacia ? {id:farmacia?.id,name:farmacia?.nome || med.farmacia || "Não informado",address:farmacia?.endereco,phone:farmacia?.telefone} : null}
              latestPublicAcquisition={ultimaRenovacao && ultimaRenovacaoSemCusto ? {nextWithdrawalDate:ultimaRenovacao.data_proxima_retirada,needsPrescription:ultimaRenovacao.exige_nova_receita} : null}
              onNavigate={href=>router.push(href)} onMap={abrirNoMapa} onCall={ligar} formatDay={formatDate}/>}
          </ClinicalDisclosure>

          {/* ==================================================
              RECEITA
              ================================================== */}

          <section id="medicamento-receita" className="vault-deferred scroll-mt-24 space-y-3">
            <SectionTitle
              icon={
                <FileText
                  size={
                    15
                  }
                />
              }
              title="Receita"
              action={
                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setInfoModalOpen(
                        true
                      );
                    }
                  }
                  className="flex items-center gap-1 rounded-full bg-surface-raised px-2.5 py-1 text-[9px] font-bold uppercase text-ink-muted"
                >
                  <Info
                    size={
                      11
                    }
                  />

                  Info
                </button>
              }
            />

            <MedicationPrescriptionCard
              typeLabel={tipoReceitaLabel} badge={receitaBadge}
              status={!med.data_receita ? "missing" : !validadeReceitaAtual.dataValidade ? "undetermined" : validadeReceitaAtual.vencida ? "expired" : validadeReceitaAtual.status === "vence_hoje" ? "due_today" : "current"}
              issuedAt={formatDate(med.data_receita)} expiresAt={formatDate(validadeReceitaAtual.dataValidade)}
              nextAt={formatDate(med.lembrete_receita_modo === "data_personalizada" && med.lembrete_receita_data ? med.lembrete_receita_data : med.proxima_renovacao)}
              validityLabel="Validade de referência" nextLabel="Próxima solicitação planejada"
              hasAttachment={Boolean(documento?.attachments?.length)}
              onPlan={() => router.push(`/saude/renovacao/nova-receita?medicamento_id=${encodeURIComponent(med.id!)}&mode=plan&return_to=${encodeURIComponent(`/saude/medicamentos/detalhes?id=${med.id}`)}`)}
              onAttachment={abrirAnexo}
              onLink={() => router.push(`/saude/medicamentos/editar?id=${id}&intent=rede`)}
              onReceived={() => router.push(`/saude/renovacao/nova-receita?medicamento_id=${encodeURIComponent(med.id!)}&return_to=${encodeURIComponent(`/saude/medicamentos/detalhes?id=${med.id}`)}`)}
            />
          </section>

          {/* ==================================================
              RENOVAÇÕES
              ================================================== */}

          {renovacoes.length >
            0 && (
            <ClinicalDisclosure id="historico-aquisicoes" title="Movimentações anteriores" description={`${renovacoes.length} receitas e aquisições registradas · consultar sob demanda`} icon={<CalendarDays size={18}/>} iconClassName="text-violet-300">
              {() => <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                    Histórico
                  </p>

                  <h2 className="mt-0.5 text-sm font-semibold text-ink-primary">
                    Receitas e aquisições
                  </h2>
                </div>

                {renovacoes.length >
                  3 && (
                  <button
                    type="button"
                    onClick={
                      () =>
                        setShowAllRenovacoes(
                          (
                            previous
                          ) =>
                            !previous
                        )
                    }
                    aria-expanded={showAllRenovacoes}
                    aria-controls="medicamento-historico-aquisicoes-lista"
                    className="flex min-h-11 items-center gap-1 rounded-lg bg-ice/10 px-2.5 py-1.5 text-[9px] font-bold text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
                  >
                    {showAllRenovacoes ? (
                      <>
                        <ChevronUp
                          size={
                            12
                          }
                        />

                        Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown
                          size={
                            12
                          }
                        />

                        Ver todas (
                        {
                          renovacoes.length
                        }
                        )
                      </>
                    )}
                  </button>
                )}
              </div>

              <div id="medicamento-historico-aquisicoes-lista" className="space-y-2">
                <AnimatePresence initial={false}>
                  {displayedRenovacoes.map(
                    (
                      renovacao,
                      index
                    ) => {
                      const nomeFarmacia =
                        renovacao.farmacia_id
                          ? farmaciasMap.get(
                              renovacao.farmacia_id
                            )
                          : null;

                      const somenteReceita = isPrescriptionOnly(renovacao);
                      const aquisicaoFutura = isFutureAcquisition(renovacao, diaFinanceiro);
                      const semCusto = !somenteReceita && !aquisicaoFutura &&
                        (renovacao.tipo_aquisicao === "gratuito" || renovacao.tipo_aquisicao === "sus");

                      return (
                        <MedicationAcquisitionHistoryCard
                          key={renovacao.id || index}
                          kind={somenteReceita ? ("prescription") : aquisicaoFutura ? ("planned") : semCusto ? ("public") : "private"}
                          dateLabel={formatDate(somenteReceita ? (renovacao.data || renovacao.created_at) : renewalEventDate(renovacao))}
                          pharmacyName={nomeFarmacia}
                          publicKind={renovacao.tipo_aquisicao === "sus" ? "sus" : renovacao.tipo_aquisicao === "gratuito" ? "gratuito" : null}
                          quantityLabel={typeof renovacao.quantidade === "number" ? formatQuantidade(renovacao.quantidade) : null}
                          requiresPrescription={Boolean(renovacao.exige_nova_receita)}
                          nextWithdrawalLabel={renovacao.data_proxima_retirada ? formatDate(renovacao.data_proxima_retirada) : null}
                          price={typeof renovacao.preco === "number" && Number.isFinite(renovacao.preco) ? renovacao.preco : null}
                          enabled={Boolean(renovacao.id)}
                          onOpen={() => renovacao.id && router.push(`/saude/renovacao/detalhes?id=${encodeURIComponent(renovacao.id)}&return_to=${encodeURIComponent(`/saude/medicamentos/detalhes?id=${id}`)}`)}
                        />
                      );
                    }
                  )}
                </AnimatePresence>
              </div>
              </div>}
            </ClinicalDisclosure>
          )}
        </div>

        {/* ====================================================
            QUICK DOSE
            ==================================================== */}

        <QuickDoseModal
          isOpen={
            isQuickDoseOpen
          }
          onClose={
            () =>
              setIsQuickDoseOpen(
                false
              )
          }
          preselectedMedicamentoId={
            id ||
            undefined
          }
          onSuccess={
            () => {
              trigger(
                "success"
              );

              setToastMessage({
                text:
                  "Dose registrada!",

                type:
                  "success",
              });

              setTimeout(
                () =>
                  setToastMessage(
                    null
                  ),
                2500
              );
            }
          }
        />

        {/* ====================================================
            INFO RECEITA
            ==================================================== */}

        <BottomSheet
          isOpen={
            infoModalOpen
          }
          onClose={
            () =>
              setInfoModalOpen(
                false
              )
          }
          title="Informações da Receita"
        >
          <div className="space-y-4 p-5 text-sm text-ink-muted">
            <div className="space-y-2 rounded-2xl border border-surface-border bg-surface p-4">
              <p className="text-base font-semibold text-ink-primary">
                Tipo cadastrado:{" "}
                {
                  tipoReceitaLabel
                }
              </p>

              {typeof validadeReceitaReferencia ===
              "number" ? (
                <p className="leading-relaxed">
                  Para este tipo de receita, o Vault usa como referência de organização um intervalo de{" "}
                  <b className="text-ink-primary">
                    {
                      validadeReceitaReferencia
                    }{" "}
                    dias
                  </b>
                  .
                </p>
              ) : (
                <p className="leading-relaxed">
                  Este tipo de receita não possui um intervalo padrão de validade configurado no Vault.
                </p>
              )}

              <p className="text-xs leading-relaxed text-ink-faint">
                Essa informação é usada pelo aplicativo apenas para organização e lembretes. Regras de validade e dispensação podem variar conforme medicamento, prescrição e regulamentação aplicável.
              </p>
            </div>

            <button
              type="button"
              onClick={
                () => {
                  setInfoModalOpen(
                    false
                  );

                  router.push(
                    `/saude/renovacao/nova?medicamento_id=${id}&return_to=${encodeURIComponent(`/saude/medicamentos/detalhes?id=${id}`)}`
                  );
                }
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ice py-3.5 font-bold text-void shadow-lg shadow-ice/20 transition-transform active:scale-95"
            >
              <Calendar
                size={
                  18
                }
              />

              Registrar aquisição
            </button>
          </div>
        </BottomSheet>

        {/* ====================================================
            DELETE
            ==================================================== */}

        <ConfirmationModal
          isOpen={
            showDeleteModal
          }
          onClose={() => {
            setShowDeleteModal(false);
            setDeletePhrase("");
            setDeleteAuthorized(false);
          }}
          onConfirm={
            handleDelete
          }
          title="Remover da rotina"
          message={isVaultNative() && deleteAuthorized ? (
            `Identidade confirmada. Remover "${med.nome}" da rotina? Doses, aquisições e renovações serão preservadas no histórico.`
          ) : (
            <div className="space-y-3">
              <p>Remover <strong className="text-ink-primary">{med.nome}</strong> da rotina? Doses, aquisições e renovações serão preservadas no histórico.</p>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-coral">Digite EXCLUIR para confirmar</span>
                <input value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value.toUpperCase())} placeholder="EXCLUIR" className="w-full rounded-2xl border border-coral/25 bg-surface-raised px-4 py-3 text-center font-mono text-sm uppercase tracking-widest text-ink-primary outline-none focus:border-coral" />
              </label>
              <button type="button" disabled={deletePhrase !== "EXCLUIR" || isDeleting} onClick={() => void handleDelete()} className="min-h-12 w-full rounded-2xl bg-coral px-4 text-sm font-bold text-white disabled:opacity-35">Remover da rotina</button>
            </div>
          )}
          confirmLabel="Remover"
          cancelLabel="Cancelar"
          isLoading={
            isDeleting
          }
          type="danger"
          showActions={isVaultNative() && deleteAuthorized}
        />

      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function DetalhesPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <MedicamentoDetalhesContent />
    </Suspense>
  );
}
