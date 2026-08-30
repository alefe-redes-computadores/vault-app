// app/saude/tratamentos/detalhes/page.tsx
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
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Activity,
  ArrowLeftRight,
  Building2,
  ChevronRight,
  Clock,
  Edit3,
  FileStack,
  FileText,
  FolderHeart,
  History,
  MapPin,
  Pill,
  Plus,
  Receipt,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  DetailSkeleton,
} from "@/components/loading/DetailSkeleton";

import {
  DocumentCard,
} from "@/components/DocumentCard";

import {
  useSafeDb,
} from "@/hooks/useSafeDb";

import {
  useTratamentos,
} from "@/hooks/useTratamentos";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  useCids,
} from "@/hooks/useCids";

import {
  useMedicos,
} from "@/hooks/useMedicos";

import {
  useHospitais,
} from "@/hooks/useHospitais";

import {
  useLocais,
} from "@/hooks/useLocais";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useMounted,
} from "@/hooks/useMounted";

import {
  db,
} from "@/lib/db";

import type {
  Cid,
  Document,
  Hospital,
  LocalSaude,
  Medico,
  Medicamento,
  Renovacao,
  Tratamento,
} from "@/lib/types";

import {
  calcularEconomia,
  getCidInsights,
  isReceitaVencidaSegura,
  sugerirRenovacao,
} from "@/lib/health-insights";

import {
  formatCurrency,
  getClinicalTheme,
} from "@/lib/health-utils";

import {
  DetailInfoRow,
  SectionTitle,
  StatCard,
} from "@/components/detail/DetailComponents";

// ============================================================
// ANIMAÇÕES
// ============================================================

const listVariants = {
  hidden: {
    opacity: 0,
  },

  show: {
    opacity: 1,

    transition: {
      staggerChildren:
        0.04,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },

  show: {
    opacity: 1,
    y: 0,

    transition: {
      duration:
        0.22,

      ease: [
        0.16,
        1,
        0.3,
        1,
      ],
    },
  },
};

const fadeUp = {
  initial: {
    opacity: 0,
    y: 15,
  },

  animate: {
    opacity: 1,
    y: 0,
  },
};

// ============================================================
// TIPOS
// ============================================================

interface MedicamentoComAlertas
  extends Medicamento {
  receitaVencida:
    boolean;

  insight:
    ReturnType<
      typeof sugerirRenovacao
    >;
}

interface DocumentMetadata {
  tratamento_id?:
    string;

  cid_id?:
    string;

  [key: string]:
    unknown;
}

type DocumentPersonScoped =
  Document & {
    person_id?:
      string;
  };

interface EconomiaMedicamento {
  medicamento:
    Medicamento;

  economia:
    NonNullable<
      ReturnType<
        typeof calcularEconomia
      >
    >;
}

// ============================================================
// HELPERS
// ============================================================

function formatDateDisplay(
  isoStr?:
    string | null
): string {
  if (!isoStr) {
    return "";
  }

  const parts =
    isoStr.split(
      "-"
    );

  if (
    parts.length !==
    3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getPrecoSeguro(
  value:
    Renovacao["preco"]
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    ) ||
    value <=
      0
  ) {
    return 0;
  }

  return value;
}

function getStatusLabel(
  status:
    Tratamento["status"]
): string {
  if (
    status ===
    "ativo"
  ) {
    return "Em andamento";
  }

  if (
    status ===
    "concluido"
  ) {
    return "Concluído";
  }

  return "Suspenso";
}

// ============================================================
// CONTENT
// ============================================================

function TratamentoContent() {
  const {
    trigger,
  } =
    useHapticFeedback();

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
    favorite,
  } =
    useSafeDb();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    getTratamento,
  } =
    useTratamentos();

  /*
   * Medicamentos, Renovações e CIDs já são person-scoped
   * pelos respectivos hooks.
   */
  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    renovacoes = [],
  } =
    useRenovacoes();

  const {
    cids = [],
  } =
    useCids();

  /*
   * Médicos, Hospitais e Locais são entidades globais da conta.
   * O vínculo exibido parte do Tratamento person-owned.
   */
  const {
    medicos = [],
  } =
    useMedicos();

  const {
    hospitais = [],
  } =
    useHospitais();

  const {
    locais = [],
  } =
    useLocais();

  const mounted =
    useMounted();

  // ==========================================================
  // ESTADO
  // ==========================================================

  const [
    tratamento,
    setTratamento,
  ] =
    useState<Tratamento | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
    );

  const [
    isMenuFlutuanteOpen,
    setIsMenuFlutuanteOpen,
  ] =
    useState(
      false
    );

  const [
    dismissEconomia,
    setDismissEconomia,
  ] =
    useState(
      false
    );

  // ==========================================================
  // DOCUMENTOS
  //
  // Ainda usamos Dexie diretamente porque não temos aqui uma
  // API confirmada de Documentos adequada para esta consulta.
  //
  // A leitura, porém, é obrigatoriamente person-scoped.
  // ==========================================================

  const documentosDaPessoa =
    useLiveQuery(
      async () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.documents
          .where(
            "person_id"
          )
          .equals(
            activePersonId
          )
          .toArray();
      },
      [
        activePersonId,
      ],
      []
    ) ||
    [];

  // ==========================================================
  // CARREGAR TRATAMENTO
  // ==========================================================

  useEffect(
    () => {
      let cancelled =
        false;

      const fetchTratamento =
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
              setTratamento(
                null
              );

              setIsLoading(
                false
              );
            }

            return;
          }

          try {
            const data =
              await getTratamento(
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
              setTratamento(
                null
              );

              return;
            }

            setTratamento(
              data
            );
          } catch (
            error
          ) {
            console.error(
              "[TratamentoDetalhes] Erro ao buscar tratamento:",
              error
            );

            if (
              !cancelled
            ) {
              setTratamento(
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

      void fetchTratamento();

      return () => {
        cancelled =
          true;
      };
    },
    [
      id,
      activePersonId,
      getTratamento,
    ]
  );

  // ==========================================================
  // PREFERÊNCIA LOCAL DO CARD DE ECONOMIA
  // ==========================================================

  useEffect(
    () => {
      if (
        typeof window ===
          "undefined" ||
        !id
      ) {
        return;
      }

      const stored =
        localStorage.getItem(
          `dismissEconomia_${id}`
        );

      setDismissEconomia(
        stored ===
          "true"
      );
    },
    [
      id,
    ]
  );

  // ==========================================================
  // FECHAR MENU FLUTUANTE
  // ==========================================================

  useEffect(
    () => {
      if (
        !isMenuFlutuanteOpen
      ) {
        return;
      }

      const handleClickOutside =
        () => {
          setIsMenuFlutuanteOpen(
            false
          );
        };

      document.addEventListener(
        "click",
        handleClickOutside
      );

      return () => {
        document.removeEventListener(
          "click",
          handleClickOutside
        );
      };
    },
    [
      isMenuFlutuanteOpen,
    ]
  );

  // ==========================================================
  // MEDICAMENTOS VINCULADOS
  //
  // ÚNICA fonte canônica:
  //
  // Medicamento.tratamento_ids
  //
  // Não lemos mais tratamento.medicamento_ids.
  // ==========================================================

  const linkedMedicamentos =
    useMemo(
      () => {
        if (
          !id
        ) {
          return [];
        }

        return medicamentos.filter(
          (
            medicamento
          ) =>
            medicamento.tratamento_ids?.includes(
              id
            ) ===
            true
        );
      },
      [
        medicamentos,
        id,
      ]
    );

  // ==========================================================
  // RENOVAÇÕES DO TRATAMENTO
  // ==========================================================

  const linkedRenovacoes =
    useMemo(
      () => {
        const medIds =
          new Set(
            linkedMedicamentos
              .map(
                (
                  medicamento
                ) =>
                  medicamento.id
              )
              .filter(
                (
                  medicamentoId
                ): medicamentoId is string =>
                  Boolean(
                    medicamentoId
                  )
              )
          );

        return renovacoes
          .filter(
            (
              renovacao
            ) =>
              medIds.has(
                renovacao.medicamento_id
              )
          )
          .sort(
            (
              a,
              b
            ) =>
              String(
                b.data ||
                  ""
              ).localeCompare(
                String(
                  a.data ||
                    ""
                )
              )
          );
      },
      [
        linkedMedicamentos,
        renovacoes,
      ]
    );

  // ==========================================================
  // DOCUMENTOS DO TRATAMENTO
  // ==========================================================

  const linkedDocuments =
    useMemo(
      () => {
        if (
          !id ||
          !activePersonId
        ) {
          return [];
        }

        return (
          documentosDaPessoa as
            DocumentPersonScoped[]
        )
          .filter(
            (
              document
            ) => {
              /*
               * Defesa adicional de ownership.
               */
              if (
                document.person_id !==
                activePersonId
              ) {
                return false;
              }

              const metadata =
                (
                  document.metadata ||
                  {}
                ) as DocumentMetadata;

              return (
                metadata.tratamento_id ===
                id
              );
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              String(
                b.created_at ||
                  ""
              ).localeCompare(
                String(
                  a.created_at ||
                    ""
                )
              )
          );
      },
      [
        documentosDaPessoa,
        activePersonId,
        id,
      ]
    );

  // ==========================================================
  // CIDS
  // ==========================================================

  const cidsVinculados =
    useMemo(
      () => {
        const ids =
          new Set(
            tratamento?.cid_ids ||
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
        tratamento?.cid_ids,
      ]
    );

  const cidsInsights =
    useMemo(
      () => {
        return cidsVinculados.map(
          (
            cid: Cid
          ) => ({
            ...cid,

            insight:
              getCidInsights(
                cid.codigo
              ),
          })
        );
      },
      [
        cidsVinculados,
      ]
    );

  // ==========================================================
  // REDE DE APOIO
  // ==========================================================

  const linkedMedicos =
    useMemo(
      () => {
        const ids =
          new Set<string>();

        /*
         * Médicos explicitamente vinculados ao Tratamento.
         */
        for (
          const medicoId of
          tratamento?.medico_ids ||
          []
        ) {
          ids.add(
            medicoId
          );
        }

        /*
         * Também consideramos médicos atuais dos medicamentos,
         * pois fazem parte da rede clínica real deste tratamento.
         */
        for (
          const medicamento of
          linkedMedicamentos
        ) {
          if (
            medicamento.medico_id
          ) {
            ids.add(
              medicamento.medico_id
            );
          }
        }

        return medicos.filter(
          (
            medico: Medico
          ) =>
            Boolean(
              medico.id &&
                ids.has(
                  medico.id
                )
            )
        );
      },
      [
        medicos,
        linkedMedicamentos,
        tratamento?.medico_ids,
      ]
    );

  const linkedHospitais =
    useMemo(
      () => {
        const ids =
          new Set(
            tratamento?.hospital_ids ||
              []
          );

        return hospitais.filter(
          (
            hospital: Hospital
          ) =>
            Boolean(
              hospital.id &&
                ids.has(
                  hospital.id
                )
            )
        );
      },
      [
        hospitais,
        tratamento?.hospital_ids,
      ]
    );

  const linkedLocais =
    useMemo(
      () => {
        const ids =
          new Set(
            tratamento?.local_ids ||
              []
          );

        return locais.filter(
          (
            local: LocalSaude
          ) =>
            Boolean(
              local.id &&
                ids.has(
                  local.id
                )
            )
        );
      },
      [
        locais,
        tratamento?.local_ids,
      ]
    );

  // ==========================================================
  // INTELIGÊNCIA DOS MEDICAMENTOS
  // ==========================================================

  const medicamentosComAlertas =
    useMemo(
      () => {
        return linkedMedicamentos.map(
          (
            medicamento
          ): MedicamentoComAlertas => ({
            ...medicamento,

            receitaVencida:
              isReceitaVencidaSegura(
                medicamento.proxima_renovacao
              ),

            insight:
              sugerirRenovacao(
                medicamento
              ),
          })
        );
      },
      [
        linkedMedicamentos,
      ]
    );

  const medicamentosAtivos =
    useMemo(
      () =>
        medicamentosComAlertas.filter(
          (
            medicamento
          ) =>
            medicamento.status !==
            "descontinuado"
        ),
      [
        medicamentosComAlertas,
      ]
    );

  const medicamentosDescontinuados =
    useMemo(
      () =>
        medicamentosComAlertas.filter(
          (
            medicamento
          ) =>
            medicamento.status ===
            "descontinuado"
        ),
      [
        medicamentosComAlertas,
      ]
    );

  const medicamentosPrecisandoAtencao =
    useMemo(
      () =>
        medicamentosAtivos.filter(
          (
            medicamento
          ) =>
            medicamento.receitaVencida ||
            medicamento.insight
              ?.deveRenovar
        ),
      [
        medicamentosAtivos,
      ]
    );

  // ==========================================================
  // HISTÓRICO FINANCEIRO
  //
  // Só Renovação representa aquisição histórica.
  //
  // Não somamos Medicamento.preco, porque isso duplicaria o
  // valor atual junto com compras que já estão no histórico.
  // ==========================================================

  const custoHistorico =
    useMemo(
      () =>
        linkedRenovacoes.reduce(
          (
            total,
            renovacao
          ) =>
            total +
            getPrecoSeguro(
              renovacao.preco
            ),
          0
        ),
      [
        linkedRenovacoes,
      ]
    );

  const aquisicoesComPreco =
    useMemo(
      () =>
        linkedRenovacoes.filter(
          (
            renovacao
          ) =>
            getPrecoSeguro(
              renovacao.preco
            ) >
            0
        ).length,
      [
        linkedRenovacoes,
      ]
    );

  // ==========================================================
  // ECONOMIA
  //
  // IMPORTANTE:
  //
  // O código antigo passava as renovações de TODOS os
  // medicamentos juntas para calcularEconomia().
  //
  // Isso podia comparar preço de remédios diferentes.
  //
  // Agora calculamos por medicamento.
  // ==========================================================

  const economiasPorMedicamento =
    useMemo<
      EconomiaMedicamento[]
    >(
      () => {
        const result:
          EconomiaMedicamento[] =
          [];

        for (
          const medicamento of
          linkedMedicamentos
        ) {
          if (
            !medicamento.id
          ) {
            continue;
          }

          const historico =
            linkedRenovacoes.filter(
              (
                renovacao
              ) =>
                renovacao.medicamento_id ===
                medicamento.id
            );

          const economia =
            calcularEconomia(
              historico
            );

          if (
            !economia ||
            !Number.isFinite(
              economia.percentual
            ) ||
            !Number.isFinite(
              economia.economia
            )
          ) {
            continue;
          }

          result.push({
            medicamento,
            economia,
          });
        }

        return result;
      },
      [
        linkedMedicamentos,
        linkedRenovacoes,
      ]
    );

  // ==========================================================
  // SUS
  //
  // É somente leitura do cadastro atual.
  // Não significa garantia futura de fornecimento/cobertura.
  // ==========================================================

  const statsSus =
    useMemo(
      () => {
        const total =
          linkedMedicamentos.length;

        const totalSus =
          linkedMedicamentos.filter(
            (
              medicamento
            ) =>
              medicamento.tipo_aquisicao ===
              "sus"
          ).length;

        return {
          total,

          totalSus,

          hasSus:
            totalSus >
            0,

          isAllSus:
            total >
              0 &&
            totalSus ===
              total,
        };
      },
      [
        linkedMedicamentos,
      ]
    );

  // ==========================================================
  // PANORAMA LONGITUDINAL
  // ==========================================================

  const panorama =
    useMemo(
      () => {
        const primeiraAquisicao =
          linkedRenovacoes.length >
          0
            ? linkedRenovacoes[
                linkedRenovacoes.length -
                  1
              ]?.data
            : undefined;

        const ultimaAquisicao =
          linkedRenovacoes[
            0
          ]?.data;

        return {
          renovacoes:
            linkedRenovacoes.length,

          primeiraAquisicao,

          ultimaAquisicao,

          medicamentosAtivos:
            medicamentosAtivos.length,

          medicamentosDescontinuados:
            medicamentosDescontinuados.length,

          medicamentosPrecisandoAtencao:
            medicamentosPrecisandoAtencao.length,
        };
      },
      [
        linkedRenovacoes,
        medicamentosAtivos.length,
        medicamentosDescontinuados.length,
        medicamentosPrecisandoAtencao.length,
      ]
    );

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

  if (
    !tratamento
  ) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void px-6 text-center">
        <FolderHeart
          size={
            36
          }
          className="text-ink-muted"
        />

        <p className="mt-4 font-semibold text-ink-primary">
          Tratamento não encontrado
        </p>

        <p className="mt-1 max-w-sm text-sm text-ink-muted">
          O registro não existe ou não pertence à pessoa ativa.
        </p>

        <button
          type="button"
          onClick={
            () =>
              router.replace(
                "/saude/tratamentos"
              )
          }
          className="mt-5 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
        >
          Voltar
        </button>
      </main>
    );
  }

  // ==========================================================
  // HANDLERS
  // ==========================================================

  const handleFavoriteToggle =
    async (
      docId:
        string
    ) => {
      await favorite(
        docId
      );

      trigger(
        "vibrate"
      );
    };

  const handleDismissEconomia =
    () => {
      if (
        typeof window !==
          "undefined" &&
        id
      ) {
        localStorage.setItem(
          `dismissEconomia_${id}`,
          "true"
        );
      }

      setDismissEconomia(
        true
      );

      trigger(
        "vibrate"
      );
    };

  // ==========================================================
  // MENU
  // ==========================================================

  const menuOptions = [
    {
      id:
        "adicionar-cid",

      label:
        "Adicionar CID",

      icon:
        FolderHeart,

      path:
        `/saude/cids?tratamento_id=${id}`,
    },

    {
      id:
        "novo-medicamento",

      label:
        "Novo Medicamento",

      icon:
        Pill,

      path:
        `/saude/medicamentos/novo?tratamento_id=${id}`,
    },

    {
      id:
        "adicionar-documento",

      label:
        "Adicionar Documento",

      icon:
        FileText,

      path:
        `/novo?tratamento_id=${id}`,
    },

    {
      id:
        "editar-tratamento",

      label:
        "Editar Tratamento",

      icon:
        Edit3,

      path:
        `/saude/tratamentos/editar?id=${id}`,
    },
  ];

  const handleMenuOptionClick =
    (
      path:
        string
    ) => {
      trigger(
        "vibrate"
      );

      setIsMenuFlutuanteOpen(
        false
      );

      router.push(
        path
      );
    };

  // ==========================================================
  // TEMA
  // ==========================================================

  const theme =
    getClinicalTheme(
      tratamento.nome
    );

  const IconComp =
    theme.icon;

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

                    router.back();
                  }
                }
                aria-label="Voltar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-transform active:scale-95"
              >
                <ChevronRight
                  size={
                    18
                  }
                  className="rotate-180"
                />
              </button>

              <div className="min-w-0">
                <p
                  className={`font-mono text-[11px] uppercase tracking-[0.28em] ${theme.textClass}`}
                >
                  Painel Clínico
                </p>

                <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">
                  Visão Geral
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* ==============================================
                  MENU
                  ============================================== */}

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
                          current
                        ) =>
                          !current
                      );
                    }
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all hover:bg-ice/20 active:scale-95"
                  aria-label="Adicionar ao tratamento"
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
                      <motion.div
                        initial={{
                          opacity: 0,
                        }}
                        animate={{
                          opacity: 1,
                        }}
                        exit={{
                          opacity: 0,
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
                          opacity: 0,
                          y: 10,
                          scale: 0.95,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                        }}
                        exit={{
                          opacity: 0,
                          y: 10,
                          scale: 0.95,
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
                        onClick={
                          (
                            event
                          ) =>
                            event.stopPropagation()
                        }
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
                              const MenuIcon =
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
                                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-ice/8 active:scale-[0.98]"
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                    <MenuIcon
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

              {/* ==============================================
                  EDITAR
                  ============================================== */}

              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    router.push(
                      `/saude/tratamentos/editar?id=${tratamento.id}`
                    );
                  }
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
                aria-label="Editar tratamento"
              >
                <Edit3
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

        <section className="space-y-6 px-5 pt-6">
          {/* ==================================================
              CARD PRINCIPAL
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className={`relative overflow-hidden rounded-[32px] border bg-surface p-6 shadow-sm ${theme.borderClass}`}
            style={{
              borderLeft:
                `6px solid ${theme.hex}`,
            }}
          >
            <div
              className={`pointer-events-none absolute -bottom-8 -right-8 z-0 opacity-[0.03] ${theme.textClass}`}
            >
              <IconComp
                size={
                  180
                }
              />
            </div>

            {/* ================================================
                IDENTIDADE
                ================================================ */}

            <div className="relative z-10 flex items-start gap-4">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${theme.bgClass} ${theme.borderClass} ${theme.textClass}`}
              >
                <IconComp
                  size={
                    28
                  }
                />
              </div>

              <div className="min-w-0 pt-1">
                <h2 className="font-display text-2xl font-bold leading-tight text-ink-primary">
                  {
                    tratamento.nome
                  }
                </h2>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      tratamento.status ===
                      "ativo"
                        ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                        : tratamento.status ===
                            "concluido"
                          ? "border border-ice/20 bg-ice/10 text-ice"
                          : "border border-coral/20 bg-coral/10 text-coral"
                    }`}
                  >
                    {tratamento.status ===
                      "ativo" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}

                    {getStatusLabel(
                      tratamento.status
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* ================================================
                CIDS
                ================================================ */}

            {cidsVinculados.length >
              0 && (
              <div className="relative z-10 mt-4 rounded-xl border border-surface-border/40 bg-surface-raised/50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <FolderHeart
                    size={
                      14
                    }
                    className="text-violet-400"
                  />

                  Diagnósticos vinculados
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {cidsInsights.map(
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
                          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-left transition-all active:scale-95 ${cidTheme.tagClass}`}
                        >
                          <CidIcon
                            size={
                              12
                            }
                          />

                          {cid.codigo &&
                            cid.codigo !==
                              "N/A" && (
                              <span className="text-[10px] font-semibold">
                                {
                                  cid.codigo
                                }
                              </span>
                            )}

                          <span className="max-w-[190px] truncate text-[10px] opacity-80">
                            {
                              cid.descricao
                            }
                          </span>

                          {cid.insight && (
                            <Sparkles
                              size={
                                12
                              }
                              className="opacity-80"
                            />
                          )}
                        </button>
                      );
                    }
                  )}
                </div>

                {cidsInsights.some(
                  (
                    cid
                  ) =>
                    Boolean(
                      cid.insight
                        ?.alertaClinico
                    )
                ) && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-2.5">
                    <Sparkles
                      size={
                        16
                      }
                      className="mt-0.5 shrink-0 text-amber-400"
                    />

                    <p className="text-[11px] leading-relaxed text-ink-muted">
                      <span className="font-medium text-amber-400">
                        Contexto do histórico:
                      </span>{" "}
                      {cidsInsights
                        .map(
                          (
                            cid
                          ) =>
                            cid.insight
                              ?.alertaClinico
                        )
                        .filter(
                          Boolean
                        )
                        .join(
                          " • "
                        )}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ================================================
                SUS
                ================================================ */}

            {statsSus.hasSus && (
              <div className="relative z-10 mt-3 flex items-start gap-2 rounded-xl border border-blue-400/20 bg-blue-400/10 p-2.5">
                <Building2
                  size={
                    16
                  }
                  className="mt-0.5 shrink-0 text-blue-400"
                />

                <p className="text-[11px] leading-relaxed text-blue-200">
                  <span className="font-semibold text-blue-400">
                    Aquisição registrada via SUS:
                  </span>{" "}
                  {statsSus.isAllSus
                    ? "Todos os medicamentos atualmente vinculados a este tratamento estão cadastrados no Vault com aquisição via SUS."
                    : `${statsSus.totalSus} de ${statsSus.total} medicamentos atualmente vinculados estão cadastrados com aquisição via SUS.`}
                </p>
              </div>
            )}

            {/* ================================================
                MÉTRICAS
                ================================================ */}

            <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 border-t border-surface-border/50 pt-5">
              <StatCard
                icon={
                  <Pill
                    size={
                      14
                    }
                  />
                }
                label="Em uso"
                value={`${medicamentosAtivos.length}`}
                description="Medicamentos"
              />

              <StatCard
                icon={
                  <FileStack
                    size={
                      14
                    }
                  />
                }
                label="Documentos"
                value={`${linkedDocuments.length}`}
                description="Vinculados"
              />

              <StatCard
                icon={
                  <Receipt
                    size={
                      14
                    }
                  />
                }
                label="Aquisições"
                value={`${panorama.renovacoes}`}
                description="Registradas"
              />
            </div>
          </motion.div>

          {/* ==================================================
              PANORAMA LONGITUDINAL
              ================================================== */}

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
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <Activity
                  size={
                    15
                  }
                />
              }
              title="Panorama do Tratamento"
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[20px] border border-surface-border/50 bg-surface p-3.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                  Histórico de aquisições
                </p>

                <p className="mt-1 font-display text-lg font-semibold text-ink-primary">
                  {
                    panorama.renovacoes
                  }
                </p>

                <p className="mt-0.5 text-[10px] text-ink-muted">
                  {panorama.ultimaAquisicao
                    ? `Última em ${formatDateDisplay(
                        panorama.ultimaAquisicao
                      )}`
                    : "Nenhuma aquisição registrada"}
                </p>
              </div>

              <div className="rounded-[20px] border border-surface-border/50 bg-surface p-3.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                  Atenção atual
                </p>

                <p className="mt-1 font-display text-lg font-semibold text-ink-primary">
                  {
                    panorama.medicamentosPrecisandoAtencao
                  }
                </p>

                <p className="mt-0.5 text-[10px] text-ink-muted">
                  Receita ou renovação sinalizada
                </p>
              </div>
            </div>

            {panorama.primeiraAquisicao &&
              panorama.ultimaAquisicao &&
              panorama.primeiraAquisicao !==
                panorama.ultimaAquisicao && (
                <p className="px-1 text-[10px] leading-relaxed text-ink-muted">
                  O histórico de aquisições associado a este tratamento vai de{" "}
                  <span className="font-medium text-ink-primary">
                    {formatDateDisplay(
                      panorama.primeiraAquisicao
                    )}
                  </span>{" "}
                  até{" "}
                  <span className="font-medium text-ink-primary">
                    {formatDateDisplay(
                      panorama.ultimaAquisicao
                    )}
                  </span>
                  .
                </p>
              )}
          </motion.div>

          {/* ==================================================
              HISTÓRICO FINANCEIRO
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.03,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <Receipt
                  size={
                    15
                  }
                />
              }
              title="Histórico de Aquisições"
            />

            <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                    Valor registrado
                  </p>

                  <p className="mt-1 font-display text-xl font-semibold text-ink-primary">
                    {aquisicoesComPreco >
                    0
                      ? formatCurrency(
                          custoHistorico
                        )
                      : "Sem valores"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-medium text-ink-primary">
                    {
                      aquisicoesComPreco
                    }{" "}
                    compra
                    {aquisicoesComPreco !==
                    1
                      ? "s"
                      : ""}{" "}
                    com preço
                  </p>

                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    Soma apenas eventos de aquisição
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              ECONOMIA / VARIAÇÃO
              ================================================== */}

          {economiasPorMedicamento.length >
            0 &&
            !dismissEconomia && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="space-y-2 rounded-[24px] border border-surface-border/50 bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-primary">
                      Variação recente de preço
                    </p>

                    <p className="mt-0.5 text-[10px] text-ink-muted">
                      Comparação feita separadamente por medicamento.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleDismissEconomia
                    }
                    className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-surface-raised"
                    aria-label="Ocultar análise de preço"
                  >
                    <X
                      size={
                        16
                      }
                      className="text-ink-muted"
                    />
                  </button>
                </div>

                <div className="space-y-2 pt-1">
                  {economiasPorMedicamento
                    .slice(
                      0,
                      3
                    )
                    .map(
                      (
                        item
                      ) => {
                        const melhorou =
                          item.economia
                            .economia >
                          0;

                        return (
                          <div
                            key={
                              item.medicamento
                                .id
                            }
                            className={`flex items-start gap-3 rounded-2xl border p-3 ${
                              melhorou
                                ? "border-emerald-500/20 bg-emerald-500/5"
                                : "border-coral/20 bg-coral/5"
                            }`}
                          >
                            <div
                              className={`mt-0.5 rounded-full p-1.5 ${
                                melhorou
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-coral/15 text-coral"
                              }`}
                            >
                              {melhorou ? (
                                <TrendingDown
                                  size={
                                    15
                                  }
                                />
                              ) : (
                                <TrendingUp
                                  size={
                                    15
                                  }
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-ink-primary">
                                {
                                  item
                                    .medicamento
                                    .nome
                                }
                              </p>

                              <p className="mt-0.5 text-[10px] leading-relaxed text-ink-muted">
                                {melhorou
                                  ? `Última aquisição ficou ${formatCurrency(
                                      Math.abs(
                                        item.economia
                                          .economia
                                      )
                                    )} abaixo da média anterior (${Math.abs(
                                      item.economia
                                        .percentual
                                    ).toFixed(
                                      1
                                    )}%).`
                                  : `Última aquisição ficou ${formatCurrency(
                                      Math.abs(
                                        item.economia
                                          .economia
                                      )
                                    )} acima da média anterior (${Math.abs(
                                      item.economia
                                        .percentual
                                    ).toFixed(
                                      1
                                    )}%).`}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    )}
                </div>
              </motion.div>
            )}

          {/* ==================================================
              REDE DE APOIO
              ================================================== */}

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
                <Users
                  size={
                    15
                  }
                />
              }
              title="Rede de Apoio"
            />

            {linkedMedicos.length ===
              0 &&
            linkedHospitais.length ===
              0 &&
            linkedLocais.length ===
              0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum profissional ou local de saúde vinculado.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedMedicos.map(
                  (
                    medico
                  ) => (
                    <DetailInfoRow
                      key={
                        medico.id
                      }
                      icon={
                        <Stethoscope
                          size={
                            18
                          }
                        />
                      }
                      iconClassName="bg-ice/10 text-ice"
                      label="Profissional"
                      action={
                        <ChevronRight
                          size={
                            17
                          }
                          className="text-ink-faint"
                        />
                      }
                    >
                      <button
                        type="button"
                        onClick={
                          () => {
                            trigger(
                              "vibrate"
                            );

                            router.push(
                              `/saude/medicos/detalhes?id=${medico.id}`
                            );
                          }
                        }
                        className="max-w-full truncate text-left text-sm font-semibold text-ink-primary transition-colors hover:text-ice"
                      >
                        Dr(a).{" "}
                        {
                          medico.nome
                        }
                      </button>
                    </DetailInfoRow>
                  )
                )}

                {linkedHospitais.map(
                  (
                    hospital
                  ) => (
                    <DetailInfoRow
                      key={
                        hospital.id
                      }
                      icon={
                        <Building2
                          size={
                            18
                          }
                        />
                      }
                      iconClassName="bg-violet-400/10 text-violet-400"
                      label="Hospital / Clínica"
                      action={
                        <ChevronRight
                          size={
                            17
                          }
                          className="text-ink-faint"
                        />
                      }
                    >
                      <button
                        type="button"
                        onClick={
                          () => {
                            trigger(
                              "vibrate"
                            );

                            router.push(
                              `/saude/hospitais/detalhes?id=${hospital.id}`
                            );
                          }
                        }
                        className="max-w-full truncate text-left text-sm font-semibold text-ink-primary transition-colors hover:text-violet-400"
                      >
                        {
                          hospital.nome
                        }
                      </button>
                    </DetailInfoRow>
                  )
                )}

                {linkedLocais.map(
                  (
                    local
                  ) => (
                    <DetailInfoRow
                      key={
                        local.id
                      }
                      icon={
                        <MapPin
                          size={
                            18
                          }
                        />
                      }
                      iconClassName="bg-emerald-400/10 text-emerald-400"
                      label="Local de Saúde"
                      action={
                        <ChevronRight
                          size={
                            17
                          }
                          className="text-ink-faint"
                        />
                      }
                    >
                      <button
                        type="button"
                        onClick={
                          () => {
                            trigger(
                              "vibrate"
                            );

                            router.push(
                              `/saude/locais/detalhes?id=${local.id}`
                            );
                          }
                        }
                        className="max-w-full truncate text-left text-sm font-semibold text-ink-primary transition-colors hover:text-emerald-400"
                      >
                        {
                          local.nome
                        }
                      </button>
                    </DetailInfoRow>
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              ÚLTIMAS AQUISIÇÕES
              ================================================== */}

          {linkedRenovacoes.length >
            0 && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.05,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <Clock
                    size={
                      15
                    }
                  />
                }
                title="Últimas Aquisições"
                action={
                  linkedRenovacoes.length >
                  5 ? (
                    <span className="text-[10px] font-medium text-ink-faint">
                      {
                        linkedRenovacoes.length
                      }{" "}
                      registros
                    </span>
                  ) : undefined
                }
              />

              <div className="space-y-2">
                {linkedRenovacoes
                  .slice(
                    0,
                    5
                  )
                  .map(
                    (
                      renovacao
                    ) => {
                      const medicamento =
                        linkedMedicamentos.find(
                          (
                            item
                          ) =>
                            item.id ===
                            renovacao.medicamento_id
                        );

                      return (
                        <button
                          key={
                            renovacao.id
                          }
                          type="button"
                          onClick={
                            () => {
                              if (
                                !renovacao.id
                              ) {
                                return;
                              }

                              trigger(
                                "vibrate"
                              );

                              router.push(
                                `/saude/renovacao/detalhes?id=${renovacao.id}`
                              );
                            }
                          }
                          className="w-full text-left transition-transform active:scale-[0.99]"
                        >
                          <DetailInfoRow
                            icon={
                              <ShoppingCart
                                size={
                                  17
                                }
                              />
                            }
                            iconClassName="bg-emerald-400/10 text-emerald-400"
                            label={
                              formatDateDisplay(
                                renovacao.data
                              )
                            }
                            action={
                              <ChevronRight
                                size={
                                  16
                                }
                                className="text-ink-faint"
                              />
                            }
                          >
                            <div className="flex min-w-0 items-center justify-between gap-3">
                              <p className="min-w-0 truncate text-sm font-semibold text-ink-primary">
                                {medicamento?.nome ||
                                  "Medicamento"}
                              </p>

                              {getPrecoSeguro(
                                renovacao.preco
                              ) >
                                0 && (
                                <span className="shrink-0 text-sm font-semibold text-emerald-400">
                                  {formatCurrency(
                                    renovacao.preco as number
                                  )}
                                </span>
                              )}
                            </div>
                          </DetailInfoRow>
                        </button>
                      );
                    }
                  )}
              </div>

              {linkedRenovacoes.length >
                5 && (
                <p className="pt-1 text-center text-[10px] text-ink-muted">
                  E mais{" "}
                  {linkedRenovacoes.length -
                    5}{" "}
                  aquisição(ões).
                </p>
              )}
            </motion.div>
          )}

          {/* ==================================================
              MEDICAMENTOS EM USO
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
                <Pill
                  size={
                    15
                  }
                />
              }
              title="Medicamentos em Uso"
              action={
                medicamentosAtivos.length >
                0 ? (
                  <span className="text-[10px] font-medium text-ink-faint">
                    {
                      medicamentosAtivos.length
                    }{" "}
                    ativo
                    {medicamentosAtivos.length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                ) : undefined
              }
            />

            {medicamentosAtivos.length ===
            0 ? (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface-raised/50 p-6 text-center">
                <p className="text-sm text-ink-muted">
                  Nenhum medicamento ativo vinculado a este tratamento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {medicamentosAtivos.map(
                  (
                    medicamento
                  ) => (
                    <button
                      key={
                        medicamento.id
                      }
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/medicamentos/detalhes?id=${medicamento.id}`
                          );
                        }
                      }
                      className="group relative w-full cursor-pointer rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all hover:border-ice/30 active:scale-[0.98]"
                      style={{
                        borderLeft:
                          `4px solid ${theme.hex}`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ice/10 bg-ice/10 text-ice">
                            <Pill
                              size={
                                18
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate text-[15px] font-semibold text-ink-primary">
                                {
                                  medicamento.nome
                                }
                              </p>

                              {medicamento.receitaVencida && (
                                <span className="shrink-0 rounded-full bg-coral/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-coral">
                                  Receita vencida
                                </span>
                              )}

                              {!medicamento.receitaVencida &&
                                medicamento.insight
                                  ?.deveRenovar && (
                                  <span className="shrink-0 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400">
                                    Renovar
                                  </span>
                                )}
                            </div>

                            <p className="mt-0.5 truncate text-xs text-ink-muted">
                              {
                                medicamento.dosagem
                              }

                              {medicamento.medico
                                ? ` • Dr(a). ${medicamento.medico}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <ChevronRight
                          size={
                            18
                          }
                          className="shrink-0 text-ink-faint transition-colors group-hover:text-ice"
                        />
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              HISTÓRICO DESCONTINUADOS
              ================================================== */}

          {medicamentosDescontinuados.length >
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
                title="Histórico de Medicamentos"
                action={
                  <span className="text-[10px] font-medium text-coral">
                    {
                      medicamentosDescontinuados.length
                    }{" "}
                    descontinuado
                    {medicamentosDescontinuados.length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                }
              />

              <div className="ml-3 space-y-3 border-l-2 border-surface-border/50 pl-4">
                {medicamentosDescontinuados.map(
                  (
                    medicamento
                  ) => (
                    <button
                      key={
                        medicamento.id
                      }
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/medicamentos/detalhes?id=${medicamento.id}`
                          );
                        }
                      }
                      className="relative w-full cursor-pointer rounded-2xl border border-coral/10 bg-surface-raised/60 p-3.5 text-left transition-all active:scale-[0.98]"
                    >
                      <div className="absolute -left-[23px] top-4 h-2.5 w-2.5 rounded-full border-2 border-void bg-coral ring-1 ring-surface-border/50" />

                      <div className="mb-1 flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm font-semibold text-ink-primary opacity-70">
                          {
                            medicamento.nome
                          }{" "}
                          {
                            medicamento.dosagem
                          }
                        </p>

                        <span className="shrink-0 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold text-coral">
                          DESCONTINUADO
                        </span>
                      </div>

                      {medicamento.motivo_descontinuacao && (
                        <p className="mb-2 text-xs italic text-ink-muted">
                          {
                            medicamento.motivo_descontinuacao
                          }
                        </p>
                      )}

                      {medicamento.substituido_por_id && (
                        <div className="mt-2 flex w-fit items-center gap-1.5 rounded-md border border-ice/10 bg-ice/10 px-2 py-1 text-[11px] font-medium text-ice">
                          <ArrowLeftRight
                            size={
                              10
                            }
                          />

                          Possui medicamento substituto registrado
                        </div>
                      )}
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              DOCUMENTOS
              ================================================== */}

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
              title="Receitas e Laudos"
              action={
                linkedDocuments.length >
                0 ? (
                  <span className="text-[10px] font-medium text-ink-faint">
                    {
                      linkedDocuments.length
                    }{" "}
                    documento
                    {linkedDocuments.length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                ) : undefined
              }
            />

            {linkedDocuments.length ===
            0 ? (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface-raised/50 p-6 text-center">
                <p className="text-sm text-ink-muted">
                  Nenhum documento ou laudo vinculado a este tratamento.
                </p>
              </div>
            ) : (
              <motion.div
                variants={
                  listVariants
                }
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {linkedDocuments.map(
                  (
                    document
                  ) => (
                    <motion.div
                      key={
                        document.id
                      }
                      variants={
                        cardVariants
                      }
                    >
                      <DocumentCard
                        document={
                          document
                        }
                        onFavoriteToggle={
                          handleFavoriteToggle
                        }
                      />
                    </motion.div>
                  )
                )}
              </motion.div>
            )}
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function TratamentoPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <TratamentoContent />
    </Suspense>
  );
}