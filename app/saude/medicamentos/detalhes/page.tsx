// app/saude/medicamentos/detalhes/page.tsx
"use client";

import {
  Suspense,
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
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Award,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Copy,
  DollarSign,
  Droplet,
  Edit3,
  ExternalLink,
  FileText,
  FileWarning,
  Gift,
  Info,
  LineChart,
  MapPin,
  Package,
  Phone,
  Pill,
  Plus,
  Share2,
  StickyNote,
  Store,
  Stethoscope,
  Syringe,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  format,
} from "date-fns";

import {
  ptBR,
} from "date-fns/locale";

import {
  db,
} from "@/lib/db";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  DetailSkeleton,
} from "@/components/loading/DetailSkeleton";

import {
  BottomSheet,
} from "@/components/ui/BottomSheet";

import {
  ConfirmationModal,
} from "@/components/ConfirmationModal";

import {
  QuickDoseModal,
} from "@/components/saude/QuickDoseModal";

import {
  ListIcon,
} from "@/components/list/ListIcon";

import {
  DetailInfoRow,
  SectionTitle,
  StatCard,
} from "@/components/detail/DetailComponents";

import {
  computeEstoqueInfo,
  getClinicalTheme,
  getDaysUntil,
  getLocalTodayISO,
  parseLocalDate,
  TIPO_RECEITA_LABELS,
  VALIDADE_RECEITA_DIAS,
} from "@/lib/health-utils";

import {
  analisarComportamentoUso,
  analisarMelhorFarmacia,
  isReceitaVencidaSegura,
  sugerirRenovacao,
} from "@/lib/health-insights";

import type {
  Cid,
  DoseLog,
  Tratamento,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

interface HistDosagem {
  dosagem_antiga: string;
  data_mudanca: string;
  medico_responsavel: string;
}

// ============================================================
// HELPERS DE DATA
// ============================================================

function formatDate(
  isoStr?: string | null
) {
  if (!isoStr) {
    return "—";
  }

  try {
    const dateOnly =
      isoStr.split("T")[0];

    const date =
      parseLocalDate(
        dateOnly
      );

    if (!date) {
      return isoStr;
    }

    return format(
      date,
      "dd MMM yyyy",
      {
        locale:
          ptBR,
      }
    );
  } catch {
    return isoStr;
  }
}

function getDateDaysAgoISO(
  daysAgo: number
) {
  const date =
    new Date();

  date.setHours(
    0,
    0,
    0,
    0
  );

  date.setDate(
    date.getDate() -
      daysAgo
  );

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function getDoseSortTimestamp(
  log: {
    data?: string;
    horario?: string;
    tomado_em?: string;
  }
) {
  if (
    log.tomado_em
  ) {
    const timestamp =
      new Date(
        log.tomado_em
      ).getTime();

    if (
      Number.isFinite(
        timestamp
      )
    ) {
      return timestamp;
    }
  }

  if (
    log.data
  ) {
    const [
      year,
      month,
      day,
    ] =
      log.data
        .split("-")
        .map(Number);

    const [
      hour,
      minute,
    ] =
      (
        log.horario ||
        "00:00"
      )
        .split(":")
        .map(Number);

    const timestamp =
      new Date(
        year,
        month - 1,
        day,
        hour || 0,
        minute || 0
      ).getTime();

    return Number.isFinite(
      timestamp
    )
      ? timestamp
      : 0;
  }

  return 0;
}

// ============================================================
// HELPERS DE QUANTIDADE
// ============================================================

function formatQuantidade(
  value: number
) {
  if (
    Number.isInteger(
      value
    )
  ) {
    return String(
      value
    );
  }

  return value
    .toFixed(2)
    .replace(
      /\.00$/,
      ""
    )
    .replace(
      /(\.\d)0$/,
      "$1"
    )
    .replace(
      ".",
      ","
    );
}

function getKnownDoseQuantity(
  log: {
    quantidade?: number;
  }
): number | null {
  const value =
    Number(
      log.quantidade
    );

  if (
    !Number.isFinite(
      value
    ) ||
    value <=
      0
  ) {
    return null;
  }

  return value;
}

function summarizeKnownQuantity(
  logs: Array<{
    quantidade?: number;
  }>
) {
  let total =
    0;

  let knownCount =
    0;

  logs.forEach(
    (log) => {
      const value =
        getKnownDoseQuantity(
          log
        );

      if (
        value ===
        null
      ) {
        return;
      }

      total +=
        value;

      knownCount +=
        1;
    }
  );

  return {
    total,
    knownCount,

    totalCount:
      logs.length,

    complete:
      logs.length ===
        0 ||
      knownCount ===
        logs.length,
  };
}

function formatKnownQuantitySummary(
  summary: {
    total: number;
    knownCount: number;
    totalCount: number;
    complete: boolean;
  }
): string {
  if (
    summary.totalCount ===
    0
  ) {
    return "0";
  }

  if (
    summary.knownCount ===
    0
  ) {
    return "—";
  }

  if (
    summary.complete
  ) {
    return formatQuantidade(
      summary.total
    );
  }

  return `${formatQuantidade(
    summary.total
  )}*`;
}

// ============================================================
// ÍCONE DE COMPRIMIDO PARTIDO
// ============================================================

const SplitPillIcon = ({
  size,
  fill = "currentColor",
  stroke = "currentColor",
  strokeWidth = 2,
}: {
  size?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      fill={fill}
    />

    <line
      x1="12"
      y1="2"
      x2="12"
      y2="22"
      stroke="rgba(0,0,0,0.3)"
      strokeWidth="2"
    />
  </svg>
);

// ============================================================
// FORMATOS
// ============================================================

const FORMATOS = [
  {
    id:
      "comprimido",
    label:
      "Inteiro",
    icon:
      Circle,
  },
  {
    id:
      "partido",
    label:
      "Partido",
    icon:
      SplitPillIcon,
  },
  {
    id:
      "capsula",
    label:
      "Cápsula",
    icon:
      Pill,
  },
  {
    id:
      "gota",
    label:
      "Gotas",
    icon:
      Droplet,
  },
  {
    id:
      "injecao",
    label:
      "Injeção",
    icon:
      Syringe,
  },
  {
    id:
      "adesivo",
    label:
      "Adesivo",
    icon:
      StickyNote,
  },
];

// ============================================================
// RECEITA
// ============================================================

function getReceitaBadgeProps(
  tipo?: string
) {
  if (
    !tipo ||
    tipo ===
      "comum"
  ) {
    return null;
  }

  const map:
    Record<
      string,
      {
        label: string;
        colorClass: string;
      }
    > = {
    amarela: {
      label:
        "Receita Amarela",

      colorClass:
        "border-amber-400/30 bg-amber-400/10 text-amber-400",
    },

    azul: {
      label:
        "Receita Azul",

      colorClass:
        "border-blue-400/30 bg-blue-400/10 text-blue-400",
    },

    branca_controle: {
      label:
        "Receita Branca (C)",

      colorClass:
        "border-slate-300/30 bg-slate-400/10 text-slate-300",
    },

    branca: {
      label:
        "Receita Branca",

      colorClass:
        "border-slate-300/30 bg-slate-400/10 text-slate-300",
    },

    especial: {
      label:
        "Receita Especial",

      colorClass:
        "border-purple-400/30 bg-purple-400/10 text-purple-400",
    },
  };

  return (
    map[tipo] || {
      label:
        "Controle especial",

      colorClass:
        "border-blue-400/30 bg-blue-400/10 text-blue-400",
    }
  );
}

// ============================================================
// CONTENT
// ============================================================

function MedicamentoDetalhesContent() {
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
    deleteMedicamento,
    getMedicamento,
    medicamentos:
      medicamentosDaPessoa,
  } =
    useMedicamentos();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    renovacoes,
  } =
    useRenovacoes(
      id ||
        undefined
    );

  // ==========================================================
  // ESTADO
  // ==========================================================

  const [
    infoModalOpen,
    setInfoModalOpen,
  ] =
    useState(
      false
    );

  const [
    showAllRenovacoes,
    setShowAllRenovacoes,
  ] =
    useState(
      false
    );

  const [
    toastMessage,
    setToastMessage,
  ] =
    useState<{
      text: string;

      type:
        | "success"
        | "error"
        | "loading";
    } | null>(
      null
    );

  const [
    isMenuFlutuanteOpen,
    setIsMenuFlutuanteOpen,
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
    isDeleting,
    setIsDeleting,
  ] =
    useState(
      false
    );

  const [
    isQuickDoseOpen,
    setIsQuickDoseOpen,
  ] =
    useState(
      false
    );

  // ==========================================================
  // MEDICAMENTO
  //
  // O id da URL sozinho nunca autoriza o acesso.
  //
  // A leitura passa pelo hook/repository person-scoped.
  // ==========================================================

  const med =
    useLiveQuery(
      async () => {
        if (
          !id ||
          !activePersonId
        ) {
          return null;
        }

        const item =
          await getMedicamento(
            id
          );

        return (
          item ||
          null
        );
      },
      [
        id,
        activePersonId,
        getMedicamento,
      ]
    );

  // ==========================================================
  // RELAÇÕES GLOBAIS
  //
  // Médico, hospital, local e farmácia são entidades globais
  // da conta.
  //
  // Mantemos estas leituras diretas nesta etapa porque as APIs
  // canônicas desses módulos não fazem parte desta tela.
  // ==========================================================

  const medico =
    useLiveQuery(
      () =>
        med?.medico_id
          ? db.medicos.get(
              med.medico_id
            )
          : undefined,
      [
        med?.medico_id,
      ]
    );

  const medicoDescontinuacao =
    useLiveQuery(
      () =>
        med?.medico_descontinuacao_id
          ? db.medicos.get(
              med.medico_descontinuacao_id
            )
          : undefined,
      [
        med?.medico_descontinuacao_id,
      ]
    );

  const hospital =
    useLiveQuery(
      () =>
        med?.hospital_id
          ? db.hospitais.get(
              med.hospital_id
            )
          : undefined,
      [
        med?.hospital_id,
      ]
    );

  const local =
    useLiveQuery(
      () =>
        med?.local_id
          ? db.locais.get(
              med.local_id
            )
          : undefined,
      [
        med?.local_id,
      ]
    );

  const farmacia =
    useLiveQuery(
      () =>
        med?.farmacia_id
          ? db.farmacias.get(
              med.farmacia_id
            )
          : undefined,
      [
        med?.farmacia_id,
      ]
    );

  // ==========================================================
  // DOCUMENTO — PERSON SCOPED
  // ==========================================================

  const documento =
    useLiveQuery(
      async () => {
        if (
          !med?.document_id ||
          !activePersonId
        ) {
          return undefined;
        }

        const doc =
          await db.documents.get(
            med.document_id
          );

        if (
          !doc ||
          doc.person_id !==
            activePersonId
        ) {
          return undefined;
        }

        return doc;
      },
      [
        med?.document_id,
        activePersonId,
      ]
    );

  // ==========================================================
  // DOSE LOGS — PERSON SCOPED
  //
  // Aqui precisamos do histórico completo deste medicamento,
  // e não apenas das doses de hoje.
  // ==========================================================

  const doseLogs =
    useLiveQuery(
      async () => {
        if (
          !id ||
          !activePersonId ||
          !med
        ) {
          return [];
        }

        const rows =
          await db.doseLogs
            .where(
              "medicamento_id"
            )
            .equals(
              id
            )
            .toArray();

        return rows.filter(
          (item) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        id,
        activePersonId,
        med?.id,
      ],
      []
    );

  // ==========================================================
  // TRATAMENTOS — PERSON SCOPED
  // ==========================================================

  const tratamentos =
    useLiveQuery(
      async () => {
        if (
          !activePersonId ||
          !med?.tratamento_ids ||
          med.tratamento_ids.length ===
            0
        ) {
          return [];
        }

        const rows =
          await db.tratamentos
            .where(
              "id"
            )
            .anyOf(
              med.tratamento_ids
            )
            .toArray();

        return rows.filter(
          (item) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        activePersonId,
        med?.tratamento_ids,
      ],
      []
    );

  // ==========================================================
  // CIDS — PERSON SCOPED
  // ==========================================================

  const cids =
    useLiveQuery(
      async () => {
        if (
          !activePersonId ||
          !med?.cid_ids ||
          med.cid_ids.length ===
            0
        ) {
          return [];
        }

        const rows =
          await db.cids
            .where(
              "id"
            )
            .anyOf(
              med.cid_ids
            )
            .toArray();

        return rows.filter(
          (item) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        activePersonId,
        med?.cid_ids,
      ],
      []
    );

  // ==========================================================
  // FARMÁCIAS PARA HISTÓRICO
  // ==========================================================

  const farmaciasMap =
    useLiveQuery(
      () =>
        db.farmacias
          .toArray()
          .then(
            (
              rows
            ) =>
              new Map(
                rows.map(
                  (
                    item
                  ) => [
                    item.id,
                    item.nome,
                  ]
                )
              )
          ),
      [],
      new Map<
        string,
        string
      >()
    );

  // ==========================================================
  // LOADING / NOT FOUND
  //
  // Todos os Hooks já foram executados acima.
  // ==========================================================

  if (
    med ===
    undefined
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (
    med ===
      null ||
    !activePersonId
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

        <p className="mt-1 max-w-sm text-sm text-ink-muted">
          O registro não existe ou não pertence à pessoa ativa.
        </p>

        <button
          type="button"
          onClick={
            () =>
              router.replace(
                "/saude/medicamentos"
              )
          }
          className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
        >
          Voltar aos medicamentos
        </button>
      </main>
    );
  }

  if (
    isDeleting
  ) {
    return (
      <div className="min-h-screen bg-void" />
    );
  }

  // ==========================================================
  // DADOS DERIVADOS
  // ==========================================================

  const isSOS =
    med.tipo_uso !==
    "continuo";

  const estoqueInfo =
    computeEstoqueInfo(
      med
    );

  const temEstoque =
    typeof med.estoque_quantidade ===
      "number" &&
    Number.isFinite(
      med.estoque_quantidade
    );

  const saldoRegistrado =
    temEstoque
      ? Number(
          med.estoque_quantidade
        )
      : null;

  const quantidadeDisponivel =
    estoqueInfo
      ?.quantidadeRestante ??
    (
      saldoRegistrado !==
      null
        ? Math.max(
            0,
            saldoRegistrado
          )
        : 0
    );

  const estoqueNegativo =
    Boolean(
      estoqueInfo
        ?.estoqueNegativo
    );

  const unidadePorDoseRaw =
    Number(
      med.estoque_unidade_por_dose
    );

  const unidadePorDose =
    Number.isFinite(
      unidadePorDoseRaw
    ) &&
    unidadePorDoseRaw >
      0
      ? unidadePorDoseRaw
      : null;

  const dosesDisponiveis =
    estoqueInfo &&
    estoqueInfo.estimativaDosesDisponivel
      ? estoqueInfo.dosesRestantes
      : null;

  const isVencida =
    med.proxima_renovacao
      ? isReceitaVencidaSegura(
          med.proxima_renovacao
        )
      : false;

  const possuiDataRenovacao =
    Boolean(
      med.proxima_renovacao
    );

  const alertaInteligente =
    sugerirRenovacao(
      med
    );

  const diasAteRenovacao =
    med.proxima_renovacao
      ? getDaysUntil(
          med.proxima_renovacao
        )
      : null;

  const comportamento =
    analisarComportamentoUso(
      med,
      doseLogs
    );

  // ==========================================================
  // DOSES
  // ==========================================================

  const hoje =
    getLocalTodayISO();

  const seteDiasAtras =
    getDateDaysAgoISO(
      6
    );

  const dosesTomadas =
    doseLogs.filter(
      (log) =>
        Boolean(
          log.tomado_em
        )
    );

  const dosesTomadasHoje =
    dosesTomadas.filter(
      (log) =>
        log.data ===
        hoje
    );

  const dosesTomadasUltimos7Dias =
    dosesTomadas.filter(
      (log) =>
        Boolean(
          log.data &&
            log.data >=
              seteDiasAtras &&
            log.data <=
              hoje
        )
    );

  const quantidadeHoje =
    summarizeKnownQuantity(
      dosesTomadasHoje
    );

  const quantidadeUltimos7Dias =
    summarizeKnownQuantity(
      dosesTomadasUltimos7Dias
    );

  const ultimaDose =
    [
      ...dosesTomadas,
    ]
      .sort(
        (
          first,
          second
        ) =>
          getDoseSortTimestamp(
            second
          ) -
          getDoseSortTimestamp(
            first
          )
      )[0] ||
    null;

  const horariosConfigurados =
    med.tipo_uso ===
      "continuo" &&
    Array.isArray(
      med.estoque_horarios
    )
      ? Array.from(
          new Set(
            med.estoque_horarios
              .map(
                (
                  horario
                ) =>
                  String(
                    horario ||
                      ""
                  ).trim()
              )
              .filter(
                Boolean
              )
          )
        )
      : [];

  const logsHoje =
    doseLogs.filter(
      (log) =>
        log.data ===
        hoje
    );

  const horariosTomadosHoje =
    new Set(
      logsHoje
        .filter(
          (log) =>
            Boolean(
              log.tomado_em
            ) &&
            Boolean(
              log.horario
            ) &&
            horariosConfigurados.includes(
              log.horario!
            )
        )
        .map(
          (log) =>
            log.horario!
        )
    );

  const horariosIgnoradosHoje =
    new Set(
      logsHoje
        .filter(
          (log) =>
            Boolean(
              log.ignorado_em
            ) &&
            Boolean(
              log.horario
            ) &&
            horariosConfigurados.includes(
              log.horario!
            )
        )
        .map(
          (log) =>
            log.horario!
        )
    );

  const dosesEsperadasHoje =
    med.tipo_uso ===
    "continuo"
      ? horariosConfigurados.length
      : 0;

  const dosesTomadasProgramadasHoje =
    horariosConfigurados.filter(
      (horario) =>
        horariosTomadosHoje.has(
          horario
        )
    ).length;

  const dosesIgnoradasProgramadasHoje =
    horariosConfigurados.filter(
      (horario) =>
        horariosIgnoradosHoje.has(
          horario
        )
    ).length;

  const dosesResolvidasHoje =
    horariosConfigurados.filter(
      (horario) =>
        horariosTomadosHoje.has(
          horario
        ) ||
        horariosIgnoradosHoje.has(
          horario
        )
    ).length;

  // ==========================================================
  // SUBSTITUTO
  // ==========================================================

  const medicamentoSubstituto =
    med.substituido_por_id
      ? (
          medicamentosDaPessoa ||
          []
        ).find(
          (item) =>
            item.id ===
            med.substituido_por_id
        )
      : undefined;

  // ==========================================================
  // OUTROS MEDICAMENTOS DO MÉDICO
  // ==========================================================

  const outrosMedsDesteMedico =
    med.medico_id
      ? (
          medicamentosDaPessoa ||
          []
        ).filter(
          (item) =>
            item.medico_id ===
              med.medico_id &&
            item.id !==
              med.id &&
            item.status !==
              "descontinuado"
        )
      : [];

  // ==========================================================
  // ESTOQUE / GOTAS
  // ==========================================================

  const formatoNormalizado =
    String(
      med.formato ||
        ""
    )
      .trim()
      .toLowerCase();

  const formaFarmaceuticaNormalizada =
    String(
      med.forma_farmaceutica ||
        ""
    )
      .trim()
      .toLowerCase();

  const isGota =
    formatoNormalizado.includes(
      "gota"
    ) ||
    formaFarmaceuticaNormalizada.includes(
      "gota"
    );

  const unidadeEstoque =
    String(
      med.estoque_unidade_medida ||
        ""
    )
      .trim()
      .toLowerCase();

  const gotasPorMlRaw =
    Number(
      med.estoque_gotas_por_ml
    );

  const gotasPorMl =
    Number.isFinite(
      gotasPorMlRaw
    ) &&
    gotasPorMlRaw >
      0
      ? gotasPorMlRaw
      : null;

  /*
   * Só convertemos para ml quando o saldo está explicitamente
   * armazenado em gotas.
   *
   * Se o estoque já estiver em ml, ele já é exibido como ml.
   */
  const estoqueEquivalenteMl =
    isGota &&
    unidadeEstoque.includes(
      "gota"
    ) &&
    gotasPorMl !==
      null
      ? quantidadeDisponivel /
        gotasPorMl
      : null;

  const getEstoqueStyle =
    () => {
      if (
        estoqueNegativo
      ) {
        return {
          color:
            "text-coral font-bold",

          icon:
            AlertTriangle,

          label:
            "RECONCILIAR",

          bg:
            "bg-coral/10",

          border:
            "border-coral/20",
        };
      }

      if (
        quantidadeDisponivel <=
        0
      ) {
        return {
          color:
            "text-coral font-bold",

          icon:
            AlertTriangle,

          label:
            "SEM ESTOQUE",

          bg:
            "bg-coral/10",

          border:
            "border-coral/20",
        };
      }

      if (
        !isSOS &&
        estoqueInfo?.diasRestantes !==
          null &&
        estoqueInfo?.diasRestantes !==
          undefined
      ) {
        if (
          estoqueInfo.diasRestantes <=
          2
        ) {
          return {
            color:
              "text-coral font-bold",

            icon:
              AlertTriangle,

            label:
              "CRÍTICO",

            bg:
              "bg-coral/10",

            border:
              "border-coral/20",
          };
        }

        if (
          estoqueInfo.diasRestantes <=
          5
        ) {
          return {
            color:
              "text-amber-400 font-semibold",

            icon:
              AlertTriangle,

            label:
              "BAIXO",

            bg:
              "bg-amber-400/10",

            border:
              "border-amber-400/20",
          };
        }
      }

      if (
        isSOS &&
        dosesDisponiveis !==
          null
      ) {
        if (
          dosesDisponiveis <=
          2
        ) {
          return {
            color:
              "text-coral font-bold",

            icon:
              AlertTriangle,

            label:
              "CRÍTICO",

            bg:
              "bg-coral/10",

            border:
              "border-coral/20",
          };
        }

        if (
          dosesDisponiveis <=
          5
        ) {
          return {
            color:
              "text-amber-400 font-semibold",

            icon:
              AlertTriangle,

            label:
              "BAIXO",

            bg:
              "bg-amber-400/10",

            border:
              "border-amber-400/20",
          };
        }
      }

      if (
        !estoqueInfo
          ?.estimativaDosesDisponivel
      ) {
        return {
          color:
            "text-ice font-semibold",

          icon:
            Info,

          label:
            "SEM ESTIMATIVA",

          bg:
            "bg-ice/10",

          border:
            "border-ice/20",
        };
      }

      return {
        color:
          "text-emerald-400 font-bold",

        icon:
          CheckCircle2,

        label:
          "OK",

        bg:
          "bg-emerald-400/10",

        border:
          "border-emerald-400/20",
      };
    };

  const estoqueStatus =
    getEstoqueStyle();

  const EstoqueStatusIcon =
    estoqueStatus.icon;

  // ==========================================================
  // MELHOR FARMÁCIA
  //
  // Não usamos useMemo aqui para não criar Hook depois de
  // retornos condicionais.
  // ==========================================================

  const comprasPagas =
    renovacoes.filter(
      (item) =>
        item.tipo_aquisicao !==
          "sus" &&
        item.tipo_aquisicao !==
          "gratuito" &&
        typeof item.preco ===
          "number" &&
        item.preco >
          0
    );

  const rankingFarmacias =
    analisarMelhorFarmacia(
      comprasPagas
    );

  const melhorFarmacia =
    rankingFarmacias.length >
      0
      ? rankingFarmacias[
          0
        ]
      : null;

  // ==========================================================
  // RECEITA
  // ==========================================================

  const tipoReceitaLabel =
    TIPO_RECEITA_LABELS[
      med.tipo_receita as keyof typeof TIPO_RECEITA_LABELS
    ] ||
    med.tipo_receita ||
    "Comum";

  const receitaBadge =
    getReceitaBadgeProps(
      med.tipo_receita
    );

  const validadeReceitaReferencia =
    VALIDADE_RECEITA_DIAS[
      (
        med.tipo_receita as keyof typeof VALIDADE_RECEITA_DIAS
      ) ||
        "comum"
    ];

  // ==========================================================
  // RENOVAÇÕES
  // ==========================================================

  const ultimaRenovacao =
    renovacoes.length >
    0
      ? renovacoes[
          0
        ]
      : null;

  const ultimaRenovacaoSemCusto =
    ultimaRenovacao
      ? (
          ultimaRenovacao.tipo_aquisicao ===
            "gratuito" ||
          ultimaRenovacao.tipo_aquisicao ===
            "sus"
        )
      : false;

  const displayedRenovacoes =
    showAllRenovacoes
      ? renovacoes
      : renovacoes.slice(
          0,
          3
        );

  // ==========================================================
  // FINANCEIRO
  // ==========================================================

  const renovacoesPagas =
    comprasPagas;

  const custoHistoricoRenovacoes =
    renovacoesPagas.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.preco ||
            0
        ),
      0
    );

  const precoMedioRenovacoes =
    renovacoesPagas.length >
    0
      ? custoHistoricoRenovacoes /
        renovacoesPagas.length
      : 0;

  // ==========================================================
  // IDENTIDADE
  // ==========================================================

  const formatoBanco =
    med.formato
      ?.toLowerCase()
      .trim() ||
    "comprimido";

  const itemFormato =
    FORMATOS.find(
      (item) =>
        item.id ===
        formatoBanco
    ) ||
    FORMATOS[
      0
    ];

  const SelectedFormatIcon =
    itemFormato.icon;

  const color1 =
    med.cores &&
    med.cores.length >
      0
      ? med.cores[
          0
        ]
      : "#60A5FA";

  const color2 =
    med.cores &&
    med.cores.length >
      1
      ? med.cores[
          1
        ]
      : undefined;

  const personAccent =
    "var(--person-accent, #38BDF8)";

  // ==========================================================
  // MENU
  // ==========================================================

  const menuOptions = [
    {
      id:
        "nova-renovacao",

      label:
        "Nova Renovação",

      icon:
        FileWarning,

      path:
        `/saude/renovacao/nova?medicamento_id=${id}`,
    },

    {
      id:
        "duplicar-medicamento",

      label:
        "Duplicar Medicamento",

      icon:
        Copy,

      path:
        `/saude/medicamentos/novo?duplicar=${id}`,
    },
  ];

  const handleMenuOptionClick =
    (
      path:
        string
    ) => {
      trigger(
        "vibrate"
      );

      setIsMenuFlutuanteOpen(
        false
      );

      router.push(
        path
      );
    };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    async () => {
      if (
        !med.id
      ) {
        return;
      }

      setIsDeleting(
        true
      );

      setToastMessage({
        text:
          "Excluindo medicamento...",

        type:
          "loading",
      });

      try {
        await deleteMedicamento(
          med.id
        );

        trigger(
          "success"
        );

        setToastMessage({
          text:
            "Excluído com sucesso!",

          type:
            "success",
        });

        router.replace(
          "/saude/medicamentos"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao excluir medicamento:",
          error
        );

        trigger(
          "error"
        );

        setToastMessage({
          text:
            "Erro ao excluir medicamento.",

          type:
            "error",
        });

        setTimeout(
          () =>
            setToastMessage(
              null
            ),
          3000
        );

        setIsDeleting(
          false
        );

        setShowDeleteModal(
          false
        );
      }
    };

  // ==========================================================
  // AÇÕES
  // ==========================================================

  const abrirNoMapa =
    (
      enderecoStr?:
        string
    ) => {
      if (
        !enderecoStr
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          enderecoStr
        )}`,
        "_blank",
        "noopener,noreferrer"
      );
    };

  const abrirAnexo =
    () => {
      const url =
        documento
          ?.attachments?.[
          0
        ]?.url;

      if (!url) {
        return;
      }

      trigger(
        "vibrate"
      );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    };

  const compartilharWhatsApp =
    () => {
      trigger(
        "vibrate"
      );

      const linhas = [
        `*${med.nome}*`,

        `Dosagem: ${med.dosagem}`,

        `Uso: ${
          isSOS
            ? "Esporádico / SOS"
            : "Contínuo"
        }`,
      ];

      if (
        med.proxima_renovacao
      ) {
        linhas.push(
          `Próxima renovação: ${formatDate(
            med.proxima_renovacao
          )}`
        );
      }

      if (
        saldoRegistrado !==
        null
      ) {
        linhas.push(
          `Estoque informado: ${formatQuantidade(
            Math.max(
              0,
              saldoRegistrado
            )
          )} ${
            med.estoque_unidade_medida ||
            "unidade(s)"
          }`
        );
      }

      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          linhas.join(
            "\n"
          )
        )}`,
        "_blank",
        "noopener,noreferrer"
      );
    };

  const copiarInfo =
    async () => {
      trigger(
        "vibrate"
      );

      const linhas = [
        med.nome,

        `Dosagem: ${med.dosagem}`,

        `Uso: ${
          isSOS
            ? "Esporádico / SOS"
            : "Contínuo"
        }`,
      ];

      if (
        med.proxima_renovacao
      ) {
        linhas.push(
          `Próxima renovação: ${formatDate(
            med.proxima_renovacao
          )}`
        );
      }

      if (
        saldoRegistrado !==
        null
      ) {
        linhas.push(
          `Estoque: ${formatQuantidade(
            Math.max(
              0,
              saldoRegistrado
            )
          )} ${
            med.estoque_unidade_medida ||
            "unidade(s)"
          }`
        );
      }

      try {
        await navigator.clipboard.writeText(
          linhas.join(
            "\n"
          )
        );

        setToastMessage({
          text:
            "Informações copiadas!",

          type:
            "success",
        });
      } catch {
        setToastMessage({
          text:
            "Não foi possível copiar as informações.",

          type:
            "error",
        });
      }

      setTimeout(
        () =>
          setToastMessage(
            null
          ),
        3000
      );
    };

  const ligar =
    (
      telefone?:
        string
    ) => {
      if (
        !telefone
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      window.open(
        `tel:${telefone}`
      );
    };

  const abrirQuickDose =
    () => {
      trigger(
        "vibrate"
      );

      setIsQuickDoseOpen(
        true
      );
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        {/* ====================================================
            TOAST
            ==================================================== */}

        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{
                opacity:
                  0,

                y:
                  50,

                scale:
                  0.9,
              }}
              animate={{
                opacity:
                  1,

                y:
                  0,

                scale:
                  1,
              }}
              exit={{
                opacity:
                  0,

                y:
                  20,

                scale:
                  0.9,
              }}
              className="fixed bottom-24 left-5 right-5 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-ice/30 bg-surface p-4 shadow-vault backdrop-blur-xl"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  toastMessage.type ===
                  "error"
                    ? "bg-coral/10 text-coral"
                    : "bg-ice/15 text-ice"
                }`}
              >
                {toastMessage.type ===
                  "success" && (
                  <Check
                    size={
                      20
                    }
                  />
                )}

                {toastMessage.type ===
                  "loading" && (
                  <Activity
                    size={
                      20
                    }
                    className="animate-pulse"
                  />
                )}

                {toastMessage.type ===
                  "error" && (
                  <AlertTriangle
                    size={
                      20
                    }
                  />
                )}
              </div>

              <p className="text-sm font-semibold text-ink-primary">
                {
                  toastMessage.text
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/85 px-5 pb-3 pt-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
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

            <div className="min-w-0 flex-1 px-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-ice/80">
                Medicamento
              </p>

              <h1 className="truncate text-base font-semibold text-ink-primary">
                Detalhes
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={
                  copiarInfo
                }
                aria-label="Copiar informações"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised text-ink-muted transition-all hover:text-ice active:scale-95"
              >
                <Copy
                  size={
                    17
                  }
                />
              </button>

              <button
                type="button"
                onClick={
                  compartilharWhatsApp
                }
                aria-label="Compartilhar no WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-400 transition-all active:scale-95"
              >
                <Share2
                  size={
                    17
                  }
                />
              </button>

              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setIsMenuFlutuanteOpen(
                      (
                        previous
                      ) =>
                        !previous
                    );
                  }
                }
                aria-label="Mais ações"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95"
              >
                <Plus
                  size={
                    18
                  }
                />
              </button>

              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    router.push(
                      `/saude/medicamentos/editar?id=${id}`
                    );
                  }
                }
                aria-label="Editar medicamento"
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised text-ice transition-all active:scale-95 sm:flex"
              >
                <Edit3
                  size={
                    17
                  }
                />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isMenuFlutuanteOpen && (
              <>
                <motion.button
                  type="button"
                  aria-label="Fechar menu"
                  initial={{
                    opacity:
                      0,
                  }}
                  animate={{
                    opacity:
                      1,
                  }}
                  exit={{
                    opacity:
                      0,
                  }}
                  onClick={
                    () =>
                      setIsMenuFlutuanteOpen(
                        false
                      )
                  }
                  className="fixed inset-0 z-40 cursor-default bg-black/40 backdrop-blur-sm"
                />

                <motion.div
                  initial={{
                    opacity:
                      0,

                    y:
                      8,

                    scale:
                      0.96,
                  }}
                  animate={{
                    opacity:
                      1,

                    y:
                      0,

                    scale:
                      1,
                  }}
                  exit={{
                    opacity:
                      0,

                    y:
                      8,

                    scale:
                      0.96,
                  }}
                  className="absolute right-5 top-[68px] z-50 w-60 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface p-1.5 shadow-2xl"
                >
                  <div className="px-3 pb-2 pt-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-faint">
                      Ações
                    </p>
                  </div>

                  {menuOptions.map(
                    (
                      option
                    ) => {
                      const Icon =
                        option.icon;

                      return (
                        <button
                          key={
                            option.id
                          }
                          type="button"
                          onClick={
                            () =>
                              handleMenuOptionClick(
                                option.path
                              )
                          }
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-surface-raised active:scale-[0.98]"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                            <Icon
                              size={
                                16
                              }
                            />
                          </div>

                          <span className="text-sm font-medium text-ink-primary">
                            {
                              option.label
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
                        setIsMenuFlutuanteOpen(
                          false
                        );

                        router.push(
                          `/saude/medicamentos/editar?id=${id}`
                        );
                      }
                    }
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-surface-raised active:scale-[0.98] sm:hidden"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                      <Edit3
                        size={
                          16
                        }
                      />
                    </div>

                    <span className="text-sm font-medium text-ink-primary">
                      Editar Medicamento
                    </span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </header>

        <div className="mx-auto max-w-3xl space-y-6 px-5 pt-5">
          {/* ==================================================
              RENOVAÇÃO
              ================================================== */}

          <AnimatePresence>
            {alertaInteligente.deveRenovar &&
              med.status !==
                "descontinuado" && (
                <motion.div
                  initial={{
                    opacity:
                      0,

                    y:
                      -8,
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

                    height:
                      0,
                  }}
                  className={`rounded-[24px] border p-4 ${
                    alertaInteligente.urgencia ===
                    "alta"
                      ? "border-coral/30 bg-coral/10"
                      : "border-amber-400/30 bg-amber-400/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        alertaInteligente.urgencia ===
                        "alta"
                          ? "bg-coral/10 text-coral"
                          : "bg-amber-400/10 text-amber-400"
                      }`}
                    >
                      <AlertTriangle
                        size={
                          19
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p
                          className={`text-sm font-bold ${
                            alertaInteligente.urgencia ===
                            "alta"
                              ? "text-coral"
                              : "text-amber-400"
                          }`}
                        >
                          Atenção à renovação
                        </p>

                        {diasAteRenovacao !==
                          null &&
                          diasAteRenovacao >
                            0 &&
                          diasAteRenovacao <=
                            30 && (
                            <span
                              className={`rounded-lg px-2 py-1 text-[9px] font-bold uppercase ${
                                alertaInteligente.urgencia ===
                                "alta"
                                  ? "bg-coral/10 text-coral"
                                  : "bg-amber-400/10 text-amber-400"
                              }`}
                            >
                              {
                                diasAteRenovacao
                              }{" "}
                              dias
                            </span>
                          )}
                      </div>

                      <p
                        className={`mt-1 text-xs leading-relaxed ${
                          alertaInteligente.urgencia ===
                          "alta"
                            ? "text-coral/80"
                            : "text-amber-400/80"
                        }`}
                      >
                        {
                          alertaInteligente.mensagem
                        }
                      </p>

                      <button
                        type="button"
                        onClick={
                          () =>
                            router.push(
                              `/saude/renovacao/nova?medicamento_id=${id}`
                            )
                        }
                        className={`mt-3 rounded-xl px-3 py-2 text-xs font-bold transition-transform active:scale-95 ${
                          alertaInteligente.urgencia ===
                          "alta"
                            ? "bg-coral text-void"
                            : "bg-amber-400 text-void"
                        }`}
                      >
                        Registrar renovação
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>

          {/* ==================================================
              COMPORTAMENTO
              ================================================== */}

          {comportamento && (
            <motion.div
              initial={{
                opacity:
                  0,

                y:
                  8,
              }}
              animate={{
                opacity:
                  1,

                y:
                  0,
              }}
              className={`rounded-[24px] border p-4 ${
                comportamento.tipo ===
                "alerta_adesao"
                  ? "border-amber-400/30 bg-amber-400/10"
                  : "border-violet-400/30 bg-violet-400/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    comportamento.tipo ===
                    "alerta_adesao"
                      ? "bg-amber-400/10 text-amber-400"
                      : "bg-violet-400/10 text-violet-400"
                  }`}
                >
                  <Activity
                    size={
                      18
                    }
                  />
                </div>

                <div>
                  <p
                    className={`text-sm font-bold ${
                      comportamento.tipo ===
                      "alerta_adesao"
                        ? "text-amber-400"
                        : "text-violet-400"
                    }`}
                  >
                    {
                      comportamento.titulo
                    }
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    {
                      comportamento.mensagem
                    }
                  </p>

                  <p className="mt-1 text-[10px] text-ink-faint">
                    Sugestão:{" "}
                    {
                      comportamento.acaoSugerida
                    }
                  </p>

                  {comportamento.confianca &&
                    comportamento.amostra !==
                      undefined && (
                      <p className="mt-2 text-[9px] font-medium uppercase tracking-wide text-ink-faint">
                        Confiança{" "}
                        {
                          comportamento.confianca
                        }{" "}
                        ·{" "}
                        {
                          comportamento.amostra
                        }{" "}
                        registro(s)
                      </p>
                    )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================
              HERO
              ================================================== */}

          <section className="relative overflow-hidden rounded-[30px] border border-surface-border/70 bg-surface shadow-lg">
            <div
              className="absolute bottom-0 left-0 top-0 w-1.5"
              style={{
                backgroundColor:
                  med.status ===
                  "descontinuado"
                    ? "#fb7185"
                    : med.tipo_receita ===
                        "amarela"
                      ? "#fbbf24"
                      : med.tipo_receita ===
                          "azul"
                        ? "#60a5fa"
                        : personAccent,
              }}
            />

            <div className="p-5 pl-6 sm:p-6 sm:pl-7">
              <div className="flex items-start gap-4">
                <ListIcon
                  color={
                    color1
                  }
                  color2={
                    color2
                  }
                  isGradient={
                    Boolean(
                      color2
                    )
                  }
                  size={
                    32
                  }
                  icon={
                    <SelectedFormatIcon
                      size={
                        30
                      }
                      stroke={
                        color1
                      }
                      strokeWidth={
                        2
                      }
                      fill={`${color1}44`}
                    />
                  }
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-xl font-bold uppercase tracking-wide text-ink-primary sm:text-2xl">
                      {
                        med.nome
                      }
                    </h2>

                    {med.status ===
                      "descontinuado" && (
                      <span className="rounded-full border border-coral/20 bg-coral/10 px-2 py-0.5 text-[9px] font-bold uppercase text-coral">
                        Suspenso
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-medium text-ink-muted">
                    {
                      med.dosagem
                    }

                    <span>
                      {" "}
                      •{" "}
                      {isSOS
                        ? "Uso Esporádico / SOS"
                        : "Uso Contínuo"}
                    </span>
                  </p>

                  {tratamentos.length >
                    0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tratamentos.map(
                        (
                          tratamento:
                            Tratamento
                        ) => (
                          <span
                            key={
                              tratamento.id
                            }
                            className="rounded-full border border-surface-border bg-surface-raised px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-ink-muted"
                          >
                            {
                              tratamento.nome
                            }
                          </span>
                        )
                      )}
                    </div>
                  )}

                  {cids.length >
                    0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {cids.map(
                        (
                          cid:
                            Cid
                        ) => {
                          const theme =
                            getClinicalTheme(
                              cid.descricao ||
                                cid.codigo
                            );

                          const Icon =
                            theme.icon;

                          return (
                            <span
                              key={
                                cid.id
                              }
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${theme.tagClass}`}
                            >
                              <Icon
                                size={
                                  10
                                }
                              />

                              {
                                cid.codigo
                              }
                            </span>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
              ROTINA E DOSES
              ================================================== */}

          {med.status !==
            "descontinuado" && (
            <section className="space-y-3">
              <SectionTitle
                icon={
                  <Clock
                    size={
                      15
                    }
                  />
                }
                title="Rotina & Uso"
              />

              <div className="rounded-[26px] border border-surface-border/60 bg-surface p-5">
                {isSOS ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-surface-raised p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                          Tomadas hoje
                        </p>

                        <p className="mt-1 text-xl font-bold text-ink-primary">
                          {
                            dosesTomadasHoje.length
                          }
                        </p>
                      </div>

                      <div className="rounded-2xl bg-surface-raised p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                          Quantidade conhecida
                        </p>

                        <p className="mt-1 text-xl font-bold text-ink-primary">
                          {
                            formatKnownQuantitySummary(
                              quantidadeHoje
                            )
                          }
                        </p>

                        {!quantidadeHoje.complete &&
                          quantidadeHoje.totalCount >
                            0 && (
                            <p className="mt-0.5 text-[9px] text-amber-400">
                              * existem tomadas sem quantidade registrada
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-surface-border/50 pt-4 text-xs">
                      <span className="text-ink-muted">
                        Últimos 7 dias
                      </span>

                      <span className="text-right font-semibold text-ink-primary">
                        {
                          dosesTomadasUltimos7Dias.length
                        }{" "}
                        tomada
                        {dosesTomadasUltimos7Dias.length ===
                        1
                          ? ""
                          : "s"}

                        {" · "}

                        {formatKnownQuantitySummary(
                          quantidadeUltimos7Dias
                        )}{" "}
                        un.
                      </span>
                    </div>

                    {!quantidadeUltimos7Dias.complete &&
                      quantidadeUltimos7Dias.totalCount >
                        0 && (
                        <p className="text-[9px] leading-relaxed text-ink-faint">
                          A soma de quantidade é parcial porque nem todas as tomadas possuem quantidade registrada.
                        </p>
                      )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-surface-raised p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                          Hoje
                        </p>

                        <p className="mt-1 text-xl font-bold text-ink-primary">
                          {
                            dosesResolvidasHoje
                          }
                          /
                          {
                            dosesEsperadasHoje
                          }
                        </p>

                        <p className="mt-0.5 text-[10px] text-ink-muted">
                          slots programados resolvidos
                        </p>

                        {dosesEsperadasHoje >
                          0 && (
                          <p className="mt-1 text-[9px] text-ink-faint">
                            {
                              dosesTomadasProgramadasHoje
                            }{" "}
                            tomada
                            {dosesTomadasProgramadasHoje ===
                            1
                              ? ""
                              : "s"}{" "}
                            ·{" "}
                            {
                              dosesIgnoradasProgramadasHoje
                            }{" "}
                            ignorada
                            {dosesIgnoradasProgramadasHoje ===
                            1
                              ? ""
                              : "s"}
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl bg-surface-raised p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                          Por dose
                        </p>

                        <p className="mt-1 text-xl font-bold text-ink-primary">
                          {unidadePorDose !==
                          null
                            ? formatQuantidade(
                                unidadePorDose
                              )
                            : "—"}
                        </p>

                        <p className="mt-0.5 truncate text-[10px] text-ink-muted">
                          {unidadePorDose !==
                          null
                            ? med.estoque_unidade_medida ||
                              "unidade(s)"
                            : "quantidade não configurada"}
                        </p>
                      </div>
                    </div>

                    {horariosConfigurados.length >
                      0 ? (
                      <div className="border-t border-surface-border/50 pt-4">
                        <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                          Horários configurados
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {horariosConfigurados.map(
                            (
                              horario
                            ) => {
                              const tomada =
                                horariosTomadosHoje.has(
                                  horario
                                );

                              const ignorada =
                                horariosIgnoradosHoje.has(
                                  horario
                                );

                              return (
                                <span
                                  key={
                                    horario
                                  }
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-bold ${
                                    tomada
                                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                                      : ignorada
                                        ? "border-amber-400/20 bg-amber-400/10 text-amber-400"
                                        : "border-surface-border bg-surface-raised text-ink-muted"
                                  }`}
                                >
                                  {tomada && (
                                    <Check
                                      size={
                                        11
                                      }
                                    />
                                  )}

                                  {ignorada &&
                                    !tomada && (
                                      <AlertCircle
                                        size={
                                          11
                                        }
                                      />
                                    )}

                                  {
                                    horario
                                  }
                                </span>
                              );
                            }
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="border-t border-surface-border/50 pt-4 text-xs text-amber-400">
                        Este medicamento está marcado como contínuo, mas não possui horários configurados.
                      </p>
                    )}
                  </div>
                )}

                {ultimaDose && (
                  <div className="mt-4 flex items-center gap-1.5 border-t border-surface-border/50 pt-4 text-[10px] text-ink-muted">
                    <Clock
                      size={
                        11
                      }
                      className="text-ice"
                    />

                    Última tomada registrada:{" "}
                    <b className="text-ink-primary">
                      {formatDate(
                        ultimaDose.data
                      )}{" "}
                      às{" "}
                      {
                        ultimaDose.horario
                      }
                    </b>
                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    abrirQuickDose
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3.5 font-bold text-void shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                >
                  <Zap
                    size={
                      18
                    }
                    fill="currentColor"
                  />

                  Registrar dose
                </button>

                {!temEstoque && (
                  <p className="mt-2 text-center text-[9px] leading-relaxed text-ink-faint">
                    A dose será registrada normalmente mesmo sem controle de estoque.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ==================================================
              ESTOQUE
              ================================================== */}

          {med.status !==
              "descontinuado" &&
            temEstoque && (
              <section
                className={`overflow-hidden rounded-[28px] border ${estoqueStatus.border} ${estoqueStatus.bg} p-1`}
              >
                <div className="rounded-[24px] bg-surface p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                        <Package
                          size={
                            14
                          }
                        />

                        Estoque Atual
                      </p>

                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase ${estoqueStatus.color} ${estoqueStatus.bg}`}
                      >
                        <EstoqueStatusIcon
                          size={
                            10
                          }
                        />

                        {
                          estoqueStatus.label
                        }
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <p
                        className={`font-display text-3xl font-bold ${estoqueStatus.color}`}
                      >
                        {
                          formatQuantidade(
                            quantidadeDisponivel
                          )
                        }
                      </p>

                      <span className="text-sm font-medium uppercase text-ink-muted">
                        {med.estoque_unidade_medida ||
                          "unidade(s)"}
                      </span>

                      {estoqueEquivalenteMl !==
                        null && (
                        <span className="text-xs text-ink-faint">
                          ≈{" "}
                          {
                            formatQuantidade(
                              estoqueEquivalenteMl
                            )
                          }{" "}
                          ml
                        </span>
                      )}
                    </div>

                    {estoqueNegativo &&
                      saldoRegistrado !==
                        null && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-coral/20 bg-coral/10 p-3">
                          <AlertTriangle
                            size={
                              14
                            }
                            className="mt-0.5 shrink-0 text-coral"
                          />

                          <p className="text-[10px] leading-relaxed text-coral/90">
                            Os registros de uso ultrapassaram o saldo informado. O saldo interno é{" "}
                            <b>
                              {
                                formatQuantidade(
                                  saldoRegistrado
                                )
                              }{" "}
                              {med.estoque_unidade_medida ||
                                "unidade(s)"}
                            </b>
                            . Revise o estoque físico para reconciliar o valor.
                          </p>
                        </div>
                      )}

                    {!isSOS &&
                      estoqueInfo?.diasRestantes !==
                        null &&
                      estoqueInfo?.diasRestantes !==
                        undefined && (
                        <p className="mt-2 text-xs text-ink-muted">
                          Estimativa:{" "}
                          <b className="text-ink-primary">
                            {
                              estoqueInfo.diasRestantes
                            }{" "}
                            dia
                            {estoqueInfo.diasRestantes ===
                            1
                              ? ""
                              : "s"}
                          </b>{" "}
                          na rotina configurada
                        </p>
                      )}

                    {isSOS &&
                      dosesDisponiveis !==
                        null && (
                        <p className="mt-2 text-xs text-ink-muted">
                          Aproximadamente{" "}
                          <b className="text-ink-primary">
                            {
                              formatQuantidade(
                                dosesDisponiveis
                              )
                            }
                          </b>{" "}
                          dose
                          {dosesDisponiveis ===
                          1
                            ? ""
                            : "s"}{" "}
                          pela configuração atual.
                        </p>
                      )}

                    {estoqueInfo &&
                      !estoqueInfo.estimativaDosesDisponivel &&
                      quantidadeDisponivel >
                        0 && (
                        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                          O saldo está registrado, mas faltam dados para estimar quantas doses ele representa.
                        </p>
                      )}
                  </div>

                  <div className="mt-4 flex flex-col gap-1.5 border-t border-surface-border/50 pt-4 text-[10px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Quantidade por dose:{" "}
                      <b className="text-ink-primary">
                        {unidadePorDose !==
                        null
                          ? `${formatQuantidade(
                              unidadePorDose
                            )} ${
                              med.estoque_unidade_medida ||
                              "unidade(s)"
                            }`
                          : "Não configurada"}
                      </b>
                    </span>

                    <span>
                      Saldo informado em:{" "}
                      <b className="text-ink-primary">
                        {formatDate(
                          med.estoque_data_referencia
                        )}
                      </b>
                    </span>
                  </div>

                  {isGota &&
                    (
                      unidadeEstoque.includes(
                        "ml"
                      ) ||
                      unidadeEstoque.includes(
                        "frasco"
                      )
                    ) &&
                    gotasPorMl ===
                      null && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-surface-raised p-3">
                        <Info
                          size={
                            13
                          }
                          className="mt-0.5 shrink-0 text-ice"
                        />

                        <p className="text-[10px] leading-relaxed text-ink-muted">
                          Gotas por ml não está configurado. O Vault não fará conversão automática entre gotas e ml.
                        </p>
                      </div>
                    )}
                </div>
              </section>
            )}

          {/* ==================================================
              SUSPENSÃO / SUBSTITUIÇÃO
              ================================================== */}

          {med.status ===
            "descontinuado" && (
            <section className="space-y-3">
              <SectionTitle
                icon={
                  <AlertCircle
                    size={
                      15
                    }
                  />
                }
                title="Suspensão"
              />

              <div className="space-y-3 rounded-[26px] border border-coral/20 bg-coral/5 p-5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-coral">
                    Medicamento suspenso
                  </p>

                  <p className="mt-1 text-sm font-semibold text-ink-primary">
                    {formatDate(
                      med.data_descontinuacao
                    )}
                  </p>
                </div>

                {med.motivo_descontinuacao && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                      Motivo registrado
                    </p>

                    <p className="mt-1 text-sm leading-relaxed text-ink-primary">
                      {
                        med.motivo_descontinuacao
                      }
                    </p>
                  </div>
                )}

                {(medicoDescontinuacao ||
                  med.medico_descontinuacao_nome) && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                      Médico relacionado
                    </p>

                    <p className="mt-1 text-sm font-semibold text-ink-primary">
                      {medicoDescontinuacao
                        ?.nome ||
                        med.medico_descontinuacao_nome}
                    </p>
                  </div>
                )}

                {medicamentoSubstituto && (
                  <button
                    type="button"
                    onClick={
                      () =>
                        router.push(
                          `/saude/medicamentos/detalhes?id=${medicamentoSubstituto.id}`
                        )
                    }
                    className="flex w-full items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-left transition-transform active:scale-[0.99]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                        <ArrowRightLeft
                          size={
                            16
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                          Substituído por
                        </p>

                        <p className="truncate text-sm font-bold text-ink-primary">
                          {
                            medicamentoSubstituto.nome
                          }{" "}
                          {
                            medicamentoSubstituto.dosagem
                          }
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      size={
                        17
                      }
                      className="shrink-0 text-emerald-400"
                    />
                  </button>
                )}
              </div>
            </section>
          )}

          {/* ==================================================
              MELHOR FARMÁCIA
              ================================================== */}

          {melhorFarmacia && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
              <Award
                size={
                  16
                }
                className="shrink-0 text-emerald-400"
              />

              <p className="text-xs text-ink-primary">
                Melhor preço médio no histórico:{" "}
                <span className="font-bold text-emerald-400">
                  R${" "}
                  {melhorFarmacia.media_preco.toFixed(
                    2
                  )}
                </span>

                {melhorFarmacia.total_compras >
                  0 && (
                  <span className="text-ink-muted">
                    {" "}
                    (
                    {
                      melhorFarmacia.total_compras
                    }{" "}
                    compra
                    {melhorFarmacia.total_compras >
                    1
                      ? "s"
                      : ""}
                    )
                  </span>
                )}
              </p>
            </div>
          )}

          {/* ==================================================
              EVOLUÇÃO
              ================================================== */}

          {med.historico_dosagens &&
            med.historico_dosagens.length >
              0 && (
              <section className="space-y-3">
                <SectionTitle
                  icon={
                    <TrendingUp
                      size={
                        15
                      }
                    />
                  }
                  title="Evolução da Dosagem"
                />

                <div className="rounded-[26px] border border-surface-border/60 bg-surface p-5">
                  <div className="relative ml-3 space-y-6 border-l-2 border-surface-border pb-1">
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-ice bg-surface">
                        <div className="h-1.5 w-1.5 rounded-full bg-ice" />
                      </div>

                      <p className="text-sm font-bold text-ice">
                        {
                          med.dosagem
                        }

                        <span className="ml-1.5 text-[9px] font-normal uppercase text-ink-muted">
                          Atual
                        </span>
                      </p>
                    </div>

                    {[
                      ...med.historico_dosagens,
                    ]
                      .reverse()
                      .map(
                        (
                          hist:
                            HistDosagem,
                          index:
                            number
                        ) => (
                          <div
                            key={`${hist.data_mudanca}-${index}`}
                            className="relative pl-6 opacity-70"
                          >
                            <div className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface-border bg-surface">
                              <div className="h-1.5 w-1.5 rounded-full bg-surface-border" />
                            </div>

                            <p className="text-sm font-semibold text-ink-primary">
                              {
                                hist.dosagem_antiga
                              }
                            </p>

                            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                              Alterado em{" "}
                              {formatDate(
                                hist.data_mudanca
                              )}

                              {hist.medico_responsavel
                                ? ` · ${hist.medico_responsavel}`
                                : ""}
                            </p>
                          </div>
                        )
                      )}
                  </div>
                </div>
              </section>
            )}

          {/* ==================================================
              FINANCEIRO
              ================================================== */}

          {(renovacoesPagas.length >
            0 ||
            typeof med.preco ===
              "number") && (
            <section className="space-y-3">
              <SectionTitle
                icon={
                  <LineChart
                    size={
                      15
                    }
                  />
                }
                title="Financeiro"
              />

              {renovacoesPagas.length >
              0 ? (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={
                      <LineChart
                        size={
                          14
                        }
                      />
                    }
                    label="Compras registradas"
                    value={`R$ ${custoHistoricoRenovacoes.toFixed(
                      2
                    )}`}
                    description={`${renovacoesPagas.length} aquisição(ões) pagas`}
                  />

                  <StatCard
                    icon={
                      <DollarSign
                        size={
                          14
                        }
                      />
                    }
                    label="Preço médio"
                    value={`R$ ${precoMedioRenovacoes.toFixed(
                      2
                    )}`}
                    description="Média das aquisições registradas"
                  />
                </div>
              ) : (
                <StatCard
                  icon={
                    <DollarSign
                      size={
                        14
                      }
                    />
                  }
                  label="Valor informado"
                  value={`R$ ${Number(
                    med.preco ||
                      0
                  ).toFixed(
                    2
                  )}`}
                  description="Valor de referência salvo no medicamento"
                />
              )}
            </section>
          )}

          {/* ==================================================
              REDE
              ================================================== */}

          <section className="space-y-3">
            <SectionTitle
              icon={
                <Stethoscope
                  size={
                    15
                  }
                />
              }
              title="Prescrição & Rede"
            />

            <div className="space-y-2">
              <DetailInfoRow
                icon={
                  <Stethoscope
                    size={
                      19
                    }
                  />
                }
                iconClassName="bg-ice/10 text-ice"
                label="Médico Prescritor"
              >
                <p className="truncate text-sm font-bold text-ink-primary">
                  {medico?.nome ||
                    med.medico ||
                    "Não informado"}
                </p>

                {outrosMedsDesteMedico.length >
                  0 && (
                  <span className="mt-1 inline-block rounded-md bg-ice/10 px-2 py-0.5 text-[9px] font-medium text-ice">
                    Também vinculado a{" "}
                    {
                      outrosMedsDesteMedico.length
                    }{" "}
                    outro
                    {outrosMedsDesteMedico.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    medicamento
                    {outrosMedsDesteMedico.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    desta pessoa
                  </span>
                )}
              </DetailInfoRow>

              {hospital && (
                <DetailInfoRow
                  icon={
                    <Building2
                      size={
                        19
                      }
                    />
                  }
                  iconClassName="bg-violet-400/10 text-violet-400"
                  label="Hospital"
                  action={
                    hospital.endereco ? (
                      <button
                        type="button"
                        onClick={
                          () =>
                            abrirNoMapa(
                              hospital.endereco
                            )
                        }
                        aria-label="Abrir hospital no mapa"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400 transition-all active:scale-95"
                      >
                        <MapPin
                          size={
                            17
                          }
                        />
                      </button>
                    ) : undefined
                  }
                >
                  <p className="truncate text-sm font-bold text-ink-primary">
                    {
                      hospital.nome
                    }
                  </p>

                  {hospital.endereco && (
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                      {
                        hospital.endereco
                      }
                    </p>
                  )}
                </DetailInfoRow>
              )}

              {local && (
                <DetailInfoRow
                  icon={
                    <MapPin
                      size={
                        19
                      }
                    />
                  }
                  iconClassName="bg-emerald-400/10 text-emerald-400"
                  label="Local de Saúde"
                  action={
                    local.endereco ? (
                      <button
                        type="button"
                        onClick={
                          () =>
                            abrirNoMapa(
                              local.endereco
                            )
                        }
                        aria-label="Abrir local no mapa"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 transition-all active:scale-95"
                      >
                        <MapPin
                          size={
                            17
                          }
                        />
                      </button>
                    ) : undefined
                  }
                >
                  <p className="truncate text-sm font-bold text-ink-primary">
                    {
                      local.nome
                    }
                  </p>

                  <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                    {local.tipo ||
                      "Local de saúde"}
                  </p>
                </DetailInfoRow>
              )}

              {(farmacia ||
                med.farmacia) && (
                <DetailInfoRow
                  icon={
                    <Store
                      size={
                        19
                      }
                    />
                  }
                  iconClassName="bg-amber-400/10 text-amber-400"
                  label="Farmácia Vinculada"
                  action={
                    <>
                      {farmacia?.telefone && (
                        <button
                          type="button"
                          onClick={
                            () =>
                              ligar(
                                farmacia.telefone
                              )
                          }
                          aria-label="Ligar para farmácia"
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 transition-all active:scale-95"
                        >
                          <Phone
                            size={
                              17
                            }
                          />
                        </button>
                      )}

                      {farmacia?.endereco && (
                        <button
                          type="button"
                          onClick={
                            () =>
                              abrirNoMapa(
                                farmacia.endereco
                              )
                          }
                          aria-label="Abrir farmácia no mapa"
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 transition-all active:scale-95"
                        >
                          <MapPin
                            size={
                              17
                            }
                          />
                        </button>
                      )}
                    </>
                  }
                >
                  <p className="truncate text-sm font-bold text-ink-primary">
                    {farmacia?.nome ||
                      med.farmacia}
                  </p>

                  {farmacia?.endereco && (
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                      {
                        farmacia.endereco
                      }
                    </p>
                  )}
                </DetailInfoRow>
              )}

              {ultimaRenovacao &&
                ultimaRenovacaoSemCusto && (
                  <div className="flex items-start gap-3 rounded-[22px] border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <Gift
                      size={
                        17
                      }
                      className="mt-0.5 shrink-0 text-emerald-400"
                    />

                    <div className="text-xs">
                      <p className="font-semibold text-emerald-400">
                        Última aquisição registrada via SUS / sem custo
                      </p>

                      {ultimaRenovacao.data_proxima_retirada && (
                        <p className="mt-1 text-ink-muted">
                          Próxima retirada informada:{" "}
                          {formatDate(
                            ultimaRenovacao.data_proxima_retirada
                          )}
                        </p>
                      )}

                      {ultimaRenovacao.exige_nova_receita && (
                        <p className="mt-1 flex items-center gap-1 text-amber-400">
                          <AlertCircle
                            size={
                              12
                            }
                          />

                          Registro indica necessidade de nova receita.
                        </p>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </section>

          {/* ==================================================
              RECEITA
              ================================================== */}

          <section className="space-y-3">
            <SectionTitle
              icon={
                <FileText
                  size={
                    15
                  }
                />
              }
              title="Receita"
              action={
                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setInfoModalOpen(
                        true
                      );
                    }
                  }
                  className="flex items-center gap-1 rounded-full bg-surface-raised px-2.5 py-1 text-[9px] font-bold uppercase text-ink-muted"
                >
                  <Info
                    size={
                      11
                    }
                  />

                  Info
                </button>
              }
            />

            <div className="rounded-[24px] border border-surface-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-primary">
                    <FileText
                      size={
                        14
                      }
                    />

                    {
                      tipoReceitaLabel
                    }
                  </span>

                  {receitaBadge && (
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase ${receitaBadge.colorClass}`}
                    >
                      {
                        receitaBadge.label
                      }
                    </span>
                  )}
                </div>

                {!possuiDataRenovacao ? (
                  <span className="rounded-full bg-surface-raised px-2 py-1 text-[9px] font-bold uppercase text-ink-muted">
                    Sem data
                  </span>
                ) : isVencida ? (
                  <span className="rounded-full bg-coral px-2 py-1 text-[9px] font-bold uppercase text-void">
                    Data atingida
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500 px-2 py-1 text-[9px] font-bold uppercase text-void">
                    Dentro da data
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-surface-border/50 pt-3">
                <div>
                  <p className="text-[9px] font-bold uppercase text-ink-muted">
                    Emissão
                  </p>

                  <p className="mt-0.5 text-sm font-bold text-ink-primary">
                    {formatDate(
                      med.data_receita
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase text-ink-muted">
                    Próxima renovação
                  </p>

                  <p className="mt-0.5 text-sm font-bold text-ink-primary">
                    {formatDate(
                      med.proxima_renovacao
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-surface-border/50 pt-3">
                {documento?.attachments &&
                documento.attachments.length >
                  0 ? (
                  <button
                    type="button"
                    onClick={
                      abrirAnexo
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-ice/10 px-3 py-2.5 text-xs font-bold text-ice transition-colors hover:bg-ice/15"
                  >
                    <ExternalLink
                      size={
                        14
                      }
                    />

                    Ver anexo da receita
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={
                      () =>
                        router.push(
                          `/saude/medicamentos/editar?id=${id}&intent=rede`
                        )
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-ice/10 px-3 py-2.5 text-xs font-bold text-ice transition-colors hover:bg-ice/15"
                  >
                    <Plus
                      size={
                        14
                      }
                    />

                    Vincular receita
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ==================================================
              RENOVAÇÕES
              ================================================== */}

          {renovacoes.length >
            0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                    Histórico
                  </p>

                  <h2 className="mt-0.5 text-sm font-semibold text-ink-primary">
                    Aquisições & Renovações
                  </h2>
                </div>

                {renovacoes.length >
                  3 && (
                  <button
                    type="button"
                    onClick={
                      () =>
                        setShowAllRenovacoes(
                          (
                            previous
                          ) =>
                            !previous
                        )
                    }
                    className="flex items-center gap-1 rounded-lg bg-ice/10 px-2.5 py-1.5 text-[9px] font-bold text-ice"
                  >
                    {showAllRenovacoes ? (
                      <>
                        <ChevronUp
                          size={
                            12
                          }
                        />

                        Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown
                          size={
                            12
                          }
                        />

                        Ver todas (
                        {
                          renovacoes.length
                        }
                        )
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {displayedRenovacoes.map(
                    (
                      renovacao,
                      index
                    ) => {
                      const nomeFarmacia =
                        renovacao.farmacia_id
                          ? farmaciasMap.get(
                              renovacao.farmacia_id
                            )
                          : null;

                      const semCusto =
                        renovacao.tipo_aquisicao ===
                          "gratuito" ||
                        renovacao.tipo_aquisicao ===
                          "sus";

                      return (
                        <motion.article
                          key={
                            renovacao.id ||
                            index
                          }
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
                          className={`rounded-[22px] border bg-surface p-3.5 ${
                            semCusto
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : "border-surface-border"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted">
                                <Calendar
                                  size={
                                    14
                                  }
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs font-bold text-ink-primary">
                                  {formatDate(
                                    renovacao.data ||
                                      renovacao.created_at
                                  )}
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  {nomeFarmacia && (
                                    <span className="max-w-[180px] truncate text-[10px] text-ink-muted">
                                      {
                                        nomeFarmacia
                                      }
                                    </span>
                                  )}

                                  {semCusto ? (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-400">
                                      <Gift
                                        size={
                                          9
                                        }
                                      />

                                      {renovacao.tipo_aquisicao ===
                                      "sus"
                                        ? "SUS"
                                        : "Sem custo"}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-ice/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-ice">
                                      <DollarSign
                                        size={
                                          9
                                        }
                                      />

                                      Comprado
                                    </span>
                                  )}

                                  {typeof renovacao.quantidade ===
                                    "number" && (
                                    <span className="rounded-full bg-surface-raised px-1.5 py-0.5 text-[8px] font-bold text-ink-muted">
                                      Qtd.{" "}
                                      {
                                        formatQuantidade(
                                          renovacao.quantidade
                                        )
                                      }
                                    </span>
                                  )}

                                  {renovacao.exige_nova_receita && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400">
                                      <AlertCircle
                                        size={
                                          9
                                        }
                                      />

                                      Nova receita
                                    </span>
                                  )}

                                  {renovacao.data_proxima_retirada && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-ice/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-ice">
                                      <Calendar
                                        size={
                                          9
                                        }
                                      />

                                      Retorno:{" "}
                                      {formatDate(
                                        renovacao.data_proxima_retirada
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <p
                              className={`shrink-0 rounded-lg px-2 py-1 font-mono text-xs font-bold ${
                                semCusto
                                  ? "bg-emerald-400/10 text-emerald-400"
                                  : "bg-ice/10 text-ice"
                              }`}
                            >
                              {semCusto
                                ? "R$ 0,00"
                                : typeof renovacao.preco ===
                                    "number"
                                  ? `R$ ${renovacao.preco.toFixed(
                                      2
                                    )}`
                                  : "—"}
                            </p>
                          </div>
                        </motion.article>
                      );
                    }
                  )}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>

        {/* ====================================================
            QUICK DOSE
            ==================================================== */}

        <QuickDoseModal
          isOpen={
            isQuickDoseOpen
          }
          onClose={
            () =>
              setIsQuickDoseOpen(
                false
              )
          }
          preselectedMedicamentoId={
            id ||
            undefined
          }
          onSuccess={
            () => {
              trigger(
                "success"
              );

              setToastMessage({
                text:
                  "Dose registrada!",

                type:
                  "success",
              });

              setTimeout(
                () =>
                  setToastMessage(
                    null
                  ),
                2500
              );
            }
          }
        />

        {/* ====================================================
            INFO RECEITA
            ==================================================== */}

        <BottomSheet
          isOpen={
            infoModalOpen
          }
          onClose={
            () =>
              setInfoModalOpen(
                false
              )
          }
          title="Informações da Receita"
        >
          <div className="space-y-4 p-5 text-sm text-ink-muted">
            <div className="space-y-2 rounded-2xl border border-surface-border bg-surface p-4">
              <p className="text-base font-semibold text-ink-primary">
                Tipo cadastrado:{" "}
                {
                  tipoReceitaLabel
                }
              </p>

              {typeof validadeReceitaReferencia ===
              "number" ? (
                <p className="leading-relaxed">
                  Para este tipo de receita, o Vault usa como referência de organização um intervalo de{" "}
                  <b className="text-ink-primary">
                    {
                      validadeReceitaReferencia
                    }{" "}
                    dias
                  </b>
                  .
                </p>
              ) : (
                <p className="leading-relaxed">
                  Este tipo de receita não possui um intervalo padrão de validade configurado no Vault.
                </p>
              )}

              <p className="text-xs leading-relaxed text-ink-faint">
                Essa informação é usada pelo aplicativo apenas para organização e lembretes. Regras de validade e dispensação podem variar conforme medicamento, prescrição e regulamentação aplicável.
              </p>
            </div>

            <button
              type="button"
              onClick={
                () => {
                  setInfoModalOpen(
                    false
                  );

                  router.push(
                    `/saude/renovacao/nova?medicamento_id=${id}`
                  );
                }
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ice py-3.5 font-bold text-void shadow-lg shadow-ice/20 transition-transform active:scale-95"
            >
              <Calendar
                size={
                  18
                }
              />

              Registrar Nova Renovação
            </button>
          </div>
        </BottomSheet>

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
          title="Excluir medicamento"
          message={`Excluir permanentemente "${med.nome}"? As doses e renovações vinculadas serão removidas. Outros registros históricos relacionados serão preservados quando aplicável.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={
            isDeleting
          }
          type="danger"
        />

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
          aria-label="Excluir medicamento"
          className="fixed bottom-5 right-5 z-20 flex h-12 w-12 items-center justify-center rounded-2xl border border-coral/20 bg-coral/10 text-coral shadow-lg backdrop-blur-xl transition-all active:scale-95 sm:right-8"
        >
          <Trash2
            size={
              18
            }
          />
        </button>
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function DetalhesPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <MedicamentoDetalhesContent />
    </Suspense>
  );
}