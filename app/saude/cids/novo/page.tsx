// app/saude/cids/novo/page.tsx
"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  motion,
} from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Eraser,
  Loader2,
  MapPin,
  Save,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";

import {
  uploadFile,
} from "@/lib/supabase/storage";
import {
  getClinicalTheme,
} from "@/lib/health-utils";
import {
  useHapticFeedback,
} from "@/lib/haptics";

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
  useAuth,
} from "@/hooks/useAuth";
import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";
import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";
import {
  useCids,
} from "@/hooks/useCids";

import {
  PageTransition,
} from "@/components/PageTransition";
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
  SelectionModal,
} from "@/components/SelectionModal";
import {
  useToast,
} from "@/components/ToastProvider";

import type {
  Hospital,
  LocalSaude,
  Medico,
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
    )}/${clean.slice(4)}`;
  }

  if (
    clean.length >
    2
  ) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(2)}`;
  }

  return clean;
}

function parseDateToISO(
  value: string
): string | undefined {
  if (!value) {
    return undefined;
  }

  const clean =
    value.replace(
      /\D/g,
      ""
    );

  if (
    clean.length !==
    8
  ) {
    return undefined;
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

  const parsed =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    parsed.getFullYear() !==
      year ||
    parsed.getMonth() !==
      month - 1 ||
    parsed.getDate() !==
      day
  ) {
    return undefined;
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

function isSupportedFile(
  file: File
): boolean {
  return (
    file.type.startsWith(
      "image/"
    ) ||
    file.type ===
      "application/pdf"
  );
}

// ============================================================
// PÁGINA
// ============================================================

export default function NovoCidPage() {
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    showToast,
  } =
    useToast();

  const {
    user,
  } =
    useAuth();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    addCid,
  } =
    useCids();

  /*
   * Médicos, hospitais e locais são cadastros globais
   * por usuário. Não são filtrados pela pessoa ativa.
   */
  const {
    medicos,
  } =
    useMedicos();

  const {
    hospitais,
  } =
    useHospitais();

  const {
    locais,
  } =
    useLocais();

  const {
    run,
    isSubmitting,
  } =
    useSubmitAction();

  const isSubmitLocked =
    useRef(false);

  const [
    codigo,
    setCodigo,
  ] =
    useState("");

  const [
    descricao,
    setDescricao,
  ] =
    useState("");

  const [
    dataDiagnostico,
    setDataDiagnostico,
  ] =
    useState("");

  const [
    medicoId,
    setMedicoId,
  ] =
    useState("");

  const [
    hospitalId,
    setHospitalId,
  ] =
    useState("");

  const [
    localId,
    setLocalId,
  ] =
    useState("");

  const [
    observacoes,
    setObservacoes,
  ] =
    useState("");

  const [
    anexoUrl,
    setAnexoUrl,
  ] =
    useState("");

  const [
    localFile,
    setLocalFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    isUploading,
    setIsUploading,
  ] =
    useState(false);

  const [
    isMedicoModalOpen,
    setIsMedicoModalOpen,
  ] =
    useState(false);

  const [
    isHospitalModalOpen,
    setIsHospitalModalOpen,
  ] =
    useState(false);

  const [
    isLocalModalOpen,
    setIsLocalModalOpen,
  ] =
    useState(false);

  const [
    errors,
    setErrors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  // ==========================================================
  // RELAÇÕES
  // ==========================================================

  const selectedMedico =
    medicos.find(
      (medico) =>
        medico.id ===
        medicoId
    );

  const selectedHospital =
    hospitais.find(
      (hospital) =>
        hospital.id ===
        hospitalId
    );

  const selectedLocal =
    locais.find(
      (local) =>
        local.id ===
        localId
    );

  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  const clearError = (
    key: string
  ) => {
    setErrors(
      (previous) => {
        if (
          !previous[
            key
          ]
        ) {
          return previous;
        }

        const next = {
          ...previous,
        };

        delete next[
          key
        ];

        return next;
      }
    );
  };

  const validate =
    (): boolean => {
      const newErrors: Record<
        string,
        string
      > = {};

      if (
        !activePersonId
      ) {
        newErrors.person_id =
          "Não foi possível identificar a pessoa ativa";
      }

      if (
        !codigo.trim()
      ) {
        newErrors.codigo =
          "Código é obrigatório";
      }

      if (
        !descricao.trim()
      ) {
        newErrors.descricao =
          "Descrição é obrigatória";
      }

      if (
        dataDiagnostico &&
        !parseDateToISO(
          dataDiagnostico
        )
      ) {
        newErrors.data_diagnostico =
          "Informe uma data válida";
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
  // ANEXO
  // ==========================================================

  const handleFileSelect =
    async (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target
          .files?.[0];

      event.target.value =
        "";

      if (!file) {
        return;
      }

      trigger(
        "vibrate"
      );

      if (
        file.size >
        10 *
          1024 *
          1024
      ) {
        trigger(
          "error"
        );

        showToast(
          "O arquivo excede o limite de 10 MB.",
          "error"
        );

        return;
      }

      if (
        !isSupportedFile(
          file
        )
      ) {
        trigger(
          "error"
        );

        showToast(
          "O Vault aceita imagens e arquivos PDF.",
          "error"
        );

        return;
      }

      if (
        !user?.id
      ) {
        trigger(
          "error"
        );

        showToast(
          "Usuário não autenticado.",
          "error"
        );

        return;
      }

      setIsUploading(
        true
      );

      try {
        const {
          url,
          error,
        } =
          await uploadFile(
            user.id,
            file,
            "saude"
          );

        if (
          error ||
          !url
        ) {
          throw new Error(
            "Falha no upload."
          );
        }

        setLocalFile(
          file
        );

        setAnexoUrl(
          url
        );

        showToast(
          "Arquivo anexado",
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao anexar arquivo ao CID:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao fazer upload",
          "error"
        );
      } finally {
        setIsUploading(
          false
        );
      }
    };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    () => {
      trigger(
        "vibrate"
      );

      if (
        !validate()
      ) {
        trigger(
          "error"
        );

        showToast(
          "Revise os campos obrigatórios.",
          "error"
        );

        return;
      }

      if (
        !activePersonId
      ) {
        trigger(
          "error"
        );

        showToast(
          "Não foi possível identificar a pessoa ativa.",
          "error"
        );

        return;
      }

      if (
        isUploading
      ) {
        showToast(
          "Aguarde o término do envio do anexo.",
          "error"
        );

        return;
      }

      if (
        isSubmitLocked.current ||
        isSubmitting
      ) {
        return;
      }

      isSubmitLocked.current =
        true;

      run(
        async () => {
          try {
            const dataISO =
              dataDiagnostico
                ? parseDateToISO(
                    dataDiagnostico
                  )
                : undefined;

            await addCid({
              codigo:
                codigo.trim(),

              descricao:
                descricao.trim(),

              data_diagnostico:
                dataISO,

              medico_id:
                medicoId ||
                undefined,

              hospital_id:
                hospitalId ||
                undefined,

              local_id:
                localId ||
                undefined,

              observacoes:
                observacoes.trim() ||
                undefined,

              anexo_url:
                anexoUrl ||
                undefined,
            });
          } finally {
            isSubmitLocked.current =
              false;
          }
        },
        {
          successMessage:
            "CID cadastrado com sucesso",

          errorMessage:
            "Erro ao cadastrar CID",

          goBackOnSuccess:
            true,
        }
      );
    };

  // ==========================================================
  // PRÉVIA
  // ==========================================================

  const theme =
    getClinicalTheme(
      descricao ||
        codigo ||
        "Geral"
    );

  const PreviewIcon =
    theme.icon;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
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
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={
                  18
                }
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-400">
                Vault
              </p>

              <h1 className="truncate font-display text-xl font-semibold text-ink-primary">
                Cadastrar CID
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {!activePersonId && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              className="flex items-start gap-3 rounded-[24px] border border-coral/30 bg-coral/10 p-4"
            >
              <div className="mt-0.5">
                <X
                  size={
                    16
                  }
                  className="text-coral"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-coral">
                  Pessoa ativa não identificada
                </p>

                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  Selecione uma pessoa no Vault antes de cadastrar um diagnóstico.
                </p>
              </div>
            </motion.div>
          )}

          {/* ==================================================
              PRÉVIA
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className={`rounded-[28px] border bg-surface p-5 shadow-sm transition-all duration-300 ${theme.borderClass}`}
            style={{
              borderLeft:
                `6px solid ${theme.hex}`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-300 ${theme.bgClass} ${theme.textClass} ${theme.borderClass}`}
              >
                <PreviewIcon
                  size={
                    24
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`font-mono text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${theme.textClass}`}
                >
                  {codigo ||
                    "CÓDIGO CID"}
                </p>

                <h2 className="mt-0.5 line-clamp-2 font-display text-base font-semibold text-ink-primary">
                  {descricao ||
                    "A prévia do diagnóstico aparecerá aqui"}
                </h2>
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              IDENTIFICAÇÃO
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
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Código CID *"
              placeholder="Ex: F90.0"
              value={
                codigo
              }
              onChange={(
                event
              ) => {
                setCodigo(
                  event.target.value
                );

                clearError(
                  "codigo"
                );
              }}
              error={
                errors.codigo
              }
            />

            <Input
              label="Descrição *"
              placeholder="Ex: Transtorno de déficit de atenção / hiperatividade"
              value={
                descricao
              }
              onChange={(
                event
              ) => {
                setDescricao(
                  event.target.value
                );

                clearError(
                  "descricao"
                );
              }}
              error={
                errors.descricao
              }
            />
          </motion.div>

          {/* ==================================================
              DATA
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
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">
                Data do Diagnóstico
              </label>

              <input
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                maxLength={
                  10
                }
                value={
                  dataDiagnostico
                }
                onChange={(
                  event
                ) => {
                  setDataDiagnostico(
                    handleDateMask(
                      event.target.value
                    )
                  );

                  clearError(
                    "data_diagnostico"
                  );
                }}
                className={`w-full rounded-2xl border ${
                  errors.data_diagnostico
                    ? "border-coral/50"
                    : "border-surface-border/50"
                } bg-surface-raised px-4 py-3 font-mono text-sm text-ink-primary outline-none focus:border-ice`}
              />

              {errors.data_diagnostico && (
                <p className="text-xs text-coral">
                  {
                    errors.data_diagnostico
                  }
                </p>
              )}
            </div>
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
                0.06,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-primary">
                Médico que diagnosticou
              </label>

              {medicoId &&
                selectedMedico && (
                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    setMedicoId(
                      ""
                    );
                  }}
                  className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
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
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setIsMedicoModalOpen(
                  true
                );
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Stethoscope
                  size={
                    16
                  }
                  className="shrink-0 text-ice"
                />

                <span className="truncate">
                  {selectedMedico
                    ? selectedMedico.nome
                    : "Selecionar médico..."}
                </span>
              </span>

              <span className="shrink-0 text-xs font-medium text-ice">
                {selectedMedico
                  ? "Alterar"
                  : "Selecionar"}
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
                0.08,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-primary">
                Hospital
              </label>

              {hospitalId &&
                selectedHospital && (
                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    setHospitalId(
                      ""
                    );
                  }}
                  className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
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
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setIsHospitalModalOpen(
                  true
                );
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Building2
                  size={
                    16
                  }
                  className="shrink-0 text-violet-400"
                />

                <span className="truncate">
                  {selectedHospital
                    ? selectedHospital.nome
                    : "Selecionar hospital..."}
                </span>
              </span>

              <span className="shrink-0 text-xs font-medium text-ice">
                {selectedHospital
                  ? "Alterar"
                  : "Selecionar"}
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
                0.1,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-primary">
                Local / Posto
              </label>

              {localId &&
                selectedLocal && (
                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    setLocalId(
                      ""
                    );
                  }}
                  className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
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
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setIsLocalModalOpen(
                  true
                );
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <MapPin
                  size={
                    16
                  }
                  className="shrink-0 text-emerald-400"
                />

                <span className="truncate">
                  {selectedLocal
                    ? selectedLocal.nome
                    : "Selecionar local..."}
                </span>
              </span>

              <span className="shrink-0 text-xs font-medium text-ice">
                {selectedLocal
                  ? "Alterar"
                  : "Selecionar"}
              </span>
            </button>
          </motion.div>

          {/* ==================================================
              OBSERVAÇÕES E ANEXO
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
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Observações"
              placeholder="Sintomas, histórico, contexto clínico ou outras informações relevantes..."
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

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Laudo / Anexo
              </label>

              {anexoUrl ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-primary">
                    {localFile?.name ||
                      "Arquivo anexado"}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setAnexoUrl(
                        ""
                      );

                      setLocalFile(
                        null
                      );
                    }}
                    className="shrink-0 text-coral"
                    aria-label="Remover anexo"
                  >
                    <X
                      size={
                        16
                      }
                    />
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      document
                        .getElementById(
                          "cid-file-upload"
                        )
                        ?.click()
                    }
                    className="flex-1"
                    disabled={
                      isUploading ||
                      isSubmitting
                    }
                    type="button"
                  >
                    {isUploading ? (
                      <Loader2
                        size={
                          16
                        }
                        className="animate-spin"
                      />
                    ) : (
                      <Upload
                        size={
                          16
                        }
                      />
                    )}

                    {isUploading
                      ? "Enviando..."
                      : "Anexar"}
                  </Button>

                  <input
                    id="cid-file-upload"
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={
                      handleFileSelect
                    }
                  />
                </div>
              )}
            </div>
          </motion.div>
        </section>

        {/* ====================================================
            SALVAR
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
              isUploading ||
              !activePersonId
            }
          >
            {isSubmitting ? (
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

            {isSubmitting
              ? "Salvando..."
              : "Salvar CID"}
          </Button>
        </div>

        {/* ====================================================
            MÉDICO
            ==================================================== */}

        <SelectionModal<Medico>
          isOpen={
            isMedicoModalOpen
          }
          onClose={() =>
            setIsMedicoModalOpen(
              false
            )
          }
          onSelect={(
            item
          ) => {
            if (
              !item.id
            ) {
              return;
            }

            trigger(
              "vibrate"
            );

            setMedicoId(
              item.id
            );

            setIsMedicoModalOpen(
              false
            );
          }}
          items={
            medicos
          }
          title="Selecionar Médico"
          renderItem={(
            item
          ) => (
            <div>
              <p className="font-medium text-ink-primary">
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

            router.push(
              "/saude/medicos/novo"
            );
          }}
          createNewLabel="Cadastrar Novo Médico"
        />

        {/* ====================================================
            HOSPITAL
            ==================================================== */}

        <SelectionModal<Hospital>
          isOpen={
            isHospitalModalOpen
          }
          onClose={() =>
            setIsHospitalModalOpen(
              false
            )
          }
          onSelect={(
            item
          ) => {
            if (
              !item.id
            ) {
              return;
            }

            trigger(
              "vibrate"
            );

            setHospitalId(
              item.id
            );

            setIsHospitalModalOpen(
              false
            );
          }}
          items={
            hospitais
          }
          title="Selecionar Hospital"
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
            setIsHospitalModalOpen(
              false
            );

            router.push(
              "/saude/hospitais/novo"
            );
          }}
          createNewLabel="Cadastrar Novo Hospital"
        />

        {/* ====================================================
            LOCAL
            ==================================================== */}

        <SelectionModal<LocalSaude>
          isOpen={
            isLocalModalOpen
          }
          onClose={() =>
            setIsLocalModalOpen(
              false
            )
          }
          onSelect={(
            item
          ) => {
            if (
              !item.id
            ) {
              return;
            }

            trigger(
              "vibrate"
            );

            setLocalId(
              item.id
            );

            setIsLocalModalOpen(
              false
            );
          }}
          items={
            locais
          }
          title="Selecionar Local"
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

            router.push(
              "/saude/locais/novo"
            );
          }}
          createNewLabel="Cadastrar Novo Local"
        />
      </main>
    </PageTransition>
  );
}