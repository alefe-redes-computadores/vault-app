// app/saude/documentos/page.tsx
"use client";

import {
  useCallback,
  useEffect,
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
  ChevronDown,
  ChevronRight,
  FileHeart,
  FileQuestion,
  FileText,
  FlaskConical,
  FolderHeart,
  HeartPulse,
  Paperclip,
  Pill,
  Search,
  SlidersHorizontal,
  Stethoscope,
  Syringe,
  Tag,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  format,
  parseISO,
} from "date-fns";

import {
  ptBR,
} from "date-fns/locale";

import {
  useDocuments,
} from "@/hooks/useDocuments";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useTratamentos,
} from "@/hooks/useTratamentos";

import {
  useCids,
} from "@/hooks/useCids";

import {
  useConsultas,
} from "@/hooks/useConsultas";

import {
  useExames,
} from "@/hooks/useExames";

import {
  useCirurgias,
} from "@/hooks/useCirurgias";

import {
  useMedicos,
} from "@/hooks/useMedicos";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  useRegistrosSaude,
} from "@/hooks/useRegistrosSaude";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  isReceitaVencidaSegura,
} from "@/lib/health-insights";

import {
  getDaysUntil,
} from "@/lib/health-utils";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  Input,
} from "@/components/ui/Input";

import {
  BottomSheet,
} from "@/components/ui/BottomSheet";

import {
  ExportCardButton,
} from "@/components/ExportCardButton";

import {
  ScrollToTop,
} from "@/components/ScrollToTop";

import {
  MedicationFormatIcon,
} from "@/components/saude/MedicationFormatIcon";

import type {
  Cid,
  Cirurgia,
  Consulta,
  Document,
  Exame,
  Medicamento,
  RegistroSaude,
  Renovacao,
  Tratamento,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type ClinicalDomainId =
  | "medicamentos"
  | "consultas"
  | "exames"
  | "cirurgias"
  | "tratamentos"
  | "cids"
  | "registros"
  | "outros";

type PrescriptionStatus =
  | "valida"
  | "vencida"
  | "proxima"
  | "renovada";

interface PrescriptionAlert {
  status: PrescriptionStatus;
  label: string;
  color: string;
}

interface DocumentViewModel {
  document: Document;
  id: string;
  date: string | null;
  domainId: ClinicalDomainId;
  parentKey: string;
  parentName: string;
  parentDescription?: string;
  parentIcon: LucideIcon;
  parentColor: string;
  medication?: Medicamento;
  entityLabel?: string;
  alert: PrescriptionAlert | null;
}

interface ParentGroup {
  key: string;
  name: string;
  description?: string;
  icon: LucideIcon;
  color: string;
  medication?: Medicamento;
  documents: DocumentViewModel[];
}

interface DomainGroup {
  id: ClinicalDomainId;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  parents: ParentGroup[];
  count: number;
}

interface CardElementRef {
  current: HTMLDivElement | null;
}

// ============================================================
// DOMÍNIOS VISUAIS
// ============================================================

const DOMAIN_CONFIG: Record<
  ClinicalDomainId,
  {
    label: string;
    description: string;
    icon: LucideIcon;
    color: string;
  }
> = {
  medicamentos: {
    label: "Medicamentos",
    description:
      "Receitas, renovações e documentos associados aos medicamentos.",
    icon: Pill,
    color: "#F59E0B",
  },

  consultas: {
    label: "Consultas",
    description:
      "Documentos organizados pelos profissionais das consultas.",
    icon: Stethoscope,
    color: "#38BDF8",
  },

  exames: {
    label: "Exames",
    description:
      "Laudos, resultados e imagens vinculados aos exames.",
    icon: FlaskConical,
    color: "#10B981",
  },

  cirurgias: {
    label: "Cirurgias",
    description:
      "Relatórios e documentos cirúrgicos organizados pelos médicos.",
    icon: Syringe,
    color: "#EF4444",
  },

  tratamentos: {
    label: "Tratamentos",
    description:
      "Documentos relacionados ao acompanhamento dos tratamentos.",
    icon: FolderHeart,
    color: "#8B5CF6",
  },

  cids: {
    label: "Condições e CIDs",
    description:
      "Laudos e documentos ligados às condições registradas.",
    icon: Tag,
    color: "#14B8A6",
  },

  registros: {
    label: "Registros de Saúde",
    description:
      "Documentos vinculados a registros clínicos e acompanhamento diário.",
    icon: HeartPulse,
    color: "#EC4899",
  },

  outros: {
    label: "Outros Documentos",
    description:
      "Documentos clínicos gerais ou que ainda não possuem vínculo estruturado.",
    icon: FileQuestion,
    color: "#6B7280",
  },
};

const DOMAIN_ORDER: ClinicalDomainId[] = [
  "medicamentos",
  "consultas",
  "exames",
  "cirurgias",
  "tratamentos",
  "cids",
  "registros",
  "outros",
];

// ============================================================
// HELPERS
// ============================================================

function normalizeSearch(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase(
      "pt-BR"
    )
    .trim();
}

function getMetadataString(
  document: Document,
  ...keys: string[]
): string {
  for (
    const key of keys
  ) {
    const value =
      document.metadata?.[
        key
      ];

    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function getDocumentDate(
  document: Document
): string | null {
  const metadataDate =
    getMetadataString(
      document,
      "prescription_date",
      "date",
      "data_exame",
      "issue_date",
      "data",
      "created_date"
    );

  if (metadataDate) {
    return metadataDate;
  }

  return (
    document.created_at ||
    null
  );
}

function getSortableDate(
  document: Document
): number {
  const value =
    getDocumentDate(
      document
    );

  if (!value) {
    return 0;
  }

  const normalized =
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
      ? `${value}T12:00:00`
      : value;

  const timestamp =
    Date.parse(
      normalized
    );

  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;
}

function formatFullDate(
  dateString: string
): string {
  try {
    const clean =
      dateString.slice(
        0,
        10
      );

    return format(
      parseISO(
        clean
      ),
      "dd 'de' MMMM 'de' yyyy",
      {
        locale:
          ptBR,
      }
    );
  } catch {
    return dateString;
  }
}

function formatShortDate(
  dateString: string
): string {
  try {
    const clean =
      dateString.slice(
        0,
        10
      );

    return format(
      parseISO(
        clean
      ),
      "dd MMM yyyy",
      {
        locale:
          ptBR,
      }
    );
  } catch {
    return dateString;
  }
}

function getMonthKey(
  document: Document
): string | null {
  const date =
    getDocumentDate(
      document
    );

  if (
    !date ||
    !/^\d{4}-\d{2}/.test(
      date
    )
  ) {
    return null;
  }

  return date.slice(
    0,
    7
  );
}

function formatMonthLabel(
  monthKey: string
): string {
  if (
    monthKey ===
    "all"
  ) {
    return "Todos os meses";
  }

  try {
    const [
      year,
      month,
    ] =
      monthKey.split(
        "-"
      );

    const value =
      format(
        new Date(
          Number(
            year
          ),
          Number(
            month
          ) - 1,
          1
        ),
        "MMMM 'de' yyyy",
        {
          locale:
            ptBR,
        }
      );

    return (
      value
        .charAt(0)
        .toUpperCase() +
      value.slice(1)
    );
  } catch {
    return monthKey;
  }
}

function getDocumentTypeLabel(
  type: Document["type"]
): string {
  switch (type) {
    case "receita":
      return "Receita";

    case "prontuario":
      return "Prontuário";

    case "laudo":
      return "Laudo";

    case "encaminhamento":
      return "Encaminhamento";

    case "consulta":
      return "Consulta";

    case "cirurgia":
      return "Cirurgia";

    case "exame_sangue":
      return "Exame Laboratorial";

    case "exame_imagem":
      return "Exame de Imagem";

    default:
      return "Documento";
  }
}

/*
 * O ícone do medicamento pertence ao nível pai.
 *
 * Receitas e demais arquivos usam identidade documental no
 * nível filho para evitar a repetição visual do medicamento.
 */
function getDocumentIcon(
  type: Document["type"]
): LucideIcon {
  switch (type) {
    case "receita":
      return FileText;

    case "consulta":
      return Stethoscope;

    case "cirurgia":
      return Activity;

    case "exame_sangue":
    case "exame_imagem":
      return FlaskConical;

    case "prontuario":
      return FileHeart;

    default:
      return FileText;
  }
}

function getCompactMedicationDocumentLabel(
  item: DocumentViewModel
): string {
  if (
    item.document.entidade_tipo ===
    "renovacao"
  ) {
    return "Renovação";
  }

  return getDocumentTypeLabel(
    item.document.type
  );
}

function getMedicationColors(
  medicamento: Medicamento
): string[] {
  const colors =
    medicamento.cores
      ?.filter(
        (
          color
        ): color is string =>
          typeof color ===
            "string" &&
          color.trim().length >
            0
      )
      .map(
        (color) =>
          color.trim()
      )
      .slice(
        0,
        2
      ) || [];

  if (
    colors.length >
    0
  ) {
    return colors;
  }

  if (
    medicamento.cor_principal?.trim()
  ) {
    return [
      medicamento.cor_principal.trim(),
    ];
  }

  return [
    DOMAIN_CONFIG
      .medicamentos
      .color,
  ];
}

function getMedicationPrimaryColor(
  medicamento: Medicamento
): string {
  return (
    getMedicationColors(
      medicamento
    )[0] ||
    DOMAIN_CONFIG
      .medicamentos
      .color
  );
}

/*
 * Compatibilidade visual para receitas históricas que não
 * possuem entidade_tipo / entidade_id nem medicamento_id.
 *
 * Não altera o banco.
 *
 * O fallback só aceita o padrão explícito:
 *
 * Receita — Nome do Medicamento
 * Receita - Nome do Medicamento
 * Receita: Nome do Medicamento
 */
function extractLegacyPrescriptionMedicationName(
  document: Document
): string | null {
  if (
    document.type !==
    "receita"
  ) {
    return null;
  }

  if (
    document.entidade_tipo ||
    document.entidade_id
  ) {
    return null;
  }

  const title =
    document.title.trim();

  const match =
    title.match(
      /^receita\s*[-–—:]\s*(.+)$/i
    );

  const medicationName =
    match?.[1]?.trim();

  return (
    medicationName ||
    null
  );
}

function findUniqueLegacyPrescriptionMedication(
  document: Document,
  medicamentos: Medicamento[]
): Medicamento | null {
  const extractedName =
    extractLegacyPrescriptionMedicationName(
      document
    );

  if (!extractedName) {
    return null;
  }

  const normalizedName =
    normalizeSearch(
      extractedName
    );

  if (!normalizedName) {
    return null;
  }

  const matches =
    medicamentos.filter(
      (
        medicamento
      ) =>
        normalizeSearch(
          medicamento.nome
        ) ===
        normalizedName
    );

  return (
    matches.length === 1
      ? matches[0]
      : null
  );
}

function getPrescriptionMedicationId(
  document: Document
): string {
  if (
    document.entidade_tipo ===
      "medicamento" &&
    document.entidade_id
  ) {
    return document.entidade_id;
  }

  if (
    document.entidade_tipo
  ) {
    return "";
  }

  return getMetadataString(
    document,
    "medicamento_id",
    "medication_id"
  );
}

function getPrescriptionAlert(
  document: Document,
  renewalsByMedication: Map<
    string,
    Renovacao[]
  >,
  medicationIdOverride?: string
): PrescriptionAlert | null {
  if (
    document.type !==
    "receita"
  ) {
    return null;
  }

  const medicationId =
    medicationIdOverride ||
    getPrescriptionMedicationId(
      document
    );

  if (!medicationId) {
    return null;
  }

  const prescriptionDate =
    getDocumentDate(
      document
    );

  const renewals =
    renewalsByMedication.get(
      medicationId
    ) || [];

  if (
    prescriptionDate
  ) {
    const normalizedPrescriptionDate =
      prescriptionDate.slice(
        0,
        10
      );

    const renewed =
      renewals.some(
        (
          renewal
        ) =>
          Boolean(
            renewal.data &&
              renewal.data.slice(
                0,
                10
              ) >
                normalizedPrescriptionDate
          )
      );

    if (renewed) {
      return {
        status:
          "renovada",
        label:
          "Renovada",
        color:
          "#38BDF8",
      };
    }
  }

  const expirationDate =
    getMetadataString(
      document,
      "expiry_date",
      "expiration_date",
      "validade"
    );

  if (
    !expirationDate
  ) {
    return null;
  }

  if (
    isReceitaVencidaSegura(
      expirationDate
    )
  ) {
    return {
      status:
        "vencida",
      label:
        "Vencida",
      color:
        "#EF4444",
    };
  }

  const days =
    getDaysUntil(
      expirationDate
    );

  if (
    days !== null &&
    days >= 0 &&
    days <= 7
  ) {
    return {
      status:
        "proxima",
      label:
        "Próxima ao vencimento",
      color:
        "#F59E0B",
    };
  }

  return {
    status:
      "valida",
    label:
      "Válida",
    color:
      "#10B981",
  };
}

function getRegistroDescription(
  registro: RegistroSaude
): string | undefined {
  const parts = [
    registro.data
      ? formatFullDate(
          registro.data
        )
      : undefined,

    registro.horario
      ? registro.horario
      : undefined,
  ].filter(
    Boolean
  );

  return (
    parts.length >
    0
      ? parts.join(
          " · "
        )
      : undefined
  );
}

function matchesViewModelSearch(
  item: DocumentViewModel,
  normalizedQuery: string
): boolean {
  if (
    !normalizedQuery
  ) {
    return true;
  }

  const document =
    item.document;

  const metadataValues =
    Object.values(
      document.metadata ||
        {}
    )
      .filter(
        (
          value
        ): value is string =>
          typeof value ===
          "string"
      )
      .slice(
        0,
        20
      );

  const searchable =
    normalizeSearch(
      [
        document.title,
        document.description ||
          "",
        getDocumentTypeLabel(
          document.type
        ),
        item.parentName,
        item.parentDescription ||
          "",
        item.entityLabel ||
          "",
        ...metadataValues,
      ].join(
        " "
      )
    );

  return searchable.includes(
    normalizedQuery
  );
}

// ============================================================
// PAGE
// ============================================================

export default function DocumentsPage() {
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const documents =
    useDocuments();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    tratamentos = [],
  } =
    useTratamentos();

  const {
    cids = [],
  } =
    useCids();

  const {
    consultas = [],
  } =
    useConsultas();

  const {
    exames = [],
  } =
    useExames();

  const {
    cirurgias = [],
  } =
    useCirurgias();

  const {
    medicos = [],
  } =
    useMedicos();

  const {
    renovacoes = [],
  } =
    useRenovacoes();

  const {
    registros = [],
  } =
    useRegistrosSaude();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  const [
    selectedMonth,
    setSelectedMonth,
  ] =
    useState(
      format(
        new Date(),
        "yyyy-MM"
      )
    );

  const [
    showFilters,
    setShowFilters,
  ] =
    useState(
      false
    );

  const [
    expandedDomains,
    setExpandedDomains,
  ] =
    useState<
      Set<ClinicalDomainId>
    >(
      new Set()
    );

  const [
    expandedParents,
    setExpandedParents,
  ] =
    useState<
      Set<string>
    >(
      new Set()
    );

  // ==========================================================
  // EXPORT REFS
  // ==========================================================

  const exportCardRefs =
    useRef<
      Record<
        string,
        CardElementRef
      >
    >({});

  const getExportCardRef =
    useCallback(
      (
        id: string
      ): CardElementRef => {
        if (
          !exportCardRefs.current[
            id
          ]
        ) {
          exportCardRefs.current[
            id
          ] = {
            current:
              null,
          };
        }

        return exportCardRefs.current[
          id
        ];
      },
      []
    );

  // ==========================================================
  // STRICT PERSON SCOPE
  // ==========================================================

  const healthDocuments =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return documents.filter(
          (
            document
          ) =>
            document.person_id ===
              activePersonId &&
            document.category_id ===
              "saude"
        );
      },
      [
        documents,
        activePersonId,
      ]
    );

  const scopedMedicamentos =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return medicamentos.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        medicamentos,
        activePersonId,
      ]
    );

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
            item
          ) =>
            item.person_id ===
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
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        cids,
        activePersonId,
      ]
    );

  const scopedConsultas =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return consultas.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        consultas,
        activePersonId,
      ]
    );

  const scopedExames =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return exames.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        exames,
        activePersonId,
      ]
    );

  const scopedCirurgias =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return cirurgias.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        cirurgias,
        activePersonId,
      ]
    );

  const scopedRenovacoes =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return renovacoes.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        renovacoes,
        activePersonId,
      ]
    );

  const scopedRegistros =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return registros.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        registros,
        activePersonId,
      ]
    );

  // ==========================================================
  // DOMAIN MAPS
  // ==========================================================

  const medicationMap =
    useMemo(
      () =>
        new Map<
          string,
          Medicamento
        >(
          scopedMedicamentos
            .filter(
              (
                item
              ) =>
                Boolean(
                  item.id
                )
            )
            .map(
              (
                item
              ) => [
                item.id!,
                item,
              ]
            )
        ),
      [
        scopedMedicamentos,
      ]
    );

  const treatmentMap =
    useMemo(
      () =>
        new Map<
          string,
          Tratamento
        >(
          scopedTratamentos
            .filter(
              (
                item
              ) =>
                Boolean(
                  item.id
                )
            )
            .map(
              (
                item
              ) => [
                item.id!,
                item,
              ]
            )
        ),
      [
        scopedTratamentos,
      ]
    );

  const cidMap =
    useMemo(
      () =>
        new Map<
          string,
          Cid
        >(
          scopedCids
            .filter(
              (
                item
              ) =>
                Boolean(
                  item.id
                )
            )
            .map(
              (
                item
              ) => [
                item.id!,
                item,
              ]
            )
        ),
      [
        scopedCids,
      ]
    );

  const consultaMap =
    useMemo(
      () =>
        new Map<
          string,
          Consulta
        >(
          scopedConsultas
            .filter(
              (
                item
              ) =>
                Boolean(
                  item.id
                )
            )
            .map(
              (
                item
              ) => [
                item.id!,
                item,
              ]
            )
        ),
      [
        scopedConsultas,
      ]
    );

  const exameMap =
    useMemo(
      () =>
        new Map<
          string,
          Exame
        >(
          scopedExames
            .filter(
              (
                item
              ) =>
                Boolean(
                  item.id
                )
            )
            .map(
              (
                item
              ) => [
                item.id!,
                item,
              ]
            )
        ),
      [
        scopedExames,
      ]
    );

  const cirurgiaMap =
    useMemo(
      () =>
        new Map<
          string,
          Cirurgia
        >(
          scopedCirurgias
            .filter(
              (
                item
              ) =>
                Boolean(
                  item.id
                )
            )
            .map(
              (
                item
              ) => [
                item.id!,
                item,
              ]
            )
        ),
      [
        scopedCirurgias,
      ]
    );

  const renovacaoMap =
    useMemo(
      () =>
        new Map<
          string,
          Renovacao
        >(
          scopedRenovacoes
            .filter(
              (
                item
              ) =>
                Boolean(
                  item.id
                )
            )
            .map(
              (
                item
              ) => [
                item.id!,
                item,
              ]
            )
        ),
      [
        scopedRenovacoes,
      ]
    );

  const registroMap =
    useMemo(
      () =>
        new Map<
          string,
          RegistroSaude
        >(
          scopedRegistros
            .filter(
              (
                item
              ) =>
                Boolean(
                  item.id
                )
            )
            .map(
              (
                item
              ) => [
                item.id!,
                item,
              ]
            )
        ),
      [
        scopedRegistros,
      ]
    );

  const medicoMap =
    useMemo(
      () =>
        new Map(
          medicos
            .filter(
              (
                item
              ) =>
                Boolean(
                  item.id
                )
            )
            .map(
              (
                item
              ) => [
                item.id!,
                item,
              ]
            )
        ),
      [
        medicos,
      ]
    );

  // ==========================================================
  // REVERSE DOCUMENT RELATIONS
  // ==========================================================

  const medicationByDocumentId =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            Medicamento
          >();

        for (
          const medicamento of
          scopedMedicamentos
        ) {
          const documentId =
            medicamento.document_id?.trim();

          if (
            !documentId ||
            !medicamento.id
          ) {
            continue;
          }

          if (
            !map.has(
              documentId
            )
          ) {
            map.set(
              documentId,
              medicamento
            );
          }
        }

        return map;
      },
      [
        scopedMedicamentos,
      ]
    );

  const renewalsByDocumentId =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            Renovacao[]
          >();

        for (
          const renewal of
          scopedRenovacoes
        ) {
          const documentId =
            renewal.document_id?.trim();

          if (
            !documentId
          ) {
            continue;
          }

          const current =
            map.get(
              documentId
            ) || [];

          current.push(
            renewal
          );

          map.set(
            documentId,
            current
          );
        }

        for (
          const [
            documentId,
            list,
          ] of map
        ) {
          map.set(
            documentId,
            [
              ...list,
            ].sort(
              (
                a,
                b
              ) => {
                const dataCompare =
                  String(
                    b.data ||
                      ""
                  ).localeCompare(
                    String(
                      a.data ||
                        ""
                    )
                  );

                if (
                  dataCompare !==
                  0
                ) {
                  return dataCompare;
                }

                return String(
                  b.created_at ||
                    ""
                ).localeCompare(
                  String(
                    a.created_at ||
                      ""
                  )
                );
              }
            )
          );
        }

        return map;
      },
      [
        scopedRenovacoes,
      ]
    );

  // ==========================================================
  // RENEWAL HISTORY
  // ==========================================================

  const renewalsByMedication =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            Renovacao[]
          >();

        for (
          const renewal of
          scopedRenovacoes
        ) {
          if (
            !renewal.medicamento_id
          ) {
            continue;
          }

          const list =
            map.get(
              renewal.medicamento_id
            ) || [];

          list.push(
            renewal
          );

          map.set(
            renewal.medicamento_id,
            list
          );
        }

        return map;
      },
      [
        scopedRenovacoes,
      ]
    );

  // ==========================================================
  // AVAILABLE MONTHS
  // ==========================================================

  const availableMonths =
    useMemo(
      () => {
        const months =
          new Set<string>();

        for (
          const document of
          healthDocuments
        ) {
          const key =
            getMonthKey(
              document
            );

          if (key) {
            months.add(
              key
            );
          }
        }

        return Array.from(
          months
        ).sort(
          (
            a,
            b
          ) =>
            b.localeCompare(
              a
            )
        );
      },
      [
        healthDocuments,
      ]
    );

  // ==========================================================
  // PERIOD DOCUMENTS
  // ==========================================================

  const periodDocuments =
    useMemo(
      () =>
        healthDocuments
          .filter(
            (
              document
            ) => {
              if (
                selectedMonth ===
                "all"
              ) {
                return true;
              }

              return (
                getMonthKey(
                  document
                ) ===
                selectedMonth
              );
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              getSortableDate(
                b
              ) -
              getSortableDate(
                a
              )
          ),
      [
        healthDocuments,
        selectedMonth,
      ]
    );

  // ==========================================================
  // RESOLVE DOCUMENT INTO TREE
  // ==========================================================

  const resolvedViewModels =
    useMemo<
      DocumentViewModel[]
    >(
      () =>
        periodDocuments
          .filter(
            (
              document
            ) =>
              Boolean(
                document.id
              )
          )
          .map(
            (
              document
            ) => {
              const id =
                document.id!;

              const date =
                getDocumentDate(
                  document
                );

              // ==============================================
              // CANONICAL: MEDICAMENTO
              // ==============================================

              if (
                document.entidade_tipo ===
                  "medicamento" &&
                document.entidade_id
              ) {
                const medicamento =
                  medicationMap.get(
                    document.entidade_id
                  );

                if (
                  medicamento
                ) {
                  return {
                    document,
                    id,
                    date,

                    domainId:
                      "medicamentos",

                    parentKey:
                      `medicamento:${document.entidade_id}`,

                    parentName:
                      medicamento.nome,

                    parentDescription:
                      medicamento.dosagem ||
                      undefined,

                    parentIcon:
                      Pill,

                    parentColor:
                      getMedicationPrimaryColor(
                        medicamento
                      ),

                    medication:
                      medicamento,

                    entityLabel:
                      medicamento.dosagem
                        ? `${medicamento.nome} · ${medicamento.dosagem}`
                        : medicamento.nome,

                    alert:
                      getPrescriptionAlert(
                        document,
                        renewalsByMedication,
                        medicamento.id
                      ),
                  };
                }

                return {
                  document,
                  id,
                  date,

                  domainId:
                    "medicamentos",

                  parentKey:
                    `medicamento-ausente:${document.entidade_id}`,

                  parentName:
                    "Medicamento indisponível",

                  parentDescription:
                    "O documento mantém o vínculo, mas o medicamento não está disponível localmente.",

                  parentIcon:
                    Pill,

                  parentColor:
                    DOMAIN_CONFIG
                      .medicamentos
                      .color,

                  entityLabel:
                    document.title,

                  alert:
                    getPrescriptionAlert(
                      document,
                      renewalsByMedication,
                      document.entidade_id
                    ),
                };
              }

              // ==============================================
              // CANONICAL: RENOVAÇÃO
              // ==============================================

              if (
                document.entidade_tipo ===
                  "renovacao" &&
                document.entidade_id
              ) {
                const renovacao =
                  renovacaoMap.get(
                    document.entidade_id
                  );

                if (
                  renovacao
                ) {
                  const medicamento =
                    renovacao.medicamento_id
                      ? medicationMap.get(
                          renovacao.medicamento_id
                        )
                      : undefined;

                  if (
                    medicamento
                  ) {
                    return {
                      document,
                      id,
                      date,

                      domainId:
                        "medicamentos",

                      parentKey:
                        `medicamento:${medicamento.id}`,

                      parentName:
                        medicamento.nome,

                      parentDescription:
                        medicamento.dosagem ||
                        "Histórico de renovação",

                      parentIcon:
                        Pill,

                      parentColor:
                        getMedicationPrimaryColor(
                          medicamento
                        ),

                      medication:
                        medicamento,

                      entityLabel:
                        renovacao.data
                          ? `Renovação · ${formatShortDate(
                              renovacao.data
                            )}`
                          : "Renovação",

                      alert:
                        getPrescriptionAlert(
                          document,
                          renewalsByMedication,
                          renovacao.medicamento_id
                        ),
                    };
                  }

                  return {
                    document,
                    id,
                    date,

                    domainId:
                      "medicamentos",

                    parentKey:
                      renovacao.medicamento_id
                        ? `medicamento-ausente:${renovacao.medicamento_id}`
                        : `renovacao:${document.entidade_id}`,

                    parentName:
                      "Medicamento indisponível",

                    parentDescription:
                      renovacao.data
                        ? `Renovação registrada em ${formatFullDate(
                            renovacao.data
                          )}`
                        : "Documento vinculado a uma renovação",

                    parentIcon:
                      Pill,

                    parentColor:
                      DOMAIN_CONFIG
                        .medicamentos
                        .color,

                    entityLabel:
                      "Renovação",

                    alert:
                      renovacao.medicamento_id
                        ? getPrescriptionAlert(
                            document,
                            renewalsByMedication,
                            renovacao.medicamento_id
                          )
                        : null,
                  };
                }

                return {
                  document,
                  id,
                  date,

                  domainId:
                    "medicamentos",

                  parentKey:
                    `renovacao-ausente:${document.entidade_id}`,

                  parentName:
                    "Renovação indisponível",

                  parentDescription:
                    "O documento mantém o vínculo, mas a renovação não está disponível localmente.",

                  parentIcon:
                    Pill,

                  parentColor:
                    DOMAIN_CONFIG
                      .medicamentos
                      .color,

                  entityLabel:
                    document.title,

                  alert:
                    null,
                };
              }

              // ==============================================
              // CANONICAL: CIRURGIA
              // ==============================================

              if (
                document.entidade_tipo ===
                  "cirurgia" &&
                document.entidade_id
              ) {
                const cirurgia =
                  cirurgiaMap.get(
                    document.entidade_id
                  );

                if (
                  cirurgia
                ) {
                  const medico =
                    cirurgia.medico_id
                      ? medicoMap.get(
                          cirurgia.medico_id
                        )
                      : undefined;

                  return {
                    document,
                    id,
                    date,

                    domainId:
                      "cirurgias",

                    parentKey:
                      medico?.id
                        ? `cirurgia-medico:${medico.id}`
                        : "cirurgia-sem-medico",

                    parentName:
                      medico?.nome ||
                      "Sem médico vinculado",

                    parentDescription:
                      medico?.especialidade ||
                      "Documentos cirúrgicos",

                    parentIcon:
                      Stethoscope,

                    parentColor:
                      DOMAIN_CONFIG
                        .cirurgias
                        .color,

                    entityLabel:
                      cirurgia.procedimento,

                    alert:
                      null,
                  };
                }

                return {
                  document,
                  id,
                  date,

                  domainId:
                    "cirurgias",

                  parentKey:
                    `cirurgia-ausente:${document.entidade_id}`,

                  parentName:
                    "Cirurgia indisponível",

                  parentDescription:
                    "O vínculo clínico foi preservado, mas a cirurgia não está disponível localmente.",

                  parentIcon:
                    Syringe,

                  parentColor:
                    DOMAIN_CONFIG
                      .cirurgias
                      .color,

                  entityLabel:
                    document.title,

                  alert:
                    null,
                };
              }

              // ==============================================
              // CANONICAL: CONSULTA
              // ==============================================

              if (
                document.entidade_tipo ===
                  "consulta" &&
                document.entidade_id
              ) {
                const consulta =
                  consultaMap.get(
                    document.entidade_id
                  );

                if (
                  consulta
                ) {
                  const medico =
                    consulta.medico_id
                      ? medicoMap.get(
                          consulta.medico_id
                        )
                      : undefined;

                  const doctorName =
                    medico?.nome ||
                    consulta.medico ||
                    "Consulta";

                  return {
                    document,
                    id,
                    date,

                    domainId:
                      "consultas",

                    parentKey:
                      medico?.id
                        ? `consulta-medico:${medico.id}`
                        : `consulta-nome:${normalizeSearch(
                            doctorName
                          )}`,

                    parentName:
                      doctorName,

                    parentDescription:
                      consulta.especialidade ||
                      medico?.especialidade ||
                      undefined,

                    parentIcon:
                      Stethoscope,

                    parentColor:
                      DOMAIN_CONFIG
                        .consultas
                        .color,

                    entityLabel:
                      [
                        consulta.especialidade,
                        consulta.data
                          ? formatShortDate(
                              consulta.data
                            )
                          : undefined,
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " · "
                        ),

                    alert:
                      null,
                  };
                }

                return {
                  document,
                  id,
                  date,

                  domainId:
                    "consultas",

                  parentKey:
                    `consulta-ausente:${document.entidade_id}`,

                  parentName:
                    "Consulta indisponível",

                  parentDescription:
                    "O vínculo clínico foi preservado, mas a consulta não está disponível localmente.",

                  parentIcon:
                    Stethoscope,

                  parentColor:
                    DOMAIN_CONFIG
                      .consultas
                      .color,

                  entityLabel:
                    document.title,

                  alert:
                    null,
                };
              }

              // ==============================================
              // CANONICAL: EXAME
              // ==============================================

              if (
                document.entidade_tipo ===
                  "exame" &&
                document.entidade_id
              ) {
                const exame =
                  exameMap.get(
                    document.entidade_id
                  );

                if (
                  exame
                ) {
                  return {
                    document,
                    id,
                    date,

                    domainId:
                      "exames",

                    parentKey:
                      `exame:${exame.id}`,

                    parentName:
                      exame.nome,

                    parentDescription:
                      exame.data
                        ? formatFullDate(
                            exame.data
                          )
                        : undefined,

                    parentIcon:
                      FlaskConical,

                    parentColor:
                      DOMAIN_CONFIG
                        .exames
                        .color,

                    entityLabel:
                      exame.nome,

                    alert:
                      null,
                  };
                }

                return {
                  document,
                  id,
                  date,

                  domainId:
                    "exames",

                  parentKey:
                    `exame-ausente:${document.entidade_id}`,

                  parentName:
                    "Exame indisponível",

                  parentDescription:
                    "O vínculo clínico foi preservado, mas o exame não está disponível localmente.",

                  parentIcon:
                    FlaskConical,

                  parentColor:
                    DOMAIN_CONFIG
                      .exames
                      .color,

                  entityLabel:
                    document.title,

                  alert:
                    null,
                };
              }

              // ==============================================
              // CANONICAL: TRATAMENTO
              // ==============================================

              if (
                document.entidade_tipo ===
                  "tratamento" &&
                document.entidade_id
              ) {
                const tratamento =
                  treatmentMap.get(
                    document.entidade_id
                  );

                if (
                  tratamento
                ) {
                  return {
                    document,
                    id,
                    date,

                    domainId:
                      "tratamentos",

                    parentKey:
                      `tratamento:${tratamento.id}`,

                    parentName:
                      tratamento.nome,

                    parentDescription:
                      tratamento.condicao ||
                      tratamento.status,

                    parentIcon:
                      FolderHeart,

                    parentColor:
                      tratamento.cor ||
                      DOMAIN_CONFIG
                        .tratamentos
                        .color,

                    entityLabel:
                      tratamento.nome,

                    alert:
                      null,
                  };
                }

                return {
                  document,
                  id,
                  date,

                  domainId:
                    "tratamentos",

                  parentKey:
                    `tratamento-ausente:${document.entidade_id}`,

                  parentName:
                    "Tratamento indisponível",

                  parentDescription:
                    "O vínculo clínico foi preservado, mas o tratamento não está disponível localmente.",

                  parentIcon:
                    FolderHeart,

                  parentColor:
                    DOMAIN_CONFIG
                      .tratamentos
                      .color,

                  entityLabel:
                    document.title,

                  alert:
                    null,
                };
              }

              // ==============================================
              // CANONICAL: CID
              // ==============================================

              if (
                document.entidade_tipo ===
                  "cid" &&
                document.entidade_id
              ) {
                const cid =
                  cidMap.get(
                    document.entidade_id
                  );

                if (
                  cid
                ) {
                  return {
                    document,
                    id,
                    date,

                    domainId:
                      "cids",

                    parentKey:
                      `cid:${cid.id}`,

                    parentName:
                      `${cid.codigo} · ${cid.descricao}`,

                    parentDescription:
                      cid.data_diagnostico
                        ? `Registrado em ${formatFullDate(
                            cid.data_diagnostico
                          )}`
                        : undefined,

                    parentIcon:
                      Tag,

                    parentColor:
                      DOMAIN_CONFIG
                        .cids
                        .color,

                    entityLabel:
                      cid.codigo,

                    alert:
                      null,
                  };
                }

                return {
                  document,
                  id,
                  date,

                  domainId:
                    "cids",

                  parentKey:
                    `cid-ausente:${document.entidade_id}`,

                  parentName:
                    "CID indisponível",

                  parentDescription:
                    "O vínculo clínico foi preservado, mas a condição não está disponível localmente.",

                  parentIcon:
                    Tag,

                  parentColor:
                    DOMAIN_CONFIG
                      .cids
                      .color,

                  entityLabel:
                    document.title,

                  alert:
                    null,
                };
              }

              // ==============================================
              // CANONICAL: REGISTRO DE SAÚDE
              // ==============================================

              if (
                document.entidade_tipo ===
                  "registro_saude" &&
                document.entidade_id
              ) {
                const registro =
                  registroMap.get(
                    document.entidade_id
                  );

                if (
                  registro
                ) {
                  const registroNome =
                    String(
                      registro.nome ||
                        ""
                    ).trim() ||
                    "Registro de Saúde";

                  return {
                    document,
                    id,
                    date,

                    domainId:
                      "registros",

                    parentKey:
                      `registro:${document.entidade_id}`,

                    parentName:
                      registroNome,

                    parentDescription:
                      getRegistroDescription(
                        registro
                      ),

                    parentIcon:
                      HeartPulse,

                    parentColor:
                      DOMAIN_CONFIG
                        .registros
                        .color,

                    entityLabel:
                      registro.data
                        ? `${registroNome} · ${formatShortDate(
                            registro.data
                          )}`
                        : registroNome,

                    alert:
                      null,
                  };
                }

                return {
                  document,
                  id,
                  date,

                  domainId:
                    "registros",

                  parentKey:
                    `registro-ausente:${document.entidade_id}`,

                  parentName:
                    "Registro de Saúde indisponível",

                  parentDescription:
                    "O vínculo clínico foi preservado, mas o registro não está disponível localmente.",

                  parentIcon:
                    HeartPulse,

                  parentColor:
                    DOMAIN_CONFIG
                      .registros
                      .color,

                  entityLabel:
                    document.title,

                  alert:
                    null,
                };
              }

              // ==============================================
              // RELAÇÃO REVERSA: RENOVAÇÃO -> DOCUMENTO
              // ==============================================

              const linkedRenewals =
                renewalsByDocumentId.get(
                  id
                );

              const linkedRenewal =
                linkedRenewals?.find(
                  (
                    renewal
                  ) =>
                    Boolean(
                      renewal.medicamento_id
                    )
                );

              if (
                linkedRenewal?.medicamento_id
              ) {
                const medicamento =
                  medicationMap.get(
                    linkedRenewal.medicamento_id
                  );

                if (
                  medicamento
                ) {
                  return {
                    document,
                    id,
                    date,

                    domainId:
                      "medicamentos",

                    parentKey:
                      `medicamento:${medicamento.id}`,

                    parentName:
                      medicamento.nome,

                    parentDescription:
                      medicamento.dosagem ||
                      undefined,

                    parentIcon:
                      Pill,

                    parentColor:
                      getMedicationPrimaryColor(
                        medicamento
                      ),

                    medication:
                      medicamento,

                    entityLabel:
                      linkedRenewal.data
                        ? `${medicamento.nome} · ${formatShortDate(
                            linkedRenewal.data
                          )}`
                        : medicamento.nome,

                    alert:
                      getPrescriptionAlert(
                        document,
                        renewalsByMedication,
                        linkedRenewal.medicamento_id
                      ),
                  };
                }

                return {
                  document,
                  id,
                  date,

                  domainId:
                    "medicamentos",

                  parentKey:
                    `medicamento-ausente:${linkedRenewal.medicamento_id}`,

                  parentName:
                    "Medicamento indisponível",

                  parentDescription:
                    "A receita está vinculada pelo histórico de renovação, mas o medicamento não está disponível localmente.",

                  parentIcon:
                    Pill,

                  parentColor:
                    DOMAIN_CONFIG
                      .medicamentos
                      .color,

                  entityLabel:
                    document.title,

                  alert:
                    getPrescriptionAlert(
                      document,
                      renewalsByMedication,
                      linkedRenewal.medicamento_id
                    ),
                };
              }

              // ==============================================
              // RELAÇÃO REVERSA: MEDICAMENTO -> DOCUMENTO
              // ==============================================

              const currentMedication =
                medicationByDocumentId.get(
                  id
                );

              if (
                currentMedication?.id
              ) {
                return {
                  document,
                  id,
                  date,

                  domainId:
                    "medicamentos",

                  parentKey:
                    `medicamento:${currentMedication.id}`,

                  parentName:
                    currentMedication.nome,

                  parentDescription:
                    currentMedication.dosagem ||
                    undefined,

                  parentIcon:
                    Pill,

                  parentColor:
                    getMedicationPrimaryColor(
                      currentMedication
                    ),

                  medication:
                    currentMedication,

                  entityLabel:
                    currentMedication.dosagem
                      ? `${currentMedication.nome} · ${currentMedication.dosagem}`
                      : currentMedication.nome,

                  alert:
                    getPrescriptionAlert(
                      document,
                      renewalsByMedication,
                      currentMedication.id
                    ),
                };
              }

              // ==============================================
              // LEGADO SEGURO: RECEITA PELO NOME
              // ==============================================

              const legacyPrescriptionMedication =
                findUniqueLegacyPrescriptionMedication(
                  document,
                  scopedMedicamentos
                );

              if (
                legacyPrescriptionMedication?.id
              ) {
                return {
                  document,
                  id,
                  date,

                  domainId:
                    "medicamentos",

                  parentKey:
                    `medicamento:${legacyPrescriptionMedication.id}`,

                  parentName:
                    legacyPrescriptionMedication.nome,

                  parentDescription:
                    legacyPrescriptionMedication.dosagem ||
                    undefined,

                  parentIcon:
                    Pill,

                  parentColor:
                    getMedicationPrimaryColor(
                      legacyPrescriptionMedication
                    ),

                  medication:
                    legacyPrescriptionMedication,

                  entityLabel:
                    legacyPrescriptionMedication.dosagem
                      ? `${legacyPrescriptionMedication.nome} · ${legacyPrescriptionMedication.dosagem}`
                      : legacyPrescriptionMedication.nome,

                  alert:
                    getPrescriptionAlert(
                      document,
                      renewalsByMedication,
                      legacyPrescriptionMedication.id
                    ),
                };
              }

              // ==============================================
              // CANONICAL DESCONHECIDO / INCOMPLETO
              // ==============================================

              if (
                document.entidade_tipo ||
                document.entidade_id
              ) {
                return {
                  document,
                  id,
                  date,

                  domainId:
                    "outros",

                  parentKey:
                    `vinculo-incompleto:${
                      document.entidade_tipo ||
                      "sem-tipo"
                    }:${
                      document.entidade_id ||
                      "sem-id"
                    }`,

                  parentName:
                    "Vínculo clínico indisponível",

                  parentDescription:
                    "O documento possui uma referência clínica que não pôde ser interpretada.",

                  parentIcon:
                    FileQuestion,

                  parentColor:
                    DOMAIN_CONFIG
                      .outros
                      .color,

                  entityLabel:
                    document.title,

                  alert:
                    null,
                };
              }

              // ==============================================
              // LEGADO: MEDICAMENTO
              // ==============================================

              const legacyMedicationId =
                getMetadataString(
                  document,
                  "medicamento_id",
                  "medication_id"
                );

              if (
                legacyMedicationId
              ) {
                const medicamento =
                  medicationMap.get(
                    legacyMedicationId
                  );

                if (
                  medicamento
                ) {
                  return {
                    document,
                    id,
                    date,

                    domainId:
                      "medicamentos",

                    parentKey:
                      `medicamento:${legacyMedicationId}`,

                    parentName:
                      medicamento.nome,

                    parentDescription:
                      medicamento.dosagem ||
                      undefined,

                    parentIcon:
                      Pill,

                    parentColor:
                      getMedicationPrimaryColor(
                        medicamento
                      ),

                    medication:
                      medicamento,

                    entityLabel:
                      medicamento.dosagem
                        ? `${medicamento.nome} · ${medicamento.dosagem}`
                        : medicamento.nome,

                    alert:
                      getPrescriptionAlert(
                        document,
                        renewalsByMedication,
                        legacyMedicationId
                      ),
                  };
                }
              }

              // ==============================================
              // LEGADO: CIRURGIA
              // ==============================================

              if (
                document.type ===
                "cirurgia"
              ) {
                const medicoId =
                  document.medico_id ||
                  getMetadataString(
                    document,
                    "medico_id"
                  );

                const medico =
                  medicoId
                    ? medicoMap.get(
                        medicoId
                      )
                    : undefined;

                return {
                  document,
                  id,
                  date,

                  domainId:
                    "cirurgias",

                  parentKey:
                    medico?.id
                      ? `cirurgia-medico:${medico.id}`
                      : "cirurgia-legado",

                  parentName:
                    medico?.nome ||
                    "Cirurgias sem vínculo",

                  parentDescription:
                    medico?.especialidade ||
                    "Documento anterior à organização canônica",

                  parentIcon:
                    Stethoscope,

                  parentColor:
                    DOMAIN_CONFIG
                      .cirurgias
                      .color,

                  entityLabel:
                    getMetadataString(
                      document,
                      "procedure"
                    ) ||
                    document.title,

                  alert:
                    null,
                };
              }

              // ==============================================
              // LEGADO: CONSULTA
              // ==============================================

              if (
                document.type ===
                "consulta"
              ) {
                const medicoId =
                  document.medico_id ||
                  getMetadataString(
                    document,
                    "medico_id"
                  );

                const medico =
                  medicoId
                    ? medicoMap.get(
                        medicoId
                      )
                    : undefined;

                return {
                  document,
                  id,
                  date,

                  domainId:
                    "consultas",

                  parentKey:
                    medico?.id
                      ? `consulta-legado:${medico.id}`
                      : "consulta-legado-sem-medico",

                  parentName:
                    medico?.nome ||
                    "Consultas sem vínculo",

                  parentDescription:
                    medico?.especialidade ||
                    getMetadataString(
                      document,
                      "specialty"
                    ) ||
                    "Documento anterior à organização canônica",

                  parentIcon:
                    Stethoscope,

                  parentColor:
                    DOMAIN_CONFIG
                      .consultas
                      .color,

                  entityLabel:
                    document.title,

                  alert:
                    null,
                };
              }

              // ==============================================
              // LEGADO: EXAME
              // ==============================================

              if (
                document.type ===
                  "exame_sangue" ||
                document.type ===
                  "exame_imagem"
              ) {
                const legacyName =
                  getMetadataString(
                    document,
                    "tipo",
                    "exam_name",
                    "nome"
                  ) ||
                  document.title;

                return {
                  document,
                  id,
                  date,

                  domainId:
                    "exames",

                  parentKey:
                    `exame-legado:${normalizeSearch(
                      legacyName
                    )}`,

                  parentName:
                    legacyName,

                  parentDescription:
                    "Documento de exame sem vínculo estruturado",

                  parentIcon:
                    FlaskConical,

                  parentColor:
                    DOMAIN_CONFIG
                      .exames
                      .color,

                  entityLabel:
                    legacyName,

                  alert:
                    null,
                };
              }

              // ==============================================
              // OUTROS
              // ==============================================

              return {
                document,
                id,
                date,

                domainId:
                  "outros",

                parentKey:
                  `outros:${document.type}`,

                parentName:
                  getDocumentTypeLabel(
                    document.type
                  ),

                parentDescription:
                  "Documentos ainda sem vínculo clínico estruturado",

                parentIcon:
                  getDocumentIcon(
                    document.type
                  ),

                parentColor:
                  DOMAIN_CONFIG
                    .outros
                    .color,

                entityLabel:
                  undefined,

                alert:
                  getPrescriptionAlert(
                    document,
                    renewalsByMedication
                  ),
              };
            }
          ),
      [
        periodDocuments,
        medicationMap,
        treatmentMap,
        cidMap,
        consultaMap,
        exameMap,
        cirurgiaMap,
        renovacaoMap,
        registroMap,
        medicoMap,
        medicationByDocumentId,
        renewalsByDocumentId,
        renewalsByMedication,
        scopedMedicamentos,
      ]
    );

  // ==========================================================
  // SEARCH
  // ==========================================================

  const viewModels =
    useMemo(
      () => {
        const normalizedQuery =
          normalizeSearch(
            searchQuery
          );

        if (
          !normalizedQuery
        ) {
          return resolvedViewModels;
        }

        return resolvedViewModels.filter(
          (
            item
          ) =>
            matchesViewModelSearch(
              item,
              normalizedQuery
            )
        );
      },
      [
        resolvedViewModels,
        searchQuery,
      ]
    );

  // ==========================================================
  // BUILD TREE
  // ==========================================================

  const domainGroups =
    useMemo<
      DomainGroup[]
    >(
      () => {
        const domainMap =
          new Map<
            ClinicalDomainId,
            Map<
              string,
              ParentGroup
            >
          >();

        for (
          const item of
          viewModels
        ) {
          if (
            !domainMap.has(
              item.domainId
            )
          ) {
            domainMap.set(
              item.domainId,
              new Map()
            );
          }

          const parents =
            domainMap.get(
              item.domainId
            )!;

          if (
            !parents.has(
              item.parentKey
            )
          ) {
            parents.set(
              item.parentKey,
              {
                key:
                  item.parentKey,

                name:
                  item.parentName,

                description:
                  item.parentDescription,

                icon:
                  item.parentIcon,

                color:
                  item.parentColor,

                medication:
                  item.medication,

                documents:
                  [],
              }
            );
          }

          const parent =
            parents.get(
              item.parentKey
            )!;

          if (
            !parent.medication &&
            item.medication
          ) {
            parent.medication =
              item.medication;

            parent.color =
              item.parentColor;
          }

          parent.documents.push(
            item
          );
        }

        return DOMAIN_ORDER
          .map(
            (
              domainId
            ) => {
              const parentsMap =
                domainMap.get(
                  domainId
                );

              if (
                !parentsMap ||
                parentsMap.size ===
                  0
              ) {
                return null;
              }

              const config =
                DOMAIN_CONFIG[
                  domainId
                ];

              const parents =
                Array.from(
                  parentsMap.values()
                )
                  .map(
                    (
                      parent
                    ) => ({
                      ...parent,

                      documents:
                        [
                          ...parent.documents,
                        ].sort(
                          (
                            a,
                            b
                          ) =>
                            getSortableDate(
                              b.document
                            ) -
                            getSortableDate(
                              a.document
                            )
                        ),
                    })
                  )
                  .sort(
                    (
                      a,
                      b
                    ) => {
                      const latestA =
                        a.documents[
                          0
                        ];

                      const latestB =
                        b.documents[
                          0
                        ];

                      return (
                        getSortableDate(
                          latestB.document
                        ) -
                        getSortableDate(
                          latestA.document
                        )
                      );
                    }
                  );

              return {
                id:
                  domainId,

                label:
                  config.label,

                description:
                  config.description,

                icon:
                  config.icon,

                color:
                  config.color,

                parents,

                count:
                  parents.reduce(
                    (
                      total,
                      parent
                    ) =>
                      total +
                      parent.documents.length,
                    0
                  ),
              };
            }
          )
          .filter(
            (
              group
            ): group is DomainGroup =>
              Boolean(
                group
              )
          );
      },
      [
        viewModels,
      ]
    );

  // ==========================================================
  // EXPANSION RECONCILIATION
  // ==========================================================

  useEffect(
    () => {
      const validDomainIds =
        new Set(
          domainGroups.map(
            (
              group
            ) =>
              group.id
          )
        );

      setExpandedDomains(
        (
          previous
        ) => {
          const next =
            new Set<
              ClinicalDomainId
            >();

          for (
            const id of
            previous
          ) {
            if (
              validDomainIds.has(
                id
              )
            ) {
              next.add(
                id
              );
            }
          }

          if (
            next.size ===
            0
          ) {
            domainGroups.forEach(
              (
                group
              ) =>
                next.add(
                  group.id
                )
            );
          }

          return next;
        }
      );
    },
    [
      domainGroups,
    ]
  );

  useEffect(
    () => {
      const validParentKeys =
        new Set(
          domainGroups.flatMap(
            (
              domain
            ) =>
              domain.parents.map(
                (
                  parent
                ) =>
                  parent.key
              )
          )
        );

      setExpandedParents(
        (
          previous
        ) => {
          const next =
            new Set<string>();

          for (
            const key of
            previous
          ) {
            if (
              validParentKeys.has(
                key
              )
            ) {
              next.add(
                key
              );
            }
          }

          if (
            next.size ===
            0
          ) {
            domainGroups.forEach(
              (
                domain
              ) => {
                const firstExpandable =
                  domain.parents.find(
                    (
                      parent
                    ) =>
                      !(
                        domain.id ===
                          "medicamentos" &&
                        parent.medication &&
                        parent.documents.length ===
                          1
                      )
                  );

                if (
                  firstExpandable
                ) {
                  next.add(
                    firstExpandable.key
                  );
                }
              }
            );
          }

          return next;
        }
      );
    },
    [
      domainGroups,
    ]
  );

  // ==========================================================
  // ACTIONS
  // ==========================================================

  const toggleDomain =
    useCallback(
      (
        id: ClinicalDomainId
      ) => {
        trigger(
          "vibrate"
        );

        setExpandedDomains(
          (
            previous
          ) => {
            const next =
              new Set(
                previous
              );

            if (
              next.has(
                id
              )
            ) {
              next.delete(
                id
              );
            } else {
              next.add(
                id
              );
            }

            return next;
          }
        );
      },
      [
        trigger,
      ]
    );

  const toggleParent =
    useCallback(
      (
        key: string
      ) => {
        trigger(
          "vibrate"
        );

        setExpandedParents(
          (
            previous
          ) => {
            const next =
              new Set(
                previous
              );

            if (
              next.has(
                key
              )
            ) {
              next.delete(
                key
              );
            } else {
              next.add(
                key
              );
            }

            return next;
          }
        );
      },
      [
        trigger,
      ]
    );

  const openDocument =
    useCallback(
      (
        id: string
      ) => {
        trigger(
          "vibrate"
        );

        router.push(
          `/saude/documentos/detalhes?id=${id}`
        );
      },
      [
        router,
        trigger,
      ]
    );

  // ==========================================================
  // EXPORT
  // ==========================================================

  const exportCards =
    useMemo(
      () =>
        viewModels.map(
          (
            item
          ) => ({
            ref:
              getExportCardRef(
                item.id
              ),

            id:
              item.id,
          })
        ),
      [
        viewModels,
        getExportCardRef,
      ]
    );

  // ==========================================================
  // DERIVED UI
  // ==========================================================

  const selectedMonthLabel =
    useMemo(
      () =>
        formatMonthLabel(
          selectedMonth
        ),
      [
        selectedMonth,
      ]
    );

  const hasActiveFilters =
    Boolean(
      searchQuery.trim()
    ) ||
    selectedMonth !==
      "all";

  const totalParents =
    useMemo(
      () =>
        domainGroups.reduce(
          (
            total,
            group
          ) =>
            total +
            group.parents.length,
          0
        ),
      [
        domainGroups,
      ]
    );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        {/* ====================================================
            EXPORT SURFACE
            ==================================================== */}

        {viewModels.length >
          0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed -left-[10000px] top-0 w-[720px]"
          >
            <div className="space-y-6 bg-void p-6">
              {viewModels.map(
                (
                  item
                ) => {
                  const exportRef =
                    getExportCardRef(
                      item.id
                    );

                  return (
                    <ExportDocumentCard
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      cardRef={
                        exportRef
                      }
                      selectedMonthLabel={
                        selectedMonthLabel
                      }
                    />
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-30 border-b border-surface-border/40 bg-void/90 px-5 pb-4 pt-4 header-safe-top backdrop-blur-xl">
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
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
                  <FileHeart
                    size={
                      14
                    }
                    className="text-emerald-400"
                  />

                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400">
                    Acervo Clínico
                  </p>
                </div>

                <h1 className="truncate font-display text-lg font-semibold text-ink-primary">
                  Documentos de Saúde
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {viewModels.length >
                0 && (
                <ExportCardButton
                  cards={
                    exportCards
                  }
                  title="Acervo Clínico"
                  variant="secondary"
                  size="sm"
                  label="Exportar"
                />
              )}

              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setShowFilters(
                      true
                    );
                  }
                }
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all active:scale-95 ${
                  hasActiveFilters
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
                aria-label="Filtrar documentos"
              >
                <SlidersHorizontal
                  size={
                    16
                  }
                />
              </button>
            </div>
          </div>

          <div className="relative mt-4">
            <Search
              size={
                15
              }
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />

            <Input
              placeholder="Buscar documento, medicamento, médico, exame..."
              value={
                searchQuery
              }
              onChange={
                (
                  event
                ) =>
                  setSearchQuery(
                    event.target.value
                  )
              }
              className="border-surface-border/50 bg-surface-raised pl-9 text-sm"
            />
          </div>
        </header>

        {/* ====================================================
            CONTENT
            ==================================================== */}

        <section className="px-5 pt-4">
          {!activePersonId ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
                <AlertTriangle
                  size={
                    24
                  }
                />
              </div>

              <h2 className="mt-4 font-display text-base font-semibold text-ink-primary">
                Selecione uma pessoa
              </h2>

              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                O Acervo Clínico sempre pertence à pessoa ativa e nunca mistura documentos entre perfis.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3 rounded-[22px] border border-surface-border/40 bg-surface px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                    <Calendar
                      size={
                        16
                      }
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
                      Período
                    </p>

                    <p className="truncate text-xs font-semibold text-ink-primary">
                      {
                        selectedMonthLabel
                      }
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-display text-lg font-bold text-ink-primary">
                    {
                      viewModels.length
                    }
                  </p>

                  <p className="text-[9px] text-ink-faint">
                    documento
                    {viewModels.length ===
                    1
                      ? ""
                      : "s"}
                  </p>
                </div>
              </div>

              {domainGroups.length ===
              0 ? (
                <motion.div
                  initial={{
                    opacity:
                      0,
                    y:
                      10,
                  }}
                  animate={{
                    opacity:
                      1,
                    y:
                      0,
                  }}
                  className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-12 text-center shadow-sm"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/5 text-emerald-400">
                    <FileHeart
                      size={
                        25
                      }
                    />
                  </div>

                  <h3 className="mt-4 font-display text-base font-semibold text-ink-primary">
                    {searchQuery.trim()
                      ? "Nenhum documento encontrado"
                      : "Nenhum documento neste período"}
                  </h3>

                  <p className="mt-2 max-w-xs text-xs leading-5 text-ink-muted">
                    {searchQuery.trim()
                      ? "Não encontramos documentos compatíveis com a busca dentro do período selecionado."
                      : selectedMonth !==
                          "all"
                        ? "O mês selecionado ainda não possui documentos clínicos. Consulte outro período ou use o menu inferior para adicionar um documento."
                        : "O Acervo Clínico desta pessoa ainda está vazio. Use o menu inferior para adicionar um documento."}
                  </p>

                  {(searchQuery.trim() ||
                    selectedMonth !==
                      "all") && (
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      {searchQuery.trim() && (
                        <button
                          type="button"
                          onClick={
                            () => {
                              trigger(
                                "vibrate"
                              );

                              setSearchQuery(
                                ""
                              );
                            }
                          }
                          className="rounded-full border border-surface-border/50 bg-surface-raised px-4 py-2 text-xs font-semibold text-ink-primary active:scale-95"
                        >
                          Limpar busca
                        </button>
                      )}

                      {selectedMonth !==
                        "all" && (
                        <button
                          type="button"
                          onClick={
                            () => {
                              trigger(
                                "vibrate"
                              );

                              setSelectedMonth(
                                "all"
                              );
                            }
                          }
                          className="rounded-full border border-surface-border/50 bg-surface-raised px-4 py-2 text-xs font-semibold text-ink-primary active:scale-95"
                        >
                          Todos os meses
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <LayersSummary
                      domains={
                        domainGroups.length
                      }
                      parents={
                        totalParents
                      }
                      documents={
                        viewModels.length
                      }
                    />
                  </div>

                  {domainGroups.map(
                    (
                      domain,
                      domainIndex
                    ) => {
                      const DomainIcon =
                        domain.icon;

                      const isDomainExpanded =
                        expandedDomains.has(
                          domain.id
                        );

                      return (
                        <motion.div
                          key={
                            domain.id
                          }
                          initial={{
                            opacity:
                              0,
                            y:
                              10,
                          }}
                          animate={{
                            opacity:
                              1,
                            y:
                              0,
                          }}
                          transition={{
                            delay:
                              domainIndex *
                              0.025,
                          }}
                          className="overflow-hidden rounded-[26px] border border-surface-border/50 bg-surface shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={
                              () =>
                                toggleDomain(
                                  domain.id
                                )
                            }
                            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-raised/40"
                            aria-expanded={
                              isDomainExpanded
                            }
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]"
                                style={{
                                  backgroundColor:
                                    `${domain.color}15`,
                                  color:
                                    domain.color,
                                }}
                              >
                                <DomainIcon
                                  size={
                                    18
                                  }
                                />
                              </div>

                              <div className="flex min-w-0 items-center gap-2">
                                <h2 className="truncate font-display text-sm font-semibold text-ink-primary">
                                  {
                                    domain.label
                                  }
                                </h2>

                                <span className="shrink-0 rounded-full border border-surface-border/40 bg-surface-raised px-2 py-0.5 font-mono text-[9px] text-ink-muted">
                                  {
                                    domain.count
                                  }
                                </span>
                              </div>
                            </div>

                            <ChevronDown
                              size={
                                17
                              }
                              className={`shrink-0 text-ink-muted transition-transform ${
                                isDomainExpanded
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                          </button>

                          <AnimatePresence
                            initial={
                              false
                            }
                          >
                            {isDomainExpanded && (
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
                                <div className="border-t border-surface-border/30">
                                  {domain.parents.map(
                                    (
                                      parent,
                                      parentIndex
                                    ) => {
                                      const ParentIcon =
                                        parent.icon;

                                      const isParentExpanded =
                                        expandedParents.has(
                                          parent.key
                                        );

                                      const isMedicationParent =
                                        domain.id ===
                                          "medicamentos" &&
                                        Boolean(
                                          parent.medication
                                        );

                                      const hasSingleMedicationDocument =
                                        isMedicationParent &&
                                        parent.documents.length ===
                                          1;

                                      const singleMedicationDocument =
                                        hasSingleMedicationDocument
                                          ? parent.documents[
                                              0
                                            ]
                                          : undefined;

                                      return (
                                        <div
                                          key={
                                            parent.key
                                          }
                                          className={
                                            parentIndex >
                                            0
                                              ? "border-t border-surface-border/25"
                                              : ""
                                          }
                                        >
                                          <button
                                            type="button"
                                            onClick={
                                              () => {
                                                if (
                                                  singleMedicationDocument
                                                ) {
                                                  openDocument(
                                                    singleMedicationDocument.id
                                                  );

                                                  return;
                                                }

                                                toggleParent(
                                                  parent.key
                                                );
                                              }
                                            }
                                            className="flex min-h-[66px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-raised/45 active:bg-surface-raised/60"
                                            aria-expanded={
                                              hasSingleMedicationDocument
                                                ? undefined
                                                : isParentExpanded
                                            }
                                          >
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                              <div
                                                className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] border"
                                                style={{
                                                  backgroundColor:
                                                    `${parent.color}10`,
                                                  borderColor:
                                                    `${parent.color}28`,
                                                }}
                                              >
                                                {parent.medication ? (
                                                  <MedicationFormatIcon
                                                    formato={
                                                      parent.medication.formato
                                                    }
                                                    cores={
                                                      getMedicationColors(
                                                        parent.medication
                                                      )
                                                    }
                                                    size={
                                                      21
                                                    }
                                                  />
                                                ) : (
                                                  <ParentIcon
                                                    size={
                                                      16
                                                    }
                                                    style={{
                                                      color:
                                                        parent.color,
                                                    }}
                                                  />
                                                )}
                                              </div>

                                              <div className="min-w-0 flex-1">
                                                <div className="flex min-w-0 items-center gap-2">
                                                  <p className="truncate text-[13px] font-semibold text-ink-primary">
                                                    {
                                                      parent.name
                                                    }
                                                  </p>

                                                  {parent.documents.length >
                                                    1 && (
                                                    <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[8px] text-ink-faint">
                                                      {
                                                        parent.documents.length
                                                      }{" "}
                                                      docs
                                                    </span>
                                                  )}
                                                </div>

                                                {singleMedicationDocument ? (
                                                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-ink-muted">
                                                    {parent.description && (
                                                      <>
                                                        <span className="max-w-[120px] truncate">
                                                          {
                                                            parent.description
                                                          }
                                                        </span>

                                                        <span className="text-ink-faint">
                                                          ·
                                                        </span>
                                                      </>
                                                    )}

                                                    <span>
                                                      {getDocumentTypeLabel(
                                                        singleMedicationDocument.document.type
                                                      )}
                                                    </span>

                                                    {singleMedicationDocument.date && (
                                                      <>
                                                        <span className="text-ink-faint">
                                                          ·
                                                        </span>

                                                        <span className="font-mono">
                                                          {formatShortDate(
                                                            singleMedicationDocument.date
                                                          )}
                                                        </span>
                                                      </>
                                                    )}

                                                    {(singleMedicationDocument
                                                      .document
                                                      .attachments
                                                      ?.length ||
                                                      0) >
                                                      0 && (
                                                      <>
                                                        <span className="text-ink-faint">
                                                          ·
                                                        </span>

                                                        <span className="flex items-center gap-1 text-ice">
                                                          <Paperclip
                                                            size={
                                                              9
                                                            }
                                                          />

                                                          {
                                                            singleMedicationDocument
                                                              .document
                                                              .attachments
                                                              .length
                                                          }
                                                        </span>
                                                      </>
                                                    )}

                                                    {singleMedicationDocument.alert && (
                                                      <span
                                                        className="ml-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-semibold"
                                                        style={{
                                                          backgroundColor:
                                                            `${singleMedicationDocument.alert.color}15`,
                                                          color:
                                                            singleMedicationDocument.alert.color,
                                                        }}
                                                      >
                                                        {
                                                          singleMedicationDocument
                                                            .alert
                                                            .label
                                                        }
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <div className="mt-0.5 flex min-w-0 items-center gap-2">
                                                    {parent.description ? (
                                                      <p className="truncate text-[10px] text-ink-muted">
                                                        {
                                                          parent.description
                                                        }
                                                      </p>
                                                    ) : (
                                                      <p className="text-[10px] text-ink-faint">
                                                        {
                                                          parent.documents.length
                                                        }{" "}
                                                        documento
                                                        {parent.documents.length ===
                                                        1
                                                          ? ""
                                                          : "s"}
                                                      </p>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            <ChevronRight
                                              size={
                                                15
                                              }
                                              className={`shrink-0 text-ink-faint transition-all ${
                                                !hasSingleMedicationDocument &&
                                                isParentExpanded
                                                  ? "rotate-90 text-ink-muted"
                                                  : ""
                                              }`}
                                            />
                                          </button>

                                          <AnimatePresence
                                            initial={
                                              false
                                            }
                                          >
                                            {isParentExpanded &&
                                              !hasSingleMedicationDocument && (
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
                                                  {/*
                                                   * Histórico compacto.
                                                   *
                                                   * Não criamos novos cards dentro
                                                   * do grupo pai. Cada documento é
                                                   * apenas uma linha navegável.
                                                   */}
                                                  <div className="border-t border-surface-border/20 bg-void/15 px-4">
                                                    {parent.documents.map(
                                                      (
                                                        item,
                                                        itemIndex
                                                      ) => {
                                                        const DocumentIcon =
                                                          getDocumentIcon(
                                                            item.document.type
                                                          );

                                                        const attachmentCount =
                                                          item.document
                                                            .attachments
                                                            ?.length ||
                                                          0;

                                                        const primaryLabel =
                                                          isMedicationParent
                                                            ? getCompactMedicationDocumentLabel(
                                                                item
                                                              )
                                                            : item.document.title;

                                                        return (
                                                          <button
                                                            key={
                                                              item.id
                                                            }
                                                            type="button"
                                                            onClick={
                                                              () =>
                                                                openDocument(
                                                                  item.id
                                                                )
                                                            }
                                                            className={`group flex min-h-[58px] w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-surface-raised/20 active:bg-surface-raised/35 ${
                                                              itemIndex >
                                                              0
                                                                ? "border-t border-surface-border/20"
                                                                : ""
                                                            }`}
                                                          >
                                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-surface-border/30 bg-surface-raised/45 text-emerald-400">
                                                                <DocumentIcon
                                                                  size={
                                                                    14
                                                                  }
                                                                />
                                                              </div>

                                                              <div className="min-w-0 flex-1">
                                                                <div className="flex min-w-0 items-center gap-2">
                                                                  {isMedicationParent && (
                                                                    <span
                                                                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                                                                      style={{
                                                                        backgroundColor:
                                                                          parent.color,
                                                                      }}
                                                                    />
                                                                  )}

                                                                  <p className="truncate text-[11px] font-semibold text-ink-primary">
                                                                    {
                                                                      primaryLabel
                                                                    }
                                                                  </p>

                                                                  {item.alert && (
                                                                    <span
                                                                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold"
                                                                      style={{
                                                                        backgroundColor:
                                                                          `${item.alert.color}16`,
                                                                        color:
                                                                          item.alert.color,
                                                                      }}
                                                                    >
                                                                      {
                                                                        item.alert.label
                                                                      }
                                                                    </span>
                                                                  )}
                                                                </div>

                                                                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] text-ink-muted">
                                                                  {!isMedicationParent && (
                                                                    <span>
                                                                      {getDocumentTypeLabel(
                                                                        item.document.type
                                                                      )}
                                                                    </span>
                                                                  )}

                                                                  {!isMedicationParent &&
                                                                    item.entityLabel &&
                                                                    (
                                                                      item.domainId ===
                                                                        "cirurgias" ||
                                                                      item.domainId ===
                                                                        "consultas" ||
                                                                      item.domainId ===
                                                                        "registros" ||
                                                                      item.document.entidade_tipo ===
                                                                        "renovacao"
                                                                    ) && (
                                                                      <>
                                                                        <span className="text-ink-faint">
                                                                          ·
                                                                        </span>

                                                                        <span className="max-w-[140px] truncate text-ink-primary">
                                                                          {
                                                                            item.entityLabel
                                                                          }
                                                                        </span>
                                                                      </>
                                                                    )}

                                                                  {item.date && (
                                                                    <span className="font-mono">
                                                                      {formatShortDate(
                                                                        item.date
                                                                      )}
                                                                    </span>
                                                                  )}

                                                                  {attachmentCount >
                                                                    0 && (
                                                                    <>
                                                                      {item.date && (
                                                                        <span className="text-ink-faint">
                                                                          ·
                                                                        </span>
                                                                      )}

                                                                      <span className="flex items-center gap-1 text-ice">
                                                                        <Paperclip
                                                                          size={
                                                                            9
                                                                          }
                                                                        />

                                                                        {
                                                                          attachmentCount
                                                                        }
                                                                      </span>
                                                                    </>
                                                                  )}
                                                                </div>
                                                              </div>
                                                            </div>

                                                            <ChevronRight
                                                              size={
                                                                13
                                                              }
                                                              className="shrink-0 text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:text-emerald-400"
                                                            />
                                                          </button>
                                                        );
                                                      }
                                                    )}
                                                  </div>
                                                </motion.div>
                                              )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    }
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* ====================================================
            FILTERS
            ==================================================== */}

        <BottomSheet
          isOpen={
            showFilters
          }
          onClose={
            () =>
              setShowFilters(
                false
              )
          }
          title="Período do Acervo"
        >
          <div className="space-y-4 px-1 pb-4">
            <div>
              <p className="text-sm font-semibold text-ink-primary">
                Mês
              </p>

              <p className="mt-1 text-xs leading-5 text-ink-muted">
                O Acervo Clínico começa pelo mês atual para facilitar a visualização dos documentos mais recentes.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setSelectedMonth(
                      "all"
                    );

                    setShowFilters(
                      false
                    );
                  }
                }
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                  selectedMonth ===
                  "all"
                    ? "border-emerald-400/40 bg-emerald-400/10"
                    : "border-surface-border/50 bg-surface"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-ink-primary">
                    Todos os meses
                  </p>

                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    Exibir todo o histórico clínico
                  </p>
                </div>

                {selectedMonth ===
                  "all" && (
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                )}
              </button>

              {availableMonths.map(
                (
                  month
                ) => {
                  const active =
                    selectedMonth ===
                    month;

                  return (
                    <button
                      key={
                        month
                      }
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setSelectedMonth(
                            month
                          );

                          setShowFilters(
                            false
                          );
                        }
                      }
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                        active
                          ? "border-emerald-400/40 bg-emerald-400/10"
                          : "border-surface-border/50 bg-surface"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar
                          size={
                            15
                          }
                          className={
                            active
                              ? "text-emerald-400"
                              : "text-ink-muted"
                          }
                        />

                        <p className="text-sm font-medium text-ink-primary">
                          {formatMonthLabel(
                            month
                          )}
                        </p>
                      </div>

                      {active && (
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </BottomSheet>

        <ScrollToTop
          threshold={
            400
          }
        />
      </main>
    </PageTransition>
  );
}

// ============================================================
// EXPORT CARD
// ============================================================

interface ExportDocumentCardProps {
  item: DocumentViewModel;
  cardRef: CardElementRef;
  selectedMonthLabel: string;
}

function ExportDocumentCard({
  item,
  cardRef,
  selectedMonthLabel,
}: ExportDocumentCardProps) {
  const DocumentIcon =
    getDocumentIcon(
      item.document.type
    );

  const DomainIcon =
    DOMAIN_CONFIG[
      item.domainId
    ].icon;

  const attachmentCount =
    item.document
      .attachments
      ?.length ||
    0;

  return (
    <div
      ref={
        (
          element
        ) => {
          cardRef.current =
            element;
        }
      }
      className="w-[672px] overflow-hidden rounded-[28px] border border-surface-border/50 bg-surface p-6 text-ink-primary"
    >
      <div className="flex items-start justify-between gap-4 border-b border-surface-border/40 pb-5">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
            <DocumentIcon
              size={
                24
              }
            />
          </div>

          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400">
              Acervo Clínico
            </p>

            <h2 className="mt-1 break-words font-display text-xl font-semibold leading-tight text-ink-primary">
              {
                item.document.title
              }
            </h2>

            <p className="mt-2 text-xs text-ink-muted">
              {getDocumentTypeLabel(
                item.document.type
              )}
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1.5 text-[10px] font-medium text-ink-muted">
          {
            selectedMonthLabel
          }
        </div>
      </div>

      <div className="mt-5 rounded-[20px] border border-surface-border/40 bg-surface-raised/60 p-4">
        <div className="flex items-start gap-3">
          <div
            className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border"
            style={{
              backgroundColor:
                `${item.parentColor}12`,
              borderColor:
                `${item.parentColor}28`,
            }}
          >
            {item.medication ? (
              <MedicationFormatIcon
                formato={
                  item.medication.formato
                }
                cores={
                  getMedicationColors(
                    item.medication
                  )
                }
                size={
                  19
                }
              />
            ) : (
              <DomainIcon
                size={
                  17
                }
                style={{
                  color:
                    item.parentColor,
                }}
              />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-faint">
              {
                DOMAIN_CONFIG[
                  item.domainId
                ].label
              }
            </p>

            <p className="mt-1 break-words text-sm font-semibold text-ink-primary">
              {
                item.parentName
              }
            </p>

            {item.parentDescription && (
              <p className="mt-1 break-words text-xs leading-5 text-ink-muted">
                {
                  item.parentDescription
                }
              </p>
            )}

            {item.entityLabel &&
              item.entityLabel !==
                item.parentName && (
                <p className="mt-2 break-words text-xs font-medium text-ice">
                  {
                    item.entityLabel
                  }
                </p>
              )}
          </div>
        </div>
      </div>

      {item.document.description && (
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-faint">
            Observações
          </p>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink-muted">
            {
              item.document.description
            }
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-surface-border/40 pt-4">
        {item.date && (
          <span className="flex items-center gap-1.5 rounded-full border border-surface-border/40 bg-surface-raised px-3 py-1.5 text-[10px] text-ink-muted">
            <Calendar
              size={
                11
              }
            />

            {formatShortDate(
              item.date
            )}
          </span>
        )}

        {attachmentCount >
          0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-ice/20 bg-ice/8 px-3 py-1.5 text-[10px] text-ice">
            <Paperclip
              size={
                11
              }
            />

            {
              attachmentCount
            }{" "}
            anexo
            {attachmentCount ===
            1
              ? ""
              : "s"}
          </span>
        )}

        {item.alert && (
          <span
            className="rounded-full px-3 py-1.5 text-[10px] font-semibold"
            style={{
              backgroundColor:
                `${item.alert.color}18`,
              color:
                item.alert.color,
            }}
          >
            {
              item.alert.label
            }
          </span>
        )}

        {item.document.is_favorite && (
          <span className="rounded-full border border-amber-400/20 bg-amber-400/8 px-3 py-1.5 text-[10px] font-semibold text-amber-300">
            Favorito
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SUMMARY
// ============================================================

interface LayersSummaryProps {
  domains: number;
  parents: number;
  documents: number;
}

function LayersSummary({
  domains,
  parents,
  documents,
}: LayersSummaryProps) {
  return (
    <div className="flex w-full items-center gap-2 text-[10px] text-ink-faint">
      <span>
        {domains}{" "}
        categoria
        {domains ===
        1
          ? ""
          : "s"}
      </span>

      <span>
        ·
      </span>

      <span>
        {parents}{" "}
        grupo
        {parents ===
        1
          ? ""
          : "s"}
      </span>

      <span>
        ·
      </span>

      <span>
        {documents}{" "}
        documento
        {documents ===
        1
          ? ""
          : "s"}
      </span>

      <div className="ml-1 h-px flex-1 bg-surface-border/40" />
    </div>
  );
}