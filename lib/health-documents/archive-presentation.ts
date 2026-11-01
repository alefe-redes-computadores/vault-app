// VAULT M4 — apresentação pura do acervo clínico, extraída sem mudar decisões.
// Este módulo não acessa banco, não cria vínculos e não converte receita em retirada.
import { Activity, FileHeart, FileQuestion, FileText, FlaskConical, FolderHeart, HeartPulse, Pill, Stethoscope, Syringe, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isReceitaVencidaSegura } from "@/lib/health-insights";
import { getDaysUntil } from "@/lib/health-utils";
import type { Document, Medicamento, RegistroSaude, Renovacao } from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

export type ClinicalDomainId =
  | "medicamentos"
  | "consultas"
  | "exames"
  | "cirurgias"
  | "tratamentos"
  | "cids"
  | "registros"
  | "outros";

export type PrescriptionStatus =
  | "valida"
  | "vencida"
  | "proxima"
  | "renovada";

export interface PrescriptionAlert {
  status: PrescriptionStatus;
  label: string;
  color: string;
}

export interface DocumentViewModel {
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
  sharedMedicationCount?: number;
  entityLabel?: string;
  alert: PrescriptionAlert | null;
}

export interface ParentGroup {
  key: string;
  name: string;
  description?: string;
  icon: LucideIcon;
  color: string;
  medication?: Medicamento;
  documents: DocumentViewModel[];
}

export interface DomainGroup {
  id: ClinicalDomainId;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  parents: ParentGroup[];
  count: number;
}

export interface CardElementRef {
  current: HTMLDivElement | null;
}

// ============================================================
// DOMÍNIOS VISUAIS
// ============================================================

export const DOMAIN_CONFIG: Record<
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

export const DOMAIN_ORDER: ClinicalDomainId[] = [
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

export function normalizeSearch(
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

export function getMetadataString(
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

export function getDocumentDate(
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

export function getSortableDate(
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

export function formatFullDate(
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

export function formatShortDate(
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

export function getMonthKey(
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

export function formatMonthLabel(
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

export function getDocumentTypeLabel(
  type: Document["type"]
): string {
  switch (type) {
    case "receita":
      return "Receita";

    case "prontuario":
      return "Prontuário";

    case "documento_sus":
      return "Fornecimento SUS";
    case "lme":
      return "LME";
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
export function getDocumentIcon(
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

export function getCompactMedicationDocumentLabel(
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

export function getMedicationColors(
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

export function getMedicationPrimaryColor(
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
export function extractLegacyPrescriptionMedicationName(
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

export function findUniqueLegacyPrescriptionMedication(
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

export function getPrescriptionMedicationId(
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

export function getPrescriptionAlert(
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

export function getRegistroDescription(
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

export function documentSearchFields(item: DocumentViewModel): unknown[] {
  const document=item.document;
  const date=item.date?.slice(0,10)||"";
  return [document.title,document.description,getDocumentTypeLabel(document.type),item.parentName,item.parentDescription,item.entityLabel,date,date.split('-').reverse().join('/'),...Object.values(document.metadata||{}).filter(value=>typeof value==='string').slice(0,20)];
}
