// app/saude/medicamentos/editar/page.tsx
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
  AnimatePresence,
  motion,
  } from "framer-motion";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Ban,
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  Circle,
  Clock,
  DollarSign,
  Droplet,
  Eraser,
  FileSearch,
  FileText,
  HeartPulse,
  Info,
  Loader2,
  MapPin,
  Package,
  Palette,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  StickyNote,
  Store,
  Stethoscope,
  Syringe,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";

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
  useCids,
} from "@/hooks/useCids";

import {
  useAuth,
} from "@/hooks/useAuth";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useToast,
} from "@/components/ToastProvider";

import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";

import {
  deleteFile,
  uploadFile,
} from "@/lib/supabase/storage";

import {
  getLocalTodayISO,
  suggestRenewalDate,
  VALIDADE_RECEITA_DIAS,
} from "@/lib/health-utils";

import {
  cancelDoseNotifications,
  requestNotificationPermission,
  scheduleDoseNotifications,
} from "@/lib/dose-notifications";

import {
  sugerirHorarios,
} from "@/lib/health-insights";


import {
  supabaseMedicationCatalogProvider,
} from "@/lib/medication-catalog";

import type {
  MedicationCatalogSearchResult,
} from "@/lib/medication-catalog";

import {
  hospitaisRepository,
} from "@/lib/repositories/hospitais";

import {
  locaisRepository,
} from "@/lib/repositories/locais";

import {
  documentsRepository,
} from "@/lib/repositories/documents";

import type {
  Attachment,
  Farmacia,
  Hospital,
  LocalSaude,
  ModoLembreteReceita,
  Medico,
  Medicamento,
  TipoReceita,
  UpdateMedicamentoInput,
} from "@/lib/types";

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

import {
  CalculadoraGotas,
} from "@/components/saude/CalculadoraGotas";

import {
  SeletorTratamentoModal,
} from "@/components/saude/SeletorTratamentoModal";

import {
  SeletorReceita,
} from "@/components/saude/SeletorReceita";

import {
  QuickDoseModal,
} from "@/components/saude/QuickDoseModal";

// ============================================================
// ANIMAÇÃO
// ============================================================

const fadeUp = {
  initial: {
    opacity: 0,
    y: 15,
  },

  animate: {
    opacity: 1,
    y: 0,
  },

  exit: {
    opacity: 0,
    y: -15,
  },
};

// ============================================================
// TIPOS
// ============================================================

type EditIntent =
  | "menu"
  | "compra"
  | "posologia"
  | "rede"
  | "suspensao"
  | "basico"
  | "evolucao";

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

  const clean =
    iso.split(
      "T"
    )[0];

  const [
    year,
    month,
    day,
  ] =
    clean.split(
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
      month -
        1 ||
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

  return Number.isFinite(
    parsed
  )
    ? parsed
    : undefined;
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

  if (!clean) {
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

function normalizeHorarios(
  values: string[]
): string[] {
  return Array.from(
    new Set(
      values
        .map(
          (
            horario
          ) =>
            horario.trim()
        )
        .filter(
          Boolean
        )
    )
  );
}

function arraysEqual(
  first: string[],
  second: string[]
) {
  if (
    first.length !==
    second.length
  ) {
    return false;
  }

  return first.every(
    (
      value,
      index
    ) =>
      value ===
      second[index]
  );
}

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

function getPositiveNumberOrNull(
  value: string
): number | null {
  if (
    !value.trim()
  ) {
    return null;
  }

  const parsed =
    Number(
      value
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed <=
      0
  ) {
    return null;
  }

  return parsed;
}

function normalizeCatalogText(
  value: string
) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function formatMatchesCatalog(
  formato: string,
  texts: string[]
) {
  if (!formato || texts.length === 0) {
    return true;
  }

  const aliases: Record<string, string[]> = {
    comprimido: [
      "comprimido",
      "comp",
    ],

    partido: [
      "comprimido",
      "comp",
    ],

    capsula: [
      "capsula",
      "cap",
    ],

    gota: [
      "gota",
      "gotas",
      "gts",
    ],

    injecao: [
      "injecao",
      "injetavel",
    ],

    adesivo: [
      "adesivo",
      "transdermico",
    ],

    solucao: [
      "solucao",
    ],

    suspensao: [
      "suspensao",
    ],

    xarope: [
      "xarope",
    ],

    spray: [
      "spray",
      "aerosol",
    ],

    inalador: [
      "inalador",
      "inalacao",
      "inalatoria",
    ],

    creme: [
      "creme",
    ],

    pomada: [
      "pomada",
    ],

    gel: [
      "gel",
    ],

    colirio: [
      "colirio",
      "oftalm",
    ],

    supositorio: [
      "supositorio",
    ],

    ovulo: [
      "ovulo",
      "vaginal",
    ],

    po: [
      "po",
    ],

    granulado: [
      "granulado",
    ],

    sache: [
      "sache",
    ],

    sublingual: [
      "sublingual",
    ],

    bucal: [
      "bucal",
    ],

    mastigavel: [
      "mastigavel",
    ],

    efervescente: [
      "efervescente",
    ],

    dispersivel: [
      "dispersivel",
      "orodispersivel",
    ],

    implante: [
      "implante",
    ],
  };

  const expected =
    aliases[formato] ?? [
      formato,
    ];

  const normalizedTexts =
    texts
      .map(normalizeCatalogText)
      .filter(Boolean);

  return expected.some(
    (term) => {
      const normalized =
        normalizeCatalogText(term);

      return normalizedTexts.some(
        (candidate) =>
          candidate.includes(
            normalized
          )
      );
    }
  );
}

function getEstoqueUnidadePorFormato(
  formato: string
) {
  switch (formato) {
    case "gota":
    case "colirio":
      return "gota(s)";

    case "solucao":
    case "suspensao":
    case "xarope":
      return "ml";

    case "spray":
    case "inalador":
      return "jato(s)";

    case "creme":
    case "pomada":
    case "gel":
      return "aplicação(ões)";

    case "injecao":
      return "dose(s)";

    case "adesivo":
      return "adesivo(s)";

    case "sache":
      return "sachê(s)";

    case "supositorio":
      return "supositório(s)";

    case "ovulo":
      return "óvulo(s)";

    case "implante":
      return "implante(s)";

    case "capsula":
      return "cápsula(s)";

    default:
      return "comprimido(s)";
  }
}

// ============================================================
// ÍCONES
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
    width={
      size
    }
    height={
      size
    }
    viewBox="0 0 24 24"
    fill={
      fill
    }
    stroke={
      stroke
    }
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
    width={
      size
    }
    height={
      size
    }
    viewBox="0 0 24 24"
    fill={
      fill
    }
    stroke={
      stroke
    }
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
    width={
      size
    }
    height={
      size
    }
    viewBox="0 0 24 24"
    fill={
      fill
    }
    stroke={
      stroke
    }
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

const FORMATOS_PRINCIPAIS = [
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

const FORMATOS_ADICIONAIS = [
  { id: "solucao", label: "Solução", icon: Droplet },
  { id: "suspensao", label: "Suspensão", icon: Droplet },
  { id: "xarope", label: "Xarope", icon: Droplet },
  { id: "spray", label: "Spray", icon: Activity },
  { id: "inalador", label: "Inalador", icon: Activity },
  { id: "creme", label: "Creme", icon: Eraser },
  { id: "pomada", label: "Pomada", icon: Eraser },
  { id: "gel", label: "Gel", icon: Droplet },
  { id: "colirio", label: "Colírio", icon: Droplet },
  { id: "supositorio", label: "Supositório", icon: CapsuleIcon },
  { id: "ovulo", label: "Óvulo", icon: CapsuleIcon },
  { id: "po", label: "Pó", icon: Package },
  { id: "granulado", label: "Granulado", icon: Package },
  { id: "sache", label: "Sachê", icon: Package },
  { id: "sublingual", label: "Sublingual", icon: CirclePillIcon },
  { id: "bucal", label: "Bucal", icon: CirclePillIcon },
  { id: "mastigavel", label: "Mastigável", icon: CirclePillIcon },
  { id: "efervescente", label: "Efervescente", icon: Activity },
  { id: "dispersivel", label: "Dispersível", icon: Activity },
  { id: "implante", label: "Implante", icon: Package },
];

const FORMATOS = [
  ...FORMATOS_PRINCIPAIS,
  ...FORMATOS_ADICIONAIS,
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
// CONTENT
// ============================================================

function EditarMedicamentoContent() {
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

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get(
      "id"
    ) ||
    "";

  const intentParam =
    searchParams.get(
      "intent"
    ) as EditIntent | null;

  const [
    editIntent,
    setEditIntent,
  ] =
    useState<EditIntent>(
      intentParam ||
        "menu"
    );

  const {
    user,
  } =
    useAuth();

  const {
    activePersonId,
  } =
    useActivePersonId();

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

  const {
    getMedicamento,
    updateMedicamento,
    deleteMedicamento,
    medicamentos:
      medicamentosList,
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
    hospitais:
      hospitaisLocais,
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

  const medicamentosAtivos =
    (
      medicamentosList ||
      []
    ).filter(
      (
        medicamento
      ) =>
        medicamento.id !==
          id &&
        medicamento.status !==
          "descontinuado"
    );

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const isSubmitLocked =
    useRef(
      false
    );

  // ==========================================================
  // ESTADO GERAL
  // ==========================================================

  const [
    reloadVersion,
    setReloadVersion,
  ] =
    useState(
      0
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
    );

  const [
    notFound,
    setNotFound,
  ] =
    useState(
      false
    );

  const [
    hasChanges,
    setHasChanges,
  ] =
    useState(
      false
    );

  const [
    showConfirmExitModal,
    setShowConfirmExitModal,
  ] =
    useState(
      false
    );

  const [
    quickDoseOpen,
    setQuickDoseOpen,
  ] =
    useState(
      false
    );

  // ==========================================================
  // IDENTIDADE / OWNERSHIP
  // ==========================================================

  const [
    personId,
    setPersonId,
  ] =
    useState(
      ""
    );

  const [
    documentId,
    setDocumentId,
  ] =
    useState(
      ""
    );

  // ==========================================================
  // BÁSICO
  // ==========================================================

  const [
    nome,
    setNome,
  ] =
    useState(
      ""
    );

  const [
    nomeOriginal,
    setNomeOriginal,
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
    isFormatoModalOpen,
    setIsFormatoModalOpen,
  ] =
    useState(
      false
    );

  const [
    catalogResults,
    setCatalogResults,
  ] =
    useState<
      MedicationCatalogSearchResult[]
    >(
      []
    );

  const [
    selectedCatalogReferenceId,
    setSelectedCatalogReferenceId,
  ] =
    useState<string | null>(
      null
    );

  const [
    isCatalogSearching,
    setIsCatalogSearching,
  ] =
    useState(
      false
    );

  const [
    catalogSearchError,
    setCatalogSearchError,
  ] =
    useState(
      false
    );

  const [
    cores,
    setCores,
  ] =
    useState<string[]>(
      []
    );

  const isGotas =
    formato ===
    "gota";

  // ==========================================================
  // POSOLOGIA
  // ==========================================================

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
      []
    );

  const [
    horariosOriginais,
    setHorariosOriginais,
  ] =
    useState<string[]>(
      []
    );

  // ==========================================================
  // REDE
  // ==========================================================

  const [
    medicoNome,
    setMedicoNome,
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
    farmaciaNome,
    setFarmaciaNome,
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
    preco,
    setPreco,
  ] =
    useState(
      ""
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

  // ==========================================================
  // RECEITA
  // ==========================================================

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
    modoLembreteReceita,
    setModoLembreteReceita,
  ] =
    useState<ModoLembreteReceita>(
      "automatico"
    );

  const [
    dataLembreteReceitaTexto,
    setDataLembreteReceitaTexto,
  ] =
    useState(
      ""
    );

  const [
    renovacaoEditadaManualmente,
    setRenovacaoEditadaManualmente,
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

  // ==========================================================
  // CID / TRATAMENTOS
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

  const [
    tratamentosSelecionados,
    setTratamentosSelecionados,
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

  // ==========================================================
  // EVOLUÇÃO
  // ==========================================================

  const [
    dosagemOriginal,
    setDosagemOriginal,
  ] =
    useState(
      ""
    );

  const [
    novaDosagem,
    setNovaDosagem,
  ] =
    useState(
      ""
    );

  const [
    medicoEvolucaoNome,
    setMedicoEvolucaoNome,
  ] =
    useState(
      ""
    );

  const [
    medicoEvolucaoId,
    setMedicoEvolucaoId,
  ] =
    useState(
      ""
    );

  const [
    historicoDosagens,
    setHistoricoDosagens,
  ] =
    useState<
      Array<{
        dosagem_antiga: string;
        data_mudanca: string;
        medico_responsavel: string;
      }>
    >(
      []
    );

  // ==========================================================
  // SUSPENSÃO
  // ==========================================================

  const [
    statusAtivo,
    setStatusAtivo,
  ] =
    useState(
      true
    );

  const [
    statusOriginalAtivo,
    setStatusOriginalAtivo,
  ] =
    useState(
      true
    );

  const [
    dataDescontinuacaoOriginal,
    setDataDescontinuacaoOriginal,
  ] =
    useState(
      ""
    );

  const [
    motivoDescontinuacao,
    setMotivoDescontinuacao,
  ] =
    useState(
      ""
    );

  const [
    medicoDescontinuacaoId,
    setMedicoDescontinuacaoId,
  ] =
    useState(
      ""
    );

  const [
    medicoDescontinuacaoNome,
    setMedicoDescontinuacaoNome,
  ] =
    useState(
      ""
    );

  const [
    substituidoPorId,
    setSubstituidoPorId,
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
      ""
    );

  const [
    estoqueUnidade,
    setEstoqueUnidade,
  ] =
    useState(
      "comprimido(s)"
    );

  const [
    estoqueUnidadePorDose,
    setEstoqueUnidadePorDose,
  ] =
    useState(
      ""
    );

  const [
    isGotasCalcAtivo,
    setIsGotasCalcAtivo,
  ] =
    useState(
      false
    );

  const [
    mlTotal,
    setMlTotal,
  ] =
    useState(
      ""
    );

  const [
    gotasPorMl,
    setGotasPorMl,
  ] =
    useState(
      ""
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
    originalAttachmentUrl,
    setOriginalAttachmentUrl,
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
    isDoctorDescontinuacaoModalOpen,
    setIsDoctorDescontinuacaoModalOpen,
  ] =
    useState(
      false
    );

  const [
    isDoctorEvolucaoModalOpen,
    setIsDoctorEvolucaoModalOpen,
  ] =
    useState(
      false
    );

  const [
    isSubstitutoModalOpen,
    setIsSubstitutoModalOpen,
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
    showDeleteModal,
    setShowDeleteModal,
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
  // DERIVADOS
  // ==========================================================

  const selectedMedico =
    medicos.find(
      (
        item
      ) =>
        item.id ===
        medicoId
    ) ||
    medicos.find(
      (
        item
      ) =>
        item.nome ===
        medicoNome
    );

  const selectedMedicoDescontinuacao =
    medicos.find(
      (
        item
      ) =>
        item.id ===
        medicoDescontinuacaoId
    ) ||
    medicos.find(
      (
        item
      ) =>
        item.nome ===
        medicoDescontinuacaoNome
    );

  const selectedMedicoEvolucao =
    medicos.find(
      (
        item
      ) =>
        item.id ===
        medicoEvolucaoId
    ) ||
    medicos.find(
      (
        item
      ) =>
        item.nome ===
        medicoEvolucaoNome
    );

  const selectedFarmacia =
    farmacias.find(
      (
        item
      ) =>
        item.id ===
        farmaciaId
    ) ||
    farmacias.find(
      (
        item
      ) =>
        item.nome ===
        farmaciaNome
    );

  const selectedSubstituto =
    medicamentosAtivos.find(
      (
        item
      ) =>
        item.id ===
        substituidoPorId
    );

  const markChanged =
    () => {
      setHasChanges(
        true
      );
    };

  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(
    () => {
      let cancelled =
        false;

      const load =
        async () => {
          setIsLoading(
            true
          );

          setNotFound(
            false
          );

          if (!id) {
            setNotFound(
              true
            );

            setIsLoading(
              false
            );

            return;
          }

          try {
            const item =
              await getMedicamento(
                id
              );

            if (
              cancelled
            ) {
              return;
            }

            if (
              !item ||
              !item.person_id ||
              (
                activePersonId &&
                item.person_id !==
                  activePersonId
              )
            ) {
              setNotFound(
                true
              );

              setIsLoading(
                false
              );

              return;
            }

            const safePersonId =
              item.person_id;

            setPersonId(
              safePersonId
            );

            setNome(
              item.nome ||
                ""
            );

            setNomeOriginal(
              item.nome ||
                ""
            );

            setDosagem(
              item.dosagem ||
                ""
            );

            setDosagemOriginal(
              item.dosagem ||
                ""
            );

            setNovaDosagem(
              item.dosagem ||
                ""
            );

            setHistoricoDosagens(
              item.historico_dosagens ||
                []
            );

            setMedicoEvolucaoId(
              ""
            );

            setMedicoEvolucaoNome(
              ""
            );

            setFormato(
              item.formato ||
                "comprimido"
            );

            setCores(
              item.cores &&
                item.cores.length >
                  0
                ? item.cores
                : [
                    "#FFFFFF",
                  ]
            );

            setTipoUso(
              item.tipo_uso ||
                "continuo"
            );

            setMedicoNome(
              item.medico ||
                ""
            );

            setMedicoId(
              item.medico_id ||
                ""
            );

            setHospitalId(
              item.hospital_id ||
                ""
            );

            setLocalId(
              item.local_id ||
                ""
            );

            setFarmaciaNome(
              item.farmacia ||
                ""
            );

            setFarmaciaId(
              item.farmacia_id ||
                ""
            );

            setTipoAquisicao(
              item.tipo_aquisicao ===
                "sus"
                ? "sus"
                : "comprado"
            );

            setDataRetornoSusTexto(
              isoParaBr(
                item.data_retorno_sus ||
                  ""
              )
            );

            setCidIds(
              item.cid_ids ||
                (
                  item.cid_id
                    ? [
                        item.cid_id,
                      ]
                    : []
                )
            );

            if (
              item.preco !==
                undefined &&
              item.preco !==
                null
            ) {
              const cents =
                Math.round(
                  item.preco *
                    100
                ).toString();

              setPreco(
                handleCurrencyMask(
                  cents
                )
              );
            } else {
              setPreco(
                ""
              );
            }

            setTipoReceita(
              (
                item.tipo_receita as TipoReceita
              ) ||
                "comum"
            );

            setDataReceitaTexto(
              isoParaBr(
                item.data_receita ||
                  ""
              )
            );

            setProximaRenovacaoTexto(
              isoParaBr(
                item.proxima_renovacao ||
                  ""
              )
            );

            setModoLembreteReceita(
              item.lembrete_receita_modo ||
                "automatico"
            );

            setDataLembreteReceitaTexto(
              isoParaBr(
                item.lembrete_receita_data ||
                  ""
              )
            );

            setRenovacaoEditadaManualmente(
              false
            );

            setObservacoes(
              item.observacoes ||
                ""
            );

            const isActive =
              item.status !==
              "descontinuado";

            setStatusAtivo(
              isActive
            );

            setStatusOriginalAtivo(
              isActive
            );

            setDataDescontinuacaoOriginal(
              item.data_descontinuacao ||
                ""
            );

            setMotivoDescontinuacao(
              item.motivo_descontinuacao ||
                ""
            );

            setMedicoDescontinuacaoId(
              item.medico_descontinuacao_id ||
                ""
            );

            setMedicoDescontinuacaoNome(
              item.medico_descontinuacao_nome ||
                ""
            );

            setSubstituidoPorId(
              item.substituido_por_id ||
                ""
            );

            setTratamentosSelecionados(
              item.tratamento_ids ||
                []
            );

            const loadedHorarios =
              Array.isArray(
                item.estoque_horarios
              )
                ? normalizeHorarios(
                    item.estoque_horarios
                  )
                : [];

            setHorarios(
              loadedHorarios
            );

            setHorariosOriginais(
              loadedHorarios
            );

            setVezesAoDia(
              String(
                loadedHorarios.length >
                  0
                  ? loadedHorarios.length
                  : 1
              )
            );

            setPrimeiroHorario(
              loadedHorarios[
                0
              ] ||
                "08:00"
            );

            if (
              typeof item.estoque_quantidade ===
                "number" &&
              Number.isFinite(
                item.estoque_quantidade
              )
            ) {
              setEstoqueAtivo(
                true
              );

              setEstoqueQuantidade(
                String(
                  item.estoque_quantidade
                )
              );

              setEstoqueDataReferenciaTexto(
                isoParaBr(
                  item.estoque_data_referencia ||
                    getLocalTodayISO()
                )
              );
            } else {
              setEstoqueAtivo(
                false
              );

              setEstoqueQuantidade(
                ""
              );

              setEstoqueDataReferenciaTexto(
                isoParaBr(
                  getLocalTodayISO()
                )
              );
            }

            setEstoqueUnidade(
              item.estoque_unidade_medida ||
                (
                  item.formato ===
                  "gota"
                    ? "gota(s)"
                    : "comprimido(s)"
                )
            );

            setEstoqueUnidadePorDose(
              typeof item.estoque_unidade_por_dose ===
                  "number" &&
                Number.isFinite(
                  item.estoque_unidade_por_dose
                ) &&
                item.estoque_unidade_por_dose >
                  0
                ? String(
                    item.estoque_unidade_por_dose
                  )
                : ""
            );

            if (
              item.estoque_ml_total !==
                undefined &&
              item.estoque_ml_total !==
                null
            ) {
              setIsGotasCalcAtivo(
                true
              );

              setMlTotal(
                String(
                  item.estoque_ml_total
                )
              );
            } else {
              setIsGotasCalcAtivo(
                false
              );

              setMlTotal(
                ""
              );
            }

            setGotasPorMl(
              item.estoque_gotas_por_ml !==
                  undefined &&
                item.estoque_gotas_por_ml !==
                  null
                ? String(
                    item.estoque_gotas_por_ml
                  )
                : ""
            );

            setDocumentId(
              item.document_id ||
                ""
            );

            setAttachment(
              null
            );

            setLocalFile(
              null
            );

            setOriginalAttachmentUrl(
              ""
            );

            if (
              item.document_id
            ) {
              const doc =
                await documentsRepository.getById(
                  item.document_id,
                  safePersonId
                );

              if (
                !cancelled &&
                doc
                  ?.attachments &&
                doc.attachments.length >
                  0
              ) {
                const firstAttachment =
                  doc.attachments[
                    0
                  ];

                setAttachment(
                  firstAttachment
                );

                setOriginalAttachmentUrl(
                  firstAttachment.url ||
                    ""
                );
              }
            }

            if (
              item.hospital_id
            ) {
              const hospital =
                await hospitaisRepository.getById(
                  item.hospital_id
                );

              if (
                !cancelled &&
                hospital
              ) {
                setHospitalNome(
                  hospital.nome
                );
              }
            } else {
              setHospitalNome(
                ""
              );
            }

            if (
              item.local_id
            ) {
              const local =
                await locaisRepository.getById(
                  item.local_id
                );

              if (
                !cancelled &&
                local
              ) {
                setLocalNome(
                  local.nome
                );
              }
            } else {
              setLocalNome(
                ""
              );
            }

            setErrors(
              {}
            );

            setShakeFields(
              []
            );

            setHasChanges(
              false
            );

            setIsLoading(
              false
            );
          } catch {
            if (
              !cancelled
            ) {
              setNotFound(
                true
              );

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
      getMedicamento,
      activePersonId,
      reloadVersion,
    ]
  );

  // ==========================================================
  // BLOB CLEANUP
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
  // MEDICATION INTELLIGENCE
  // ==========================================================

  useEffect(
    () => {
      const query =
        nome.trim();

      if (
        query.length < 4
      ) {
        setCatalogResults([]);
        setSelectedCatalogReferenceId(null);
        setIsCatalogSearching(false);
        setCatalogSearchError(false);

        return;
      }

      let cancelled =
        false;

      const timer =
        window.setTimeout(
          async () => {
            setIsCatalogSearching(
              true
            );

            setCatalogSearchError(
              false
            );

            try {
              const results =
                await supabaseMedicationCatalogProvider.search(
                  query,
                  {
                    limit: 3,
                  }
                );

              if (!cancelled) {
                setCatalogResults(
                  results
                );
              }
            } catch (error) {
              console.warn(
                "[Medication Intelligence] catálogo indisponível:",
                error
              );

              if (!cancelled) {
                setCatalogResults(
                  []
                );

                setCatalogSearchError(
                  true
                );
              }
            } finally {
              if (!cancelled) {
                setIsCatalogSearching(
                  false
                );
              }
            }
          },
          650
        );

      return () => {
        cancelled = true;

        window.clearTimeout(
          timer
        );
      };
    },
    [
      nome,
    ]
  );

  // ==========================================================
  // HANDLERS
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

      setTimeout(
        () =>
          setShakeFields(
            []
          ),
        600
      );
    };

  const toggleFormato =
    (
      novoFormato:
        string
    ) => {
      trigger(
        "vibrate"
      );

      setFormato(
        novoFormato
      );

      setEstoqueUnidade(
        getEstoqueUnidadePorFormato(
          novoFormato
        )
      );

      if (
        novoFormato ===
        "gota" &&
        !isGotasCalcAtivo
      ) {
        setIsGotasCalcAtivo(
          true
        );
      }

      markChanged();
    };

  const toggleCor =
    (
      hex:
        string
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

      markChanged();
    };

  const handleGerarHorarios =
    () => {
      if (
        tipoUso !==
        "continuo"
      ) {
        return;
      }

      const qtd =
        Number(
          vezesAoDia
        );

      if (
        !Number.isInteger(
          qtd
        ) ||
        qtd <=
          0
      ) {
        setErrors(
          (
            previous
          ) => ({
            ...previous,

            vezesAoDia:
              "Informe uma frequência válida",
          })
        );

        triggerShake(
          [
            "vezesAoDia",
          ]
        );

        return;
      }

      if (
        !isValidTime(
          primeiroHorario
        )
      ) {
        setErrors(
          (
            previous
          ) => ({
            ...previous,

            primeiroHorario:
              "Horário inválido",
          })
        );

        triggerShake(
          [
            "primeiroHorario",
          ]
        );

        return;
      }

      const novosHorarios =
        sugerirHorarios(
          primeiroHorario,
          qtd
        );

      setHorarios(
        novosHorarios.length >
          0
          ? normalizeHorarios(
              novosHorarios
            )
          : [
              primeiroHorario,
            ]
      );

      setErrors(
        (
          previous
        ) => {
          const next = {
            ...previous,
          };

          delete next.vezesAoDia;
          delete next.primeiroHorario;

          return next;
        }
      );

      markChanged();

      trigger(
        "success"
      );
    };

  const handleDataReceitaBlur =
    () => {
      const isoData =
        brParaIso(
          dataReceitaTexto
        );

      if (
        !isoData
      ) {
        return;
      }

      const dias =
        VALIDADE_RECEITA_DIAS[
          tipoReceita
        ];

      if (
        dias &&
        !renovacaoEditadaManualmente
      ) {
        setProximaRenovacaoTexto(
          isoParaBr(
            suggestRenewalDate(
              isoData,
              tipoReceita
            )
          )
        );

        markChanged();
      }
    };

  const handleTipoReceitaChange =
    (
      tipo:
        TipoReceita
    ) => {
      trigger(
        "vibrate"
      );

      setTipoReceita(
        tipo
      );

      markChanged();

      const isoData =
        brParaIso(
          dataReceitaTexto
        );

      if (
        isoData &&
        VALIDADE_RECEITA_DIAS[
          tipo
        ] &&
        !renovacaoEditadaManualmente
      ) {
        setProximaRenovacaoTexto(
          isoParaBr(
            suggestRenewalDate(
              isoData,
              tipo
            )
          )
        );
      }
    };

  const handleDateChange =
    (
      setter:
        (
          value:
            string
        ) => void,

      isRenovacao =
        false
    ) =>
    (
      event:
        React.ChangeEvent<HTMLInputElement>
    ) => {
      setter(
        mascaraData(
          event.target.value
        )
      );

      if (
        isRenovacao
      ) {
        setRenovacaoEditadaManualmente(
          true
        );
      }

      markChanged();
    };

  const toggleEstoque =
    () => {
      trigger(
        "vibrate"
      );

      if (
        estoqueAtivo
      ) {
        setShowDesativarEstoqueModal(
          true
        );

        return;
      }

      setEstoqueAtivo(
        true
      );

      if (
        !estoqueDataReferenciaTexto
      ) {
        setEstoqueDataReferenciaTexto(
          isoParaBr(
            getLocalTodayISO()
          )
        );
      }

      markChanged();
    };

  const updateHorario =
    (
      index:
        number,
      value:
        string
    ) => {
      setHorarios(
        (
          previous
        ) =>
          previous.map(
            (
              horario,
              currentIndex
            ) =>
              currentIndex ===
              index
                ? value
                : horario
          )
      );

      markChanged();
    };

  const addHorario =
    () => {
      trigger(
        "vibrate"
      );

      setHorarios(
        (
          previous
        ) => [
          ...previous,
          "",
        ]
      );

      markChanged();
    };

  const removeHorario =
    (
      index:
        number
    ) => {
      trigger(
        "vibrate"
      );

      setHorarios(
        (
          previous
        ) =>
          previous.filter(
            (
              _,
              currentIndex
            ) =>
              currentIndex !==
              index
          )
      );

      markChanged();
    };

  const handleFileSelect =
    (
      event:
        React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[
          0
        ];

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

      const previewUrl =
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
          previewUrl,

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

      markChanged();

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

      markChanged();

      trigger(
        "vibrate"
      );
    };

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

      const shakeList:
        string[] = [];

      if (
        (
          editIntent ===
            "basico" ||
          editIntent ===
            "menu"
        ) &&
        !nome.trim()
      ) {
        newErrors.nome =
          "Obrigatório";

        shakeList.push(
          "nome"
        );
      }

      if (
        editIntent ===
          "evolucao" &&
        !novaDosagem.trim()
      ) {
        newErrors.novaDosagem =
          "Obrigatória";

        shakeList.push(
          "novaDosagem"
        );
      }

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
        modoLembreteReceita ===
          "data_personalizada" &&
        !brParaIso(
          dataLembreteReceitaTexto
        )
      ) {
        newErrors.dataLembreteReceitaTexto =
          "Informe uma data válida";

        shakeList.push(
          "dataLembreteReceitaTexto"
        );
      }

      if (
        tipoAquisicao ===
          "sus" &&
        dataRetornoSusTexto &&
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

      if (
        !statusAtivo &&
        !motivoDescontinuacao.trim()
      ) {
        newErrors.motivoDescontinuacao =
          "Informe o motivo";

        shakeList.push(
          "motivoDescontinuacao"
        );
      }

      if (
        estoqueAtivo &&
        editIntent ===
          "compra"
      ) {
        const quantidade =
          Number(
            estoqueQuantidade
          );

        if (
          estoqueQuantidade ===
            "" ||
          !Number.isFinite(
            quantidade
          ) ||
          quantidade <
            0
        ) {
          newErrors.estoqueQuantidade =
            "Informe uma quantidade válida";

          shakeList.push(
            "estoqueQuantidade"
          );
        }

        if (
          estoqueUnidadePorDose.trim()
        ) {
          const unidadeDose =
            Number(
              estoqueUnidadePorDose
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
          !estoqueDataReferenciaTexto ||
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

        if (
          isGotas &&
          isGotasCalcAtivo
        ) {
          const ml =
            Number(
              mlTotal
            );

          const gotas =
            Number(
              gotasPorMl
            );

          if (
            !Number.isFinite(
              ml
            ) ||
            ml <=
              0
          ) {
            newErrors.mlTotal =
              "Informe o volume do frasco";

            shakeList.push(
              "mlTotal"
            );
          }

          if (
            !Number.isFinite(
              gotas
            ) ||
            gotas <=
              0
          ) {
            newErrors.gotasPorMl =
              "Informe quantas gotas equivalem a 1 ml";

            shakeList.push(
              "gotasPorMl"
            );
          }
        }
      }

      if (
        editIntent ===
          "posologia" &&
        tipoUso ===
          "continuo"
      ) {
        const qtd =
          Number(
            vezesAoDia
          );

        if (
          !Number.isInteger(
            qtd
          ) ||
          qtd <=
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

        const horariosInvalidos =
          horarios.some(
            (
              horario
            ) =>
              !isValidTime(
                horario
              )
          );

        if (
          horarios.length ===
            0 ||
          horariosInvalidos
        ) {
          newErrors.horarios =
            "Revise os horários configurados.";

          shakeList.push(
            "horarios"
          );
        }

        const horariosNormalizados =
          normalizeHorarios(
            horarios
          );

        if (
          horariosNormalizados.length !==
          horarios.length
        ) {
          newErrors.horarios =
            "Não repita o mesmo horário na rotina.";

          if (
            !shakeList.includes(
              "horarios"
            )
          ) {
            shakeList.push(
              "horarios"
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

        window.scrollTo({
          top:
            0,

          behavior:
            "smooth",
        });
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
    async () => {
      if (
        !validate()
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      if (
        isSubmitLocked.current ||
        isSaving
      ) {
        return;
      }

      isSubmitLocked.current =
        true;

      runSave(
        async () => {
          if (
            !activePersonId ||
            !personId ||
            activePersonId !==
              personId
          ) {
            throw new Error(
              "Medicamento não pertence à pessoa ativa."
            );
          }

          const safePersonId =
            activePersonId;

          const horariosFiltrados =
            tipoUso ===
            "continuo"
              ? normalizeHorarios(
                  horarios
                )
              : [];

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

          const dataLembreteReceitaISO =
            modoLembreteReceita ===
              "data_personalizada"
              ? brParaIso(
                  dataLembreteReceitaTexto
                ) ||
                undefined
              : undefined;

          const dataRetornoSusISO =
            tipoAquisicao ===
              "sus"
              ? brParaIso(
                  dataRetornoSusTexto
                ) ||
                undefined
              : undefined;

          const quantidadeEstoqueFinal =
            estoqueAtivo
              ? Number(
                  estoqueQuantidade
                )
              : null;

          const estoqueDataReferenciaISO =
            estoqueAtivo
              ? brParaIso(
                  estoqueDataReferenciaTexto
                ) ||
                getLocalTodayISO()
              : undefined;

          const unidadePorDoseFinal =
            estoqueAtivo
              ? getPositiveNumberOrNull(
                  estoqueUnidadePorDose
                )
              : null;

          let dosagemFinal =
            dosagem;

          let historicoFinal =
            [
              ...historicoDosagens,
            ];

          if (
            editIntent ===
              "evolucao" &&
            novaDosagem.trim() !==
              dosagemOriginal
          ) {
            historicoFinal.push({
              dosagem_antiga:
                dosagemOriginal,

              data_mudanca:
                getLocalTodayISO(),

              medico_responsavel:
                selectedMedicoEvolucao
                  ?.nome ||
                medicoEvolucaoNome ||
                "Não informado",
            });

            dosagemFinal =
              novaDosagem.trim();
          }

          const precoNumerico =
            tipoAquisicao ===
              "comprado"
              ? parseCurrency(
                  preco
                )
              : undefined;

          let effectiveDocumentId =
            documentId ||
            undefined;

          let createdDocumentId:
            string | undefined;

          let uploadedNewUrl:
            string | undefined;

          let previousDocument:
            Awaited<
              ReturnType<
                typeof documentsRepository.getById
              >
            >;

          try {
            if (
              effectiveDocumentId
            ) {
              previousDocument =
                await documentsRepository.getById(
                  effectiveDocumentId,
                  safePersonId
                );
            }

            let finalAttachment =
              attachment;

            if (
              localFile &&
              attachment
            ) {
              if (
                !user
              ) {
                throw new Error(
                  "É necessário estar autenticado para enviar um novo anexo."
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

              if (
                error ||
                !url
              ) {
                throw new Error(
                  "Não foi possível enviar o novo anexo da receita."
                );
              }

              uploadedNewUrl =
                url;

              finalAttachment = {
                ...attachment,

                url,
              };
            }

            if (
              finalAttachment
                ?.url
                ?.startsWith(
                  "blob:"
                )
            ) {
              throw new Error(
                "O arquivo selecionado não está mais disponível. Selecione-o novamente."
              );
            }

            const previousAdditionalAttachments =
              previousDocument
                ?.attachments
                ?.slice(
                  1
                ) ||
              [];

            const finalAttachments =
              finalAttachment
                ? [
                    finalAttachment,
                    ...previousAdditionalAttachments,
                  ]
                : previousAdditionalAttachments;

            const shouldHaveDocument =
              Boolean(
                effectiveDocumentId ||
                  dataReceitaISO ||
                  proximaRenovacaoISO ||
                  finalAttachment
              );

            if (
              effectiveDocumentId
            ) {
              const doc =
                previousDocument;

              if (!doc) {
                throw new Error(
                  "Documento da receita não encontrado para a pessoa ativa."
                );
              }

              await documentsRepository.update(
                effectiveDocumentId,
                safePersonId,
                {
                  title:
                    `Receita — ${nome.trim()}`,

                  description:
                    observacoes.trim() ||
                    undefined,

                  metadata: {
                    ...doc.metadata,

                    medication:
                      nome.trim(),

                    dosage:
                      dosagemFinal,

                    prescription_date:
                      dataReceitaISO ||
                      null,

                    renewal_date:
                      proximaRenovacaoISO ||
                      null,

                    tratamento_ids:
                      tratamentosSelecionados,

                    tipo_receita:
                      tipoReceita,

                    formato,

                    status:
                      statusAtivo
                        ? "ativo"
                        : "descontinuado",
                  },

                  attachments:
                    finalAttachments,
                }
              );
            } else if (
              shouldHaveDocument
            ) {
              createdDocumentId =
                await documentsRepository.create({
                  person_id:
                    safePersonId,

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
                      dosagemFinal,

                    prescription_date:
                      dataReceitaISO ||
                      null,

                    renewal_date:
                      proximaRenovacaoISO ||
                      null,

                    tratamento_ids:
                      tratamentosSelecionados,

                    tipo_receita:
                      tipoReceita,

                    formato,

                    status:
                      statusAtivo
                        ? "ativo"
                        : "descontinuado",
                  },

                  attachments:
                    finalAttachment
                      ? [
                          finalAttachment,
                        ]
                      : [],

                  is_favorite:
                    false,
                });

              effectiveDocumentId =
                createdDocumentId;
            }

            let dataDescontinuacao:
              string | null =
              null;

            if (
              !statusAtivo
            ) {
              dataDescontinuacao =
                statusOriginalAtivo
                  ? getLocalTodayISO()
                  : dataDescontinuacaoOriginal ||
                    getLocalTodayISO();
            }

            const updatePayload:
              UpdateMedicamentoInput = {
              document_id:
                effectiveDocumentId ||
                null,

              nome:
                nome.trim(),

              dosagem:
                dosagemFinal,

              cid_ids:
                cidIds,

              formato,

              cores,

              tipo_uso:
                tipoUso,

              tipo_aquisicao:
                tipoAquisicao,

              data_retorno_sus:
                dataRetornoSusISO ||
                null,

              historico_dosagens:
                historicoFinal,

              medico:
                selectedMedico
                  ?.nome ||
                medicoNome.trim() ||
                "",

              medico_id:
                medicoId ||
                null,

              hospital_id:
                hospitalId ||
                null,

              local_id:
                localId ||
                null,

              farmacia:
                selectedFarmacia
                  ?.nome ||
                farmaciaNome.trim() ||
                "",

              farmacia_id:
                farmaciaId ||
                null,

              preco:
                precoNumerico !==
                undefined
                  ? precoNumerico
                  : null,

              data_receita:
                dataReceitaISO ||
                null,

              proxima_renovacao:
                proximaRenovacaoISO ||
                null,

              observacoes:
                observacoes.trim() ||
                null,

              tipo_receita:
                tipoReceita,

              lembrete_receita_modo:
                tipoReceita ===
                  "amarela"
                  ? "automatico"
                  : modoLembreteReceita,

              lembrete_receita_data:
                tipoReceita !==
                  "amarela" &&
                modoLembreteReceita ===
                  "data_personalizada"
                  ? dataLembreteReceitaISO ||
                    null
                  : null,

              tratamento_ids:
                tratamentosSelecionados,

              status:
                statusAtivo
                  ? "ativo"
                  : "descontinuado",

              motivo_descontinuacao:
                !statusAtivo
                  ? motivoDescontinuacao.trim() ||
                    null
                  : null,

              medico_descontinuacao_id:
                !statusAtivo
                  ? medicoDescontinuacaoId ||
                    null
                  : null,

              medico_descontinuacao_nome:
                !statusAtivo
                  ? selectedMedicoDescontinuacao
                      ?.nome ||
                    medicoDescontinuacaoNome.trim() ||
                    ""
                  : null,

              substituido_por_id:
                !statusAtivo
                  ? substituidoPorId ||
                    null
                  : null,

              data_descontinuacao:
                dataDescontinuacao,

              estoque_quantidade:
                estoqueAtivo
                  ? quantidadeEstoqueFinal
                  : null,

              estoque_data_referencia:
                estoqueAtivo
                  ? estoqueDataReferenciaISO
                  : null,

              estoque_horarios:
                tipoUso ===
                  "continuo" &&
                horariosFiltrados.length >
                  0
                  ? horariosFiltrados
                  : [],

              estoque_unidade_por_dose:
                estoqueAtivo
                  ? unidadePorDoseFinal
                  : null,

              estoque_unidade_medida:
                estoqueAtivo
                  ? estoqueUnidade ||
                    (
                      isGotas
                        ? "gota(s)"
                        : "unidade(s)"
                    )
                  : null,

              estoque_ml_total:
                estoqueAtivo &&
                isGotasCalcAtivo &&
                formato ===
                  "gota" &&
                Number(
                  mlTotal
                ) >
                  0
                  ? Number(
                      mlTotal
                    )
                  : null,

              estoque_gotas_por_ml:
                estoqueAtivo &&
                isGotasCalcAtivo &&
                formato ===
                  "gota" &&
                Number(
                  gotasPorMl
                ) >
                  0
                  ? Number(
                      gotasPorMl
                    )
                  : null,
            };

            await updateMedicamento(
              id,
              updatePayload
            );

            const finalUrl =
              finalAttachment
                ?.url ||
              "";

            if (
              originalAttachmentUrl &&
              originalAttachmentUrl !==
                finalUrl &&
              isVaultStorageUrl(
                originalAttachmentUrl
              )
            ) {
              try {
                await deleteFile(
                  originalAttachmentUrl
                );
              } catch (
                storageError
              ) {
                console.error(
                  "[EditarMedicamento] Medicamento salvo, mas não foi possível remover o anexo antigo:",
                  storageError
                );
              }
            }

            // ==================================================
            // NOTIFICAÇÕES
            // ==================================================

            const horariosMudaram =
              !arraysEqual(
                horariosOriginais,
                horariosFiltrados
              );

            const statusMudou =
              statusOriginalAtivo !==
              statusAtivo;

            const identidadeNotificacaoMudou =
              nome.trim() !==
                nomeOriginal.trim() ||
              dosagemFinal !==
                dosagemOriginal;

            if (
              horariosMudaram ||
              statusMudou ||
              identidadeNotificacaoMudou ||
              editIntent ===
                "posologia"
            ) {
              try {
                if (
                  horariosOriginais.length >
                  0
                ) {
                  await cancelDoseNotifications({
                    id,

                    person_id:
                      safePersonId,

                    nome:
                      nomeOriginal.trim(),

                    dosagem:
                      dosagemOriginal,

                    estoque_horarios:
                      horariosOriginais,
                  });
                }

                if (
                  tipoUso ===
                    "continuo" &&
                  horariosFiltrados.length >
                    0 &&
                  statusAtivo
                ) {
                  const granted =
                    await requestNotificationPermission();

                  if (
                    granted
                  ) {
                    await scheduleDoseNotifications({
                      id,

                      person_id:
                        safePersonId,

                      nome:
                        nome.trim(),

                      dosagem:
                        dosagemFinal,

                      estoque_horarios:
                        horariosFiltrados,
                    });
                  }
                }
              } catch (
                notificationError
              ) {
                console.error(
                  "[EditarMedicamento] Alterações salvas, mas houve falha ao atualizar notificações:",
                  notificationError
                );
              }
            }

            if (
              attachment
                ?.url
                ?.startsWith(
                  "blob:"
                )
            ) {
              URL.revokeObjectURL(
                attachment.url
              );
            }

            setDocumentId(
              effectiveDocumentId ||
                ""
            );

            setAttachment(
              finalAttachment
            );

            setLocalFile(
              null
            );

            setOriginalAttachmentUrl(
              finalUrl
            );

            setNomeOriginal(
              nome.trim()
            );

            setDosagem(
              dosagemFinal
            );

            setDosagemOriginal(
              dosagemFinal
            );

            setNovaDosagem(
              dosagemFinal
            );

            setHistoricoDosagens(
              historicoFinal
            );

            setHorarios(
              horariosFiltrados
            );

            setHorariosOriginais(
              horariosFiltrados
            );

            setStatusOriginalAtivo(
              statusAtivo
            );

            setDataDescontinuacaoOriginal(
              dataDescontinuacao ||
                ""
            );

            setHasChanges(
              false
            );

            if (
              editIntent !==
              "menu"
            ) {
              setEditIntent(
                "menu"
              );

              window.scrollTo({
                top:
                  0,

                behavior:
                  "smooth",
              });
            }
          } catch (
            error
          ) {
            if (
              createdDocumentId
            ) {
              try {
                await documentsRepository.delete(
                  createdDocumentId,
                  safePersonId
                );

                uploadedNewUrl =
                  undefined;
              } catch (
                rollbackError
              ) {
                console.error(
                  "[EditarMedicamento] Falha ao desfazer documento recém-criado:",
                  rollbackError
                );
              }
            } else if (
              effectiveDocumentId &&
              previousDocument
            ) {
              try {
                await documentsRepository.update(
                  effectiveDocumentId,
                  safePersonId,
                  {
                    title:
                      previousDocument.title,

                    description:
                      previousDocument.description,

                    metadata:
                      previousDocument.metadata,

                    attachments:
                      previousDocument.attachments ||
                      [],
                  }
                );
              } catch (
                rollbackError
              ) {
                console.error(
                  "[EditarMedicamento] Falha ao restaurar documento anterior:",
                  rollbackError
                );
              }
            }

            if (
              uploadedNewUrl &&
              isVaultStorageUrl(
                uploadedNewUrl
              )
            ) {
              try {
                await deleteFile(
                  uploadedNewUrl
                );
              } catch (
                cleanupError
              ) {
                console.error(
                  "[EditarMedicamento] Falha ao limpar novo upload órfão:",
                  cleanupError
                );
              }
            }

            throw error;
          }
        },
        {
          successMessage:
            "Alterações salvas com sucesso",

          errorMessage:
            "Erro ao salvar alterações",

          goBackOnSuccess:
            editIntent ===
            "menu",
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
    async () => {
      runDelete(
        async () => {
          if (
            !activePersonId ||
            !personId ||
            activePersonId !==
              personId
          ) {
            throw new Error(
              "Medicamento não pertence à pessoa ativa."
            );
          }

          if (
            horariosOriginais.length >
            0
          ) {
            try {
              await cancelDoseNotifications({
                id,

                person_id:
                  activePersonId,

                nome:
                  nome.trim(),

                dosagem,

                estoque_horarios:
                  horariosOriginais,
              });
            } catch (
              notificationError
            ) {
              console.error(
                "[EditarMedicamento] Falha ao cancelar notificações antes da exclusão:",
                notificationError
              );
            }
          }

          await deleteMedicamento(
            id
          );

          router.replace(
            "/saude/medicamentos"
          );
        },
        {
          successMessage:
            "Medicamento excluído com sucesso",

          errorMessage:
            "Erro ao excluir medicamento",
        }
      );
    };

  // ==========================================================
  // BACK / DISCARD
  // ==========================================================

  const handleBack =
    () => {
      if (
        hasChanges &&
        editIntent !==
          "menu"
      ) {
        setShowConfirmExitModal(
          true
        );

        return;
      }

      if (
        editIntent !==
        "menu"
      ) {
        setEditIntent(
          "menu"
        );

        return;
      }

      router.back();
    };

  const discardChanges =
    () => {
      if (
        attachment
          ?.url
          ?.startsWith(
            "blob:"
          )
      ) {
        URL.revokeObjectURL(
          attachment.url
        );
      }

      setHasChanges(
        false
      );

      setShowConfirmExitModal(
        false
      );

      setEditIntent(
        "menu"
      );

      setReloadVersion(
        (
          previous
        ) =>
          previous +
          1
      );
    };

  // ==========================================================
  // LOADING / NOT FOUND
  // ==========================================================

  const selectedCatalogResult =
    catalogResults.find(
      (
        result
      ) =>
        result.reference.id ===
        selectedCatalogReferenceId
    ) ??
    catalogResults.find(
      (
        result
      ) =>
        normalizeCatalogText(
          result.reference.canonicalName
        ) ===
        normalizeCatalogText(
          nome
        )
    ) ??
    catalogResults[0] ??
    null;

  const catalogReference =
    selectedCatalogResult
      ?.reference ??
    null;

  const catalogNameIsDifferent =
    Boolean(
      catalogReference &&
      normalizeCatalogText(
        catalogReference.canonicalName
      ) !==
        normalizeCatalogText(
          nome
        )
    );

  const catalogPresentations =
    catalogReference
      ?.presentations ??
    [];

  const catalogForms =
    Array.from(
      new Set(
        [
          ...(
            catalogReference
              ?.pharmaceuticalForms ??
            []
          ),

          ...catalogPresentations
            .map(
              (
                presentation
              ) =>
                presentation
                  .pharmaceuticalForm
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(value)
            ),

          ...catalogPresentations.map(
            (
              presentation
            ) =>
              presentation.label
          ),
        ]
      )
    );

  const formatCanBeChecked =
    Boolean(
      catalogReference
    ) &&
    catalogForms.length > 0;

  const catalogFormatMatches =
    !formatCanBeChecked ||
    formatMatchesCatalog(
      formato,
      catalogForms
    );

  if (
    isLoading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (
    notFound
  ) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral/10 text-coral">
          <AlertTriangle
            size={
              26
            }
          />
        </div>

        <p className="mt-4 font-semibold text-ink-primary">
          Medicamento não encontrado
        </p>

        <button
          onClick={
            () =>
              router.replace(
                "/saude/medicamentos"
              )
          }
          className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
          type="button"
        >
          Voltar
        </button>
      </main>
    );
  }

  const SelectedFormatIcon =
    FORMATOS.find(
      (
        item
      ) =>
        item.id ===
        formato
    )?.icon ||
    Circle;

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
    `split-edit-${id}`;

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

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={
                handleBack
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-95"
              type="button"
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
              <div className="flex items-center gap-2">
                <SelectedFormatIcon
                  size={
                    16
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

                <p className="font-mono text-[11px] uppercase tracking-widest text-ice">
                  Ajustes
                </p>
              </div>

              <div className="flex items-center justify-between">
                <h1 className="mt-0.5 truncate text-xl font-bold uppercase text-ink-primary">
                  {editIntent ===
                  "menu"
                    ? nome ||
                      "Medicamento"
                    : `Editando ${nome}`}
                </h1>

                {hasChanges &&
                editIntent !==
                  "menu" ? (
                  <button
                    onClick={
                      () =>
                        setShowConfirmExitModal(
                          true
                        )
                    }
                    className="ml-4 shrink-0 text-sm font-medium text-ink-muted transition-colors hover:text-coral"
                    type="button"
                  >
                    Descartar
                  </button>
                ) : editIntent ===
                  "menu" ? (
                  <button
                    onClick={
                      () =>
                        setShowDeleteModal(
                          true
                        )
                    }
                    aria-label="Excluir medicamento"
                    className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral active:scale-95"
                    type="button"
                  >
                    <Trash2
                      size={
                        16
                      }
                    />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-6 px-5 pt-6">
          <AnimatePresence mode="wait">
            {editIntent ===
              "menu" && (
              <motion.div
                key="menu"
                variants={
                  fadeUp
                }
                initial="initial"
                animate="animate"
                exit="exit"
                className="grid grid-cols-1 gap-4"
              >
                <p className="mb-2 text-sm font-medium text-ink-muted">
                  O que você deseja atualizar?
                </p>

                <button
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setEditIntent(
                        "compra"
                      );
                    }
                  }
                  className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-5 text-left shadow-sm transition-all active:scale-95"
                  type="button"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                      <Package
                        size={
                          24
                        }
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold text-ink-primary">
                        Estoque, Compra & SUS
                      </h3>

                      <p className="mt-0.5 text-xs text-ink-muted">
                        Saldo atual, valores e dispensação pública
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={
                      20
                    }
                    className="text-ink-muted"
                  />
                </button>

                <button
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setEditIntent(
                        "evolucao"
                      );
                    }
                  }
                  className="flex items-center justify-between rounded-[24px] border border-ice/30 bg-ice/5 p-5 text-left shadow-sm transition-all active:scale-95"
                  type="button"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ice/20 text-ice">
                      <TrendingUp
                        size={
                          24
                        }
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold text-ice">
                        Evolução de Dose
                      </h3>

                      <p className="mt-0.5 text-xs text-ink-muted">
                        Registrar mudança de dosagem
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={
                      20
                    }
                    className="text-ink-muted"
                  />
                </button>

                <button
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setEditIntent(
                        "posologia"
                      );
                    }
                  }
                  className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-5 text-left shadow-sm transition-all active:scale-95"
                  type="button"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-400">
                      <Clock
                        size={
                          24
                        }
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold text-ink-primary">
                        Posologia & Formato
                      </h3>

                      <p className="mt-0.5 text-xs text-ink-muted">
                        Horários, uso e aparência
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={
                      20
                    }
                    className="text-ink-muted"
                  />
                </button>

                <button
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setEditIntent(
                        "rede"
                      );
                    }
                  }
                  className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-5 text-left shadow-sm transition-all active:scale-95"
                  type="button"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-400">
                      <Stethoscope
                        size={
                          24
                        }
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold text-ink-primary">
                        Rede & Receita
                      </h3>

                      <p className="mt-0.5 text-xs text-ink-muted">
                        Médico, local e anexos
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={
                      20
                    }
                    className="text-ink-muted"
                  />
                </button>

                <button
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setEditIntent(
                        "suspensao"
                      );
                    }
                  }
                  className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-5 text-left shadow-sm transition-all active:scale-95"
                  type="button"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        statusAtivo
                          ? "bg-amber-400/10 text-amber-400"
                          : "bg-coral/10 text-coral"
                      }`}
                    >
                      <Ban
                        size={
                          24
                        }
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold text-ink-primary">
                        {statusAtivo
                          ? "Suspender Medicamento"
                          : "Retomar Medicamento"}
                      </h3>

                      <p className="mt-0.5 text-xs text-ink-muted">
                        Status, motivo e substituição
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={
                      20
                    }
                    className="text-ink-muted"
                  />
                </button>

                <button
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setEditIntent(
                        "basico"
                      );
                    }
                  }
                  className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-5 text-left shadow-sm transition-all active:scale-95"
                  type="button"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-400/10 text-zinc-400">
                      <Settings2
                        size={
                          24
                        }
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold text-ink-primary">
                        Informações Básicas
                      </h3>

                      <p className="mt-0.5 text-xs text-ink-muted">
                        Nome, CIDs e tratamentos
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={
                      20
                    }
                    className="text-ink-muted"
                  />
                </button>
              </motion.div>
            )}

            {editIntent ===
              "evolucao" && (
              <motion.div
                key="evolucao"
                variants={
                  fadeUp
                }
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="rounded-[28px] border border-ice/30 bg-ice/5 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Info
                      size={
                        20
                      }
                      className="mt-0.5 shrink-0 text-ice"
                    />

                    <p className="text-sm text-ink-primary">
                      Registre uma mudança de dosagem para manter o histórico do medicamento. O Vault preservará a dosagem anterior e a data da alteração.
                    </p>
                  </div>
                </div>

                <div className="space-y-5 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div>
                    <label className="text-xs font-medium text-ink-muted">
                      Dosagem Atual
                    </label>

                    <p className="text-lg font-bold text-ink-primary">
                      {
                        dosagemOriginal
                      }
                    </p>
                  </div>

                  <div
                    className={`transition-all ${
                      shakeFields.includes(
                        "novaDosagem"
                      )
                        ? "animate-shake"
                        : ""
                    }`}
                  >
                    <Input
                      label="Nova Dosagem"
                      placeholder="Ex: 10mg"
                      value={
                        novaDosagem
                      }
                      onChange={
                        (
                          event
                        ) => {
                          setNovaDosagem(
                            event.target.value
                          );

                          markChanged();
                        }
                      }
                      error={
                        errors.novaDosagem
                      }
                    />

                    {catalogReference &&
                      novaDosagem.trim() &&
                      catalogPresentations.length ===
                        0 && (
                        <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">
                          O catálogo não possui apresentações atuais suficientes para validar esta nova dosagem com segurança.
                        </p>
                      )}
                  </div>

                  <div className="border-t border-surface-border/40 pt-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-xs font-medium text-ink-muted">
                        Profissional relacionado à alteração
                      </label>

                      {medicoEvolucaoId && (
                        <button
                          type="button"
                          onClick={
                            () => {
                              setMedicoEvolucaoId(
                                ""
                              );

                              setMedicoEvolucaoNome(
                                ""
                              );

                              markChanged();
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
                          setIsDoctorEvolucaoModalOpen(
                            true
                          )
                      }
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
                    >
                      <span className="truncate font-medium text-ink-primary">
                        {selectedMedicoEvolucao
                          ?.nome ||
                          medicoEvolucaoNome ||
                          "Selecionar médico..."}
                      </span>

                      <span className="text-xs font-bold text-ice">
                        Alterar
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {editIntent ===
              "compra" && (
              <motion.div
                key="compra"
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
                      Forma de Aquisição
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

                          markChanged();
                        }
                      }
                      className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                        tipoAquisicao ===
                        "comprado"
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      <ShoppingCart
                        size={
                          15
                        }
                      />

                      Particular
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

                          markChanged();
                        }
                      }
                      className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                        tipoAquisicao ===
                        "sus"
                          ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      <ShieldCheck
                        size={
                          15
                        }
                      />

                      SUS / Governo
                    </button>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-sm font-medium text-ink-primary">
                        {tipoAquisicao ===
                        "sus"
                          ? "Posto de Saúde / Farmácia Pública"
                          : "Farmácia"}
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

                              markChanged();
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
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
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
                        ) => {
                          setPreco(
                            handleCurrencyMask(
                              event.target.value
                            )
                          );

                          markChanged();
                        }
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
                      <p className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <CalendarClock
                          size={
                            14
                          }
                        />

                        Controle de Dispensação SUS
                      </p>

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
                          label="Próxima data informada para retorno"
                          placeholder="DD/MM/AAAA"
                          value={
                            dataRetornoSusTexto
                          }
                          onChange={
                            (
                              event
                            ) => {
                              setDataRetornoSusTexto(
                                mascaraData(
                                  event.target.value
                                )
                              );

                              markChanged();
                            }
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
                        O Vault poderá usar essa data como referência para lembretes de uma nova retirada.
                      </p>
                    </div>
                  )}
                </div>

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
                        Saldo Atual de Estoque
                      </h3>
                    </div>

                    <button
                      onClick={
                        toggleEstoque
                      }
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
                        estoqueAtivo
                          ? "bg-ice"
                          : "border border-surface-border bg-surface-raised"
                      }`}
                      type="button"
                      aria-pressed={
                        estoqueAtivo
                      }
                      aria-label="Alternar controle de estoque"
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
                          opacity:
                            0,

                          height:
                            0,
                        }}
                        animate={{
                          opacity:
                            1,

                          height:
                            "auto",
                        }}
                        exit={{
                          opacity:
                            0,

                          height:
                            0,
                        }}
                        className="space-y-4 overflow-hidden pt-2"
                      >
                        <div className="grid grid-cols-2 gap-3">
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
                              label="Quantidade Atual"
                              type="number"
                              inputMode="decimal"
                              min="0"
                              value={
                                estoqueQuantidade
                              }
                              onChange={
                                (
                                  event
                                ) => {
                                  setEstoqueQuantidade(
                                    event.target.value
                                  );

                                  markChanged();
                                }
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
                              label="Gasto por dose"
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
                                ) => {
                                  setEstoqueUnidadePorDose(
                                    event.target.value
                                  );

                                  markChanged();
                                }
                              }
                              error={
                                errors.estoqueUnidadePorDose
                              }
                            />
                          </div>
                        </div>

                        <div
                          className={`transition-all ${
                            shakeFields.includes(
                              "estoqueDataReferenciaTexto"
                            )
                              ? "animate-shake"
                              : ""
                          }`}
                        >
                          <Input
                            label="Data deste saldo"
                            placeholder="DD/MM/AAAA"
                            value={
                              estoqueDataReferenciaTexto
                            }
                            onChange={
                              handleDateChange(
                                setEstoqueDataReferenciaTexto
                              )
                            }
                            maxLength={
                              10
                            }
                            inputMode="numeric"
                            error={
                              errors.estoqueDataReferenciaTexto
                            }
                          />
                        </div>

                        <p className="text-[11px] leading-relaxed text-ink-muted">
                          Na edição, a quantidade acima representa o saldo real que você está informando agora. O Vault não descontará dias passados novamente.
                        </p>

                        {!estoqueUnidadePorDose.trim() && (
                          <div className="flex items-start gap-2 rounded-xl border border-ice/15 bg-ice/5 p-3">
                            <Info
                              size={
                                13
                              }
                              className="mt-0.5 shrink-0 text-ice"
                            />

                            <p className="text-[10px] leading-relaxed text-ink-muted">
                              Sem gasto por dose, o saldo continuará sendo armazenado normalmente, mas o Vault não estimará quantidade de doses ou duração do estoque.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {editIntent ===
              "posologia" && (
              <motion.div
                key="posologia"
                variants={
                  fadeUp
                }
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Palette
                      size={
                        16
                      }
                      className="text-ice"
                    />

                    <h3 className="text-sm font-semibold text-ink-primary">
                      Aparência do Remédio
                    </h3>
                  </div>

                  <div className="mb-5 grid grid-cols-3 gap-2">
                    {FORMATOS_PRINCIPAIS.map(
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
                            key={
                              item.id
                            }
                            onClick={
                              () =>
                                toggleFormato(
                                  item.id
                                )
                            }
                            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 transition-all ${
                              isActive
                                ? "border-ice bg-ice/15 text-ice"
                                : "border-surface-border/40 bg-surface-raised text-ink-muted"
                            }`}
                            type="button"
                            aria-pressed={
                              isActive
                            }
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

                    <button
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setIsFormatoModalOpen(
                            true
                          );
                        }
                      }
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 transition-all ${
                        FORMATOS_ADICIONAIS.some(
                          (
                            item
                          ) =>
                            item.id === formato
                        )
                          ? "border-ice bg-ice/15 text-ice"
                          : "border-surface-border/40 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      <Package
                        size={20}
                      />

                      <span className="max-w-full truncate px-1 text-[10px] font-medium">
                        {
                          FORMATOS_ADICIONAIS.find(
                            (
                              item
                            ) =>
                              item.id === formato
                          )?.label ??
                          "Mais formatos"
                        }
                      </span>
                    </button>
                  </div>

                  {catalogReference &&
                    formatCanBeChecked &&
                    !catalogFormatMatches && (
                      <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-3">
                        <AlertTriangle
                          size={15}
                          className="mt-0.5 shrink-0 text-amber-400"
                        />

                        <div>
                          <p className="text-xs font-semibold text-ink-primary">
                            Formato não encontrado nas apresentações consultadas
                          </p>

                          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                            O formato selecionado não apareceu entre as informações oficiais encontradas para{" "}
                            <strong>
                              {
                                catalogReference.canonicalName
                              }
                            </strong>
                            . Você pode manter esse formato e salvar normalmente.
                          </p>
                        </div>
                      </div>
                    )}

                  {catalogReference &&
                    !formatCanBeChecked && (
                      <p className="mb-4 text-[10px] leading-relaxed text-ink-faint">
                        O catálogo ainda não possui evidência atual suficiente para confirmar este formato.
                      </p>
                    )}

                  <p className="mb-2 text-xs font-medium text-ink-muted">
                    Cores
                  </p>

                  <div className="flex flex-wrap gap-2.5">
                    {CORES_DISPONIVEIS.map(
                      (
                        hex
                      ) => (
                        <button
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
                          type="button"
                          aria-pressed={
                            cores.includes(
                              hex
                            )
                          }
                          aria-label={`Selecionar cor ${hex}`}
                        />
                      )
                    )}
                  </div>
                </div>

                {isGotas && (
                  <CalculadoraGotas
                    isAtivo={
                      isGotasCalcAtivo
                    }
                    onToggle={
                      (
                        active
                      ) => {
                        setIsGotasCalcAtivo(
                          active
                        );

                        markChanged();
                      }
                    }
                    mlTotal={
                      mlTotal
                    }
                    setMlTotal={
                      (
                        value
                      ) => {
                        setMlTotal(
                          value
                        );

                        markChanged();
                      }
                    }
                    gotasPorMl={
                      gotasPorMl
                    }
                    setGotasPorMl={
                      (
                        value
                      ) => {
                        setGotasPorMl(
                          value
                        );

                        markChanged();
                      }
                    }
                    onEstoqueCalculado={
                      (
                        value
                      ) => {
                        if (
                          isGotasCalcAtivo &&
                          estoqueAtivo
                        ) {
                          setEstoqueQuantidade(
                            String(
                              value
                            )
                          );
                        }

                        markChanged();
                      }
                    }
                  />
                )}

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

                          markChanged();
                        }
                      }
                      className={`rounded-xl border py-3 text-sm font-bold transition-all ${
                        tipoUso ===
                        "continuo"
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      Contínuo
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

                          setHorarios(
                            []
                          );

                          markChanged();
                        }
                      }
                      className={`rounded-xl border py-3 text-sm font-bold transition-all ${
                        tipoUso !==
                        "continuo"
                          ? "border-amber-400 bg-amber-400/10 text-amber-400"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      SOS / Esporádico
                    </button>
                  </div>

                  {tipoUso ===
                    "continuo" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 items-start gap-3">
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
                            value={
                              vezesAoDia
                            }
                            onChange={
                              (
                                event
                              ) => {
                                setVezesAoDia(
                                  event.target.value
                                );

                                markChanged();
                              }
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
                              ) => {
                                setPrimeiroHorario(
                                  handleTimeMask(
                                    event.target.value
                                  )
                                );

                                markChanged();
                              }
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

                      <button
                        onClick={
                          handleGerarHorarios
                        }
                        className="w-full rounded-xl border border-surface-border bg-surface-raised py-2.5 text-sm font-bold text-ice transition-transform active:scale-95"
                        type="button"
                      >
                        Auto-Completar Horários
                      </button>

                      <div
                        className={`rounded-xl border bg-surface-raised p-4 ${
                          errors.horarios
                            ? "border-coral/50"
                            : "border-surface-border"
                        }`}
                      >
                        <div className="flex flex-wrap gap-2.5">
                          {horarios.map(
                            (
                              horario,
                              index
                            ) => (
                              <div
                                key={
                                  index
                                }
                                className="flex items-center gap-1"
                              >
                                <input
                                  type="text"
                                  placeholder="00:00"
                                  value={
                                    horario
                                  }
                                  maxLength={
                                    5
                                  }
                                  onChange={
                                    (
                                      event
                                    ) =>
                                      updateHorario(
                                        index,
                                        handleTimeMask(
                                          event.target.value
                                        )
                                      )
                                  }
                                  className="w-[76px] rounded-xl border border-surface-border bg-void py-2.5 text-center font-mono text-sm text-ink-primary outline-none shadow-inner focus:border-ice"
                                />

                                <button
                                  onClick={
                                    () =>
                                      removeHorario(
                                        index
                                      )
                                  }
                                  className="rounded-xl bg-coral/10 p-2.5 text-coral transition-colors hover:bg-coral/20"
                                  type="button"
                                  aria-label="Remover horário"
                                >
                                  <X
                                    size={
                                      14
                                    }
                                  />
                                </button>
                              </div>
                            )
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={
                            addHorario
                          }
                          className="mt-3 flex items-center gap-1.5 text-xs font-bold text-ice"
                        >
                          <Plus
                            size={
                              14
                            }
                          />

                          Adicionar horário
                        </button>

                        {errors.horarios && (
                          <p className="mt-2 text-xs font-medium text-coral">
                            {
                              errors.horarios
                            }
                          </p>
                        )}
                      </div>

                      <p className="text-[11px] leading-relaxed text-ink-muted">
                        Os horários fazem parte da rotina do medicamento e continuarão salvos mesmo que o controle de estoque esteja desativado.
                      </p>
                    </div>
                  )}

                  {tipoUso !==
                    "continuo" && (
                    <div className="mt-4 space-y-3 border-t border-surface-border/40 pt-5">
                      <p className="text-xs leading-relaxed text-ink-muted">
                        Como este medicamento é de uso eventual, não há horários diários obrigatórios. Cada tomada será registrada individualmente no histórico
                        {estoqueAtivo
                          ? " e o estoque será ajustado quando houver dados suficientes para calcular o consumo."
                          : "."}
                      </p>

                      <button
                        onClick={
                          () =>
                            setQuickDoseOpen(
                              true
                            )
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 py-3.5 text-sm font-bold text-amber-400 transition-all active:scale-95"
                        type="button"
                      >
                        <HeartPulse
                          size={
                            18
                          }
                        />

                        Registrar Dose Agora
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {editIntent ===
              "rede" && (
              <motion.div
                key="rede"
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
                    <Stethoscope
                      size={
                        16
                      }
                      className="text-ice"
                    />

                    <h3 className="text-sm font-semibold text-ink-primary">
                      Profissional & Local
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

                              markChanged();
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
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
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

                              markChanged();
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
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
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

                              markChanged();
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
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
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

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText
                      size={
                        16
                      }
                      className="text-ice"
                    />

                    <h3 className="text-sm font-semibold text-ink-primary">
                      Receita Digital
                    </h3>
                  </div>

                  <SeletorReceita
                    selected={
                      tipoReceita
                    }
                    onChange={
                      handleTipoReceitaChange
                    }
                    onRenovarClick={
                      () =>
                        router.push(
                          `/saude/renovacao/nova?medicamento_id=${id}`
                        )
                    }
                  />

                  <div className="mb-5 mt-4 grid grid-cols-2 gap-3 border-t border-surface-border/40 pt-4">
                    <div
                      className={`transition-all ${
                        shakeFields.includes(
                          "dataReceitaTexto"
                        )
                          ? "animate-shake"
                          : ""
                      }`}
                    >
                      <Input
                        label="Data da receita"
                        placeholder="DD/MM/AAAA"
                        value={
                          dataReceitaTexto
                        }
                        onChange={
                          handleDateChange(
                            setDataReceitaTexto
                          )
                        }
                        onBlur={
                          handleDataReceitaBlur
                        }
                        maxLength={
                          10
                        }
                        inputMode="numeric"
                        error={
                          errors.dataReceitaTexto
                        }
                      />
                    </div>

                    <div
                      className={`transition-all ${
                        shakeFields.includes(
                          "proximaRenovacaoTexto"
                        )
                          ? "animate-shake"
                          : ""
                      }`}
                    >
                      <Input
                        label="Próxima renovação"
                        placeholder="DD/MM/AAAA"
                        value={
                          proximaRenovacaoTexto
                        }
                        onChange={
                          handleDateChange(
                            setProximaRenovacaoTexto,
                            true
                          )
                        }
                        maxLength={
                          10
                        }
                        inputMode="numeric"
                        error={
                          errors.proximaRenovacaoTexto
                        }
                      />
                    </div>
                  </div>

                  <div className="mb-5 rounded-2xl border border-surface-border/40 bg-surface-raised/60 p-4">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-ink-primary">
                        Quando lembrar da próxima receita?
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                        {tipoReceita ===
                        "amarela"
                          ? "Receitas A1/A2/A3 permanecem no acompanhamento mensal rigoroso do Vault."
                          : "No automático, o Vault combina validade, estoque e consumo real antes de pedir uma nova receita."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          [
                            "automatico",
                            "Automático",
                          ],
                          [
                            "7_dias",
                            "Com 7 dias",
                          ],
                          [
                            "15_dias",
                            "Com 15 dias",
                          ],
                          [
                            "data_personalizada",
                            "Data escolhida",
                          ],
                        ] as const
                      ).map(
                        ([
                          value,
                          label,
                        ]) => {
                          const selected =
                            (
                              tipoReceita ===
                              "amarela"
                                ? "automatico"
                                : modoLembreteReceita
                            ) ===
                            value;

                          return (
                            <button
                              key={
                                value
                              }
                              type="button"
                              disabled={
                                tipoReceita ===
                                  "amarela" &&
                                value !==
                                  "automatico"
                              }
                              onClick={
                                () => {
                                  setModoLembreteReceita(
                                    value
                                  );

                                  if (
                                    value !==
                                    "data_personalizada"
                                  ) {
                                    setDataLembreteReceitaTexto(
                                      ""
                                    );
                                  }

                                  markChanged();
                                  trigger(
                                    "light"
                                  );
                                }
                              }
                              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all active:scale-95 ${
                                selected
                                  ? "border-ice/40 bg-ice/10 text-ice"
                                  : "border-surface-border/50 bg-surface text-ink-muted"
                              } disabled:cursor-not-allowed disabled:opacity-35`}
                            >
                              {
                                label
                              }
                            </button>
                          );
                        }
                      )}
                    </div>

                    {tipoReceita !==
                      "amarela" &&
                      modoLembreteReceita ===
                        "data_personalizada" && (
                        <div
                          className={`mt-3 ${
                            shakeFields.includes(
                              "dataLembreteReceitaTexto"
                            )
                              ? "animate-shake"
                              : ""
                          }`}
                        >
                          <Input
                            label="Começar a lembrar em"
                            placeholder="DD/MM/AAAA"
                            value={
                              dataLembreteReceitaTexto
                            }
                            onChange={
                              handleDateChange(
                                setDataLembreteReceitaTexto
                              )
                            }
                            maxLength={
                              10
                            }
                            inputMode="numeric"
                            error={
                              errors.dataLembreteReceitaTexto
                            }
                          />
                        </div>
                      )}
                  </div>

                  {!attachment ? (
                    <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised p-6">
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
                    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3">
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
                </div>
              </motion.div>
            )}

            {editIntent ===
              "suspensao" && (
              <motion.div
                key="suspensao"
                variants={
                  fadeUp
                }
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-ink-primary">
                        Status Atual
                      </h3>

                      <p className="mt-0.5 text-xs text-ink-muted">
                        O medicamento está em uso?
                      </p>
                    </div>

                    <button
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setStatusAtivo(
                            !statusAtivo
                          );

                          markChanged();
                        }
                      }
                      className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                        statusAtivo
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                          : "border-coral/30 bg-coral/10 text-coral"
                      }`}
                      type="button"
                      aria-pressed={
                        statusAtivo
                      }
                    >
                      {statusAtivo
                        ? "EM USO"
                        : "SUSPENSO"}
                    </button>
                  </div>

                  <AnimatePresence>
                    {!statusAtivo && (
                      <motion.div
                        initial={{
                          opacity:
                            0,

                          height:
                            0,
                        }}
                        animate={{
                          opacity:
                            1,

                          height:
                            "auto",
                        }}
                        exit={{
                          opacity:
                            0,

                          height:
                            0,
                        }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 border-t border-surface-border/40 pt-5">
                          {dataDescontinuacaoOriginal &&
                            !statusOriginalAtivo && (
                              <p className="rounded-xl bg-surface-raised px-3 py-2 text-xs text-ink-muted">
                                Suspenso em{" "}
                                <strong className="text-ink-primary">
                                  {
                                    isoParaBr(
                                      dataDescontinuacaoOriginal
                                    )
                                  }
                                </strong>
                                . Essa data será preservada ao editar outros dados.
                              </p>
                            )}

                          <div
                            className={`transition-all ${
                              shakeFields.includes(
                                "motivoDescontinuacao"
                              )
                                ? "animate-shake"
                                : ""
                            }`}
                          >
                            <TextArea
                              label="Motivo da suspensão *"
                              placeholder="Ex: efeitos adversos, mudança de conduta..."
                              value={
                                motivoDescontinuacao
                              }
                              onChange={
                                (
                                  event
                                ) => {
                                  setMotivoDescontinuacao(
                                    event.target.value
                                  );

                                  markChanged();
                                }
                              }
                              error={
                                errors.motivoDescontinuacao
                              }
                            />
                          </div>

                          <div>
                            <div className="mb-1.5 flex items-center justify-between">
                              <label className="flex items-center gap-2 text-sm font-medium text-ink-primary">
                                <Stethoscope
                                  size={
                                    14
                                  }
                                  className="text-ink-muted"
                                />

                                Médico relacionado à suspensão
                              </label>

                              {medicoDescontinuacaoId && (
                                <button
                                  type="button"
                                  onClick={
                                    () => {
                                      setMedicoDescontinuacaoId(
                                        ""
                                      );

                                      setMedicoDescontinuacaoNome(
                                        ""
                                      );

                                      markChanged();
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
                              onClick={
                                () =>
                                  setIsDoctorDescontinuacaoModalOpen(
                                    true
                                  )
                              }
                              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
                              type="button"
                            >
                              <span className="truncate font-medium text-ink-primary">
                                {selectedMedicoDescontinuacao
                                  ?.nome ||
                                  medicoDescontinuacaoNome ||
                                  "Vincular médico..."}
                              </span>

                              <span className="ml-2 text-xs font-bold text-ice">
                                Selecionar
                              </span>
                            </button>
                          </div>

                          <div>
                            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink-primary">
                              <ArrowRightLeft
                                size={
                                  14
                                }
                                className="text-ink-muted"
                              />

                              Substituído por
                            </label>

                            <button
                              onClick={
                                () =>
                                  setIsSubstitutoModalOpen(
                                    true
                                  )
                              }
                              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left"
                              type="button"
                            >
                              <span className="truncate font-medium text-ink-primary">
                                {selectedSubstituto
                                  ? selectedSubstituto.nome
                                  : "Nenhum substituto"}
                              </span>

                              <span className="ml-2 text-xs font-bold text-ice">
                                {selectedSubstituto
                                  ? "Alterar"
                                  : "Vincular"}
                              </span>
                            </button>

                            {substituidoPorId && (
                              <button
                                onClick={
                                  () => {
                                    setSubstituidoPorId(
                                      ""
                                    );

                                    markChanged();
                                  }
                                }
                                className="mt-2 flex items-center gap-1 text-xs font-medium text-coral"
                                type="button"
                              >
                                <X
                                  size={
                                    12
                                  }
                                />

                                Remover substituto
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {editIntent ===
              "basico" && (
              <motion.div
                key="basico"
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
                      label="Nome Oficial"
                      placeholder="Ex: Losartana..."
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

                          setSelectedCatalogReferenceId(
                            null
                          );

                          markChanged();
                        }
                      }
                      error={
                        errors.nome
                      }
                    />

                    <AnimatePresence>
                      {nome.trim().length >=
                        4 &&
                        (
                          isCatalogSearching ||
                          catalogResults.length > 0 ||
                          catalogSearchError
                        ) && (
                          <motion.div
                            initial={{
                              opacity: 0,
                              y: -4,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            exit={{
                              opacity: 0,
                              y: -4,
                            }}
                            className="mt-2 overflow-hidden rounded-2xl border border-surface-border/50 bg-surface-raised"
                          >
                            {isCatalogSearching ? (
                              <div className="flex items-center gap-2 px-3.5 py-3 text-xs text-ink-muted">
                                <Loader2
                                  size={14}
                                  className="animate-spin text-ice"
                                />

                                Consultando catálogo oficial...
                              </div>
                            ) : catalogSearchError ? (
                              <p className="px-3.5 py-3 text-xs leading-relaxed text-ink-muted">
                                Catálogo temporariamente indisponível. A edição pode continuar normalmente.
                              </p>
                            ) : (
                              <>
                                {catalogResults.map(
                                  (
                                    result
                                  ) => {
                                    const reference =
                                      result.reference;

                                    const selected =
                                      catalogReference
                                        ?.id ===
                                      reference.id;

                                    const ingredient =
                                      reference
                                        .activeIngredients
                                        ?.join(" + ") ??
                                      reference
                                        .activeIngredient;

                                    return (
                                      <button
                                        type="button"
                                        key={
                                          reference.id
                                        }
                                        onClick={
                                          () => {
                                            trigger(
                                              "vibrate"
                                            );

                                            setSelectedCatalogReferenceId(
                                              reference.id
                                            );
                                          }
                                        }
                                        className={`flex w-full items-start gap-3 border-b border-surface-border/30 px-3.5 py-3 text-left transition-colors last:border-b-0 ${
                                          selected
                                            ? "bg-ice/10"
                                            : "hover:bg-void/30"
                                        }`}
                                      >
                                        <FileSearch
                                          size={16}
                                          className="mt-0.5 shrink-0 text-ice"
                                        />

                                        <span className="min-w-0 flex-1">
                                          <span className="block text-sm font-semibold text-ink-primary">
                                            {
                                              reference.canonicalName
                                            }
                                          </span>

                                          {ingredient && (
                                            <span className="mt-0.5 block text-[11px] text-ink-muted">
                                              {
                                                ingredient
                                              }
                                            </span>
                                          )}

                                          <span className="mt-1 block text-[10px] text-ink-faint">
                                            Compatibilidade{" "}
                                            {
                                              Math.round(
                                                result.score *
                                                  100
                                              )
                                            }
                                            %
                                          </span>
                                        </span>

                                        {selected && (
                                          <Check
                                            size={16}
                                            className="mt-0.5 shrink-0 text-ice"
                                          />
                                        )}
                                      </button>
                                    );
                                  }
                                )}

                                {catalogNameIsDifferent &&
                                  catalogReference && (
                                    <div className="border-t border-surface-border/40 px-3.5 py-3">
                                      <div className="flex items-start gap-2">
                                        <AlertTriangle
                                          size={15}
                                          className="mt-0.5 shrink-0 text-amber-400"
                                        />

                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-semibold text-ink-primary">
                                            Talvez você queira dizer{" "}
                                            {
                                              catalogReference.canonicalName
                                            }
                                          </p>

                                          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                                            O Vault encontrou um nome oficial parecido. Nada será alterado automaticamente.
                                          </p>

                                          <div className="mt-2 flex gap-2">
                                            <button
                                              type="button"
                                              onClick={
                                                () => {
                                                  setNome(
                                                    catalogReference.canonicalName
                                                  );

                                                  setSelectedCatalogReferenceId(
                                                    catalogReference.id
                                                  );

                                                  markChanged();

                                                  trigger(
                                                    "vibrate"
                                                  );
                                                }
                                              }
                                              className="rounded-xl bg-ice px-3 py-1.5 text-[11px] font-semibold text-void"
                                            >
                                              Usar sugestão
                                            </button>

                                            <button
                                              type="button"
                                              onClick={
                                                () =>
                                                  setCatalogResults(
                                                    []
                                                  )
                                              }
                                              className="rounded-xl border border-surface-border px-3 py-1.5 text-[11px] font-medium text-ink-muted"
                                            >
                                              Manter como está
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                              </>
                            )}
                          </motion.div>
                        )}
                    </AnimatePresence>
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

                  <button
                    onClick={
                      () =>
                        setIsTratamentoModalOpen(
                          true
                        )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-surface-border/50 bg-void py-3.5 text-sm font-bold text-ink-primary shadow-inner transition-colors hover:border-ice/50"
                    type="button"
                  >
                    <Plus
                      size={
                        16
                      }
                    />

                    Gerenciar Tratamentos
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
          <AnimatePresence>
            {editIntent !==
              "menu" &&
              hasChanges && (
                <motion.div
                  initial={{
                    opacity:
                      0,

                    y:
                      20,
                  }}
                  animate={{
                    opacity:
                      1,

                    y:
                      0,
                  }}
                  exit={{
                    opacity:
                      0,

                    y:
                      20,
                  }}
                >
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={
                      handleSubmit
                    }
                    disabled={
                      isSaving
                    }
                    className="flex h-14 items-center justify-center gap-2 rounded-[20px] text-base font-bold shadow-lg shadow-ice/20"
                  >
                    {isSaving ? (
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
                        <Save
                          size={
                            20
                          }
                        />

                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
          </AnimatePresence>

          {(editIntent ===
            "menu" ||
            !hasChanges) && (
            <div className="h-10" />
          )}
        </div>

        <AnimatePresence>
          {isFormatoModalOpen && (
            <>
              <motion.button
                type="button"
                aria-label="Fechar seleção de formato"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                onClick={
                  () =>
                    setIsFormatoModalOpen(
                      false
                    )
                }
                className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
              />

              <motion.div
                initial={{
                  opacity: 0,
                  y: 28,
                  scale: 0.98,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 28,
                  scale: 0.98,
                }}
                className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[90] mx-auto max-h-[78dvh] max-w-lg overflow-hidden rounded-[30px] border border-surface-border bg-surface shadow-2xl"
              >
                <div className="flex items-start justify-between border-b border-surface-border/50 px-5 py-4">
                  <div>
                    <h3 className="text-base font-semibold text-ink-primary">
                      Mais formatos
                    </h3>

                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                      Selecione outro formato. Divergências com o catálogo oficial geram aviso, nunca bloqueio.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      () =>
                        setIsFormatoModalOpen(
                          false
                        )
                    }
                    className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted"
                  >
                    <X
                      size={18}
                    />
                  </button>
                </div>

                <div className="max-h-[60dvh] overflow-y-auto p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {FORMATOS_ADICIONAIS.map(
                      (
                        item
                      ) => {
                        const active =
                          formato === item.id;

                        const Icon =
                          item.icon;

                        return (
                          <button
                            type="button"
                            key={
                              item.id
                            }
                            onClick={
                              () => {
                                toggleFormato(
                                  item.id
                                );

                                setIsFormatoModalOpen(
                                  false
                                );
                              }
                            }
                            className={`flex min-h-[68px] items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                              active
                                ? "border-ice bg-ice/15 text-ice"
                                : "border-surface-border/50 bg-surface-raised text-ink-muted"
                            }`}
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-void/50">
                              <Icon
                                size={20}
                                fill={
                                  active
                                    ? "currentColor"
                                    : "none"
                                }
                                stroke={
                                  active
                                    ? "none"
                                    : "currentColor"
                                }
                              />
                            </span>

                            <span className="min-w-0 flex-1 text-sm font-medium">
                              {
                                item.label
                              }
                            </span>

                            {active && (
                              <Check
                                size={17}
                                className="shrink-0"
                              />
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
                        cidId
                      ) =>
                        cidId !==
                        item.id!
                    );
                  }

                  return [
                    ...previous,
                    item.id!,
                  ];
                }
              );

              markChanged();
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

              markChanged();
            }
          }
          title="Desativar controle de estoque?"
          message="O saldo e as informações específicas do controle de estoque serão removidos ao salvar. Sua posologia e seus horários permanecerão configurados."
          confirmLabel="Desativar"
          cancelLabel="Cancelar"
          type="warning"
        />

        <ConfirmationModal
          isOpen={
            showConfirmExitModal
          }
          onClose={
            () =>
              setShowConfirmExitModal(
                false
              )
          }
          onConfirm={
            discardChanges
          }
          title="Descartar alterações?"
          message="As alterações desta edição serão realmente descartadas e os dados salvos serão recarregados."
          confirmLabel="Descartar"
          cancelLabel="Continuar editando"
          type="warning"
        />

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
          title="Excluir medicamento"
          message={`Excluir permanentemente o registro de "${nome}"? As doses e renovações vinculadas ao medicamento serão removidas; outros registros históricos relacionados serão preservados quando aplicável.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={
            isDeleting
          }
          type="danger"
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
          onSelect={
            (
              item
            ) => {
              setMedicoNome(
                item.nome
              );

              setMedicoId(
                item.id!
              );

              setIsDoctorModalOpen(
                false
              );

              markChanged();
            }
          }
          items={
            medicos
          }
          title="Médico Prescritor"
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
          renderItem={
            (
              item
            ) => (
              <div className="flex w-full items-center gap-3">
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

                  {item.especialidade && (
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {
                        item.especialidade
                      }
                    </p>
                  )}
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
            hospitaisLocais
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
              const newHospital =
                await addHospital({
                  nome:
                    name,

                  tipo:
                    "hospital",
                });

              return {
                id:
                  newHospital,

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

              markChanged();
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

                  {item.endereco && (
                    <p className="text-xs text-ink-muted">
                      {
                        item.endereco
                      }
                    </p>
                  )}
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
              const newLocal =
                await addLocal({
                  nome:
                    name,

                  tipo:
                    "outro",
                });

              return {
                id:
                  newLocal,

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

              markChanged();
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

                  {item.endereco && (
                    <p className="text-xs text-ink-muted">
                      {
                        item.endereco
                      }
                    </p>
                  )}
                </div>
              </div>
            )
          }
        />

        <SelectionModal<Medico>
          isOpen={
            isDoctorDescontinuacaoModalOpen
          }
          onClose={
            () =>
              setIsDoctorDescontinuacaoModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              setMedicoDescontinuacaoNome(
                item.nome
              );

              setMedicoDescontinuacaoId(
                item.id!
              );

              setIsDoctorDescontinuacaoModalOpen(
                false
              );

              markChanged();
            }
          }
          items={
            medicos
          }
          title="Médico da Suspensão"
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
          renderItem={
            (
              item
            ) => (
              <div className="flex w-full items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral">
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

                  {item.especialidade && (
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {
                        item.especialidade
                      }
                    </p>
                  )}
                </div>
              </div>
            )
          }
        />

        <SelectionModal<Medico>
          isOpen={
            isDoctorEvolucaoModalOpen
          }
          onClose={
            () =>
              setIsDoctorEvolucaoModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              setMedicoEvolucaoNome(
                item.nome
              );

              setMedicoEvolucaoId(
                item.id!
              );

              setIsDoctorEvolucaoModalOpen(
                false
              );

              markChanged();
            }
          }
          items={
            medicos
          }
          title="Médico Responsável"
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
          renderItem={
            (
              item
            ) => (
              <div className="flex w-full items-center gap-3">
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
              setFarmaciaNome(
                item.nome
              );

              setFarmaciaId(
                item.id!
              );

              setIsPharmacyModalOpen(
                false
              );

              markChanged();
            }
          }
          items={
            farmacias
          }
          title="Selecionar Farmácia"
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
          renderItem={
            (
              item
            ) => (
              <div className="flex w-full items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
                  <Store
                    size={
                      18
                    }
                  />
                </div>

                <div className="min-w-0 text-left">
                  <p className="truncate font-semibold text-ink-primary">
                    {
                      item.nome
                    }
                  </p>

                  {item.endereco && (
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {
                        item.endereco
                      }
                    </p>
                  )}
                </div>
              </div>
            )
          }
        />

        <SelectionModal<Medicamento>
          isOpen={
            isSubstitutoModalOpen
          }
          onClose={
            () =>
              setIsSubstitutoModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              setSubstituidoPorId(
                item.id!
              );

              setIsSubstitutoModalOpen(
                false
              );

              markChanged();
            }
          }
          items={
            medicamentosAtivos
          }
          title="Qual remédio substituiu?"
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
              `${item.nome} ${item.dosagem || ""}`
          }
          renderItem={
            (
              item
            ) => (
              <div className="flex w-full items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                  <ArrowRightLeft
                    size={
                      18
                    }
                  />
                </div>

                <div className="min-w-0 text-left">
                  <p className="truncate font-semibold text-ink-primary">
                    {
                      item.nome
                    }
                  </p>

                  {item.dosagem && (
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {
                        item.dosagem
                      }
                    </p>
                  )}
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
            (
              ids
            ) => {
              setTratamentosSelecionados(
                ids
              );

              markChanged();
            }
          }
          personId={
            activePersonId ||
            ""
          }
        />

        <QuickDoseModal
          isOpen={
            quickDoseOpen
          }
          onClose={
            () =>
              setQuickDoseOpen(
                false
              )
          }
          preselectedMedicamentoId={
            id ||
            undefined
          }
          onSuccess={
            () => {
              showToast(
                "Dose registrada no histórico.",
                "success"
              );
            }
          }
        />
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function EditarMedicamentoPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <EditarMedicamentoContent />
    </Suspense>
  );
}
