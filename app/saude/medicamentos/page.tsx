// app/saude/medicamentos/page.tsx
"use client";

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
  Circle,
  Droplet,
  Eye,
  EyeOff,
  History,
  Pill,
  Search,
  Stethoscope,
  StickyNote,
  Syringe,
  X,
  Zap,
  type LucideIcon,
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
  useTratamentos,
} from "@/hooks/useTratamentos";

import {
  getClinicalTheme,
} from "@/lib/health-utils";

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

import { useMedicationRegulatoryProfiles } from "@/hooks/useMedicationRegulatoryProfiles";
import { getMedicationRegulatorySurface } from "@/lib/medication-regulatory-visual";

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
// SECTION TITLE
// ============================================================

const SectionTitle = ({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) => (
  <div className="mb-1.5 mt-4 flex items-center gap-2 pl-1 opacity-80">
    <Icon
      size={16}
      className="text-ink-muted"
    />

    <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
      {title}
    </h2>
  </div>
);

// ============================================================
// PAGE
// ============================================================

export default function MedicamentosListPage() {
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    medicamentos:
      medicamentosTodas,
  } =
    useMedicamentos();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    tratamentos,
  } =
    useTratamentos();

  const tratamentosPorId =
    useMemo(
      () =>
        new Map(
          (tratamentos || [])
            .filter(
              (tratamento) =>
                Boolean(
                  tratamento.id
                )
            )
            .map(
              (tratamento) => [
                tratamento.id!,
                tratamento,
              ]
            )
        ),
      [
        tratamentos,
      ]
    );

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

  const [
    showDescontinuados,
    setShowDescontinuados,
  ] =
    useState(
      false
    );

  const [
    quickDoseMedId,
    setQuickDoseMedId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    expandedRegulatoryMedId,
    setExpandedRegulatoryMedId,
  ] = useState<string | null>(null);

  // ==========================================================
  // PREFERÊNCIA DE SUSPENSOS
  // ==========================================================

  useEffect(
    () => {
      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      const savedSuspended =
        localStorage.getItem(
          "@vault:meds_showSuspended"
        );

      if (
        savedSuspended !==
        null
      ) {
        setShowDescontinuados(
          savedSuspended ===
            "true"
        );
      }
    },
    []
  );

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

  const regulatoryProfiles =
    useMedicationRegulatoryProfiles(
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

  // ==========================================================
  // LISTA VISÍVEL
  // ==========================================================

  const listaProcessada =
    useMemo(
      () => {
        let processados =
          [
            ...listaBase,
          ];

        if (
          !showDescontinuados
        ) {
          processados =
            processados.filter(
              (
                item
              ) =>
                !item.isSuspenso
            );
        }

        const query =
          searchQuery
            .toLowerCase()
            .trim();

        if (
          query
        ) {
          processados =
            processados.filter(
              (
                item
              ) =>
                (
                  item.med.nome
                    ?.toLowerCase() ||
                  ""
                ).includes(
                  query
                ) ||
                (
                  item.med.medico
                    ?.toLowerCase() ||
                  ""
                ).includes(
                  query
                )
            );
        }

        return processados;
      },
      [
        listaBase,
        showDescontinuados,
        searchQuery,
      ]
    );

  // ==========================================================
  // PROGRESSO DIÁRIO REAL POR DOSES
  // ==========================================================

  const statsProgresso =
    useMemo(
      () => {
        const continuos =
          listaBase.filter(
            (
              item
            ) =>
              !item.isSOS &&
              !item.isSuspenso
          );

        const total =
          continuos.reduce(
            (
              acc,
              item
            ) =>
              acc +
              item.dosesEsperadasHoje,
            0
          );

        const completados =
          continuos.reduce(
            (
              acc,
              item
            ) =>
              acc +
              Math.min(
                item.dosesTomadasHoje,
                item.dosesEsperadasHoje
              ),
            0
          );

        return {
          total,
          completados,
          pendentes:
            Math.max(
              0,
              total -
                completados
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
              item.isEstoqueZerado ||
              item.isEstoqueCritico ||
              item.insight.deveRenovar ||
              item.dosesPendentesHoje >
                0;

            if (precisaAcao) {
              prioridade.push(
                item
              );

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

        const byName = (a: ProcessedMed, b: ProcessedMed) =>
          String(a.med.nome || "").localeCompare(String(b.med.nome || ""), "pt-BR");

        sos.sort(byName);
        suspensos.sort(byName);

        return {
          medsPrioridade:
            prioridade,

          medsEmDia:
            emDia,

          medsSOS:
            sos,

          medsSuspensos:
            suspensos,
        };
      },
      [
        listaProcessada,
      ]
    );

  // ==========================================================
  // HANDLERS
  // ==========================================================

  const handleToggleSuspensos =
    () => {
      trigger(
        "vibrate"
      );

      setShowDescontinuados(
        (
          previous
        ) => {
          const next =
            !previous;

          if (
            typeof window !==
            "undefined"
          ) {
            localStorage.setItem(
              "@vault:meds_showSuspended",
              String(
                next
              )
            );
          }

          return next;
        }
      );
    };

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
      const tratamentosVinculados =
        (
          med.tratamento_ids ||
          []
        )
          .map(
            (tratamentoId) =>
              tratamentosPorId.get(
                tratamentoId
              )
          )
          .filter(
            (
              tratamento
            ): tratamento is NonNullable<typeof tratamento> =>
              Boolean(
                tratamento
              )
          );

      const tratamentoThemes =
        tratamentosVinculados.map(
          (tratamento) => ({
            tratamento,
            theme:
              getClinicalTheme(
                tratamento.nome ||
                  ""
              ),
          })
        );

      const regulatoryProfile =
        regulatoryProfiles[med.id];

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

      const rotinaConcluida =
        !isSOS &&
        !isSuspenso &&
        dosesEsperadasHoje >
          0 &&
        dosesPendentesHoje ===
          0;

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
            : rotinaConcluida
              ? null
              : "Tomar";

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
          icon={
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-[13px] border ${regulatorySurface.iconClass} ${regulatorySurface.glowClass}`}
              title={regulatoryMeaning}
            >
              <SelectedFormatIcon
                size={20}
                fill={fillValue}
                stroke={strokeValue}
              />
            </span>
          }
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            {/* IDENTIDADE */}

            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full border ${regulatorySurface.dotClass} ${regulatorySurface.glowClass}`}
                    style={{
                      backgroundColor:
                        regulatorySurface.accent,
                    }}
                    title={regulatoryMeaning}
                    aria-label={regulatoryMeaning}
                  />

                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h3 className="min-w-0 truncate font-display text-[15px] font-bold leading-tight text-ink-primary">
                    {
                      med.nome
                    }
                  </h3>

                    {med.dosagem && (
                      <span className="shrink-0 text-[11px] font-semibold text-ink-muted">
                        {
                          med.dosagem
                        }
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1">
                  {regulatoryProfile ? (
                    <button
                      type="button"
                      className={`inline-flex h-5.5 shrink-0 items-center rounded-lg border px-2 text-[9px] font-black uppercase tracking-wide ${regulatorySurface.badgeClass}`}
                      title={regulatoryMeaning}
                      aria-expanded={expandedRegulatoryMedId === med.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        trigger("vibrate");
                        setExpandedRegulatoryMedId(
                          expandedRegulatoryMedId === med.id
                            ? null
                            : med.id!
                        );
                      }}
                    >
                      {regulatoryProfile.label}
                      {!regulatoryProfile.verified && regulatoryProfile.tone !== "unknown" ? " · cadastro" : ""}
                    </button>
                  ) : receita && (
                    <span
                      className={`inline-flex h-5.5 shrink-0 items-center rounded-lg border px-2 text-[9px] font-black uppercase tracking-wide ${receita.textColorClass}`}
                      style={{
                        borderColor:
                          `${regulatoryBorderColor}55`,
                        backgroundColor:
                          `${regulatoryBorderColor}12`,
                      }}
                      title={
                        receita.tooltip
                      }
                    >
                      {
                        receita.sigla
                      }
                    </span>
                  )}

                  {isSOS && (
                    <span className="inline-flex h-6 shrink-0 items-center rounded-lg border border-amber-400/20 bg-amber-400/[0.07] px-2 text-[9px] font-bold uppercase tracking-wide text-amber-400">
                      SOS
                    </span>
                  )}

                  {med.medico && (
                    <span className="inline-flex h-5.5 max-w-[132px] items-center gap-1 rounded-lg border border-surface-border/40 bg-surface-raised/55 px-2 text-[9px] font-semibold text-ink-muted">
                      <Stethoscope
                        size={
                          10
                        }
                        className="shrink-0 opacity-60"
                      />

                      <span className="truncate">
                        {
                          med.medico
                        }
                      </span>
                    </span>
                  )}

                  {textoDose && (
                    <span className="inline-flex h-6 shrink-0 items-center rounded-lg border border-surface-border/40 bg-surface-raised/55 px-2 text-[9px] font-semibold text-ink-muted">
                      Dose&nbsp;
                      <strong className="font-bold text-ink-primary">
                        {
                          textoDose
                        }
                      </strong>
                    </span>
                  )}
                </div>

                {/* VAULT_REGULATORY_EXPLANATION_V35_1 */}
                {expandedRegulatoryMedId === med.id && regulatoryProfile && (
                  <div
                    className="mt-2 rounded-xl border border-surface-border/40 bg-surface-raised/70 px-3 py-2 text-[10px] leading-relaxed text-ink-muted"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <strong className="text-ink-primary">
                      {regulatoryProfile.label}
                    </strong>
                    {" · "}
                    {regulatoryProfile.detail}
                    {regulatoryProfile.sourceLabel
                      ? ` Fonte: ${regulatoryProfile.sourceLabel}.`
                      : ""}
                  </div>
                )}
              </div>

              {insight?.deveRenovar && (
                <div
                  className={`flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[9px] font-bold ${
                    insight.urgencia ===
                    "alta"
                      ? "border-coral/25 bg-coral/[0.08] text-coral"
                      : "border-amber-400/25 bg-amber-400/[0.08] text-amber-400"
                  }`}
                  title={
                    insight.mensagem
                  }
                >
                  <AlertTriangle
                    size={
                      11
                    }
                  />

                  Receita
                </div>
              )}
            </div>

            {/* CONTEXTO CLÍNICO */}
            {tratamentoThemes.length >
              0 && (
              <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                {tratamentoThemes
                  .slice(
                    0,
                    2
                  )
                  .map(
                    (
                      item
                    ) => (
                      <span
                        key={
                          item.tratamento.id
                        }
                        className="inline-flex h-5 min-w-0 max-w-[150px] items-center rounded-lg border px-2 text-[9px] font-semibold"
                        style={{
                          color:
                            item.theme.hex,
                          borderColor:
                            `${item.theme.hex}30`,
                          backgroundColor:
                            `${item.theme.hex}0D`,
                        }}
                      >
                        <span className="truncate">
                          {
                            item.tratamento.nome
                          }
                        </span>
                      </span>
                    )
                  )}

                {tratamentoThemes.length >
                  2 && (
                  <span className="shrink-0 text-[9px] font-semibold text-ink-faint">
                    +{
                      tratamentoThemes.length -
                      2
                    }
                  </span>
                )}
              </div>
            )}

            {/* PAINEL OPERACIONAL COMPACTO */}

            <div className="rounded-xl border border-surface-border/30 bg-black/[0.05] px-2.5 py-1">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {rotinaConcluida ||
                    sosTomadoHoje ? (
                      <CheckCircle2
                        size={
                          12
                        }
                        className="shrink-0 text-emerald-400"
                      />
                    ) : (
                      <Circle
                        size={
                          10
                        }
                        className="shrink-0 text-ink-faint"
                      />
                    )}

                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-ink-faint">
                      Hoje
                    </span>
                  </div>

                  <p
                    className={`mt-1 whitespace-normal break-words text-[10px] font-bold leading-snug ${todayStatus.tone}`}
                  >
                    {
                      todayStatus.label
                    }
                  </p>

                  {todayStatus.detail &&
                    todayStatus.detail !==
                      "Tudo certo hoje" && (
                    <p className="mt-0.5 line-clamp-1 text-[8px] font-medium leading-snug text-ink-faint">
                      {
                        todayStatus.detail
                      }
                    </p>
                  )}
                </div>

                <div className="h-9 w-px shrink-0 bg-surface-border/35" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Droplet
                      size={
                        9
                      }
                      className={
                        isEstoqueZerado
                          ? "text-coral"
                          : isEstoqueCritico
                            ? "text-amber-400"
                            : "text-emerald-400"
                      }
                    />

                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-ink-faint">
                      Estoque
                    </span>
                  </div>

                  <p
                    className={`mt-1 whitespace-normal break-words text-[10px] font-black leading-snug ${
                      isEstoqueZerado
                        ? "text-coral"
                        : isEstoqueCritico
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }`}
                  >
                    {
                      humanizeStockText(
                        textoEstoquePrincipal
                      )
                    }
                  </p>

                  <p className="mt-0.5 line-clamp-1 text-[8px] font-semibold leading-snug text-ink-faint">
                    {
                      textoEstoqueSecundario ||
                      estoqueStatus
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* AÇÕES */}

            {!isSuspenso &&
              (
                (
                  canQuickDose &&
                  quickDoseLabel
                ) ||
                insight.deveRenovar
              ) && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-surface-border/20 pt-1.5">
                {canQuickDose &&
                  quickDoseLabel && (
                  <button
                    type="button"
                    onClick={
                      (
                        event
                      ) => {
                        event.stopPropagation();

                        trigger(
                          "vibrate"
                        );

                        setQuickDoseMedId(
                          med.id!
                        );
                      }
                    }
                    className={`inline-flex h-7.5 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-bold transition-all active:scale-[0.97] ${
                      isSOS
                        ? "border-amber-400/20 bg-amber-400/[0.08] text-amber-400"
                        : "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-400"
                    }`}
                  >
                    <Zap
                      size={
                        11
                      }
                      fill="currentColor"
                    />

                    {
                      quickDoseLabel
                    }
                  </button>
                )}

                {insight.deveRenovar && (
                  <button
                    type="button"
                    onClick={
                      (
                        event
                      ) => {
                        event.stopPropagation();

                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/documentos/novo?medicamento_id=${med.id}`
                        );
                      }
                    }
                    className={`inline-flex h-7.5 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-bold transition-all active:scale-[0.97] ${
                      insight.urgencia ===
                      "alta"
                        ? "border-coral/25 bg-coral/[0.08] text-coral"
                        : "border-amber-400/25 bg-amber-400/[0.08] text-amber-400"
                    }`}
                  >
                    <Calendar
                      size={
                        11
                      }
                    />

                    Nova receita
                  </button>
                )}
              </div>
            )}
          </div>
        </ListCard>
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    medicamentosTodas ===
      undefined ||
    doseLogs ===
      undefined
  ) {
    return (
      <CardListSkeleton />
    );
  }

  const totalAtivos =
    listaBase.filter(
      (
        item
      ) =>
        !item.isSuspenso
    ).length;

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

              <button
                type="button"
                onClick={handleToggleSuspensos}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
                  showDescontinuados
                    ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
                aria-label={
                  showDescontinuados
                    ? "Ocultar medicamentos suspensos"
                    : "Mostrar medicamentos suspensos"
                }
              >
                {showDescontinuados ? (
                  <Eye size={18} />
                ) : (
                  <EyeOff size={18} />
                )}
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
                  placeholder="Remédio ou médico..."
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

        {/* CONTEÚDO */}

        <section className="px-5 pt-4">
          <div className="mb-3 rounded-[18px] border border-surface-border/45 bg-surface px-3 py-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-ink-faint">
                  Rotina de hoje
                </p>

                <p className="mt-0.5 text-sm font-bold text-ink-primary">
                  {statsProgresso.total > 0
                    ? `${statsProgresso.completados} de ${statsProgresso.total} doses concluídas`
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
              {medsPrioridade.length >
                0 && (
                <>
                  <SectionTitle
                    icon={
                      AlertTriangle
                    }
                    title="Rotina de hoje"
                  />

                  {medsPrioridade.map(
                    renderCard
                  )}
                </>
              )}

              {medsEmDia.length >
                0 && (
                <>
                  <SectionTitle
                    icon={
                      CheckCircle2
                    }
                    title="Em dia"
                  />

                  {medsEmDia.map(
                    renderCard
                  )}
                </>
              )}

              {medsSOS.length >
                0 && (
                <>
                  <SectionTitle
                    icon={
                      Zap
                    }
                    title={`Uso esporádico (SOS) · ${medsSOS.length}`}
                  />

                  {medsSOS.map(
                    renderCard
                  )}
                </>
              )}

              {medsSuspensos.length >
                0 && (
                <>
                  <SectionTitle
                    icon={
                      EyeOff
                    }
                    title={`Suspensos · ${medsSuspensos.length}`}
                  />

                  {medsSuspensos.map(
                    renderCard
                  )}
                </>
              )}
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
      </main>
    </PageTransition>
  );
}
