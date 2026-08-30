// app/saude/farmacias/editar/page.tsx
"use client";

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
  motion,
} from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Loader2,
  Pill,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

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
  useSubmitAction,
} from "@/hooks/useSubmitAction";

import {
  Button,
} from "@/components/ui/Button";
import {
  Input,
} from "@/components/ui/Input";
import {
  TextArea,
} from "@/components/ui/TextArea";
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

import type {
  Medicamento,
  Renovacao,
} from "@/lib/types";

// ============================================================
// ANIMATION
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

function formatPhone(
  value: string
): string {
  const clean =
    value
      .replace(/\D/g, "")
      .slice(0, 11);

  if (
    clean.length <= 2
  ) {
    return clean;
  }

  if (
    clean.length <= 6
  ) {
    return `(${clean.slice(
      0,
      2
    )}) ${clean.slice(2)}`;
  }

  if (
    clean.length <= 10
  ) {
    return `(${clean.slice(
      0,
      2
    )}) ${clean.slice(
      2,
      6
    )}-${clean.slice(6)}`;
  }

  return `(${clean.slice(
    0,
    2
  )}) ${clean.slice(
    2,
    7
  )}-${clean.slice(7)}`;
}

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

// ============================================================
// CONTENT
// ============================================================

function EditarFarmaciaContent() {
  const {
    trigger,
  } =
    useHapticFeedback();

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get("id") ||
    "";

  const {
    getFarmacia,
    updateFarmacia,
    deleteFarmaciaSafe,
  } =
    useFarmacias();

  /*
   * Estes dois hooks são person-scoped.
   *
   * Isso é intencional:
   * a Farmácia é global, mas o painel abaixo mostra apenas
   * medicamentos/renovações da pessoa ativa.
   */
  const {
    medicamentos = [],
    updateMedicamento,
  } =
    useMedicamentos();

  const {
    renovacoes = [],
  } =
    useRenovacoes();

  const {
    run,
    isSubmitting,
  } =
    useSubmitAction();

  const linkAction =
    useSubmitAction();

  const deleteAction =
    useSubmitAction();

  const isSubmitLocked =
    useRef(false);

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    notFound,
    setNotFound,
  ] =
    useState(false);

  const [
    nome,
    setNome,
  ] =
    useState("");

  const [
    endereco,
    setEndereco,
  ] =
    useState("");

  const [
    telefone,
    setTelefone,
  ] =
    useState("");

  const [
    observacoes,
    setObservacoes,
  ] =
    useState("");

  const [
    errors,
    setErrors,
  ] =
    useState<
      Record<string, string>
    >({});

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] =
    useState(false);

  const [
    isMedModalOpen,
    setIsMedModalOpen,
  ] =
    useState(false);

  // ==========================================================
  // LOAD FARMACIA
  // ==========================================================

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    let cancelled =
      false;

    const load =
      async () => {
        setIsLoading(true);

        try {
          /*
           * Farmácia é global.
           * Não existe validação por activePersonId aqui.
           */
          const item =
            await getFarmacia(
              id
            );

          if (cancelled) {
            return;
          }

          if (!item) {
            setNotFound(true);
            return;
          }

          setNome(
            item.nome ||
              ""
          );

          setEndereco(
            item.endereco ||
              ""
          );

          setTelefone(
            item.telefone ||
              ""
          );

          setObservacoes(
            item.observacoes ||
              ""
          );
        } catch (error) {
          console.error(
            "Erro ao carregar farmácia:",
            error
          );

          if (!cancelled) {
            setNotFound(true);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
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
  ]);

  // ==========================================================
  // PERSON-SCOPED CONTEXT
  // ==========================================================

  const medicamentosVinculados =
    useMemo(() => {
      if (
        !id ||
        !medicamentos.length
      ) {
        return [];
      }

      return medicamentos.filter(
        (
          medicamento:
            Medicamento
        ) =>
          medicamento.farmacia_id ===
          id
      );
    }, [
      medicamentos,
      id,
    ]);

  const renovacoesVinculadas =
    useMemo(() => {
      if (
        !id ||
        !renovacoes.length
      ) {
        return [];
      }

      return renovacoes
        .filter(
          (
            renovacao:
              Renovacao
          ) =>
            renovacao.farmacia_id ===
            id
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
    }, [
      renovacoes,
      id,
    ]);

  const medicamentosDisponiveis =
    useMemo(() => {
      if (!id) {
        return [];
      }

      /*
       * Lista já pertence à pessoa ativa.
       * Excluímos apenas os já vinculados a ESTA farmácia.
       *
       * Medicamentos vinculados a outra farmácia continuam
       * aparecendo porque selecionar esta Farmácia representa
       * uma transferência explícita do vínculo.
       */
      return medicamentos.filter(
        (
          medicamento
        ) =>
          medicamento.farmacia_id !==
          id
      );
    }, [
      medicamentos,
      id,
    ]);

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const clearError =
    (
      key: string
    ) => {
      setErrors(
        (
          previous
        ) => {
          if (
            !previous[key]
          ) {
            return previous;
          }

          const next = {
            ...previous,
          };

          delete next[key];

          return next;
        }
      );
    };

  const validate =
    () => {
      const newErrors:
        Record<string, string> =
        {};

      if (!nome.trim()) {
        newErrors.nome =
          "Nome é obrigatório";
      }

      setErrors(
        newErrors
      );

      return (
        Object.keys(
          newErrors
        ).length ===
        0
      );
    };

  // ==========================================================
  // LINK MEDICAMENTO
  // ==========================================================

  const handleVincularMedicamento =
    async (
      medicamento:
        Medicamento
    ) => {
      if (
        !medicamento.id ||
        !id
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      await linkAction.run(
        async () => {
          /*
           * O medicamento veio de useMedicamentos(), portanto
           * pertence à pessoa ativa.
           *
           * Alteramos apenas farmacia_id.
           * person_id permanece intocado.
           */
          await updateMedicamento(
            medicamento.id!,
            {
              farmacia_id:
                id,
            }
          );

          setIsMedModalOpen(
            false
          );
        },
        {
          successMessage:
            "Medicamento vinculado à farmácia",

          errorMessage:
            "Erro ao vincular medicamento",

          goBackOnSuccess:
            false,
        }
      );
    };

  // ==========================================================
  // UNLINK MEDICAMENTO
  // ==========================================================

  const handleDesvincularMedicamento =
    async (
      medicamento:
        Medicamento,
      event:
        React.MouseEvent<HTMLButtonElement>
    ) => {
      event.stopPropagation();

      if (
        !medicamento.id
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      await linkAction.run(
        async () => {
          await updateMedicamento(
            medicamento.id!,
            {
              farmacia_id:
                undefined,
            }
          );
        },
        {
          successMessage:
            "Medicamento desvinculado",

          errorMessage:
            "Erro ao desvincular medicamento",

          goBackOnSuccess:
            false,
        }
      );
    };

  // ==========================================================
  // SAVE
  // ==========================================================

  const handleSubmit =
    async () => {
      trigger(
        "vibrate"
      );

      if (!validate()) {
        trigger(
          "error"
        );

        return;
      }

      if (
        !id ||
        isSubmitLocked.current ||
        isSubmitting
      ) {
        return;
      }

      isSubmitLocked.current =
        true;

      try {
        await run(
          async () => {
            /*
             * Sem person_id.
             * Farmácia continua global.
             */
            await updateFarmacia(
              id,
              {
                nome:
                  nome.trim(),

                endereco:
                  endereco.trim() ||
                  undefined,

                telefone:
                  telefone.trim() ||
                  undefined,

                observacoes:
                  observacoes.trim() ||
                  undefined,
              }
            );
          },
          {
            successMessage:
              "Farmácia atualizada com sucesso",

            errorMessage:
              "Erro ao atualizar farmácia",

            goBackOnSuccess:
              false,
          }
        );

        router.replace(
          `/saude/farmacias/detalhes?id=${id}`
        );
      } finally {
        isSubmitLocked.current =
          false;
      }
    };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    () => {
      if (!id) {
        return;
      }

      trigger(
        "vibrate"
      );

      deleteAction.run(
        async () => {
          /*
           * IMPORTANTE:
           *
           * deleteFarmaciaSafe faz cleanup GLOBAL.
           *
           * Ele remove farmacia_id de medicamentos e renovações
           * de todas as pessoas que apontem para esta Farmácia.
           *
           * Os registros clínicos NÃO são excluídos.
           */
          await deleteFarmaciaSafe(
            id
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

      setShowDeleteModal(
        false
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (isLoading) {
    return (
      <DetailSkeleton />
    );
  }

  if (notFound) {
    return (
      <PageTransition>
        <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-void px-6 text-center">
          <Building2
            size={28}
            className="mb-4 text-amber-400"
          />

          <p className="font-display text-lg font-semibold text-ink-primary">
            Farmácia não encontrada
          </p>

          <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
            Este cadastro pode ter sido removido ou não está mais disponível.
          </p>

          <button
            type="button"
            onClick={() =>
              router.replace(
                "/saude/farmacias"
              )
            }
            className="mt-5 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
          >
            Voltar para farmácias
          </button>
        </main>
      </PageTransition>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(10rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Building2
                  size={16}
                  className="text-amber-400"
                />

                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-400">
                  Hub de Farmácia
                </p>
              </div>

              <h1 className="mt-1 truncate font-display text-xl font-semibold text-ink-primary">
                {nome ||
                  "Editar farmácia"}
              </h1>
            </div>

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
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
              aria-label="Excluir farmácia"
            >
              <Trash2
                size={16}
              />
            </button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          {/* ==================================================
              FARMACIA
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Informações do Local
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-ink-faint">
                Este cadastro é global no Vault. Alterações aqui afetam a mesma farmácia usada pelos registros de todas as pessoas.
              </p>
            </div>

            <Input
              label="Nome *"
              placeholder="Ex: Farmácia Popular..."
              value={
                nome
              }
              onChange={(
                event
              ) => {
                setNome(
                  event.target.value
                );

                clearError(
                  "nome"
                );
              }}
              error={
                errors.nome
              }
              required
            />

            <Input
              label="Endereço"
              placeholder="Rua, número, bairro"
              value={
                endereco
              }
              onChange={(
                event
              ) =>
                setEndereco(
                  event.target.value
                )
              }
            />

            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={
                telefone
              }
              onChange={(
                event
              ) =>
                setTelefone(
                  formatPhone(
                    event
                      .target
                      .value
                  )
                )
              }
            />

            <TextArea
              label="Observações"
              placeholder="Horário de funcionamento, unidade, detalhes..."
              value={
                observacoes
              }
              onChange={(
                event
              ) =>
                setObservacoes(
                  event.target.value
                )
              }
            />
          </motion.div>

          {/* ==================================================
              MEDICAMENTOS DA PESSOA ATIVA
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay: 0.08,
            }}
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <Pill
                    size={14}
                    className="text-amber-400"
                  />

                  Medicamentos vinculados (
                  {
                    medicamentosVinculados.length
                  }
                  )
                </h2>

                <p className="mt-1 text-[10px] leading-4 text-ink-faint">
                  Exibindo apenas medicamentos da pessoa ativa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsMedModalOpen(
                    true
                  );
                }}
                className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold text-amber-400 transition-all active:scale-95"
                aria-label="Vincular medicamento"
              >
                <Plus
                  size={12}
                />

                Vincular
              </button>
            </div>

            {medicamentosVinculados.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum medicamento da pessoa ativa está vinculado a esta farmácia.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicamentosVinculados.map(
                  (
                    medicamento:
                      Medicamento
                  ) => (
                    <div
                      key={
                        medicamento.id
                      }
                      role="button"
                      tabIndex={
                        0
                      }
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
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                            "Enter" &&
                          medicamento.id
                        ) {
                          router.push(
                            `/saude/medicamentos/detalhes?id=${medicamento.id}`
                          );
                        }
                      }}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 transition-all active:scale-[0.98]"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                          <Pill
                            size={14}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink-primary">
                            {
                              medicamento.nome
                            }
                          </p>

                          <p className="text-[10px] text-ink-muted">
                            {medicamento.dosagem ||
                              "Uso contínuo"}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <ExternalLink
                          size={14}
                          className="text-ink-faint"
                        />

                        <button
                          type="button"
                          onClick={(
                            event
                          ) =>
                            handleDesvincularMedicamento(
                              medicamento,
                              event
                            )
                          }
                          disabled={
                            linkAction.isSubmitting
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-border/50 text-ink-muted transition-colors hover:bg-coral/20 hover:text-coral disabled:opacity-50"
                          aria-label={`Desvincular ${medicamento.nome}`}
                        >
                          <X
                            size={14}
                          />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              HISTORY
              ================================================== */}

          {renovacoesVinculadas.length >
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
              className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <div className="px-1">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <Calendar
                    size={14}
                    className="text-emerald-400"
                  />

                  Histórico de compras
                </h2>

                <p className="mt-1 text-[10px] text-ink-faint">
                  Renovações da pessoa ativa realizadas nesta farmácia.
                </p>
              </div>

              <div className="space-y-2">
                {renovacoesVinculadas
                  .slice(
                    0,
                    5
                  )
                  .map(
                    (
                      renovacao:
                        Renovacao
                    ) => {
                      const medicamento =
                        medicamentos.find(
                          (
                            item
                          ) =>
                            item.id ===
                            renovacao.medicamento_id
                        );

                      return (
                        <div
                          key={
                            renovacao.id
                          }
                          className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                              <Calendar
                                size={14}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-ink-primary">
                                {medicamento?.nome ||
                                  "Medicamento"}
                              </p>

                              <p className="text-[10px] text-ink-muted">
                                {formatDateDisplay(
                                  renovacao.data
                                )}
                              </p>
                            </div>
                          </div>

                          {typeof renovacao.preco ===
                            "number" &&
                            renovacao.preco >
                              0 && (
                              <span className="shrink-0 text-xs font-semibold text-emerald-400">
                                {formatCurrency(
                                  renovacao.preco
                                )}
                              </span>
                            )}
                        </div>
                      );
                    }
                  )}
              </div>
            </motion.div>
          )}
        </section>

        {/* ====================================================
            SAVE
            ==================================================== */}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={
              handleSubmit
            }
            disabled={
              isSubmitting ||
              linkAction.isSubmitting ||
              deleteAction.isSubmitting
            }
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {isSubmitting ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />

                Salvando...
              </>
            ) : (
              <>
                <Save
                  size={16}
                />

                Salvar alterações
              </>
            )}
          </Button>
        </div>

        {/* ====================================================
            MEDICAMENTO SELECTION
            ==================================================== */}

        <SelectionModal<Medicamento>
          isOpen={
            isMedModalOpen
          }
          onClose={() =>
            setIsMedModalOpen(
              false
            )
          }
          onSelect={
            handleVincularMedicamento
          }
          items={
            medicamentosDisponiveis
          }
          title="Vincular Medicamento"
          placeholder="Buscar medicamento..."
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
          renderItem={(
            item
          ) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
                <Pill
                  size={16}
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-primary">
                  {
                    item.nome
                  }
                </p>

                <p className="text-[10px] text-ink-muted">
                  {item.dosagem ||
                    "Uso contínuo"}
                </p>

                {item.farmacia_id &&
                  item.farmacia_id !==
                    id && (
                    <p className="mt-0.5 text-[9px] font-medium text-amber-400">
                      Já vinculado a outra farmácia
                    </p>
                  )}
              </div>
            </div>
          )}
          onCreateNew={() => {
            setIsMedModalOpen(
              false
            );

            router.push(
              "/saude/medicamentos/novo"
            );
          }}
          createNewLabel="Cadastrar Novo Medicamento"
        />

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
          message={`Tem certeza que deseja excluir "${nome}"? Como esta farmácia é global, ela será desvinculada dos medicamentos e renovações de todas as pessoas. Esses registros não serão excluídos.`}
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

export default function EditarFarmaciaPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <EditarFarmaciaContent />
    </Suspense>
  );
}