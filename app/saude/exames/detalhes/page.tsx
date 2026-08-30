// app/saude/exames/detalhes/page.tsx
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
  AnimatePresence,
} from "framer-motion";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Edit3,
  ExternalLink,
  FileText,
  FlaskConical,
  History,
  Stethoscope,
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
  deleteFile,
} from "@/lib/supabase/storage";
import {
  getClinicalTheme,
  getDaysUntil,
} from "@/lib/health-utils";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";
import {
  useExames,
} from "@/hooks/useExames";
import {
  useLocais,
} from "@/hooks/useLocais";
import {
  useMedicos,
} from "@/hooks/useMedicos";
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
  SelectionModal,
} from "@/components/SelectionModal";
import {
  Button,
} from "@/components/ui/Button";
import {
  useToast,
} from "@/components/ToastProvider";
import {
  SectionTitle,
  DetailInfoRow,
} from "@/components/detail/DetailComponents";

import type {
  Cid,
  Exame,
  LocalSaude,
  Medico,
  Tratamento,
} from "@/lib/types";

// ============================================================
// HELPERS
// ============================================================

function formatDate(
  isoStr?: string
): string {
  if (!isoStr) {
    return "—";
  }

  const datePart =
    isoStr.includes("T")
      ? isoStr.split("T")[0]
      : isoStr;

  const parts =
    datePart.split("-");

  if (
    parts.length === 3
  ) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return isoStr;
}

function normalizeName(
  value?: string
): string {
  return (
    value
      ?.trim()
      .toLocaleLowerCase(
        "pt-BR"
      ) || ""
  );
}

/**
 * Somente URLs do bucket oficial de anexos do Vault
 * podem ser enviadas para deleteFile().
 *
 * anexo_url também aceita links externos, que obviamente
 * não devem ser tratados como arquivos pertencentes ao Vault.
 */
function isVaultStorageUrl(
  url?: string
): boolean {
  return Boolean(
    url &&
      url.includes(
        "/storage/v1/object/public/vault-attachments/"
      )
  );
}

// ============================================================
// CONTENT
// ============================================================

function DetalhesExameContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get(
      "id"
    );

  const mounted =
    useMounted();

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
    getExame,
    updateExame,
    deleteExame,
  } =
    useExames();

  /*
   * Médicos e Locais são entidades globais por conta.
   *
   * Usamos diretamente os hooks oficiais. Não criamos uma
   * segunda leitura do Dexie aqui para evitar duas fontes
   * concorrentes e, principalmente, declarações duplicadas
   * de `medicos` e `locais`.
   */
  const {
    medicos,
    addMedico,
  } =
    useMedicos();

  const {
    locais,
    addLocal,
  } =
    useLocais();

  const deleteAction =
    useSubmitAction();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    exame,
    setExame,
  ] =
    useState<Exame | null>(
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

  const [
    isMedicoModalOpen,
    setIsMedicoModalOpen,
  ] =
    useState(false);

  const [
    isLocalModalOpen,
    setIsLocalModalOpen,
  ] =
    useState(false);

  const [
    isCreatingMedico,
    setIsCreatingMedico,
  ] =
    useState(false);

  const [
    newMedicoNome,
    setNewMedicoNome,
  ] =
    useState("");

  const [
    newMedicoEspecialidade,
    setNewMedicoEspecialidade,
  ] =
    useState("");

  const [
    isCreatingLocal,
    setIsCreatingLocal,
  ] =
    useState(false);

  const [
    newLocalNome,
    setNewLocalNome,
  ] =
    useState("");

  // ==========================================================
  // ACTIVE PERSON
  // ==========================================================

  const person =
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
  // PERSON-OWNED RELATIONS
  // ==========================================================

  const tratamentos =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.tratamentos
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
    ) || [];

  const cids =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.cids
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
    ) || [];

  // ==========================================================
  // LOAD EXAME
  // ==========================================================

  useEffect(() => {
    if (!id) {
      router.replace(
        "/saude/exames"
      );

      return;
    }

    if (
      !activePersonId
    ) {
      setExame(
        null
      );

      setIsLoading(
        false
      );

      return;
    }

    let cancelled =
      false;

    const loadExame =
      async () => {
        setIsLoading(
          true
        );

        try {
          const data =
            await getExame(
              id
            );

          if (
            cancelled
          ) {
            return;
          }

          if (!data) {
            showToast(
              "Exame não encontrado para a pessoa ativa.",
              "error"
            );

            router.replace(
              "/saude/exames"
            );

            return;
          }

          setExame(
            data
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao carregar exame:",
            error
          );

          if (
            !cancelled
          ) {
            showToast(
              "Não foi possível carregar o exame.",
              "error"
            );

            router.replace(
              "/saude/exames"
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

    void loadExame();

    return () => {
      cancelled =
        true;
    };
  }, [
    id,
    activePersonId,
    getExame,
    router,
    showToast,
  ]);

  // ==========================================================
  // DIRECT GLOBAL RELATIONS
  // ==========================================================

  const medico =
    useMemo(
      () => {
        if (
          !exame?.medico_id
        ) {
          return undefined;
        }

        return medicos.find(
          (
            item
          ) =>
            item.id ===
            exame.medico_id
        );
      },
      [
        exame?.medico_id,
        medicos,
      ]
    );

  const local =
    useMemo(
      () => {
        if (
          !exame?.local_id
        ) {
          return undefined;
        }

        return locais.find(
          (
            item
          ) =>
            item.id ===
            exame.local_id
        );
      },
      [
        exame?.local_id,
        locais,
      ]
    );

  // ==========================================================
  // SAFE RELATIONS
  // ==========================================================

  const tratamentoIds =
    useMemo(
      () =>
        new Set(
          exame?.tratamento_ids ||
            []
        ),
      [
        exame?.tratamento_ids,
      ]
    );

  const cidIds =
    useMemo(
      () =>
        new Set(
          exame?.cid_ids ||
            []
        ),
      [
        exame?.cid_ids,
      ]
    );

  const tratamentosRelacionados =
    useMemo<
      Tratamento[]
    >(() => {
      if (
        !exame ||
        !activePersonId
      ) {
        return [];
      }

      return tratamentos.filter(
        (
          tratamento
        ) =>
          Boolean(
            tratamento.id &&
              tratamentoIds.has(
                tratamento.id
              )
          )
      );
    }, [
      exame,
      activePersonId,
      tratamentos,
      tratamentoIds,
    ]);

  const cidsRelacionados =
    useMemo<
      Cid[]
    >(() => {
      if (
        !exame ||
        !activePersonId
      ) {
        return [];
      }

      return cids.filter(
        (
          cid
        ) =>
          Boolean(
            cid.id &&
              cidIds.has(
                cid.id
              )
          )
      );
    }, [
      exame,
      activePersonId,
      cids,
      cidIds,
    ]);

  // ==========================================================
  // HISTORY
  // ==========================================================

  const historicoExames =
    useLiveQuery(
      async () => {
        if (
          !exame?.nome ||
          !activePersonId
        ) {
          return [];
        }

        const all =
          await db.exames
            .where(
              "person_id"
            )
            .equals(
              activePersonId
            )
            .toArray();

        const normalizedCurrentName =
          normalizeName(
            exame.nome
          );

        return all
          .filter(
            (
              item
            ) =>
              item.id !==
                exame.id &&
              normalizeName(
                item.nome
              ) ===
                normalizedCurrentName
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
      },
      [
        exame?.id,
        exame?.nome,
        activePersonId,
      ],
      []
    ) || [];

  // ==========================================================
  // RETURN DATE
  // ==========================================================

  const diasParaRetorno =
    useMemo(() => {
      if (
        !exame?.data_retorno
      ) {
        return null;
      }

      return getDaysUntil(
        exame.data_retorno
      );
    }, [
      exame?.data_retorno,
    ]);

  const retornoEmAtraso =
    Boolean(
      diasParaRetorno !==
        null &&
        diasParaRetorno <
          0
    );

  const retornoProximo =
    Boolean(
      diasParaRetorno !==
        null &&
        diasParaRetorno >=
          0 &&
        diasParaRetorno <=
          3
    );

  if (
    !mounted ||
    isLoading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (
    !activePersonId ||
    !exame
  ) {
    return null;
  }

  // ==========================================================
  // DERIVED UI
  // ==========================================================

  const exameId =
    exame.id;

  const personName =
    person?.name ||
    "Pessoa ativa";

  const medicoValido =
    Boolean(
      medico?.nome
    );

  const localValido =
    Boolean(
      local?.nome
    );

  const temHorario =
    Boolean(
      exame.horario?.trim()
    );

  const corBorda =
    retornoEmAtraso
      ? "#EF4444"
      : retornoProximo
        ? "#F59E0B"
        : "#10B981";

  // ==========================================================
  // REFRESH
  // ==========================================================

  const refreshExame =
    async () => {
      if (
        !exameId
      ) {
        return;
      }

      const updated =
        await getExame(
          exameId
        );

      if (updated) {
        setExame(
          updated
        );
      }
    };

  // ==========================================================
  // SELECT MEDICO
  // ==========================================================

  const handleSelectMedico =
    async (
      item: Medico
    ) => {
      if (
        !exameId ||
        !item.id
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      try {
        await updateExame(
          exameId,
          {
            medico_id:
              item.id,

            medico:
              item.nome,
          }
        );

        await refreshExame();

        setIsMedicoModalOpen(
          false
        );

        trigger(
          "success"
        );

        showToast(
          "Médico atualizado",
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao atualizar médico:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao atualizar médico",
          "error"
        );
      }
    };

  // ==========================================================
  // CREATE MEDICO
  // ==========================================================

  const handleCreateMedico =
    async () => {
      const nome =
        newMedicoNome.trim();

      if (!nome) {
        showToast(
          "Nome do médico é obrigatório.",
          "error"
        );

        return;
      }

      if (!exameId) {
        return;
      }

      trigger(
        "vibrate"
      );

      try {
        const newId =
          await addMedico(
            {
              nome,

              especialidade:
                newMedicoEspecialidade.trim() ||
                "Geral",
            }
          );

        await updateExame(
          exameId,
          {
            medico_id:
              newId,

            medico:
              nome,
          }
        );

        await refreshExame();

        setIsCreatingMedico(
          false
        );

        setNewMedicoNome(
          ""
        );

        setNewMedicoEspecialidade(
          ""
        );

        trigger(
          "success"
        );

        showToast(
          "Médico cadastrado e vinculado",
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao criar médico:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao cadastrar médico",
          "error"
        );
      }
    };

  // ==========================================================
  // SELECT LOCAL
  // ==========================================================

  const handleSelectLocal =
    async (
      item: LocalSaude
    ) => {
      if (
        !exameId ||
        !item.id
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      try {
        await updateExame(
          exameId,
          {
            local_id:
              item.id,

            laboratorio:
              item.nome,
          }
        );

        await refreshExame();

        setIsLocalModalOpen(
          false
        );

        trigger(
          "success"
        );

        showToast(
          "Local atualizado",
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao atualizar local:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao atualizar local",
          "error"
        );
      }
    };

  // ==========================================================
  // CREATE LOCAL
  // ==========================================================

  const handleCreateLocal =
    async () => {
      const nome =
        newLocalNome.trim();

      if (!nome) {
        showToast(
          "Nome do local é obrigatório.",
          "error"
        );

        return;
      }

      if (!exameId) {
        return;
      }

      trigger(
        "vibrate"
      );

      try {
        const newId =
          await addLocal(
            {
              nome,

              tipo:
                "laboratorio",
            }
          );

        await updateExame(
          exameId,
          {
            local_id:
              newId,

            laboratorio:
              nome,
          }
        );

        await refreshExame();

        setIsCreatingLocal(
          false
        );

        setNewLocalNome(
          ""
        );

        trigger(
          "success"
        );

        showToast(
          "Local cadastrado e vinculado",
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao criar local:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao cadastrar local",
          "error"
        );
      }
    };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    () => {
      if (!exameId) {
        return;
      }

      trigger(
        "vibrate"
      );

      const attachmentUrl =
        exame.anexo_url?.trim();

      deleteAction.run(
        async () => {
          await deleteExame(
            exameId
          );

          /*
           * anexo_url também pode ser um link externo.
           *
           * Apenas arquivos do bucket oficial do Vault são
           * enviados para deleteFile().
           */
          if (
            attachmentUrl &&
            isVaultStorageUrl(
              attachmentUrl
            )
          ) {
            const {
              error,
            } =
              await deleteFile(
                attachmentUrl
              );

            if (error) {
              console.error(
                "Exame excluído, mas o anexo do Vault não pôde ser removido:",
                error
              );

              showToast(
                "Exame excluído, mas o anexo não pôde ser removido.",
                "info"
              );
            }
          }

          router.replace(
            "/saude/exames"
          );
        },
        {
          successMessage:
            "Exame excluído com sucesso",

          errorMessage:
            "Erro ao excluir exame",

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
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">
                  Prontuário
                </p>

                <h1 className="truncate font-display text-lg font-semibold text-ink-primary">
                  {exame.nome}
                </h1>

                <p className="mt-0.5 flex items-center text-xs text-ink-muted">
                  <User
                    size={12}
                    className="mr-1"
                  />

                  {personName}
                </p>
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
                    `/saude/exames/editar?id=${exame.id}`
                  );
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
                aria-label="Editar exame"
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
                aria-label="Excluir exame"
              >
                <Trash2
                  size={16}
                />
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          {exame.data_retorno && (
            <motion.div
              initial={{
                opacity: 0,
                y: -5,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-sm ${
                retornoEmAtraso
                  ? "border-coral/40 bg-coral/10 text-coral"
                  : retornoProximo
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                    : "border-emerald-400/20 bg-emerald-400/8 text-emerald-300"
              }`}
            >
              {retornoEmAtraso ? (
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              ) : retornoProximo ? (
                <CalendarClock
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              ) : (
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider">
                  {retornoEmAtraso
                    ? "Retorno em atraso"
                    : retornoProximo
                      ? "Retorno próximo"
                      : "Retorno programado"}
                </p>

                <p className="mt-0.5 text-xs leading-5 opacity-90">
                  {retornoEmAtraso
                    ? `A previsão de retorno era ${formatDate(
                        exame.data_retorno
                      )}.`
                    : diasParaRetorno ===
                        0
                      ? "O retorno está programado para hoje."
                      : `Retorno previsto para ${formatDate(
                          exame.data_retorno
                        )}.`}
                </p>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4 rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm"
            style={{
              borderLeft:
                `6px solid ${corBorda}`,
            }}
          >
            <div className="flex items-center gap-3.5 border-b border-surface-border/40 pb-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                <FlaskConical
                  size={24}
                />
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-bold text-ink-primary">
                  {exame.nome}
                </h2>

                <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span>
                    Realizado em{" "}
                    {formatDate(
                      exame.data
                    )}
                  </span>

                  {temHorario && (
                    <span className="font-mono text-[10px]">
                      •{" "}
                      {exame.horario}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <DetailInfoRow
              icon={
                <Stethoscope
                  size={18}
                />
              }
              iconClassName="bg-ice/10 text-ice"
              label="Solicitante"
              action={
                !medicoValido &&
                exame.medico ? (
                  <button
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setIsMedicoModalOpen(
                        true
                      );
                    }}
                    className="rounded-full bg-ice/10 px-3 py-1.5 text-xs font-bold text-ice transition-colors hover:bg-ice/20"
                  >
                    Corrigir
                  </button>
                ) : undefined
              }
            >
              {medicoValido ? (
                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    router.push(
                      `/saude/medicos/detalhes?id=${medico!.id}`
                    );
                  }}
                  className="flex max-w-full items-center gap-1 truncate text-sm font-semibold text-ink-primary transition-colors hover:text-ice"
                >
                  <span className="truncate">
                    Dr(a).{" "}
                    {
                      medico!.nome
                    }
                  </span>

                  <ChevronRight
                    size={14}
                    className="shrink-0 text-ink-faint"
                  />
                </button>
              ) : exame.medico ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink-muted">
                    {
                      exame.medico
                    }
                  </p>

                  <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-400">
                    <AlertOctagon
                      size={12}
                    />

                    Vínculo ausente
                  </span>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  Não informado
                </p>
              )}
            </DetailInfoRow>

            <DetailInfoRow
              icon={
                <Building2
                  size={18}
                />
              }
              iconClassName="bg-emerald-400/10 text-emerald-400"
              label="Local / Laboratório"
              action={
                !localValido &&
                exame.laboratorio ? (
                  <button
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setIsLocalModalOpen(
                        true
                      );
                    }}
                    className="rounded-full bg-ice/10 px-3 py-1.5 text-xs font-bold text-ice transition-colors hover:bg-ice/20"
                  >
                    Corrigir
                  </button>
                ) : undefined
              }
            >
              {localValido ? (
                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    router.push(
                      `/saude/locais/detalhes?id=${local!.id}`
                    );
                  }}
                  className="flex max-w-full items-center gap-1 truncate text-sm font-semibold text-ink-primary transition-colors hover:text-ice"
                >
                  <span className="truncate">
                    {
                      local!.nome
                    }
                  </span>

                  <ChevronRight
                    size={14}
                    className="shrink-0 text-ink-faint"
                  />
                </button>
              ) : exame.laboratorio ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink-muted">
                    {
                      exame.laboratorio
                    }
                  </p>

                  <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-400">
                    <AlertOctagon
                      size={12}
                    />

                    Vínculo ausente
                  </span>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  Não informado
                </p>
              )}
            </DetailInfoRow>

            <div className="pt-2">
              <SectionTitle
                icon={
                  <Activity
                    size={15}
                  />
                }
                title={`Tratamentos Relacionados (${tratamentosRelacionados.length})`}
              />

              {tratamentosRelacionados.length >
              0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tratamentosRelacionados.map(
                    (
                      tratamento
                    ) => {
                      const theme =
                        getClinicalTheme(
                          tratamento.nome
                        );

                      const Icon =
                        theme.icon;

                      return (
                        <button
                          key={
                            tratamento.id
                          }
                          type="button"
                          onClick={() => {
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
                          }}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-opacity hover:opacity-80 ${theme.tagClass}`}
                        >
                          <Icon
                            size={14}
                          />

                          <span className="text-xs font-medium">
                            {
                              tratamento.nome
                            }
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  Nenhum tratamento foi vinculado diretamente a este exame.
                </p>
              )}
            </div>

            <div className="pt-2">
              <SectionTitle
                icon={
                  <Stethoscope
                    size={15}
                  />
                }
                title={`CIDs Relacionados (${cidsRelacionados.length})`}
              />

              {cidsRelacionados.length >
              0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {cidsRelacionados.map(
                    (
                      cid
                    ) => {
                      const theme =
                        getClinicalTheme(
                          cid.descricao ||
                            cid.codigo
                        );

                      const Icon =
                        theme.icon;

                      return (
                        <button
                          key={
                            cid.id
                          }
                          type="button"
                          onClick={() => {
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
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-opacity hover:opacity-80 ${theme.tagClass}`}
                        >
                          <Icon
                            size={14}
                          />

                          <span className="text-xs font-medium">
                            {
                              cid.codigo
                            }
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  Nenhum CID foi vinculado diretamente a este exame.
                </p>
              )}
            </div>

            {exame.motivo && (
              <div className="pt-2">
                <SectionTitle
                  icon={
                    <FileText
                      size={15}
                    />
                  }
                  title="Motivo da Solicitação"
                />

                <p className="mt-2 whitespace-pre-wrap rounded-xl border border-surface-border/40 bg-surface-raised/50 p-3 text-xs leading-5 text-ink-primary">
                  {
                    exame.motivo
                  }
                </p>
              </div>
            )}

            {exame.observacoes && (
              <div className="pt-2">
                <SectionTitle
                  icon={
                    <FileText
                      size={15}
                    />
                  }
                  title="Resultados / Notas"
                />

                <p className="mt-2 whitespace-pre-wrap rounded-xl border border-surface-border/40 bg-surface-raised/50 p-3 text-xs leading-5 text-ink-primary">
                  {
                    exame.observacoes
                  }
                </p>
              </div>
            )}

            {exame.anexo_url && (
              <a
                href={
                  exame.anexo_url
                }
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-between rounded-2xl border border-ice/20 bg-ice/10 p-3.5 text-ice transition-colors hover:bg-ice/20"
              >
                <div className="flex min-w-0 items-center gap-2 text-xs font-semibold">
                  <FileText
                    size={16}
                    className="shrink-0"
                  />

                  <span className="truncate">
                    Ver Anexo / Laudo
                  </span>
                </div>

                <ExternalLink
                  size={14}
                  className="shrink-0"
                />
              </a>
            )}
          </motion.div>

          {historicoExames.length >
            0 && (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.08,
              }}
              className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm"
            >
              <SectionTitle
                icon={
                  <History
                    size={15}
                  />
                }
                title={`Histórico deste Exame (${historicoExames.length})`}
              />

              <p className="text-xs leading-5 text-ink-muted">
                Registros anteriores de{" "}
                <span className="font-medium text-ink-primary">
                  “{exame.nome}”
                </span>{" "}
                para {personName}.
              </p>

              <div className="space-y-2 pt-1">
                {historicoExames.map(
                  (
                    item
                  ) => (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      onClick={() => {
                        if (
                          !item.id
                        ) {
                          return;
                        }

                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/exames/detalhes?id=${item.id}`
                        );
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-border/40 bg-surface-raised/70 p-3 text-left transition-colors hover:bg-surface-raised active:scale-[0.99]"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-primary">
                          {
                            formatDate(
                              item.data
                            )
                          }
                        </p>

                        {item.laboratorio && (
                          <p className="mt-0.5 truncate text-[10px] text-ink-muted">
                            {
                              item.laboratorio
                            }
                          </p>
                        )}

                        {item.medico && (
                          <p className="truncate text-[10px] text-ink-muted">
                            Solicitante:{" "}
                            {
                              item.medico
                            }
                          </p>
                        )}
                      </div>

                      <ChevronRight
                        size={15}
                        className="shrink-0 text-ice"
                      />
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}
        </section>

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
          title="Excluir Exame"
          message={`Tem certeza que deseja excluir "${exame.nome}"? Tratamentos e CIDs relacionados não serão excluídos.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={
            deleteAction.isSubmitting
          }
          type="danger"
        />

        <SelectionModal<Medico>
          isOpen={
            isMedicoModalOpen
          }
          onClose={() =>
            setIsMedicoModalOpen(
              false
            )
          }
          onSelect={
            handleSelectMedico
          }
          items={
            medicos
          }
          title="Selecionar Médico"
          placeholder="Buscar médico..."
          renderItem={(
            item
          ) => (
            <div>
              <p className="font-medium text-ink-primary">
                Dr(a).{" "}
                {
                  item.nome
                }
              </p>

              {item.especialidade && (
                <p className="text-xs text-ink-muted">
                  {
                    item.especialidade
                  }
                </p>
              )}
            </div>
          )}
          getItemId={(
            item
          ) =>
            item.id!
          }
          getItemLabel={(
            item
          ) =>
            item.nome
          }
          onCreateNew={() => {
            setIsMedicoModalOpen(
              false
            );

            setIsCreatingMedico(
              true
            );
          }}
          createNewLabel="Cadastrar Novo Médico"
        />

        <SelectionModal<LocalSaude>
          isOpen={
            isLocalModalOpen
          }
          onClose={() =>
            setIsLocalModalOpen(
              false
            )
          }
          onSelect={
            handleSelectLocal
          }
          items={
            locais
          }
          title="Selecionar Local / Laboratório"
          placeholder="Buscar local..."
          renderItem={(
            item
          ) => (
            <div>
              <p className="font-medium text-ink-primary">
                {
                  item.nome
                }
              </p>

              {item.endereco && (
                <p className="text-xs text-ink-muted">
                  {
                    item.endereco
                  }
                </p>
              )}
            </div>
          )}
          getItemId={(
            item
          ) =>
            item.id!
          }
          getItemLabel={(
            item
          ) =>
            item.nome
          }
          onCreateNew={() => {
            setIsLocalModalOpen(
              false
            );

            setIsCreatingLocal(
              true
            );
          }}
          createNewLabel="Cadastrar Novo Local"
        />

        <AnimatePresence>
          {isCreatingMedico && (
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
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center"
            >
              <motion.div
                initial={{
                  y: "100%",
                }}
                animate={{
                  y: 0,
                }}
                exit={{
                  y: "100%",
                }}
                transition={{
                  type:
                    "spring",
                  damping: 25,
                  stiffness: 200,
                }}
                className="w-full max-w-md rounded-t-[32px] bg-surface p-6 shadow-vault sm:rounded-[32px]"
              >
                <h3 className="mb-4 font-display text-lg font-bold text-ink-primary">
                  Novo Médico
                </h3>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nome do médico"
                    value={
                      newMedicoNome
                    }
                    onChange={(
                      event
                    ) =>
                      setNewMedicoNome(
                        event.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice"
                  />

                  <input
                    type="text"
                    placeholder="Especialidade"
                    value={
                      newMedicoEspecialidade
                    }
                    onChange={(
                      event
                    ) =>
                      setNewMedicoEspecialidade(
                        event.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice"
                  />

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => {
                        setIsCreatingMedico(
                          false
                        );

                        setNewMedicoNome(
                          ""
                        );

                        setNewMedicoEspecialidade(
                          ""
                        );
                      }}
                    >
                      Cancelar
                    </Button>

                    <Button
                      variant="primary"
                      fullWidth
                      onClick={
                        handleCreateMedico
                      }
                      disabled={
                        !newMedicoNome.trim()
                      }
                    >
                      Salvar e Vincular
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCreatingLocal && (
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
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center"
            >
              <motion.div
                initial={{
                  y: "100%",
                }}
                animate={{
                  y: 0,
                }}
                exit={{
                  y: "100%",
                }}
                transition={{
                  type:
                    "spring",
                  damping: 25,
                  stiffness: 200,
                }}
                className="w-full max-w-md rounded-t-[32px] bg-surface p-6 shadow-vault sm:rounded-[32px]"
              >
                <h3 className="mb-4 font-display text-lg font-bold text-ink-primary">
                  Novo Local / Laboratório
                </h3>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nome do local"
                    value={
                      newLocalNome
                    }
                    onChange={(
                      event
                    ) =>
                      setNewLocalNome(
                        event.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice"
                  />

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => {
                        setIsCreatingLocal(
                          false
                        );

                        setNewLocalNome(
                          ""
                        );
                      }}
                    >
                      Cancelar
                    </Button>

                    <Button
                      variant="primary"
                      fullWidth
                      onClick={
                        handleCreateLocal
                      }
                      disabled={
                        !newLocalNome.trim()
                      }
                    >
                      Salvar e Vincular
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function DetalhesExamePage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <DetalhesExameContent />
    </Suspense>
  );
}