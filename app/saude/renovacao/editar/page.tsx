// app/saude/renovacao/editar/page.tsx
"use client";

import {
  Suspense,
  useEffect,
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
  DollarSign,
  Eraser,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Package,
  Receipt,
  Save,
  Store,
  Stethoscope,
  Trash2,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

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
  getClinicalTheme,
} from "@/lib/health-utils";

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
  TextArea,
} from "@/components/ui/TextArea";

import type {
  Farmacia,
  Hospital,
  LocalSaude,
  Medico,
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

function formatDateToDisplay(
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

function parseDateToISO(
  displayStr: string
): string {
  const clean =
    displayStr.replace(
      /\D/g,
      ""
    );

  if (
    clean.length !==
    8
  ) {
    return "";
  }

  const day =
    Number(
      clean.slice(
        0,
        2
      )
    );

  const month =
    Number(
      clean.slice(
        2,
        4
      )
    );

  const year =
    Number(
      clean.slice(
        4,
        8
      )
    );

  if (
    !Number.isInteger(
      day
    ) ||
    !Number.isInteger(
      month
    ) ||
    !Number.isInteger(
      year
    ) ||
    day < 1 ||
    month < 1 ||
    month > 12
  ) {
    return "";
  }

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !==
      day
  ) {
    return "";
  }

  return `${String(
    year
  ).padStart(
    4,
    "0"
  )}-${String(
    month
  ).padStart(
    2,
    "0"
  )}-${String(
    day
  ).padStart(
    2,
    "0"
  )}`;
}

function handleDateMask(
  value: string
): string {
  const clean =
    value
      .replace(
        /\D/g,
        ""
      )
      .slice(
        0,
        8
      );

  if (
    clean.length >
    4
  ) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(
      2,
      4
    )}/${clean.slice(
      4
    )}`;
  }

  if (
    clean.length >
    2
  ) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(
      2
    )}`;
  }

  return clean;
}

function handleCurrencyMask(
  value: string
): string {
  const clean =
    value.replace(
      /\D/g,
      ""
    );

  if (!clean) {
    return "";
  }

  const numberVal =
    parseInt(
      clean,
      10
    ) /
    100;

  return numberVal.toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  );
}

function parseCurrency(
  value: string
): number | undefined {
  if (
    !value.trim()
  ) {
    return undefined;
  }

  const parsed =
    Number(
      value
        .replace(
          /\./g,
          ""
        )
        .replace(
          ",",
          "."
        )
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed < 0
  ) {
    return undefined;
  }

  return parsed;
}

// ============================================================
// CONTENT
// ============================================================

function EditarRenovacaoContent() {
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
    activePersonId,
  } =
    useActivePersonId();

  const {
    getRenovacao,
    updateRenovacao,
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

  const {
    run: runSave,
    isSubmitting:
      isSaving,
  } =
    useSubmitAction();

  const {
    run: runDelete,
    isSubmitting:
      isDeleting,
  } =
    useSubmitAction();

  const isSubmitLocked =
    useRef(
      false
    );

  // ==========================================================
  // ESTADO GERAL
  // ==========================================================

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
    );

  const [
    renovacao,
    setRenovacao,
  ] =
    useState<Renovacao | null>(
      null
    );

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] =
    useState(
      false
    );

  const [
    errors,
    setErrors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      {}
    );

  // ==========================================================
  // IDENTIDADE HISTÓRICA
  // ==========================================================

  const [
    medicamentoId,
    setMedicamentoId,
  ] =
    useState(
      ""
    );

  const [
    tipoAquisicao,
    setTipoAquisicao,
  ] =
    useState<
      | "comprado"
      | "sus"
    >(
      "comprado"
    );

  // ==========================================================
  // VÍNCULOS
  // ==========================================================

  const [
    medicoId,
    setMedicoId,
  ] =
    useState(
      ""
    );

  const [
    farmaciaId,
    setFarmaciaId,
  ] =
    useState(
      ""
    );

  const [
    hospitalId,
    setHospitalId,
  ] =
    useState(
      ""
    );

  const [
    localId,
    setLocalId,
  ] =
    useState(
      ""
    );

  // ==========================================================
  // DADOS EDITÁVEIS
  // ==========================================================

  const [
    dataDisplay,
    setDataDisplay,
  ] =
    useState(
      ""
    );

  const [
    preco,
    setPreco,
  ] =
    useState(
      ""
    );

  const [
    dataProximaRetirada,
    setDataProximaRetirada,
  ] =
    useState(
      ""
    );

  const [
    exigeNovaReceita,
    setExigeNovaReceita,
  ] =
    useState(
      false
    );

  const [
    observacoes,
    setObservacoes,
  ] =
    useState(
      ""
    );

  const [
    anexoUrl,
    setAnexoUrl,
  ] =
    useState(
      ""
    );

  // ==========================================================
  // MODAIS
  // ==========================================================

  const [
    isDoctorModalOpen,
    setIsDoctorModalOpen,
  ] =
    useState(
      false
    );

  const [
    isPharmacyModalOpen,
    setIsPharmacyModalOpen,
  ] =
    useState(
      false
    );

  const [
    isHospitalModalOpen,
    setIsHospitalModalOpen,
  ] =
    useState(
      false
    );

  const [
    isLocalModalOpen,
    setIsLocalModalOpen,
  ] =
    useState(
      false
    );

  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const selectedMedicamento =
    medicamentos.find(
      (
        item
      ) =>
        item.id ===
        medicamentoId
    );

  const selectedMedico =
    medicos.find(
      (
        item
      ) =>
        item.id ===
        medicoId
    );

  const selectedFarmacia =
    farmacias.find(
      (
        item
      ) =>
        item.id ===
        farmaciaId
    );

  const selectedHospital =
    hospitais.find(
      (
        item
      ) =>
        item.id ===
        hospitalId
    );

  const selectedLocal =
    locais.find(
      (
        item
      ) =>
        item.id ===
        localId
    );

  const theme =
    getClinicalTheme(
      selectedMedicamento
        ?.nome ||
        "Editar Renovação"
    );

  const dataRenovacaoISO =
    dataDisplay.length ===
      10
      ? parseDateToISO(
          dataDisplay
        )
      : "";

  const validadeReceita =
    dataRenovacaoISO
      ? analisarValidadeReceita(
          dataRenovacaoISO
        )
      : null;

  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(
    () => {
      let cancelled =
        false;

      const loadData =
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
              setRenovacao(
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
              await getRenovacao(
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
              setRenovacao(
                null
              );

              setIsLoading(
                false
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

            setMedicoId(
              data.medico_id ||
                ""
            );

            setFarmaciaId(
              data.farmacia_id ||
                ""
            );

            setHospitalId(
              data.hospital_id ||
                ""
            );

            setLocalId(
              data.local_id ||
                ""
            );

            setDataDisplay(
              formatDateToDisplay(
                data.data
              )
            );

            setTipoAquisicao(
              data.tipo_aquisicao ===
                "sus"
                ? "sus"
                : "comprado"
            );

            setDataProximaRetirada(
              formatDateToDisplay(
                data.data_proxima_retirada
              )
            );

            setExigeNovaReceita(
              Boolean(
                data.exige_nova_receita
              )
            );

            if (
              typeof data.preco ===
                "number" &&
              Number.isFinite(
                data.preco
              )
            ) {
              const precoCents =
                Math.round(
                  data.preco *
                    100
                ).toString();

              setPreco(
                handleCurrencyMask(
                  precoCents
                )
              );
            } else {
              setPreco(
                ""
              );
            }

            setObservacoes(
              data.observacoes ||
                ""
            );

            setAnexoUrl(
              data.anexo_url ||
                ""
            );

            setErrors(
              {}
            );
          } catch (
            error
          ) {
            console.error(
              "[EditarRenovacao] Falha ao carregar renovação:",
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
      activePersonId,
      getRenovacao,
    ]
  );

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validate =
    (): boolean => {
      const newErrors:
        Record<
          string,
          string
        > = {};

      if (
        !activePersonId
      ) {
        newErrors.person =
          "Pessoa ativa não identificada.";
      }

      if (
        !medicamentoId
      ) {
        newErrors.medicamento =
          "Medicamento não identificado.";
      }

      if (
        !parseDateToISO(
          dataDisplay
        )
      ) {
        newErrors.data =
          "Data inválida.";
      }

      if (
        tipoAquisicao ===
          "comprado" &&
        preco.trim() &&
        parseCurrency(
          preco
        ) ===
          undefined
      ) {
        newErrors.preco =
          "Preço inválido.";
      }

      if (
        tipoAquisicao ===
          "sus" &&
        dataProximaRetirada &&
        !parseDateToISO(
          dataProximaRetirada
        )
      ) {
        newErrors.dataProximaRetirada =
          "Data inválida.";
      }

      setErrors(
        newErrors
      );

      if (
        Object.keys(
          newErrors
        ).length >
        0
      ) {
        trigger(
          "error"
        );
      }

      return (
        Object.keys(
          newErrors
        ).length ===
        0
      );
    };

  // ==========================================================
  // SAVE
  // ==========================================================

  const handleSubmit =
    () => {
      if (
        isSubmitLocked.current ||
        isSaving
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      if (
        !validate()
      ) {
        return;
      }

      isSubmitLocked.current =
        true;

      runSave(
        async () => {
          if (
            !id ||
            !activePersonId ||
            !renovacao
          ) {
            throw new Error(
              "Renovação não identificada."
            );
          }

          if (
            renovacao.person_id !==
            activePersonId
          ) {
            throw new Error(
              "Renovação não pertence à pessoa ativa."
            );
          }

          /*
           * O medicamento identifica historicamente o evento.
           *
           * Ele não é editável aqui porque a criação pode ter
           * alterado estoque e estado atual do medicamento.
           */
          if (
            renovacao.medicamento_id !==
            medicamentoId
          ) {
            throw new Error(
              "O medicamento desta renovação não pode ser alterado nesta edição."
            );
          }

          /*
           * A forma de aquisição também permanece histórica.
           *
           * A tela não oferece alteração entre Particular e SUS.
           */
          const tipoOriginal =
            renovacao.tipo_aquisicao ===
              "sus"
              ? "sus"
              : "comprado";

          if (
            tipoOriginal !==
            tipoAquisicao
          ) {
            throw new Error(
              "A forma de aquisição desta renovação não pode ser alterada nesta edição."
            );
          }

          const dataISO =
            parseDateToISO(
              dataDisplay
            );

          if (
            !dataISO
          ) {
            throw new Error(
              "Data da renovação inválida."
            );
          }

          /*
           * Contrato canônico de atualização:
           *
           * undefined = não alterar
           * null      = limpar valor existente
           * valor     = substituir
           */

          const precoNumerico =
            tipoAquisicao ===
              "comprado"
              ? preco.trim()
                ? parseCurrency(
                    preco
                  )
                : null
              : null;

          const retornoISO =
            tipoAquisicao ===
              "sus"
              ? dataProximaRetirada
                ? parseDateToISO(
                    dataProximaRetirada
                  ) ||
                  null
                : null
              : null;

          await updateRenovacao(
            id,
            {
              /*
               * Mantido explicitamente para reforçar que o
               * medicamento continua o mesmo.
               */
              medicamento_id:
                medicamentoId,

              medico_id:
                medicoId ||
                null,

              farmacia_id:
                farmaciaId ||
                null,

              hospital_id:
                hospitalId ||
                null,

              local_id:
                localId ||
                null,

              /*
               * Aquisição permanece a mesma do registro original.
               */
              tipo_aquisicao:
                tipoAquisicao,

              data:
                dataISO,

              preco:
                precoNumerico,

              data_proxima_retirada:
                retornoISO,

              /*
               * Fora do fluxo SUS, o campo deixa de ter
               * significado para este evento.
               */
              exige_nova_receita:
                tipoAquisicao ===
                  "sus"
                  ? exigeNovaReceita
                  : false,

              observacoes:
                observacoes.trim() ||
                null,

              anexo_url:
                anexoUrl.trim() ||
                null,
            }
          );
        },
        {
          successMessage:
            "Renovação atualizada com sucesso",

          errorMessage:
            "Erro ao atualizar renovação",

          goBackOnSuccess:
            true,
        }
      ).finally(
        () => {
          isSubmitLocked.current =
            false;
        }
      );
    };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    () => {
      if (
        !id
      ) {
        return;
      }

      runDelete(
        async () => {
          if (
            !activePersonId ||
            !renovacao ||
            renovacao.person_id !==
              activePersonId
          ) {
            throw new Error(
              "Renovação não pertence à pessoa ativa."
            );
          }

          /*
           * Exclusão histórica não desfaz estoque.
           *
           * O saldo pode já ter sofrido consumo ou outros ajustes
           * depois da aquisição original.
           */
          await deleteRenovacao(
            id
          );

          router.replace(
            "/saude/renovacao"
          );
        },
        {
          successMessage:
            "Renovação excluída com sucesso",

          errorMessage:
            "Erro ao excluir renovação",
        }
      );
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
    !renovacao
  ) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
        <Receipt
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
              router.replace(
                "/saude/renovacao"
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
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
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
                <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">
                  Editar Renovação
                </h1>
              </div>
            </div>

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
        </header>

        {/* ====================================================
            CONTEÚDO
            ==================================================== */}

        <section className="space-y-4 px-5 pt-6">
          {/* ==================================================
              IDENTIDADE
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className={`rounded-[28px] border bg-surface p-5 shadow-sm ${theme.borderClass}`}
            style={{
              borderLeft:
                `6px solid ${theme.hex}`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${theme.bgClass} ${theme.textClass} ${theme.borderClass}`}
              >
                <Receipt
                  size={
                    24
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`font-mono text-xs font-bold uppercase tracking-wider ${theme.textClass}`}
                >
                  {tipoAquisicao ===
                  "sus"
                    ? "RETIRADA SUS"
                    : "AQUISIÇÃO"}
                </p>

                <h2 className="mt-0.5 truncate font-display text-base font-semibold text-ink-primary">
                  {selectedMedicamento
                    ?.nome ||
                    "Medicamento"}
                </h2>

                {selectedMedicamento
                  ?.dosagem && (
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {
                      selectedMedicamento.dosagem
                    }
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              IDENTIDADE HISTÓRICA
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">
              Identidade do registro
            </p>

            <div className="space-y-3">
              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                  Medicamento
                </p>

                <p className="mt-1 font-semibold text-ink-primary">
                  {selectedMedicamento
                    ?.nome ||
                    "Medicamento não encontrado"}
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                  Forma de aquisição registrada
                </p>

                <div className="mt-1 flex items-center gap-2">
                  {tipoAquisicao ===
                  "sus" ? (
                    <Receipt
                      size={
                        15
                      }
                      className="text-emerald-400"
                    />
                  ) : (
                    <Store
                      size={
                        15
                      }
                      className="text-ice"
                    />
                  )}

                  <p className="font-semibold text-ink-primary">
                    {tipoAquisicao ===
                    "sus"
                      ? "SUS / Governo"
                      : "Particular"}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
              Medicamento e forma de aquisição identificam o evento histórico e não são alterados nesta edição.
            </p>
          </motion.div>

          {/* ==================================================
              MÉDICO
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
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-ink-primary">
                Médico Prescritor
              </label>

              {medicoId && (
                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setMedicoId(
                        ""
                      );
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                >
                  <Eraser
                    size={
                      12
                    }
                  />

                  Limpar
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setIsDoctorModalOpen(
                    true
                  );
                }
              }
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Stethoscope
                  size={
                    16
                  }
                  className="shrink-0 text-ice"
                />

                <span className="truncate font-medium text-ink-primary">
                  {selectedMedico
                    ? `Dr(a). ${selectedMedico.nome}`
                    : "Selecionar médico..."}
                </span>
              </span>

              <span className="text-xs font-medium text-ice">
                Alterar
              </span>
            </button>
          </motion.div>

          {/* ==================================================
              FARMÁCIA
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
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-ink-primary">
                {tipoAquisicao ===
                "sus"
                  ? "Farmácia / Unidade de retirada"
                  : "Farmácia"}
              </label>

              {farmaciaId && (
                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setFarmaciaId(
                        ""
                      );
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                >
                  <Eraser
                    size={
                      12
                    }
                  />

                  Limpar
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setIsPharmacyModalOpen(
                    true
                  );
                }
              }
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Store
                  size={
                    16
                  }
                  className="shrink-0 text-amber-400"
                />

                <span className="truncate font-medium text-ink-primary">
                  {selectedFarmacia
                    ?.nome ||
                    "Selecionar farmácia..."}
                </span>
              </span>

              <span className="text-xs font-medium text-ice">
                Alterar
              </span>
            </button>
          </motion.div>

          {/* ==================================================
              HOSPITAL
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
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-ink-primary">
                Hospital
              </label>

              {hospitalId && (
                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setHospitalId(
                        ""
                      );
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                >
                  <Eraser
                    size={
                      12
                    }
                  />

                  Limpar
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setIsHospitalModalOpen(
                    true
                  );
                }
              }
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Building2
                  size={
                    16
                  }
                  className="shrink-0 text-violet-400"
                />

                <span className="truncate font-medium text-ink-primary">
                  {selectedHospital
                    ?.nome ||
                    "Selecionar hospital..."}
                </span>
              </span>

              <span className="text-xs font-medium text-ice">
                Alterar
              </span>
            </button>
          </motion.div>

          {/* ==================================================
              LOCAL
              ================================================== */}

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
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-ink-primary">
                Local / Posto
              </label>

              {localId && (
                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setLocalId(
                        ""
                      );
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                >
                  <Eraser
                    size={
                      12
                    }
                  />

                  Limpar
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setIsLocalModalOpen(
                    true
                  );
                }
              }
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left"
            >
              <span className="flex min-w-0 items-center gap-2">
                <MapPin
                  size={
                    16
                  }
                  className="shrink-0 text-emerald-400"
                />

                <span className="truncate font-medium text-ink-primary">
                  {selectedLocal
                    ?.nome ||
                    "Selecionar local..."}
                </span>
              </span>

              <span className="text-xs font-medium text-ice">
                Alterar
              </span>
            </button>
          </motion.div>

          {/* ==================================================
              DATA / AQUISIÇÃO
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
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Data da renovação
              </label>

              <div className="relative">
                <Calendar
                  size={
                    16
                  }
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />

                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  maxLength={
                    10
                  }
                  inputMode="numeric"
                  value={
                    dataDisplay
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setDataDisplay(
                        handleDateMask(
                          event.target.value
                        )
                      )
                  }
                  className={`w-full rounded-2xl border bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none focus:border-ice/50 ${
                    errors.data
                      ? "border-coral/50"
                      : "border-surface-border/50"
                  }`}
                />
              </div>

              {errors.data && (
                <p className="mt-1 text-xs text-coral">
                  {
                    errors.data
                  }
                </p>
              )}

              {validadeReceita?.dataValidade && (
                <div className="mt-3 rounded-2xl border border-ice/15 bg-ice/5 px-3.5 py-3">
                  <div className="flex items-start gap-2">
                    <Calendar
                      size={
                        14
                      }
                      className="mt-0.5 shrink-0 text-ice"
                    />

                    <div>
                      <p className="text-[11px] font-semibold text-ink-primary">
                        Validade de referência
                      </p>

                      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                        Pela regra atual do Vault, esta receita corresponde a uma validade de{" "}
                        {RECEITA_VALIDADE_PADRAO_DIAS} dias, até{" "}
                        <span className="font-semibold text-ink-primary">
                          {formatDateToDisplay(
                            validadeReceita.dataValidade
                          )}
                        </span>
                        .
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                        {
                          validadeReceita.mensagem
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {tipoAquisicao ===
            "comprado" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                  Custo registrado
                </label>

                <div className="relative">
                  <DollarSign
                    size={
                      16
                    }
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400"
                  />

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={
                      preco
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setPreco(
                          handleCurrencyMask(
                            event.target.value
                          )
                        )
                    }
                    className={`w-full rounded-2xl border bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none focus:border-ice/50 ${
                      errors.preco
                        ? "border-coral/50"
                        : "border-surface-border/50"
                    }`}
                  />
                </div>

                {errors.preco && (
                  <p className="mt-1 text-xs text-coral">
                    {
                      errors.preco
                    }
                  </p>
                )}

                {preco && (
                  <button
                    type="button"
                    onClick={
                      () => {
                        trigger(
                          "vibrate"
                        );

                        setPreco(
                          ""
                        );
                      }
                    }
                    className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-coral"
                  >
                    <Eraser
                      size={
                        12
                      }
                    />

                    Limpar preço
                  </button>
                )}
              </div>
            ) : (
              <>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-ink-primary">
                      Próxima data informada para retorno
                    </label>

                    {dataProximaRetirada && (
                      <button
                        type="button"
                        onClick={
                          () => {
                            trigger(
                              "vibrate"
                            );

                            setDataProximaRetirada(
                              ""
                            );
                          }
                        }
                        className="flex shrink-0 items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                      >
                        <Eraser
                          size={
                            12
                          }
                        />

                        Limpar
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Calendar
                      size={
                        16
                      }
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                    />

                    <input
                      type="text"
                      placeholder="DD/MM/AAAA"
                      maxLength={
                        10
                      }
                      inputMode="numeric"
                      value={
                        dataProximaRetirada
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setDataProximaRetirada(
                            handleDateMask(
                              event.target.value
                            )
                          )
                      }
                      className={`w-full rounded-2xl border bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none ${
                        errors.dataProximaRetirada
                          ? "border-coral/50"
                          : "border-emerald-500/30 focus:border-emerald-500/50"
                      }`}
                    />
                  </div>

                  {errors.dataProximaRetirada && (
                    <p className="mt-1 text-xs text-coral">
                      {
                        errors.dataProximaRetirada
                      }
                    </p>
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-surface-border/40 bg-surface-raised p-3.5">
                  <input
                    type="checkbox"
                    checked={
                      exigeNovaReceita
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setExigeNovaReceita(
                          event.target.checked
                        )
                    }
                    className="h-4 w-4 rounded border-surface-border/50 bg-surface text-ice focus:ring-ice/20"
                  />

                  <span className="text-sm text-ink-primary">
                    Foi informado que será necessária nova receita na próxima retirada
                  </span>
                </label>
              </>
            )}
          </motion.div>

          {/* ==================================================
              DADOS HISTÓRICOS NÃO RECONCILIÁVEIS
              ================================================== */}

          {(renovacao.quantidade !==
              undefined &&
              renovacao.quantidade !==
                null) ||
            renovacao.lote ||
            renovacao.validade_produto ? (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.07,
              }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <Package
                  size={
                    16
                  }
                  className="text-ice"
                />

                <h3 className="text-sm font-semibold text-ink-primary">
                  Dados da aquisição original
                </h3>
              </div>

              <div className="space-y-2">
                {renovacao.quantidade !==
                  undefined &&
                  renovacao.quantidade !==
                    null && (
                    <div className="flex items-center justify-between rounded-xl bg-surface-raised px-3 py-2.5">
                      <span className="text-xs text-ink-muted">
                        Quantidade registrada
                      </span>

                      <span className="font-mono text-sm font-semibold text-ink-primary">
                        {
                          renovacao.quantidade
                        }
                      </span>
                    </div>
                  )}

                {renovacao.lote && (
                  <div className="flex items-center justify-between rounded-xl bg-surface-raised px-3 py-2.5">
                    <span className="text-xs text-ink-muted">
                      Lote
                    </span>

                    <span className="text-sm font-semibold text-ink-primary">
                      {
                        renovacao.lote
                      }
                    </span>
                  </div>
                )}

                {renovacao.validade_produto && (
                  <div className="flex items-center justify-between rounded-xl bg-surface-raised px-3 py-2.5">
                    <span className="text-xs text-ink-muted">
                      Validade do produto
                    </span>

                    <span className="font-mono text-sm font-semibold text-ink-primary">
                      {formatDateToDisplay(
                        renovacao.validade_produto
                      )}
                    </span>
                  </div>
                )}
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
                Esses dados permanecem como registrados originalmente porque alterar quantidade depois da entrada poderia deixar o saldo de estoque inconsistente.
              </p>
            </motion.div>
          ) : null}

          {/* ==================================================
              OBSERVAÇÕES
              ================================================== */}

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
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Observações"
              value={
                observacoes
              }
              onChange={
                (
                  event
                ) =>
                  setObservacoes(
                    event.target.value
                  )
              }
              placeholder="Notas sobre esta renovação..."
            />

            {observacoes && (
              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setObservacoes(
                      ""
                    );
                  }
                }
                className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-coral"
              >
                <Eraser
                  size={
                    12
                  }
                />

                Limpar observações
              </button>
            )}
          </motion.div>

          {/* ==================================================
              ANEXO
              ================================================== */}

          {anexoUrl && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.09,
              }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-ink-primary">
                  Anexo
                </label>

                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setAnexoUrl(
                        ""
                      );
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                >
                  <Eraser
                    size={
                      12
                    }
                  />

                  Remover vínculo
                </button>
              </div>

              <a
                href={
                  anexoUrl
                }
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-ice/20 bg-ice/10 p-3.5 text-ice transition-colors hover:bg-ice/20"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileText
                    size={
                      16
                    }
                  />

                  Ver arquivo anexado
                </div>

                <ExternalLink
                  size={
                    14
                  }
                />
              </a>

              <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                Remover o vínculo não exclui automaticamente o arquivo físico do armazenamento.
              </p>
            </motion.div>
          )}
        </section>

        {/* ====================================================
            FOOTER
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
              isSaving ||
              !activePersonId
            }
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {isSaving ? (
              <Loader2
                size={
                  16
                }
                className="animate-spin"
              />
            ) : (
              <Save
                size={
                  16
                }
              />
            )}

            {isSaving
              ? "Salvando..."
              : "Salvar Alterações"}
          </Button>
        </div>

        {/* ====================================================
            MÉDICO
            ==================================================== */}

        <SelectionModal<Medico>
          isOpen={
            isDoctorModalOpen
          }
          onClose={
            () =>
              setIsDoctorModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              trigger(
                "vibrate"
              );

              setMedicoId(
                item.id!
              );

              setIsDoctorModalOpen(
                false
              );
            }
          }
          items={
            medicos
          }
          title="Selecionar Médico"
          renderItem={
            (
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
            )
          }
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.nome
          }
          onCreateNew={
            () => {
              setIsDoctorModalOpen(
                false
              );

              router.push(
                "/saude/medicos/novo"
              );
            }
          }
          createNewLabel="Cadastrar Novo Médico"
        />

        {/* ====================================================
            FARMÁCIA
            ==================================================== */}

        <SelectionModal<Farmacia>
          isOpen={
            isPharmacyModalOpen
          }
          onClose={
            () =>
              setIsPharmacyModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              trigger(
                "vibrate"
              );

              setFarmaciaId(
                item.id!
              );

              setIsPharmacyModalOpen(
                false
              );
            }
          }
          items={
            farmacias
          }
          title="Selecionar Farmácia"
          renderItem={
            (
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
            )
          }
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.nome
          }
          onCreateNew={
            () => {
              setIsPharmacyModalOpen(
                false
              );

              router.push(
                "/saude/farmacias/novo"
              );
            }
          }
          createNewLabel="Cadastrar Nova Farmácia"
        />

        {/* ====================================================
            HOSPITAL
            ==================================================== */}

        <SelectionModal<Hospital>
          isOpen={
            isHospitalModalOpen
          }
          onClose={
            () =>
              setIsHospitalModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              trigger(
                "vibrate"
              );

              setHospitalId(
                item.id!
              );

              setIsHospitalModalOpen(
                false
              );
            }
          }
          items={
            hospitais
          }
          title="Selecionar Hospital"
          renderItem={
            (
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
            )
          }
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.nome
          }
          onCreateNew={
            () => {
              setIsHospitalModalOpen(
                false
              );

              router.push(
                "/saude/hospitais/novo"
              );
            }
          }
          createNewLabel="Cadastrar Novo Hospital"
        />

        {/* ====================================================
            LOCAL
            ==================================================== */}

        <SelectionModal<LocalSaude>
          isOpen={
            isLocalModalOpen
          }
          onClose={
            () =>
              setIsLocalModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              trigger(
                "vibrate"
              );

              setLocalId(
                item.id!
              );

              setIsLocalModalOpen(
                false
              );
            }
          }
          items={
            locais
          }
          title="Selecionar Local / Posto"
          renderItem={
            (
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
            )
          }
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.nome
          }
          onCreateNew={
            () => {
              setIsLocalModalOpen(
                false
              );

              router.push(
                "/saude/locais/novo"
              );
            }
          }
          createNewLabel="Cadastrar Novo Local"
        />

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
          title="Excluir Renovação"
          message="Excluir este registro histórico? A exclusão não recalculará automaticamente o estoque atual do medicamento."
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

export default function EditarRenovacaoPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <EditarRenovacaoContent />
    </Suspense>
  );
}