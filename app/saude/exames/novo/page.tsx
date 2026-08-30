// app/saude/exames/novo/page.tsx
"use client";

import {
  useRef,
  useState,
} from "react";
import {
  useRouter,
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
  Camera,
  Clock,
  Eraser,
  Flame,
  HeartPulse,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  useHapticFeedback,
} from "@/lib/haptics";
import {
  getClinicalTheme,
} from "@/lib/health-utils";
import {
  uploadFile,
} from "@/lib/supabase/storage";
import {
  cidsRepository,
} from "@/lib/repositories/cids";

import {
  useAuth,
} from "@/hooks/useAuth";
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
  useSubmitAction,
} from "@/hooks/useSubmitAction";
import {
  useTratamentos,
} from "@/hooks/useTratamentos";

import {
  useToast,
} from "@/components/ToastProvider";
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
  BottomSheet,
} from "@/components/ui/BottomSheet";

import type {
  Attachment,
  Cid,
  LocalSaude,
  Medico,
  Tratamento,
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

function getTodayISO(): string {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function formatDateToDisplay(
  isoStr: string
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
  if (!value) {
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

// ============================================================
// PAGE
// ============================================================

export default function NovoExamePage() {
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

  /*
   * Auth é necessário somente para uploadFile().
   * CRUD do exame não recebe user_id.
   */
  const {
    user,
  } =
    useAuth();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    addExame,
  } =
    useExames();

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

  const {
    addTratamento,
  } =
    useTratamentos();

  const {
    run,
    isSubmitting,
  } =
    useSubmitAction();

  const isSubmitLocked =
    useRef(false);

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const cameraInputRef =
    useRef<HTMLInputElement>(
      null
    );

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    nomesExames,
    setNomesExames,
  ] =
    useState("");

  const [
    localRealizacao,
    setLocalRealizacao,
  ] =
    useState("");

  const [
    localId,
    setLocalId,
  ] =
    useState("");

  const [
    medicoSolicitante,
    setMedicoSolicitante,
  ] =
    useState("");

  const [
    medicoId,
    setMedicoId,
  ] =
    useState("");

  const [
    dataSolicitacaoDisplay,
    setDataSolicitacaoDisplay,
  ] =
    useState(
      formatDateToDisplay(
        getTodayISO()
      )
    );

  const [
    horario,
    setHorario,
  ] =
    useState("");

  const [
    dataRetornoDisplay,
    setDataRetornoDisplay,
  ] =
    useState("");

  const [
    motivo,
    setMotivo,
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
    attachment,
    setAttachment,
  ] =
    useState<Attachment | null>(
      null
    );

  const [
    localFile,
    setLocalFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    isDoctorModalOpen,
    setIsDoctorModalOpen,
  ] =
    useState(false);

  const [
    isLocalModalOpen,
    setIsLocalModalOpen,
  ] =
    useState(false);

  const [
    isCreatingDoctor,
    setIsCreatingDoctor,
  ] =
    useState(false);

  const [
    newDocName,
    setNewDocName,
  ] =
    useState("");

  const [
    newDocEspecialidade,
    setNewDocEspecialidade,
  ] =
    useState("");

  const [
    isCreatingLocal,
    setIsCreatingLocal,
  ] =
    useState(false);

  const [
    newLocalName,
    setNewLocalName,
  ] =
    useState("");

  // ==========================================================
  // PERSON RELATIONS
  // ==========================================================

  const tratamentos =
    useLiveQuery<Tratamento[]>(
      async () => {
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
      ]
    ) ?? [];

  const cids =
    useLiveQuery<Cid[]>(
      async () => {
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
      ]
    ) ?? [];

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
    useState(false);

  const [
    isCidModalOpen,
    setIsCidModalOpen,
  ] =
    useState(false);

  const [
    isCreatingTratamento,
    setIsCreatingTratamento,
  ] =
    useState(false);

  const [
    newTratamentoName,
    setNewTratamentoName,
  ] =
    useState("");

  const [
    isSavingTratamento,
    setIsSavingTratamento,
  ] =
    useState(false);

  const [
    isCreatingCid,
    setIsCreatingCid,
  ] =
    useState(false);

  const [
    newCidCodigo,
    setNewCidCodigo,
  ] =
    useState("");

  const [
    newCidDescricao,
    setNewCidDescricao,
  ] =
    useState("");

  const [
    isSavingCid,
    setIsSavingCid,
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

  const clearError =
    (
      key: string
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
  // ATTACHMENT
  // ==========================================================

  const handleFileSelect =
    (
      event:
        React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      if (file) {
        trigger(
          "vibrate"
        );

        if (
          attachment?.url.startsWith(
            "blob:"
          )
        ) {
          URL.revokeObjectURL(
            attachment.url
          );
        }

        setLocalFile(
          file
        );

        setAttachment(
          {
            id:
              crypto.randomUUID(),

            url:
              URL.createObjectURL(
                file
              ),

            name:
              file.name,

            type:
              file.type.startsWith(
                "image"
              )
                ? "image"
                : "pdf",

            uploaded_at:
              new Date().toISOString(),
          }
        );
      }

      event.target.value =
        "";
    };

  const handleCameraCapture =
    (
      event:
        React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      if (file) {
        trigger(
          "vibrate"
        );

        if (
          attachment?.url.startsWith(
            "blob:"
          )
        ) {
          URL.revokeObjectURL(
            attachment.url
          );
        }

        setLocalFile(
          file
        );

        setAttachment(
          {
            id:
              crypto.randomUUID(),

            url:
              URL.createObjectURL(
                file
              ),

            name:
              `exame_${Date.now()}.jpg`,

            type:
              "image",

            uploaded_at:
              new Date().toISOString(),
          }
        );
      }

      event.target.value =
        "";
    };

  const removeAttachment =
    () => {
      if (
        attachment?.url.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          attachment.url
        );
      }

      setAttachment(
        null
      );

      setLocalFile(
        null
      );

      trigger(
        "vibrate"
      );
    };

  // ==========================================================
  // QUICK MEDICO
  // ==========================================================

  const handleCreateDoctor =
    async () => {
      const nome =
        newDocName.trim();

      if (!nome) {
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
                newDocEspecialidade.trim() ||
                "Geral",
            }
          );

        setMedicoId(
          newId
        );

        setMedicoSolicitante(
          nome
        );

        setIsCreatingDoctor(
          false
        );

        setNewDocName(
          ""
        );

        setNewDocEspecialidade(
          ""
        );

        trigger(
          "success"
        );

        showToast(
          "Médico cadastrado",
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao cadastrar médico:",
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
  // QUICK LOCAL
  // ==========================================================

  const handleCreateLocal =
    async () => {
      const nome =
        newLocalName.trim();

      if (!nome) {
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

        setLocalId(
          newId
        );

        setLocalRealizacao(
          nome
        );

        setIsCreatingLocal(
          false
        );

        setNewLocalName(
          ""
        );

        trigger(
          "success"
        );

        showToast(
          "Local cadastrado",
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao cadastrar local:",
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
  // QUICK TRATAMENTO
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
        showToast(
          "Pessoa ativa não identificada.",
          "error"
        );

        trigger(
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
          await addTratamento(
            {
              nome,

              status:
                "ativo",
            }
          );

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

        trigger(
          "success"
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
        showToast(
          "Pessoa ativa não identificada.",
          "error"
        );

        trigger(
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
          await cidsRepository.create(
            {
              person_id:
                activePersonId,

              codigo,

              descricao,
            }
          );

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

        showToast(
          "CID cadastrado",
          "success"
        );

        trigger(
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
      const newErrors: Record<
        string,
        string
      > = {};

      if (
        !activePersonId
      ) {
        newErrors.person =
          "Nenhuma pessoa ativa selecionada";
      }

      const listaExames =
        nomesExames
          .split(
            /,|\n/
          )
          .map(
            (
              item
            ) =>
              item.trim()
          )
          .filter(
            Boolean
          );

      if (
        listaExames.length ===
        0
      ) {
        newErrors.nomes =
          "Informe ao menos um exame";
      }

      if (
        !parseDateToISO(
          dataSolicitacaoDisplay
        )
      ) {
        newErrors.data =
          "Informe uma data válida";
      }

      if (
        dataRetornoDisplay &&
        !parseDateToISO(
          dataRetornoDisplay
        )
      ) {
        newErrors.dataRetorno =
          "Informe uma data de retorno válida";
      }

      if (
        !isValidTime(
          horario
        )
      ) {
        newErrors.horario =
          "Horário inválido (use HH:MM)";
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
  // SAVE
  // ==========================================================

  const handleSave =
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
        !activePersonId
      ) {
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
            const dataSolicitacaoISO =
              parseDateToISO(
                dataSolicitacaoDisplay
              );

            if (
              !dataSolicitacaoISO
            ) {
              throw new Error(
                "Data inválida"
              );
            }

            const dataRetornoISO =
              dataRetornoDisplay
                ? parseDateToISO(
                    dataRetornoDisplay
                  )
                : undefined;

            if (
              dataRetornoDisplay &&
              !dataRetornoISO
            ) {
              throw new Error(
                "Data de retorno inválida"
              );
            }

            const listaExames =
              nomesExames
                .split(
                  /,|\n/
                )
                .map(
                  (
                    item
                  ) =>
                    item.trim()
                )
                .filter(
                  Boolean
                );

            let urlUpload =
              anexoUrl.trim() ||
              undefined;

            if (
              localFile
            ) {
              if (
                !user?.id
              ) {
                throw new Error(
                  "Usuário não autenticado para upload."
                );
              }

              const {
                url,
                error,
              } =
                await uploadFile(
                  user.id,
                  localFile,
                  "saude"
                );

              if (error) {
                throw error;
              }

              if (!url) {
                throw new Error(
                  "Upload concluído sem URL do arquivo."
                );
              }

              urlUpload =
                url;
            }

            const tratamentoIds:
              string[] =
              Array.from(
                new Set<string>(
                  tratamentosSelecionados.filter(
                    (
                      tratamentoId
                    ) =>
                      tratamentos.some(
                        (
                          tratamento
                        ) =>
                          tratamento.id ===
                          tratamentoId
                      )
                  )
                )
              );

            const cidIds:
              string[] =
              Array.from(
                new Set<string>(
                  cidsSelecionados.filter(
                    (
                      cidId
                    ) =>
                      cids.some(
                        (
                          cid
                        ) =>
                          cid.id ===
                          cidId
                      )
                  )
                )
              );

            for (
              const nomeExame of
              listaExames
            ) {
              await addExame(
                {
                  nome:
                    nomeExame,

                  laboratorio:
                    localRealizacao.trim() ||
                    undefined,

                  local_id:
                    localId ||
                    undefined,

                  medico:
                    medicoSolicitante.trim() ||
                    undefined,

                  medico_id:
                    medicoId ||
                    undefined,

                  data:
                    dataSolicitacaoISO,

                  horario:
                    horario ||
                    undefined,

                  data_retorno:
                    dataRetornoISO,

                  motivo:
                    motivo.trim() ||
                    undefined,

                  observacoes:
                    observacoes.trim() ||
                    undefined,

                  anexo_url:
                    urlUpload,

                  tratamento_ids:
                    tratamentoIds.length >
                    0
                      ? tratamentoIds
                      : undefined,

                  cid_ids:
                    cidIds.length >
                    0
                      ? cidIds
                      : undefined,
                }
              );
            }

            if (
              attachment?.url.startsWith(
                "blob:"
              )
            ) {
              URL.revokeObjectURL(
                attachment.url
              );
            }
          } finally {
            isSubmitLocked.current =
              false;
          }
        },
        {
          successMessage:
            "Exame(s) cadastrado(s)",

          errorMessage:
            "Erro ao salvar exame(s)",

          goBackOnSuccess:
            true,
        }
      );
    };

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input
          ref={
            fileInputRef
          }
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={
            handleFileSelect
          }
        />

        <input
          ref={
            cameraInputRef
          }
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={
            handleCameraCapture
          }
        />

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

            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Cadastrar Exames
              </h1>

              <p className="text-xs text-ink-muted">
                Múltiplos registros e laudos
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {!activePersonId && (
            <div className="rounded-[24px] border border-coral/30 bg-coral/10 p-4">
              <p className="text-sm font-semibold text-coral">
                Pessoa ativa não identificada
              </p>

              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Selecione uma pessoa no Vault antes de cadastrar exames.
              </p>
            </div>
          )}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
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
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    setTratamentosSelecionados(
                      []
                    );

                    setCidsSelecionados(
                      []
                    );
                  }}
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

            {tratamentosSelecionados.length >
              0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {tratamentosSelecionados.map(
                  (
                    tratamentoId
                  ) => {
                    const tratamento =
                      tratamentos.find(
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

                    const Icon =
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
                        <Icon
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
                          onClick={() => {
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
                          }}
                          className="ml-1 text-violet-400/60 hover:text-coral"
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
                      cids.find(
                        (
                          item
                        ) =>
                          item.id ===
                          cidId
                      );

                    if (!cid) {
                      return null;
                    }

                    const theme =
                      getClinicalTheme(
                        cid.descricao ||
                          cid.codigo
                      );

                    const Icon =
                      theme.icon;

                    return (
                      <div
                        key={
                          cidId
                        }
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${theme.tagClass}`}
                      >
                        <Icon
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
                          onClick={() => {
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
                          }}
                          className="ml-1 text-current/60 hover:text-coral"
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
                disabled={
                  !activePersonId
                }
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsTratamentoModalOpen(
                    true
                  );
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-4 py-3 text-violet-300 disabled:opacity-40"
              >
                <Plus
                  size={
                    16
                  }
                />

                Vincular Tratamento
              </button>

              <button
                type="button"
                disabled={
                  !activePersonId
                }
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsCidModalOpen(
                    true
                  );
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-emerald-300 disabled:opacity-40"
              >
                <Plus
                  size={
                    16
                  }
                />

                Vincular CID
              </button>
            </div>
          </motion.div>

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
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div>
              <TextArea
                label="Nome do(s) Exame(s) *"
                placeholder="Ex: Hemograma, Glicemia..."
                value={
                  nomesExames
                }
                onChange={(
                  event
                ) => {
                  setNomesExames(
                    event.target.value
                  );

                  clearError(
                    "nomes"
                  );
                }}
                required
              />

              {errors.nomes && (
                <p className="mt-1 text-xs text-coral">
                  {
                    errors.nomes
                  }
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-ink-primary">
                  Laboratório / Local
                </label>

                {(localId ||
                  localRealizacao) && (
                    <button
                      type="button"
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        setLocalId(
                          ""
                        );

                        setLocalRealizacao(
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
                className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
              >
                <span className="truncate">
                  {localRealizacao ||
                    "Selecionar laboratório ou local"}
                </span>

                <Building2
                  size={
                    16
                  }
                  className="shrink-0 text-ink-muted"
                />
              </button>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-ink-primary">
                  Médico Solicitante
                </label>

                {(medicoId ||
                  medicoSolicitante) && (
                    <button
                      type="button"
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        setMedicoId(
                          ""
                        );

                        setMedicoSolicitante(
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

                  setIsDoctorModalOpen(
                    true
                  );
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
              >
                <span className="truncate">
                  {medicoSolicitante ||
                    "Selecionar médico"}
                </span>

                <Stethoscope
                  size={
                    16
                  }
                  className="shrink-0 text-ink-muted"
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink-primary">
                  Data da Coleta{" "}
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
                      dataSolicitacaoDisplay
                    }
                    onChange={(
                      event
                    ) => {
                      setDataSolicitacaoDisplay(
                        handleDateMask(
                          event.target.value
                        )
                      );

                      clearError(
                        "data"
                      );
                    }}
                    className={`w-full rounded-2xl border ${
                      errors.data
                        ? "border-coral/50"
                        : "border-surface-border/50"
                    } bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none`}
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
                <label className="text-sm font-medium text-ink-primary">
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
                    onChange={(
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
                    }}
                    className={`w-full rounded-2xl border ${
                      errors.horario
                        ? "border-coral/50 text-coral"
                        : "border-surface-border/50 text-ink-primary"
                    } bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm outline-none`}
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
                Data Previsão / Retorno
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
                    dataRetornoDisplay
                  }
                  onChange={(
                    event
                  ) => {
                    setDataRetornoDisplay(
                      handleDateMask(
                        event.target.value
                      )
                    );

                    clearError(
                      "dataRetorno"
                    );
                  }}
                  className={`w-full rounded-2xl border ${
                    errors.dataRetorno
                      ? "border-coral/50"
                      : "border-surface-border/50"
                  } bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none`}
                />
              </div>

              {errors.dataRetorno && (
                <p className="ml-1 text-xs text-coral">
                  {
                    errors.dataRetorno
                  }
                </p>
              )}
            </div>

            <Input
              label="Motivo da Solicitação"
              placeholder="Ex: Rotina anual, investigação..."
              value={
                motivo
              }
              onChange={(
                event
              ) =>
                setMotivo(
                  event.target.value
                )
              }
            />

            <TextArea
              label="Observações / Resultados"
              placeholder="Adicione notas sobre os resultados..."
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

            <Input
              label="Link Externo (URL)"
              placeholder="https://..."
              value={
                anexoUrl
              }
              onChange={(
                event
              ) =>
                setAnexoUrl(
                  event.target.value
                )
              }
            />

            <div className="border-t border-surface-border/30 pt-2">
              <label className="mb-2 block text-sm font-medium text-ink-primary">
                Laudo / Anexo
              </label>

              {!attachment ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                  >
                    <Upload
                      size={
                        16
                      }
                    />

                    Arquivo
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() =>
                      cameraInputRef.current?.click()
                    }
                  >
                    <Camera
                      size={
                        16
                      }
                    />

                    Câmera
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3">
                  <ImageIcon
                    size={
                      16
                    }
                    className="shrink-0 text-ice"
                  />

                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink-primary">
                    {
                      attachment.name
                    }
                  </p>

                  <button
                    type="button"
                    onClick={
                      removeAttachment
                    }
                    className="text-ink-muted hover:text-coral"
                  >
                    <X
                      size={
                        14
                      }
                    />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={
              handleSave
            }
            disabled={
              isSubmitting ||
              !activePersonId
            }
            className="flex items-center justify-center gap-2"
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
              : "Salvar Exame(s)"}
          </Button>
        </div>

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

            setLocalRealizacao(
              item.nome
            );

            setIsLocalModalOpen(
              false
            );
          }}
          items={
            locais
          }
          title="Selecionar Hospital / Laboratório"
          placeholder="Buscar local..."
          renderItem={(
            item
          ) => (
            <p className="font-medium text-ink-primary">
              {
                item.nome
              }
            </p>
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

        <SelectionModal<Medico>
          isOpen={
            isDoctorModalOpen
          }
          onClose={() =>
            setIsDoctorModalOpen(
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

            setMedicoSolicitante(
              item.nome
            );

            setIsDoctorModalOpen(
              false
            );
          }}
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
            setIsDoctorModalOpen(
              false
            );

            setIsCreatingDoctor(
              true
            );
          }}
          createNewLabel="Cadastrar Novo Médico"
        />

        <SelectionModal<Tratamento>
          isOpen={
            isTratamentoModalOpen
          }
          onClose={() =>
            setIsTratamentoModalOpen(
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
          }}
          items={
            tratamentos
          }
          title="Vincular Tratamentos"
          placeholder="Buscar tratamento..."
          renderItem={(
            item
          ) => {
            const Icon =
              getTratamentoIcon(
                item.nome
              );

            const selected =
              Boolean(
                item.id &&
                  tratamentosSelecionados.includes(
                    item.id
                  )
              );

            return (
              <div className="flex w-full items-center gap-2">
                <Icon
                  size={
                    16
                  }
                  className="text-violet-400"
                />

                <span
                  className={`text-sm font-medium ${
                    selected
                      ? "text-violet-400"
                      : "text-ink-primary"
                  }`}
                >
                  {
                    item.nome
                  }
                </span>

                {selected && (
                  <span className="ml-auto text-[10px] text-emerald-400">
                    Selecionado
                  </span>
                )}
              </div>
            );
          }}
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
            setIsTratamentoModalOpen(
              false
            );

            setIsCreatingTratamento(
              true
            );
          }}
          createNewLabel="Cadastrar Novo Tratamento"
        />

        <SelectionModal<Cid>
          isOpen={
            isCidModalOpen
          }
          onClose={() =>
            setIsCidModalOpen(
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
          }}
          items={
            cids
          }
          title="Vincular CIDs"
          placeholder="Buscar CID..."
          renderItem={(
            item
          ) => {
            const theme =
              getClinicalTheme(
                item.descricao ||
                  item.codigo
              );

            const Icon =
              theme.icon;

            const selected =
              Boolean(
                item.id &&
                  cidsSelecionados.includes(
                    item.id
                  )
              );

            return (
              <div className="flex w-full items-center gap-2">
                <Icon
                  size={
                    16
                  }
                  className={
                    theme.textClass
                  }
                />

                <span
                  className={`text-sm font-medium ${
                    selected
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

                {selected && (
                  <span className="ml-auto text-[10px] text-emerald-400">
                    Selecionado
                  </span>
                )}
              </div>
            );
          }}
          getItemId={(
            item
          ) =>
            item.id!
          }
          getItemLabel={(
            item
          ) =>
            `${item.codigo} - ${item.descricao}`
          }
          onCreateNew={() => {
            setIsCidModalOpen(
              false
            );

            setIsCreatingCid(
              true
            );
          }}
          createNewLabel="Cadastrar Novo CID"
        />

        <BottomSheet
          isOpen={
            isCreatingTratamento
          }
          onClose={() =>
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
              onChange={(
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

        <BottomSheet
          isOpen={
            isCreatingDoctor
          }
          onClose={() =>
            setIsCreatingDoctor(
              false
            )
          }
          title="Novo Médico"
        >
          <div className="space-y-4 px-1 pb-2">
            <Input
              label="Nome"
              value={
                newDocName
              }
              onChange={(
                event
              ) =>
                setNewDocName(
                  event.target.value
                )
              }
              autoFocus
            />

            <Input
              label="Especialidade"
              value={
                newDocEspecialidade
              }
              onChange={(
                event
              ) =>
                setNewDocEspecialidade(
                  event.target.value
                )
              }
            />

            <Button
              variant="primary"
              fullWidth
              onClick={
                handleCreateDoctor
              }
              disabled={
                !newDocName.trim()
              }
            >
              Salvar e Selecionar
            </Button>
          </div>
        </BottomSheet>

        <BottomSheet
          isOpen={
            isCreatingLocal
          }
          onClose={() =>
            setIsCreatingLocal(
              false
            )
          }
          title="Novo Local"
        >
          <div className="space-y-4 px-1 pb-2">
            <Input
              label="Nome"
              value={
                newLocalName
              }
              onChange={(
                event
              ) =>
                setNewLocalName(
                  event.target.value
                )
              }
              autoFocus
            />

            <Button
              variant="primary"
              fullWidth
              onClick={
                handleCreateLocal
              }
              disabled={
                !newLocalName.trim()
              }
            >
              Salvar e Selecionar
            </Button>
          </div>
        </BottomSheet>

        <BottomSheet
          isOpen={
            isCreatingCid
          }
          onClose={() =>
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
              onChange={(
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
              value={
                newCidDescricao
              }
              onChange={(
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