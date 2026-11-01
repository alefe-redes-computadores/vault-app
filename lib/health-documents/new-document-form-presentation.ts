// VAULT M5 — apresentação do novo documento clínico, sem gravação.
// Identidade e metadados são calculados; a autoridade de user_id/person_id permanece na página.
import { Activity, Building2, Droplets, FileOutput, FileText, Heart, Image as ImageIcon, Layers3, MapPin, Pill, Stethoscope, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DOCUMENT_FIELDS } from "@/lib/types";
import type { Attachment, DocumentField, DocumentType, Medicamento } from "@/lib/types";

// ============================================================
// DOCUMENTOS CLÍNICOS
// ============================================================

export const HEALTH_TYPES = [
  "receita",
  "prontuario",
  "documento_sus",
  "lme",
  "laudo",
  "encaminhamento",
  "consulta",
  "cirurgia",
  "exame_sangue",
  "exame_imagem",
] as const satisfies readonly DocumentType[];

export type HealthDocumentType =
  (typeof HEALTH_TYPES)[number];

// ============================================================
// ENTIDADES CLÍNICAS
// ============================================================

export type HealthEntityType =
  | "medicamento"
  | "tratamento"
  | "cid"
  | "consulta"
  | "exame"
  | "cirurgia";

export interface ClinicalEntityItem {
  medicamento?: Medicamento;
  id: string;
  entityType: HealthEntityType;
  label: string;
  description?: string;
  icon: LucideIcon;
  colorClass: string;
}

// ============================================================
// TIPOS LOCAIS
// ============================================================

export interface FormData {
  type: HealthDocumentType;
  title: string;
  description: string;
  metadata: Record<string, string>;
  attachments: Attachment[];
  entidade_tipo?: HealthEntityType;
  entidade_id?: string;
}

export interface LocalAttachment {
  attachmentId: string;
  file: File;
  objectUrl: string;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface SelectItem {
  id: string;
  label: string;
  description?: string;
}

// ============================================================
// CONFIGURAÇÃO
// ============================================================

export const HEALTH_TYPE_LABELS: Record<
  HealthDocumentType,
  string
> = {
  receita:
    "Receita Médica",

  prontuario:
    "Prontuário Médico",

  documento_sus: "Documento de fornecimento SUS",
  lme: "LME — solicitação de medicamentos",
  laudo:
    "Laudo ou Parecer",

  encaminhamento:
    "Encaminhamento",

  consulta:
    "Documento de Consulta",

  cirurgia:
    "Documento de Cirurgia",

  exame_sangue:
    "Exame Laboratorial",

  exame_imagem:
    "Exame de Imagem",
};

export const HEALTH_TYPE_DESCRIPTIONS: Record<
  HealthDocumentType,
  string
> = {
  receita:
    "Documento de prescrição ligado a um medicamento da pessoa ativa.",

  prontuario:
    "Registro clínico que pode ser relacionado a uma consulta, tratamento, exame, cirurgia ou CID.",

  documento_sus: "Formulário, comprovante ou decisão da farmácia responsável pelo fornecimento.",
  lme: "Formulário de solicitação ou renovação do fornecimento especializado, preenchido pelo prescritor.",
  laudo:
    "Laudo ou parecer que pode ser associado ao evento ou condição clínica correspondente.",

  encaminhamento:
    "Documento de encaminhamento entre profissionais ou serviços de saúde.",

  consulta:
    "Documento pertencente a uma consulta já cadastrada no histórico clínico.",

  cirurgia:
    "Documento pertencente a uma cirurgia já cadastrada no histórico clínico.",

  exame_sangue:
    "Resultado laboratorial vinculado a um exame cadastrado.",

  exame_imagem:
    "Laudo, imagem ou arquivo vinculado a um exame cadastrado.",
};

export const TYPE_TITLE_PLACEHOLDERS: Record<
  HealthDocumentType,
  string
> = {
  receita:
    "Ex: Receita Neurologia — Agosto 2026",

  prontuario:
    "Ex: Evolução clínica — Agosto 2026",

  documento_sus: "Ex: Comprovante de retirada — Outubro 2026",
  lme: "Ex: LME — Metadona — Outubro 2026",
  laudo:
    "Ex: Laudo Neurológico",

  encaminhamento:
    "Ex: Encaminhamento para Cardiologia",

  consulta:
    "Ex: Relatório da consulta",

  cirurgia:
    "Ex: Relatório cirúrgico",

  exame_sangue:
    "Ex: Hemograma Completo — Agosto 2026",

  exame_imagem:
    "Ex: Laudo da Ressonância Magnética",
};

export const TYPE_ICONS: Record<
  HealthDocumentType,
  LucideIcon
> = {
  receita:
    Pill,

  prontuario:
    Heart,

  documento_sus: FileText,
  lme: FileText,
  laudo:
    FileText,

  encaminhamento:
    FileOutput,

  consulta:
    Stethoscope,

  cirurgia:
    Activity,

  exame_sangue:
    Droplets,

  exame_imagem:
    ImageIcon,
};

export const slideVariants = {
  enter:
    (
      direction: number
    ) => ({
      x:
        direction >
        0
          ? 50
          : -50,

      opacity:
        0,
    }),

  center: {
    zIndex:
      1,

    x:
      0,

    opacity:
      1,
  },

  exit:
    (
      direction: number
    ) => ({
      zIndex:
        0,

      x:
        direction <
        0
          ? 50
          : -50,

      opacity:
        0,
    }),
};

// ============================================================
// HELPERS
// ============================================================

export function getMetadataString(
  metadata:
    Record<
      string,
      string
    >,
  key: string
): string {
  return (
    metadata[
      key
    ] ||
    ""
  );
}

export function buildMetadataForType(
  type:
    HealthDocumentType
): Record<string, string> {
  const metadata:
    Record<
      string,
      string
    > = {};

  DOCUMENT_FIELDS[
    type
  ].forEach(
    (
      field
    ) => {
      metadata[
        field.key
      ] =
        field.type ===
          "select" &&
        field.options?.[
          0
        ]
          ? field.options[
              0
            ]
          : "";
    }
  );

  return metadata;
}

export function buildMetadataForTypePreservingSharedValues(
  type:
    HealthDocumentType,
  currentMetadata:
    Record<
      string,
      string
    >
): Record<string, string> {
  const next =
    buildMetadataForType(
      type
    );

  Object.keys(
    next
  ).forEach(
    (
      key
    ) => {
      if (
        currentMetadata[
          key
        ] !==
        undefined
      ) {
        next[
          key
        ] =
          currentMetadata[
            key
          ];
      }
    }
  );

  return next;
}

export function isEntitySelectField(
  key: string
): boolean {
  return [
    "medicamento_id",
    "medico_id",
    "from_medico_id",
    "to_medico_id",
    "hospital_id",
    "local_id",
    "farmacia_id",
  ].includes(
    key
  );
}

export function getFieldIcon(
  key: string
): LucideIcon {
  switch (
    key
  ) {
    case "medicamento_id":
      return Pill;

    case "medico_id":
    case "from_medico_id":
    case "to_medico_id":
      return Stethoscope;

    case "hospital_id":
      return Building2;

    case "local_id":
      return MapPin;

    case "farmacia_id":
      return Store;

    default:
      return Layers3;
  }
}

export function isSupportedFile(
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

export function hasDocumentField(
  type:
    HealthDocumentType,
  key: string
): boolean {
  return DOCUMENT_FIELDS[
    type
  ].some(
    (
      field
    ) =>
      field.key ===
      key
  );
}

export function isPrescriptionExpiryField(
  key:
    string
): boolean {
  return [
    "expiry_date",
    "expiration_date",
    "validade",
  ].includes(
    key
      .trim()
      .toLocaleLowerCase(
        "pt-BR"
      )
  );
}

export function getPrescriptionExpiryDate(
  metadata:
    Record<
      string,
      string
    >
): string {
  return (
    metadata.expiry_date ||
    metadata.expiration_date ||
    metadata.validade ||
    ""
  );
}

export function requiresCanonicalEntity(
  type:
    HealthDocumentType
): boolean {
  return [
    "receita",
    "consulta",
    "cirurgia",
    "exame_sangue",
    "exame_imagem",
  ].includes(
    type
  );
}

export function getEntitySectionTitle(
  type:
    HealthDocumentType
): string {
  switch (
    type
  ) {
    case "receita":
      return "Qual medicamento recebeu esta receita?";

    case "consulta":
      return "A qual consulta este documento pertence?";

    case "cirurgia":
      return "A qual cirurgia este documento pertence?";

    case "exame_sangue":
    case "exame_imagem":
      return "A qual exame este documento pertence?";

    case "prontuario":
      return "Relacionar ao histórico clínico";

    case "laudo":
      return "Relacionar o laudo";

    case "encaminhamento":
      return "Relacionar o encaminhamento";

    default:
      return "Vínculo clínico";
  }
}

export function getEntitySectionDescription(
  type:
    HealthDocumentType
): string {
  if (
    requiresCanonicalEntity(
      type
    )
  ) {
    return "Este vínculo organiza o documento dentro do Acervo Clínico e evita duplicar dados que já existem no Vault.";
  }

  return "Opcional. Vincule o documento a uma entidade clínica para que ele apareça dentro da árvore correspondente.";
}

export function shouldHideMetadataField(
  field:
    DocumentField,
  entidadeTipo?:
    HealthEntityType
): boolean {
  return (
    entidadeTipo ===
      "medicamento" &&
    field.key ===
      "medicamento_id"
  );
}

export function getCustomFieldConflict(
  customFields:
    CustomField[],
  officialKeys:
    Set<string>
): string | null {
  const seen =
    new Set<string>();

  for (
    const field of
    customFields
  ) {
    const label =
      field.label.trim();

    if (
      !label
    ) {
      continue;
    }

    const normalized =
      label.toLocaleLowerCase(
        "pt-BR"
      );

    if (
      officialKeys.has(
        normalized
      )
    ) {
      return `O campo adicional "${label}" usa o mesmo nome de um campo oficial do documento.`;
    }

    if (
      seen.has(
        normalized
      )
    ) {
      return `Existem dois campos adicionais chamados "${label}".`;
    }

    seen.add(
      normalized
    );
  }

  return null;
}
