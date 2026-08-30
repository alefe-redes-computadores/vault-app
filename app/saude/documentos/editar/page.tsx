// app/saude/documentos/editar/page.tsx
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
  AnimatePresence,
  motion,
} from "framer-motion";

import type {
  LucideIcon,
} from "lucide-react";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Droplets,
  FileOutput,
  FileText,
  FolderHeart,
  Heart,
  Image as ImageIcon,
  Layers3,
  Loader2,
  MapPin,
  Paperclip,
  Pill,
  Plus,
  Save,
  Stethoscope,
  Store,
  Tag,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import {
  deleteFile,
  uploadFile,
} from "@/lib/supabase/storage";

import {
  cancelDocumentExpiryNotification,
  scheduleDocumentExpiryNotification,
} from "@/lib/notifications";

import {
  useAuth,
} from "@/hooks/useAuth";

import {
  useDocument,
  useDocumentActions,
} from "@/hooks/useDocuments";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

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
  useFarmacias,
} from "@/hooks/useFarmacias";

import {
  useHospitais,
} from "@/hooks/useHospitais";

import {
  useLocais,
} from "@/hooks/useLocais";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";

import {
  DOCUMENT_FIELDS,
  type Attachment,
  type Cid,
  type Cirurgia,
  type Consulta,
  type DocumentField,
  type DocumentType,
  type Exame,
  type Medicamento,
  type Tratamento,
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
  BottomSheet,
} from "@/components/ui/BottomSheet";

import {
  SelectionModal,
} from "@/components/SelectionModal";

import {
  useToast,
} from "@/components/ToastProvider";

// ============================================================
// DOCUMENTOS CLÍNICOS
// ============================================================

const HEALTH_TYPES = [
  "receita",
  "prontuario",
  "laudo",
  "encaminhamento",
  "consulta",
  "cirurgia",
  "exame_sangue",
  "exame_imagem",
] as const satisfies readonly DocumentType[];

type HealthDocumentType =
  (typeof HEALTH_TYPES)[number];

// ============================================================
// ENTIDADES CLÍNICAS EDITÁVEIS NESTA TELA
// ============================================================

type HealthEntityType =
  | "medicamento"
  | "tratamento"
  | "cid"
  | "consulta"
  | "exame"
  | "cirurgia";

interface ClinicalEntityItem {
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

interface EditFormData {
  type: HealthDocumentType;
  title: string;
  description: string;
  metadata: Record<string, string>;
  attachments: Attachment[];

  entidade_tipo?: HealthEntityType;
  entidade_id?: string;
}

interface OriginalRelationState {
  entidade_tipo?: string;
  entidade_id?: string;
  medico_id?: string;
  hospital_id?: string;
}

interface LocalAttachment {
  attachmentId: string;
  file: File;
  objectUrl: string;
}

interface CustomField {
  id: string;
  label: string;
  value: string;
}

interface SelectItem {
  id: string;
  label: string;
  description?: string;
}

// ============================================================
// CONFIG
// ============================================================

const HEALTH_TYPE_LABELS: Record<
  HealthDocumentType,
  string
> = {
  receita:
    "Receita Médica",

  prontuario:
    "Prontuário Médico",

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

const HEALTH_TYPE_DESCRIPTIONS: Record<
  HealthDocumentType,
  string
> = {
  receita:
    "Prescrição vinculada ao medicamento correspondente.",

  prontuario:
    "Registro clínico que pode ser relacionado ao histórico da pessoa.",

  laudo:
    "Laudo ou parecer associado a uma entidade clínica.",

  encaminhamento:
    "Documento de encaminhamento entre profissionais ou serviços.",

  consulta:
    "Documento pertencente a uma consulta cadastrada.",

  cirurgia:
    "Documento pertencente a uma cirurgia cadastrada.",

  exame_sangue:
    "Resultado laboratorial vinculado a um exame.",

  exame_imagem:
    "Imagem ou laudo vinculado a um exame.",
};

const TYPE_TITLE_PLACEHOLDERS: Record<
  HealthDocumentType,
  string
> = {
  receita:
    "Ex: Receita Neurologia — Agosto 2026",

  prontuario:
    "Ex: Evolução clínica — Agosto 2026",

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

const TYPE_ICONS: Record<
  HealthDocumentType,
  LucideIcon
> = {
  receita:
    Pill,

  prontuario:
    Heart,

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

const slideVariants = {
  enter: (
    direction:
      number
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
    x:
      0,

    opacity:
      1,
  },

  exit: (
    direction:
      number
  ) => ({
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

function getMetadataString(
  metadata:
    Record<string, string>,
  key:
    string
): string {
  return metadata[
    key
  ] ||
    "";
}

function buildMetadataForType(
  type:
    HealthDocumentType
): Record<string, string> {
  const metadata:
    Record<string, string> =
    {};

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

function buildMetadataForTypePreservingSharedValues(
  type:
    HealthDocumentType,
  currentMetadata:
    Record<string, string>
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

function metadataToStrings(
  metadata:
    Record<string, unknown>
): Record<string, string> {
  const result:
    Record<string, string> =
    {};

  Object.entries(
    metadata ||
      {}
  ).forEach(
    (
      [
        key,
        value,
      ]
    ) => {
      if (
        value ===
          undefined ||
        value ===
          null
      ) {
        return;
      }

      if (
        typeof value ===
        "string"
      ) {
        result[
          key
        ] =
          value;

        return;
      }

      if (
        typeof value ===
          "number" ||
        typeof value ===
          "boolean"
      ) {
        result[
          key
        ] =
          String(
            value
          );
      }
    }
  );

  return result;
}

function isHealthType(
  type:
    DocumentType
): type is HealthDocumentType {
  return HEALTH_TYPES.includes(
    type as HealthDocumentType
  );
}

function isHealthEntityType(
  value?:
    string
): value is HealthEntityType {
  return [
    "medicamento",
    "tratamento",
    "cid",
    "consulta",
    "exame",
    "cirurgia",
  ].includes(
    value ||
      ""
  );
}

function isEntitySelectField(
  key:
    string
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

function getFieldIcon(
  key:
    string
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

function handleDateMask(
  value:
    string
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

function parseDateToISO(
  displayValue:
    string
): string {
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      displayValue
    )
  ) {
    return displayValue;
  }

  const clean =
    displayValue.replace(
      /\D/g,
      ""
    );

  if (
    clean.length !==
    8
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

  const date =
    new Date(
      year,
      month -
        1,
      day
    );

  if (
    year <
      1900 ||
    month <
      1 ||
    month >
      12 ||
    day <
      1 ||
    day >
      31 ||
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

  return [
    String(
      year
    ).padStart(
      4,
      "0"
    ),

    String(
      month
    ).padStart(
      2,
      "0"
    ),

    String(
      day
    ).padStart(
      2,
      "0"
    ),
  ].join(
    "-"
  );
}

function formatDateDisplay(
  value?:
    string
): string {
  if (
    !value
  ) {
    return "";
  }

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      value
    )
  ) {
    return value;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}/.test(
      value
    )
  ) {
    return value;
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .slice(
        0,
        10
      )
      .split(
        "-"
      );

  return `${day}/${month}/${year}`;
}

function isSupportedFile(
  file:
    File
): boolean {
  return (
    file.type.startsWith(
      "image/"
    ) ||
    file.type ===
      "application/pdf"
  );
}

function hasDocumentField(
  type:
    HealthDocumentType,
  key:
    string
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

function requiresCanonicalEntity(
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

function getEntitySectionTitle(
  type:
    HealthDocumentType
): string {
  switch (
    type
  ) {
    case "receita":
      return "Medicamento";

    case "consulta":
      return "Consulta";

    case "cirurgia":
      return "Cirurgia";

    case "exame_sangue":
    case "exame_imagem":
      return "Exame";

    case "prontuario":
      return "Vínculo clínico";

    case "laudo":
      return "Vínculo do laudo";

    case "encaminhamento":
      return "Vínculo do encaminhamento";

    default:
      return "Vínculo clínico";
  }
}

function getKnownKeys(
  type:
    HealthDocumentType
): Set<string> {
  return new Set(
    DOCUMENT_FIELDS[
      type
    ].map(
      (
        field
      ) =>
        field.key
    )
  );
}

function shouldHideMetadataField(
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

function getCustomFieldConflict(
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

async function rollbackUploadedFiles(
  urls:
    string[]
): Promise<void> {
  const uniqueUrls =
    Array.from(
      new Set(
        urls
      )
    );

  for (
    const url of
    uniqueUrls
  ) {
    try {
      const {
        error,
      } =
        await deleteFile(
          url
        );

      if (
        error
      ) {
        console.error(
          "[EditarDocumentoSaude] Falha ao desfazer upload:",
          url,
          error
        );
      }
    } catch (
      error
    ) {
      console.error(
        "[EditarDocumentoSaude] Erro inesperado no rollback do upload:",
        url,
        error
      );
    }
  }
}

// ============================================================
// PAGE
// ============================================================

export default function EditarDocumentoSaudePage() {
  return (
    <Suspense
      fallback={
        <EditLoading />
      }
    >
      <EditarDocumentoSaudeContent />
    </Suspense>
  );
}

// ============================================================
// CONTENT
// ============================================================

function EditarDocumentoSaudeContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get(
      "id"
    )?.trim() ||
    "";

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

  const document =
    useDocument(
      id
    );

  const {
    getDocument,
    updateDocument,
  } =
    useDocumentActions();

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
    farmacias = [],
  } =
    useFarmacias();

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

  const initializedDocumentIdRef =
    useRef<
      string | null
    >(
      null
    );

  const originalRelationsRef =
    useRef<OriginalRelationState>({
      entidade_tipo:
        undefined,

      entidade_id:
        undefined,

      medico_id:
        undefined,

      hospital_id:
        undefined,
    });

  const canonicalRelationTouchedRef =
    useRef(
      false
    );

  const isSubmitLocked =
    useRef(
      false
    );

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const cameraInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const objectUrlsRef =
    useRef<
      Set<string>
    >(
      new Set()
    );

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    currentStep,
    setCurrentStep,
  ] =
    useState(
      1
    );

  const [
    slideDirection,
    setSlideDirection,
  ] =
    useState(
      0
    );

  const [
    isTypeModalOpen,
    setIsTypeModalOpen,
  ] =
    useState(
      false
    );

  const [
    isClinicalEntityModalOpen,
    setIsClinicalEntityModalOpen,
  ] =
    useState(
      false
    );

  const [
    activeSelectField,
    setActiveSelectField,
  ] =
    useState<
      DocumentField | null
    >(
      null
    );

  const [
    uploadProgress,
    setUploadProgress,
  ] =
    useState(
      0
    );

  const [
    expiryWarning,
    setExpiryWarning,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    errors,
    setErrors,
  ] =
    useState<
      Record<string, string>
    >(
      {}
    );

  const [
    customFields,
    setCustomFields,
  ] =
    useState<
      CustomField[]
    >(
      []
    );

  const [
    localFiles,
    setLocalFiles,
  ] =
    useState<
      LocalAttachment[]
    >(
      []
    );

  const [
    formData,
    setFormData,
  ] =
    useState<
      EditFormData | null
    >(
      null
    );

  // ==========================================================
  // INITIALIZE FROM DOCUMENT
  // ==========================================================

  useEffect(
    () => {
      if (
        !document ||
        !document.id ||
        initializedDocumentIdRef.current ===
          document.id
      ) {
        return;
      }

      if (
        document.category_id !==
        "saude"
      ) {
        return;
      }

      if (
        !isHealthType(
          document.type
        )
      ) {
        return;
      }

      const rawMetadata =
        metadataToStrings(
          document.metadata
        );

      const knownKeys =
        getKnownKeys(
          document.type
        );

      const baseMetadata =
        buildMetadataForType(
          document.type
        );

      Object.entries(
        rawMetadata
      ).forEach(
        (
          [
            key,
            value,
          ]
        ) => {
          if (
            !knownKeys.has(
              key
            )
          ) {
            return;
          }

          const field =
            DOCUMENT_FIELDS[
              document.type
            ].find(
              (
                item
              ) =>
                item.key ===
                key
            );

          baseMetadata[
            key
          ] =
            field?.type ===
            "date"
              ? formatDateDisplay(
                  value
                )
              : value;
        }
      );

      const restoredCustomFields =
        Object.entries(
          rawMetadata
        )
          .filter(
            (
              [
                key,
              ]
            ) =>
              !knownKeys.has(
                key
              )
          )
          .map(
            (
              [
                label,
                value,
              ]
            ) => ({
              id:
                crypto.randomUUID(),

              label,

              value,
            }));

      const safeEntityType =
        isHealthEntityType(
          document.entidade_tipo
        )
          ? document.entidade_tipo
          : undefined;

      setCustomFields(
        restoredCustomFields
      );

      setFormData({
        type:
          document.type,

        title:
          document.title,

        description:
          document.description ||
          "",

        metadata:
          baseMetadata,

        attachments:
          document.attachments ||
          [],

        entidade_tipo:
          safeEntityType,

        entidade_id:
          safeEntityType
            ? document.entidade_id
            : undefined,
      });

      originalRelationsRef.current = {
        entidade_tipo:
          document.entidade_tipo,

        entidade_id:
          document.entidade_id,

        medico_id:
          document.medico_id,

        hospital_id:
          document.hospital_id,
      };

      canonicalRelationTouchedRef.current =
        false;

      initializedDocumentIdRef.current =
        document.id;
    },
    [
      document,
    ]
  );

  // ==========================================================
  // OBJECT URL CLEANUP
  // ==========================================================

  useEffect(
    () => {
      const urls =
        objectUrlsRef.current;

      return () => {
        urls.forEach(
          (
            url
          ) => {
            URL.revokeObjectURL(
              url
            );
          }
        );

        urls.clear();
      };
    },
    []
  );

  // ==========================================================
  // PERSON-SCOPED DATA
  // ==========================================================

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

  // ==========================================================
  // DERIVED
  // ==========================================================

  const fields =
    formData
      ? DOCUMENT_FIELDS[
          formData.type
        ] ||
        []
      : [];

  const visibleFields =
    useMemo(
      () => {
        if (
          !formData
        ) {
          return [];
        }

        return fields.filter(
          (
            field
          ) =>
            !shouldHideMetadataField(
              field,
              formData.entidade_tipo
            )
        );
      },
      [
        fields,
        formData,
      ]
    );

  const officialMetadataKeys =
    useMemo(
      () =>
        new Set(
          fields.map(
            (
              field
            ) =>
              field.key.toLocaleLowerCase(
                "pt-BR"
              )
          )
        ),
      [
        fields,
      ]
    );

  const SelectedTypeIcon =
    formData
      ? TYPE_ICONS[
          formData.type
        ]
      : FileText;

  const selectedTypeLabel =
    formData
      ? HEALTH_TYPE_LABELS[
          formData.type
        ]
      : "";

  const selectedTypeDescription =
    formData
      ? HEALTH_TYPE_DESCRIPTIONS[
          formData.type
        ]
      : "";

  const titlePlaceholder =
    formData
      ? TYPE_TITLE_PLACEHOLDERS[
          formData.type
        ]
      : "";

  // ==========================================================
  // CLINICAL ENTITY OPTIONS
  // ==========================================================

  const clinicalEntityItems =
    useMemo<
      ClinicalEntityItem[]
    >(
      () => {
        if (
          !formData
        ) {
          return [];
        }

        const items:
          ClinicalEntityItem[] =
          [];

        const addMedicamentos =
          () => {
            scopedMedicamentos.forEach(
              (
                medicamento:
                  Medicamento
              ) => {
                if (
                  !medicamento.id
                ) {
                  return;
                }

                items.push({
                  id:
                    medicamento.id,

                  entityType:
                    "medicamento",

                  label:
                    medicamento.nome,

                  description:
                    [
                      medicamento.dosagem,
                      medicamento.status ===
                        "descontinuado"
                        ? "Descontinuado"
                        : undefined,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " · "
                      ) ||
                    undefined,

                  icon:
                    Pill,

                  colorClass:
                    "text-amber-400",
                });
              }
            );
          };

        const addConsultas =
          () => {
            scopedConsultas.forEach(
              (
                consulta:
                  Consulta
              ) => {
                if (
                  !consulta.id
                ) {
                  return;
                }

                items.push({
                  id:
                    consulta.id,

                  entityType:
                    "consulta",

                  label:
                    consulta.medico ||
                    consulta.especialidade ||
                    "Consulta",

                  description:
                    [
                      consulta.especialidade,
                      formatDateDisplay(
                        consulta.data
                      ),
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " · "
                      ),

                  icon:
                    Stethoscope,

                  colorClass:
                    "text-ice",
                });
              }
            );
          };

        const addCirurgias =
          () => {
            scopedCirurgias.forEach(
              (
                cirurgia:
                  Cirurgia
              ) => {
                if (
                  !cirurgia.id
                ) {
                  return;
                }

                items.push({
                  id:
                    cirurgia.id,

                  entityType:
                    "cirurgia",

                  label:
                    cirurgia.procedimento,

                  description:
                    [
                      formatDateDisplay(
                        cirurgia.data
                      ),
                      cirurgia.status,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " · "
                      ),

                  icon:
                    Activity,

                  colorClass:
                    "text-coral",
                });
              }
            );
          };

        const addExames =
          () => {
            scopedExames.forEach(
              (
                exame:
                  Exame
              ) => {
                if (
                  !exame.id
                ) {
                  return;
                }

                items.push({
                  id:
                    exame.id,

                  entityType:
                    "exame",

                  label:
                    exame.nome,

                  description:
                    formatDateDisplay(
                      exame.data
                    ),

                  icon:
                    Droplets,

                  colorClass:
                    "text-emerald-400",
                });
              }
            );
          };

        const addTratamentos =
          () => {
            scopedTratamentos.forEach(
              (
                tratamento:
                  Tratamento
              ) => {
                if (
                  !tratamento.id
                ) {
                  return;
                }

                items.push({
                  id:
                    tratamento.id,

                  entityType:
                    "tratamento",

                  label:
                    tratamento.nome,

                  description:
                    tratamento.condicao ||
                    tratamento.status,

                  icon:
                    FolderHeart,

                  colorClass:
                    "text-violet-400",
                });
              }
            );
          };

        const addCids =
          () => {
            scopedCids.forEach(
              (
                cid:
                  Cid
              ) => {
                if (
                  !cid.id
                ) {
                  return;
                }

                items.push({
                  id:
                    cid.id,

                  entityType:
                    "cid",

                  label:
                    `${cid.codigo} · ${cid.descricao}`,

                  description:
                    cid.data_diagnostico
                      ? formatDateDisplay(
                          cid.data_diagnostico
                        )
                      : undefined,

                  icon:
                    Tag,

                  colorClass:
                    "text-teal-400",
                });
              }
            );
          };

        switch (
          formData.type
        ) {
          case "receita":
            addMedicamentos();
            break;

          case "consulta":
            addConsultas();
            break;

          case "cirurgia":
            addCirurgias();
            break;

          case "exame_sangue":
          case "exame_imagem":
            addExames();
            break;

          case "prontuario":
            addConsultas();
            addTratamentos();
            addCirurgias();
            addExames();
            addCids();
            break;

          case "laudo":
            addExames();
            addConsultas();
            addCids();
            addTratamentos();
            addCirurgias();
            break;

          case "encaminhamento":
            addConsultas();
            addTratamentos();
            addCids();
            break;
        }

        return items.sort(
          (
            a,
            b
          ) =>
            a.label.localeCompare(
              b.label,
              "pt-BR"
            )
        );
      },
      [
        formData,
        scopedMedicamentos,
        scopedConsultas,
        scopedCirurgias,
        scopedExames,
        scopedTratamentos,
        scopedCids,
      ]
    );

  const selectedClinicalEntity =
    useMemo(
      () => {
        if (
          !formData
        ) {
          return undefined;
        }

        return clinicalEntityItems.find(
          (
            item
          ) =>
            item.id ===
              formData.entidade_id &&
            item.entityType ===
              formData.entidade_tipo
        );
      },
      [
        clinicalEntityItems,
        formData,
      ]
    );

  const SelectedClinicalEntityIcon =
    selectedClinicalEntity?.icon;

  const hasUnresolvedOriginalCanonicalRelation =
    Boolean(
      document &&
      document.entidade_tipo &&
      document.entidade_id &&
      !canonicalRelationTouchedRef.current &&
      (
        !isHealthEntityType(
          document.entidade_tipo
        ) ||
        (
          formData?.entidade_tipo ===
            document.entidade_tipo &&
          formData?.entidade_id ===
            document.entidade_id &&
          !selectedClinicalEntity
        )
      )
    );

  // ==========================================================
  // RELATIONAL SELECT OPTIONS
  // ==========================================================

  const selectItems =
    useMemo<
      SelectItem[]
    >(
      () => {
        if (
          !activeSelectField
        ) {
          return [];
        }

        if (
          activeSelectField.options?.length
        ) {
          return activeSelectField.options.map(
            (
              option
            ) => ({
              id:
                option,

              label:
                option,
            })
          );
        }

        switch (
          activeSelectField.key
        ) {
          case "medicamento_id":
            return scopedMedicamentos
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
                ) => ({
                  id:
                    item.id!,

                  label:
                    item.nome,

                  description:
                    item.dosagem ||
                    undefined,
                })
              );

          case "medico_id":
          case "from_medico_id":
          case "to_medico_id":
            return medicos
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
                ) => ({
                  id:
                    item.id!,

                  label:
                    item.nome,

                  description:
                    item.especialidade ||
                    item.crm ||
                    undefined,
                })
              );

          case "hospital_id":
            return hospitais
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
                ) => ({
                  id:
                    item.id!,

                  label:
                    item.nome,

                  description:
                    item.tipo ||
                    item.endereco ||
                    undefined,
                })
              );

          case "local_id":
            return locais
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
                ) => ({
                  id:
                    item.id!,

                  label:
                    item.nome,

                  description:
                    item.tipo ||
                    item.endereco ||
                    undefined,
                })
              );

          case "farmacia_id":
            return farmacias
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
                ) => ({
                  id:
                    item.id!,

                  label:
                    item.nome,

                  description:
                    item.endereco ||
                    undefined,
                })
              );

          default:
            return [];
        }
      },
      [
        activeSelectField,
        scopedMedicamentos,
        medicos,
        hospitais,
        locais,
        farmacias,
      ]
    );

  // ==========================================================
  // LABEL RESOLUTION
  // ==========================================================

  const getSelectValueLabel =
    (
      field:
        DocumentField
    ): string => {
      if (
        !formData
      ) {
        return "";
      }

      const value =
        getMetadataString(
          formData.metadata,
          field.key
        );

      if (
        !value
      ) {
        return "Selecionar";
      }

      if (
        field.options?.includes(
          value
        )
      ) {
        return value;
      }

      switch (
        field.key
      ) {
        case "medicamento_id":
          return (
            scopedMedicamentos.find(
              (
                item
              ) =>
                item.id ===
                value
            )?.nome ||
            "Registro não encontrado"
          );

        case "medico_id":
        case "from_medico_id":
        case "to_medico_id":
          return (
            medicos.find(
              (
                item
              ) =>
                item.id ===
                value
            )?.nome ||
            "Registro não encontrado"
          );

        case "hospital_id":
          return (
            hospitais.find(
              (
                item
              ) =>
                item.id ===
                value
            )?.nome ||
            "Registro não encontrado"
          );

        case "local_id":
          return (
            locais.find(
              (
                item
              ) =>
                item.id ===
                value
            )?.nome ||
            "Registro não encontrado"
          );

        case "farmacia_id":
          return (
            farmacias.find(
              (
                item
              ) =>
                item.id ===
                value
            )?.nome ||
            "Registro não encontrado"
          );

        default:
          return value;
      }
    };

  // ==========================================================
  // ERRORS
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
  // TYPE CHANGE
  // ==========================================================

  const handleTypeChange =
    (
      type:
        HealthDocumentType
    ) => {
      if (
        !formData
      ) {
        return;
      }

      if (
        type ===
        formData.type
      ) {
        setIsTypeModalOpen(
          false
        );

        return;
      }

      trigger(
        "vibrate"
      );

      const nextMetadata =
        buildMetadataForTypePreservingSharedValues(
          type,
          formData.metadata
        );

      canonicalRelationTouchedRef.current =
        true;

      setFormData(
        (
          previous
        ) => {
          if (
            !previous
          ) {
            return previous;
          }

          return {
            ...previous,

            type,

            metadata:
              nextMetadata,

            entidade_tipo:
              undefined,

            entidade_id:
              undefined,
          };
        }
      );

      setExpiryWarning(
        null
      );

      setErrors(
        {}
      );

      setIsTypeModalOpen(
        false
      );
    };

  // ==========================================================
  // ENTITY PREFILL
  // ==========================================================

  const applyEntityPrefill =
    (
      item:
        ClinicalEntityItem
    ) => {
      if (
        !formData
      ) {
        return;
      }

      const nextMetadata = {
        ...formData.metadata,
      };

      if (
        item.entityType ===
        "medicamento"
      ) {
        const medicamento =
          scopedMedicamentos.find(
            (
              entity
            ) =>
              entity.id ===
              item.id
          );

        if (
          medicamento
        ) {
          if (
            hasDocumentField(
              formData.type,
              "medicamento_id"
            )
          ) {
            nextMetadata.medicamento_id =
              medicamento.id ||
              "";
          }

          if (
            hasDocumentField(
              formData.type,
              "dosage"
            )
          ) {
            nextMetadata.dosage =
              medicamento.dosagem ||
              "";
          }

          if (
            hasDocumentField(
              formData.type,
              "medico_id"
            )
          ) {
            nextMetadata.medico_id =
              medicamento.medico_id ||
              "";
          }

          if (
            hasDocumentField(
              formData.type,
              "farmacia_id"
            )
          ) {
            nextMetadata.farmacia_id =
              medicamento.farmacia_id ||
              "";
          }

          /*
           * Estas datas são snapshots documentais vindos
           * do Medicamento canônico.
           *
           * prescription_date = data da receita.
           * renewal_date      = contexto de próxima renovação.
           *
           * renewal_date NÃO representa validade.
           */
          if (
            hasDocumentField(
              formData.type,
              "prescription_date"
            )
          ) {
            nextMetadata.prescription_date =
              formatDateDisplay(
                medicamento.data_receita
              );
          }

          if (
            hasDocumentField(
              formData.type,
              "renewal_date"
            )
          ) {
            nextMetadata.renewal_date =
              formatDateDisplay(
                medicamento.proxima_renovacao
              );
          }
        }
      }

      if (
        item.entityType ===
        "consulta"
      ) {
        const consulta =
          scopedConsultas.find(
            (
              entity
            ) =>
              entity.id ===
              item.id
          );

        if (
          consulta
        ) {
          if (
            hasDocumentField(
              formData.type,
              "medico_id"
            )
          ) {
            nextMetadata.medico_id =
              consulta.medico_id ||
              "";
          }

          if (
            hasDocumentField(
              formData.type,
              "specialty"
            )
          ) {
            nextMetadata.specialty =
              consulta.especialidade ||
              "";
          }

          if (
            hasDocumentField(
              formData.type,
              "hospital_id"
            )
          ) {
            nextMetadata.hospital_id =
              consulta.hospital_id ||
              "";
          }

          if (
            hasDocumentField(
              formData.type,
              "date"
            )
          ) {
            nextMetadata.date =
              formatDateDisplay(
                consulta.data
              );
          }

          if (
            hasDocumentField(
              formData.type,
              "reason"
            )
          ) {
            nextMetadata.reason =
              consulta.motivo ||
              "";
          }
        }
      }

      if (
        item.entityType ===
        "cirurgia"
      ) {
        const cirurgia =
          scopedCirurgias.find(
            (
              entity
            ) =>
              entity.id ===
              item.id
          );

        if (
          cirurgia
        ) {
          if (
            hasDocumentField(
              formData.type,
              "procedure"
            )
          ) {
            nextMetadata.procedure =
              cirurgia.procedimento;
          }

          if (
            hasDocumentField(
              formData.type,
              "medico_id"
            )
          ) {
            nextMetadata.medico_id =
              cirurgia.medico_id ||
              "";
          }

          if (
            hasDocumentField(
              formData.type,
              "hospital_id"
            )
          ) {
            nextMetadata.hospital_id =
              cirurgia.hospital_id ||
              "";
          }

          if (
            hasDocumentField(
              formData.type,
              "date"
            )
          ) {
            nextMetadata.date =
              formatDateDisplay(
                cirurgia.data
              );
          }
        }
      }

      if (
        item.entityType ===
        "exame"
      ) {
        const exame =
          scopedExames.find(
            (
              entity
            ) =>
              entity.id ===
              item.id
          );

        if (
          exame
        ) {
          if (
            hasDocumentField(
              formData.type,
              "local_id"
            )
          ) {
            nextMetadata.local_id =
              exame.local_id ||
              "";
          }

          if (
            hasDocumentField(
              formData.type,
              "data_exame"
            )
          ) {
            nextMetadata.data_exame =
              formatDateDisplay(
                exame.data
              );
          }

          if (
            hasDocumentField(
              formData.type,
              "tipo"
            )
          ) {
            nextMetadata.tipo =
              exame.nome;
          }
        }
      }

      canonicalRelationTouchedRef.current =
        true;

      setFormData(
        (
          previous
        ) => {
          if (
            !previous
          ) {
            return previous;
          }

          return {
            ...previous,

            metadata:
              nextMetadata,

            entidade_tipo:
              item.entityType,

            entidade_id:
              item.id,
          };
        }
      );

      clearError(
        "entidade"
      );
    };

  // ==========================================================
  // REMOVE CANONICAL ENTITY
  // ==========================================================

  const removeCanonicalEntity =
    () => {
      if (
        !formData
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      canonicalRelationTouchedRef.current =
        true;

      setFormData(
        (
          previous
        ) => {
          if (
            !previous
          ) {
            return previous;
          }

          const nextMetadata = {
            ...previous.metadata,
          };

          if (
            hasDocumentField(
              previous.type,
              "medicamento_id"
            )
          ) {
            nextMetadata.medicamento_id =
              "";
          }

          return {
            ...previous,

            metadata:
              nextMetadata,

            entidade_tipo:
              undefined,

            entidade_id:
              undefined,
          };
        }
      );

      clearError(
        "entidade"
      );
    };

  // ==========================================================
  // METADATA
  // ==========================================================

  const handleMetadataChange =
    (
      key:
        string,
      value:
        string
    ) => {
      setFormData(
        (
          previous
        ) => {
          if (
            !previous
          ) {
            return previous;
          }

          return {
            ...previous,

            metadata: {
              ...previous.metadata,

              [
                key
              ]:
                value,
            },
          };
        }
      );

      clearError(
        key
      );

      if (
        formData?.type !==
        "receita"
      ) {
        setExpiryWarning(
          null
        );

        return;
      }

      const normalized =
        key.toLocaleLowerCase(
          "pt-BR"
        );

      /*
       * renewal_date NÃO representa validade.
       *
       * Renovação pertence ao contexto longitudinal do
       * medicamento e não pode produzir alerta de receita
       * vencida.
       */
      if (
        normalized.includes(
          "validade"
        ) ||
        normalized.includes(
          "expiry"
        ) ||
        normalized.includes(
          "expiration"
        )
      ) {
        const iso =
          parseDateToISO(
            value
          );

        if (
          iso
        ) {
          const expiry =
            new Date(
              `${iso}T23:59:59`
            );

          if (
            expiry <
            new Date()
          ) {
            setExpiryWarning(
              "A data informada já passou. O documento continuará preservado no histórico."
            );

            return;
          }
        }

        setExpiryWarning(
          null
        );
      }
    };

  // ==========================================================
  // CUSTOM FIELDS
  // ==========================================================

  const addCustomField =
    () => {
      if (
        customFields.length >=
        5
      ) {
        return;
      }

      setCustomFields(
        (
          previous
        ) => [
          ...previous,

          {
            id:
              crypto.randomUUID(),

            label:
              "",

            value:
              "",
          },
        ]
      );

      trigger(
        "vibrate"
      );
    };

  const updateCustomField =
    (
      id:
        string,
      key:
        "label" |
        "value",
      value:
        string
    ) => {
      setCustomFields(
        (
          previous
        ) =>
          previous.map(
            (
              field
            ) =>
              field.id ===
              id
                ? {
                    ...field,

                    [
                      key
                    ]:
                      value,
                  }
                : field
          )
      );

      clearError(
        "custom_fields"
      );
    };

  const removeCustomField =
    (
      id:
        string
    ) => {
      setCustomFields(
        (
          previous
        ) =>
          previous.filter(
            (
              field
            ) =>
              field.id !==
              id
          )
      );

      clearError(
        "custom_fields"
      );

      trigger(
        "vibrate"
      );
    };

  // ==========================================================
  // ATTACHMENTS
  // ==========================================================

  const addLocalFile =
    (
      file:
        File,
      name?:
        string
    ) => {
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

      const attachmentId =
        crypto.randomUUID();

      const objectUrl =
        URL.createObjectURL(
          file
        );

      objectUrlsRef.current.add(
        objectUrl
      );

      const attachment:
        Attachment = {
          id:
            attachmentId,

          url:
            objectUrl,

          name:
            name ||
            file.name,

          type:
            file.type.startsWith(
              "image/"
            )
              ? "image"
              : "pdf",

          uploaded_at:
            new Date().toISOString(),
        };

      setLocalFiles(
        (
          previous
        ) => [
          ...previous,

          {
            attachmentId,
            file,
            objectUrl,
          },
        ]
      );

      setFormData(
        (
          previous
        ) => {
          if (
            !previous
          ) {
            return previous;
          }

          return {
            ...previous,

            attachments: [
              ...previous.attachments,

              attachment,
            ],
          };
        }
      );

      trigger(
        "vibrate"
      );
    };

  const handleFileSelect =
    (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      Array.from(
        event.target.files ||
          []
      ).forEach(
        (
          file
        ) =>
          addLocalFile(
            file
          )
      );

      event.target.value =
        "";
    };

  const handleCameraCapture =
    (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[
          0
        ];

      if (
        file
      ) {
        addLocalFile(
          file,
          `foto_saude_${Date.now()}.jpg`
        );
      }

      event.target.value =
        "";
    };

  const removeAttachment =
    (
      attachmentId:
        string
    ) => {
      const local =
        localFiles.find(
          (
            item
          ) =>
            item.attachmentId ===
            attachmentId
        );

      if (
        local
      ) {
        URL.revokeObjectURL(
          local.objectUrl
        );

        objectUrlsRef.current.delete(
          local.objectUrl
        );

        setLocalFiles(
          (
            previous
          ) =>
            previous.filter(
              (
                item
              ) =>
                item.attachmentId !==
                attachmentId
            )
        );
      }

      setFormData(
        (
          previous
        ) => {
          if (
            !previous
          ) {
            return previous;
          }

          return {
            ...previous,

            attachments:
              previous.attachments.filter(
                (
                  attachment
                ) =>
                  attachment.id !==
                  attachmentId
              ),
          };
        }
      );

      trigger(
        "vibrate"
      );
    };

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validateFields =
    (
      nextErrors:
        Record<string, string>
    ) => {
      if (
        !formData
      ) {
        return;
      }

      fields.forEach(
        (
          field
        ) => {
          const value =
            getMetadataString(
              formData.metadata,
              field.key
            ).trim();

          if (
            field.required &&
            !value
          ) {
            nextErrors[
              field.key
            ] =
              `${field.label} é obrigatório.`;

            return;
          }

          if (
            field.type ===
              "date" &&
            value &&
            !parseDateToISO(
              value
            )
          ) {
            nextErrors[
              field.key
            ] =
              `${field.label} possui uma data inválida.`;
          }
        }
      );
    };

  const validateCustomFields =
    (
      nextErrors:
        Record<string, string>
    ) => {
      const conflict =
        getCustomFieldConflict(
          customFields,
          officialMetadataKeys
        );

      if (
        conflict
      ) {
        nextErrors.custom_fields =
          conflict;
      }
    };

  const validateStep =
    (
      step:
        number
    ): boolean => {
      if (
        !formData
      ) {
        return false;
      }

      const nextErrors:
        Record<string, string> =
        {};

      if (
        step ===
        1
      ) {
        if (
          !activePersonId
        ) {
          nextErrors.person_id =
            "Pessoa ativa não identificada.";
        }

        if (
          !formData.title.trim()
        ) {
          nextErrors.title =
            "O título é obrigatório.";
        }

        if (
          requiresCanonicalEntity(
            formData.type
          ) &&
          (
            !formData.entidade_tipo ||
            !formData.entidade_id
          ) &&
          !hasUnresolvedOriginalCanonicalRelation
        ) {
          nextErrors.entidade =
            "Selecione o registro clínico correspondente.";
        }
      }

      if (
        step ===
        2
      ) {
        validateFields(
          nextErrors
        );

        validateCustomFields(
          nextErrors
        );
      }

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length ===
        0
      );
    };

  const validateAll =
    (): boolean => {
      if (
        !formData
      ) {
        return false;
      }

      const nextErrors:
        Record<string, string> =
        {};

      if (
        !activePersonId
      ) {
        nextErrors.person_id =
          "Pessoa ativa não identificada.";
      }

      if (
        !formData.title.trim()
      ) {
        nextErrors.title =
          "O título é obrigatório.";
      }

      if (
        requiresCanonicalEntity(
          formData.type
        ) &&
        (
          !formData.entidade_tipo ||
          !formData.entidade_id
        ) &&
        !hasUnresolvedOriginalCanonicalRelation
      ) {
        nextErrors.entidade =
          "O vínculo clínico é obrigatório.";
      }

      validateFields(
        nextErrors
      );

      validateCustomFields(
        nextErrors
      );

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length ===
        0
      );
    };

  // ==========================================================
  // STEPS
  // ==========================================================

  const nextStep =
    () => {
      trigger(
        "vibrate"
      );

      if (
        !validateStep(
          currentStep
        )
      ) {
        trigger(
          "error"
        );

        return;
      }

      setSlideDirection(
        1
      );

      setCurrentStep(
        (
          previous
        ) =>
          Math.min(
            previous +
              1,
            3
          )
      );
    };

  const prevStep =
    () => {
      trigger(
        "vibrate"
      );

      setSlideDirection(
        -1
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
    };

  // ==========================================================
  // SAVE
  // ==========================================================

  const handleSubmit =
    () => {
      if (
        !formData ||
        !document ||
        !document.id
      ) {
        return;
      }

      /*
       * Document.id é opcional no tipo geral porque o mesmo
       * modelo também representa objetos antes da criação.
       *
       * Nesta tela, porém, estamos editando um documento já
       * persistido. Guardar o ID aqui preserva o narrowing
       * dentro de todas as callbacks assíncronas abaixo.
       */
      const documentId =
        document.id;

      trigger(
        "vibrate"
      );

      if (
        !validateAll()
      ) {
        trigger(
          "error"
        );

        showToast(
          "Revise os campos obrigatórios.",
          "error"
        );

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

      if (
        localFiles.length >
          0 &&
        !user?.id
      ) {
        trigger(
          "error"
        );

        showToast(
          "Não foi possível preparar os novos anexos.",
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
          const uploadedUrls:
            string[] =
            [];

          try {
            setUploadProgress(
              0
            );

            const cleanMetadata:
              Record<string, string> = {
                ...formData.metadata,
              };

            fields.forEach(
              (
                field
              ) => {
                if (
                  field.type !==
                    "date"
                ) {
                  return;
                }

                const value =
                  cleanMetadata[
                    field.key
                  ];

                if (
                  !value
                ) {
                  return;
                }

                const iso =
                  parseDateToISO(
                    value
                  );

                if (
                  !iso
                ) {
                  throw new Error(
                    `Data inválida em ${field.label}.`
                  );
                }

                cleanMetadata[
                  field.key
                ] =
                  iso;
              }
            );

            customFields.forEach(
              (
                field
              ) => {
                const label =
                  field.label.trim();

                if (
                  !label
                ) {
                  return;
                }

                cleanMetadata[
                  label
                ] =
                  field.value.trim();
              }
            );

            const finalAttachments =
              [
                ...formData.attachments,
              ];

            if (
              localFiles.length >
              0
            ) {
              if (
                !user?.id
              ) {
                throw new Error(
                  "Usuário não identificado para envio dos anexos."
                );
              }

              setUploadProgress(
                5
              );

              for (
                let index =
                    0;
                index <
                localFiles.length;
                index++
              ) {
                const local =
                  localFiles[
                    index
                  ];

                const attachmentIndex =
                  finalAttachments.findIndex(
                    (
                      attachment
                    ) =>
                      attachment.id ===
                      local.attachmentId
                  );

                if (
                  attachmentIndex ===
                  -1
                ) {
                  continue;
                }

                const {
                  url,
                  error,
                } =
                  await uploadFile(
                    user.id,
                    local.file,
                    "saude"
                  );

                if (
                  error ||
                  !url
                ) {
                  throw new Error(
                    `Falha ao enviar ${local.file.name}.`
                  );
                }

                uploadedUrls.push(
                  url
                );

                finalAttachments[
                  attachmentIndex
                ] = {
                  ...finalAttachments[
                    attachmentIndex
                  ],

                  url,
                };

                setUploadProgress(
                  Math.max(
                    5,
                    Math.round(
                      (
                        (
                          index +
                          1
                        ) /
                        localFiles.length
                      ) *
                        90
                    )
                  )
                );
              }
            }

            if (
              finalAttachments.some(
                (
                  attachment
                ) =>
                  attachment.url.startsWith(
                    "blob:"
                  )
              )
            ) {
              throw new Error(
                "Existem anexos que ainda não foram enviados."
              );
            }

            const medicoId =
              hasDocumentField(
                formData.type,
                "medico_id"
              )
                ? cleanMetadata.medico_id ||
                  undefined
                : undefined;

            const hospitalId =
              hasDocumentField(
                formData.type,
                "hospital_id"
              )
                ? cleanMetadata.hospital_id ||
                  undefined
                : undefined;

            const originalRelations =
              originalRelationsRef.current;

            const nextMedicoId:
              string |
              null |
              undefined =
              medicoId
                ? medicoId
                : originalRelations.medico_id
                  ? null
                  : undefined;

            const nextHospitalId:
              string |
              null |
              undefined =
              hospitalId
                ? hospitalId
                : originalRelations.hospital_id
                  ? null
                  : undefined;

            let nextEntityType:
              string |
              null |
              undefined;

            let nextEntityId:
              string |
              null |
              undefined;

            if (
              canonicalRelationTouchedRef.current
            ) {
              if (
                formData.entidade_tipo &&
                formData.entidade_id
              ) {
                nextEntityType =
                  formData.entidade_tipo;

                nextEntityId =
                  formData.entidade_id;
              } else {
                const hadOriginalRelation =
                  Boolean(
                    originalRelations.entidade_tipo ||
                    originalRelations.entidade_id
                  );

                nextEntityType =
                  hadOriginalRelation
                    ? null
                    : undefined;

                nextEntityId =
                  hadOriginalRelation
                    ? null
                    : undefined;
              }
            } else {
              nextEntityType =
                undefined;

              nextEntityId =
                undefined;
            }

            await updateDocument(
              documentId,
              {
                type:
                  formData.type,

                title:
                  formData.title.trim(),

                description:
                  formData.description.trim() ||
                  null,

                metadata:
                  cleanMetadata,

                attachments:
                  finalAttachments,

                medico_id:
                  nextMedicoId,

                hospital_id:
                  nextHospitalId,

                entidade_tipo:
                  nextEntityType,

                entidade_id:
                  nextEntityId,
              }
            );

            // ==================================================
            // EXPIRY NOTIFICATION
            //
            // renewal_date NÃO é validade.
            //
            // Somente datas documentais realmente relacionadas
            // à expiração podem criar o agendamento.
            // ==================================================

            const expiryDate =
              formData.type ===
                "receita"
                ? cleanMetadata.expiry_date ||
                  cleanMetadata.expiration_date ||
                  cleanMetadata.validade ||
                  ""
                : "";

            if (
              formData.type ===
                "receita" &&
              expiryDate
            ) {
              try {
                await scheduleDocumentExpiryNotification(
                  documentId,
                  formData.title.trim(),
                  expiryDate,
                  "Saúde",
                  7
                );
              } catch (
                error
              ) {
                console.warn(
                  "[EditarDocumentoSaude] Documento atualizado, mas a notificação não pôde ser reagendada:",
                  error
                );
              }
            } else if (
              document.type ===
                "receita" ||
              formData.type ===
                "receita"
            ) {
              try {
                await cancelDocumentExpiryNotification(
                  documentId
                );
              } catch (
                error
              ) {
                console.warn(
                  "[EditarDocumentoSaude] Documento atualizado, mas a notificação antiga não pôde ser cancelada:",
                  error
                );
              }
            }

            localFiles.forEach(
              (
                local
              ) => {
                URL.revokeObjectURL(
                  local.objectUrl
                );

                objectUrlsRef.current.delete(
                  local.objectUrl
                );
              }
            );

            setLocalFiles(
              []
            );

            setUploadProgress(
              100
            );

            router.replace(
              `/saude/documentos/detalhes?id=${documentId}`
            );
          } catch (
            error
          ) {
            let urlsToRollback =
              [
                ...uploadedUrls,
              ];

            if (
              uploadedUrls.length >
              0
            ) {
              try {
                const persistedDocument =
                  await getDocument(
                    documentId
                  );

                const persistedUrls =
                  new Set(
                    (
                      persistedDocument?.attachments ||
                      []
                    ).map(
                      (
                        attachment
                      ) =>
                        attachment.url
                    )
                  );

                urlsToRollback =
                  uploadedUrls.filter(
                    (
                      url
                    ) =>
                      !persistedUrls.has(
                        url
                      )
                  );
              } catch (
                readError
              ) {
                console.warn(
                  "[EditarDocumentoSaude] Não foi possível confirmar o estado persistido antes do rollback:",
                  readError
                );

                urlsToRollback =
                  [];
              }
            }

            if (
              urlsToRollback.length >
              0
            ) {
              await rollbackUploadedFiles(
                urlsToRollback
              );
            }

            setUploadProgress(
              0
            );

            throw error;
          } finally {
            isSubmitLocked.current =
              false;
          }
        },
        {
          successMessage:
            "Documento atualizado com sucesso",

          errorMessage:
            "Erro ao atualizar documento",

          goBackOnSuccess:
            false,
        }
      );
    };

  // ==========================================================
  // FIELD RENDERER
  // ==========================================================

  const renderField =
    (
      field:
        DocumentField
    ) => {
      if (
        !formData
      ) {
        return null;
      }

      const label =
        field.required
          ? `${field.label} *`
          : field.label;

      if (
        field.type ===
          "select" &&
        field.options?.length
      ) {
        const currentValue =
          getMetadataString(
            formData.metadata,
            field.key
          );

        return (
          <div
            key={
              field.key
            }
            className="space-y-2"
          >
            <label className="block text-sm font-medium text-ink-primary">
              {
                label
              }
            </label>

            <div className="flex flex-wrap gap-2">
              {field.options.map(
                (
                  option
                ) => {
                  const active =
                    currentValue ===
                    option;

                  return (
                    <button
                      key={
                        option
                      }
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          handleMetadataChange(
                            field.key,
                            option
                          );
                        }
                      }
                      className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                        active
                          ? "border-ice bg-ice/12 text-ice"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      {
                        option
                      }
                    </button>
                  );
                }
              )}
            </div>

            {errors[
              field.key
            ] && (
              <p className="text-xs text-coral">
                {
                  errors[
                    field.key
                  ]
                }
              </p>
            )}
          </div>
        );
      }

      if (
        field.type ===
          "select" &&
        isEntitySelectField(
          field.key
        )
      ) {
        const FieldIcon =
          getFieldIcon(
            field.key
          );

        const value =
          getMetadataString(
            formData.metadata,
            field.key
          );

        return (
          <div
            key={
              field.key
            }
            className="space-y-2"
          >
            <label className="block text-sm font-medium text-ink-primary">
              {
                label
              }
            </label>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setActiveSelectField(
                    field
                  );
                }
              }
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-surface-raised px-4 py-3.5 text-left transition-all active:scale-[0.99] ${
                errors[
                  field.key
                ]
                  ? "border-coral/50"
                  : "border-surface-border/50 hover:border-ice/30"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    value
                      ? "bg-ice/10 text-ice"
                      : "bg-surface text-ink-muted"
                  }`}
                >
                  <FieldIcon
                    size={
                      17
                    }
                  />
                </div>

                <div className="min-w-0">
                  <p
                    className={`truncate text-sm ${
                      value
                        ? "font-medium text-ink-primary"
                        : "text-ink-muted"
                    }`}
                  >
                    {getSelectValueLabel(
                      field
                    )}
                  </p>

                  <p className="mt-0.5 text-[10px] text-ink-faint">
                    Informação deste documento
                  </p>
                </div>
              </div>

              <ChevronDown
                size={
                  16
                }
                className="shrink-0 text-ink-muted"
              />
            </button>

            {errors[
              field.key
            ] && (
              <p className="text-xs text-coral">
                {
                  errors[
                    field.key
                  ]
                }
              </p>
            )}
          </div>
        );
      }

      if (
        field.type ===
          "date"
      ) {
        return (
          <div
            key={
              field.key
            }
            className="space-y-1.5"
          >
            <label className="block text-sm font-medium text-ink-primary">
              {
                label
              }
            </label>

            <div className="relative">
              <Calendar
                size={
                  16
                }
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
              />

              <input
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                maxLength={
                  10
                }
                value={
                  formData.metadata[
                    field.key
                  ] ||
                  ""
                }
                onChange={
                  (
                    event
                  ) =>
                    handleMetadataChange(
                      field.key,
                      handleDateMask(
                        event.target.value
                      )
                    )
                }
                className={`w-full rounded-2xl border ${
                  errors[
                    field.key
                  ]
                    ? "border-coral/50"
                    : "border-surface-border/50"
                } bg-surface-raised py-3.5 pl-10 pr-4 font-mono text-sm text-ink-primary outline-none transition-colors focus:border-ice/50`}
              />
            </div>

            {errors[
              field.key
            ] && (
              <p className="text-xs text-coral">
                {
                  errors[
                    field.key
                  ]
                }
              </p>
            )}
          </div>
        );
      }

      return (
        <Input
          key={
            field.key
          }
          label={
            label
          }
          value={
            formData.metadata[
              field.key
            ] ||
            ""
          }
          onChange={
            (
              event
            ) =>
              handleMetadataChange(
                field.key,
                event.target.value
              )
          }
          placeholder={`Digite ${field.label.toLowerCase()}...`}
          required={
            field.required
          }
          error={
            errors[
              field.key
            ]
          }
        />
      );
    };

  // ==========================================================
  // INVALID / LOADING STATES
  // ==========================================================

  if (
    !id
  ) {
    return (
      <PageTransition>
        <StatePage
          title="Documento não identificado"
          description="O endereço não contém um documento válido."
          onBack={
            () =>
              router.replace(
                "/saude/documentos"
              )
          }
        />
      </PageTransition>
    );
  }

  if (
    !activePersonId
  ) {
    return (
      <PageTransition>
        <StatePage
          title="Pessoa ativa necessária"
          description="Selecione uma pessoa antes de editar documentos clínicos."
          onBack={
            () =>
              router.replace(
                "/saude/documentos"
              )
          }
        />
      </PageTransition>
    );
  }

  if (
    document ===
    null
  ) {
    return (
      <EditLoading />
    );
  }

  if (
    document ===
    undefined
  ) {
    return (
      <PageTransition>
        <StatePage
          title="Documento não encontrado"
          description="O documento não existe ou não pertence à pessoa ativa."
          onBack={
            () =>
              router.replace(
                "/saude/documentos"
              )
          }
        />
      </PageTransition>
    );
  }

  if (
    document.category_id !==
    "saude"
  ) {
    return (
      <PageTransition>
        <StatePage
          title="Documento incompatível"
          description="Este documento não pertence ao Acervo Clínico de Saúde."
          onBack={
            () =>
              router.replace(
                "/saude/documentos"
              )
          }
        />
      </PageTransition>
    );
  }

  if (
    !isHealthType(
      document.type
    )
  ) {
    return (
      <PageTransition>
        <StatePage
          title="Documento incompatível"
          description="Este arquivo não pertence aos tipos clínicos suportados por esta tela."
          onBack={
            () =>
              router.replace(
                "/saude/documentos"
              )
          }
        />
      </PageTransition>
    );
  }

  if (
    !formData
  ) {
    return (
      <EditLoading />
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] overflow-x-hidden bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input
          ref={
            fileInputRef
          }
          type="file"
          accept="image/*,application/pdf"
          multiple
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

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/88 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    if (
                      currentStep >
                      1
                    ) {
                      prevStep();
                    } else {
                      router.back();
                    }
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
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ice">
                  Acervo Clínico
                </p>

                <h1 className="mt-1 font-display text-lg font-semibold text-ink-primary">
                  {currentStep ===
                    1 &&
                    "Editar documento"}

                  {currentStep ===
                    2 &&
                    "Dados clínicos"}

                  {currentStep ===
                    3 &&
                    "Anexos e notas"}
                </h1>
              </div>
            </div>

            <div className="rounded-full border border-surface-border/40 bg-surface-raised px-3 py-1 font-mono text-xs text-ink-muted">
              {
                currentStep
              }{" "}
              / 3
            </div>
          </div>

          <div className="mx-auto mt-4 h-1 max-w-3xl overflow-hidden rounded-full bg-surface-border/40">
            <motion.div
              className="h-full bg-ice"
              animate={{
                width:
                  `${
                    (
                      currentStep /
                      3
                    ) *
                    100
                  }%`,
              }}
            />
          </div>
        </header>

        <section className="relative mx-auto max-w-3xl px-5 pt-6">
          <AnimatePresence
            initial={
              false
            }
            custom={
              slideDirection
            }
            mode="wait"
          >
            {currentStep ===
              1 && (
              <motion.div
                key="step1"
                custom={
                  slideDirection
                }
                variants={
                  slideVariants
                }
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                      <UserRound
                        size={
                          19
                        }
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                        Pessoa
                      </p>

                      <p className="mt-1 text-sm font-semibold text-ink-primary">
                        Perfil clínico atual
                      </p>

                      <p className="mt-1 text-xs leading-5 text-ink-muted">
                        A pessoa proprietária deste documento não pode ser alterada durante a edição.
                      </p>
                    </div>
                  </div>

                  {errors.person_id && (
                    <div className="mt-3 flex gap-2 rounded-2xl border border-coral/30 bg-coral/10 p-3">
                      <AlertCircle
                        size={
                          15
                        }
                        className="shrink-0 text-coral"
                      />

                      <p className="text-xs text-coral">
                        {
                          errors.person_id
                        }
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4">
                  <label className="mb-3 block text-sm font-medium text-ink-primary">
                    Tipo de documento
                  </label>

                  <button
                    type="button"
                    onClick={
                      () => {
                        trigger(
                          "vibrate"
                        );

                        setIsTypeModalOpen(
                          true
                        );
                      }
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-surface-border/50 bg-surface-raised px-4 py-4 text-left transition-all hover:border-ice/30 active:scale-[0.99]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                        <SelectedTypeIcon
                          size={
                            20
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-primary">
                          {
                            selectedTypeLabel
                          }
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
                          {
                            selectedTypeDescription
                          }
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      size={
                        17
                      }
                      className="shrink-0 text-ink-muted"
                    />
                  </button>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4">
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <CircleDot
                        size={
                          15
                        }
                        className="text-violet-400"
                      />

                      <p className="text-sm font-semibold text-ink-primary">
                        {getEntitySectionTitle(
                          formData.type
                        )}
                      </p>

                      {requiresCanonicalEntity(
                        formData.type
                      ) && (
                        <span className="text-coral">
                          *
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs leading-5 text-ink-muted">
                      Este vínculo define onde o documento aparece dentro da árvore do Acervo Clínico.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      () => {
                        trigger(
                          "vibrate"
                        );

                        setIsClinicalEntityModalOpen(
                          true
                        );
                      }
                    }
                    className={`flex w-full items-center justify-between gap-3 rounded-[22px] border bg-surface-raised px-4 py-4 text-left transition-all active:scale-[0.99] ${
                      errors.entidade
                        ? "border-coral/50"
                        : selectedClinicalEntity
                          ? "border-violet-400/30"
                          : "border-surface-border/50 hover:border-violet-400/30"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {selectedClinicalEntity &&
                      SelectedClinicalEntityIcon ? (
                        <>
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10">
                            <SelectedClinicalEntityIcon
                              size={
                                18
                              }
                              className={
                                selectedClinicalEntity.colorClass
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-primary">
                              {
                                selectedClinicalEntity.label
                              }
                            </p>

                            {selectedClinicalEntity.description && (
                              <p className="mt-0.5 truncate text-xs text-ink-muted">
                                {
                                  selectedClinicalEntity.description
                                }
                              </p>
                            )}
                          </div>
                        </>
                      ) : hasUnresolvedOriginalCanonicalRelation ? (
                        <>
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
                            <AlertTriangle
                              size={
                                18
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-medium text-amber-200">
                              Vínculo atual preservado
                            </p>

                            <p className="mt-0.5 text-[10px] leading-4 text-ink-muted">
                              O vínculo não está disponível nesta tela. Ele será mantido se você não o substituir.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink-muted">
                            <Layers3
                              size={
                                18
                              }
                            />
                          </div>

                          <p className="text-sm text-ink-muted">
                            Selecionar vínculo clínico
                          </p>
                        </>
                      )}
                    </div>

                    <ChevronRight
                      size={
                        17
                      }
                      className="shrink-0 text-ink-muted"
                    />
                  </button>

                  {formData.entidade_tipo &&
                    formData.entidade_id &&
                    !requiresCanonicalEntity(
                      formData.type
                    ) && (
                      <button
                        type="button"
                        onClick={
                          removeCanonicalEntity
                        }
                        className="mt-2 text-xs font-medium text-coral"
                      >
                        Remover vínculo
                      </button>
                    )}

                  {errors.entidade && (
                    <p className="mt-2 text-xs text-coral">
                      {
                        errors.entidade
                      }
                    </p>
                  )}

                  {clinicalEntityItems.length ===
                    0 && (
                    <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3">
                      <p className="text-xs leading-5 text-amber-300">
                        Não há registros compatíveis disponíveis para esta pessoa.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4">
                  <Input
                    label="Título do documento *"
                    placeholder={
                      titlePlaceholder
                    }
                    value={
                      formData.title
                    }
                    onChange={
                      (
                        event
                      ) => {
                        setFormData(
                          (
                            previous
                          ) =>
                            previous
                              ? {
                                  ...previous,

                                  title:
                                    event.target.value,
                                }
                              : previous
                        );

                        clearError(
                          "title"
                        );
                      }
                    }
                    error={
                      errors.title
                    }
                    required
                  />
                </div>
              </motion.div>
            )}

            {currentStep ===
              2 && (
              <motion.div
                key="step2"
                custom={
                  slideDirection
                }
                variants={
                  slideVariants
                }
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4"
              >
                {selectedClinicalEntity && (
                  <div className="rounded-[24px] border border-violet-400/20 bg-violet-400/5 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">
                      Vínculo clínico
                    </p>

                    <p className="mt-1 text-sm font-semibold text-ink-primary">
                      {
                        selectedClinicalEntity.label
                      }
                    </p>

                    <p className="mt-1 text-xs leading-5 text-ink-muted">
                      O registro acima é o vínculo principal. Os dados abaixo descrevem o documento e podem guardar snapshots de contexto.
                    </p>
                  </div>
                )}

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5">
                  {expiryWarning && (
                    <div className="mb-4 flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/8 p-4">
                      <AlertCircle
                        size={
                          18
                        }
                        className="shrink-0 text-amber-300"
                      />

                      <p className="text-xs leading-5 text-amber-200">
                        {
                          expiryWarning
                        }
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {visibleFields.map(
                      renderField
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">
                        Informações adicionais
                      </p>

                      <p className="mt-0.5 text-xs text-ink-muted">
                        {
                          customFields.length
                        }
                        /5 campos personalizados
                      </p>
                    </div>

                    {customFields.length <
                      5 && (
                      <button
                        type="button"
                        onClick={
                          addCustomField
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-ice/10 px-3 py-2 text-xs font-semibold text-ice transition-transform active:scale-95"
                      >
                        <Plus
                          size={
                            14
                          }
                        />

                        Novo campo
                      </button>
                    )}
                  </div>

                  {errors.custom_fields && (
                    <div className="mt-4 flex gap-2 rounded-2xl border border-coral/30 bg-coral/10 p-3">
                      <AlertCircle
                        size={
                          15
                        }
                        className="mt-0.5 shrink-0 text-coral"
                      />

                      <p className="text-xs leading-5 text-coral">
                        {
                          errors.custom_fields
                        }
                      </p>
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    {customFields.map(
                      (
                        field
                      ) => (
                        <div
                          key={
                            field.id
                          }
                          className="flex items-center gap-2"
                        >
                          <input
                            value={
                              field.label
                            }
                            onChange={
                              (
                                event
                              ) =>
                                updateCustomField(
                                  field.id,
                                  "label",
                                  event.target.value
                                )
                            }
                            placeholder="Título"
                            className="min-w-0 flex-1 rounded-xl border border-surface-border/50 bg-surface-raised px-3 py-2.5 text-xs text-ink-primary outline-none focus:border-ice/50"
                          />

                          <input
                            value={
                              field.value
                            }
                            onChange={
                              (
                                event
                              ) =>
                                updateCustomField(
                                  field.id,
                                  "value",
                                  event.target.value
                                )
                            }
                            placeholder="Valor"
                            className="min-w-0 flex-1 rounded-xl border border-surface-border/50 bg-surface-raised px-3 py-2.5 text-xs text-ink-primary outline-none focus:border-ice/50"
                          />

                          <button
                            type="button"
                            onClick={
                              () =>
                                removeCustomField(
                                  field.id
                                )
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral transition-colors hover:bg-coral/20"
                            aria-label="Remover campo"
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
                </div>
              </motion.div>
            )}

            {currentStep ===
              3 && (
              <motion.div
                key="step3"
                custom={
                  slideDirection
                }
                variants={
                  slideVariants
                }
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                      <Paperclip
                        size={
                          17
                        }
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-ink-primary">
                        Arquivos do documento
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                        Você pode manter, remover ou adicionar imagens e PDFs. Arquivos removidos serão limpos pelo Vault após a atualização.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="secondary"
                      onClick={
                        () =>
                          fileInputRef.current?.click()
                      }
                      disabled={
                        isSubmitting
                      }
                      className="flex items-center justify-center gap-2"
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
                      onClick={
                        () =>
                          cameraInputRef.current?.click()
                      }
                      disabled={
                        isSubmitting
                      }
                      className="flex items-center justify-center gap-2"
                    >
                      <Camera
                        size={
                          16
                        }
                      />

                      Câmera
                    </Button>
                  </div>

                  {uploadProgress >
                    0 &&
                    uploadProgress <
                      100 && (
                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs text-ink-muted">
                          <span>
                            Enviando...
                          </span>

                          <span>
                            {
                              uploadProgress
                            }
                            %
                          </span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-border/40">
                          <motion.div
                            className="h-full bg-ice"
                            animate={{
                              width:
                                `${uploadProgress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                  <div className="mt-4 space-y-2.5">
                    {formData.attachments.length ===
                    0 ? (
                      <div className="rounded-[20px] border border-dashed border-surface-border/50 px-4 py-7 text-center">
                        <Paperclip
                          size={
                            20
                          }
                          className="mx-auto text-ink-faint"
                        />

                        <p className="mt-2 text-xs text-ink-muted">
                          Nenhum arquivo anexado.
                        </p>
                      </div>
                    ) : (
                      formData.attachments.map(
                        (
                          attachment
                        ) => (
                          <div
                            key={
                              attachment.id
                            }
                            className="flex items-center gap-3 rounded-[20px] border border-surface-border/50 bg-surface-raised p-3"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface">
                              {attachment.type ===
                              "image" ? (
                                <img
                                  src={
                                    attachment.url
                                  }
                                  alt={
                                    attachment.name
                                  }
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <FileText
                                  size={
                                    18
                                  }
                                  className="text-ice"
                                />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink-primary">
                                {
                                  attachment.name
                                }
                              </p>

                              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-faint">
                                {attachment.type ===
                                "image"
                                  ? "Imagem"
                                  : "PDF"}
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={
                                isSubmitting
                              }
                              onClick={
                                () =>
                                  removeAttachment(
                                    attachment.id
                                  )
                              }
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-coral/10 hover:text-coral disabled:opacity-40"
                              aria-label={`Remover ${attachment.name}`}
                            >
                              <X
                                size={
                                  14
                                }
                              />
                            </button>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4">
                  <TextArea
                    label="Observações"
                    value={
                      formData.description
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setFormData(
                          (
                            previous
                          ) =>
                            previous
                              ? {
                                  ...previous,

                                  description:
                                    event.target.value,
                                }
                              : previous
                        )
                    }
                    placeholder="Informações complementares sobre este documento..."
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <BottomSheet
          isOpen={
            isTypeModalOpen
          }
          onClose={
            () =>
              setIsTypeModalOpen(
                false
              )
          }
          title="Tipo de documento"
        >
          <div className="max-h-[62vh] touch-pan-y overflow-y-auto overscroll-contain pr-1">
            <div className="grid grid-cols-2 gap-3 px-1 pb-4">
              {HEALTH_TYPES.map(
                (
                  type
                ) => {
                  const Icon =
                    TYPE_ICONS[
                      type
                    ];

                  const active =
                    formData.type ===
                    type;

                  return (
                    <button
                      key={
                        type
                      }
                      type="button"
                      onClick={
                        () =>
                          handleTypeChange(
                            type
                          )
                      }
                      className={`min-h-[150px] rounded-[22px] border p-4 text-left transition-all active:scale-[0.98] ${
                        active
                          ? "border-ice bg-ice/10"
                          : "border-surface-border/50 bg-surface hover:bg-surface-raised"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          active
                            ? "bg-ice/15 text-ice"
                            : "bg-surface-raised text-ink-muted"
                        }`}
                      >
                        <Icon
                          size={
                            18
                          }
                        />
                      </div>

                      <p className="mt-3 text-sm font-semibold text-ink-primary">
                        {
                          HEALTH_TYPE_LABELS[
                            type
                          ]
                        }
                      </p>

                      <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-ink-muted">
                        {
                          HEALTH_TYPE_DESCRIPTIONS[
                            type
                          ]
                        }
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </BottomSheet>

        <SelectionModal<ClinicalEntityItem>
          isOpen={
            isClinicalEntityModalOpen
          }
          onClose={
            () =>
              setIsClinicalEntityModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              trigger(
                "vibrate"
              );

              applyEntityPrefill(
                item
              );

              setIsClinicalEntityModalOpen(
                false
              );
            }
          }
          items={
            clinicalEntityItems
          }
          title={
            getEntitySectionTitle(
              formData.type
            )
          }
          placeholder="Buscar no histórico..."
          renderItem={
            (
              item
            ) => {
              const Icon =
                item.icon;

              return (
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised">
                    <Icon
                      size={
                        16
                      }
                      className={
                        item.colorClass
                      }
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-primary">
                      {
                        item.label
                      }
                    </p>

                    {item.description && (
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {
                          item.description
                        }
                      </p>
                    )}
                  </div>
                </div>
              );
            }
          }
          getItemId={
            (
              item
            ) =>
              `${item.entityType}:${item.id}`
          }
          getItemLabel={
            (
              item
            ) =>
              item.label
          }
        />

        <SelectionModal<SelectItem>
          isOpen={
            Boolean(
              activeSelectField
            )
          }
          onClose={
            () =>
              setActiveSelectField(
                null
              )
          }
          onSelect={
            (
              item
            ) => {
              if (
                !activeSelectField
              ) {
                return;
              }

              trigger(
                "vibrate"
              );

              handleMetadataChange(
                activeSelectField.key,
                item.id
              );

              setActiveSelectField(
                null
              );
            }
          }
          items={
            selectItems
          }
          title={
            activeSelectField?.label ||
            "Selecionar"
          }
          placeholder="Buscar..."
          renderItem={
            (
              item
            ) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-primary">
                  {
                    item.label
                  }
                </p>

                {item.description && (
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {
                      item.description
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
              item.id
          }
          getItemLabel={
            (
              item
            ) =>
              item.label
          }
        />

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/90 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl gap-3">
            {currentStep >
              1 && (
              <Button
                variant="secondary"
                size="lg"
                onClick={
                  prevStep
                }
                disabled={
                  isSubmitting
                }
                className="flex w-1/3 items-center justify-center"
              >
                <ChevronLeft
                  size={
                    20
                  }
                />
              </Button>
            )}

            {currentStep <
            3 ? (
              <Button
                variant="primary"
                size="lg"
                onClick={
                  nextStep
                }
                disabled={
                  isSubmitting ||
                  !activePersonId
                }
                className={`${
                  currentStep ===
                  1
                    ? "w-full"
                    : "w-2/3"
                } flex items-center justify-center gap-2`}
              >
                Próximo

                <ChevronRight
                  size={
                    18
                  }
                />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={
                  handleSubmit
                }
                disabled={
                  isSubmitting ||
                  !activePersonId
                }
                className="flex w-2/3 items-center justify-center gap-2"
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

                    Salvar alterações
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </PageTransition>
  );
}

// ============================================================
// STATE
// ============================================================

interface StatePageProps {
  title: string;
  description: string;
  onBack: () => void;
}

function StatePage({
  title,
  description,
  onBack,
}: StatePageProps) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-void px-5">
      <div className="w-full max-w-sm rounded-[30px] border border-surface-border/50 bg-surface p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
          <AlertTriangle
            size={
              22
            }
          />
        </div>

        <h1 className="mt-4 font-display text-lg font-semibold text-ink-primary">
          {
            title
          }
        </h1>

        <p className="mt-2 text-sm leading-6 text-ink-muted">
          {
            description
          }
        </p>

        <button
          type="button"
          onClick={
            onBack
          }
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-ice px-4 py-3 text-sm font-semibold text-void transition-transform active:scale-95"
        >
          <ArrowLeft
            size={
              16
            }
          />

          Voltar ao acervo
        </button>
      </div>
    </main>
  );
}

// ============================================================
// LOADING
// ============================================================

function EditLoading() {
  return (
    <main className="min-h-[100dvh] bg-void px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-3xl animate-pulse space-y-4">
        <div className="h-14 rounded-2xl bg-surface" />

        <div className="h-32 rounded-[28px] bg-surface" />

        <div className="h-40 rounded-[28px] bg-surface" />

        <div className="h-20 rounded-[28px] bg-surface" />
      </div>
    </main>
  );
}