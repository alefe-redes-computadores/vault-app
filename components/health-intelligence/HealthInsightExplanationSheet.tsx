// components/health-intelligence/HealthInsightExplanationSheet.tsx
"use client";

import {
  useEffect,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Activity,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  Database,
  Info,
  Minus,
  ShieldCheck,
  X,
} from "lucide-react";

import type {
  HealthInsight,
} from "@/lib/health-insights";

import type {
  HealthIntelligenceSource,
} from "@/hooks/useHealthIntelligence";

type HealthInsightExplanationSheetProps = {
  isOpen: boolean;

  mode:
    | "insight"
    | "sources";

  insight:
    | HealthInsight
    | null;

  sources:
    HealthIntelligenceSource[];

  onClose:
    () => void;

  onNavigate:
    (
      href: string
    ) => void;
};

function getConfidenceDescription(
  confidence:
    HealthInsight["confianca"]
) {
  switch (confidence) {
    case "alta":
      return "O comportamento apareceu de forma consistente nos registros disponíveis. Isso aumenta a confiança no padrão observado, mas não representa certeza médica.";

    case "media":
      return "Há registros suficientes para sinalizar este comportamento, mas a quantidade de dados, o período ou a consistência ainda limitam a conclusão.";

    default:
      return "Ainda existem poucos dados para tratar esta observação como um padrão consistente.";
  }
}

function getDestinationLabel(
  insight:
    HealthInsight
) {
  const link =
    insight.link ||
    "";

  if (
    link.startsWith(
      "/saude/renovacao"
    )
  ) {
    return "Ver renovações";
  }

  switch (
    insight.entidadeTipo
  ) {
    case "medicamento":
      return "Ver medicamento";

    case "tratamento":
      return "Ver tratamento";

    case "consulta":
      return "Ver consulta";

    case "exame":
      return "Ver exame";

    case "cirurgia":
      return "Ver cirurgia";

    case "cid":
      return "Ver CID";

    case "documento":
      return "Ver documento";

    default:
      return "Ver detalhes";
  }
}

function formatCategory(
  category:
    string
) {
  return category
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

export function HealthInsightExplanationSheet({
  isOpen,
  mode,
  insight,
  sources,
  onClose,
  onNavigate,
}: HealthInsightExplanationSheetProps) {
  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      const handleKeyDown =
        (
          event:
            KeyboardEvent
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            onClose();
          }
        };

      window.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        document.body.style.overflow =
          previousOverflow;

        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      isOpen,
      onClose,
    ]
  );

  const totalRecords =
    sources.reduce(
      (
        total,
        source
      ) =>
        total +
        source.count,
      0
    );

  const sourcesWithData =
    sources.filter(
      (source) =>
        source.hasData
    ).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Fechar explicação"
            onClick={
              onClose
            }
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={
              mode ===
              "sources"
                ? "Fontes da inteligência do Vault"
                : "Explicação do insight do Vault"
            }
            initial={{
              opacity: 0,
              y: 40,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: 40,
            }}
            transition={{
              type:
                "spring",
              damping: 28,
              stiffness: 320,
            }}
            className="relative z-10 max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[30px] border border-surface-border bg-surface-raised px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3 shadow-2xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/10" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                    {mode ===
                    "sources" ? (
                      <Database
                        size={
                          16
                        }
                      />
                    ) : (
                      <Activity
                        size={
                          16
                        }
                      />
                    )}
                  </div>

                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-violet-300">
                      {mode ===
                      "sources"
                        ? "Contexto analisado"
                        : "Inteligência explicável"}
                    </p>

                    <h2 className="mt-0.5 font-display text-base font-semibold text-ink-primary">
                      {mode ===
                      "sources"
                        ? "Fontes usadas pelo Vault"
                        : "Por que o Vault mostrou isso?"}
                    </h2>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  onClose
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface text-ink-muted transition-all active:scale-95"
                aria-label="Fechar"
              >
                <X
                  size={
                    16
                  }
                />
              </button>
            </div>

            {mode ===
            "sources" ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.04] p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Info
                      size={
                        16
                      }
                      className="mt-0.5 shrink-0 text-violet-300"
                    />

                    <p className="text-[11px] leading-relaxed text-ink-muted">
                      Estas são categorias de dados do histórico desta pessoa disponíveis para análise. Elas não representam fontes médicas externas e nem um diagnóstico.
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 font-mono text-[9px] font-semibold text-violet-300">
                      {sourcesWithData}/{sources.length} fontes com dados
                    </span>

                    <span className="rounded-full border border-surface-border bg-surface px-2.5 py-1 font-mono text-[9px] text-ink-muted">
                      {totalRecords} registros
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {sources.map(
                    (
                      source
                    ) => (
                      <div
                        key={
                          source.key
                        }
                        className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface px-3.5 py-3"
                      >
                        <div
                          className={
                            source.hasData
                              ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"
                              : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] text-ink-faint"
                          }
                        >
                          {source.hasData ? (
                            <Check
                              size={
                                15
                              }
                            />
                          ) : (
                            <Minus
                              size={
                                15
                              }
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-ink-primary">
                            {
                              source.label
                            }
                          </p>

                          <p className="mt-0.5 text-[10px] text-ink-faint">
                            {source.hasData
                              ? `${source.count} registro${source.count === 1 ? "" : "s"} disponível${source.count === 1 ? "" : "is"}`
                              : "Nenhum registro disponível"}
                          </p>
                        </div>

                        <span
                          className={
                            source.hasData
                              ? "font-mono text-[10px] font-semibold text-emerald-300"
                              : "font-mono text-[10px] text-ink-faint"
                          }
                        >
                          {
                            source.count
                          }
                        </span>
                      </div>
                    )
                  )}
                </div>

                <div className="rounded-2xl border border-surface-border bg-surface p-3.5">
                  <p className="text-[10px] leading-relaxed text-ink-faint">
                    A maturidade do Vault mede variedade, volume e consistência do contexto disponível. Ela não mede seu estado de saúde.
                  </p>
                </div>
              </div>
            ) : insight ? (
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-violet-400/10 px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-violet-300">
                      {
                        formatCategory(
                          insight.categoria
                        )
                      }
                    </span>

                    <span className="text-[10px] text-ink-faint">
                      Confiança {
                        insight.confianca
                      }
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-bold text-ink-primary">
                    {
                      insight.titulo
                    }
                  </h3>

                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
                    {
                      insight.mensagem
                    }
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-surface-border bg-surface p-3">
                    <div className="flex items-center gap-1.5 text-ink-faint">
                      <BarChart3
                        size={
                          13
                        }
                      />

                      <span className="font-mono text-[8px] uppercase tracking-wider">
                        Amostra
                      </span>
                    </div>

                    <p className="mt-1.5 text-sm font-semibold text-ink-primary">
                      {
                        insight.amostra
                      }{" "}
                      registro{
                        insight.amostra ===
                        1
                          ? ""
                          : "s"
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl border border-surface-border bg-surface p-3">
                    <div className="flex items-center gap-1.5 text-ink-faint">
                      <CalendarDays
                        size={
                          13
                        }
                      />

                      <span className="font-mono text-[8px] uppercase tracking-wider">
                        Período
                      </span>
                    </div>

                    <p className="mt-1.5 text-sm font-semibold text-ink-primary">
                      {insight.periodoDias
                        ? `${insight.periodoDias} dias`
                        : "Histórico disponível"}
                    </p>
                  </div>
                </div>

                {insight.evidencias &&
                  insight.evidencias.length >
                    0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Database
                        size={
                          14
                        }
                        className="text-violet-300"
                      />

                      <h4 className="text-xs font-semibold text-ink-primary">
                        Evidências usadas
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {insight.evidencias.map(
                        (
                          evidence,
                          index
                        ) => (
                          <div
                            key={
                              `${insight.id}-evidence-${index}`
                            }
                            className="flex items-start gap-2.5 rounded-2xl border border-surface-border bg-surface px-3 py-2.5"
                          >
                            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300" />

                            <p className="text-[11px] leading-relaxed text-ink-muted">
                              {
                                evidence
                              }
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.04] p-3.5">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck
                      size={
                        16
                      }
                      className="mt-0.5 shrink-0 text-violet-300"
                    />

                    <div>
                      <p className="text-[11px] font-semibold text-ink-primary">
                        O que significa confiança {
                          insight.confianca
                        }?
                      </p>

                      <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
                        {
                          getConfidenceDescription(
                            insight.confianca
                          )
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-surface-border bg-surface p-3.5">
                  <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-ink-faint">
                    Limitação
                  </p>

                  <p className="mt-1.5 text-[10px] leading-relaxed text-ink-muted">
                    O Vault descreve padrões encontrados nos registros salvos. Uma associação temporal ou comportamental não prova causa clínica e não substitui avaliação profissional.
                  </p>
                </div>

                {insight.link && (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate(
                        insight.link!
                      )
                    }
                    className="flex w-full items-center justify-between rounded-2xl bg-violet-400 px-4 py-3.5 text-left text-sm font-semibold text-black transition-all active:scale-[0.985]"
                  >
                    <span>
                      {
                        getDestinationLabel(
                          insight
                        )
                      }
                    </span>

                    <ChevronRight
                      size={
                        17
                      }
                    />
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-surface-border bg-surface p-4">
                <p className="text-[11px] text-ink-muted">
                  Este insight não está mais disponível.
                </p>
              </div>
            )}
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
