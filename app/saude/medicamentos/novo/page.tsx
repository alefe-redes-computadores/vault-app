// app/saude/medicamentos/novo/page.tsx
"use client";

import {
  useEffect,
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
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Droplet,
  Eraser,
  FileSearch,
  FileText,
  Loader2,
  MapPin,
  Package,
  Palette,
  RefreshCw,
  Store,
  Stethoscope,
  StickyNote,
  Syringe,
  Upload,
  X,
} from "lucide-react";

import {
  useAuth,
} from "@/hooks/useAuth";

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
  useCids,
} from "@/hooks/useCids";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";

import {
  deleteFile,
  uploadFile,
} from "@/lib/supabase/storage";

import {
  calcularEstoqueRetroativo,
  getLocalTodayISO,
  suggestRenewalDate,
  VALIDADE_RECEITA_DIAS,
} from "@/lib/health-utils";

import {
  scheduleDoseNotifications,
  requestNotificationPermission,
} from "@/lib/dose-notifications";

import {
  sugerirHorarios,
} from "@/lib/health-insights";

import {
  medicamentosRepository,
} from "@/lib/repositories/medicamentos";

import {
  documentsRepository,
} from "@/lib/repositories/documents";

import {
  renovacoesRepository,
} from "@/lib/repositories/renovacoes";

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
  ConfirmationModal,
} from "@/components/ConfirmationModal";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  SelectionModal,
} from "@/components/SelectionModal";

import {
  SeletorReceita,
} from "@/components/saude/SeletorReceita";

import {
  CalculadoraGotas,
} from "@/components/saude/CalculadoraGotas";

import {
  SeletorTratamentoModal,
} from "@/components/saude/SeletorTratamentoModal";

import {
  FloatingSpinner,
} from "@/components/loading/FloatingSpinner";

import type {
  Attachment,
  Farmacia,
  Hospital,
  LocalSaude,
  Medico,
  TipoReceita,
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

  exit: {
    opacity: 0,
    y: -12,
  },
};

// ============================================================
// HELPERS
// ============================================================

function mascaraData(
  value: string
) {
  return value
    .replace(
      /\D/g,
      ""
    )
    .replace(
      /(\d{2})(\d)/,
      "$1/$2"
    )
    .replace(
      /(\d{2})(\d)/,
      "$1/$2"
    )
    .replace(
      /(\d{4})\d+?$/,
      "$1"
    );
}

function isoParaBr(
  iso: string
) {
  if (!iso) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] =
    iso.split(
      "-"
    );

  if (
    !year ||
    !month ||
    !day
  ) {
    return "";
  }

  return `${day}/${month}/${year}`;
}

function brParaIso(
  br: string
) {
  const parts =
    br.split(
      "/"
    );

  if (
    parts.length !==
      3 ||
    parts[2].length !==
      4
  ) {
    return "";
  }

  const day =
    Number(
      parts[0]
    );

  const month =
    Number(
      parts[1]
    );

  const year =
    Number(
      parts[2]
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
    day <
      1 ||
    month <
      1 ||
    month >
      12
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function parseCurrency(
  value: string
): number | undefined {
  if (!value) {
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
    )
  ) {
    return undefined;
  }

  return parsed;
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
    clean.length ===
    0
  ) {
    return "";
  }

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

function isValidTime(
  value: string
): boolean {
  if (
    !/^\d{2}:\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const [
    hour,
    minute,
  ] =
    value
      .split(
        ":"
      )
      .map(
        Number
      );

  return (
    hour >=
      0 &&
    hour <=
      23 &&
    minute >=
      0 &&
    minute <=
      59
  );
}

function parsePositiveOptionalNumber(
  value: string
): number | undefined {
  const normalized =
    value.trim();

  if (!normalized) {
    return undefined;
  }

  const parsed =
    Number(
      normalized.replace(
        ",",
        "."
      )
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed <= 0
  ) {
    return undefined;
  }

  return parsed;
}

// ============================================================
// ÍCONES DE FORMATO
// ============================================================

const CirclePillIcon = ({
  size,
  fill = "currentColor",
  stroke = "none",
}: {
  size: number;
  fill?: string;
  stroke?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={stroke}
    strokeWidth="2"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
    />
  </svg>
);

const SplitPillIcon = ({
  size,
  fill = "currentColor",
  stroke = "none",
}: {
  size: number;
  fill?: string;
  stroke?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={stroke}
    strokeWidth="2"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
    />

    <line
      x1="12"
      y1="3"
      x2="12"
      y2="21"
      stroke="rgba(0,0,0,0.35)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CapsuleIcon = ({
  size,
  fill = "currentColor",
  stroke = "none",
}: {
  size: number;
  fill?: string;
  stroke?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={stroke}
    strokeWidth="2"
  >
    <rect
      x="4"
      y="7"
      width="16"
      height="10"
      rx="5"
      ry="5"
    />

    <line
      x1="12"
      y1="7"
      x2="12"
      y2="17"
      stroke="rgba(0,0,0,0.35)"
      strokeWidth="2"
    />
  </svg>
);

const FORMATOS = [
  {
    id: "comprimido",
    label: "Comprimido",
    icon: CirclePillIcon,
  },

  {
    id: "partido",
    label: "Partido",
    icon: SplitPillIcon,
  },

  {
    id: "capsula",
    label: "Cápsula",
    icon: CapsuleIcon,
  },

  {
    id: "gota",
    label: "Gotas",
    icon: Droplet,
  },

  {
    id: "injecao",
    label: "Injeção",
    icon: Syringe,
  },

  {
    id: "adesivo",
    label: "Adesivo",
    icon: StickyNote,
  },
];

const CORES_DISPONIVEIS = [
  "#FFFFFF",
  "#FCA5A5",
  "#F87171",
  "#FBBF24",
  "#34D399",
  "#60A5FA",
  "#818CF8",
  "#A78BFA",
  "#F472B6",
  "#9CA3AF",
];

// ============================================================
// PAGE
// ============================================================

export default function NovoMedicamentoPage() {
  const {
    trigger,
  } =
    useHapticFeedback();

  const router =
    useRouter();

  const {
    user,
  } =
    useAuth();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    medicos,
    addMedico,
  } =
    useMedicos();

  const {
    farmacias,
    addFarmacia,
  } =
    useFarmacias();

  const {
    hospitais,
    addHospital,
  } =
    useHospitais();

  const {
    locais,
    addLocal,
  } =
    useLocais();

  const {
    cids,
  } =
    useCids();

  const {
    run,
    isSubmitting,
  } =
    useSubmitAction();

  const isSubmitLocked =
    useRef(
      false
    );

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  // ==========================================================
  // NAVEGAÇÃO
  // ==========================================================

  const [
    currentStep,
    setCurrentStep,
  ] =
    useState(
      1
    );

  const totalSteps =
    3;

  // ==========================================================
  // DADOS PRINCIPAIS
  // ==========================================================

  const [
    nome,
    setNome,
  ] =
    useState(
      ""
    );

  const [
    dosagem,
    setDosagem,
  ] =
    useState(
      ""
    );

  const [
    formato,
    setFormato,
  ] =
    useState(
      "comprimido"
    );

  const [
    cores,
    setCores,
  ] =
    useState<string[]>(
      [
        "#FFFFFF",
      ]
    );

  const [
    tipoUso,
    setTipoUso,
  ] =
    useState<
      | "continuo"
      | "esporadico"
      | "sos"
    >(
      "continuo"
    );

  const [
    vezesAoDia,
    setVezesAoDia,
  ] =
    useState(
      "1"
    );

  const [
    primeiroHorario,
    setPrimeiroHorario,
  ] =
    useState(
      "08:00"
    );

  const [
    horarios,
    setHorarios,
  ] =
    useState<string[]>(
      [
        "08:00",
      ]
    );

  /*
   * Quantidade consumida por dose é informação opcional.
   * O Vault nunca assume "1" automaticamente.
   */
  const [
    estoqueUnidadePorDose,
    setEstoqueUnidadePorDose,
  ] =
    useState(
      ""
    );

  // ==========================================================
  // GOTAS
  // ==========================================================

  const isGotas =
    formato ===
    "gota";

  const [
    mlTotal,
    setMlTotal,
  ] =
    useState(
      ""
    );

  /*
   * Não assumimos 20 gotas/ml.
   * Esse valor varia conforme medicamento/dispositivo.
   */
  const [
    gotasPorMl,
    setGotasPorMl,
  ] =
    useState(
      ""
    );

  const [
    estoqueGotasCalculado,
    setEstoqueGotasCalculado,
  ] =
    useState(
      0
    );

  // ==========================================================
  // AQUISIÇÃO
  // ==========================================================

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

  const [
    dataRetornoSusTexto,
    setDataRetornoSusTexto,
  ] =
    useState(
      ""
    );

  const [
    medicoId,
    setMedicoId,
  ] =
    useState(
      ""
    );

  const [
    medicoNome,
    setMedicoNome,
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
    hospitalNome,
    setHospitalNome,
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
    localNome,
    setLocalNome,
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
    farmaciaNome,
    setFarmaciaNome,
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

  // ==========================================================
  // ESTOQUE
  // ==========================================================

  const [
    estoqueAtivo,
    setEstoqueAtivo,
  ] =
    useState(
      false
    );

  const [
    estoqueQuantidade,
    setEstoqueQuantidade,
  ] =
    useState(
      ""
    );

  const [
    estoqueDataReferenciaTexto,
    setEstoqueDataReferenciaTexto,
  ] =
    useState(
      isoParaBr(
        getLocalTodayISO()
      )
    );

  const [
    estoqueUnidade,
    setEstoqueUnidade,
  ] =
    useState(
      "comprimido(s)"
    );

  // ==========================================================
  // RECEITA / RENOVAÇÃO
  // ==========================================================

  const [
    gerenciarRenovacao,
    setGerenciarRenovacao,
  ] =
    useState(
      false
    );

  const [
    tipoReceita,
    setTipoReceita,
  ] =
    useState<TipoReceita>(
      "comum"
    );

  const [
    dataReceitaTexto,
    setDataReceitaTexto,
  ] =
    useState(
      ""
    );

  const [
    proximaRenovacaoTexto,
    setProximaRenovacaoTexto,
  ] =
    useState(
      ""
    );

  const [
    tratamentosSelecionados,
    setTratamentosSelecionados,
  ] =
    useState<string[]>(
      []
    );

  const [
    observacoes,
    setObservacoes,
  ] =
    useState(
      ""
    );

  // ==========================================================
  // CID
  // ==========================================================

  const [
    cidIds,
    setCidIds,
  ] =
    useState<string[]>(
      []
    );

  const [
    isCidModalOpen,
    setIsCidModalOpen,
  ] =
    useState(
      false
    );

  // ==========================================================
  // ANEXO
  // ==========================================================

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
    uploadProgress,
    setUploadProgress,
  ] =
    useState(
      0
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

  const [
    isTratamentoModalOpen,
    setIsTratamentoModalOpen,
  ] =
    useState(
      false
    );

  const [
    showDesativarEstoqueModal,
    setShowDesativarEstoqueModal,
  ] =
    useState(
      false
    );

  // ==========================================================
  // VALIDAÇÃO
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
    useState<string[]>(
      []
    );

  // ==========================================================
  // HORÁRIOS AUTOMÁTICOS
  // ==========================================================

  useEffect(
    () => {
      if (
        tipoUso ===
          "continuo" &&
        vezesAoDia &&
        primeiroHorario &&
        isValidTime(
          primeiroHorario
        )
      ) {
        const novosHorarios =
          sugerirHorarios(
            primeiroHorario,
            Number(
              vezesAoDia
            )
          );

        setHorarios(
          novosHorarios.length >
            0
            ? novosHorarios
            : [
                primeiroHorario,
              ]
        );

        return;
      }

      if (
        tipoUso !==
        "continuo"
      ) {
        setHorarios(
          []
        );
      }
    },
    [
      vezesAoDia,
      primeiroHorario,
      tipoUso,
    ]
  );

  // ==========================================================
  // LIMPEZA DO BLOB LOCAL
  // ==========================================================

  useEffect(
    () => {
      return () => {
        if (
          attachment?.url?.startsWith(
            "blob:"
          )
        ) {
          URL.revokeObjectURL(
            attachment.url
          );
        }
      };
    },
    [
      attachment,
    ]
  );

  // ==========================================================
  // HANDLERS
  // ==========================================================

  const toggleCor =
    (
      hex: string
    ) => {
      trigger(
        "vibrate"
      );

      setCores(
        (
          previous
        ) => {
          if (
            previous.includes(
              hex
            )
          ) {
            return previous.filter(
              (
                color
              ) =>
                color !==
                hex
            );
          }

          if (
            previous.length >=
            2
          ) {
            return [
              previous[
                1
              ],
              hex,
            ];
          }

          return [
            ...previous,
            hex,
          ];
        }
      );
    };

  const handleFormatoChange =
    (
      novoFormato: string
    ) => {
      trigger(
        "vibrate"
      );

      setFormato(
        novoFormato
      );

      /*
       * O formato pode sugerir a unidade visual do estoque,
       * mas não pode inventar quanto é consumido por dose.
       */
      if (
        novoFormato ===
        "gota"
      ) {
        setEstoqueUnidade(
          "gota(s)"
        );
      } else {
        setEstoqueUnidade(
          "comprimido(s)"
        );
      }

      if (
        novoFormato !==
        "gota"
      ) {
        setEstoqueGotasCalculado(
          0
        );

        setMlTotal(
          ""
        );

        setGotasPorMl(
          ""
        );
      }
    };

  const handleFileSelect =
    (
      event:
        React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      trigger(
        "vibrate"
      );

      if (
        attachment?.url?.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          attachment.url
        );
      }

      const blobUrl =
        URL.createObjectURL(
          file
        );

      setLocalFile(
        file
      );

      setAttachment({
        id:
          crypto.randomUUID(),

        url:
          blobUrl,

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
      });

      event.target.value =
        "";
    };

  const removeAttachment =
    () => {
      if (
        attachment?.url?.startsWith(
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

      setUploadProgress(
        0
      );

      trigger(
        "vibrate"
      );
    };

  const handleDataReceitaChange =
    (
      value: string
    ) => {
      const masked =
        mascaraData(
          value
        );

      setDataReceitaTexto(
        masked
      );

      if (
        masked.length !==
        10
      ) {
        return;
      }

      const isoData =
        brParaIso(
          masked
        );

      const validade =
        VALIDADE_RECEITA_DIAS[
          tipoReceita
        ];

      if (
        isoData &&
        typeof validade ===
          "number" &&
        Number.isFinite(
          validade
        ) &&
        validade > 0
      ) {
        setProximaRenovacaoTexto(
          isoParaBr(
            suggestRenewalDate(
              isoData,
              tipoReceita
            )
          )
        );
      }
    };

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

      setTimeout(
        () =>
          setShakeFields(
            []
          ),
        600
      );
    };

  const validateStep =
    (
      step: number
    ): boolean => {
      const newErrors:
        Record<
          string,
          string
        > =
        {};

      const shakeList:
        string[] = [];

      if (
        step ===
        1
      ) {
        if (
          !nome.trim()
        ) {
          newErrors.nome =
            "Obrigatório";

          shakeList.push(
            "nome"
          );
        }

        if (
          !dosagem.trim()
        ) {
          newErrors.dosagem =
            "Obrigatório";

          shakeList.push(
            "dosagem"
          );
        }

        if (
          tipoUso ===
          "continuo"
        ) {
          const doses =
            Number(
              vezesAoDia
            );

          if (
            !Number.isInteger(
              doses
            ) ||
            doses <=
              0
          ) {
            newErrors.vezesAoDia =
              "Informe uma frequência válida";

            shakeList.push(
              "vezesAoDia"
            );
          }

          if (
            !isValidTime(
              primeiroHorario
            )
          ) {
            newErrors.primeiroHorario =
              "Horário inválido";

            shakeList.push(
              "primeiroHorario"
            );
          }
        }
      }

      if (
        step ===
        2 &&
        tipoAquisicao ===
          "sus" &&
        dataRetornoSusTexto
      ) {
        if (
          !brParaIso(
            dataRetornoSusTexto
          )
        ) {
          newErrors.dataRetornoSusTexto =
            "Data inválida";

          shakeList.push(
            "dataRetornoSusTexto"
          );
        }
      }

      if (
        step ===
        3
      ) {
        if (
          dataReceitaTexto &&
          !brParaIso(
            dataReceitaTexto
          )
        ) {
          newErrors.dataReceitaTexto =
            "Data inválida";

          shakeList.push(
            "dataReceitaTexto"
          );
        }

        if (
          proximaRenovacaoTexto &&
          !brParaIso(
            proximaRenovacaoTexto
          )
        ) {
          newErrors.proximaRenovacaoTexto =
            "Data inválida";

          shakeList.push(
            "proximaRenovacaoTexto"
          );
        }

        if (
          estoqueAtivo
        ) {
          const quantidade =
            Number(
              estoqueQuantidade
            );

          if (
            !Number.isFinite(
              quantidade
            ) ||
            quantidade <=
              0
          ) {
            newErrors.estoqueQuantidade =
              "Faltou quantidade";

            shakeList.push(
              "estoqueQuantidade"
            );
          }

          /*
           * Consumo por dose é opcional.
           *
           * Só validamos quando o usuário realmente informou
           * algum valor.
           */
          if (
            estoqueUnidadePorDose.trim()
          ) {
            const unidadeDose =
              Number(
                estoqueUnidadePorDose.replace(
                  ",",
                  "."
                )
              );

            if (
              !Number.isFinite(
                unidadeDose
              ) ||
              unidadeDose <=
                0
            ) {
              newErrors.estoqueUnidadePorDose =
                "Dose inválida";

              shakeList.push(
                "estoqueUnidadePorDose"
              );
            }
          }

          if (
            estoqueDataReferenciaTexto &&
            !brParaIso(
              estoqueDataReferenciaTexto
            )
          ) {
            newErrors.estoqueDataReferenciaTexto =
              "Data inválida";

            shakeList.push(
              "estoqueDataReferenciaTexto"
            );
          }
        }
      }

      setErrors(
        newErrors
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
          newErrors
        ).length ===
        0
      );
    };

  const nextStep =
    () => {
      if (
        !validateStep(
          currentStep
        )
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setCurrentStep(
        (
          previous
        ) =>
          Math.min(
            previous +
              1,
            totalSteps
          )
      );

      window.scrollTo({
        top:
          0,

        behavior:
          "smooth",
      });
    };

  const prevStep =
    () => {
      trigger(
        "vibrate"
      );

      setCurrentStep(
        (
          previous
        ) =>
          Math.max(
            previous -
              1,
            1
          )
      );

      window.scrollTo({
        top:
          0,

        behavior:
          "smooth",
      });
    };

  const toggleEstoque =
    () => {
      trigger(
        "vibrate"
      );

      if (
        estoqueAtivo &&
        Number(
          estoqueQuantidade
        ) >
          0
      ) {
        setShowDesativarEstoqueModal(
          true
        );

        return;
      }

      setEstoqueAtivo(
        !estoqueAtivo
      );
    };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    () => {
      if (
        isSubmitLocked.current ||
        isSubmitting
      ) {
        return;
      }

      isSubmitLocked.current =
        true;

      if (
        !validateStep(
          3
        )
      ) {
        isSubmitLocked.current =
          false;

        return;
      }

      run(
        async () => {
          setUploadProgress(
            0
          );

          if (
            !activePersonId
          ) {
            throw new Error(
              "Pessoa ativa não identificada."
            );
          }

          if (!user) {
            throw new Error(
              "Usuário não autenticado."
            );
          }

          const personId =
            activePersonId;

          const today =
            getLocalTodayISO();

          const dataReceitaISO =
            brParaIso(
              dataReceitaTexto
            ) ||
            undefined;

          const proximaRenovacaoISO =
            brParaIso(
              proximaRenovacaoTexto
            ) ||
            undefined;

          const dataRetornoSusISO =
            tipoAquisicao ===
              "sus"
              ? brParaIso(
                  dataRetornoSusTexto
                ) ||
                undefined
              : undefined;

          const estoqueDataReferenciaISO =
            estoqueAtivo
              ? brParaIso(
                  estoqueDataReferenciaTexto
                ) ||
                today
              : undefined;

          const horariosFiltrados =
            tipoUso ===
            "continuo"
              ? Array.from(
                  new Set(
                    horarios.filter(
                      (
                        horario
                      ) =>
                        Boolean(
                          horario
                        ) &&
                        isValidTime(
                          horario
                        )
                    )
                  )
                )
              : [];

          const qtdInformada =
            estoqueAtivo
              ? Number(
                  estoqueQuantidade
                )
              : 0;

          /*
           * Pode ser undefined.
           * Nunca assumimos que uma dose consome 1 unidade.
           */
          const unidadePorDose =
            estoqueAtivo
              ? parsePositiveOptionalNumber(
                  estoqueUnidadePorDose
                )
              : undefined;

          /*
           * Para medicamentos em gotas, a CalculadoraGotas
           * devolve o total conhecido de gotas.
           *
           * Se não houver cálculo válido, usamos a quantidade
           * explicitamente informada pelo usuário.
           */
          const quantidadeBase =
            estoqueAtivo
              ? isGotas &&
                estoqueGotasCalculado >
                  0
                ? estoqueGotasCalculado
                : qtdInformada
              : 0;

          /*
           * O retroativo só pode consumir estoque quando sabemos
           * quanto uma tomada consome.
           *
           * Sem unidadePorDose conhecida, preservamos exatamente
           * o saldo informado pelo usuário.
           */
          const quantidadeEstoqueFinal =
            estoqueAtivo
              ? estoqueDataReferenciaISO &&
                tipoUso ===
                  "continuo" &&
                horariosFiltrados.length >
                  0 &&
                unidadePorDose !==
                  undefined
                ? calcularEstoqueRetroativo(
                    quantidadeBase,
                    estoqueDataReferenciaISO,
                    horariosFiltrados,
                    unidadePorDose
                  )
                : quantidadeBase
              : 0;

          const precoNumerico =
            tipoAquisicao ===
              "comprado"
              ? parseCurrency(
                  preco
                )
              : undefined;

          const mlTotalNumerico =
            estoqueAtivo &&
            isGotas
              ? parsePositiveOptionalNumber(
                  mlTotal
                )
              : undefined;

          const gotasPorMlNumerico =
            estoqueAtivo &&
            isGotas
              ? parsePositiveOptionalNumber(
                  gotasPorMl
                )
              : undefined;

          let uploadedStorageUrl:
            string | null =
            null;

          let docId:
            string | undefined;

          let medicamentoId:
            string | undefined;

          try {
            // ==================================================
            // 1. UPLOAD DO ANEXO
            // ==================================================

            let finalAttachment:
              Attachment | null =
              null;

            if (
              attachment
            ) {
              if (
                localFile
              ) {
                setUploadProgress(
                  10
                );

                const {
                  url,
                  error,
                } =
                  await uploadFile(
                    user.id,
                    localFile,
                    "saude"
                  );

                if (
                  error ||
                  !url
                ) {
                  throw new Error(
                    "Não foi possível enviar o anexo da receita."
                  );
                }

                uploadedStorageUrl =
                  url;

                finalAttachment = {
                  ...attachment,

                  url,
                };

                setUploadProgress(
                  100
                );
              } else {
                if (
                  attachment.url.startsWith(
                    "blob:"
                  )
                ) {
                  throw new Error(
                    "O arquivo selecionado não está mais disponível. Selecione-o novamente."
                  );
                }

                finalAttachment =
                  attachment;
              }
            }

            // ==================================================
            // 2. DOCUMENTO
            // ==================================================

            if (
              finalAttachment
            ) {
              docId =
                await documentsRepository.create({
                  person_id:
                    personId,

                  category_id:
                    "saude",

                  type:
                    "receita",

                  title:
                    `Receita — ${nome.trim()}`,

                  description:
                    observacoes.trim() ||
                    undefined,

                  metadata: {
                    medication:
                      nome.trim(),

                    dosage:
                      dosagem.trim(),

                    prescription_date:
                      dataReceitaISO,

                    renewal_date:
                      proximaRenovacaoISO,

                    tratamento_ids:
                      tratamentosSelecionados,

                    tipo_receita:
                      tipoReceita,

                    formato,

                    status:
                      "ativo",
                  },

                  attachments: [
                    finalAttachment,
                  ],

                  is_favorite:
                    false,
                });
            }

            // ==================================================
            // 3. MEDICAMENTO
            // ==================================================

            medicamentoId =
              await medicamentosRepository.create({
                person_id:
                  personId,

                document_id:
                  docId ||
                  undefined,

                nome:
                  nome.trim(),

                dosagem:
                  dosagem.trim(),

                cid_ids:
                  cidIds,

                formato,

                cores,

                tipo_uso:
                  tipoUso,

                tipo_aquisicao:
                  tipoAquisicao,

                data_retorno_sus:
                  dataRetornoSusISO,

                medico:
                  medicoNome.trim(),

                medico_id:
                  medicoId ||
                  undefined,

                hospital_id:
                  hospitalId ||
                  undefined,

                local_id:
                  localId ||
                  undefined,

                farmacia:
                  farmaciaNome.trim(),

                farmacia_id:
                  farmaciaId ||
                  undefined,

                preco:
                  precoNumerico,

                data_receita:
                  dataReceitaISO,

                proxima_renovacao:
                  proximaRenovacaoISO,

                observacoes:
                  observacoes.trim() ||
                  undefined,

                tipo_receita:
                  tipoReceita,

                tratamento_ids:
                  tratamentosSelecionados,

                status:
                  "ativo",

                estoque_quantidade:
                  estoqueAtivo
                    ? quantidadeEstoqueFinal
                    : undefined,

                estoque_data_referencia:
                  estoqueAtivo
                    ? today
                    : undefined,

                /*
                 * Horários são parte da rotina clínica,
                 * não do controle de estoque.
                 */
                estoque_horarios:
                  tipoUso ===
                    "continuo" &&
                  horariosFiltrados.length >
                    0
                    ? horariosFiltrados
                    : undefined,

                estoque_unidade_por_dose:
                  estoqueAtivo
                    ? unidadePorDose
                    : undefined,

                estoque_unidade_medida:
                  estoqueAtivo
                    ? isGotas
                      ? "gota(s)"
                      : estoqueUnidade
                    : undefined,

                estoque_ml_total:
                  mlTotalNumerico,

                estoque_gotas_por_ml:
                  gotasPorMlNumerico,
              });

            // ==================================================
            // 4. RENOVAÇÃO / AQUISIÇÃO INICIAL
            // ==================================================

            if (
              gerenciarRenovacao
            ) {
              await renovacoesRepository.create({
                person_id:
                  personId,

                medicamento_id:
                  medicamentoId,

                document_id:
                  docId ||
                  undefined,

                medico_id:
                  medicoId ||
                  undefined,

                farmacia_id:
                  farmaciaId ||
                  undefined,

                hospital_id:
                  hospitalId ||
                  undefined,

                local_id:
                  localId ||
                  undefined,

                tipo_aquisicao:
                  tipoAquisicao,

                data_proxima_retirada:
                  dataRetornoSusISO,

                data_retorno_sus:
                  dataRetornoSusISO ||
                  null,

                quantidade:
                  estoqueAtivo &&
                  quantidadeBase >
                    0
                    ? quantidadeBase
                    : undefined,

                preco:
                  precoNumerico,

                data:
                  estoqueDataReferenciaISO ||
                  dataReceitaISO ||
                  today,
              });
            }
          } catch (
            error
          ) {
            if (
              medicamentoId
            ) {
              try {
                await medicamentosRepository.delete(
                  medicamentoId,
                  personId
                );
              } catch (
                rollbackError
              ) {
                console.error(
                  "[NovoMedicamento] Falha ao desfazer medicamento:",
                  rollbackError
                );
              }
            }

            if (
              docId
            ) {
              try {
                await documentsRepository.delete(
                  docId,
                  personId
                );

                uploadedStorageUrl =
                  null;
              } catch (
                rollbackError
              ) {
                console.error(
                  "[NovoMedicamento] Falha ao desfazer documento:",
                  rollbackError
                );
              }
            }

            if (
              uploadedStorageUrl &&
              !docId
            ) {
              try {
                await deleteFile(
                  uploadedStorageUrl
                );
              } catch (
                cleanupError
              ) {
                console.error(
                  "[NovoMedicamento] Falha ao limpar upload órfão:",
                  cleanupError
                );
              }
            }

            throw error;
          }

          // ====================================================
          // 5. NOTIFICAÇÕES
          // ====================================================

          if (
            medicamentoId &&
            tipoUso ===
              "continuo" &&
            horariosFiltrados.length >
              0
          ) {
            try {
              const granted =
                await requestNotificationPermission();

              if (
                granted
              ) {
                await scheduleDoseNotifications({
                  id:
                    medicamentoId,

                  person_id:
                    personId,

                  nome:
                    nome.trim(),

                  dosagem:
                    dosagem.trim(),

                  estoque_horarios:
                    horariosFiltrados,
                });
              }
            } catch (
              notificationError
            ) {
              console.error(
                "[NovoMedicamento] Medicamento salvo, mas não foi possível agendar notificações:",
                notificationError
              );
            }
          }

          if (
            attachment?.url?.startsWith(
              "blob:"
            )
          ) {
            URL.revokeObjectURL(
              attachment.url
            );
          }
        },
        {
          successMessage:
            "Medicamento cadastrado com sucesso",

          errorMessage:
            "Erro ao cadastrar medicamento",

          goBackOnSuccess:
            true,
        }
      ).finally(
        () => {
          isSubmitLocked.current =
            false;

          setUploadProgress(
            0
          );
        }
      );
    };

  // ==========================================================
  // VISUAL
  // ==========================================================

  const SelectedFormatIcon =
    FORMATOS.find(
      (
        item
      ) =>
        item.id ===
        formato
    )?.icon ||
    CirclePillIcon;

  const hasTwoColors =
    cores.length ===
      2 &&
    (
      formato ===
        "comprimido" ||
      formato ===
        "partido" ||
      formato ===
        "capsula"
    );

  const gradientId =
    "split-novo-bicolor";

  // ==========================================================
  // RENDER
  // ==========================================================

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

        <svg
          width="0"
          height="0"
          className="absolute"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={
                gradientId
              }
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop
                offset="50%"
                stopColor={
                  cores[
                    0
                  ] ||
                  "#9CA3AF"
                }
              />

              <stop
                offset="50%"
                stopColor={
                  cores.length ===
                  2
                    ? cores[
                        1
                      ]
                    : cores[
                        0
                      ] ||
                      "#9CA3AF"
                }
              />
            </linearGradient>
          </defs>
        </svg>

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/90 px-5 pb-3 pt-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={
                  () =>
                    router.back()
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
                aria-label="Voltar"
              >
                <X
                  size={
                    18
                  }
                  className="text-ink-primary"
                />
              </button>

              <h1 className="font-display text-lg font-semibold text-ink-primary">
                Novo Cadastro
              </h1>
            </div>

            <span className="rounded-full bg-ice/10 px-3 py-1 text-xs font-bold text-ice">
              Etapa{" "}
              {
                currentStep
              }{" "}
              de{" "}
              {
                totalSteps
              }
            </span>
          </div>

          <div className="flex h-1.5 w-full gap-2 overflow-hidden rounded-full bg-surface-raised">
            {[
              1,
              2,
              3,
            ].map(
              (
                step
              ) => (
                <div
                  key={
                    step
                  }
                  className={`h-full flex-1 transition-colors duration-300 ${
                    step <=
                    currentStep
                      ? "bg-ice"
                      : "bg-surface-border/30"
                  }`}
                />
              )
            )}
          </div>
        </header>

        <section className="space-y-6 px-5 pt-6">
          <AnimatePresence mode="wait">
            {currentStep ===
              1 && (
              <motion.div
                key="step1"
                variants={
                  fadeUp
                }
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div
                    className={`transition-all ${
                      shakeFields.includes(
                        "nome"
                      )
                        ? "animate-shake"
                        : ""
                    }`}
                  >
                    <Input
                      label="Medicamento"
                      placeholder="Ex: Sertralina"
                      value={
                        nome
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setNome(
                            event
                              .target
                              .value
                          )
                      }
                      error={
                        errors.nome
                      }
                    />
                  </div>

                  <div
                    className={`transition-all ${
                      shakeFields.includes(
                        "dosagem"
                      )
                        ? "animate-shake"
                        : ""
                    }`}
                  >
                    <Input
                      label={
                        isGotas
                          ? "Dosagem (ex: 20 gotas/ml)"
                          : "Dosagem (ex: 50mg)"
                      }
                      value={
                        dosagem
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setDosagem(
                            event
                              .target
                              .value
                          )
                      }
                      error={
                        errors.dosagem
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                      Diagnóstico / CID Relacionado
                    </label>

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
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left transition-colors hover:border-ice/50"
                    >
                      <span className="flex min-w-0 items-center gap-2 truncate font-medium text-ink-primary">
                        <FileSearch
                          size={
                            16
                          }
                          className="shrink-0 text-ice"
                        />

                        {cidIds.length >
                        0
                          ? `${cidIds.length} CID(s) vinculado(s)`
                          : "Vincular CID..."}
                      </span>

                      <span className="ml-2 shrink-0 text-xs font-bold text-ice">
                        Gerenciar
                      </span>
                    </button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Palette
                      size={
                        16
                      }
                      className="text-ice"
                    />

                    <h3 className="text-sm font-semibold text-ink-primary">
                      Identidade Visual
                    </h3>
                  </div>

                  <div className="mb-5 grid grid-cols-4 gap-2">
                    {FORMATOS.map(
                      (
                        item
                      ) => {
                        const isActive =
                          formato ===
                          item.id;

                        const Icon =
                          item.icon;

                        return (
                          <button
                            type="button"
                            key={
                              item.id
                            }
                            onClick={
                              () =>
                                handleFormatoChange(
                                  item.id
                                )
                            }
                            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 transition-all ${
                              isActive
                                ? "border-ice bg-ice/15 text-ice"
                                : "border-surface-border/40 bg-surface-raised text-ink-muted"
                            }`}
                          >
                            <Icon
                              size={
                                20
                              }
                              fill={
                                isActive
                                  ? "currentColor"
                                  : "none"
                              }
                              stroke={
                                isActive
                                  ? "none"
                                  : "currentColor"
                              }
                            />

                            <span className="text-[10px] font-medium">
                              {
                                item.label
                              }
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>

                  <p className="mb-2 text-xs font-medium text-ink-muted">
                    Cores (Até 2 para pílulas e cápsulas)
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {CORES_DISPONIVEIS.map(
                      (
                        hex
                      ) => (
                        <button
                          type="button"
                          key={
                            hex
                          }
                          onClick={
                            () =>
                              toggleCor(
                                hex
                              )
                          }
                          className={`h-8 w-8 rounded-full border-2 transition-transform ${
                            cores.includes(
                              hex
                            )
                              ? "scale-110 border-ice"
                              : "border-transparent"
                          }`}
                          style={{
                            backgroundColor:
                              hex,
                          }}
                          aria-label={`Selecionar cor ${hex}`}
                        />
                      )
                    )}
                  </div>

                  <div className="mt-4 flex justify-center">
                    <div className="flex h-16 w-24 items-center justify-center rounded-2xl border border-surface bg-void/50 shadow-inner">
                      <SelectedFormatIcon
                        size={
                          32
                        }
                        fill={
                          hasTwoColors
                            ? `url(#${gradientId})`
                            : cores[
                                0
                              ] ||
                              "#9CA3AF"
                        }
                        stroke="none"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Clock
                      size={
                        16
                      }
                      className="text-ice"
                    />

                    <h3 className="text-sm font-semibold text-ink-primary">
                      Posologia & Uso
                    </h3>
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setTipoUso(
                            "continuo"
                          );
                        }
                      }
                      className={`rounded-xl border py-3 text-sm font-bold transition-all ${
                        tipoUso ===
                        "continuo"
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      Contínuo (Diário)
                    </button>

                    <button
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setTipoUso(
                            "esporadico"
                          );
                        }
                      }
                      className={`rounded-xl border py-3 text-sm font-bold transition-all ${
                        tipoUso !==
                        "continuo"
                          ? "border-amber-400 bg-amber-400/10 text-amber-400"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      Esporádico / SOS
                    </button>
                  </div>

                  {tipoUso ===
                    "continuo" && (
                    <div className="space-y-4 border-t border-surface-border/40 pt-4">
                      <div className="grid grid-cols-2 items-end gap-3">
                        <div
                          className={`transition-all ${
                            shakeFields.includes(
                              "vezesAoDia"
                            )
                              ? "animate-shake"
                              : ""
                          }`}
                        >
                          <Input
                            label="Doses por dia"
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            placeholder="Ex: 2"
                            value={
                              vezesAoDia
                            }
                            onChange={
                              (
                                event
                              ) =>
                                setVezesAoDia(
                                  event
                                    .target
                                    .value
                                )
                            }
                            error={
                              errors.vezesAoDia
                            }
                          />
                        </div>

                        <div
                          className={`transition-all ${
                            shakeFields.includes(
                              "primeiroHorario"
                            )
                              ? "animate-shake"
                              : ""
                          }`}
                        >
                          <Input
                            label="Horário inicial"
                            type="text"
                            placeholder="00:00"
                            maxLength={
                              5
                            }
                            value={
                              primeiroHorario
                            }
                            onChange={
                              (
                                event
                              ) =>
                                setPrimeiroHorario(
                                  handleTimeMask(
                                    event
                                      .target
                                      .value
                                  )
                                )
                            }
                            error={
                              errors.primeiroHorario
                            }
                            icon={
                              <Clock
                                size={
                                  16
                                }
                                className="text-ink-muted"
                              />
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                          Horários Sugeridos
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {horarios.map(
                            (
                              horario,
                              index
                            ) => (
                              <span
                                key={`${horario}-${index}`}
                                className="rounded-lg border border-surface-border bg-void px-3 py-1.5 font-mono text-sm font-bold text-ice"
                              >
                                {
                                  horario
                                }
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {tipoUso !==
                    "continuo" && (
                    <p className="rounded-xl bg-surface-raised p-3 text-center text-xs text-ink-muted">
                      O app não emitirá alarmes diários, mas você poderá registrar doses avulsas para acompanhar o uso e o estoque.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep ===
              2 && (
              <motion.div
                key="step2"
                variants={
                  fadeUp
                }
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <Store
                      size={
                        16
                      }
                      className="text-ice"
                    />

                    <h3 className="text-sm font-semibold text-ink-primary">
                      Origem / Aquisição
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setTipoAquisicao(
                            "comprado"
                          );
                        }
                      }
                      className={`rounded-xl border py-3 text-xs font-bold transition-all ${
                        tipoAquisicao ===
                        "comprado"
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      Particular (Comprado)
                    </button>

                    <button
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setTipoAquisicao(
                            "sus"
                          );
                        }
                      }
                      className={`rounded-xl border py-3 text-xs font-bold transition-all ${
                        tipoAquisicao ===
                        "sus"
                          ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      Retirada SUS / Governo
                    </button>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-sm font-medium text-ink-primary">
                        {tipoAquisicao ===
                        "sus"
                          ? "Posto de Saúde / Farmácia Pública"
                          : "Em qual farmácia comprou?"}
                      </label>

                      {farmaciaId && (
                        <button
                          type="button"
                          onClick={
                            () => {
                              setFarmaciaId(
                                ""
                              );

                              setFarmaciaNome(
                                ""
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
                        () =>
                          setIsPharmacyModalOpen(
                            true
                          )
                      }
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left transition-all hover:border-ice/50"
                    >
                      <span className="truncate font-medium text-ink-primary">
                        {farmaciaNome ||
                          (
                            tipoAquisicao ===
                            "sus"
                              ? "Selecionar posto/farmácia pública..."
                              : "Selecionar farmácia..."
                          )}
                      </span>

                      <span className="text-xs font-bold text-ice">
                        Selecionar
                      </span>
                    </button>
                  </div>

                  {tipoAquisicao ===
                  "comprado" ? (
                    <Input
                      label="Valor pago (R$)"
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
                              event
                                .target
                                .value
                            )
                          )
                      }
                      icon={
                        <DollarSign
                          size={
                            16
                          }
                          className="text-emerald-400"
                        />
                      }
                    />
                  ) : (
                    <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <RefreshCw
                          size={
                            14
                          }
                        />

                        Controle de Dispensação SUS
                      </div>

                      <div
                        className={
                          shakeFields.includes(
                            "dataRetornoSusTexto"
                          )
                            ? "animate-shake"
                            : ""
                        }
                      >
                        <Input
                          label="Próxima data de retorno ao posto"
                          placeholder="DD/MM/AAAA"
                          value={
                            dataRetornoSusTexto
                          }
                          onChange={
                            (
                              event
                            ) =>
                              setDataRetornoSusTexto(
                                mascaraData(
                                  event
                                    .target
                                    .value
                                )
                              )
                          }
                          error={
                            errors.dataRetornoSusTexto
                          }
                          maxLength={
                            10
                          }
                          inputMode="numeric"
                        />
                      </div>

                      <p className="text-[11px] text-ink-muted">
                        O Vault pode usar essa data para lembrar quando chegar o período informado para uma nova retirada.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <Stethoscope
                      size={
                        16
                      }
                      className="text-ice"
                    />

                    <h3 className="text-sm font-semibold text-ink-primary">
                      Rede de Apoio (Opcional)
                    </h3>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-xs font-medium text-ink-muted">
                        Médico Prescritor
                      </label>

                      {medicoId && (
                        <button
                          type="button"
                          onClick={
                            () => {
                              setMedicoId(
                                ""
                              );

                              setMedicoNome(
                                ""
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
                        () =>
                          setIsDoctorModalOpen(
                            true
                          )
                      }
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left"
                    >
                      <span className="block truncate font-medium text-ink-primary">
                        {medicoNome ||
                          "Vincular médico..."}
                      </span>

                      <span className="text-xs font-bold text-ice">
                        Alterar
                      </span>
                    </button>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-xs font-medium text-ink-muted">
                        Hospital
                      </label>

                      {hospitalId && (
                        <button
                          type="button"
                          onClick={
                            () => {
                              setHospitalId(
                                ""
                              );

                              setHospitalNome(
                                ""
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
                        () =>
                          setIsHospitalModalOpen(
                            true
                          )
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
                          {hospitalNome ||
                            "Vincular hospital..."}
                        </span>
                      </span>

                      <span className="text-xs font-bold text-ice">
                        Alterar
                      </span>
                    </button>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-xs font-medium text-ink-muted">
                        Local / Posto
                      </label>

                      {localId && (
                        <button
                          type="button"
                          onClick={
                            () => {
                              setLocalId(
                                ""
                              );

                              setLocalNome(
                                ""
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
                        () =>
                          setIsLocalModalOpen(
                            true
                          )
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
                          {localNome ||
                            "Vincular local..."}
                        </span>
                      </span>

                      <span className="text-xs font-bold text-ice">
                        Alterar
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep ===
              3 && (
              <motion.div
                key="step3"
                variants={
                  fadeUp
                }
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="mb-4 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        <RefreshCw
                          size={
                            20
                          }
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-ink-primary">
                          Gerenciar Renovação
                        </h3>

                        <p className="text-xs text-ink-muted">
                          Registrar esta aquisição no histórico de renovações.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setGerenciarRenovacao(
                            (
                              previous
                            ) =>
                              !previous
                          );
                        }
                      }
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
                        gerenciarRenovacao
                          ? "bg-ice"
                          : "border border-surface-border bg-surface-raised"
                      }`}
                      aria-label="Gerenciar renovação"
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-void shadow-sm transition-transform ${
                          gerenciarRenovacao
                            ? "translate-x-5"
                            : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <CalculadoraGotas
                  isAtivo={
                    isGotas
                  }
                  onToggle={
                    (
                      ativo
                    ) =>
                      handleFormatoChange(
                        ativo
                          ? "gota"
                          : "comprimido"
                      )
                  }
                  mlTotal={
                    mlTotal
                  }
                  setMlTotal={
                    setMlTotal
                  }
                  gotasPorMl={
                    gotasPorMl
                  }
                  setGotasPorMl={
                    setGotasPorMl
                  }
                  onEstoqueCalculado={
                    (
                      value
                    ) => {
                      setEstoqueGotasCalculado(
                        value
                      );

                      if (
                        estoqueAtivo &&
                        value > 0
                      ) {
                        setEstoqueQuantidade(
                          String(
                            value
                          )
                        );
                      }
                    }
                  }
                />

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package
                        size={
                          16
                        }
                        className="text-ice"
                      />

                      <h3 className="text-sm font-semibold text-ink-primary">
                        Controle de Estoque
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={
                        toggleEstoque
                      }
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
                        estoqueAtivo
                          ? "bg-ice"
                          : "border border-surface-border bg-surface-raised"
                      }`}
                      aria-label="Ativar controle de estoque"
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-void shadow-sm transition-transform ${
                          estoqueAtivo
                            ? "translate-x-5"
                            : ""
                        }`}
                      />
                    </button>
                  </div>

                  <AnimatePresence>
                    {estoqueAtivo && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          height: 0,
                        }}
                        animate={{
                          opacity: 1,
                          height:
                            "auto",
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                        }}
                      >
                        <div className="mb-4 grid grid-cols-2 gap-3">
                          <div
                            className={`transition-all ${
                              shakeFields.includes(
                                "estoqueQuantidade"
                              )
                                ? "animate-shake"
                                : ""
                            }`}
                          >
                            <Input
                              label="Qtd Comprada / Retirada"
                              type="number"
                              inputMode="decimal"
                              min="0"
                              placeholder="Ex: 30"
                              value={
                                estoqueQuantidade
                              }
                              onChange={
                                (
                                  event
                                ) =>
                                  setEstoqueQuantidade(
                                    event
                                      .target
                                      .value
                                  )
                              }
                              error={
                                errors.estoqueQuantidade
                              }
                            />
                          </div>

                          <div
                            className={
                              shakeFields.includes(
                                "estoqueUnidadePorDose"
                              )
                                ? "animate-shake"
                                : ""
                            }
                          >
                            <Input
                              label="Consumo por dose"
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.5"
                              placeholder="Opcional"
                              value={
                                estoqueUnidadePorDose
                              }
                              onChange={
                                (
                                  event
                                ) =>
                                  setEstoqueUnidadePorDose(
                                    event
                                      .target
                                      .value
                                  )
                              }
                              error={
                                errors.estoqueUnidadePorDose
                              }
                            />
                          </div>
                        </div>

                        <p className="mb-4 text-[11px] leading-relaxed text-ink-muted">
                          Informe o consumo por dose somente se souber o valor. Sem essa informação, o Vault registra as tomadas normalmente, mas não calcula consumo automático do estoque.
                        </p>

                        <div
                          className={
                            shakeFields.includes(
                              "estoqueDataReferenciaTexto"
                            )
                              ? "animate-shake"
                              : ""
                          }
                        >
                          <Input
                            label="Data da Aquisição / Retirada"
                            value={
                              estoqueDataReferenciaTexto
                            }
                            onChange={
                              (
                                event
                              ) =>
                                setEstoqueDataReferenciaTexto(
                                  mascaraData(
                                    event
                                      .target
                                      .value
                                  )
                                )
                            }
                            error={
                              errors.estoqueDataReferenciaTexto
                            }
                            maxLength={
                              10
                            }
                            inputMode="numeric"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText
                      size={
                        16
                      }
                      className="text-ice"
                    />

                    <h3 className="text-sm font-semibold text-ink-primary">
                      Receita & Vínculos
                    </h3>
                  </div>

                  <SeletorReceita
                    selected={
                      tipoReceita
                    }
                    onChange={
                      setTipoReceita
                    }
                  />

                  <div className="mb-5 mt-4 grid grid-cols-2 gap-3">
                    <div
                      className={
                        shakeFields.includes(
                          "dataReceitaTexto"
                        )
                          ? "animate-shake"
                          : ""
                      }
                    >
                      <Input
                        label="Data da receita"
                        placeholder="DD/MM/AAAA"
                        value={
                          dataReceitaTexto
                        }
                        onChange={
                          (
                            event
                          ) =>
                            handleDataReceitaChange(
                              event
                                .target
                                .value
                            )
                        }
                        error={
                          errors.dataReceitaTexto
                        }
                        maxLength={
                          10
                        }
                        inputMode="numeric"
                      />
                    </div>

                    <div
                      className={
                        shakeFields.includes(
                          "proximaRenovacaoTexto"
                        )
                          ? "animate-shake"
                          : ""
                      }
                    >
                      <Input
                        label="Próxima renovação"
                        placeholder="DD/MM/AAAA"
                        value={
                          proximaRenovacaoTexto
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setProximaRenovacaoTexto(
                              mascaraData(
                                event
                                  .target
                                  .value
                              )
                            )
                        }
                        error={
                          errors.proximaRenovacaoTexto
                        }
                        maxLength={
                          10
                        }
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  {!attachment ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised p-6">
                      <FileText
                        size={
                          32
                        }
                        className="mb-2 text-ink-muted"
                      />

                      <p className="text-sm font-semibold text-ink-primary">
                        Nenhuma receita anexada
                      </p>

                      <p className="mb-4 mt-1 text-center text-xs text-ink-muted">
                        Você ainda não vinculou a foto ou PDF da prescrição.
                      </p>

                      <button
                        type="button"
                        onClick={
                          () =>
                            fileInputRef.current?.click()
                        }
                        className="flex items-center gap-2 rounded-xl bg-ice/10 px-4 py-2 text-xs font-bold text-ice active:scale-95"
                      >
                        <Upload
                          size={
                            14
                          }
                        />

                        Arquivo
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3">
                      <div className="flex h-11 w-11 overflow-hidden rounded-xl bg-surface">
                        {attachment.type ===
                        "image" ? (
                          <img
                            src={
                              attachment.url
                            }
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <FileText
                            size={
                              20
                            }
                            className="m-auto text-coral"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-primary">
                          {
                            attachment.name
                          }
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={
                          removeAttachment
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral"
                        aria-label="Remover anexo"
                      >
                        <X
                          size={
                            16
                          }
                        />
                      </button>
                    </div>
                  )}

                  <div className="mt-6 border-t border-surface-border/40 pt-5">
                    <button
                      type="button"
                      onClick={
                        () =>
                          setIsTratamentoModalOpen(
                            true
                          )
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-surface-border bg-surface-raised py-3 text-sm font-bold text-ink-primary transition-colors hover:border-ice/50"
                    >
                      <Activity
                        size={
                          16
                        }
                        className="text-violet-400"
                      />

                      {tratamentosSelecionados.length >
                      0
                        ? `${tratamentosSelecionados.length} Quadro(s) vinculado(s)`
                        : "Vincular Tratamento/CID"}
                    </button>
                  </div>

                  <div className="mt-4">
                    <TextArea
                      label="Anotações"
                      placeholder="Posologia complexa, dicas..."
                      value={
                        observacoes
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setObservacoes(
                            event
                              .target
                              .value
                          )
                      }
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-border/40 bg-void/90 p-5 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl gap-3">
            {currentStep >
              1 && (
              <Button
                type="button"
                variant="secondary"
                onClick={
                  prevStep
                }
                className="flex max-w-[100px] flex-1 items-center justify-center"
              >
                <ChevronLeft
                  size={
                    20
                  }
                />
              </Button>
            )}

            {currentStep <
            totalSteps ? (
              <Button
                type="button"
                onClick={
                  nextStep
                }
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-bold shadow-lg shadow-ice/20"
              >
                Avançar

                <ChevronRight
                  size={
                    20
                  }
                />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={
                  handleSubmit
                }
                disabled={
                  isSubmitting ||
                  !activePersonId
                }
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      size={
                        20
                      }
                      className="animate-spin"
                    />

                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={
                        20
                      }
                    />

                    Concluir Cadastro
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <ConfirmationModal
          isOpen={
            showDesativarEstoqueModal
          }
          onClose={
            () =>
              setShowDesativarEstoqueModal(
                false
              )
          }
          onConfirm={
            () => {
              setEstoqueAtivo(
                false
              );

              setShowDesativarEstoqueModal(
                false
              );
            }
          }
          title="Desativar controle de estoque?"
          message="Você está prestes a desativar o controle de estoque para este medicamento. A posologia e os horários continuam vinculados ao medicamento."
          confirmLabel="Desativar"
          cancelLabel="Cancelar"
          type="warning"
        />

        {(isSubmitting ||
          uploadProgress >
            0) && (
          <FloatingSpinner
            label={
              uploadProgress >
              0
                ? `Enviando anexo... ${uploadProgress}%`
                : "Salvando medicamento..."
            }
          />
        )}

        <SelectionModal<any>
          isOpen={
            isCidModalOpen
          }
          onClose={
            () =>
              setIsCidModalOpen(
                false
              )
          }
          title="Selecionar CID"
          items={
            cids ||
            []
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

              router.push(
                "/saude/cids/novo"
              );
            }
          }
          createNewLabel="Cadastrar Novo CID"
          onSelect={
            (
              item
            ) => {
              trigger(
                "vibrate"
              );

              setCidIds(
                (
                  previous
                ) => {
                  if (
                    previous.includes(
                      item.id!
                    )
                  ) {
                    return previous.filter(
                      (
                        id
                      ) =>
                        id !==
                        item.id!
                    );
                  }

                  return [
                    ...previous,
                    item.id!,
                  ];
                }
              );
            }
          }
          renderItem={
            (
              item
            ) => {
              const isSelected =
                cidIds.includes(
                  item.id!
                );

              return (
                <div className="flex w-full items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                      isSelected
                        ? "bg-emerald-400 text-void"
                        : "bg-ice/10 text-ice"
                    }`}
                  >
                    {isSelected ? (
                      <Check
                        size={
                          18
                        }
                      />
                    ) : (
                      <FileText
                        size={
                          18
                        }
                      />
                    )}
                  </div>

                  <div className="min-w-0 text-left">
                    <p
                      className={`font-semibold ${
                        isSelected
                          ? "text-emerald-400"
                          : "text-ink-primary"
                      }`}
                    >
                      {
                        item.codigo
                      }
                    </p>

                    <p className="truncate text-xs text-ink-muted">
                      {
                        item.descricao
                      }
                    </p>
                  </div>
                </div>
              );
            }
          }
        />

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
          title="Selecionar Farmácia"
          items={
            farmacias
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
          enableQuickCreate
          onQuickCreate={
            async (
              name
            ) => {
              const id =
                await addFarmacia({
                  nome:
                    name,
                });

              return {
                id,
                nome:
                  name,
              } as Farmacia;
            }
          }
          onSelect={
            (
              item
            ) => {
              setFarmaciaId(
                item.id!
              );

              setFarmaciaNome(
                item.nome
              );

              setIsPharmacyModalOpen(
                false
              );
            }
          }
          renderItem={
            (
              item
            ) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
                  <Store
                    size={
                      18
                    }
                  />
                </div>

                <div className="text-left">
                  <p className="font-semibold text-ink-primary">
                    {
                      item.nome
                    }
                  </p>
                </div>
              </div>
            )
          }
        />

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
          title="Médico Prescritor"
          items={
            medicos
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
          enableQuickCreate
          onQuickCreate={
            async (
              name
            ) => {
              const id =
                await addMedico({
                  nome:
                    name,
                });

              return {
                id,
                nome:
                  name,
              } as Medico;
            }
          }
          onSelect={
            (
              item
            ) => {
              setMedicoId(
                item.id!
              );

              setMedicoNome(
                item.nome
              );

              setIsDoctorModalOpen(
                false
              );
            }
          }
          renderItem={
            (
              item
            ) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ice/10 text-ice">
                  <Stethoscope
                    size={
                      18
                    }
                  />
                </div>

                <div className="text-left">
                  <p className="font-semibold text-ink-primary">
                    {
                      item.nome
                    }
                  </p>
                </div>
              </div>
            )
          }
        />

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
          title="Selecionar Hospital"
          items={
            hospitais
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
          enableQuickCreate
          onQuickCreate={
            async (
              name
            ) => {
              const id =
                await addHospital({
                  nome:
                    name,

                  tipo:
                    "hospital",
                });

              return {
                id,
                nome:
                  name,

                tipo:
                  "hospital",
              } as Hospital;
            }
          }
          onSelect={
            (
              item
            ) => {
              setHospitalId(
                item.id!
              );

              setHospitalNome(
                item.nome
              );

              setIsHospitalModalOpen(
                false
              );
            }
          }
          renderItem={
            (
              item
            ) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral">
                  <Building2
                    size={
                      18
                    }
                  />
                </div>

                <div className="text-left">
                  <p className="font-semibold text-ink-primary">
                    {
                      item.nome
                    }
                  </p>

                  <p className="text-xs text-ink-muted">
                    Hospital
                  </p>
                </div>
              </div>
            )
          }
        />

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
          title="Selecionar Local / Posto"
          items={
            locais
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
          enableQuickCreate
          onQuickCreate={
            async (
              name
            ) => {
              const id =
                await addLocal({
                  nome:
                    name,

                  tipo:
                    "outro",
                });

              return {
                id,
                nome:
                  name,

                tipo:
                  "outro",
              } as LocalSaude;
            }
          }
          onSelect={
            (
              item
            ) => {
              setLocalId(
                item.id!
              );

              setLocalNome(
                item.nome
              );

              setIsLocalModalOpen(
                false
              );
            }
          }
          renderItem={
            (
              item
            ) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                  <MapPin
                    size={
                      18
                    }
                  />
                </div>

                <div className="text-left">
                  <p className="font-semibold text-ink-primary">
                    {
                      item.nome
                    }
                  </p>

                  <p className="text-xs text-ink-muted">
                    {item.tipo ||
                      "Local"}
                  </p>
                </div>
              </div>
            )
          }
        />

        <SeletorTratamentoModal
          isOpen={
            isTratamentoModalOpen
          }
          onClose={
            () =>
              setIsTratamentoModalOpen(
                false
              )
          }
          selectedIds={
            tratamentosSelecionados
          }
          onChange={
            setTratamentosSelecionados
          }
          personId={
            activePersonId ||
            ""
          }
        />
      </main>
    </PageTransition>
  );
}