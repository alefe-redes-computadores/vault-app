// app/saude/consultas/editar/page.tsx
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
  Activity,
  ArrowLeft,
  Brain,
  Building2,
  Calendar,
  Check,
  Clock,
  Eraser,
  Flame,
  HeartPulse,
  Loader2,
  MapPin,
  Plus,
  Save,
  ShieldAlert,
  Stethoscope,
  UserCheck,
  X,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  getClinicalTheme,
} from "@/lib/health-utils";

import {
  tratamentosRepository,
} from "@/lib/repositories/tratamentos";

import {
  cidsRepository,
} from "@/lib/repositories/cids";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useConsultas,
} from "@/hooks/useConsultas";

import {
  useTratamentos,
} from "@/hooks/useTratamentos";

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
  SelectionModal,
} from "@/components/SelectionModal";

import {
  BottomSheet,
} from "@/components/ui/BottomSheet";

import {
  useToast,
} from "@/components/ToastProvider";

import type {
  Cid,
  Consulta,
  Hospital,
  LocalSaude,
  Medico,
  Tratamento,
} from "@/lib/types";

// ============================================================
// ANIMAÇÃO
// ============================================================

const fadeUp = {
  initial: {
    opacity:
      0,

    y:
      12,
  },

  animate: {
    opacity:
      1,

    y:
      0,
  },
};

// ============================================================
// HELPERS
// ============================================================

function formatDateToDisplay(
  isoStr: string
): string {
  if (
    !isoStr
  ) {
    return "";
  }

  const datePart =
    isoStr.includes(
      "T"
    )
      ? isoStr.split(
          "T"
        )[0]
      : isoStr;

  const parts =
    datePart.split(
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

function parseDateToISO(
  displayStr: string
): string | undefined {
  const clean =
    displayStr.replace(
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
      month -
        1,
      day
    );

  if (
    parsed.getFullYear() !==
      year ||
    parsed.getMonth() !==
      month -
        1 ||
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

function handleTimeMask(
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
        4
      );

  if (
    clean.length >
    2
  ) {
    return `${clean.slice(
      0,
      2
    )}:${clean.slice(2)}`;
  }

  return clean;
}

function isValidTime(
  value: string
): boolean {
  if (
    !value
  ) {
    return true;
  }

  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value
  );
}

function getTratamentoIcon(
  nome: string
) {
  const normalized =
    nome.toLowerCase();

  if (
    normalized.includes(
      "tdah"
    )
  ) {
    return Brain;
  }

  if (
    normalized.includes(
      "dor"
    ) ||
    normalized.includes(
      "neuropática"
    )
  ) {
    return Flame;
  }

  if (
    normalized.includes(
      "depress"
    )
  ) {
    return HeartPulse;
  }

  if (
    normalized.includes(
      "ansied"
    ) ||
    normalized.includes(
      "ansiolítico"
    )
  ) {
    return ShieldAlert;
  }

  return Activity;
}

function sanitizeSelectedIds(
  ids:
    string[] |
    undefined,
  allowedIds:
    Set<string>
): string[] {
  if (
    !ids?.length
  ) {
    return [];
  }

  return Array.from(
    new Set(
      ids.filter(
        (
          id
        ) =>
          allowedIds.has(
            id
          )
      )
    )
  );
}

// ============================================================
// CONTENT
// ============================================================

function EditarConsultaContent() {
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
    activePersonId,
  } =
    useActivePersonId();

  const {
    getConsulta,
    updateConsulta,
  } =
    useConsultas();

  const {
    tratamentos = [],
  } =
    useTratamentos();

  const {
    cids = [],
  } =
    useCids();

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

  const {
    run,
    isSubmitting,
  } =
    useSubmitAction();

  const isSubmitLocked =
    useRef(
      false
    );

  // ==========================================================
  // PERSON-OWNED SECOND BARRIER
  // ==========================================================

  const scopedTratamentos =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return tratamentos.filter(
          (
            tratamento
          ) =>
            tratamento.person_id ===
            activePersonId
        );
      },
      [
        tratamentos,
        activePersonId,
      ]
    );

  const scopedCids =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return cids.filter(
          (
            cid
          ) =>
            cid.person_id ===
            activePersonId
        );
      },
      [
        cids,
        activePersonId,
      ]
    );

  const allowedTratamentoIds =
    useMemo(
      () =>
        new Set(
          scopedTratamentos
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
        ),
      [
        scopedTratamentos,
      ]
    );

  const allowedCidIds =
    useMemo(
      () =>
        new Set(
          scopedCids
            .map(
              (
                cid
              ) =>
                cid.id
            )
            .filter(
              (
                cidId
              ): cidId is string =>
                Boolean(
                  cidId
                )
            )
        ),
      [
        scopedCids,
      ]
    );

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    consulta,
    setConsulta,
  ] =
    useState<Consulta | null>(
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
    medicoId,
    setMedicoId,
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

  const [
    dataDisplay,
    setDataDisplay,
  ] =
    useState(
      ""
    );

  const [
    horario,
    setHorario,
  ] =
    useState(
      ""
    );

  const [
    status,
    setStatus,
  ] =
    useState<
      | "agendada"
      | "realizada"
      | "cancelada"
    >(
      "agendada"
    );

  const [
    motivo,
    setMotivo,
  ] =
    useState(
      ""
    );

  const [
    observacoes,
    setObservacoes,
  ] =
    useState(
      ""
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
    >({});

  // ==========================================================
  // MODAIS
  // ==========================================================

  const [
    isMedicoModalOpen,
    setIsMedicoModalOpen,
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

  const [
    tratamentosSelecionados,
    setTratamentosSelecionados,
  ] =
    useState<string[]>(
      []
    );

  const [
    cidsSelecionados,
    setCidsSelecionados,
  ] =
    useState<string[]>(
      []
    );

  const [
    isTratamentoModalOpen,
    setIsTratamentoModalOpen,
  ] =
    useState(
      false
    );

  const [
    isCidModalOpen,
    setIsCidModalOpen,
  ] =
    useState(
      false
    );

  // ==========================================================
  // QUICK CREATE
  // ==========================================================

  const [
    isCreatingTratamento,
    setIsCreatingTratamento,
  ] =
    useState(
      false
    );

  const [
    newTratamentoName,
    setNewTratamentoName,
  ] =
    useState(
      ""
    );

  const [
    isSavingTratamento,
    setIsSavingTratamento,
  ] =
    useState(
      false
    );

  const [
    isCreatingCid,
    setIsCreatingCid,
  ] =
    useState(
      false
    );

  const [
    newCidCodigo,
    setNewCidCodigo,
  ] =
    useState(
      ""
    );

  const [
    newCidDescricao,
    setNewCidDescricao,
  ] =
    useState(
      ""
    );

  const [
    isSavingCid,
    setIsSavingCid,
  ] =
    useState(
      false
    );

  // ==========================================================
  // LOAD
  //
  // getConsulta() já é person-scoped pelo useConsultas.
  //
  // Tratamentos e CIDs passam por uma segunda barreira antes
  // de entrar no formulário.
  // ==========================================================

  useEffect(
    () => {
      if (
        !id
      ) {
        router.replace(
          "/saude/consultas"
        );

        return;
      }

      if (
        !activePersonId
      ) {
        setConsulta(
          null
        );

        setIsLoading(
          false
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
            const data =
              await getConsulta(
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
              showToast(
                "Consulta não encontrada para a pessoa ativa.",
                "error"
              );

              router.replace(
                "/saude/consultas"
              );

              return;
            }

            setConsulta(
              data
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

            setDataDisplay(
              formatDateToDisplay(
                data.data
              )
            );

            setHorario(
              data.horario ||
                ""
            );

            setStatus(
              data.status ||
                "agendada"
            );

            setMotivo(
              data.motivo ||
                ""
            );

            setObservacoes(
              data.observacoes ||
                ""
            );

            /*
             * IDs legados, órfãos ou de outra pessoa nunca
             * entram no estado editável.
             */
            setTratamentosSelecionados(
              sanitizeSelectedIds(
                data.tratamento_ids,
                allowedTratamentoIds
              )
            );

            setCidsSelecionados(
              sanitizeSelectedIds(
                data.cid_ids,
                allowedCidIds
              )
            );

            setErrors(
              {}
            );
          } catch (
            error
          ) {
            console.error(
              "Erro ao carregar consulta:",
              error
            );

            if (
              !cancelled
            ) {
              showToast(
                "Não foi possível carregar a consulta.",
                "error"
              );

              router.replace(
                "/saude/consultas"
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
      getConsulta,
      allowedTratamentoIds,
      allowedCidIds,
      router,
      showToast,
    ]
  );

  // ==========================================================
  // SELECTED
  // ==========================================================

  const selectedMedico =
    medicos.find(
      (
        medico
      ) =>
        medico.id ===
        medicoId
    );

  const selectedHospital =
    hospitais.find(
      (
        hospital
      ) =>
        hospital.id ===
        hospitalId
    );

  const selectedLocal =
    locais.find(
      (
        local
      ) =>
        local.id ===
        localId
    );

  // ==========================================================
  // ERROR
  // ==========================================================

  const clearError =
    (
      key:
        string
    ) => {
      setErrors(
        (
          previous
        ) => {
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
  // QUICK TREATMENT
  // ==========================================================

  const handleCreateTratamento =
    async () => {
      const nome =
        newTratamentoName.trim();

      if (
        !nome ||
        isSavingTratamento
      ) {
        return;
      }

      if (
        !activePersonId
      ) {
        trigger(
          "error"
        );

        showToast(
          "Pessoa ativa não identificada.",
          "error"
        );

        return;
      }

      setIsSavingTratamento(
        true
      );

      trigger(
        "vibrate"
      );

      try {
        const newId =
          await tratamentosRepository.create({
            nome,

            status:
              "ativo",

            person_id:
              activePersonId,
          });

        setTratamentosSelecionados(
          (
            previous
          ) =>
            previous.includes(
              newId
            )
              ? previous
              : [
                  ...previous,
                  newId,
                ]
        );

        clearError(
          "tratamentos"
        );

        showToast(
          "Tratamento cadastrado",
          "success"
        );

        setIsCreatingTratamento(
          false
        );

        setNewTratamentoName(
          ""
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao cadastrar tratamento:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao cadastrar tratamento",
          "error"
        );
      } finally {
        setIsSavingTratamento(
          false
        );
      }
    };

  // ==========================================================
  // QUICK CID
  // ==========================================================

  const handleCreateCid =
    async () => {
      const codigo =
        newCidCodigo.trim();

      const descricao =
        newCidDescricao.trim();

      if (
        !codigo ||
        !descricao ||
        isSavingCid
      ) {
        return;
      }

      if (
        !activePersonId
      ) {
        trigger(
          "error"
        );

        showToast(
          "Pessoa ativa não identificada.",
          "error"
        );

        return;
      }

      setIsSavingCid(
        true
      );

      trigger(
        "vibrate"
      );

      try {
        const newId =
          await cidsRepository.create({
            codigo,

            descricao,

            person_id:
              activePersonId,
          });

        setCidsSelecionados(
          (
            previous
          ) =>
            previous.includes(
              newId
            )
              ? previous
              : [
                  ...previous,
                  newId,
                ]
        );

        clearError(
          "cids"
        );

        showToast(
          "CID cadastrado",
          "success"
        );

        setIsCreatingCid(
          false
        );

        setNewCidCodigo(
          ""
        );

        setNewCidDescricao(
          ""
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao cadastrar CID:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao cadastrar CID",
          "error"
        );
      } finally {
        setIsSavingCid(
          false
        );
      }
    };

  // ==========================================================
  // VALIDATE
  // ==========================================================

  const validate =
    (): boolean => {
      const newErrors:
        Record<
          string,
          string
        > = {};

      if (
        !activePersonId ||
        !consulta ||
        consulta.person_id !==
          activePersonId
      ) {
        newErrors.person_id =
          "A consulta não pertence à pessoa ativa";
      }

      if (
        !medicoId
      ) {
        newErrors.medicoId =
          "Selecione o médico";
      } else if (
        !selectedMedico
      ) {
        newErrors.medicoId =
          "O médico selecionado não está mais disponível";
      }

      if (
        hospitalId &&
        !selectedHospital
      ) {
        newErrors.hospitalId =
          "O hospital selecionado não está mais disponível";
      }

      if (
        localId &&
        !selectedLocal
      ) {
        newErrors.localId =
          "O local selecionado não está mais disponível";
      }

      if (
        !parseDateToISO(
          dataDisplay
        )
      ) {
        newErrors.data =
          "Informe uma data válida";
      }

      if (
        !isValidTime(
          horario
        )
      ) {
        newErrors.horario =
          "Horário inválido (use HH:MM)";
      }

      if (
        tratamentosSelecionados.some(
          (
            tratamentoId
          ) =>
            !allowedTratamentoIds.has(
              tratamentoId
            )
        )
      ) {
        newErrors.tratamentos =
          "Há um tratamento selecionado que não pertence à pessoa ativa";
      }

      if (
        cidsSelecionados.some(
          (
            cidId
          ) =>
            !allowedCidIds.has(
              cidId
            )
        )
      ) {
        newErrors.cids =
          "Há um CID selecionado que não pertence à pessoa ativa";
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
          "Revise os campos antes de salvar.",
          "error"
        );

        return;
      }

      if (
        !id ||
        !activePersonId ||
        !consulta ||
        consulta.person_id !==
          activePersonId
      ) {
        trigger(
          "error"
        );

        showToast(
          "Não foi possível validar a consulta para a pessoa ativa.",
          "error"
        );

        return;
      }

      if (
        !selectedMedico
      ) {
        trigger(
          "error"
        );

        showToast(
          "O médico selecionado não foi encontrado.",
          "error"
        );

        return;
      }

      if (
        hospitalId &&
        !selectedHospital
      ) {
        trigger(
          "error"
        );

        showToast(
          "O hospital selecionado não foi encontrado.",
          "error"
        );

        return;
      }

      if (
        localId &&
        !selectedLocal
      ) {
        trigger(
          "error"
        );

        showToast(
          "O local selecionado não foi encontrado.",
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
              parseDateToISO(
                dataDisplay
              );

            if (
              !dataISO
            ) {
              throw new Error(
                "Data inválida"
              );
            }

            /*
             * Segunda sanitização imediatamente antes do save.
             *
             * Mesmo que o estado tenha ficado obsoleto durante
             * a edição, nenhum tratamento/CID de outra pessoa
             * consegue retornar ao registro.
             */
            const safeTratamentoIds =
              sanitizeSelectedIds(
                tratamentosSelecionados,
                allowedTratamentoIds
              );

            const safeCidIds =
              sanitizeSelectedIds(
                cidsSelecionados,
                allowedCidIds
              );

            await updateConsulta(
              id,
              {
                /*
                 * Mantemos os campos desnormalizados
                 * sincronizados com medico_id.
                 *
                 * Trocar o médico não pode deixar nome ou
                 * especialidade antigos gravados na Consulta.
                 */
                medico_id:
                  medicoId,

                medico:
                  selectedMedico.nome,

                especialidade:
                  selectedMedico.especialidade ||
                  "Geral",

                hospital_id:
                  hospitalId ||
                  undefined,

                local_id:
                  localId ||
                  undefined,

                data:
                  dataISO,

                horario:
                  horario ||
                  undefined,

                status,

                motivo:
                  motivo.trim() ||
                  undefined,

                observacoes:
                  observacoes.trim() ||
                  undefined,

                tratamento_ids:
                  safeTratamentoIds.length >
                  0
                    ? safeTratamentoIds
                    : undefined,

                cid_ids:
                  safeCidIds.length >
                  0
                    ? safeCidIds
                    : undefined,
              }
            );
          } finally {
            isSubmitLocked.current =
              false;
          }
        },
        {
          successMessage:
            "Consulta atualizada com sucesso",

          errorMessage:
            "Erro ao atualizar consulta",

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
    !consulta
  ) {
    return null;
  }

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
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  router.replace(
                    `/saude/consultas/detalhes?id=${id}`
                  );
                }
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar para detalhes"
            >
              <ArrowLeft
                size={
                  18
                }
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Stethoscope
                  size={
                    16
                  }
                  className="text-ice"
                />

                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Edição
                </p>
              </div>

              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Editar Consulta
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {errors.person_id && (
            <div className="rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3">
              <p className="text-xs text-coral">
                {
                  errors.person_id
                }
              </p>
            </div>
          )}

          {/* ==================================================
              TRATAMENTOS / CIDS
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.01,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Activity
                  size={
                    16
                  }
                  className="shrink-0 text-violet-400"
                />

                <label className="text-sm font-semibold text-ink-primary">
                  Tratamentos e CIDs Relacionados
                </label>
              </div>

              {(tratamentosSelecionados.length >
                0 ||
                cidsSelecionados.length >
                  0) && (
                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setTratamentosSelecionados(
                        []
                      );

                      setCidsSelecionados(
                        []
                      );

                      clearError(
                        "tratamentos"
                      );

                      clearError(
                        "cids"
                      );
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                  aria-label="Limpar todos"
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

            {errors.tratamentos && (
              <p className="mb-2 text-xs text-coral">
                {
                  errors.tratamentos
                }
              </p>
            )}

            {errors.cids && (
              <p className="mb-2 text-xs text-coral">
                {
                  errors.cids
                }
              </p>
            )}

            {tratamentosSelecionados.length >
              0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {tratamentosSelecionados.map(
                  (
                    tratamentoId
                  ) => {
                    const tratamento =
                      scopedTratamentos.find(
                        (
                          item
                        ) =>
                          item.id ===
                          tratamentoId
                      );

                    if (
                      !tratamento
                    ) {
                      return null;
                    }

                    const IconComp =
                      getTratamentoIcon(
                        tratamento.nome
                      );

                    return (
                      <div
                        key={
                          tratamentoId
                        }
                        className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5"
                      >
                        <IconComp
                          size={
                            14
                          }
                          className="text-violet-400"
                        />

                        <span className="text-xs font-medium text-violet-300">
                          {
                            tratamento.nome
                          }
                        </span>

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

                              setTratamentosSelecionados(
                                (
                                  previous
                                ) =>
                                  previous.filter(
                                    (
                                      item
                                    ) =>
                                      item !==
                                      tratamentoId
                                  )
                              );

                              clearError(
                                "tratamentos"
                              );
                            }
                          }
                          className="ml-1 text-violet-400/60 transition-colors hover:text-coral"
                          aria-label={`Remover ${tratamento.nome}`}
                        >
                          <X
                            size={
                              14
                            }
                          />
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {cidsSelecionados.length >
              0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {cidsSelecionados.map(
                  (
                    cidId
                  ) => {
                    const cid =
                      scopedCids.find(
                        (
                          item
                        ) =>
                          item.id ===
                          cidId
                      );

                    if (
                      !cid
                    ) {
                      return null;
                    }

                    const theme =
                      getClinicalTheme(
                        cid.descricao ||
                          cid.codigo
                      );

                    const IconComp =
                      theme.icon;

                    return (
                      <div
                        key={
                          cidId
                        }
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${theme.tagClass}`}
                      >
                        <IconComp
                          size={
                            14
                          }
                        />

                        <span className="text-xs font-medium">
                          {
                            cid.codigo
                          }
                        </span>

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

                              setCidsSelecionados(
                                (
                                  previous
                                ) =>
                                  previous.filter(
                                    (
                                      item
                                    ) =>
                                      item !==
                                      cidId
                                  )
                              );

                              clearError(
                                "cids"
                              );
                            }
                          }
                          className="ml-1 text-current/60 transition-colors hover:text-coral"
                          aria-label={`Remover ${cid.codigo}`}
                        >
                          <X
                            size={
                              14
                            }
                          />
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setIsTratamentoModalOpen(
                      true
                    );
                  }
                }
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-4 py-3 text-violet-300 transition-colors hover:bg-violet-400/10"
              >
                <Plus
                  size={
                    16
                  }
                />

                <span className="text-sm font-medium">
                  Vincular Tratamento
                </span>
              </button>

              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setIsCidModalOpen(
                      true
                    );
                  }
                }
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-emerald-300 transition-colors hover:bg-emerald-400/10"
              >
                <Plus
                  size={
                    16
                  }
                />

                <span className="text-sm font-medium">
                  Vincular CID
                </span>
              </button>
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
                0.02,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-primary">
                Médico{" "}
                <span className="text-coral">
                  *
                </span>
              </label>

              {medicoId &&
                selectedMedico && (
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

                        clearError(
                          "medicoId"
                        );
                      }
                    }
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
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setIsMedicoModalOpen(
                    true
                  );
                }
              }
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                errors.medicoId
                  ? "border-coral/50"
                  : "border-surface-border/50"
              } bg-surface-raised`}
              aria-label="Selecionar médico"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <UserCheck
                  size={
                    16
                  }
                  className="shrink-0 text-ice"
                />

                <span className="truncate text-ink-primary">
                  {selectedMedico
                    ? `Dr(a). ${selectedMedico.nome} (${selectedMedico.especialidade || "Geral"})`
                    : "Selecionar médico"}
                </span>
              </div>
            </button>

            {errors.medicoId && (
              <p className="ml-1 mt-1 text-xs text-coral">
                {
                  errors.medicoId
                }
              </p>
            )}
          </motion.div>

          {/* ==================================================
              HOSPITAL / LOCAL
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
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-ink-primary">
                  Hospital
                </label>

                {hospitalId &&
                  selectedHospital && (
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

                          clearError(
                            "hospitalId"
                          );
                        }
                      }
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
                className={`flex w-full items-center justify-between rounded-2xl border bg-surface-raised px-4 py-3 text-left text-ink-primary ${
                  errors.hospitalId
                    ? "border-coral/50"
                    : "border-surface-border/50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Building2
                    size={
                      16
                    }
                    className="shrink-0 text-violet-400"
                  />

                  <span className="truncate">
                    {selectedHospital
                      ? selectedHospital.nome
                      : "Vincular hospital..."}
                  </span>
                </div>
              </button>

              {errors.hospitalId && (
                <p className="ml-1 mt-1 text-xs text-coral">
                  {
                    errors.hospitalId
                  }
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-ink-primary">
                  Clínica / Posto
                </label>

                {localId &&
                  selectedLocal && (
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

                          clearError(
                            "localId"
                          );
                        }
                      }
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
                className={`flex w-full items-center justify-between rounded-2xl border bg-surface-raised px-4 py-3 text-left text-ink-primary ${
                  errors.localId
                    ? "border-coral/50"
                    : "border-surface-border/50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <MapPin
                    size={
                      16
                    }
                    className="shrink-0 text-emerald-400"
                  />

                  <span className="truncate">
                    {selectedLocal
                      ? selectedLocal.nome
                      : "Vincular local..."}
                  </span>
                </div>
              </button>

              {errors.localId && (
                <p className="ml-1 mt-1 text-xs text-coral">
                  {
                    errors.localId
                  }
                </p>
              )}
            </div>
          </motion.div>

          {/* ==================================================
              DATA / HORA / STATUS
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">
                  Data{" "}
                  <span className="text-coral">
                    *
                  </span>
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
                    inputMode="numeric"
                    placeholder="DD/MM/AAAA"
                    maxLength={
                      10
                    }
                    value={
                      dataDisplay
                    }
                    onChange={
                      (
                        event
                      ) => {
                        setDataDisplay(
                          handleDateMask(
                            event.target.value
                          )
                        );

                        clearError(
                          "data"
                        );
                      }
                    }
                    className={`w-full rounded-2xl border ${
                      errors.data
                        ? "border-coral/50"
                        : "border-surface-border/50"
                    } bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none focus:border-ice/50`}
                    aria-label="Data da consulta"
                  />
                </div>

                {errors.data && (
                  <p className="ml-1 text-xs text-coral">
                    {
                      errors.data
                    }
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">
                  Horário
                </label>

                <div className="relative">
                  <Clock
                    size={
                      16
                    }
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  />

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="00:00"
                    maxLength={
                      5
                    }
                    value={
                      horario
                    }
                    onChange={
                      (
                        event
                      ) => {
                        setHorario(
                          handleTimeMask(
                            event.target.value
                          )
                        );

                        clearError(
                          "horario"
                        );
                      }
                    }
                    className={`w-full rounded-2xl border ${
                      errors.horario
                        ? "border-coral/50 text-coral"
                        : "border-surface-border/50 text-ink-primary"
                    } bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm outline-none focus:border-ice/50`}
                    aria-label="Horário"
                  />
                </div>

                {errors.horario && (
                  <p className="ml-1 text-xs text-coral">
                    {
                      errors.horario
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 border-t border-surface-border/30 pt-2">
              <label className="text-sm font-medium text-ink-primary">
                Status
              </label>

              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    "agendada",
                    "realizada",
                    "cancelada",
                  ] as const
                ).map(
                  (
                    item
                  ) => (
                    <button
                      key={
                        item
                      }
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setStatus(
                            item
                          );
                        }
                      }
                      className={`rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        status ===
                        item
                          ? "bg-ice text-void shadow-sm"
                          : "border border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                      aria-pressed={
                        status ===
                        item
                      }
                    >
                      {
                        item
                      }
                    </button>
                  )
                )}
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              MOTIVO
              ================================================== */}

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
            <Input
              label="Motivo / Assunto"
              placeholder="Ex: Retorno..."
              value={
                motivo
              }
              onChange={
                (
                  event
                ) =>
                  setMotivo(
                    event.target.value
                  )
              }
            />
          </motion.div>

          {/* ==================================================
              OBS
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
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Anotações"
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
              placeholder="Instruções do médico..."
            />
          </motion.div>
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
              !activePersonId
            }
          >
            {isSubmitting ? (
              <>
                <Loader2
                  size={
                    16
                  }
                  className="animate-spin"
                />

                Salvando...
              </>
            ) : (
              <>
                <Save
                  size={
                    16
                  }
                />

                Salvar Alterações
              </>
            )}
          </Button>
        </div>

        {/* ====================================================
            MÉDICO
            ==================================================== */}

        <SelectionModal<Medico>
          isOpen={
            isMedicoModalOpen
          }
          onClose={
            () =>
              setIsMedicoModalOpen(
                false
              )
          }
          onSelect={
            (
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

              clearError(
                "medicoId"
              );

              setIsMedicoModalOpen(
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
              setIsMedicoModalOpen(
                false
              );

              router.push(
                "/saude/medicos/novo"
              );
            }
          }
          createNewLabel="Cadastrar Médico"
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

              clearError(
                "hospitalId"
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
          createNewLabel="Cadastrar Hospital"
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

              clearError(
                "localId"
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
          createNewLabel="Cadastrar Local"
        />

        {/* ====================================================
            TRATAMENTO
            ==================================================== */}

        <SelectionModal<Tratamento>
          isOpen={
            isTratamentoModalOpen
          }
          onClose={
            () =>
              setIsTratamentoModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              if (
                !item.id ||
                item.person_id !==
                  activePersonId
              ) {
                return;
              }

              trigger(
                "vibrate"
              );

              setTratamentosSelecionados(
                (
                  previous
                ) =>
                  previous.includes(
                    item.id!
                  )
                    ? previous
                    : [
                        ...previous,
                        item.id!,
                      ]
              );

              clearError(
                "tratamentos"
              );
            }
          }
          items={
            scopedTratamentos
          }
          title="Vincular Tratamentos"
          placeholder="Buscar tratamento..."
          renderItem={
            (
              item
            ) => {
              const IconComp =
                getTratamentoIcon(
                  item.nome
                );

              const isSelected =
                Boolean(
                  item.id &&
                    tratamentosSelecionados.includes(
                      item.id
                    )
                );

              return (
                <div className="flex w-full items-center gap-2">
                  <IconComp
                    size={
                      16
                    }
                    className="text-violet-400"
                  />

                  <span
                    className={`text-sm font-medium ${
                      isSelected
                        ? "text-violet-400"
                        : "text-ink-primary"
                    }`}
                  >
                    {
                      item.nome
                    }
                  </span>

                  {isSelected && (
                    <Check
                      size={
                        14
                      }
                      className="ml-auto text-emerald-400"
                    />
                  )}
                </div>
              );
            }
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
              setIsTratamentoModalOpen(
                false
              );

              setIsCreatingTratamento(
                true
              );
            }
          }
          createNewLabel="Cadastrar Novo Tratamento"
        />

        {/* ====================================================
            CID
            ==================================================== */}

        <SelectionModal<Cid>
          isOpen={
            isCidModalOpen
          }
          onClose={
            () =>
              setIsCidModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              if (
                !item.id ||
                item.person_id !==
                  activePersonId
              ) {
                return;
              }

              trigger(
                "vibrate"
              );

              setCidsSelecionados(
                (
                  previous
                ) =>
                  previous.includes(
                    item.id!
                  )
                    ? previous
                    : [
                        ...previous,
                        item.id!,
                      ]
              );

              clearError(
                "cids"
              );
            }
          }
          items={
            scopedCids
          }
          title="Vincular CIDs"
          placeholder="Buscar CID..."
          renderItem={
            (
              item
            ) => {
              const theme =
                getClinicalTheme(
                  item.descricao ||
                    item.codigo
                );

              const IconComp =
                theme.icon;

              const isSelected =
                Boolean(
                  item.id &&
                    cidsSelecionados.includes(
                      item.id
                    )
                );

              return (
                <div className="flex w-full items-center gap-2">
                  <IconComp
                    size={
                      16
                    }
                    className={
                      theme.textClass
                    }
                  />

                  <span
                    className={`text-sm font-medium ${
                      isSelected
                        ? theme.textClass
                        : "text-ink-primary"
                    }`}
                  >
                    {
                      item.codigo
                    }{" "}
                    -{" "}
                    {
                      item.descricao
                    }
                  </span>

                  {isSelected && (
                    <Check
                      size={
                        14
                      }
                      className="ml-auto text-emerald-400"
                    />
                  )}
                </div>
              );
            }
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
              `${item.codigo} - ${item.descricao}`
          }
          onCreateNew={
            () => {
              setIsCidModalOpen(
                false
              );

              setIsCreatingCid(
                true
              );
            }
          }
          createNewLabel="Cadastrar Novo CID"
        />

        {/* ====================================================
            QUICK TREATMENT
            ==================================================== */}

        <BottomSheet
          isOpen={
            isCreatingTratamento
          }
          onClose={
            () =>
              setIsCreatingTratamento(
                false
              )
          }
          title="Novo Tratamento"
        >
          <div className="space-y-4 px-1 pb-2">
            <Input
              label="Nome do Tratamento"
              value={
                newTratamentoName
              }
              onChange={
                (
                  event
                ) =>
                  setNewTratamentoName(
                    event.target.value
                  )
              }
              autoFocus
            />

            <Button
              variant="primary"
              fullWidth
              onClick={
                handleCreateTratamento
              }
              disabled={
                !newTratamentoName.trim() ||
                isSavingTratamento ||
                !activePersonId
              }
            >
              {isSavingTratamento ? (
                <Loader2
                  size={
                    16
                  }
                  className="animate-spin"
                />
              ) : (
                "Salvar e Selecionar"
              )}
            </Button>
          </div>
        </BottomSheet>

        {/* ====================================================
            QUICK CID
            ==================================================== */}

        <BottomSheet
          isOpen={
            isCreatingCid
          }
          onClose={
            () =>
              setIsCreatingCid(
                false
              )
          }
          title="Novo CID"
        >
          <div className="space-y-4 px-1 pb-2">
            <Input
              label="Código CID"
              placeholder="Ex: F90.0"
              value={
                newCidCodigo
              }
              onChange={
                (
                  event
                ) =>
                  setNewCidCodigo(
                    event.target.value
                  )
              }
              autoFocus
            />

            <Input
              label="Descrição"
              placeholder="Ex: Transtorno de déficit de atenção"
              value={
                newCidDescricao
              }
              onChange={
                (
                  event
                ) =>
                  setNewCidDescricao(
                    event.target.value
                  )
              }
            />

            <Button
              variant="primary"
              fullWidth
              onClick={
                handleCreateCid
              }
              disabled={
                !newCidCodigo.trim() ||
                !newCidDescricao.trim() ||
                isSavingCid ||
                !activePersonId
              }
            >
              {isSavingCid ? (
                <Loader2
                  size={
                    16
                  }
                  className="animate-spin"
                />
              ) : (
                "Salvar e Selecionar"
              )}
            </Button>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function EditarConsultaPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <EditarConsultaContent />
    </Suspense>
  );
}