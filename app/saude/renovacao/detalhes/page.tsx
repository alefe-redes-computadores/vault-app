// app/saude/renovacao/detalhes/page.tsx
"use client";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";
import {useRetiradas} from "@/hooks/useRetiradas";
import {HealthSupplyEntry} from "@/components/saude/HealthSupplyEntry";
import { isPrescriptionOnly } from "@/lib/health-supply/renewal-event";
import { presentRenewalEvent } from "@/lib/health-supply/renewal-event-presentation";
import { useLocalDay } from "@/hooks/useLocalDay";

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
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
  ExternalLink,
  FileText,
  FileWarning,
  History,
  MapPin,
  Package,
  Pill,
  Plus,
  Receipt,
  Store,
  Stethoscope,
  Trash2,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useMedicos,
} from "@/hooks/useMedicos";

import {
  useFarmacias,
} from "@/hooks/useFarmacias";

import {
  useHospitais,
} from "@/hooks/useHospitais";

import {
  useLocais,
} from "@/hooks/useLocais";

import {
  analisarValidadeReceita,
  RECEITA_VALIDADE_PADRAO_DIAS,
} from "@/lib/health-insights";

import {
  formatCurrency,
  getClinicalTheme,
} from "@/lib/health-utils";

import {
  PageTransition,
} from "@/components/PageTransition";

import { ContextualHealthIntelligence } from "@/components/vault-intelligence/ContextualHealthIntelligence";
import { ClinicalSectionNav } from "@/components/saude/ClinicalSectionNav";

import {
  DetailSkeleton,
} from "@/components/loading/DetailSkeleton";

import {
  ConfirmationModal,
} from "@/components/ConfirmationModal";

import {
  DetailInfoRow,
  SectionTitle,
  StatCard,
} from "@/components/detail/DetailComponents";

import type {
  Renovacao,
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

function formatDateDisplay(
  isoStr?: string | null
): string {
  if (!isoStr) {
    return "";
  }

  const clean =
    isoStr.split("T")[0];

  const parts =
    clean.split("-");

  if (
    parts.length !==
    3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getPriceLabel(
  renovacao: Renovacao
): string {
  if (
    isPrescriptionOnly(
      renovacao
    )
  ) {
    return "Sem aquisição";
  }
  if (
    renovacao.tipo_aquisicao ===
    "sus"
  ) {
    return "SUS / Gratuito";
  }

  if (
    typeof renovacao.preco ===
      "number" &&
    Number.isFinite(
      renovacao.preco
    ) &&
    renovacao.preco >=
      0
  ) {
    return formatCurrency(
      renovacao.preco
    );
  }

  return "Não informado";
}

// ============================================================
// CONTENT
// ============================================================

function DetalhesRenovacaoContent() {
 const {retiradas}=useRetiradas();
  const hojeISO=useLocalDay();
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const rawReturnTo = searchParams.get("return_to");
  const returnTo = rawReturnTo?.startsWith("/") && !rawReturnTo.startsWith("//")
    ? rawReturnTo
    : "/saude/renovacao";

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
    getRenovacao,
    deleteRenovacao,
  } =
    useRenovacoes();

  const {
    medicamentos,
  } =
    useMedicamentos();

  const {
    medicos,
  } =
    useMedicos();

  const {
    farmacias,
  } =
    useFarmacias();

  const {
    hospitais,
  } =
    useHospitais();

  const {
    locais,
  } =
    useLocais();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    renovacao,
    setRenovacao,
  ] =
    useState<Renovacao | null>(
      null
    );

  const [
    medicamentoId,
    setMedicamentoId,
  ] =
    useState(
      ""
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
    deleting,
    setDeleting,
  ] =
    useState(
      false
    );

  const [
    isMenuFlutuanteOpen,
    setIsMenuFlutuanteOpen,
  ] =
    useState(
      false
    );

  // ==========================================================
  // HISTÓRICO PERSON-SCOPED
  // ==========================================================

  const {
    renovacoes:
      historicoDoMedicamento,
  } =
    useRenovacoes(
      medicamentoId ||
        undefined
    );

  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(
    () => {
      let cancelled =
        false;

      const loadData =
        async () => {
          if (
            !id
          ) {
            router.replace(
              "/saude/renovacao"
            );

            return;
          }

          setIsLoading(
            true
          );

          try {
            const data =
              await getRenovacao(
                id
              );

            if (
              cancelled
            ) {
              return;
            }

            if (
              !data
            ) {
              setRenovacao(
                null
              );

              return;
            }

            setRenovacao(
              data
            );

            setMedicamentoId(
              data.medicamento_id ||
                ""
            );
          } catch (
            error
          ) {
            console.error(
              "[DetalhesRenovacao] Falha ao carregar renovação:",
              error
            );

            if (
              !cancelled
            ) {
              setRenovacao(
                null
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

      void loadData();

      return () => {
        cancelled =
          true;
      };
    },
    [
      id,
      getRenovacao,
      router,
    ]
  );

  // ==========================================================
  // MENU
  // ==========================================================

  useEffect(
    () => {
      if (
        !isMenuFlutuanteOpen
      ) {
        return;
      }

      const handleEscape =
        (
          event: KeyboardEvent
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

      window.addEventListener(
        "keydown",
        handleEscape
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleEscape
        );
      };
    },
    [
      isMenuFlutuanteOpen,
    ]
  );

  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const medicamento =
    medicamentos.find(
      (
        item
      ) =>
        item.id ===
        renovacao?.medicamento_id
    );

  const medico =
    medicos.find(
      (
        item
      ) =>
        item.id ===
        renovacao?.medico_id
    );

  const farmacia =
    farmacias.find(
      (
        item
      ) =>
        item.id ===
        renovacao?.farmacia_id
    );

  const hospital =
    hospitais.find(
      (
        item
      ) =>
        item.id ===
        renovacao?.hospital_id
    );

  const local =
    locais.find(
      (
        item
      ) =>
        item.id ===
        renovacao?.local_id
    );

  const historicoRenovacoes =
    useMemo(
      () =>
        historicoDoMedicamento
          .filter(
            (
              item
            ) =>
              item.id !==
              renovacao?.id
          )
          .slice(
            0,
            5
          ),
      [
        historicoDoMedicamento,
        renovacao?.id,
      ]
    );

  /*
   * A validade histórica não é mais calculada nesta página.
   *
   * health-insights.ts é a fonte canônica da regra atual
   * de validade da receita.
   */
  const validadeInsight =
    renovacao
      ? analisarValidadeReceita(
          renovacao.data
        )
      : null;

  const validadeHistorica =
    validadeInsight
      ?.dataValidade ||
    "";

  const vencida =
    validadeInsight
      ?.vencida ??
    false;

  const diasRestantes =
    validadeInsight
      ?.diasRestantes ??
    null;

  const validadeConhecida =
    validadeInsight !==
      null &&
    validadeInsight.status !==
      "sem_data" &&
    Boolean(
      validadeInsight.dataValidade
    );

  const precoFormatado =
    renovacao
      ? getPriceLabel(
          renovacao
        )
      : "";

  const theme =
    getClinicalTheme(
      medicamento?.nome ||
        "Renovação"
    );

  const somenteReceita =
    Boolean(
      renovacao &&
      isPrescriptionOnly(
        renovacao
      )
    );

  const eventPresentation = renovacao ? presentRenewalEvent(renovacao, hojeISO) : null;
  const linkedWithdrawals = useMemo(() => retiradas.filter(item => item.renovacao_origem_id === renovacao?.id || item.renovacao_realizada_id === renovacao?.id), [retiradas, renovacao?.id]);

  const tipoAquisicaoLabel =
    eventPresentation?.title || "Evento de medicamento";

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    async () => {
      if (
        !id ||
        deleting
      ) {
        return;
      }

      setDeleting(
        true
      );

      trigger(
        "vibrate"
      );

      try {
        await deleteRenovacao(
          id
        );

        trigger(
          "success"
        );

        router.replace(
          "/saude/renovacao"
        );
      } catch (
        error
      ) {
        console.error(
          "[DetalhesRenovacao] Falha ao excluir renovação:",
          error
        );

        trigger(
          "error"
        );
      } finally {
        setDeleting(
          false
        );

        setShowDeleteModal(
          false
        );
      }
    };

  // ==========================================================
  // STATES
  // ==========================================================

  if (
    isLoading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (
    !renovacao
  ) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
        <FileWarning
          size={
            32
          }
          className="text-ink-muted"
        />

        <p className="mt-4 font-semibold text-ink-primary">
          Renovação não encontrada
        </p>

        <p className="mt-1 max-w-sm text-sm text-ink-muted">
          O registro não existe ou não pertence à pessoa ativa.
        </p>

        <button
          type="button"
          onClick={
            () =>
              router.replace(returnTo)
          }
          className="mt-5 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
        >
          Voltar
        </button>
      </main>
    );
  }

  // ==========================================================
  // MENU OPTIONS
  // ==========================================================

  const menuOptions = [
    {
      id:
        "nova-renovacao",

      label:
        "Registrar aquisição",

      icon:
        FileWarning,

      path:
        `/saude/renovacao/nova?medicamento_id=${renovacao.medicamento_id}&return_to=${encodeURIComponent(`/saude/renovacao/detalhes?id=${renovacao.id}`)}`,
    },

    {
      id:
        "editar-renovacao",

      label:
        isPrescriptionOnly(renovacao) ? "Editar receita" : "Editar aquisição",

      icon:
        Edit3,

      path:
        `/saude/renovacao/editar?id=${renovacao.id}`,
    },
  ];

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
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

                    router.replace(returnTo);
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
                <p
                  className={`font-mono text-[11px] uppercase tracking-[0.28em] ${theme.textClass}`}
                >
                  Vault
                </p>

                <h1 className="mt-0.5 min-w-0 break-words font-display text-lg font-semibold leading-snug text-ink-primary">
                  Detalhes da Renovação
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* MENU */}

              <div className="relative">
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

                      setIsMenuFlutuanteOpen(
                        (
                          previous
                        ) =>
                          !previous
                      );
                    }
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95"
                  aria-label="Mais ações"
                >
                  <Plus
                    size={
                      18
                    }
                  />
                </button>

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
                        transition={{
                          duration:
                            0.16,
                        }}
                        onClick={
                          () =>
                            setIsMenuFlutuanteOpen(
                              false
                            )
                        }
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                      />

                      <motion.div
                        initial={{
                          opacity:
                            0,
                          y:
                            10,
                          scale:
                            0.95,
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
                            10,
                          scale:
                            0.95,
                        }}
                        transition={{
                          duration:
                            0.18,

                          ease: [
                            0.16,
                            1,
                            0.3,
                            1,
                          ],
                        }}
                        className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface shadow-2xl"
                      >
                        <div className="px-3 pb-2 pt-3.5">
                          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                            Ações
                          </p>
                        </div>

                        <div className="space-y-0.5 px-1.5 pb-2">
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
                                    () => {
                                      trigger(
                                        "vibrate"
                                      );

                                      setIsMenuFlutuanteOpen(
                                        false
                                      );

                                      router.push(
                                        option.path
                                      );
                                    }
                                  }
                                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                    <Icon
                                      size={
                                        15
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
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* EDIT */}

              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    router.push(
                      `/saude/renovacao/editar?id=${renovacao.id}`
                    );
                  }
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ice transition-all active:scale-95"
                aria-label="Editar renovação"
              >
                <Edit3
                  size={
                    16
                  }
                />
              </button>

              {/* DELETE */}

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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
                aria-label="Excluir renovação"
              >
                <Trash2
                  size={
                    16
                  }
                />
              </button>
            </div>
          </div>
        </header>

        {/* ====================================================
            CONTENT
            ==================================================== */}

        <section className="space-y-5 px-5 pt-6">
          <ClinicalSectionNav label="Áreas da receita ou aquisição" items={[{id:"renovacao-visao",label:"Visão geral",icon:<Receipt size={14}/>},...(renovacao.tipo_aquisicao==="sus"?[{id:"renovacao-sus",label:"SUS",icon:<Building2 size={14}/>}]:[]),...((renovacao.lote||renovacao.validade_produto)?[{id:"renovacao-produto",label:"Produto",icon:<Package size={14}/>}]:[]),...((medico||farmacia||hospital||local)?[{id:"renovacao-rede",label:"Rede",icon:<Stethoscope size={14}/>}]:[]),...(historicoRenovacoes.length?[{id:"renovacao-historico",label:"Histórico",icon:<History size={14}/>,badge:historicoRenovacoes.length}]:[])]}/>
          <span id="renovacao-visao" className="block scroll-mt-24" aria-hidden="true"/>
          {/* ==================================================
              CARD PRINCIPAL
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="relative overflow-hidden rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm"
            style={{
              borderLeft:
                `6px solid ${
                  vencida
                    ? "#EF4444"
                    : theme.hex
                }`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${theme.bgClass} ${theme.textClass} ${theme.borderClass}`}
              >
                <MedicationFormatIcon formato={medicamento?.formato} cores={medicamento?.cores} size={28} />
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 break-words font-display text-xl font-bold leading-tight text-ink-primary">
                    {medicamento
                      ?.nome ||
                      "Medicamento"}
                  </h2>

                  {validadeConhecida && (
                    vencida ? (
                      <span className="flex items-center gap-1 rounded-full border border-coral/30 bg-coral/20 px-2 py-0.5 text-[10px] font-bold uppercase text-coral">
                        <AlertCircle
                          size={
                            10
                          }
                        />

                        Expirada
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                        <CheckCircle2
                          size={
                            10
                          }
                        />

                        Dentro da validade
                      </span>
                    )
                  )}
                </div>

                {medicamento
                  ?.dosagem && (
                  <p
                    className={`mt-0.5 text-sm font-medium ${theme.textClass}`}
                  >
                    {
                      medicamento.dosagem
                    }
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      renovacao.tipo_aquisicao ===
                      "sus"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                        : "border-ice/30 bg-ice/10 text-ice"
                    }`}
                  >
                    {
                      tipoAquisicaoLabel
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* VALIDADE HISTÓRICA */}

            {validadeConhecida &&
              validadeHistorica && (
              <div className="mt-4 border-t border-surface-border/40 pt-4">
                <div
                  className={`flex items-start gap-2 text-xs ${
                    vencida
                      ? "text-coral"
                      : diasRestantes !==
                            null &&
                          diasRestantes <=
                            7
                        ? "text-amber-400"
                        : "text-ink-muted"
                  }`}
                >
                  <Clock
                    size={
                      14
                    }
                    className="mt-0.5 shrink-0"
                  />

                  <div>
                    <p>
                      Referência de validade deste registro:{" "}
                      <span className="font-semibold">
                        {formatDateDisplay(
                          validadeHistorica
                        )}
                      </span>
                    </p>

                    <p className="mt-0.5">
                      {
                        validadeInsight?.mensagem
                      }
                    </p>

                    <p className="mt-1 text-[10px] font-normal opacity-80">
                      Regra atual do Vault:{" "}
                      {
                        RECEITA_VALIDADE_PADRAO_DIAS
                      }{" "}
                      dias após a data registrada.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* MÉTRICAS */}

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-surface-border/40 pt-5">
              <StatCard
                icon={
                  <Calendar
                    size={
                      14
                    }
                  />
                }
                label="Data da Receita"
                value={
                  formatDateDisplay(
                    renovacao.data
                  )
                }
              />

              <StatCard
                icon={
                  <DollarSign
                    size={
                      14
                    }
                  />
                }
                label={
                  somenteReceita
                    ? "Evento"
                    : renovacao.tipo_aquisicao ===
                        "sus"
                      ? "Aquisição"
                      : "Custo Registrado"
                }
                value={
                  precoFormatado
                }
              />
            </div>

            {/* QUANTIDADE */}

            {renovacao.quantidade !==
              undefined &&
              renovacao.quantidade !==
                null && (
                <div className="mt-4">
                  <DetailInfoRow
                    icon={
                      <Package
                        size={
                          15
                        }
                      />
                    }
                    iconClassName="bg-ice/10 text-ice"
                    label={
                      renovacao.tipo_aquisicao ===
                      "sus"
                        ? "Quantidade retirada"
                        : "Quantidade adquirida"
                    }
                  >
                    <p className="font-mono text-sm font-semibold text-ink-primary">
                      {
                        renovacao.quantidade
                      }
                    </p>
                  </DetailInfoRow>
                </div>
              )}

            {/* OBS */}

            {renovacao.observacoes && (
              <div className="mt-4">
                <DetailInfoRow
                  icon={
                    <FileText
                      size={
                        15
                      }
                    />
                  }
                  iconClassName="bg-ice/10 text-ice"
                  label="Notas / Observações"
                >
                  <p className="text-sm leading-relaxed text-ink-primary">
                    {
                      renovacao.observacoes
                    }
                  </p>
                </DetailInfoRow>
              </div>
            )}

            {/* ANEXO */}

            {renovacao.anexo_url && (
              <a
                href={
                  renovacao.anexo_url
                }
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-between rounded-2xl border border-ice/20 bg-ice/10 p-3.5 text-ice transition-colors hover:bg-ice/20"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileText
                    size={
                      16
                    }
                  />

                  {eventPresentation?.attachmentLabel || "Ver anexo"}
                </div>

                <ExternalLink
                  size={
                    14
                  }
                />
              </a>
            )}
          </motion.div>

          {/* ==================================================
              SUS
              ================================================== */}

          {renovacao.tipo_aquisicao ===
            "sus" && (
            <motion.div id="renovacao-sus"
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.04,
              }}
              className="scroll-mt-24 space-y-3 [content-visibility:auto] [contain-intrinsic-size:260px]"
            >
              <SectionTitle
                icon={
                  <Receipt
                    size={
                      15
                    }
                  />
                }
                title="Retirada SUS"
              />

              <div className="space-y-3">
                {renovacao.data_proxima_retirada && (
                  <DetailInfoRow
                    icon={
                      <Calendar
                        size={
                          14
                        }
                      />
                    }
                    iconClassName="bg-emerald-400/10 text-emerald-400"
                    label="Próxima data informada para retorno"
                  >
                    <p className="font-mono text-sm font-semibold text-ink-primary">
                      {formatDateDisplay(
                        renovacao.data_proxima_retirada
                      )}
                    </p>
                  </DetailInfoRow>
                )}

                {renovacao.exige_nova_receita !==
                  undefined && (
                  <DetailInfoRow
                    icon={
                      renovacao.exige_nova_receita ? (
                        <FileWarning
                          size={
                            14
                          }
                        />
                      ) : (
                        <CheckCircle2
                          size={
                            14
                          }
                        />
                      )
                    }
                    iconClassName={
                      renovacao.exige_nova_receita
                        ? "bg-amber-400/10 text-amber-400"
                        : "bg-emerald-400/10 text-emerald-400"
                    }
                    label="Nova receita no próximo retorno"
                  >
                    <p className="text-sm font-semibold text-ink-primary">
                      {renovacao.exige_nova_receita
                        ? "Informada como necessária"
                        : "Não informada como necessária"}
                    </p>
                  </DetailInfoRow>
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              DADOS DO PRODUTO
              ================================================== */}

          {(renovacao.lote ||
            renovacao.validade_produto) && (
            <motion.div id="renovacao-produto"
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.06,
              }}
              className="scroll-mt-24 space-y-3 [content-visibility:auto] [contain-intrinsic-size:220px]"
            >
              <SectionTitle
                icon={
                  <Package
                    size={
                      15
                    }
                  />
                }
                title="Dados do Produto"
              />

              <div className="space-y-3">
                {renovacao.lote && (
                  <DetailInfoRow
                    icon={
                      <Package
                        size={
                          14
                        }
                      />
                    }
                    iconClassName="bg-ice/10 text-ice"
                    label="Lote"
                  >
                    <p className="text-sm font-semibold text-ink-primary">
                      {
                        renovacao.lote
                      }
                    </p>
                  </DetailInfoRow>
                )}

                {renovacao.validade_produto && (
                  <DetailInfoRow
                    icon={
                      <Calendar
                        size={
                          14
                        }
                      />
                    }
                    iconClassName="bg-amber-400/10 text-amber-400"
                    label="Validade do produto"
                  >
                    <p className="font-mono text-sm font-semibold text-ink-primary">
                      {formatDateDisplay(
                        renovacao.validade_produto
                      )}
                    </p>
                  </DetailInfoRow>
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              REDE DE APOIO
              ================================================== */}

          {(medico ||
            farmacia ||
            hospital ||
            local) && (
            <motion.div id="renovacao-rede"
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.08,
              }}
              className="scroll-mt-24 space-y-3 [content-visibility:auto] [contain-intrinsic-size:260px]"
            >
              <SectionTitle
                icon={
                  <Stethoscope
                    size={
                      15
                    }
                  />
                }
                title="Rede de Apoio"
              />

              <div className="space-y-3">
                {medico && (
                  <DetailInfoRow
                    icon={
                      <Stethoscope
                        size={
                          14
                        }
                      />
                    }
                    iconClassName="bg-ice/10 text-ice"
                    label="Médico"
                  >
                    <p className="text-sm font-semibold text-ink-primary">
                      Dr(a).{" "}
                      {
                        medico.nome
                      }
                    </p>
                  </DetailInfoRow>
                )}

                {farmacia && (
                  <DetailInfoRow
                    icon={
                      <Store
                        size={
                          14
                        }
                      />
                    }
                    iconClassName="bg-emerald-400/10 text-emerald-400"
                    label={
                      renovacao.tipo_aquisicao ===
                      "sus"
                        ? "Farmácia / Unidade de retirada"
                        : "Farmácia"
                    }
                  >
                    <p className="text-sm font-semibold text-ink-primary">
                      {
                        farmacia.nome
                      }
                    </p>
                  </DetailInfoRow>
                )}

                {hospital && (
                  <DetailInfoRow
                    icon={
                      <Building2
                        size={
                          14
                        }
                      />
                    }
                    iconClassName="bg-violet-400/10 text-violet-400"
                    label="Hospital"
                  >
                    <p className="text-sm font-semibold text-ink-primary">
                      {
                        hospital.nome
                      }
                    </p>
                  </DetailInfoRow>
                )}

                {local && (
                  <DetailInfoRow
                    icon={
                      <MapPin
                        size={
                          14
                        }
                      />
                    }
                    iconClassName="bg-emerald-400/10 text-emerald-400"
                    label="Local / Posto"
                  >
                    <p className="text-sm font-semibold text-ink-primary">
                      {
                        local.nome
                      }
                    </p>
                  </DetailInfoRow>
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              HISTÓRICO
              ================================================== */}

          {historicoRenovacoes.length >
            0 && (
            <motion.div id="renovacao-historico"
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.1,
              }}
              className="scroll-mt-24 space-y-3 [content-visibility:auto] [contain-intrinsic-size:320px]"
            >
              <SectionTitle
                icon={
                  <History
                    size={
                      15
                    }
                  />
                }
                title="Histórico de Renovações"
              />

              <div className="space-y-2">
                {historicoRenovacoes.map(
                  (
                    item
                  ) => {
                    const validadeItem =
                      analisarValidadeReceita(
                        item.data
                      );

                    const itemVencido =
                      validadeItem.vencida;

                    const itemTemValidade =
                      validadeItem.status !==
                        "sem_data" &&
                      Boolean(
                        validadeItem.dataValidade
                      );

                    return (
                      <button
                        key={
                          item.id
                        }
                        type="button"
                        onClick={
                          () => {
                            trigger(
                              "vibrate"
                            );

                            router.push(
                              `/saude/renovacao/detalhes?id=${item.id}`
                            );
                          }
                        }
                        className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left transition-all active:scale-[0.98]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-ink-primary">
                              {formatDateDisplay(
                                item.data
                              )}
                            </p>

                            {itemTemValidade && (
                              <span
                                className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                  itemVencido
                                    ? "border-coral/20 bg-coral/10 text-coral"
                                    : "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                                }`}
                              >
                                {itemVencido
                                  ? "Expirada"
                                  : "Válida"}
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 text-xs text-ink-muted">
                            {item.tipo_aquisicao ===
                            "sus"
                              ? "SUS / Governo"
                              : typeof item.preco ===
                                    "number" &&
                                  Number.isFinite(
                                    item.preco
                                  ) &&
                                  item.preco >=
                                    0
                                ? formatCurrency(
                                    item.preco
                                  )
                                : "Valor não informado"}
                          </p>
                        </div>

                        <ChevronRight
                          size={
                            14
                          }
                          className="shrink-0 text-ink-faint"
                        />
                      </button>
                    );
                  }
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              CONTEXTO
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.12,
            }}
            className="rounded-[24px] border border-surface-border/40 bg-surface/60 p-4"
          >
            <div className="flex items-start gap-3">
              <Pill
                size={
                  16
                }
                className={`mt-0.5 shrink-0 ${theme.textClass}`}
              />

              <div>
                <p className="text-xs font-semibold text-ink-primary">
                  Registro histórico
                </p>

                <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                  {eventPresentation?.effect}
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {(renovacao.document_id || linkedWithdrawals.length > 0) && <section aria-label="Relações deste evento" className="mx-5 mt-4 space-y-2 rounded-[24px] border border-surface-border/50 bg-surface p-4"><div><p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-ink-muted">Relações comprovadas</p><h2 className="mt-1 text-sm font-semibold text-ink-primary">Documento e retiradas</h2></div>{renovacao.document_id && <button type="button" onClick={()=>router.push(`/saude/documentos/detalhes?id=${encodeURIComponent(renovacao.document_id!)}`)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-3 text-left text-xs font-semibold text-violet-200"><FileText size={14}/><span className="flex-1">Abrir documento de saúde vinculado</span><ChevronRight size={14}/></button>}{linkedWithdrawals.map(item=><button type="button" key={item.id} onClick={()=>router.push(`/saude/retiradas/detalhes?id=${encodeURIComponent(item.id!)}`)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 text-left text-xs font-semibold text-emerald-300"><Receipt size={14}/><span className="flex-1">{item.renovacao_realizada_id===renovacao.id?"Recebimento":"Origem"} · retirada de {formatDateDisplay(item.data)}</span><ChevronRight size={14}/></button>)}</section>}
        <div className="px-5 pt-4"><HealthSupplyEntry medicamentoId={renovacao.medicamento_id}/></div>

        <ContextualHealthIntelligence
          entityType="renovacao"
          entityId={renovacao.id}
          relatedEntityType="medicamento"
          relatedEntityId={renovacao.medicamento_id}
          className="mt-5"
        />

        {/* ====================================================
            DELETE MODAL
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
          message="Excluir esta renovação do histórico? O estoque atual do medicamento não será recalculado automaticamente."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={
            deleting
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

export default function DetalhesRenovacaoPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <DetalhesRenovacaoContent />
    </Suspense>
  );
}
