// app/saude/medicamentos/page.tsx
"use client";
import { formatQuantidade } from "@/lib/health-intelligence/medication-detail-presenters";
import { OblongPillIcon, ScoredOblongPillIcon } from "@/lib/medications/form-presentation";

import { indexScheduledWithdrawalsByOwner, medicationWithdrawalKey, medicationAccessAction } from "@/lib/medication-access-action";
import { useRetiradas } from "@/hooks/useRetiradas";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { decideMedicationCarePath, medicationCarePresentation, medicationCareStageIsPlanning, medicationCareStageNeedsAttention } from "@/lib/health-intelligence/medication-care-decision";
import { indexMedicationRenewals } from "@/lib/health-intelligence/medication-workspace";
import { ownedMedicationRenewals } from "@/lib/health-intelligence/medication-owner-events";
import { hasConfirmedControlledRegime } from "@/lib/medication-intelligence/controlled-filter";
import { MedicationListRouteLabel } from "@/components/saude/MedicationListRouteLabel";
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
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  MinusCircle,
  Circle,
  Droplet,
  Eye,
  EyeOff,
  History,
  Pill,
  Search,
  StickyNote,
  Syringe,
  X,
  Zap,
} from "lucide-react";

import {
  format,
} from "date-fns";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

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
import { MedicationListActiveFilter } from "@/components/saude/MedicationListActiveFilter";
import { medicationListPresentation } from "@/lib/health-intelligence/medication-list-presentation";
import { resolveMedicationCardAction } from "@/lib/health-intelligence/medication-card-action";

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

  const hojeString =
    useMemo(
      () =>
        format(
          new Date(),
          "yyyy-MM-dd"
        ),
      []
    );

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
  const [unifiedList, setUnifiedList] = useState(false);
  // M83: a lista única é incremental para evitar montar centenas de cards
  // no Android. Busca e filtros continuam operando no conjunto completo.
  const [unifiedVisibleCount, setUnifiedVisibleCount] = useState(12);

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

  const [selectedRegulatory, setSelectedRegulatory] =
    useState<MedicationRegulatoryVisual | null>(null);

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
          return brainLane === "now" || brainLane === "prepare" || medicationCareStageNeedsAttention(careDecisionsByMedication.get(medId)?.stage ?? "stable") ||
            item.dosesPendentesHoje > 0 || item.dosesIgnoradasHoje > 0;
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
      careDecisionsByMedication,
      brainCareByMedication,
    ]);

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
    medsPlanejados,
    medsEmDia,
    medsSOS,
    medsSuspensos,
  } =
    useMemo(
      () => {
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

            const precisaAcao =
              ["now","prepare"].includes(brainCareByMedication.get(item.med.id || "")?.lane || "") ||
              medicationCareStageNeedsAttention(careDecisionsByMedication.get(item.med.id || "")?.stage ?? "stable") ||
              item.dosesPendentesHoje >
                0 || item.dosesIgnoradasHoje > 0;

            if (precisaAcao) {
              prioridade.push(
                item
              );

              return;
            }

            if (brainCareByMedication.get(item.med.id || "")?.lane === "discuss" || medicationCareStageIsPlanning(careDecisionsByMedication.get(item.med.id || "")?.stage ?? "stable")) {
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

            return String(
              a.med.nome || ""
            ).localeCompare(
              String(
                b.med.nome || ""
              ),
              "pt-BR"
            );
          }
        );

        emDia.sort(
          (a, b) =>
            String(
              a.med.nome || ""
            ).localeCompare(
              String(
                b.med.nome || ""
              ),
              "pt-BR"
            )
        );

        planejados.sort((a, b) => String(a.med.nome || "").localeCompare(String(b.med.nome || ""), "pt-BR"));

        const byName = (a: ProcessedMed, b: ProcessedMed) =>
          String(a.med.nome || "").localeCompare(String(b.med.nome || ""), "pt-BR");

        sos.sort(byName);
        suspensos.sort(byName);

        return {
          medsPrioridade:
            prioridade,

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
        careDecisionsByMedication,
        brainCareByMedication,
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
      const isTemporary = med.tipo_uso === "temporario";
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

      const activeIngredients =
        catalogIdentity?.activeIngredients?.length
          ? catalogIdentity.activeIngredients
          : catalogIdentity?.activeIngredient
            ? [catalogIdentity.activeIngredient]
            : [];

      const activeIngredient =
        activeIngredients.join(" + ");

      const showActiveIngredient =
        activeIngredients.some(
          (item) =>
            normalizeMedicationText(item) !==
            normalizeMedicationText(med.nome)
        );

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

      const todayStatus =
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

      const canQuickDose =
        !isSuspenso &&
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
      // V299: preservar prioridade Brain, exceto contradicao com aquisicao/retirada comprovada.
      const brainSuggestion = brainCareItem && brainCareItem.lane === "now"
        ? { href: brainCareItem.href, label: brainCareItem.title, description: brainCareItem.reason }
        : null;
      const brainAction = brainSuggestion
        ? resolveMedicationCardAction(careDecision, brainSuggestion, null)
        : null;
      const sosHasOperationalException = isEstoqueZerado || isEstoqueCritico || careDecision.stage === "withdrawal_overdue";
      // V299: Brain NOW remains first; only the non-Brain fallback is quiet for stocked SOS.
      const careAction = brainAction ?? (isSOS && !sosHasOperationalException ? null : (careDecision.stage !== "stable"
        ? { href: careDecision.actionHref, label: careDecision.actionLabel, description: careDecision.explanation }
        : accessAction));
      const carePresentation = medicationCarePresentation(careDecision, insight?.urgencia);
      const careActionClass = brainAction && careAction === brainAction && brainCareItem?.lane === "now" ? "border-coral/25 bg-coral/[0.08] text-coral" : carePresentation.actionClass;

      // VAULT_V318_CONTEXTUAL_ACTION: visual text only; never reinterpret the care decision.
      const contextualActionLabel = careAction
        ? isRestockDestination(careAction.href, med.id!) ? "Repor estoque"
          : /retirad/i.test(careAction.href) ? "Abrir retirada"
          : /aquisi|compra/i.test(`${careAction.label} ${careAction.href}`) ? "Registrar aquisição"
          : /receita|renova/i.test(`${careAction.label} ${careAction.href}`) ? "Renovar receita"
          : /document/i.test(`${careAction.label} ${careAction.href}`) ? "Preparar documentos"
          : /conferir vínculo do processo SUS|vínculo do processo SUS/i.test(careAction.label) ? "Conferir SUS"
          : /revisar continuidade/i.test(careAction.label) ? "Revisar continuidade"
          : careAction.label.startsWith(`${med.nome}: `) ? careAction.label.slice(med.nome.length + 2)
          : careAction.label
        : "";

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
          compactTight
          interactiveContent
          className="min-h-0"
          navigationLabel={`Ver detalhes de ${med.nome}`}
          railSize="slim"
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
                if (regulatoryProfile) setSelectedRegulatory(regulatoryProfile);
                else router.push(`/saude/medicamentos/detalhes?id=${encodeURIComponent(med.id!)}&return_to=${encodeURIComponent("/saude/medicamentos")}#medicamento-agora`);
              }}
              className="relative z-20 flex h-full w-full cursor-pointer items-center justify-center overflow-hidden py-1 text-[8px] font-black leading-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ice"
            >
              <span
                className={`block max-h-full overflow-hidden whitespace-nowrap text-center tracking-[-0.01em] ${regulatoryProfile?.verified === false || regulatoryProfile?.tone === "unknown" ? "text-white" : "text-void"}`}
                style={{writingMode: "vertical-rl", transform: "rotate(180deg)"}}
              >
                {medicationRegulatoryShortLabel(regulatoryProfile, receita?.sigla)}
              </span>
            </button>
          ) : null}
          icon={
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl border ${regulatorySurface.iconClass} ${regulatorySurface.glowClass}`}
              title={personalAccent ? "Identidade visual personalizada · classificação da receita na faixa lateral" : regulatoryMeaning}
              style={medicationPersonalAccentStyle(med)}
            >
              <SelectedFormatIcon
                size={18}
                fill={fillValue}
                stroke={strokeValue}
              />
            </span>
          }
        >
          <div className="relative flex min-w-0 flex-col gap-0.5">

            {/* IDENTIDADE · VAULT_V318_COMPACT_IDENTITY · M86_ALIGNED_IDENTITY */}
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {personalAccent && <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-full" style={{backgroundColor:personalAccent}} />}
                <h3 title={med.nome} className="min-w-0 max-w-full line-clamp-2 break-words font-display text-[15px] font-bold leading-snug text-ink-primary">
                  {med.nome}
                </h3>
                {med.dosagem && (
                  <span title={med.dosagem} className="min-w-0 max-w-full text-xs font-semibold leading-snug text-ink-secondary">
                    {med.dosagem}
                  </span>
                )}
              </div>
              {!activeIngredients.length && !isSuspenso && (
                <p className="min-w-0 truncate text-[10px] leading-snug text-ink-faint" title="Referência farmacêutica ainda não confirmada para este cadastro">Princípio ativo · confirmar referência nos detalhes</p>
              )}
              {showActiveIngredient && (
                <>
                <p className="sr-only" title={`Princípio ativo: ${activeIngredient}`}>
                  Princípio ativo: {activeIngredient}
                </p>
                <p aria-hidden="true" className="min-w-0 line-clamp-1 break-words text-[11px] font-normal leading-snug text-ink-muted" title={`Princípio ativo: ${activeIngredient}`}>
                  {activeIngredient}
                </p>
                </>
              )}
              </div>
              <div className="flex min-h-6 min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px]">
                {isSOS && <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">SOS</span>}
                {isTemporary && <span className="rounded-md bg-violet-400/10 px-2 py-0.5 text-[11px] font-bold text-violet-300">POR PERÍODO</span>}
                {catalogIdentity?.authorityState === "possible_divergence" && (
                  <span title={catalogIdentity.authorityDetail} className="rounded-md bg-amber-400/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">Revisar identidade</span>
                )}
                {supplyRoute?.mode === "hybrid" ? (
                  // R9 R3: o medicamento informa a origem cadastrada; a rota híbrida
                  // informa coexistência de evidências, nunca fornecimento simultâneo.
                  med.tipo_aquisicao === "comprado" ? (
                    <span title="Origem atual declarada no cadastro: comprado. Existem também vínculos SUS e compras no histórico; verifique os processos ativos nos detalhes." className="max-w-full truncate rounded-md border border-emerald-400/20 bg-emerald-400/[.07] px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">Comprado · cadastro</span>
                  ) : med.tipo_aquisicao === "sus" ? (
                    <span title="Origem cadastrada como SUS. Há compras particulares no histórico; confirme a etapa e o processo atual nos detalhes." className="max-w-full truncate rounded-md border border-violet-300/20 bg-violet-300/[.07] px-1.5 py-0.5 text-[9px] font-semibold text-violet-200">SUS · cadastro</span>
                  ) : (
                    <span title="Há vínculos públicos e compras particulares registrados. O histórico não comprova a origem de fornecimento atual." className="max-w-full truncate rounded-md border border-violet-300/15 bg-violet-300/[.07] px-1.5 py-0.5 text-[9px] font-semibold text-violet-200">Origens históricas · conferir</span>
                  )
                ) : (supplyRoute?.mode === "private" || supplyRoute?.mode === "public") && (
                  <MedicationListRouteLabel route={supplyRoute} label={supplyRoute.labels.join(" + ")} />
                )}
                {textoDose && <span title={`Dose ${textoDose}`} className="text-[11px] text-ink-muted">Dose {textoDose}</span>}
                {careDecision.stage !== "stable" && !careAction && (!isSOS || sosHasOperationalException) && (
                  <span title={careDecision.explanation} className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${carePresentation.badgeClass}`}>
                    {careDecision.label}
                  </span>
                )}
              </div>
              <div aria-label="Ações do medicamento" className="mt-1.5 grid min-w-0 grid-cols-2 gap-1.5 border-t border-surface-border/25 pt-1.5 empty:hidden [&>button]:min-h-11 [&>button]:min-w-0 [&>button]:w-full [&>button]:px-1.5 [&>button]:text-[11px] [&>button:only-child]:col-span-2">
                {!isSuspenso && canQuickDose && quickDoseLabel ? (
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
                    {quickDoseLabel}
                    {isSOS && isEstoqueZerado ? <span className="sr-only">Estoque zerado no cadastro</span> : null}
                  </button>
                ) : null}
                {careAction && (
                  <button
                    type="button"
                    className={`inline-flex min-h-10 max-w-full items-center justify-center gap-1 rounded-xl border px-3 py-1 text-xs font-bold transition-all active:scale-[0.97] ${careActionClass}`}
                    title={careAction.description}
                    aria-label={`${careAction.description} para ${med.nome}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      trigger("vibrate");
                      router.push(careAction.href);
                    }}
                  >
                    <AlertTriangle size={12} className="shrink-0" />
                    <span className="min-w-0 line-clamp-1 break-words">{contextualActionLabel}</span>
                    <span className="sr-only">{careAction.label}</span>
                  </button>
                )}
                {!isSuspenso && med.id && ((stockUnknown || stockNegative) && careAction?.href !== medicationStockCountHref(med.id, `/saude/medicamentos/detalhes?id=${encodeURIComponent(med.id)}`) ||
                  (stockEmpty && !stockNegative && !isRestockDestination(careAction?.href, med.id))) ? (
                  <MedicationRestockAction name={med.nome}
                    label={stockUnknown ? "Informar saldo" : stockNegative ? "Revisar saldo" : "Repor estoque"}
                    onOpen={() => {
                      trigger("vibrate");
                      router.push(stockUnknown || stockNegative
                        ? medicationStockCountHref(med.id!, "/saude/medicamentos")
                        : medicationRestockHref(med.id!, "/saude/medicamentos"));
                    }} />
                ) : null}
              </div>
            </div>

            {/* VAULT_MEDICATION_LIST_HIERARCHY_V98
                Indicações, médico e tratamentos ficam nos Detalhes.
                A lista preserva apenas identidade, rotina, estoque e exceções. */}

            {/* VAULT_V318_OPERATIONAL_STRIP: summary only, no repeated mini-dashboard */}
            <MedicationOperationalStrip today={todayStatus}
              stockLabel={stockUnknown ? "Não informado" : stockNegative ? "Revisar saldo" : humanizeStockText(textoEstoquePrincipal)}
              stockDetail={stockUnknown ? "Saldo ainda não informado" : textoEstoqueSecundario || estoqueStatus}
              stockTone={stockUnknown ? "unknown" : stockEmpty ? "empty" : isEstoqueCritico ? "low" : "known"}
              doseOutcome={dosesIgnoradasHoje>0&&!isSOS?"ignored":rotinaConcluida||sosTomadoHoje?"completed":"unconfirmed"}/>
            {stockReview && <details className="group mt-1 rounded-lg border border-amber-300/25 bg-amber-300/[.05] px-2.5 py-1 text-amber-200">
              <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
                <AlertTriangle size={14} className="shrink-0" aria-hidden="true"/>
                <span className="min-w-0 flex-1 truncate" title="Unidade do estoque diferente · revisar">Unidade do estoque diferente · revisar</span>
                <ChevronDown size={14} className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true"/>
              </summary>
              <p role="note" className="pb-2 text-xs leading-relaxed text-amber-100">Unidade do estoque: {stockReview}</p>
            </details>}

            {/* VAULT_CARD_RHYTHM_V97_2_R1
                Ações rápidas ficam junto da dose, antes do painel operacional.
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
      <main className="min-h-screen bg-void px-5 pb-28 pt-6" aria-busy="true" aria-label="Carregando medicamentos">
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
      <main className="relative min-h-screen bg-void pb-28">
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

              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/retiradas");
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/[.07] text-amber-300 transition-all active:scale-95"
                aria-label="Abrir retiradas de medicamentos"
                title="Retiradas"
              >
                <History size={18} />
              </button>

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

        {/* M105: a rotina aparece antes dos filtros, na primeira dobra. */}
          {/* M92: resumo de progresso em primeiro plano; ajustes avançados por demanda. */}
          <div className="mx-4 mb-2.5 mt-2 rounded-[22px] border border-emerald-300/25 bg-gradient-to-br from-emerald-300/[.095] via-surface to-surface px-4 py-3.5 shadow-sm" aria-label="Progresso das doses programadas de hoje">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-ink-primary">Rotina de hoje</p>
                <p className="text-[10px] text-ink-muted">Somente doses programadas · SOS fora do total</p>
              </div>
              <strong className="shrink-0 font-display text-2xl font-bold tabular-nums text-emerald-300" aria-label={`${statsProgresso.completados} de ${statsProgresso.total} doses confirmadas`}>{statsProgresso.completados}/{statsProgresso.total}</strong>
            </div>
            <div role="progressbar" aria-label="Doses confirmadas hoje" aria-valuemin={0} aria-valuemax={100} aria-valuenow={statsProgresso.total > 0 ? Math.min(100, Math.round(statsProgresso.completados / statsProgresso.total * 100)) : 0} className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-raised">
              <div className="h-full rounded-full bg-emerald-400 transition-[width] motion-reduce:transition-none" style={{width:`${statsProgresso.total > 0 ? Math.min(100, Math.round(statsProgresso.completados / statsProgresso.total * 100)) : 0}%`}} />
            </div>
          </div>

        {/* P15 R9: filtros compactos, com disclosure acessível e sem grid permanente no Android. */}
        <MedicationFilterBar value={medicationFilter} onChange={selectMedicationFilter}/>


        {/* CONTEÚDO */}
        <section className="px-4 pt-2.5">
          <MedicationListActiveFilter view={listPresentation} onClear={() => { trigger("vibrate"); setSearchQuery(""); selectMedicationFilter("todos"); }} />
          <div className="mb-2 flex min-w-0 items-center justify-between gap-2" aria-label="Organização da lista de medicamentos">
            <div className="min-w-0"><h2 className="text-sm font-bold tracking-tight text-ink-primary">Seus medicamentos</h2>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-muted">Prioridades primeiro · rotina e SOS separados</p></div>
            {medsPrioridade.length > 0 ? <span className="shrink-0 rounded-lg border border-amber-400/20 bg-amber-400/[.07] px-2 py-1 text-[10px] font-semibold text-amber-200">{medsPrioridade.length} em atenção</span> : null}
          </div>
          <details className="group mb-2.5 rounded-xl border border-surface-border/40 bg-surface/35 px-2.5" aria-label="Indicadores e organização avançada">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
              <span className="flex items-center gap-2"><Pill size={14} aria-hidden="true"/>Indicadores e organização</span>
              <ChevronDown size={15} className="transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true"/>
            </summary>
            <div className="space-y-2 border-t border-surface-border/30 pt-2">
          <ClinicalDisclosure key={medsPrioridade.length > 0 ? "atencao" : "rotina"} id="medicamentos-panorama" title="Panorama dos medicamentos" description="Indicadores e contexto do Brain, sem repetir a lista" icon={<Pill size={18}/>} defaultOpen={false}>
            {() => <div className="space-y-2"><MedicationPortfolioOverview portfolio={healthIntelligence.careCommand?.medications} decision={healthIntelligence.careCommand?.decision} doses={{total:statsProgresso.total,completed:statsProgresso.completados,ignored:statsProgresso.ignoradas}} listActiveCount={statsProgresso.ativos} onNavigate={(href)=>router.push(href)}/><a href="/ajuda?topico=medications" className="flex min-h-11 items-center justify-center rounded-xl border border-surface-border/50 bg-surface-raised/40 px-3 text-xs font-semibold text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">Como organizar rotina, estoque e receitas</a></div>}
          </ClinicalDisclosure>
          <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-surface-border/40 bg-surface/45 px-3 py-2" aria-label="Modo de exibição dos medicamentos">
            <div className="min-w-0"><strong className="block text-xs text-ink-primary">Exibição</strong><span className="block text-[11px] text-ink-muted">Mesmos resultados, outra organização</span></div>
            <div className="inline-flex shrink-0 rounded-xl border border-surface-border/60 p-0.5" role="group" aria-label="Organização dos medicamentos">
              <button type="button" aria-pressed={!unifiedList} onClick={() => setUnifiedList(false)} className={`min-h-11 rounded-lg px-2.5 text-xs font-semibold ${!unifiedList ? "bg-emerald-300/10 text-emerald-200" : "text-ink-muted"}`}>Grupos</button>
              <button type="button" aria-pressed={unifiedList} onClick={() => setUnifiedList(true)} className={`min-h-11 rounded-lg px-2.5 text-xs font-semibold ${unifiedList ? "bg-emerald-300/10 text-emerald-200" : "text-ink-muted"}`}>Lista única</button>
            </div>
          </div>
          {/* P9: grupos são um atalho secundário, não outra barra de filtros. */}
          {!unifiedList && listaProcessada.length>0 && medicationFilter === "todos" ? <details className="group mb-2 rounded-xl border border-surface-border/40 bg-surface/50 px-2.5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
              <span>Ir para um grupo <span className="ml-1 font-normal text-ink-faint">· navegação, não filtro</span></span><span aria-hidden="true" className="text-ink-muted">▾</span>
            </summary>
            <MedicationListGroupNavigation attention={medsPrioridade.length} stable={medsEmDia.length} planned={medsPlanejados.length} sos={medsSOS.length} suspended={medsSuspensos.length}/>
          </details>:null}
            </div>
          </details>

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
                <p role="status" className="text-xs text-ink-muted">Exibindo {Math.min(unifiedVisibleCount, listaProcessada.length)} de {listaProcessada.length} medicamento(s) · filtros e pesquisa consideram todos</p>
                {listaProcessada.slice(0, unifiedVisibleCount).map(renderCard)}
                {unifiedVisibleCount < listaProcessada.length && (
                  <button type="button" onClick={() => setUnifiedVisibleCount(count => count + 12)}
                    className="flex min-h-12 w-full items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-300/[.06] px-4 text-xs font-bold text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
                    Mostrar mais {Math.min(12, listaProcessada.length - unifiedVisibleCount)} medicamentos
                  </button>
                )}
              </div>
            ) : (
            <div className="space-y-2 pb-8">
              <ClinicalCollectionGroup id="medicamentos-atencao" title="Precisa de atenção" description="Doses, estoque ou próxima etapa que exigem ação" count={medsPrioridade.length} icon={AlertTriangle} tone="attention" defaultOpen forceOpen={Boolean(searchQuery)||medicationFilter!=="todos"} progressive={medicationFilter === "todos" && !searchQuery}>{(limit) => limit === undefined ? medsPrioridade.map(renderCard) : medsPrioridade.slice(0, limit).map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-em-dia" title="Em dia" description="Rotina atual sem pendência operacional" count={medsEmDia.length} icon={CheckCircle2} tone="positive" defaultOpen={medsPrioridade.length===0&&medsEmDia.length<=4} forceOpen={Boolean(searchQuery)||medicationFilter!=="todos"} progressive={medicationFilter === "todos" && !searchQuery}>{(limit) => limit === undefined ? medsEmDia.map(renderCard) : medsEmDia.slice(0, limit).map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-planejados" title="Próximas etapas" description="Planejamento futuro, sem tratar como realizado" count={medsPlanejados.length} icon={Calendar} forceOpen={Boolean(searchQuery)||medicationFilter!=="todos"} progressive={medicationFilter === "todos" && !searchQuery}>{(limit) => limit === undefined ? medsPlanejados.map(renderCard) : medsPlanejados.slice(0, limit).map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-sos" title="SOS / conforme necessidade" description="Uso eventual, separado da rotina programada" count={medsSOS.length} icon={Zap} tone="sos" forceOpen={Boolean(searchQuery)||medicationFilter==="sos"} progressive={medicationFilter === "todos" && !searchQuery}>{(limit) => limit === undefined ? medsSOS.map(renderCard) : medsSOS.slice(0, limit).map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-suspensos" title="Suspensos" description="Histórico preservado fora do cuidado atual" count={medsSuspensos.length} icon={EyeOff} forceOpen={Boolean(searchQuery)||medicationFilter==="encerrados"} progressive={medicationFilter === "todos" && !searchQuery}>{(limit) => limit === undefined ? medsSuspensos.map(renderCard) : medsSuspensos.slice(0, limit).map(renderCard)}</ClinicalCollectionGroup>
            </div>
            )
          )}
        </section>

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
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-5 backdrop-blur-[2px]"
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
              className="w-full max-w-[330px] rounded-[22px] border border-surface-border/60 bg-surface-raised p-4 shadow-2xl"
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
                  Medicamento identificado no catálogo. O tipo de receita ainda não possui confirmação regulatória na fonte atual.
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
