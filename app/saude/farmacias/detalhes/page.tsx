// app/saude/farmacias/detalhes/page.tsx
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
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Edit3,
  ExternalLink,
  FileText,
  MapPin,
  Navigation,
  Phone,
  Pill,
  ReceiptText,
  Store,
  Trash2,
  User,
} from "lucide-react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  useHapticFeedback,
} from "@/lib/haptics";
import {
  analisarFarmaciaDetalhada,
  analisarMelhorFarmacia,
  sugerirRenovacao,
} from "@/lib/health-insights";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";
import {
  useFarmacias,
} from "@/hooks/useFarmacias";
import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";
import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";
import {
  useMounted,
} from "@/hooks/useMounted";
import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";

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
  SectionTitle,
  StatCard,
} from "@/components/detail/DetailComponents";

import type {
  Farmacia,
  Medicamento,
  Renovacao,
} from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type RenovacaoComMedicamento =
  Renovacao & {
    medicamento_nome: string;
    dosagem?: string;
  };

type MedicamentoComContexto =
  Medicamento & {
    deveRenovar: boolean;
    ultimaCompra:
      | Renovacao
      | null;
  };

// ============================================================
// HELPERS
// ============================================================

function formatDateDisplay(
  isoStr?: string
): string {
  if (!isoStr) {
    return "";
  }

  const datePart =
    isoStr.includes("T")
      ? isoStr.split("T")[0]
      : isoStr;

  const parts =
    datePart.split("-");

  if (
    parts.length !== 3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(
  value: number
): string {
  return `R$ ${value
    .toFixed(2)
    .replace(".", ",")}`;
}

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
// CONTENT
// ============================================================

function DetalhesFarmaciaContent() {
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

  const {
    activePersonId,
  } =
    useActivePersonId();

  /*
   * FARMÁCIA:
   * global por usuário.
   */
  const {
    getFarmacia,
    deleteFarmaciaSafe,
  } =
    useFarmacias();

  /*
   * MEDICAMENTOS E RENOVAÇÕES:
   * filtrados pela pessoa ativa nos respectivos hooks.
   */
  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    renovacoes = [],
  } =
    useRenovacoes();

  const deleteAction =
    useSubmitAction();

  const mounted =
    useMounted();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    farmacia,
    setFarmacia,
  ] =
    useState<Farmacia | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] =
    useState(false);

  // ==========================================================
  // PERSON CONTEXT
  // ==========================================================

  const activePerson =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return undefined;
        }

        return db.persons.get(
          activePersonId
        );
      },
      [
        activePersonId,
      ]
    );

  // ==========================================================
  // LOAD FARMACIA
  // ==========================================================

  useEffect(() => {
    if (!id) {
      router.replace(
        "/saude/farmacias"
      );

      return;
    }

    let cancelled =
      false;

    const load =
      async () => {
        setIsLoading(
          true
        );

        try {
          /*
           * Não existe person_id aqui.
           * Farmácia é global.
           */
          const item =
            await getFarmacia(
              id
            );

          if (
            cancelled
          ) {
            return;
          }

          if (!item) {
            router.replace(
              "/saude/farmacias"
            );

            return;
          }

          setFarmacia(
            item
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao carregar farmácia:",
            error
          );

          if (
            !cancelled
          ) {
            router.replace(
              "/saude/farmacias"
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
  }, [
    id,
    getFarmacia,
    router,
  ]);

  // ==========================================================
  // RELATIONAL ANALYSIS
  // ==========================================================

  const analiseFarmacia =
    useMemo(() => {
      if (
        !farmacia?.id
      ) {
        return {
          medicamentosVinculados:
            [] as Medicamento[],
          renovacoesDaFarmacia:
            [] as Renovacao[],
          ultimasRenovacoes:
            [] as RenovacaoComMedicamento[],
          totalGasto: 0,
          precoMedio: 0,
          ultimaCompra:
            null as Renovacao | null,
          comprasCount: 0,
        };
      }

      /*
       * Estes arrays já estão person-scoped.
       *
       * Portanto:
       * - Farmácia continua global;
       * - dados clínico-financeiros são da pessoa ativa.
       */
      const medicamentosVinculados =
        medicamentos.filter(
          (
            medicamento
          ) =>
            medicamento.farmacia_id ===
            farmacia.id
        );

      const renovacoesDaFarmacia =
        renovacoes
          .filter(
            (
              renovacao
            ) =>
              renovacao.farmacia_id ===
              farmacia.id
          )
          .sort(
            (
              first,
              second
            ) =>
              (
                second.data ||
                ""
              ).localeCompare(
                first.data ||
                  ""
              )
          );

      /*
       * Gasto histórico usa SOMENTE Renovações.
       *
       * medicamento.preco é um valor atual/de referência;
       * não prova que uma compra aconteceu.
       *
       * Somá-lo como gasto gerava falso histórico financeiro.
       */
      const comprasComPreco =
        renovacoesDaFarmacia.filter(
          (
            renovacao
          ) =>
            typeof renovacao.preco ===
              "number" &&
            renovacao.preco >
              0
        );

      const totalGasto =
        comprasComPreco.reduce(
          (
            total,
            renovacao
          ) =>
            total +
            Number(
              renovacao.preco
            ),
          0
        );

      const precoMedio =
        comprasComPreco.length >
        0
          ? totalGasto /
            comprasComPreco.length
          : 0;

      const ultimaCompra =
        renovacoesDaFarmacia[0] ||
        null;

      const ultimasRenovacoes:
        RenovacaoComMedicamento[] =
        renovacoesDaFarmacia
          .slice(
            0,
            5
          )
          .map(
            (
              renovacao
            ) => {
              const medicamento =
                medicamentos.find(
                  (
                    item
                  ) =>
                    item.id ===
                    renovacao.medicamento_id
                );

              return {
                ...renovacao,

                medicamento_nome:
                  medicamento?.nome ||
                  "Medicamento",

                dosagem:
                  medicamento?.dosagem ||
                  undefined,
              };
            }
          );

      return {
        medicamentosVinculados,
        renovacoesDaFarmacia,
        ultimasRenovacoes,
        totalGasto,
        precoMedio,
        ultimaCompra,
        comprasCount:
          renovacoesDaFarmacia.length,
      };
    }, [
      farmacia,
      medicamentos,
      renovacoes,
    ]);

  // ==========================================================
  // RANKING
  // ==========================================================

  const rankingFarmacias =
    useMemo(() => {
      /*
       * Ranking também fica restrito à pessoa ativa porque
       * renovacoes já é person-scoped.
       */
      return analisarMelhorFarmacia(
        renovacoes
      );
    }, [
      renovacoes,
    ]);

  const posicaoRanking =
    useMemo(() => {
      if (
        !farmacia?.id
      ) {
        return null;
      }

      const index =
        rankingFarmacias.findIndex(
          (
            item
          ) =>
            item.farmacia_id ===
            farmacia.id
        );

      return index >= 0
        ? index + 1
        : null;
    }, [
      farmacia?.id,
      rankingFarmacias,
    ]);

  const isMaisEconomica =
    posicaoRanking === 1;

  // ==========================================================
  // MEDICATION CONTEXT
  // ==========================================================

  const medicamentosComContexto =
    useMemo<
      MedicamentoComContexto[]
    >(() => {
      return analiseFarmacia.medicamentosVinculados.map(
        (
          medicamento
        ) => {
          const renovacaoSugerida =
            sugerirRenovacao(
              medicamento
            );

          const ultimaCompra =
            analiseFarmacia.renovacoesDaFarmacia.find(
              (
                renovacao
              ) =>
                renovacao.medicamento_id ===
                medicamento.id
            ) ||
            null;

          return {
            ...medicamento,

            deveRenovar:
              renovacaoSugerida.deveRenovar,

            ultimaCompra,
          };
        }
      );
    }, [
      analiseFarmacia,
    ]);

  // ==========================================================
  // INSIGHT
  // ==========================================================

  const insightFarmacia =
    useMemo(() => {
      if (!farmacia) {
        return null;
      }

      /*
       * comprasCount agora representa compras históricas
       * registradas, e não "medicamentos + compras".
       */
      return analisarFarmaciaDetalhada(
        {
          totalGasto:
            analiseFarmacia.totalGasto,

          comprasCount:
            analiseFarmacia.comprasCount,

          isMaisEconomica,
        }
      );
    }, [
      farmacia,
      analiseFarmacia.totalGasto,
      analiseFarmacia.comprasCount,
      isMaisEconomica,
    ]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    !mounted ||
    isLoading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (!farmacia) {
    return null;
  }

  // ==========================================================
  // DERIVED UI
  // ==========================================================

  const cor =
    isMaisEconomica
      ? "#34D399"
      : "#F59E0B";

  const activePersonName =
    activePerson?.name ||
    "Pessoa ativa";

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    () => {
      if (
        !farmacia.id
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      deleteAction.run(
        async () => {
          /*
           * Farmácia é global.
           *
           * O cleanup precisa alcançar referências de TODAS
           * as pessoas, por isso usamos deleteFarmaciaSafe.
           *
           * Medicamentos e renovações não são excluídos.
           */
          await deleteFarmaciaSafe(
            farmacia.id!
          );

          router.replace(
            "/saude/farmacias"
          );
        },
        {
          successMessage:
            "Farmácia excluída com sucesso",

          errorMessage:
            "Erro ao excluir farmácia",

          goBackOnSuccess:
            false,
        }
      );
    };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.back();
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
                aria-label="Voltar"
              >
                <ArrowLeft
                  size={18}
                  className="text-ink-primary"
                />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-400">
                  Entidade global
                </p>

                <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">
                  Farmácia
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    `/saude/farmacias/editar?id=${farmacia.id}`
                  );
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all hover:border-amber-400/30 hover:text-amber-400 active:scale-95"
                aria-label="Editar farmácia"
              >
                <Edit3
                  size={16}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setShowDeleteModal(
                    true
                  );
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
                aria-label="Excluir farmácia"
              >
                <Trash2
                  size={16}
                />
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          {/* ==================================================
              HERO
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="space-y-5 rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm"
            style={{
              borderLeft:
                `6px solid ${cor}`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor:
                      `${cor}15`,

                    color:
                      cor,

                    borderColor:
                      `${cor}30`,
                  }}
                >
                  <Store
                    size={28}
                  />
                </div>

                <div className="min-w-0 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display text-2xl font-bold uppercase text-ink-primary">
                      {
                        farmacia.nome
                      }
                    </h2>

                    {isMaisEconomica && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-bold uppercase text-void">
                        <Award
                          size={10}
                        />

                        Melhor preço
                      </span>
                    )}
                  </div>

                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-ice/15 bg-ice/8 px-2.5 py-1 text-[10px] font-medium text-ice">
                    <Building2
                      size={11}
                    />

                    Cadastro global do Vault
                  </div>

                  {farmacia.endereco && (
                    <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-ink-muted">
                      <MapPin
                        size={13}
                        className="mt-0.5 shrink-0 text-ink-faint"
                      />

                      <span>
                        {
                          farmacia.endereco
                        }
                      </span>
                    </p>
                  )}

                  {farmacia.telefone && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                      <Phone
                        size={13}
                        className="shrink-0 text-ink-faint"
                      />

                      {
                        farmacia.telefone
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 pt-1">
                {farmacia.telefone && (
                  <a
                    href={`tel:${farmacia.telefone}`}
                    onClick={() =>
                      trigger(
                        "vibrate"
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 transition-all active:scale-95"
                    title="Ligar para farmácia"
                    aria-label="Ligar para farmácia"
                  >
                    <Phone
                      size={16}
                    />
                  </a>
                )}

                {farmacia.endereco && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      farmacia.endereco
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trigger(
                        "vibrate"
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/30 bg-ice/10 text-ice transition-all active:scale-95"
                    title="Abrir no mapa"
                    aria-label="Abrir no mapa"
                  >
                    <Navigation
                      size={16}
                    />
                  </a>
                )}
              </div>
            </div>

            {/* ================================================
                PERSON CONTEXT
                ================================================ */}

            <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/45 px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <User
                  size={15}
                  className="mt-0.5 shrink-0 text-ice"
                />

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Dados abaixo
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                    Medicamentos, compras e valores exibidos são do contexto de{" "}
                    <span className="font-semibold text-ink-primary">
                      {
                        activePersonName
                      }
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>

            {/* ================================================
                LAST PURCHASE
                ================================================ */}

            {analiseFarmacia.ultimaCompra && (
              <div className="border-t border-surface-border/40 pt-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <Clock
                    size={14}
                    className="text-amber-400"
                  />

                  <span>
                    Última compra:{" "}
                    <span className="font-medium text-ink-primary">
                      {formatDateDisplay(
                        analiseFarmacia
                          .ultimaCompra
                          .data
                      )}
                    </span>
                  </span>

                  {typeof analiseFarmacia
                    .ultimaCompra
                    .preco ===
                    "number" &&
                    analiseFarmacia
                      .ultimaCompra
                      .preco >
                      0 && (
                      <span className="font-semibold text-emerald-400">
                        {formatCurrency(
                          analiseFarmacia
                            .ultimaCompra
                            .preco
                        )}
                      </span>
                    )}
                </div>
              </div>
            )}

            {/* ================================================
                METRICS
                ================================================ */}

            <div className="grid grid-cols-2 gap-2 border-t border-surface-border/40 pt-4">
              <StatCard
                icon={
                  <Pill
                    size={14}
                  />
                }
                label="Medicamentos"
                value={String(
                  analiseFarmacia
                    .medicamentosVinculados
                    .length
                )}
              />

              <StatCard
                icon={
                  <ReceiptText
                    size={14}
                  />
                }
                label="Compras"
                value={String(
                  analiseFarmacia.comprasCount
                )}
              />

              <StatCard
                icon={
                  <DollarSign
                    size={14}
                  />
                }
                label="Total gasto"
                value={
                  analiseFarmacia.totalGasto >
                  0
                    ? formatCurrency(
                        analiseFarmacia.totalGasto
                      )
                    : "—"
                }
              />

              <StatCard
                icon={
                  <DollarSign
                    size={14}
                  />
                }
                label="Média histórica"
                value={
                  analiseFarmacia.precoMedio >
                  0
                    ? formatCurrency(
                        analiseFarmacia.precoMedio
                      )
                    : "—"
                }
              />
            </div>
          </motion.div>

          {/* ==================================================
              INSIGHT
              ================================================== */}

          {insightFarmacia &&
            analiseFarmacia.comprasCount >
              0 && (
              <motion.div
                variants={
                  fadeUp
                }
                initial="initial"
                animate="animate"
                transition={{
                  delay: 0.04,
                }}
                className={`rounded-[24px] border p-4 shadow-sm ${
                  isMaisEconomica
                    ? "border-emerald-400/30 bg-emerald-400/5"
                    : "border-amber-400/30 bg-amber-400/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Award
                    size={16}
                    className={`mt-0.5 shrink-0 ${
                      isMaisEconomica
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  />

                  <div>
                    {posicaoRanking && (
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                        {posicaoRanking ===
                        1
                          ? "1ª colocada no perfil atual"
                          : `${posicaoRanking}ª colocada no perfil atual`}
                      </p>
                    )}

                    <p className="text-sm leading-6 text-ink-primary">
                      {
                        insightFarmacia.mensagem
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

          {/* ==================================================
              OBSERVACOES
              ================================================== */}

          {farmacia.observacoes && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay: 0.05,
              }}
              className="space-y-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <SectionTitle
                icon={
                  <FileText
                    size={15}
                  />
                }
                title="Observações"
              />

              <p className="whitespace-pre-wrap text-xs leading-6 text-ink-muted">
                {
                  farmacia.observacoes
                }
              </p>
            </motion.div>
          )}

          {/* ==================================================
              MEDICATIONS
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay: 0.07,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <Pill
                  size={15}
                />
              }
              title={`Medicamentos de ${activePersonName} (${medicamentosComContexto.length})`}
            />

            {medicamentosComContexto.length ===
            0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs leading-5 text-ink-muted">
                  Nenhum medicamento da pessoa ativa está vinculado a esta farmácia.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicamentosComContexto.map(
                  (
                    medicamento
                  ) => (
                    <button
                      key={
                        medicamento.id
                      }
                      type="button"
                      onClick={() => {
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
                      }}
                      className="flex w-full flex-col gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all hover:border-amber-400/30 active:scale-[0.98]"
                    >
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                            <Pill
                              size={16}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate text-sm font-semibold uppercase text-ink-primary">
                                {
                                  medicamento.nome
                                }
                              </p>

                              {medicamento.deveRenovar && (
                                <span className="shrink-0 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400">
                                  Renovar
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-ink-muted">
                              {medicamento.dosagem ||
                                "Dosagem não informada"}
                            </p>
                          </div>
                        </div>

                        <ExternalLink
                          size={15}
                          className="shrink-0 text-ink-faint"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-surface-border/40 pt-2">
                        <div className="min-w-0">
                          <p className="text-[9px] font-mono uppercase text-ink-faint">
                            Preço cadastrado
                          </p>

                          <p className="mt-0.5 truncate text-xs font-semibold text-ink-primary">
                            {typeof medicamento.preco ===
                              "number" &&
                            medicamento.preco >
                              0
                              ? formatCurrency(
                                  medicamento.preco
                                )
                              : "Não informado"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[9px] font-mono uppercase text-ink-faint">
                            Última compra
                          </p>

                          <p className="mt-0.5 truncate text-xs font-semibold text-ink-primary">
                            {medicamento.ultimaCompra
                              ? formatDateDisplay(
                                  medicamento
                                    .ultimaCompra
                                    .data
                                )
                              : "Sem histórico"}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              PURCHASE HISTORY
              ================================================== */}

          {analiseFarmacia
            .ultimasRenovacoes
            .length >
            0 && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay: 0.1,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <Clock
                    size={15}
                  />
                }
                title="Compras recentes"
              />

              <div className="space-y-2">
                {analiseFarmacia.ultimasRenovacoes.map(
                  (
                    renovacao
                  ) => (
                    <div
                      key={
                        renovacao.id
                      }
                      className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5 shadow-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                          <Calendar
                            size={15}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold uppercase text-ink-primary">
                            {
                              renovacao.medicamento_nome
                            }
                          </p>

                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <p className="text-[11px] text-ink-muted">
                              {formatDateDisplay(
                                renovacao.data
                              )}
                            </p>

                            {renovacao.dosagem && (
                              <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                                {
                                  renovacao.dosagem
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {typeof renovacao.preco ===
                          "number" &&
                        renovacao.preco >
                          0 ? (
                          <span className="text-sm font-semibold text-emerald-400">
                            {formatCurrency(
                              renovacao.preco
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] text-ink-faint">
                            Sem preço
                          </span>
                        )}
                      </div>
                    </div>
                  )
                )}
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
          onClose={() =>
            setShowDeleteModal(
              false
            )
          }
          onConfirm={
            handleDelete
          }
          title="Excluir farmácia"
          message={`Tem certeza que deseja excluir "${farmacia.nome}"? Como esta é uma entidade global, ela será desvinculada dos medicamentos e renovações de todas as pessoas. Os registros clínicos e históricos não serão excluídos.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={
            deleteAction.isSubmitting
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

export default function DetalhesFarmaciaPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <DetalhesFarmaciaContent />
    </Suspense>
  );
}