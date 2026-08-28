// app/novo/page.tsx
"use client";

import {
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
import { useLiveQuery } from "dexie-react-hooks";
import type { LucideIcon } from "lucide-react";

import {
  AlertCircle,
  ArrowLeft,
  Award,
  Briefcase,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Contact,
  CreditCard,
  FileText,
  Folder,
  Landmark,
  Loader2,
  Paperclip,
  Plane,
  Plus,
  Save,
  Scroll,
  Shield,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import { db } from "@/lib/db";
import { uploadFile } from "@/lib/supabase/storage";
import {
  documentsRepository,
} from "@/lib/repositories/documents";
import {
  scheduleDocumentExpiryNotification,
} from "@/lib/notifications";

import { useAuth } from "@/hooks/useAuth";
import {
  usePersons,
} from "@/hooks/usePersons";
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
  useToast,
} from "@/components/ToastProvider";

import {
  CATEGORIES,
  DOCUMENT_FIELDS,
  TYPE_CATEGORY_MAP,
  type Attachment,
  type CategoryId,
  type DocumentField,
  type DocumentType,
  type Person,
  type Vault,
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

// ============================================================
// TIPOS LOCAIS
// ============================================================

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

// ============================================================
// CATEGORIAS DESTE FLUXO
// ============================================================

const GENERAL_CATEGORIES: CategoryId[] = [
  "pessoal",
  "empresa",
  "outros",
];

// ============================================================
// TIPOS PERMITIDOS
// ============================================================

const GENERAL_TYPE_CANDIDATES: DocumentType[] = [
  "rg",
  "cpf",
  "cnh",
  "certidao_nascimento",
  "titulo_eleitor",
  "certificado",
  "carteira_trabalho",
  "passaporte",
  "dispensa_militar",
  "credencial",
  "outro",
];

const GENERAL_TYPES: DocumentType[] =
  GENERAL_TYPE_CANDIDATES.filter(
    (type) =>
      TYPE_CATEGORY_MAP[type].some(
        (category) =>
          GENERAL_CATEGORIES.includes(
            category
          )
      )
  );

// ============================================================
// LABELS
// ============================================================

const DOCUMENT_TYPE_LABELS: Partial<
  Record<DocumentType, string>
> = {
  rg: "C.I.N / Identidade",
  cpf: "CPF",
  cnh: "CNH",
  certidao_nascimento:
    "Certidão de Nascimento",
  titulo_eleitor:
    "Título de Eleitor",
  certificado:
    "Certificado",
  carteira_trabalho:
    "Carteira de Trabalho",
  passaporte:
    "Passaporte",
  dispensa_militar:
    "Dispensa Militar",
  credencial:
    "Credencial / Carteirinha",
  outro:
    "Outro",
};

const TYPE_DESCRIPTIONS: Partial<
  Record<DocumentType, string>
> = {
  rg:
    "Registro Geral ou Carteira de Identidade Nacional.",

  cpf:
    "Cadastro de Pessoa Física.",

  cnh:
    "Carteira Nacional de Habilitação.",

  certidao_nascimento:
    "Certidão de nascimento ou outro registro civil.",

  titulo_eleitor:
    "Documento da Justiça Eleitoral.",

  certificado:
    "Certificados, diplomas, cursos e qualificações.",

  carteira_trabalho:
    "Carteira de Trabalho física ou digital.",

  passaporte:
    "Documento de identificação para viagens internacionais.",

  dispensa_militar:
    "Certificado de alistamento, reservista ou dispensa.",

  credencial:
    "Carteirinhas, crachás e credenciais de instituições.",

  outro:
    "Outros documentos pessoais, empresariais ou personalizados.",
};

const TYPE_ICONS: Partial<
  Record<DocumentType, LucideIcon>
> = {
  rg: Contact,
  cpf: FileText,
  cnh: CreditCard,
  certidao_nascimento: Scroll,
  titulo_eleitor: Landmark,
  certificado: Award,
  carteira_trabalho: Briefcase,
  passaporte: Plane,
  dispensa_militar: ShieldCheck,
  credencial: Contact,
  outro: Folder,
};

const TYPE_TITLE_PLACEHOLDERS: Partial<
  Record<DocumentType, string>
> = {
  rg:
    "Ex: Minha C.I.N",

  cpf:
    "Ex: CPF",

  cnh:
    "Ex: CNH — Categoria B",

  certidao_nascimento:
    "Ex: Certidão de Nascimento",

  titulo_eleitor:
    "Ex: Título de Eleitor",

  certificado:
    "Ex: Certificado Curso de Inglês",

  carteira_trabalho:
    "Ex: Carteira de Trabalho",

  passaporte:
    "Ex: Passaporte Brasileiro",

  dispensa_militar:
    "Ex: Certificado de Dispensa",

  credencial:
    "Ex: Carteirinha da Empresa",

  outro:
    "Ex: Contrato, declaração ou documento",
};

// ============================================================
// ANIMAÇÃO
// ============================================================

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

function isCategoryId(
  value: string | null
): value is CategoryId {
  if (!value) {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(
    CATEGORIES,
    value
  );
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

function buildMetadataForType(
  type: DocumentType
): Record<string, string> {
  const metadata: Record<
    string,
    string
  > = {};

  DOCUMENT_FIELDS[type].forEach(
    (field) => {
      metadata[field.key] =
        field.type === "select" &&
        field.options?.[0]
          ? field.options[0]
          : "";
    }
  );

  return metadata;
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

// ============================================================
// PÁGINA
// ============================================================

export default function NovoDocumentoPage() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const { user } =
    useAuth();

  const { trigger } =
    useHapticFeedback();

  const { showToast } =
    useToast();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const persons =
    usePersons() as Person[];

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

  const objectUrlsRef =
    useRef<Set<string>>(
      new Set()
    );

  // ==========================================================
  // PARÂMETROS
  // ==========================================================

  const categoryParam =
    searchParams.get(
      "categoria"
    );

  const personParam =
    searchParams.get(
      "person_id"
    );

  const requestedCategory =
    isCategoryId(
      categoryParam
    ) &&
    GENERAL_CATEGORIES.includes(
      categoryParam
    )
      ? categoryParam
      : "pessoal";

  const initialTypes =
    GENERAL_TYPES.filter(
      (type) =>
        TYPE_CATEGORY_MAP[
          type
        ].includes(
          requestedCategory
        )
    );

  const initialType =
    initialTypes[0] ||
    "outro";

  // ==========================================================
  // ESTADOS
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
    expiryWarning,
    setExpiryWarning,
  ] = useState<
    string | null
  >(null);

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
  ] = useState<
    CustomField[]
  >([]);

  const [
    localFiles,
    setLocalFiles,
  ] = useState<
    LocalAttachment[]
  >([]);

  const [
    formData,
    setFormData,
  ] = useState({
    person_id:
      personParam ||
      activePersonId ||
      "",

    category_id:
      requestedCategory,

    type:
      initialType,

    title:
      "",

    description:
      "",

    metadata:
      buildMetadataForType(
        initialType
      ),

    attachments:
      [] as Attachment[],

    vault_id:
      undefined as
        | string
        | undefined,
  });

  // ==========================================================
  // VAULTS
  // ==========================================================

  const userVaults =
    useLiveQuery(
      () => {
        if (!user?.id) {
          return [];
        }

        return db.vaults
          .where("user_id")
          .equals(user.id)
          .toArray();
      },
      [user?.id],
      []
    ) || [];

  // ==========================================================
  // PESSOA INICIAL
  // ==========================================================

  useEffect(() => {
    if (
      personParam &&
      persons.some(
        (person) =>
          person.id ===
          personParam
      )
    ) {
      setFormData(
        (previous) => ({
          ...previous,
          person_id:
            personParam,
        })
      );

      return;
    }

    if (
      formData.person_id
    ) {
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
          Boolean(
            person.id
          )
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
    personParam,
    persons,
  ]);

  // ==========================================================
  // LIMPEZA DOS PREVIEWS
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
  // DERIVADOS
  // ==========================================================

  const fields =
    DOCUMENT_FIELDS[
      formData.type
    ] || [];

  const availableTypes =
    useMemo(() => {
      return GENERAL_TYPES.filter(
        (type) =>
          TYPE_CATEGORY_MAP[
            type
          ].includes(
            formData.category_id
          )
      );
    }, [
      formData.category_id,
    ]);

  const selectedPerson =
    persons.find(
      (person) =>
        person.id ===
        formData.person_id
    );

  const SelectedTypeIcon =
    TYPE_ICONS[
      formData.type
    ] ||
    FileText;

  const selectedTypeLabel =
    DOCUMENT_TYPE_LABELS[
      formData.type
    ] ||
    "Documento";

  const selectedTypeDescription =
    TYPE_DESCRIPTIONS[
      formData.type
    ] ||
    "";

  const titlePlaceholder =
    TYPE_TITLE_PLACEHOLDERS[
      formData.type
    ] ||
    "Ex: Documento";

  // ==========================================================
  // ERROS
  // ==========================================================

  const clearError = (
    key: string
  ) => {
    setErrors((previous) => {
      if (
        !previous[key]
      ) {
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

  const handleCategoryChange = (
    categoryId:
      CategoryId
  ) => {
    if (
      !GENERAL_CATEGORIES.includes(
        categoryId
      )
    ) {
      return;
    }

    trigger("vibrate");

    setFormData(
      (previous) => {
        const currentTypeAllowed =
          TYPE_CATEGORY_MAP[
            previous.type
          ].includes(
            categoryId
          );

        if (
          currentTypeAllowed &&
          GENERAL_TYPES.includes(
            previous.type
          )
        ) {
          return {
            ...previous,
            category_id:
              categoryId,
          };
        }

        const nextType =
          GENERAL_TYPES.find(
            (type) =>
              TYPE_CATEGORY_MAP[
                type
              ].includes(
                categoryId
              )
          );

        if (!nextType) {
          return previous;
        }

        return {
          ...previous,
          category_id:
            categoryId,
          type:
            nextType,
          metadata:
            buildMetadataForType(
              nextType
            ),
        };
      }
    );

    setCustomFields([]);
    setErrors({});
    setExpiryWarning(
      null
    );
  };

  const handleTypeChange = (
    type: DocumentType
  ) => {
    if (
      !GENERAL_TYPES.includes(
        type
      )
    ) {
      return;
    }

    trigger("vibrate");

    setFormData(
      (previous) => ({
        ...previous,
        type,
        metadata:
          buildMetadataForType(
            type
          ),
      })
    );

    setCustomFields([]);
    setErrors({});
    setExpiryWarning(
      null
    );
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
          [key]:
            value,
        },
      })
    );

    clearError(key);

    const normalized =
      key.toLowerCase();

    if (
      normalized.includes(
        "validade"
      ) ||
      normalized.includes(
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
  // CAMPOS EXTRAS
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
            label:
              "",
            value:
              "",
          },
        ]
      );

      trigger("vibrate");
    };

  const updateCustomField = (
    id: string,
    key:
      | "label"
      | "value",
    value: string
  ) => {
    setCustomFields(
      (previous) =>
        previous.map(
          (field) =>
            field.id ===
            id
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
            field.id !==
            id
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
        `foto_${Date.now()}.jpg`
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
            (
              attachment
            ) =>
              attachment.id !==
              id
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
        !GENERAL_TYPES.includes(
          formData.type
        )
      ) {
        newErrors.type =
          "Tipo de documento inválido";
      }
    }

    if (step === 2) {
      fields.forEach(
        (
          field: DocumentField
        ) => {
          if (
            field.required &&
            !formData.metadata[
              field.key
            ]?.trim()
          ) {
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
        !GENERAL_TYPES.includes(
          formData.type
        )
      ) {
        newErrors.type =
          "Tipo de documento inválido";
      }

      fields.forEach(
        (
          field:
            DocumentField
        ) => {
          if (
            field.required &&
            !formData.metadata[
              field.key
            ]?.trim()
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

  const nextStep = () => {
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

  const prevStep = () => {
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

  const handleSubmit = () => {
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

          fields.forEach(
            (
              field:
                DocumentField
            ) => {
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
                  formData.category_id
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
                  ((index +
                    1) /
                    localFiles.length) *
                    90
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

          await documentsRepository.create(
            {
              user_id:
                user.id,

              person_id:
                formData.person_id,

              category_id:
                formData.category_id,

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

              vault_id:
                formData.vault_id ||
                undefined,
            }
          );

          const expiryDate =
            cleanMetadata.expiry_date ||
            cleanMetadata.validade;

          if (expiryDate) {
            await scheduleDocumentExpiryNotification(
              crypto.randomUUID(),
              formData.title.trim(),
              expiryDate,
              CATEGORIES[
                formData.category_id
              ].name,
              30
            );
          }

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
            "/documentos"
          );
        } finally {
          isSubmitLocked.current =
            false;
        }
      },
      {
        successMessage:
          "Documento salvo com sucesso",

        errorMessage:
          "Erro ao salvar documento",

        goBackOnSuccess:
          false,
      }
    );
  };

  // ==========================================================
  // RENDER DE CAMPO
  // ==========================================================

  const renderField = (
    field: DocumentField
  ) => {
    if (
      formData.type ===
        "rg" &&
      field.key ===
        "rg_number" &&
      formData.metadata
        .modelo ===
        "C.I.N (Nova Identidade)"
    ) {
      return null;
    }

    if (
      field.type ===
        "select" &&
      field.options?.length
    ) {
      return (
        <div
          key={
            field.key
          }
          className="space-y-2"
        >
          <label className="block text-sm font-medium text-ink-primary">
            {field.label}

            {field.required && (
              <span className="text-coral">
                {" "}
                *
              </span>
            )}
          </label>

          <div className="flex flex-wrap gap-2">
            {field.options.map(
              (option) => {
                const active =
                  formData.metadata[
                    field.key
                  ] === option;

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
            {field.label}

            {field.required && (
              <span className="text-coral">
                {" "}
                *
              </span>
            )}
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
                    event
                      .target
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
          field.required
            ? `${field.label} *`
            : field.label
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
                  Vault
                </p>

                <h1 className="mt-1 font-display text-lg font-semibold text-ink-primary">
                  {currentStep ===
                    1 &&
                    "Identificação"}

                  {currentStep ===
                    2 &&
                    "Dados do documento"}

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
                      Pessoa *
                    </p>
                  </div>

                  {persons.length ===
                  0 ? (
                    <p className="text-xs text-ink-muted">
                      Nenhuma pessoa cadastrada.
                    </p>
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

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <p className="mb-3 text-sm font-medium text-ink-primary">
                    Categoria *
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {GENERAL_CATEGORIES.map(
                      (
                        categoryId
                      ) => {
                        const category =
                          CATEGORIES[
                            categoryId
                          ];

                        const active =
                          formData.category_id ===
                          categoryId;

                        return (
                          <button
                            key={
                              categoryId
                            }
                            type="button"
                            onClick={() =>
                              handleCategoryChange(
                                categoryId
                              )
                            }
                            className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                              active
                                ? "border-ice bg-ice/12 text-ice"
                                : "border-surface-border/50 bg-surface-raised text-ink-muted"
                            }`}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  category.color,
                              }}
                            />

                            {
                              category.name
                            }
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <label className="mb-3 block text-sm font-medium text-ink-primary">
                    Tipo de documento *
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
                    className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-surface-border/50 bg-surface-raised px-4 py-4 text-left transition-all active:scale-[0.99]"
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
                    <p className="mt-3 text-[11px] text-ink-faint">
                      Documento vinculado a{" "}
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
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ice/10 text-ice">
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
                    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300">
                      <AlertCircle
                        size={20}
                      />

                      <p className="text-xs">
                        {
                          expiryWarning
                        }
                      </p>
                    </div>
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
                        Campos adicionais
                      </p>

                      <p className="text-xs text-ink-muted">
                        Até 5 campos (
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
                        className="flex items-center gap-1.5 rounded-xl bg-ice/10 px-3 py-2 text-xs font-bold text-ice"
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

                  {customFields.map(
                    (field) => (
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
                          onChange={(
                            event
                          ) =>
                            updateCustomField(
                              field.id,
                              "label",
                              event.target.value
                            )
                          }
                          placeholder="Título"
                          className="w-full rounded-xl border border-surface-border/50 bg-surface-raised px-3 py-2.5 text-xs text-ink-primary"
                        />

                        <input
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
                          placeholder="Valor"
                          className="w-full rounded-xl border border-surface-border/50 bg-surface-raised px-3 py-2.5 text-xs text-ink-primary"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeCustomField(
                              field.id
                            )
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral"
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                      <Paperclip
                        size={
                          17
                        }
                      />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-ink-primary">
                        Anexos
                      </p>

                      <p className="text-xs text-ink-muted">
                        Imagens ou PDFs, até 10 MB por arquivo.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="secondary"
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
                      <div className="mt-4 text-xs text-ink-muted">
                        Enviando:{" "}
                        {
                          uploadProgress
                        }
                        %
                      </div>
                    )}

                  <div className="mt-4 space-y-2">
                    {formData.attachments.map(
                      (
                        attachment
                      ) => (
                        <div
                          key={
                            attachment.id
                          }
                          className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3"
                        >
                          <FileText
                            size={
                              16
                            }
                            className="text-ice"
                          />

                          <p className="min-w-0 flex-1 truncate text-sm text-ink-primary">
                            {
                              attachment.name
                            }
                          </p>

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
                          >
                            <X
                              size={
                                14
                              }
                              className="text-coral"
                            />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4">
                  <TextArea
                    label="Notas"
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

                {userVaults.length >
                  0 && (
                  <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData(
                            (
                              previous
                            ) => ({
                              ...previous,
                              vault_id:
                                undefined,
                            })
                          )
                        }
                        className="rounded-full border border-surface-border/50 px-3 py-2 text-xs text-ink-muted"
                      >
                        Nenhum cofre
                      </button>

                      {userVaults.map(
                        (
                          vault:
                            Vault
                        ) => {
                          if (
                            !vault.id
                          ) {
                            return null;
                          }

                          return (
                            <button
                              key={
                                vault.id
                              }
                              type="button"
                              onClick={() =>
                                setFormData(
                                  (
                                    previous
                                  ) => ({
                                    ...previous,
                                    vault_id:
                                      vault.id,
                                  })
                                )
                              }
                              className="flex items-center gap-1 rounded-full border border-surface-border/50 px-3 py-2 text-xs text-ink-muted"
                            >
                              <Shield
                                size={
                                  12
                                }
                              />
                              {
                                vault.name
                              }
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
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
          title="Selecionar tipo de documento"
        >
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 pb-4">
              {availableTypes.map(
                (type) => {
                  const Icon =
                    TYPE_ICONS[
                      type
                    ] ||
                    FileText;

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
                      className="flex min-h-[165px] flex-col items-start rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left"
                    >
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                        <Icon
                          size={
                            20
                          }
                        />
                      </div>

                      <p className="text-sm font-semibold text-ink-primary">
                        {
                          DOCUMENT_TYPE_LABELS[
                            type
                          ]
                        }
                      </p>

                      <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-ink-muted">
                        {
                          TYPE_DESCRIPTIONS[
                            type
                          ]
                        }
                      </p>
                    </motion.button>
                  );
                }
              )}
            </div>
          </div>
        </BottomSheet>

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
                className="w-1/3"
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
                className={
                  currentStep ===
                  1
                    ? "w-full"
                    : "w-2/3"
                }
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
                className="w-2/3"
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