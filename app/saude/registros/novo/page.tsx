// app/saude/registros/novo/page.tsx
"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eraser,
  Loader2,
  Pill,
  Plus,
  X,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  getClinicalTheme,
  getRegistroTheme,
} from "@/lib/health-utils";

import {
  analisarRegistroSaude,
} from "@/lib/health-insights";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useRegistrosSaude,
} from "@/hooks/useRegistrosSaude";

import {
  useTratamentos,
} from "@/hooks/useTratamentos";

import {
  useCids,
} from "@/hooks/useCids";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

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
  BottomSheet,
} from "@/components/ui/BottomSheet";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  SelectionModal,
} from "@/components/SelectionModal";

import {
  useToast,
} from "@/components/ToastProvider";

import type {
  CategoriaRegistro,
  Cid,
  Medicamento,
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
// PRESETS
// ============================================================

const TIPOS_PREDEFINIDOS = [
  {
    categoria:
      "medicao" as CategoriaRegistro,

    tipo:
      "pressao_arterial",

    nome:
      "Pressão Arterial",

    placeholder:
      "Ex: 120/80",
  },

  {
    categoria:
      "medicao" as CategoriaRegistro,

    tipo:
      "glicemia",

    nome:
      "Glicemia",

    placeholder:
      "Ex: 99",
  },

  {
    categoria:
      "medicao" as CategoriaRegistro,

    tipo:
      "temperatura",

    nome:
      "Temperatura",

    placeholder:
      "Ex: 36.5",
  },

  {
    categoria:
      "sintoma" as CategoriaRegistro,

    tipo:
      "dor",

    nome:
      "Dor / Desconforto",

    placeholder:
      "Ex: Dor de cabeça",
  },

  {
    categoria:
      "sintoma" as CategoriaRegistro,

    tipo:
      "ansiedade",

    nome:
      "Ansiedade / Humor",

    placeholder:
      "Ex: Crise / Agitação",
  },

  {
    categoria:
      "sintoma" as CategoriaRegistro,

    tipo:
      "apatia",

    nome:
      "Apatia / Fadiga",

    placeholder:
      "Ex: Cansaço extremo",
  },
];

// ============================================================
// HELPERS DE DATA
// ============================================================

function parseDateToISO(
  displayStr: string
): string {
  const clean =
    displayStr.replace(
      /\D/g,
      ""
    );

  if (
    clean.length !== 8
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
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
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

  return [
    String(year).padStart(
      4,
      "0"
    ),

    String(month).padStart(
      2,
      "0"
    ),

    String(day).padStart(
      2,
      "0"
    ),
  ].join("-");
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
    )}:${clean.slice(
      2
    )}`;
  }

  return clean;
}

function getCurrentDateDisplay(): string {
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

  return `${day}/${month}/${year}`;
}

function getCurrentDateISO(): string {
  const now = new Date();

  return [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function isValidMeasurementValue(
  tipo: string,
  value: string
): boolean {
  const safeValue = value.trim();

  if (!safeValue) {
    return false;
  }

  if (tipo === "pressao_arterial") {
    const match = safeValue.match(
      /^(\d{2,3})\s*\/\s*(\d{2,3})$/
    );

    if (!match) {
      return false;
    }

    const sistolica = Number(match[1]);
    const diastolica = Number(match[2]);

    return (
      Number.isFinite(sistolica) &&
      Number.isFinite(diastolica) &&
      sistolica > 0 &&
      diastolica > 0
    );
  }

  if (
    tipo === "glicemia" ||
    tipo === "temperatura"
  ) {
    const numericValue = Number(
      safeValue.replace(",", ".")
    );

    return (
      Number.isFinite(numericValue) &&
      numericValue > 0
    );
  }

  return true;
}

function getCurrentTime(): string {
  const now =
    new Date();

  return `${String(
    now.getHours()
  ).padStart(
    2,
    "0"
  )}:${String(
    now.getMinutes()
  ).padStart(
    2,
    "0"
  )}`;
}

// ============================================================
// PAGE
// ============================================================

export default function NovoRegistroSaudePage() {
  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    showToast,
  } =
    useToast();

  const router =
    useRouter();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    createRegistro,
  } =
    useRegistrosSaude();

  const {
    tratamentos = [],
    addTratamento,
  } =
    useTratamentos();

  const {
    cids = [],
    addCid,
  } =
    useCids();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const submitAction =
    useSubmitAction();

  const isSubmitLocked =
    useRef(
      false
    );

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    categoria,
    setCategoria,
  ] =
    useState<CategoriaRegistro>(
      "sintoma"
    );

  const [
    tipoSelecionado,
    setTipoSelecionado,
  ] =
    useState(
      "dor"
    );

  const [
    nome,
    setNome,
  ] =
    useState(
      "Dor / Desconforto"
    );

  const [
    valorMedicao,
    setValorMedicao,
  ] =
    useState(
      ""
    );

  const [
    intensidade,
    setIntensidade,
  ] =
    useState<
      number | undefined
    >(
      5
    );

  const [
    dataDisplay,
    setDataDisplay,
  ] =
    useState(
      getCurrentDateDisplay
    );

  const [
    horario,
    setHorario,
  ] =
    useState(
      getCurrentTime
    );

  const [
    observacoes,
    setObservacoes,
  ] =
    useState(
      ""
    );

  const [
    medicamentoId,
    setMedicamentoId,
  ] =
    useState(
      ""
    );

  const [
    tratamentosSelecionados,
    setTratamentosSelecionados,
  ] =
    useState<
      string[]
    >(
      []
    );

  const [
    cidsSelecionados,
    setCidsSelecionados,
  ] =
    useState<
      string[]
    >(
      []
    );

  // ==========================================================
  // MODAIS
  // ==========================================================

  const [
    isMedicamentoModalOpen,
    setIsMedicamentoModalOpen,
  ] =
    useState(
      false
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

  // ==========================================================
  // VALIDATION UI
  // ==========================================================

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

  const [
    shakeFields,
    setShakeFields,
  ] =
    useState<
      string[]
    >(
      []
    );

  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const selectedMedicamento =
    useMemo(
      () =>
        medicamentos.find(
          (
            medicamento
          ) =>
            medicamento.id ===
            medicamentoId
        ),
      [
        medicamentos,
        medicamentoId,
      ]
    );

  const selectedTratamentos =
    useMemo(
      () =>
        tratamentos.filter(
          (
            tratamento
          ) =>
            Boolean(
              tratamento.id &&
                tratamentosSelecionados.includes(
                  tratamento.id
                )
            )
        ),
      [
        tratamentos,
        tratamentosSelecionados,
      ]
    );

  const selectedCids =
    useMemo(
      () =>
        cids.filter(
          (
            cid
          ) =>
            Boolean(
              cid.id &&
                cidsSelecionados.includes(
                  cid.id
                )
            )
        ),
      [
        cids,
        cidsSelecionados,
      ]
    );

  const insight =
    useMemo(
      () =>
        analisarRegistroSaude(
          nome,
          valorMedicao,
          intensidade,
          observacoes
        ),
      [
        nome,
        valorMedicao,
        intensidade,
        observacoes,
      ]
    );

  // ==========================================================
  // HELPERS
  // ==========================================================

  const triggerShake =
    (
      fieldNames:
        string[]
    ) => {
      trigger(
        "error"
      );

      setShakeFields(
        fieldNames
      );

      window.setTimeout(
        () => {
          setShakeFields(
            []
          );
        },
        600
      );
    };

  const validate =
    (): boolean => {
      const nextErrors:
        Record<
          string,
          string
        > =
        {};

      const shakeList:
        string[] =
        [];

      if (
        !activePersonId
      ) {
        nextErrors.person =
          "Selecione uma pessoa antes de registrar informações de saúde.";
      }

      if (
        !nome.trim()
      ) {
        nextErrors.nome =
          "Informe o nome do registro.";

        shakeList.push(
          "nome"
        );
      }

      const dataISO =
        parseDateToISO(
          dataDisplay
        );

      if (
        !dataISO
      ) {
        nextErrors.data =
          "Informe uma data válida.";

        shakeList.push(
          "data"
        );
      } else if (
        dataISO >
        getCurrentDateISO()
      ) {
        nextErrors.data =
          "A data do registro não pode estar no futuro.";

        shakeList.push(
          "data"
        );
      }

      const timeRegex =
        /^(?:[01]\d|2[0-3]):[0-5]\d$/;

      if (
        !horario ||
        !timeRegex.test(
          horario
        )
      ) {
        nextErrors.horario =
          "Informe um horário válido.";

        shakeList.push(
          "horario"
        );
      } else if (
        dataISO ===
          getCurrentDateISO() &&
        horario >
          getCurrentTime()
      ) {
        nextErrors.horario =
          "O horário do registro não pode estar no futuro.";

        shakeList.push(
          "horario"
        );
      }

      if (
        categoria ===
          "medicao" &&
        !isValidMeasurementValue(
          tipoSelecionado,
          valorMedicao
        )
      ) {
        nextErrors.valorMedicao =
          tipoSelecionado ===
          "pressao_arterial"
            ? "Informe a pressão no formato 120/80."
            : "Informe um valor numérico válido para a medição.";

        shakeList.push(
          "valorMedicao"
        );
      }

      if (
        categoria ===
          "sintoma" &&
        (
          intensidade ===
            undefined ||
          intensidade <
            1 ||
          intensidade >
            10
        )
      ) {
        nextErrors.intensidade =
          "A intensidade deve estar entre 1 e 10.";
      }

      setErrors(
        nextErrors
      );

      if (
        shakeList.length >
        0
      ) {
        triggerShake(
          shakeList
        );
      }

      return (
        Object.keys(
          nextErrors
        ).length ===
        0
      );
    };

  // ==========================================================
  // PRESET
  // ==========================================================

  const handleSelectPredefinido =
    (
      item:
        (typeof TIPOS_PREDEFINIDOS)[number]
    ) => {
      trigger(
        "vibrate"
      );

      setCategoria(
        item.categoria
      );

      setTipoSelecionado(
        item.tipo
      );

      setNome(
        item.nome
      );

      if (
        item.categoria ===
        "sintoma"
      ) {
        setIntensidade(
          5
        );

        setValorMedicao(
          ""
        );
      } else {
        setIntensidade(
          undefined
        );
      }
    };

  // ==========================================================
  // CRIAÇÃO RÁPIDA DE TRATAMENTO
  // ==========================================================

  const handleCreateTratamento =
    async () => {
      const safeName =
        newTratamentoName.trim();

      if (
        !safeName ||
        !activePersonId
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      try {
        const newId =
          await addTratamento({
            nome:
              safeName,

            status:
              "ativo",
          });

        setTratamentosSelecionados(
          (
            current
          ) =>
            current.includes(
              newId
            )
              ? current
              : [
                  ...current,
                  newId,
                ]
        );

        setNewTratamentoName(
          ""
        );

        setIsCreatingTratamento(
          false
        );

        showToast(
          "Tratamento cadastrado",
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "[NovoRegistro] Erro ao cadastrar tratamento:",
          error
        );

        showToast(
          "Erro ao cadastrar tratamento",
          "error"
        );
      }
    };

  // ==========================================================
  // CRIAÇÃO RÁPIDA DE CID
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
        !activePersonId
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      try {
        const newId =
          await addCid({
            codigo,
            descricao,
          });

        setCidsSelecionados(
          (
            current
          ) =>
            current.includes(
              newId
            )
              ? current
              : [
                  ...current,
                  newId,
                ]
        );

        setNewCidCodigo(
          ""
        );

        setNewCidDescricao(
          ""
        );

        setIsCreatingCid(
          false
        );

        showToast(
          "CID cadastrado",
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "[NovoRegistro] Erro ao cadastrar CID:",
          error
        );

        showToast(
          "Erro ao cadastrar CID",
          "error"
        );
      }
    };

  // ==========================================================
  // SAVE
  // ==========================================================

  const handleSubmit =
    async () => {
      trigger(
        "vibrate"
      );

      if (
        isSubmitLocked.current ||
        submitAction.isSubmitting
      ) {
        return;
      }

      if (
        !validate()
      ) {
        return;
      }

      const dataISO =
        parseDateToISO(
          dataDisplay
        );

      if (
        !dataISO
      ) {
        trigger(
          "error"
        );

        return;
      }

      isSubmitLocked.current =
        true;

      try {
        await submitAction.run(
          async () => {
            await createRegistro({
              categoria,

              tipo:
                tipoSelecionado ||
                "geral",

              nome:
                nome.trim(),

              intensidade:
                categoria ===
                "sintoma"
                  ? intensidade
                  : undefined,

              valor_medicao:
                categoria ===
                "medicao"
                  ? valorMedicao.trim() ||
                    undefined
                  : undefined,

              data:
                dataISO,

              horario,

              observacoes:
                observacoes.trim() ||
                undefined,

              medicamento_id:
                medicamentoId ||
                null,

              tratamento_ids:
                tratamentosSelecionados,

              cid_ids:
                cidsSelecionados,
            });
          },
          {
            successMessage:
              "Registro salvo com sucesso",

            errorMessage:
              "Erro ao salvar registro",

            goBackOnSuccess:
              true,
          }
        );
      } finally {
        isSubmitLocked.current =
          false;
      }
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* HEADER */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
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
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
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
              <div className="flex items-center gap-2">
                <Activity
                  size={
                    16
                  }
                  className="text-ice"
                />

                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Prontuário
                </p>
              </div>

              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Novo Registro de Saúde
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {!activePersonId && (
            <div className="flex items-start gap-3 rounded-[24px] border border-coral/30 bg-coral/10 p-4">
              <AlertTriangle
                size={
                  18
                }
                className="mt-0.5 shrink-0 text-coral"
              />

              <div>
                <p className="text-xs font-semibold text-coral">
                  Pessoa ativa necessária
                </p>

                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  Selecione uma pessoa antes de cadastrar um registro clínico.
                </p>
              </div>
            </div>
          )}

          {/* PRESETS */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-ink-muted">
              Escolha rápida
            </label>

            <div className="grid grid-cols-2 gap-2">
              {TIPOS_PREDEFINIDOS.map(
                (
                  item
                ) => {
                  const isSelected =
                    tipoSelecionado ===
                    item.tipo;

                  const itemTheme =
                    getRegistroTheme(
                      item.nome
                    );

                  const ItemIcon =
                    itemTheme.icon;

                  return (
                    <button
                      key={
                        item.tipo
                      }
                      type="button"
                      onClick={
                        () =>
                          handleSelectPredefinido(
                            item
                          )
                      }
                      className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all active:scale-95 ${
                        isSelected
                          ? "border-ice bg-ice/10 shadow-sm"
                          : "border-surface-border/50 bg-surface-raised hover:border-surface-border"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${itemTheme.tagClass}`}
                      >
                        <ItemIcon
                          size={
                            16
                          }
                        />
                      </div>

                      <span className="truncate text-xs font-semibold text-ink-primary">
                        {
                          item.nome
                        }
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </motion.div>

          {/* DADOS */}

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
            <div
              className={
                shakeFields.includes(
                  "nome"
                )
                  ? "animate-shake"
                  : ""
              }
            >
              <Input
                label="Nome do Registro / Sintoma"
                placeholder="Ex: Dor de cabeça, Pressão..."
                value={
                  nome
                }
                onChange={
                  (
                    event
                  ) => {
                    setNome(
                      event.target.value
                    );

                    if (
                      errors.nome
                    ) {
                      setErrors(
                        (
                          current
                        ) => ({
                          ...current,
                          nome:
                            "",
                        })
                      );
                    }
                  }
                }
                error={
                  errors.nome
                }
                required
              />
            </div>

            {categoria ===
              "medicao" && (
              <div
                className={
                  shakeFields.includes(
                    "valorMedicao"
                  )
                    ? "animate-shake"
                    : ""
                }
              >
                <Input
                  label="Valor da Medição"
                  placeholder={
                    TIPOS_PREDEFINIDOS.find(
                      (
                        item
                      ) =>
                        item.tipo ===
                        tipoSelecionado
                    )
                      ?.placeholder ||
                    "Informe o valor"
                  }
                  value={
                    valorMedicao
                  }
                  onChange={
                    (
                      event
                    ) => {
                      setValorMedicao(
                        event.target.value
                      );

                      if (
                        errors.valorMedicao
                      ) {
                        setErrors(
                          (
                            current
                          ) => ({
                            ...current,
                            valorMedicao:
                              "",
                          })
                        );
                      }
                    }
                  }
                  error={
                    errors.valorMedicao
                  }
                  required
                />
              </div>
            )}

            {categoria ===
              "sintoma" && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-ink-primary">
                    Intensidade
                  </label>

                  <span className="rounded-full border border-ice/20 bg-ice/10 px-2.5 py-0.5 font-mono text-sm font-bold text-ice">
                    {intensidade ??
                      5}{" "}
                    / 10
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="10"
                  value={
                    intensidade ??
                    5
                  }
                  onChange={
                    (
                      event
                    ) => {
                      trigger(
                        "vibrate"
                      );

                      setIntensidade(
                        Number(
                          event.target.value
                        )
                      );
                    }
                  }
                  className="w-full cursor-pointer accent-ice"
                />

                <div className="flex justify-between text-[10px] font-mono text-ink-muted">
                  <span>
                    1 · Leve
                  </span>

                  <span>
                    5 · Moderado
                  </span>

                  <span>
                    10 · Intenso
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* INSIGHT */}

          <AnimatePresence>
            {insight && (
              <motion.div
                initial={{
                  opacity: 0,
                  scale:
                    0.98,
                }}
                animate={{
                  opacity: 1,
                  scale:
                    1,
                }}
                exit={{
                  opacity: 0,
                  scale:
                    0.98,
                }}
                className={`rounded-[24px] border p-4 shadow-sm ${
                  insight.status ===
                  "critico"
                    ? "border-coral/30 bg-coral/10"
                    : insight.status ===
                        "alerta"
                      ? "border-amber-400/30 bg-amber-400/10"
                      : insight.status ===
                          "atencao"
                        ? "border-ice/30 bg-ice/10"
                        : "border-emerald-400/30 bg-emerald-400/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      insight.status ===
                      "critico"
                        ? "border-coral/40 bg-coral/20 text-coral"
                        : insight.status ===
                            "alerta"
                          ? "border-amber-400/40 bg-amber-400/20 text-amber-400"
                          : insight.status ===
                              "atencao"
                            ? "border-ice/40 bg-ice/20 text-ice"
                            : "border-emerald-400/40 bg-emerald-400/20 text-emerald-400"
                    }`}
                  >
                    {insight.status ===
                      "critico" ||
                    insight.status ===
                      "alerta" ? (
                      <AlertTriangle
                        size={
                          18
                        }
                      />
                    ) : (
                      <CheckCircle2
                        size={
                          18
                        }
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3
                      className={`text-xs font-bold uppercase tracking-wider ${
                        insight.status ===
                        "critico"
                          ? "text-coral"
                          : insight.status ===
                              "alerta"
                            ? "text-amber-400"
                            : insight.status ===
                                "atencao"
                              ? "text-ice"
                              : "text-emerald-400"
                      }`}
                    >
                      {
                        insight.titulo
                      }
                    </h3>

                    <p className="mt-1 text-xs leading-snug text-ink-primary">
                      {
                        insight.mensagem
                      }
                    </p>

                    <p className="mt-1.5 text-[11px] italic text-ink-muted">
                      {
                        insight.recomendacao
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DATA / HORA */}

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
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`space-y-1.5 ${
                  shakeFields.includes(
                    "data"
                  )
                    ? "animate-shake"
                    : ""
                }`}
              >
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
                  <p className="ml-1 text-xs text-coral">
                    {
                      errors.data
                    }
                  </p>
                )}
              </div>

              <div
                className={`space-y-1.5 ${
                  shakeFields.includes(
                    "horario"
                  )
                    ? "animate-shake"
                    : ""
                }`}
              >
                <label className="block text-sm font-medium text-ink-primary">
                  Horário{" "}
                  <span className="text-coral">
                    *
                  </span>
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
                      ) =>
                        setHorario(
                          handleTimeMask(
                            event.target.value
                          )
                        )
                    }
                    className={`w-full rounded-2xl border bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm outline-none focus:border-ice/50 ${
                      errors.horario
                        ? "border-coral/50 text-coral"
                        : "border-surface-border/50 text-ink-primary"
                    }`}
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
          </motion.div>

          {/* TRATAMENTOS / CIDS */}

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
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Activity
                  size={
                    16
                  }
                  className="shrink-0 text-violet-400"
                />

                <label className="text-sm font-semibold text-ink-primary">
                  Tratamentos e CIDs
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
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md bg-coral/10 px-2 py-1 text-[10px] font-bold uppercase text-coral"
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

            {selectedTratamentos.length >
              0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedTratamentos.map(
                  (
                    tratamento
                  ) => {
                    const tratamentoTheme =
                      getClinicalTheme(
                        tratamento.nome
                      );

                    const TratamentoIcon =
                      tratamentoTheme.icon;

                    return (
                      <div
                        key={
                          tratamento.id
                        }
                        className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5"
                      >
                        <TratamentoIcon
                          size={
                            14
                          }
                          className="text-violet-400"
                        />

                        <span className="max-w-[180px] truncate text-xs font-medium text-violet-300">
                          {
                            tratamento.nome
                          }
                        </span>

                        <button
                          type="button"
                          onClick={
                            () => {
                              trigger(
                                "vibrate"
                              );

                              setTratamentosSelecionados(
                                (
                                  current
                                ) =>
                                  current.filter(
                                    (
                                      currentId
                                    ) =>
                                      currentId !==
                                      tratamento.id
                                  )
                              );
                            }
                          }
                          className="ml-1 text-violet-400/60 transition-colors hover:text-coral"
                          aria-label="Remover tratamento"
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

            {selectedCids.length >
              0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedCids.map(
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
                      <div
                        key={
                          cid.id
                        }
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${cidTheme.tagClass}`}
                      >
                        <CidIcon
                          size={
                            14
                          }
                        />

                        <span className="max-w-[180px] truncate text-xs font-medium">
                          {
                            cid.codigo
                          }
                        </span>

                        <button
                          type="button"
                          onClick={
                            () => {
                              trigger(
                                "vibrate"
                              );

                              setCidsSelecionados(
                                (
                                  current
                                ) =>
                                  current.filter(
                                    (
                                      currentId
                                    ) =>
                                      currentId !==
                                      cid.id
                                  )
                              );
                            }
                          }
                          className="ml-1 text-current/60 transition-colors hover:text-coral"
                          aria-label="Remover CID"
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

            <div className="grid grid-cols-2 gap-2">
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
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-3 py-3 text-violet-300 transition-colors hover:bg-violet-400/10 active:scale-95"
              >
                <Plus
                  size={
                    16
                  }
                />

                <span className="text-xs font-medium">
                  Tratamento
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
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-400/5 px-3 py-3 text-emerald-300 transition-colors hover:bg-emerald-400/10 active:scale-95"
              >
                <Plus
                  size={
                    16
                  }
                />

                <span className="text-xs font-medium">
                  CID
                </span>
              </button>
            </div>
          </motion.div>

          {/* MEDICAMENTO */}

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
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-ink-primary">
                Medicamento Relacionado
              </label>

              {medicamentoId && (
                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setMedicamentoId(
                        ""
                      );
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md bg-coral/10 px-2 py-1 text-[10px] font-bold uppercase text-coral"
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

                  setIsMedicamentoModalOpen(
                    true
                  );
                }
              }
              className="flex w-full items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left transition-all active:scale-[0.99]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <Pill
                  size={
                    16
                  }
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-primary">
                  {selectedMedicamento
                    ? selectedMedicamento.nome
                    : "Vincular medicamento"}
                </p>

                <p className="truncate text-xs text-ink-muted">
                  {selectedMedicamento?.dosagem ||
                    "Opcional"}
                </p>
              </div>
            </button>
          </motion.div>

          {/* OBSERVAÇÕES */}

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
              label="Observações / Anotações"
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
              placeholder="Detalhes adicionais sobre o sintoma ou medição..."
            />
          </motion.div>
        </section>

        {/* SAVE */}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={
              handleSubmit
            }
            disabled={
              submitAction.isSubmitting ||
              !activePersonId
            }
          >
            {submitAction.isSubmitting ? (
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
              "Salvar Registro"
            )}
          </Button>
        </div>

        {/* MEDICAMENTO */}

        <SelectionModal<Medicamento>
          isOpen={
            isMedicamentoModalOpen
          }
          onClose={
            () =>
              setIsMedicamentoModalOpen(
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

              setMedicamentoId(
                item.id
              );

              setIsMedicamentoModalOpen(
                false
              );
            }
          }
          items={
            medicamentos
          }
          title="Selecionar Medicamento"
          placeholder="Buscar medicamento..."
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

                {item.dosagem && (
                  <p className="text-xs text-ink-muted">
                    {
                      item.dosagem
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
        />

        {/* TRATAMENTOS */}

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
                !item.id
              ) {
                return;
              }

              trigger(
                "vibrate"
              );

              setTratamentosSelecionados(
                (
                  current
                ) =>
                  current.includes(
                    item.id!
                  )
                    ? current
                    : [
                        ...current,
                        item.id!,
                      ]
              );
            }
          }
          items={
            tratamentos
          }
          title="Vincular Tratamentos"
          placeholder="Buscar tratamento..."
          renderItem={
            (
              item
            ) => {
              const itemTheme =
                getClinicalTheme(
                  item.nome
                );

              const Icon =
                itemTheme.icon;

              const isSelected =
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
                        15
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

        {/* CIDS */}

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
                !item.id
              ) {
                return;
              }

              trigger(
                "vibrate"
              );

              setCidsSelecionados(
                (
                  current
                ) =>
                  current.includes(
                    item.id!
                  )
                    ? current
                    : [
                        ...current,
                        item.id!,
                      ]
              );
            }
          }
          items={
            cids
          }
          title="Vincular CIDs"
          placeholder="Buscar CID..."
          renderItem={
            (
              item
            ) => {
              const itemTheme =
                getClinicalTheme(
                  item.descricao ||
                    item.codigo
                );

              const Icon =
                itemTheme.icon;

              const isSelected =
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
                      itemTheme.textClass
                    }
                  />

                  <span
                    className={`min-w-0 flex-1 truncate text-sm font-medium ${
                      isSelected
                        ? itemTheme.textClass
                        : "text-ink-primary"
                    }`}
                  >
                    {item.codigo} -{" "}
                    {
                      item.descricao
                    }
                  </span>

                  {isSelected && (
                    <Check
                      size={
                        15
                      }
                      className="shrink-0 text-emerald-400"
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

        {/* CRIAR TRATAMENTO */}

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
                !activePersonId ||
                !newTratamentoName.trim()
              }
            >
              Salvar e Selecionar
            </Button>
          </div>
        </BottomSheet>

        {/* CRIAR CID */}

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
              placeholder="Descrição do diagnóstico"
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
                !activePersonId ||
                !newCidCodigo.trim() ||
                !newCidDescricao.trim()
              }
            >
              Salvar e Selecionar
            </Button>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}
