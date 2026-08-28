// app/saude/documentos/novo/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import type { LucideIcon } from "lucide-react";

import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Droplets,
  FileOutput,
  FileText,
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
  Upload,
  UserRound,
  X,
} from "lucide-react";

import { db } from "@/lib/db";
import { uploadFile } from "@/lib/supabase/storage";
import { documentsRepository } from "@/lib/repositories/documents";
import {
  scheduleDocumentExpiryNotification,
} from "@/lib/notifications";

import { usePersons } from "@/hooks/usePersons";
import { useAuth } from "@/hooks/useAuth";
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
  DOCUMENT_FIELDS,
  type Attachment,
  type DocumentField,
  type DocumentType,
  type Person,
} from "@/lib/types";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import {
  PageTransition,
} from "@/components/PageTransition";
import {
  BottomSheet,
} from "@/components/ui/BottomSheet";
import {
  SelectionModal,
} from "@/components/SelectionModal";
import { useToast } from "@/components/ToastProvider";

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
// TIPOS LOCAIS
// ============================================================

interface FormData {
  person_id: string;
  type: HealthDocumentType;
  title: string;
  description: string;
  metadata: Record<string, string>;
  attachments: Attachment[];
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
// CONFIGURAÇÃO DOS DOCUMENTOS CLÍNICOS
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
    "Registro de Consulta",

  cirurgia:
    "Relatório de Cirurgia",

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
    "Prescrição de medicamentos, posologia, médico responsável e validade.",

  prontuario:
    "Histórico clínico, evolução, registros de atendimento e informações do prontuário.",

  laudo:
    "Conclusões médicas, pareceres, avaliações clínicas e documentos diagnósticos.",

  encaminhamento:
    "Encaminhamento entre profissionais, especialistas, serviços ou unidades de saúde.",

  consulta:
    "Registro de atendimento com médico, local, data e informações da consulta.",

  cirurgia:
    "Documentos do procedimento cirúrgico, equipe, hospital, datas e acompanhamento.",

  exame_sangue:
    "Resultados laboratoriais, hemogramas, análises clínicas e documentos do laboratório.",

  exame_imagem:
    "Laudos e arquivos de raio-X, ultrassom, tomografia, ressonância e outros exames.",
};

const TYPE_TITLE_PLACEHOLDERS: Record<
  HealthDocumentType,
  string
> = {
  receita:
    "Ex: Receita Neurologia — Agosto 2026",

  prontuario:
    "Ex: Prontuário — Clínica Central",

  laudo:
    "Ex: Laudo Neurológico",

  encaminhamento:
    "Ex: Encaminhamento para Cardiologia",

  consulta:
    "Ex: Consulta com Dr. João — 28/08/2026",

  cirurgia:
    "Ex: Relatório da Cirurgia",

  exame_sangue:
    "Ex: Hemograma Completo — Agosto 2026",

  exame_imagem:
    "Ex: Ressonância Magnética do Joelho",
};

const TYPE_ICONS: Record<
  HealthDocumentType,
  LucideIcon
> = {
  receita: Pill,
  prontuario: Heart,
  laudo: FileText,
  encaminhamento: FileOutput,
  consulta: Stethoscope,
  cirurgia: Activity,
  exame_sangue: Droplets,
  exame_imagem: ImageIcon,
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),

  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },

  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

// ============================================================
// HELPERS
// ============================================================

function getMetadataString(
  metadata: Record<string, string>,
  key: string
): string {
  return metadata[key] || "";
}

function buildMetadataForType(
  type: HealthDocumentType
): Record<string, string> {
  const metadata: Record<
    string,
    string
  > = {};

  DOCUMENT_FIELDS[
    type
  ].forEach((field) => {
    metadata[field.key] =
      field.type ===
        "select" &&
      field.options?.[0]
        ? field.options[0]
        : "";
  });

  return metadata;
}

function belongsToPerson(
  entityPersonId:
    | string
    | undefined,
  personId: string
): boolean {
  if (!personId) {
    return true;
  }

  /*
   * Compatibilidade temporária com
   * medicamentos legados sem person_id.
   */
  return (
    !entityPersonId ||
    entityPersonId === personId
  );
}

function isEntitySelectField(
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
  ].includes(key);
}

function getFieldIcon(
  key: string
): LucideIcon {
  switch (key) {
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
  value: string
): string {
  const clean = value
    .replace(/\D/g, "")
    .slice(0, 8);

  if (clean.length > 4) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(
      2,
      4
    )}/${clean.slice(4)}`;
  }

  if (clean.length > 2) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(2)}`;
  }

  return clean;
}

function parseDateToISO(
  displayValue: string
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

  if (clean.length !== 8) {
    return "";
  }

  return `${clean.slice(
    4,
    8
  )}-${clean.slice(
    2,
    4
  )}-${clean.slice(0, 2)}`;
}

function isSupportedFile(
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

function hasDocumentField(
  type: HealthDocumentType,
  key: string
): boolean {
  return DOCUMENT_FIELDS[
    type
  ].some(
    (field) =>
      field.key === key
  );
}

// ============================================================
// PÁGINA
// ============================================================

export default function NovoDocumentoSaudePage() {
  const router = useRouter();

  const { trigger } =
    useHapticFeedback();

  const { showToast } =
    useToast();

  const { user } =
    useAuth();

  const {
    activePersonId,
  } = useActivePersonId();

  const persons =
    usePersons() as Person[];

  const {
    run,
    isSubmitting,
  } = useSubmitAction();

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

  const objectUrlsRef =
    useRef<Set<string>>(
      new Set()
    );

  // ==========================================================
  // ESTADO
  // ==========================================================

  const [
    currentStep,
    setCurrentStep,
  ] = useState(1);

  const [
    slideDirection,
    setSlideDirection,
  ] = useState(0);

  const [
    isTypeModalOpen,
    setIsTypeModalOpen,
  ] = useState(false);

  const [
    activeSelectField,
    setActiveSelectField,
  ] =
    useState<DocumentField | null>(
      null
    );

  const [
    expiryWarning,
    setExpiryWarning,
  ] = useState<string | null>(
    null
  );

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(0);

  const [
    errors,
    setErrors,
  ] = useState<
    Record<string, string>
  >({});

  const [
    customFields,
    setCustomFields,
  ] = useState<CustomField[]>(
    []
  );

  const [
    localFiles,
    setLocalFiles,
  ] = useState<
    LocalAttachment[]
  >([]);

  const [
    formData,
    setFormData,
  ] = useState<FormData>({
    person_id:
      activePersonId || "",

    type:
      "receita",

    title: "",

    description: "",

    metadata:
      buildMetadataForType(
        "receita"
      ),

    attachments: [],
  });

  // ==========================================================
  // PESSOA INICIAL
  // ==========================================================

  useEffect(() => {
    if (formData.person_id) {
      return;
    }

    if (activePersonId) {
      setFormData(
        (previous) => ({
          ...previous,
          person_id:
            activePersonId,
        })
      );

      return;
    }

    const firstPerson =
      persons.find(
        (person) =>
          Boolean(person.id)
      );

    if (firstPerson?.id) {
      setFormData(
        (previous) => ({
          ...previous,
          person_id:
            firstPerson.id!,
        })
      );
    }
  }, [
    activePersonId,
    formData.person_id,
    persons,
  ]);

  // ==========================================================
  // LIMPEZA DE OBJECT URL
  // ==========================================================

  useEffect(() => {
    const urls =
      objectUrlsRef.current;

    return () => {
      urls.forEach(
        (url) => {
          URL.revokeObjectURL(
            url
          );
        }
      );

      urls.clear();
    };
  }, []);

  // ==========================================================
  // DADOS RELACIONAIS
  // ==========================================================

  const relationData =
    useLiveQuery(
      async () => {
        const [
          medicos,
          hospitais,
          locais,
          farmacias,
          medicamentos,
        ] = await Promise.all([
          db.medicos.toArray(),
          db.hospitais.toArray(),
          db.locais.toArray(),
          db.farmacias.toArray(),
          db.medicamentos.toArray(),
        ]);

        const personId =
          formData.person_id;

        return {
          /*
           * Médicos, hospitais, locais e
           * farmácias são cadastros globais
           * do usuário.
           */
          medicos:
            medicos.sort(
              (a, b) =>
                a.nome.localeCompare(
                  b.nome,
                  "pt-BR"
                )
            ),

          hospitais:
            hospitais.sort(
              (a, b) =>
                a.nome.localeCompare(
                  b.nome,
                  "pt-BR"
                )
            ),

          locais:
            locais.sort(
              (a, b) =>
                a.nome.localeCompare(
                  b.nome,
                  "pt-BR"
                )
            ),

          farmacias:
            farmacias.sort(
              (a, b) =>
                a.nome.localeCompare(
                  b.nome,
                  "pt-BR"
                )
            ),

          /*
           * Medicamentos pertencem à pessoa.
           */
          medicamentos:
            medicamentos
              .filter(
                (item) =>
                  belongsToPerson(
                    item.person_id,
                    personId
                  )
              )
              .sort(
                (a, b) =>
                  a.nome.localeCompare(
                    b.nome,
                    "pt-BR"
                  )
              ),
        };
      },
      [formData.person_id]
    );

  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const fields =
    DOCUMENT_FIELDS[
      formData.type
    ] || [];

  const selectedPerson =
    persons.find(
      (person) =>
        person.id ===
        formData.person_id
    );

  const SelectedTypeIcon =
    TYPE_ICONS[
      formData.type
    ];

  const selectedTypeLabel =
    HEALTH_TYPE_LABELS[
      formData.type
    ];

  const selectedTypeDescription =
    HEALTH_TYPE_DESCRIPTIONS[
      formData.type
    ];

  const titlePlaceholder =
    TYPE_TITLE_PLACEHOLDERS[
      formData.type
    ];

  // ==========================================================
  // OPTIONS DOS SELECTS
  // ==========================================================

  const selectItems =
    useMemo<SelectItem[]>(
      () => {
        if (
          !activeSelectField
        ) {
          return [];
        }

        if (
          activeSelectField
            .options?.length
        ) {
          return activeSelectField.options.map(
            (option) => ({
              id: option,
              label: option,
            })
          );
        }

        if (!relationData) {
          return [];
        }

        switch (
          activeSelectField.key
        ) {
          case "medicamento_id":
            return relationData.medicamentos
              .filter(
                (item) =>
                  Boolean(item.id)
              )
              .map((item) => ({
                id: item.id!,
                label:
                  item.nome,
                description:
                  item.dosagem ||
                  undefined,
              }));

          case "medico_id":
          case "from_medico_id":
          case "to_medico_id":
            return relationData.medicos
              .filter(
                (item) =>
                  Boolean(item.id)
              )
              .map((item) => ({
                id: item.id!,
                label:
                  item.nome,
                description:
                  item.especialidade ||
                  item.crm ||
                  undefined,
              }));

          case "hospital_id":
            return relationData.hospitais
              .filter(
                (item) =>
                  Boolean(item.id)
              )
              .map((item) => ({
                id: item.id!,
                label:
                  item.nome,
                description:
                  item.tipo ||
                  item.endereco ||
                  undefined,
              }));

          case "local_id":
            return relationData.locais
              .filter(
                (item) =>
                  Boolean(item.id)
              )
              .map((item) => ({
                id: item.id!,
                label:
                  item.nome,
                description:
                  item.tipo ||
                  item.endereco ||
                  undefined,
              }));

          case "farmacia_id":
            return relationData.farmacias
              .filter(
                (item) =>
                  Boolean(item.id)
              )
              .map((item) => ({
                id: item.id!,
                label:
                  item.nome,
                description:
                  item.endereco ||
                  undefined,
              }));

          default:
            return [];
        }
      },
      [
        activeSelectField,
        relationData,
      ]
    );

  const getSelectValueLabel = (
    field: DocumentField
  ): string => {
    const value =
      getMetadataString(
        formData.metadata,
        field.key
      );

    if (!value) {
      return "Selecionar";
    }

    if (
      field.options?.includes(
        value
      )
    ) {
      return value;
    }

    if (!relationData) {
      return "Carregando...";
    }

    switch (field.key) {
      case "medicamento_id":
        return (
          relationData.medicamentos.find(
            (item) =>
              item.id === value
          )?.nome ||
          "Registro não encontrado"
        );

      case "medico_id":
      case "from_medico_id":
      case "to_medico_id":
        return (
          relationData.medicos.find(
            (item) =>
              item.id === value
          )?.nome ||
          "Registro não encontrado"
        );

      case "hospital_id":
        return (
          relationData.hospitais.find(
            (item) =>
              item.id === value
          )?.nome ||
          "Registro não encontrado"
        );

      case "local_id":
        return (
          relationData.locais.find(
            (item) =>
              item.id === value
          )?.nome ||
          "Registro não encontrado"
        );

      case "farmacia_id":
        return (
          relationData.farmacias.find(
            (item) =>
              item.id === value
          )?.nome ||
          "Registro não encontrado"
        );

      default:
        return value;
    }
  };

  // ==========================================================
  // ERROS
  // ==========================================================

  const clearError = (
    key: string
  ) => {
    setErrors((previous) => {
      if (!previous[key]) {
        return previous;
      }

      const next = {
        ...previous,
      };

      delete next[key];

      return next;
    });
  };

  // ==========================================================
  // FORM
  // ==========================================================

  const handlePersonChange = (
    personId: string
  ) => {
    trigger("vibrate");

    setFormData(
      (previous) => ({
        ...previous,
        person_id:
          personId,
      })
    );

    clearError(
      "person_id"
    );
  };

  const handleTypeChange = (
    type: HealthDocumentType
  ) => {
    trigger("vibrate");

    setFormData(
      (previous) => ({
        ...previous,
        type,
        title:
          previous.title,
        metadata:
          buildMetadataForType(
            type
          ),
      })
    );

    setCustomFields([]);
    setExpiryWarning(
      null
    );
    setErrors({});
    setIsTypeModalOpen(
      false
    );
  };

  const handleMetadataChange = (
    key: string,
    value: string
  ) => {
    setFormData(
      (previous) => ({
        ...previous,
        metadata: {
          ...previous.metadata,
          [key]: value,
        },
      })
    );

    clearError(key);

    const normalizedKey =
      key.toLowerCase();

    if (
      normalizedKey.includes(
        "validade"
      ) ||
      normalizedKey.includes(
        "expiry"
      )
    ) {
      const iso =
        parseDateToISO(
          value
        );

      if (iso) {
        const expiry =
          new Date(
            `${iso}T23:59:59`
          );

        if (
          expiry <
          new Date()
        ) {
          setExpiryWarning(
            "Atenção: a data informada indica que este documento já está vencido."
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
  // CAMPOS PERSONALIZADOS
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
        (previous) => [
          ...previous,
          {
            id:
              crypto.randomUUID(),
            label: "",
            value: "",
          },
        ]
      );

      trigger("vibrate");
    };

  const updateCustomField = (
    id: string,
    key: "label" | "value",
    value: string
  ) => {
    setCustomFields(
      (previous) =>
        previous.map(
          (field) =>
            field.id === id
              ? {
                  ...field,
                  [key]:
                    value,
                }
              : field
        )
    );
  };

  const removeCustomField = (
    id: string
  ) => {
    setCustomFields(
      (previous) =>
        previous.filter(
          (field) =>
            field.id !== id
        )
    );

    trigger("vibrate");
  };

  // ==========================================================
  // ANEXOS
  // ==========================================================

  const addLocalFile = (
    file: File,
    name?: string
  ) => {
    if (
      file.size >
      10 *
        1024 *
        1024
    ) {
      trigger("error");

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
      trigger("error");

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
      (previous) => [
        ...previous,
        {
          attachmentId,
          file,
          objectUrl,
        },
      ]
    );

    setFormData(
      (previous) => ({
        ...previous,

        attachments: [
          ...previous.attachments,
          attachment,
        ],
      })
    );

    trigger("vibrate");
  };

  const handleFileSelect = (
    event:
      ChangeEvent<HTMLInputElement>
  ) => {
    const files =
      Array.from(
        event.target.files ||
          []
      );

    files.forEach(
      (file) =>
        addLocalFile(
          file
        )
    );

    event.target.value =
      "";
  };

  const handleCameraCapture = (
    event:
      ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      addLocalFile(
        file,
        `foto_saude_${Date.now()}.jpg`
      );
    }

    event.target.value =
      "";
  };

  const removeAttachment = (
    id: string
  ) => {
    const local =
      localFiles.find(
        (item) =>
          item.attachmentId ===
          id
      );

    if (local) {
      URL.revokeObjectURL(
        local.objectUrl
      );

      objectUrlsRef.current.delete(
        local.objectUrl
      );
    }

    setLocalFiles(
      (previous) =>
        previous.filter(
          (item) =>
            item.attachmentId !==
            id
        )
    );

    setFormData(
      (previous) => ({
        ...previous,

        attachments:
          previous.attachments.filter(
            (attachment) =>
              attachment.id !== id
          ),
      })
    );

    trigger("vibrate");
  };

  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  const validateStep = (
    step: number
  ): boolean => {
    const newErrors: Record<
      string,
      string
    > = {};

    if (step === 1) {
      if (
        !formData.person_id
      ) {
        newErrors.person_id =
          "Selecione uma pessoa";
      }

      if (
        !formData.title.trim()
      ) {
        newErrors.title =
          "O título é obrigatório";
      }

      if (
        !HEALTH_TYPES.includes(
          formData.type
        )
      ) {
        newErrors.type =
          "Selecione um tipo de documento de saúde válido";
      }
    }

    if (step === 2) {
      fields.forEach(
        (field) => {
          if (
            !field.required
          ) {
            return;
          }

          const value =
            getMetadataString(
              formData.metadata,
              field.key
            ).trim();

          if (!value) {
            newErrors[
              field.key
            ] =
              `${field.label} é obrigatório`;
          }
        }
      );
    }

    setErrors(
      newErrors
    );

    return (
      Object.keys(
        newErrors
      ).length === 0
    );
  };

  const validateAll =
    (): boolean => {
      const newErrors: Record<
        string,
        string
      > = {};

      if (
        !formData.person_id
      ) {
        newErrors.person_id =
          "Selecione uma pessoa";
      }

      if (
        !formData.title.trim()
      ) {
        newErrors.title =
          "O título é obrigatório";
      }

      if (
        !HEALTH_TYPES.includes(
          formData.type
        )
      ) {
        newErrors.type =
          "Tipo de documento inválido";
      }

      fields.forEach(
        (field) => {
          if (
            field.required &&
            !getMetadataString(
              formData.metadata,
              field.key
            ).trim()
          ) {
            newErrors[
              field.key
            ] =
              `${field.label} é obrigatório`;
          }
        }
      );

      setErrors(
        newErrors
      );

      return (
        Object.keys(
          newErrors
      ).length === 0
    );
  };

  // ==========================================================
  // PASSOS
  // ==========================================================

  const nextStep =
    () => {
      trigger("vibrate");

      if (
        !validateStep(
          currentStep
        )
      ) {
        trigger("error");

        return;
      }

      setSlideDirection(1);

      setCurrentStep(
        (previous) =>
          Math.min(
            previous + 1,
            3
          )
      );
    };

  const prevStep =
    () => {
      trigger("vibrate");

      setSlideDirection(-1);

      setCurrentStep(
        (previous) =>
          Math.max(
            previous - 1,
            1
          )
      );
    };

  // ==========================================================
  // SALVAR
  // ==========================================================

  const handleSubmit =
    () => {
      trigger("vibrate");

      if (
        !validateAll()
      ) {
        trigger("error");

        showToast(
          "Revise os campos obrigatórios.",
          "error"
        );

        return;
      }

      if (
        !user?.id ||
        !formData.person_id
      ) {
        trigger("error");

        showToast(
          "Não foi possível identificar o usuário ou paciente.",
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
            setUploadProgress(
              0
            );

            const cleanMetadata: Record<
              string,
              string
            > = {
              ...formData.metadata,
            };

            // ================================================
            // DATAS
            // ================================================

            fields.forEach(
              (field) => {
                if (
                  field.type !==
                    "date" ||
                  !cleanMetadata[
                    field.key
                  ]
                ) {
                  return;
                }

                const iso =
                  parseDateToISO(
                    cleanMetadata[
                      field.key
                    ]
                  );

                if (iso) {
                  cleanMetadata[
                    field.key
                  ] =
                    iso;
                }
              }
            );

            // ================================================
            // CAMPOS PERSONALIZADOS
            // ================================================

            customFields.forEach(
              (field) => {
                const label =
                  field.label.trim();

                if (!label) {
                  return;
                }

                cleanMetadata[
                  label
                ] =
                  field.value.trim();
              }
            );

            // ================================================
            // UPLOAD
            // ================================================

            const finalAttachments = [
              ...formData.attachments,
            ];

            if (
              localFiles.length >
              0
            ) {
              setUploadProgress(
                5
              );

              for (
                let index = 0;
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
                    `Falha ao enviar ${local.file.name}`
                  );
                }

                finalAttachments[
                  attachmentIndex
                ] = {
                  ...finalAttachments[
                    attachmentIndex
                  ],
                  url,
                };

                setUploadProgress(
                  Math.round(
                    ((index + 1) /
                      localFiles.length) *
                      90
                  )
                );
              }
            }

            const hasBlob =
              finalAttachments.some(
                (attachment) =>
                  attachment.url.startsWith(
                    "blob:"
                  )
              );

            if (hasBlob) {
              throw new Error(
                "Existem anexos que ainda não foram enviados."
              );
            }

            // ================================================
            // RELAÇÕES ESTRUTURAIS
            // ================================================

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

            // ================================================
            // DOCUMENTO
            // ================================================

            await documentsRepository.create(
              {
                user_id:
                  user.id,

                person_id:
                  formData.person_id,

                category_id:
                  "saude",

                type:
                  formData.type,

                title:
                  formData.title.trim(),

                description:
                  formData.description.trim() ||
                  undefined,

                metadata:
                  cleanMetadata,

                attachments:
                  finalAttachments,

                is_favorite:
                  false,

                medico_id:
                  medicoId,

                hospital_id:
                  hospitalId,
              }
            );

            // ================================================
            // VENCIMENTO
            // ================================================

            const expiryDate =
              cleanMetadata.expiry_date ||
              cleanMetadata.validade;

            if (expiryDate) {
              await scheduleDocumentExpiryNotification(
                crypto.randomUUID(),
                formData.title.trim(),
                expiryDate,
                "Saúde",
                7
              );
            }

            // ================================================
            // LIMPEZA
            // ================================================

            localFiles.forEach(
              (local) => {
                URL.revokeObjectURL(
                  local.objectUrl
                );

                objectUrlsRef.current.delete(
                  local.objectUrl
                );
              }
            );

            setLocalFiles([]);

            setUploadProgress(
              100
            );

            router.push(
              "/saude/documentos"
            );
          } finally {
            isSubmitLocked.current =
              false;
          }
        },
        {
          successMessage:
            "Documento de saúde salvo com sucesso",

          errorMessage:
            "Erro ao salvar documento de saúde",

          goBackOnSuccess:
            false,
        }
      );
    };

  // ==========================================================
  // RENDER DO CAMPO
  // ==========================================================

  const renderField = (
    field: DocumentField
  ) => {
    const label =
      field.required
        ? `${field.label} *`
        : field.label;

    // ========================================================
    // SELECT ESTÁTICO
    // ========================================================

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
            {label}
          </label>

          <div className="flex flex-wrap gap-2">
            {field.options.map(
              (option) => {
                const active =
                  currentValue ===
                  option;

                return (
                  <button
                    key={
                      option
                    }
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      handleMetadataChange(
                        field.key,
                        option
                      );
                    }}
                    className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                      active
                        ? "border-ice bg-ice/12 text-ice"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted"
                    }`}
                  >
                    {option}
                  </button>
                );
              }
            )}
          </div>

          {errors[
            field.key
          ] && (
            <p className="ml-1 text-xs text-coral">
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

    // ========================================================
    // SELECT RELACIONAL
    // ========================================================

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
            {label}
          </label>

          <button
            type="button"
            onClick={() => {
              trigger(
                "vibrate"
              );

              setActiveSelectField(
                field
              );
            }}
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
                  currentValue
                    ? "bg-ice/10 text-ice"
                    : "bg-surface text-ink-muted"
                }`}
              >
                <FieldIcon
                  size={17}
                />
              </div>

              <div className="min-w-0">
                <p
                  className={`truncate text-sm ${
                    currentValue
                      ? "font-medium text-ink-primary"
                      : "text-ink-muted"
                  }`}
                >
                  {
                    getSelectValueLabel(
                      field
                    )
                  }
                </p>

                <p className="mt-0.5 text-[10px] text-ink-faint">
                  Vincular cadastro existente no Vault
                </p>
              </div>
            </div>

            <ChevronDown
              size={16}
              className="shrink-0 text-ink-muted"
            />
          </button>

          {errors[
            field.key
          ] && (
            <p className="ml-1 text-xs text-coral">
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

    // ========================================================
    // DATA
    // ========================================================

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
            {label}
          </label>

          <div className="relative">
            <Calendar
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />

            <input
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              value={
                formData.metadata[
                  field.key
                ] || ""
              }
              onChange={(
                event
              ) =>
                handleMetadataChange(
                  field.key,
                  handleDateMask(
                    event.target
                      .value
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
            <p className="ml-1 text-xs text-coral">
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

    // ========================================================
    // TEXTO
    // ========================================================

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
          ] || ""
        }
        onChange={(
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

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
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
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
                aria-label="Voltar"
              >
                <ArrowLeft
                  size={18}
                  className="text-ink-primary"
                />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Acervo Clínico
                </p>

                <h1 className="mt-1 font-display text-lg font-semibold text-ink-primary">
                  {currentStep ===
                    1 &&
                    "Novo documento"}

                  {currentStep ===
                    2 &&
                    "Dados clínicos"}

                  {currentStep ===
                    3 &&
                    "Anexos & notas"}
                </h1>
              </div>
            </div>

            <div className="shrink-0 rounded-full border border-surface-border/40 bg-surface-raised px-3 py-1 font-mono text-xs font-medium text-ink-muted">
              {currentStep} / 3
            </div>
          </div>

          <div className="mx-auto mt-4 h-1 max-w-3xl overflow-hidden rounded-full bg-surface-border/40">
            <motion.div
              className="h-full bg-ice"
              initial={{
                width:
                  "33%",
              }}
              animate={{
                width: `${
                  (currentStep /
                    3) *
                  100
                }%`,
              }}
              transition={{
                duration:
                  0.3,
              }}
            />
          </div>
        </header>

        <section className="relative mx-auto max-w-3xl px-5 pt-6">
          <AnimatePresence
            initial={false}
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
                transition={{
                  duration:
                    0.3,
                  ease:
                    "easeInOut",
                }}
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <UserRound
                      size={15}
                      className="text-ink-muted"
                    />

                    <p className="text-sm font-medium text-ink-primary">
                      Paciente{" "}
                      <span className="text-coral">
                        *
                      </span>
                    </p>
                  </div>

                  {persons.length ===
                  0 ? (
                    <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/50 px-4 py-4 text-center">
                      <p className="text-xs text-ink-muted">
                        Nenhuma pessoa cadastrada.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {persons.map(
                        (
                          person
                        ) => {
                          if (
                            !person.id
                          ) {
                            return null;
                          }

                          const selected =
                            formData.person_id ===
                            person.id;

                          return (
                            <button
                              key={
                                person.id
                              }
                              type="button"
                              onClick={() =>
                                handlePersonChange(
                                  person.id!
                                )
                              }
                              className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                                selected
                                  ? "border-ice bg-ice/12 text-ice"
                                  : "border-surface-border/50 bg-surface-raised text-ink-muted"
                              }`}
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    person.color,
                                }}
                              />

                              {
                                person.name
                              }

                              {selected && (
                                <Check
                                  size={
                                    12
                                  }
                                />
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}

                  {errors.person_id && (
                    <p className="mt-2 text-xs text-coral">
                      {
                        errors.person_id
                      }
                    </p>
                  )}
                </div>

                <div className="relative overflow-hidden rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-ice/10 blur-3xl" />

                  <label className="mb-3 block text-sm font-medium text-ink-primary">
                    Tipo de documento{" "}
                    <span className="text-coral">
                      *
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setIsTypeModalOpen(
                        true
                      );
                    }}
                    className={`relative flex w-full items-center justify-between gap-3 rounded-[22px] border bg-surface-raised px-4 py-4 text-left transition-all active:scale-[0.99] ${
                      errors.type
                        ? "border-coral/50"
                        : "border-surface-border/50 hover:border-ice/30"
                    }`}
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

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
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

                  {errors.type && (
                    <p className="mt-2 text-xs text-coral">
                      {
                        errors.type
                      }
                    </p>
                  )}
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <Input
                    label="Título do documento *"
                    placeholder={
                      titlePlaceholder
                    }
                    value={
                      formData.title
                    }
                    onChange={(
                      event
                    ) => {
                      setFormData(
                        (
                          previous
                        ) => ({
                          ...previous,
                          title:
                            event.target.value,
                        })
                      );

                      clearError(
                        "title"
                      );
                    }}
                    error={
                      errors.title
                    }
                    required
                  />

                  {selectedPerson && (
                    <p className="mt-3 text-[11px] leading-5 text-ink-faint">
                      Este documento será vinculado a{" "}
                      <span className="font-medium text-ink-muted">
                        {
                          selectedPerson.name
                        }
                      </span>
                      .
                    </p>
                  )}
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
                transition={{
                  duration:
                    0.3,
                  ease:
                    "easeInOut",
                }}
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                      <SelectedTypeIcon
                        size={
                          19
                        }
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-ink-primary">
                        {
                          selectedTypeLabel
                        }
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                        {
                          selectedTypeDescription
                        }
                      </p>
                    </div>
                  </div>

                  {expiryWarning && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: -5,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300"
                    >
                      <AlertCircle
                        size={
                          20
                        }
                        className="shrink-0 text-amber-400"
                      />

                      <p className="text-xs font-medium leading-relaxed">
                        {
                          expiryWarning
                        }
                      </p>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    {fields.map(
                      renderField
                    )}
                  </div>
                </div>

                <div className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">
                        Informações adicionais
                      </p>

                      <p className="mt-0.5 text-xs text-ink-muted">
                        Até 5 campos personalizados (
                        {
                          customFields.length
                        }
                        /5)
                      </p>
                    </div>

                    {customFields.length <
                      5 && (
                      <button
                        type="button"
                        onClick={
                          addCustomField
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-ice/10 px-3 py-2 text-xs font-bold text-ice transition-transform active:scale-95"
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

                  <AnimatePresence initial={false}>
                    {customFields.map(
                      (
                        field
                      ) => (
                        <motion.div
                          key={
                            field.id
                          }
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
                          className="flex items-center gap-2 pt-2"
                        >
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Título"
                              value={
                                field.label
                              }
                              onChange={(
                                event
                              ) =>
                                updateCustomField(
                                  field.id,
                                  "label",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-surface-border/50 bg-surface-raised px-3.5 py-2.5 text-xs font-medium text-ink-primary outline-none focus:border-ice/50"
                            />
                          </div>

                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Valor"
                              value={
                                field.value
                              }
                              onChange={(
                                event
                              ) =>
                                updateCustomField(
                                  field.id,
                                  "value",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-surface-border/50 bg-surface-raised px-3.5 py-2.5 text-xs text-ink-primary outline-none focus:border-ice/50"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
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
                        </motion.div>
                      )
                    )}
                  </AnimatePresence>
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
                transition={{
                  duration:
                    0.3,
                  ease:
                    "easeInOut",
                }}
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                      <Paperclip
                        size={
                          17
                        }
                      />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-ink-primary">
                        Documento digital
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                        Fotografe ou anexe o documento original em imagem ou PDF.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="secondary"
                      className="flex items-center justify-center gap-2"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={
                        isSubmitting
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
                      className="flex items-center justify-center gap-2"
                      onClick={() =>
                        cameraInputRef.current?.click()
                      }
                      disabled={
                        isSubmitting
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

                  {uploadProgress >
                    0 &&
                    uploadProgress <
                      100 && (
                      <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
                          <span>
                            Enviando anexos...
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
                              width: `${uploadProgress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                  {formData.attachments
                    .length ===
                  0 ? (
                    <div className="mt-4 rounded-[20px] border border-dashed border-surface-border/50 bg-surface-raised/30 px-4 py-6 text-center">
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
                    <div className="mt-4 space-y-2.5">
                      <AnimatePresence initial={false}>
                        {formData.attachments.map(
                          (
                            attachment
                          ) => (
                            <motion.div
                              key={
                                attachment.id
                              }
                              initial={{
                                opacity: 0,
                                y: 8,
                              }}
                              animate={{
                                opacity: 1,
                                y: 0,
                              }}
                              exit={{
                                opacity: 0,
                                y: 8,
                              }}
                              className="flex items-center gap-3 rounded-[20px] border border-surface-border/50 bg-surface-raised px-3.5 py-3"
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-surface-border/40 bg-surface">
                                {attachment.type ===
                                "image" ? (
                                  <img
                                    src={
                                      attachment.url
                                    }
                                    alt={
                                      attachment.name
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <FileText
                                    size={
                                      17
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
                                onClick={() =>
                                  removeAttachment(
                                    attachment.id
                                  )
                                }
                                disabled={
                                  isSubmitting
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
                            </motion.div>
                          )
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <TextArea
                    label="Observações"
                    placeholder="Informações complementares, orientações, contexto clínico ou observações sobre o documento..."
                    value={
                      formData.description
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (
                          previous
                        ) => ({
                          ...previous,
                          description:
                            event.target.value,
                        })
                      )
                    }
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
          onClose={() =>
            setIsTypeModalOpen(
              false
            )
          }
          title="Tipo de documento de saúde"
        >
          <p className="mb-4 px-1 text-sm leading-5 text-ink-muted">
            Cada tipo possui campos e vínculos próprios para organizar melhor o acervo clínico.
          </p>

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
                    <motion.button
                      key={
                        type
                      }
                      type="button"
                      whileTap={{
                        scale:
                          0.96,
                      }}
                      onClick={() =>
                        handleTypeChange(
                          type
                        )
                      }
                      className={`relative flex min-h-[170px] flex-col items-start rounded-[22px] border p-4 text-left transition-all ${
                        active
                          ? "border-ice bg-ice/10"
                          : "border-surface-border/50 bg-surface hover:bg-surface-raised"
                      }`}
                    >
                      <div
                        className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${
                          active
                            ? "bg-ice/20 text-ice"
                            : "bg-surface-raised text-ink-muted"
                        }`}
                      >
                        <Icon
                          size={
                            20
                          }
                        />
                      </div>

                      <span
                        className={`text-sm font-semibold leading-tight ${
                          active
                            ? "text-ice"
                            : "text-ink-primary"
                        }`}
                      >
                        {
                          HEALTH_TYPE_LABELS[
                            type
                          ]
                        }
                      </span>

                      <span className="mt-2 line-clamp-3 text-[11px] leading-[1.45] text-ink-muted">
                        {
                          HEALTH_TYPE_DESCRIPTIONS[
                            type
                          ]
                        }
                      </span>
                    </motion.button>
                  );
                }
              )}
            </div>
          </div>
        </BottomSheet>

        <SelectionModal
          isOpen={Boolean(
            activeSelectField
          )}
          onClose={() =>
            setActiveSelectField(
              null
            )
          }
          onSelect={(
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
          }}
          items={
            selectItems
          }
          title={
            activeSelectField?.label ||
            "Selecionar"
          }
          placeholder="Buscar..."
          renderItem={(
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
          )}
          getItemId={(
            item
          ) =>
            item.id
          }
          getItemLabel={(
            item
          ) =>
            item.label
          }
        />

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
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
                  isSubmitting
                }
                className={`${
                  currentStep ===
                  1
                    ? "w-full"
                    : "w-2/3"
                } flex items-center justify-center gap-2 shadow-lg shadow-ice/10`}
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
                  isSubmitting
                }
                className="flex w-2/3 items-center justify-center gap-2 shadow-lg shadow-ice/10"
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

                    Salvar documento
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