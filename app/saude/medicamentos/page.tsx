// app/saude/medicamentos/page.tsx
"use client";

import { indexScheduledWithdrawals, medicationAccessAction } from "@/lib/medication-access-action";
import { useRetiradas } from "@/hooks/useRetiradas";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { decideMedicationCarePath, medicationCarePresentation, medicationCareStageIsPlanning, medicationCareStageNeedsAttention } from "@/lib/health-intelligence/medication-care-decision";
import { indexMedicationRenewals } from "@/lib/health-intelligence/medication-workspace";
import { createLocalSearchIndex, filterLocalSearchIndex } from "@/lib/local-search";
import {
  useEffect,
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
  QuickDoseModal,
} from "@/components/saude/QuickDoseModal";

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
import { normalizeMedicationText } from "@/lib/medication-intelligence/normalize";
import { getMedicationRegulatorySurface } from "@/lib/medication-regulatory-visual";
import type { MedicationRegulatoryVisual } from "@/lib/medication-regulatory-visual";
import { useSharedHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { ClinicalCollectionGroup } from "@/components/saude/ClinicalCollectionGroup";
import { ClinicalSectionNav } from "@/components/saude/ClinicalSectionNav";

type MedicationListFilter =
  | "todos"
  | "atencao"
  | "continuos"
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

function formatQuantidade(
  value: number
): string {
  if (
    Number.isInteger(
      value
    )
  ) {
    return String(
      value
    );
  }

  return value
    .toFixed(
      2
    )
    .replace(
      /\.00$/,
      ""
    )
    .replace(
      /(\.\d)0$/,
      "$1"
    )
    .replace(
      ".",
      ","
    );
}

// ============================================================
// PAGE
// ============================================================

export default function MedicamentosListPage() {
  const healthIntelligence = useSharedHealthIntelligence();
  const { retiradas, isLoading: withdrawalsLoading } = useRetiradas();
  const { renovacoes = [], isLoading: renewalsLoading } = useRenovacoes();
  const scheduledWithdrawals = useMemo(() => indexScheduledWithdrawals(retiradas), [retiradas]);
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
    if (saved && ["todos","atencao","continuos","sos","controlados","encerrados"].includes(saved)) {
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
        renewals: renewalsByMedication.get(id) ?? [],
        withdrawal: scheduledWithdrawals.get(id) ?? null,
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
  const medicationSearchMatches=useMemo(()=>new Set(filterLocalSearchIndex(medicationSearchIndex,searchQuery)),[medicationSearchIndex,searchQuery]);

  const listaProcessada =
    useMemo(() => {
      let processados = [...listaBase];

      processados = processados.filter((item) => {
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

        if (medicationFilter === "sos") return item.isSOS;

        if (medicationFilter === "controlados") {
          return Boolean(
            regulatoryProfile?.verified
          );
        }

        return true;
      });

      processados=processados.filter(item=>medicationSearchMatches.has(item));

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
        catalogIdentity?.activeIngredients ?? [];

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
        isEstoqueZerado
          ? "border-coral/25 bg-coral/[0.07] text-coral"
          : isEstoqueCritico
            ? "border-amber-400/25 bg-amber-400/[0.07] text-amber-400"
            : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400";

      const estoqueStatus =
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
        !isEstoqueZerado;

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
            scheduledWithdrawalId: scheduledWithdrawals.get(med.id!)?.id,
          })
        : null;
      const careDecision = careDecisionsByMedication.get(med.id!) ?? decideMedicationCarePath({ medication: med, renewals: [], today: hojeString, needsPrescription: false, needsStock: false });
      const brainCareItem = brainCareByMedication.get(med.id!);
      const supplyRoute = supplyRouteByMedication.get(med.id!);
      const brainAction = brainCareItem && (brainCareItem.lane === "now" || brainCareItem.lane === "prepare") ? { href: brainCareItem.href, label: brainCareItem.title, description: brainCareItem.reason } : null;
      const careAction = brainAction ?? (careDecision.stage !== "stable"
        ? { href: careDecision.actionHref, label: careDecision.actionLabel, description: careDecision.explanation }
        : accessAction);
      const carePresentation = medicationCarePresentation(careDecision, insight?.urgencia);
      const careActionClass = brainCareItem?.lane === "now" ? "border-coral/25 bg-coral/[0.08] text-coral" : brainCareItem?.lane === "prepare" ? "border-amber-400/25 bg-amber-400/[0.08] text-amber-300" : carePresentation.actionClass;

      // VAULT_V318_CONTEXTUAL_ACTION: visual text only; never reinterpret the care decision.
      const contextualActionLabel = careAction
        ? /retirad/i.test(careAction.href) ? "Abrir retirada"
          : /aquisi|compra/i.test(`${careAction.label} ${careAction.href}`) ? "Registrar aquisição"
          : /receita|renova/i.test(`${careAction.label} ${careAction.href}`) ? "Renovar receita"
          : /document/i.test(`${careAction.label} ${careAction.href}`) ? "Preparar documentos"
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
                `/saude/medicamentos/detalhes?id=${med.id}`
              );
            }
          }
          isDisabled={
            isSuspenso
          }
          density="compact"
          compactTight
          interactiveContent
          navigationLabel={`Ver detalhes de ${med.nome}`}
          icon={
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${regulatorySurface.iconClass} ${regulatorySurface.glowClass}`}
              title={regulatoryMeaning}
            >
              <SelectedFormatIcon
                size={18}
                fill={fillValue}
                stroke={strokeValue}
              />
            </span>
          }
        >
          <div className="relative flex min-w-0 flex-col gap-1">

            {/* IDENTIDADE · VAULT_V318_COMPACT_IDENTITY */}
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h3 title={med.nome} className="min-w-0 max-w-full line-clamp-2 break-words font-display text-[14px] font-bold leading-tight text-ink-primary">
                  {med.nome}
                </h3>
                {med.dosagem && (
                  <span title={med.dosagem} className="min-w-0 max-w-full text-[11px] font-semibold leading-tight text-ink-muted">
                    {med.dosagem}
                  </span>
                )}
              </div>
              {showActiveIngredient && (
                <p className="sr-only" title={`Princípio ativo: ${activeIngredient}`}>
                  Princípio ativo: {activeIngredient}
                </p>
              )}
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px]">
                {/* VAULT_REGULATORY_EDGE_LABEL_V76_1 — VAULT_REGULATORY_RAIL_LABEL_V76_2: classification remains interactive */}
                {(regulatoryProfile || receita) && (
                  <button
                    type="button"
                    title={regulatoryMeaning}
                    aria-label={`Ver classificação da receita: ${regulatoryProfile?.label || receita?.sigla || "Receita"}`}
                    aria-haspopup={regulatoryProfile ? "dialog" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!regulatoryProfile) return;
                      trigger("vibrate");
                      setSelectedRegulatory(regulatoryProfile);
                    }}
                    className="inline-flex min-h-7 max-w-full items-center gap-1 rounded-lg border border-surface-border/50 bg-surface-raised/60 px-2 text-[10px] font-semibold text-ink-muted"
                  >
                    <span aria-hidden="true">ⓘ</span>
                    <span className="max-w-[10rem] truncate">{regulatoryProfile?.verified === false ? "Receita n/c" : regulatoryProfile?.label || receita?.sigla || "Receita"}</span>
                  </button>
                )}
                {isSOS && <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">SOS</span>}
                {isTemporary && <span className="rounded-md bg-violet-400/10 px-1.5 py-0.5 text-[9px] font-bold text-violet-300">POR PERÍODO</span>}
                {catalogIdentity?.authorityState === "possible_divergence" && (
                  <span title={catalogIdentity.authorityDetail} className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">Revisar identidade</span>
                )}
                {supplyRoute?.mode === "hybrid" && (
                  <span title="Origem baseada nos vínculos e aquisições registrados" className="max-w-full truncate rounded-md bg-emerald-300/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200">
                    {supplyRoute.labels.join(" + ")}
                  </span>
                )}
                {textoDose && <span title={`Dose ${textoDose}`} className="text-[10px] text-ink-muted">Dose {textoDose}</span>}
                {careDecision.stage !== "stable" && !careAction && (
                  <span title={careDecision.explanation} className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${carePresentation.badgeClass}`}>
                    {careDecision.label}
                  </span>
                )}
              </div>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                {careAction && (
                  <button
                    type="button"
                    className={`inline-flex min-h-9 max-w-full items-center justify-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-bold transition-all active:scale-[0.97] ${careActionClass}`}
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
                    <span className="min-w-0 line-clamp-2 break-words">{contextualActionLabel}</span>
                    <span className="sr-only">{careAction.label}</span>
                  </button>
                )}
                {!isSuspenso && canQuickDose && quickDoseLabel ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      trigger("vibrate");
                      setQuickDoseMedId(med.id!);
                    }}
                    className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border px-2.5 text-[11px] font-black transition-all active:scale-[0.97] ${isSOS ? "border-amber-400/20 bg-amber-400/[0.07] text-amber-400" : "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-400"}`}
                    aria-label={`${quickDoseLabel} ${med.nome}`}
                  >
                    <Zap size={12} fill="currentColor" />
                    {quickDoseLabel}
                  </button>
                ) : null}
              </div>
            </div>

            {/* VAULT_MEDICATION_LIST_HIERARCHY_V98
                Indicações, médico e tratamentos ficam nos Detalhes.
                A lista preserva apenas identidade, rotina, estoque e exceções. */}

            {/* VAULT_V318_OPERATIONAL_STRIP: summary only, no repeated mini-dashboard */}
            <div
              className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-surface-border/25 bg-void/20 px-2 py-1.5 text-[10px] leading-snug"
              aria-label={`Hoje: ${todayStatus.label}. Estoque: ${humanizeStockText(textoEstoquePrincipal)}. ${textoEstoqueSecundario || estoqueStatus}`}
              title={`${todayStatus.detail} · ${textoEstoqueSecundario || estoqueStatus}`}
            >
              <span className={`inline-flex min-w-0 items-center gap-1 font-semibold ${todayStatus.tone}`}>
                {dosesIgnoradasHoje > 0 && !isSOS ? <MinusCircle size={12} className="shrink-0" /> : rotinaConcluida || sosTomadoHoje ? <CheckCircle2 size={12} className="shrink-0" /> : <Circle size={11} className="shrink-0" />}
                <span className="min-w-0 break-words">{todayStatus.label}</span>
              </span>
              <span className="text-ink-faint" aria-hidden="true">·</span>
              <span className={`inline-flex min-w-0 items-center gap-1 font-semibold ${isEstoqueZerado ? "text-coral" : isEstoqueCritico ? "text-amber-400" : "text-emerald-400"}`}>
                <Droplet size={11} className="shrink-0" />
                <span className="min-w-0 break-words">{humanizeStockText(textoEstoquePrincipal)}</span>
              </span>
            </div>

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
                    ? "border-ice/40 bg-ice/10 text-ice"
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ice/30 bg-ice/10 text-ice transition-all active:scale-95"
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
                  className="h-11 w-full rounded-2xl border border-ice/20 bg-surface-raised pl-10 pr-10 text-sm text-ink-primary outline-none transition-colors placeholder:text-ink-faint focus:border-ice/45"
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

        {/* VAULT_MEDICATION_FILTERS_V97 */}
        <div className="border-b border-surface-border/20 px-5 py-2.5">
          <div className="-mx-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-1.5">
              {([
                ["todos", "Todos"],
                ["atencao", "Atenção"],
                ["continuos", "Contínuos"],
                ["sos", "SOS"],
                ["controlados", "Controlados"],
                ["encerrados", "Encerrados"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectMedicationFilter(value)}
                  className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-all active:scale-[0.97] ${
                    medicationFilter === value
                      ? value === "atencao"
                        ? "border-amber-400/35 bg-amber-400/10 text-amber-300"
                        : value === "sos"
                          ? "border-violet-400/35 bg-violet-400/10 text-violet-300"
                          : value === "encerrados"
                            ? "border-ink-muted/30 bg-surface-raised text-ink-muted"
                            : "border-ice/35 bg-ice/10 text-ice"
                      : "border-surface-border/40 bg-surface text-ink-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        <section className="px-5 pt-3">
          {listaProcessada.length>0?<ClinicalSectionNav label="Grupos de medicamentos" items={[...(medsPrioridade.length?[{id:"medicamentos-atencao",label:"Atenção",icon:<AlertTriangle size={14}/>,badge:medsPrioridade.length}]:[]),...(medsEmDia.length?[{id:"medicamentos-em-dia",label:"Em dia",icon:<CheckCircle2 size={14}/>,badge:medsEmDia.length}]:[]),...(medsPlanejados.length?[{id:"medicamentos-planejados",label:"Próximas",icon:<Calendar size={14}/>,badge:medsPlanejados.length}]:[]),...(medsSOS.length?[{id:"medicamentos-sos",label:"SOS",icon:<Zap size={14}/>,badge:medsSOS.length}]:[]),...(medsSuspensos.length?[{id:"medicamentos-suspensos",label:"Suspensos",icon:<EyeOff size={14}/>,badge:medsSuspensos.length}]:[])]}/>:null}
          <div className="mb-3 rounded-[18px] border border-surface-border/45 bg-surface px-3 py-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-ink-faint">
                  Rotina de hoje
                </p>

                <p className="mt-0.5 text-sm font-bold text-ink-primary">
                  {statsProgresso.total > 0
                    ? `${statsProgresso.completados} de ${statsProgresso.total} doses tomadas`
                    : "Nenhuma dose programada"}
                </p>
              </div>

              <div
                className={`shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-black tabular-nums ${
                  statsProgresso.total > 0 &&
                  statsProgresso.completados >=
                    statsProgresso.total
                    ? "bg-emerald-400/10 text-emerald-400"
                    : "bg-ice/10 text-ice"
                }`}
              >
                {statsProgresso.total > 0
                  ? `${Math.round(
                      (
                        statsProgresso.completados /
                        statsProgresso.total
                      ) * 100
                    )}%`
                  : "—"}
              </div>
            </div>

            {statsProgresso.total > 0 && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-[width]"
                  style={{
                    width:
                      `${Math.min(
                        100,
                        (
                          statsProgresso.completados /
                          statsProgresso.total
                        ) * 100
                      )}%`,
                  }}
                />
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-semibold">
              <span className="text-amber-400">
                {medsPrioridade.length} precisam de atenção
              </span>

              <span className="text-emerald-400">
                {medsEmDia.length} em dia
              </span>

              {medsPlanejados.length > 0 && <span className="text-ice">{medsPlanejados.length} planejado(s)</span>}

              {statsProgresso.ignoradas > 0 && <span className="text-amber-400">{statsProgresso.ignoradas} ignorada(s) · não contam como tomadas</span>}
              <span className="text-violet-400">
                {medsSOS.length} SOS
              </span>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[8px] font-semibold text-ink-faint">
            <span className="inline-flex items-center gap-1">
              <i className="h-1.5 w-1.5 rounded-full bg-coral" />
              ação importante
            </span>

            <span className="inline-flex items-center gap-1">
              <i className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              pendência
            </span>

            <span className="inline-flex items-center gap-1">
              <i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              concluído
            </span>

            <span className="inline-flex items-center gap-1">
              <i className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              SOS
            </span>
          </div>

          {listaProcessada.length ===
          0 ? (
            <EmptyState
              icon={
                Pill
              }
              title="Nenhum medicamento encontrado"
              description={
                searchQuery
                  ? "Nenhum medicamento corresponde à busca."
                  : "Nenhum medicamento cadastrado para esta pessoa."
              }
              actionLabel={
                searchQuery
                  ? "Limpar"
                  : undefined
              }
              onAction={
                searchQuery
                  ? () =>
                      setSearchQuery(
                        ""
                      )
                  : undefined
              }
            />
          ) : (
            <div className="space-y-2.5 pb-8">
              <ClinicalCollectionGroup id="medicamentos-atencao" title="Precisa de atenção" description="Doses, estoque ou próxima etapa que exigem ação" count={medsPrioridade.length} icon={AlertTriangle} tone="attention" defaultOpen forceOpen={Boolean(searchQuery)||medicationFilter!=="todos"}>{medsPrioridade.map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-em-dia" title="Em dia" description="Rotina atual sem pendência operacional" count={medsEmDia.length} icon={CheckCircle2} tone="positive" defaultOpen={medsPrioridade.length===0&&medsEmDia.length<=4} forceOpen={Boolean(searchQuery)||medicationFilter!=="todos"}>{medsEmDia.map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-planejados" title="Próximas etapas" description="Planejamento futuro, sem tratar como realizado" count={medsPlanejados.length} icon={Calendar} forceOpen={Boolean(searchQuery)||medicationFilter!=="todos"}>{medsPlanejados.map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-sos" title="SOS / conforme necessidade" description="Acesso rápido sem misturar com a rotina programada" count={medsSOS.length} icon={Zap} tone="sos" forceOpen={Boolean(searchQuery)||medicationFilter==="sos"}>{medsSOS.map(renderCard)}</ClinicalCollectionGroup>
              <ClinicalCollectionGroup id="medicamentos-suspensos" title="Suspensos" description="Histórico preservado fora do cuidado atual" count={medsSuspensos.length} icon={EyeOff} forceOpen={Boolean(searchQuery)||medicationFilter==="encerrados"}>{medsSuspensos.map(renderCard)}</ClinicalCollectionGroup>
            </div>
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
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-ink-faint">
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
                <p className="mt-2.5 text-[10px] leading-relaxed text-amber-200">
                  Medicamento identificado no catálogo. O tipo de receita ainda não possui confirmação regulatória na fonte atual.
                </p>
              )}

              <p className="mt-2.5 text-[9px] leading-relaxed text-ink-faint">
                Informação para organização de receitas e renovações.
              </p>
            </section>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
