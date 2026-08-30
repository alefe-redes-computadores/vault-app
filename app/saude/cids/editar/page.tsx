// app/saude/cids/editar/page.tsx
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
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
  Eraser,
  ExternalLink,
  FlaskConical,
  FolderHeart,
  Loader2,
  MapPin,
  Pill,
  Save,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  uploadFile,
} from "@/lib/supabase/storage";
import {
  cidsRepository,
} from "@/lib/repositories/cids";
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
  useToast,
} from "@/components/ToastProvider";
import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";
import {
  useAuth,
} from "@/hooks/useAuth";
import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

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
  DetailSkeleton,
} from "@/components/loading/DetailSkeleton";

import type {
  Cid,
  Exame,
  Hospital,
  LocalSaude,
  Medicamento,
  Medico,
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

function formatDateToDisplay(
  isoStr?: string
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
    return "";
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
// CONTEÚDO
// ============================================================

function EditarCidContent() {
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

  /*
   * Médicos, hospitais e locais são globais
   * por usuário.
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

  // ==========================================================
  // ESTADO
  // ==========================================================

  const [
    cid,
    setCid,
  ] =
    useState<Cid | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

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
  // DADOS RELACIONAIS DA PESSOA ATIVA
  // ==========================================================

  const tratamentos =
    useLiveQuery(
      async () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        const data =
          await db.tratamentos.toArray();

        return data.filter(
          (item) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        activePersonId,
      ],
      []
    ) || [];

  const medicamentos =
    useLiveQuery(
      async () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        const data =
          await db.medicamentos.toArray();

        return data.filter(
          (item) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        activePersonId,
      ],
      []
    ) || [];

  const exames =
    useLiveQuery(
      async () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        const data =
          await db.exames.toArray();

        return data.filter(
          (item) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        activePersonId,
      ],
      []
    ) || [];

  // ==========================================================
  // CARREGAMENTO DO CID
  // ==========================================================

  useEffect(() => {
    if (
      !id
    ) {
      router.replace(
        "/saude/cids"
      );

      return;
    }

    if (
      !activePersonId
    ) {
      setCid(
        null
      );

      setIsLoading(
        false
      );

      return;
    }

    let cancelled =
      false;

    const loadCid =
      async () => {
        setIsLoading(
          true
        );

        try {
          const data =
            await cidsRepository.getById(
              id,
              activePersonId
            );

          if (
            cancelled
          ) {
            return;
          }

          if (!data) {
            showToast(
              "CID não encontrado para a pessoa ativa.",
              "error"
            );

            router.replace(
              "/saude/cids"
            );

            return;
          }

          setCid(
            data
          );

          setCodigo(
            data.codigo ||
              ""
          );

          setDescricao(
            data.descricao ||
              ""
          );

          setDataDiagnostico(
            data.data_diagnostico
              ? formatDateToDisplay(
                  data.data_diagnostico
                )
              : ""
          );

          setMedicoId(
            data.medico_id ||
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

          setObservacoes(
            data.observacoes ||
              ""
          );

          setAnexoUrl(
            data.anexo_url ||
              ""
          );

          setLocalFile(
            null
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao carregar CID:",
            error
          );

          if (
            !cancelled
          ) {
            showToast(
              "Não foi possível carregar o CID.",
              "error"
            );

            router.replace(
              "/saude/cids"
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

    void loadCid();

    return () => {
      cancelled =
        true;
    };
  }, [
    id,
    activePersonId,
    router,
    showToast,
  ]);

  // ==========================================================
  // RELAÇÕES DIRETAS
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
  // HUB RELACIONAL
  // ==========================================================

  const tratamentosVinculados =
    useMemo(() => {
      if (!id) {
        return [];
      }

      return tratamentos.filter(
        (
          tratamento:
            Tratamento
        ) =>
          tratamento.cid_ids?.includes(
            id
          )
      );
    }, [
      tratamentos,
      id,
    ]);

  const medicamentosVinculados =
    useMemo(() => {
      if (
        tratamentosVinculados.length ===
        0
      ) {
        return [];
      }

      const tratamentoIds =
        new Set(
          tratamentosVinculados
            .map(
              (
                tratamento
              ) =>
                tratamento.id
            )
            .filter(
              (
                tratamentoId
              ): tratamentoId is string =>
                Boolean(
                  tratamentoId
                )
            )
        );

      return medicamentos.filter(
        (
          medicamento:
            Medicamento
        ) =>
          medicamento.tratamento_ids?.some(
            (
              tratamentoId
            ) =>
              tratamentoIds.has(
                tratamentoId
              )
          )
      );
    }, [
      medicamentos,
      tratamentosVinculados,
    ]);

  const examesVinculados =
    useMemo(() => {
      if (
        tratamentosVinculados.length ===
        0
      ) {
        return [];
      }

      const tratamentoIds =
        new Set(
          tratamentosVinculados
            .map(
              (
                tratamento
              ) =>
                tratamento.id
            )
            .filter(
              (
                tratamentoId
              ): tratamentoId is string =>
                Boolean(
                  tratamentoId
                )
            )
        );

      return exames
        .filter(
          (
            exame:
              Exame
          ) =>
            exame.tratamento_ids?.some(
              (
                tratamentoId
              ) =>
                tratamentoIds.has(
                  tratamentoId
                )
            )
        )
        .sort(
          (
            first,
            second
          ) =>
            (second.data ||
              "").localeCompare(
              first.data ||
                ""
            )
        );
    }, [
      exames,
      tratamentosVinculados,
    ]);

  // ==========================================================
  // ERROS
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

  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  const validate =
    (): boolean => {
      const newErrors: Record<
        string,
        string
      > = {};

      if (
        !activePersonId ||
        !cid ||
        cid.person_id !==
          activePersonId
      ) {
        newErrors.person_id =
          "O CID não pertence à pessoa ativa";
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
  // SALVAR
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
          "Revise os campos antes de salvar.",
          "error"
        );

        return;
      }

      if (
        !id ||
        !activePersonId ||
        !cid ||
        cid.person_id !==
          activePersonId
      ) {
        trigger(
          "error"
        );

        showToast(
          "Não foi possível validar o CID para a pessoa ativa.",
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

            await cidsRepository.update(
              id,
              activePersonId,
              {
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
              }
            );
          } finally {
            isSubmitLocked.current =
              false;
          }
        },
        {
          successMessage:
            "CID atualizado com sucesso!",

          errorMessage:
            "Erro ao atualizar CID",

          goBackOnSuccess:
            true,
        }
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    isLoading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (
    !activePersonId ||
    !cid
  ) {
    return null;
  }

  // ==========================================================
  // TEMA
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
                Diagnóstico
              </p>

              <h1 className="truncate font-display text-xl font-semibold text-ink-primary">
                Editar CID
                {codigo
                  ? ` (${codigo})`
                  : ""}
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
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
                aria-label="Data do diagnóstico"
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
                  aria-label="Limpar médico"
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
              aria-label="Selecionar médico"
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
                  aria-label="Limpar hospital"
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
              aria-label="Selecionar hospital"
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
                  aria-label="Limpar local"
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
              aria-label="Selecionar local"
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
              RELAÇÕES REAIS DO CID
              ================================================== */}

          {(tratamentosVinculados.length >
            0 ||
            medicamentosVinculados.length >
              0 ||
            examesVinculados.length >
              0) && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.11,
              }}
              className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Relações clínicas
                </p>

                <p className="mt-1 text-[11px] leading-5 text-ink-faint">
                  Registros vinculados a este diagnóstico através das relações salvas no Vault.
                </p>
              </div>

              {tratamentosVinculados.length >
                0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase text-violet-400">
                    Tratamentos (
                    {
                      tratamentosVinculados.length
                    }
                    )
                  </p>

                  {tratamentosVinculados.map(
                    (
                      tratamento
                    ) => (
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
                        className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.99]"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <FolderHeart
                            size={
                              14
                            }
                            className="shrink-0 text-violet-400"
                          />

                          <span className="truncate text-xs font-semibold text-ink-primary">
                            {
                              tratamento.nome
                            }
                          </span>
                        </div>

                        <ExternalLink
                          size={
                            14
                          }
                          className="shrink-0 text-ink-faint"
                        />
                      </button>
                    )
                  )}
                </div>
              )}

              {medicamentosVinculados.length >
                0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase text-amber-400">
                    Medicamentos (
                    {
                      medicamentosVinculados.length
                    }
                    )
                  </p>

                  {medicamentosVinculados.map(
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
                        className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.99]"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Pill
                            size={
                              14
                            }
                            className="shrink-0 text-amber-400"
                          />

                          <span className="truncate text-xs font-semibold text-ink-primary">
                            {
                              medicamento.nome
                            }
                          </span>
                        </div>

                        <ExternalLink
                          size={
                            14
                          }
                          className="shrink-0 text-ink-faint"
                        />
                      </button>
                    )
                  )}
                </div>
              )}

              {examesVinculados.length >
                0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase text-emerald-400">
                    Exames (
                    {
                      examesVinculados.length
                    }
                    )
                  </p>

                  {examesVinculados.map(
                    (
                      exame
                    ) => (
                      <button
                        key={
                          exame.id
                        }
                        type="button"
                        onClick={() => {
                          if (
                            !exame.id
                          ) {
                            return;
                          }

                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/exames/detalhes?id=${exame.id}`
                          );
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.99]"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <FlaskConical
                            size={
                              14
                            }
                            className="shrink-0 text-emerald-400"
                          />

                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink-primary">
                              {
                                exame.nome
                              }
                            </p>

                            {exame.data && (
                              <p className="mt-0.5 text-[10px] text-ink-muted">
                                {
                                  formatDateToDisplay(
                                    exame.data
                                  )
                                }
                              </p>
                            )}
                          </div>
                        </div>

                        <ExternalLink
                          size={
                            14
                          }
                          className="shrink-0 text-ink-faint"
                        />
                      </button>
                    )
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ==================================================
              OBSERVAÇÕES / ANEXO
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
                          "cid-edit-file-upload"
                        )
                        ?.click()
                    }
                    className="flex-1"
                    type="button"
                    disabled={
                      isUploading ||
                      isSubmitting
                    }
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
                    id="cid-edit-file-upload"
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
              : "Salvar Alterações"}
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
        />
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function EditarCidPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <EditarCidContent />
    </Suspense>
  );
}