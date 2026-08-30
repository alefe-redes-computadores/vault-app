// app/saude/registros/detalhes/page.tsx
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  motion,
} from "framer-motion";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileText,
  FolderHeart,
  History,
  Loader2,
  Pill,
  Trash2,
  TrendingUp,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  getClinicalTheme,
  getRegistroTheme,
} from "@/lib/health-utils";

import {
  analisarRegistroSaude,
} from "@/lib/health-insights";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useRegistrosSaude,
} from "@/hooks/useRegistrosSaude";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useTratamentos,
} from "@/hooks/useTratamentos";

import {
  useCids,
} from "@/hooks/useCids";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  DetailSkeleton,
} from "@/components/loading/DetailSkeleton";

import {
  ConfirmationModal,
} from "@/components/ConfirmationModal";

import {
  useToast,
} from "@/components/ToastProvider";

import {
  DetailInfoRow,
  SectionTitle,
} from "@/components/detail/DetailComponents";

import type {
  Cid,
  Medicamento,
  RegistroSaude,
  Tratamento,
} from "@/lib/types";

// ============================================================
// ANIMAÇÃO
// ============================================================

const fadeUp = {
  initial: {
    opacity: 0,
    y: 12,
  },

  animate: {
    opacity: 1,
    y: 0,
  },
};

// ============================================================
// HELPERS
// ============================================================

function formatDateToDisplay(
  isoStr?: string | null
): string {
  if (!isoStr) {
    return "";
  }

  const parts =
    isoStr.split("-");

  if (
    parts.length !==
    3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getCategoriaLabel(
  categoria?: string
): string {
  if (
    categoria ===
    "sintoma"
  ) {
    return "Sintoma";
  }

  if (
    categoria ===
    "medicao"
  ) {
    return "Medição";
  }

  if (
    categoria ===
    "humor"
  ) {
    return "Humor";
  }

  return "Registro de saúde";
}

function registroDateTimeValue(
  registro:
    RegistroSaude
): number {
  const date =
    registro.data ||
    "";

  const time =
    registro.horario ||
    "00:00";

  const timestamp =
    Date.parse(
      `${date}T${time}:00`
    );

  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;
}

// ============================================================
// CONTENT
// ============================================================

function DetalhesRegistroSaudeContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get(
      "id"
    ) ||
    "";

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    showToast,
  } =
    useToast();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    getRegistro,
    getHistoricoSimilar,
    deleteRegistro,
  } =
    useRegistrosSaude();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    tratamentos = [],
  } =
    useTratamentos();

  const {
    cids = [],
  } =
    useCids();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    registro,
    setRegistro,
  ] =
    useState<
      RegistroSaude | null
    >(
      null
    );

  const [
    historicoSimilar,
    setHistoricoSimilar,
  ] =
    useState<
      RegistroSaude[]
    >(
      []
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
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

  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(
    () => {
      let cancelled =
        false;

      const load =
        async () => {
          setIsLoading(
            true
          );

          if (
            !id ||
            !activePersonId
          ) {
            if (
              !cancelled
            ) {
              setRegistro(
                null
              );

              setHistoricoSimilar(
                []
              );

              setIsLoading(
                false
              );
            }

            return;
          }

          try {
            const data =
              await getRegistro(
                id
              );

            if (
              cancelled
            ) {
              return;
            }

            if (
              !data ||
              data.person_id !==
                activePersonId
            ) {
              setRegistro(
                null
              );

              setHistoricoSimilar(
                []
              );

              return;
            }

            setRegistro(
              data
            );

            const history =
              await getHistoricoSimilar(
                id,
                10
              );

            if (
              !cancelled
            ) {
              setHistoricoSimilar(
                history
              );
            }
          } catch (
            error
          ) {
            console.error(
              "[DetalhesRegistro] Erro ao carregar registro:",
              error
            );

            if (
              !cancelled
            ) {
              setRegistro(
                null
              );

              setHistoricoSimilar(
                []
              );
            }
          } finally {
            if (
              !cancelled
            ) {
              setIsLoading(
                false
              );
            }
          }
        };

      void load();

      return () => {
        cancelled =
          true;
      };
    },
    [
      id,
      activePersonId,
      getRegistro,
      getHistoricoSimilar,
    ]
  );

  // ==========================================================
  // RELAÇÕES
  // ==========================================================

  const medicamento =
    useMemo<
      Medicamento | undefined
    >(
      () => {
        if (
          !registro?.medicamento_id
        ) {
          return undefined;
        }

        return medicamentos.find(
          (
            item
          ) =>
            item.id ===
            registro.medicamento_id
        );
      },
      [
        medicamentos,
        registro?.medicamento_id,
      ]
    );

  const tratamentosRelacionados =
    useMemo<
      Tratamento[]
    >(
      () => {
        const ids =
          new Set(
            registro?.tratamento_ids ||
              []
          );

        if (
          ids.size ===
          0
        ) {
          return [];
        }

        return tratamentos.filter(
          (
            tratamento
          ) =>
            Boolean(
              tratamento.id &&
                ids.has(
                  tratamento.id
                )
            )
        );
      },
      [
        tratamentos,
        registro?.tratamento_ids,
      ]
    );

  const cidsRelacionados =
    useMemo<
      Cid[]
    >(
      () => {
        const ids =
          new Set(
            registro?.cid_ids ||
              []
          );

        if (
          ids.size ===
          0
        ) {
          return [];
        }

        return cids.filter(
          (
            cid
          ) =>
            Boolean(
              cid.id &&
                ids.has(
                  cid.id
                )
            )
        );
      },
      [
        cids,
        registro?.cid_ids,
      ]
    );

  // ==========================================================
  // INSIGHT ATUAL
  // ==========================================================

  const insight =
    useMemo(
      () => {
        if (
          !registro
        ) {
          return null;
        }

        return analisarRegistroSaude(
          registro.nome,
          registro.valor_medicao,
          registro.intensidade,
          registro.observacoes
        );
      },
      [
        registro,
      ]
    );

  // ==========================================================
  // CONTEXTO LONGITUDINAL DETERMINÍSTICO
  //
  // Aqui não inventamos diagnóstico nem uma nova API do
  // health-insights.ts.
  //
  // Apenas apresentamos fatos observáveis do histórico
  // person-scoped preparado pelo repository.
  // ==========================================================

  const panoramaHistorico =
    useMemo(
      () => {
        if (
          !registro
        ) {
          return null;
        }

        const serie =
          [
            registro,
            ...historicoSimilar,
          ].sort(
            (
              a,
              b
            ) =>
              registroDateTimeValue(
                b
              ) -
              registroDateTimeValue(
                a
              )
          );

        const intensidades =
          serie
            .map(
              (
                item
              ) =>
                item.intensidade
            )
            .filter(
              (
                value
              ): value is number =>
                typeof value ===
                  "number" &&
                Number.isFinite(
                  value
                )
            );

        const currentIntensity =
          registro.intensidade;

        const anteriores =
          historicoSimilar
            .map(
              (
                item
              ) =>
                item.intensidade
            )
            .filter(
              (
                value
              ): value is number =>
                typeof value ===
                  "number" &&
                Number.isFinite(
                  value
                )
            );

        const mediaAnterior =
          anteriores.length >
          0
            ? anteriores.reduce(
                (
                  total,
                  value
                ) =>
                  total +
                  value,
                0
              ) /
              anteriores.length
            : null;

        let variacaoIntensidade:
          | "acima"
          | "abaixo"
          | "estavel"
          | null =
          null;

        if (
          typeof currentIntensity ===
            "number" &&
          mediaAnterior !==
            null
        ) {
          const diferenca =
            currentIntensity -
            mediaAnterior;

          if (
            diferenca >=
            1
          ) {
            variacaoIntensidade =
              "acima";
          } else if (
            diferenca <=
            -1
          ) {
            variacaoIntensidade =
              "abaixo";
          } else {
            variacaoIntensidade =
              "estavel";
          }
        }

        return {
          totalOcorrencias:
            serie.length,

          primeiraData:
            serie[
              serie.length -
                1
            ]?.data,

          ultimaData:
            serie[
              0
            ]?.data,

          intensidadesRegistradas:
            intensidades.length,

          mediaAnterior,

          variacaoIntensidade,
        };
      },
      [
        registro,
        historicoSimilar,
      ]
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    async () => {
      if (
        !id ||
        !registro ||
        isDeleting
      ) {
        return;
      }

      if (
        !activePersonId ||
        registro.person_id !==
          activePersonId
      ) {
        trigger(
          "error"
        );

        showToast(
          "Registro não pertence à pessoa ativa",
          "error"
        );

        return;
      }

      setIsDeleting(
        true
      );

      try {
        await deleteRegistro(
          id
        );

        trigger(
          "success"
        );

        showToast(
          "Registro excluído com sucesso",
          "success"
        );

        router.replace(
          "/saude/registros"
        );
      } catch (
        error
      ) {
        console.error(
          "[DetalhesRegistro] Erro ao excluir:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao excluir registro",
          "error"
        );

        setIsDeleting(
          false
        );

        throw error;
      }
    };

  // ==========================================================
  // LOADING / NOT FOUND
  // ==========================================================

  if (
    isLoading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (
    !registro
  ) {
    return (
      <PageTransition>
        <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void p-5 text-center">
          <Activity
            size={
              34
            }
            className="text-ink-muted"
          />

          <p className="mt-4 font-semibold text-ink-primary">
            Registro não encontrado
          </p>

          <p className="mt-1 max-w-sm text-sm text-ink-muted">
            O registro não existe ou não pertence à pessoa ativa.
          </p>

          <button
            type="button"
            onClick={
              () =>
                router.replace(
                  "/saude/registros"
                )
            }
            className="mt-5 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
          >
            Voltar
          </button>
        </main>
      </PageTransition>
    );
  }

  // ==========================================================
  // THEME
  // ==========================================================

  const theme =
    getRegistroTheme(
      registro.nome
    );

  const IconComp =
    theme.icon;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-32">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/85 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    router.back();
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

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Activity
                    size={
                      16
                    }
                    className="text-ice"
                  />

                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                    Prontuário
                  </p>
                </div>

                <h1 className="mt-0.5 truncate font-display text-xl font-semibold text-ink-primary">
                  Detalhes do Registro
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    router.push(
                      `/saude/registros/editar?id=${id}`
                    );
                  }
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
                aria-label="Editar registro"
              >
                <Edit3
                  size={
                    16
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

                    setShowDeleteModal(
                      true
                    );
                  }
                }
                disabled={
                  isDeleting
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral transition-all active:scale-95 disabled:opacity-50"
                aria-label="Excluir registro"
              >
                {isDeleting ? (
                  <Loader2
                    size={
                      16
                    }
                    className="animate-spin"
                  />
                ) : (
                  <Trash2
                    size={
                      16
                    }
                  />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ====================================================
            CONTEÚDO
            ==================================================== */}

        <section className="space-y-5 px-5 pt-6">
          {/* ==================================================
              PRINCIPAL
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            style={{
              borderLeft:
                `6px solid ${theme.hex}`,
            }}
            className="rounded-[32px] border border-surface-border/50 bg-surface p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm"
                style={{
                  backgroundColor:
                    `${theme.hex}15`,

                  borderColor:
                    `${theme.hex}40`,

                  color:
                    theme.hex,
                }}
              >
                <IconComp
                  size={
                    28
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  {getCategoriaLabel(
                    registro.categoria
                  )}
                </p>

                <h2 className="font-display text-lg font-semibold text-ink-primary">
                  {
                    registro.nome
                  }
                </h2>
              </div>
            </div>

            {/* DATA / HORA */}

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-surface-border/40 pt-4">
              <DetailInfoRow
                icon={
                  <Calendar
                    size={
                      16
                    }
                  />
                }
                iconClassName="bg-ice/10 text-ice"
                label="Data"
              >
                <p className="font-mono text-xs font-semibold text-ink-primary">
                  {formatDateToDisplay(
                    registro.data
                  )}
                </p>
              </DetailInfoRow>

              <DetailInfoRow
                icon={
                  <Clock
                    size={
                      16
                    }
                  />
                }
                iconClassName="bg-ice/10 text-ice"
                label="Horário"
              >
                <p className="font-mono text-xs font-semibold text-ink-primary">
                  {registro.horario ||
                    "Não informado"}
                </p>
              </DetailInfoRow>
            </div>

            {/* INTENSIDADE */}

            {registro.intensidade !==
              undefined && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-muted">
                    Intensidade relatada
                  </span>

                  <span className="font-mono font-bold text-ice">
                    {
                      registro.intensidade
                    }{" "}
                    / 10
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width:
                        `${Math.min(
                          100,
                          Math.max(
                            0,
                            (
                              registro.intensidade /
                              10
                            ) *
                              100
                          )
                        )}%`,

                      backgroundColor:
                        theme.hex,
                    }}
                  />
                </div>
              </div>
            )}

            {/* MEDIÇÃO */}

            {registro.valor_medicao && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3">
                <span className="text-xs font-medium text-ink-muted">
                  Valor da medição
                </span>

                <span className="font-mono text-sm font-bold text-ice">
                  {
                    registro.valor_medicao
                  }
                </span>
              </div>
            )}
          </motion.div>

          {/* ==================================================
              INSIGHT
              ================================================== */}

          {insight && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.02,
              }}
              className={`rounded-[24px] border p-4 shadow-sm ${
                insight.status ===
                "critico"
                  ? "border-coral/30 bg-coral/10"
                  : insight.status ===
                      "alerta"
                    ? "border-amber-400/30 bg-amber-400/10"
                    : insight.status ===
                        "atencao"
                      ? "border-ice/30 bg-ice/10"
                      : "border-emerald-400/30 bg-emerald-400/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    insight.status ===
                    "critico"
                      ? "border-coral/40 bg-coral/20 text-coral"
                      : insight.status ===
                          "alerta"
                        ? "border-amber-400/40 bg-amber-400/20 text-amber-400"
                        : insight.status ===
                            "atencao"
                          ? "border-ice/40 bg-ice/20 text-ice"
                          : "border-emerald-400/40 bg-emerald-400/20 text-emerald-400"
                  }`}
                >
                  {insight.status ===
                    "critico" ||
                  insight.status ===
                    "alerta" ? (
                    <AlertTriangle
                      size={
                        18
                      }
                    />
                  ) : (
                    <CheckCircle2
                      size={
                        18
                      }
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider ${
                      insight.status ===
                      "critico"
                        ? "text-coral"
                        : insight.status ===
                            "alerta"
                          ? "text-amber-400"
                          : insight.status ===
                              "atencao"
                            ? "text-ice"
                            : "text-emerald-400"
                    }`}
                  >
                    {
                      insight.titulo
                    }
                  </h3>

                  <p className="mt-1 text-xs leading-snug text-ink-primary">
                    {
                      insight.mensagem
                    }
                  </p>

                  <p className="mt-1.5 text-[11px] italic text-ink-muted">
                    {
                      insight.recomendacao
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================
              HISTÓRICO / CONTEXTO LONGITUDINAL
              ================================================== */}

          {panoramaHistorico &&
            panoramaHistorico.totalOcorrencias >
              1 && (
              <motion.div
                variants={
                  fadeUp
                }
                initial="initial"
                animate="animate"
                transition={{
                  delay:
                    0.04,
                }}
                className="space-y-3"
              >
                <SectionTitle
                  icon={
                    <TrendingUp
                      size={
                        15
                      }
                    />
                  }
                  title="Contexto no Histórico"
                />

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-surface-border/40 bg-surface-raised p-3">
                      <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                        Ocorrências
                      </p>

                      <p className="mt-1 font-display text-lg font-semibold text-ink-primary">
                        {
                          panoramaHistorico.totalOcorrencias
                        }
                      </p>

                      <p className="mt-0.5 text-[10px] text-ink-muted">
                        Mesmo registro na pessoa ativa
                      </p>
                    </div>

                    <div className="rounded-2xl border border-surface-border/40 bg-surface-raised p-3">
                      <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                        Desde
                      </p>

                      <p className="mt-1 font-mono text-sm font-semibold text-ink-primary">
                        {formatDateToDisplay(
                          panoramaHistorico.primeiraData
                        )}
                      </p>

                      <p className="mt-0.5 text-[10px] text-ink-muted">
                        Primeira ocorrência encontrada
                      </p>
                    </div>
                  </div>

                  {panoramaHistorico.variacaoIntensidade && (
                    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-ice/15 bg-ice/5 p-3">
                      <History
                        size={
                          15
                        }
                        className="mt-0.5 shrink-0 text-ice"
                      />

                      <p className="text-[11px] leading-relaxed text-ink-muted">
                        {panoramaHistorico.variacaoIntensidade ===
                        "acima"
                          ? `A intensidade deste registro está acima da média das ${panoramaHistorico.intensidadesRegistradas - 1} ocorrência(s) anterior(es) com intensidade informada.`
                          : panoramaHistorico.variacaoIntensidade ===
                              "abaixo"
                            ? `A intensidade deste registro está abaixo da média das ${panoramaHistorico.intensidadesRegistradas - 1} ocorrência(s) anterior(es) com intensidade informada.`
                            : "A intensidade deste registro está próxima da média das ocorrências anteriores com intensidade informada."}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          {/* ==================================================
              CRUZAMENTO RELACIONAL
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.06,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <FolderHeart
                  size={
                    15
                  }
                />
              }
              title="Contexto Relacionado"
            />

            <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              {/* MEDICAMENTO */}

              {medicamento ? (
                <button
                  type="button"
                  onClick={
                    () => {
                      if (
                        !medicamento.id
                      ) {
                        return;
                      }

                      trigger(
                        "vibrate"
                      );

                      router.push(
                        `/saude/medicamentos/detalhes?id=${medicamento.id}`
                      );
                    }
                  }
                  className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised p-3 text-left transition-all hover:border-surface-border active:scale-[0.98]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
                      <Pill
                        size={
                          18
                        }
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-primary">
                        Medicamento relacionado
                      </p>

                      <p className="truncate text-[11px] text-ink-muted">
                        {
                          medicamento.nome
                        }

                        {medicamento.dosagem
                          ? ` · ${medicamento.dosagem}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={
                      16
                    }
                    className="shrink-0 text-ink-muted"
                  />
                </button>
              ) : (
                <p className="text-xs italic text-ink-muted">
                  Nenhum medicamento vinculado a este registro.
                </p>
              )}

              {/* TRATAMENTOS */}

              {tratamentosRelacionados.length >
                0 && (
                <div className="mt-4 space-y-2 border-t border-surface-border/30 pt-4">
                  <p className="text-xs font-bold uppercase text-ink-muted">
                    Tratamentos Associados
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {tratamentosRelacionados.map(
                      (
                        tratamento
                      ) => {
                        const tratamentoTheme =
                          getClinicalTheme(
                            tratamento.nome
                          );

                        const Icon =
                          tratamentoTheme.icon;

                        return (
                          <button
                            key={
                              tratamento.id
                            }
                            type="button"
                            onClick={
                              () => {
                                if (
                                  !tratamento.id
                                ) {
                                  return;
                                }

                                trigger(
                                  "vibrate"
                                );

                                router.push(
                                  `/saude/tratamentos/detalhes?id=${tratamento.id}`
                                );
                              }
                            }
                            className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 transition-colors hover:bg-violet-400/20 active:scale-95"
                          >
                            <Icon
                              size={
                                14
                              }
                              className="text-violet-400"
                            />

                            <span className="max-w-[180px] truncate text-xs font-medium text-violet-300">
                              {
                                tratamento.nome
                              }
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {/* CIDS */}

              {cidsRelacionados.length >
                0 && (
                <div className="mt-4 space-y-2 border-t border-surface-border/30 pt-4">
                  <p className="text-xs font-bold uppercase text-ink-muted">
                    CIDs Vinculados
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {cidsRelacionados.map(
                      (
                        cid
                      ) => {
                        const cidTheme =
                          getClinicalTheme(
                            cid.descricao ||
                              cid.codigo
                          );

                        const CidIcon =
                          cidTheme.icon;

                        return (
                          <button
                            key={
                              cid.id
                            }
                            type="button"
                            onClick={
                              () => {
                                if (
                                  !cid.id
                                ) {
                                  return;
                                }

                                trigger(
                                  "vibrate"
                                );

                                router.push(
                                  `/saude/cids/detalhes?id=${cid.id}`
                                );
                              }
                            }
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-opacity hover:opacity-80 active:scale-95 ${cidTheme.tagClass}`}
                          >
                            <CidIcon
                              size={
                                14
                              }
                            />

                            <span className="max-w-[220px] truncate text-xs font-medium">
                              {
                                cid.codigo
                              }{" "}
                              -{" "}
                              {
                                cid.descricao
                              }
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ==================================================
              ÚLTIMAS OCORRÊNCIAS
              ================================================== */}

          {historicoSimilar.length >
            0 && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.08,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <History
                    size={
                      15
                    }
                  />
                }
                title="Ocorrências Anteriores"
                action={
                  historicoSimilar.length >
                  3 ? (
                    <span className="text-[10px] text-ink-faint">
                      {
                        historicoSimilar.length
                      }{" "}
                      encontradas
                    </span>
                  ) : undefined
                }
              />

              <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <div className="space-y-2">
                  {historicoSimilar
                    .slice(
                      0,
                      5
                    )
                    .map(
                      (
                        item
                      ) => (
                        <button
                          key={
                            item.id
                          }
                          type="button"
                          onClick={
                            () => {
                              if (
                                !item.id
                              ) {
                                return;
                              }

                              trigger(
                                "vibrate"
                              );

                              router.push(
                                `/saude/registros/detalhes?id=${item.id}`
                              );
                            }
                          }
                          className="flex w-full items-center justify-between rounded-2xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-colors hover:border-surface-border active:scale-[0.98]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="shrink-0 font-mono text-xs text-ink-muted">
                              {formatDateToDisplay(
                                item.data
                              )}
                            </span>

                            {item.intensidade !==
                              undefined && (
                              <span className="shrink-0 font-mono text-xs text-ink-faint">
                                Nível{" "}
                                {
                                  item.intensidade
                                }
                                /10
                              </span>
                            )}

                            {item.valor_medicao && (
                              <span className="truncate font-mono text-xs text-ice">
                                {
                                  item.valor_medicao
                                }
                              </span>
                            )}
                          </div>

                          <ChevronRight
                            size={
                              14
                            }
                            className="shrink-0 text-ink-faint"
                          />
                        </button>
                      )
                    )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================
              ANOTAÇÕES
              ================================================== */}

          {registro.observacoes && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.1,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <FileText
                    size={
                      15
                    }
                  />
                }
                title="Anotações"
              />

              <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-primary">
                  {
                    registro.observacoes
                  }
                </p>
              </div>
            </motion.div>
          )}
        </section>

        {/* ====================================================
            DELETE
            ==================================================== */}

        <ConfirmationModal
          isOpen={
            showDeleteModal
          }
          onClose={
            () =>
              setShowDeleteModal(
                false
              )
          }
          onConfirm={
            handleDelete
          }
          title="Excluir Registro"
          message="Excluir este registro de saúde? Esta ação remove somente esta ocorrência do histórico."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={
            isDeleting
          }
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function DetalhesRegistroSaudePage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <DetalhesRegistroSaudeContent />
    </Suspense>
  );
}