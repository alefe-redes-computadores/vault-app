// app/novo/page.tsx

"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import type {
  LucideIcon,
} from "lucide-react";

import {
  ArrowLeft,
  Upload,
  Camera,
  X,
  Loader2,
  Save,
  Shield,
  FileText,
  Image as ImageIcon,
  ChevronRight,
  Plus,
  ChevronLeft,
  Contact,
  CreditCard,
  Scroll,
  Landmark,
  Award,
  Folder,
  Briefcase,
  Plane,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Layers3,
  CheckCircle2,
} from "lucide-react";

import {
  usePersons,
} from "@/hooks/usePersons";
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
  uploadFile,
} from "@/lib/supabase/storage";
import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";
import {
  documentsRepository,
} from "@/lib/repositories/documents";

import {
  CATEGORIES,
  DOCUMENT_FIELDS,
  type CategoryId,
  type DocumentType,
  type Attachment,
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

import {
  scheduleDocumentExpiryNotification,
} from "@/lib/notifications";

import {
  db,
} from "@/lib/db";

import {
  useLiveQuery,
} from "dexie-react-hooks";

const VAULT_CATEGORIES: CategoryId[] = [
  "pessoal",
  "empresa",
  "outros",
];

const VAULT_TYPE_CATEGORY_MAP: Record<
  string,
  CategoryId[]
> = {
  rg: ["pessoal"],
  cpf: ["pessoal"],
  cnh: ["pessoal"],
  certidao_nascimento: ["pessoal"],
  titulo_eleitor: ["pessoal"],
  certificado: ["pessoal", "empresa"],
  carteira_trabalho: ["pessoal", "empresa"],
  passaporte: ["pessoal"],
  dispensa_militar: ["pessoal"],
  credencial: ["pessoal", "empresa", "outros"],
  outro: ["pessoal", "empresa", "outros"],
};

const TYPE_ICONS: Record<
  string,
  LucideIcon
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

const TYPE_DESCRIPTIONS: Record<
  string,
  string
> = {
  rg: "Registro Geral ou C.I.N",
  cpf: "Cadastro de Pessoa Física",
  cnh: "Carteira Nacional de Habilitação",
  certidao_nascimento:
    "Certidão de Nascimento ou Casamento",
  titulo_eleitor: "Justiça Eleitoral",
  certificado:
    "Certificados, cursos e diplomas",
  carteira_trabalho:
    "CTPS física ou digital",
  passaporte:
    "Viagens internacionais",
  dispensa_militar:
    "Certificado de Alistamento ou Dispensa",
  credencial:
    "Carteirinhas, crachás e credenciais",
  outro:
    "Outros documentos customizados",
};

const DOCUMENT_TYPE_LABELS: Record<
  string,
  string
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

function handleDateMask(value: string): string {
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
  displayStr: string
): string {
  const clean = displayStr.replace(
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
  )}-${clean.slice(
    0,
    2
  )}`;
}

type LocalAttachment = {
  attachmentId: string;
  file: File;
};

export default function NovoDocumentoPage() {
  const router = useRouter();

  const { trigger } =
    useHapticFeedback();

  const { user } = useAuth();

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
    useRef<HTMLInputElement>(null);

  const cameraInputRef =
    useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] =
    useState(1);

  const [slideDirection, setSlideDirection] =
    useState(0);

  const [formData, setFormData] =
    useState({
      person_id:
        activePersonId || "",
      category_id:
        "pessoal" as CategoryId,
      type:
        "rg" as DocumentType,
      title: "",
      description: "",
      metadata:
        {} as Record<string, string>,
      attachments:
        [] as Attachment[],
      vault_id:
        undefined as
          | string
          | undefined,
    });

  const [
    customFields,
    setCustomFields,
  ] = useState<
    {
      id: string;
      label: string;
      value: string;
    }[]
  >([]);

  const [errors, setErrors] =
    useState<
      Record<string, string>
    >({});

  /**
   * Cada arquivo fica vinculado ao seu
   * attachment específico.
   */
  const [
    localFiles,
    setLocalFiles,
  ] = useState<
    LocalAttachment[]
  >([]);

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(0);

  const [
    isTypeModalOpen,
    setIsTypeModalOpen,
  ] = useState(false);

  const [
    expiryWarning,
    setExpiryWarning,
  ] = useState<string | null>(
    null
  );

  const userVaults =
    useLiveQuery(
      () =>
        db.vaults
          .where("user_id")
          .equals(user?.id || "")
          .toArray(),
      [user?.id],
      []
    ) || [];

  /**
   * Sempre que existir uma pessoa ativa,
   * ela tem prioridade no documento.
   *
   * Caso não exista pessoa ativa, usamos a
   * primeira pessoa disponível como fallback.
   */
  useEffect(() => {
    if (activePersonId) {
      setFormData((previous) => ({
        ...previous,
        person_id:
          activePersonId,
      }));

      return;
    }

    if (
      !formData.person_id &&
      persons.length > 0
    ) {
      setFormData((previous) => ({
        ...previous,
        person_id:
          persons[0].id!,
      }));
    }
  }, [
    activePersonId,
    persons,
    formData.person_id,
  ]);

  /**
   * Ao trocar o tipo de documento,
   * reconstruímos os metadados específicos.
   */
  useEffect(() => {
    const fields =
      DOCUMENT_FIELDS[
        formData.type
      ] || [];

    const newMetadata: Record<
      string,
      string
    > = {};

    fields.forEach((field) => {
      newMetadata[field.key] =
        field.type === "select" &&
        field.options?.[0]
          ? field.options[0]
          : "";
    });

    setFormData((previous) => ({
      ...previous,
      metadata:
        newMetadata,
    }));

    setExpiryWarning(null);

    setErrors((previous) => {
      const next = {
        ...previous,
      };

      fields.forEach(
        (field) => {
          delete next[field.key];
        }
      );

      return next;
    });
  }, [formData.type]);

  const availableTypes =
    useMemo(() => {
      return (
        Object.keys(
          VAULT_TYPE_CATEGORY_MAP
        ) as DocumentType[]
      ).filter((type) =>
        VAULT_TYPE_CATEGORY_MAP[
          type
        ]?.includes(
          formData.category_id
        )
      );
    }, [
      formData.category_id,
    ]);

  const fields =
    DOCUMENT_FIELDS[
      formData.type
    ] || [];

  const activePersonObj =
    persons.find(
      (person) =>
        person.id ===
        formData.person_id
    ) ||
    persons[0];

  const handleChange = <
    K extends keyof typeof formData
  >(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((previous) => ({
        ...previous,
        [field]: "",
      }));
    }
  };

  const handleMetadataChange = (
    key: string,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      metadata: {
        ...previous.metadata,
        [key]: value,
      },
    }));

    if (errors[key]) {
      setErrors((previous) => ({
        ...previous,
        [key]: "",
      }));
    }

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
        parseDateToISO(value);

      if (
        iso &&
        new Date(iso) <
          new Date()
      ) {
        setExpiryWarning(
          "Atenção: A data inserida indica que este documento já está vencido!"
        );
      } else {
        setExpiryWarning(null);
      }
    }
  };

  const addCustomField = () => {
    if (customFields.length >= 5) {
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
                  [key]: value,
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

  const addLocalFile = (
    file: File,
    type: Attachment["type"],
    name?: string
  ) => {
    if (
      file.size >
      10 * 1024 * 1024
    ) {
      trigger("error");
      alert(
        "Arquivo muito grande. O limite máximo é 10MB."
      );
      return;
    }

    const attachmentId =
      crypto.randomUUID();

    const attachment: Attachment =
      {
        id: attachmentId,
        url:
          URL.createObjectURL(
            file
          ),
        name:
          name || file.name,
        type,
        uploaded_at:
          new Date().toISOString(),
      };

    setLocalFiles(
      (previous) => [
        ...previous,
        {
          attachmentId,
          file,
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
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      addLocalFile(
        file,
        file.type.startsWith(
          "image/"
        )
          ? "image"
          : "pdf"
      );
    }

    event.target.value = "";
  };

  const handleCameraCapture = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      addLocalFile(
        file,
        "image",
        `foto_${Date.now()}.jpg`
      );
    }

    event.target.value = "";
  };

  const removeAttachment = (
    id: string
  ) => {
    const attachment =
      formData.attachments.find(
        (item) =>
          item.id === id
      );

    if (
      attachment?.url.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        attachment.url
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
            (item) =>
              item.id !== id
          ),
      })
    );

    trigger("vibrate");
  };

  const validateStep = (
    step: number
  ): boolean => {
    const newErrors: Record<
      string,
      string
    > = {};

    if (step === 1) {
      if (
        !formData.title.trim()
      ) {
        newErrors.title =
          "O título é obrigatório";
      }

      if (
        !formData.person_id
      ) {
        newErrors.person_id =
          "Selecione uma pessoa para vincular o documento";
      }
    }

    if (step === 2) {
      fields.forEach(
        (field) => {
          if (
            field.required &&
            !formData.metadata[
              field.key
            ]?.trim()
          ) {
            newErrors[
              field.key
            ] = `${field.label} é obrigatório`;
          }
        }
      );
    }

    setErrors(newErrors);

    return (
      Object.keys(
        newErrors
      ).length === 0
    );
  };

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

  const handleSubmit = () => {
    trigger("vibrate");

    const targetPersonId =
      formData.person_id ||
      activePersonId ||
      persons[0]?.id;

    if (
      !validateStep(3) ||
      !user?.id ||
      !targetPersonId
    ) {
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
          setUploadProgress(0);

          const cleanMetadata: Record<
            string,
            string
          > = {
            ...formData.metadata,
          };

          /**
           * Converte datas de DD/MM/AAAA
           * para YYYY-MM-DD antes de salvar.
           */
          fields.forEach(
            (field) => {
              if (
                field.type ===
                  "date" &&
                cleanMetadata[
                  field.key
                ]
              ) {
                const iso =
                  parseDateToISO(
                    cleanMetadata[
                      field.key
                    ]
                  );

                if (iso) {
                  cleanMetadata[
                    field.key
                  ] = iso;
                }
              }
            }
          );

          /**
           * Campos personalizados entram
           * no mesmo objeto de metadata.
           */
          customFields.forEach(
            (field) => {
              const label =
                field.label.trim();

              if (label) {
                cleanMetadata[
                  label
                ] =
                  field.value.trim();
              }
            }
          );

          let finalAttachments = [
            ...formData.attachments,
          ];

          /**
           * Upload baseado no ID do anexo,
           * nunca na posição do array.
           */
          if (
            localFiles.length > 0
          ) {
            setUploadProgress(10);

            const uploadedAttachments: Attachment[] =
              [];

            for (
              let index = 0;
              index <
              localFiles.length;
              index++
            ) {
              const {
                attachmentId,
                file,
              } = localFiles[index];

              const attachment =
                formData.attachments.find(
                  (item) =>
                    item.id ===
                    attachmentId
                );

              if (!attachment) {
                continue;
              }

              const {
                url,
                error,
              } =
                await uploadFile(
                  user.id,
                  file,
                  formData.category_id
                );

              if (error) {
                console.error(
                  "Erro no upload:",
                  error
                );
                continue;
              }

              uploadedAttachments.push(
                {
                  ...attachment,
                  url,
                }
              );

              setUploadProgress(
                Math.round(
                  ((index + 1) /
                    localFiles.length) *
                    80
                )
              );
            }

            if (
              uploadedAttachments.length >
              0
            ) {
              finalAttachments =
                formData.attachments.map(
                  (attachment) => {
                    const uploaded =
                      uploadedAttachments.find(
                        (item) =>
                          item.id ===
                          attachment.id
                      );

                    return (
                      uploaded ||
                      attachment
                    );
                  }
                );
            }

            /**
             * Revoga todos os previews locais
             * somente depois que o upload terminou.
             */
            formData.attachments.forEach(
              (attachment) => {
                if (
                  attachment.url.startsWith(
                    "blob:"
                  )
                ) {
                  URL.revokeObjectURL(
                    attachment.url
                  );
                }
              }
            );

            setLocalFiles([]);
            setUploadProgress(100);
          }

          await documentsRepository.create(
            {
              user_id:
                user.id,
              person_id:
                targetPersonId,
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

          /**
           * Agenda aviso de vencimento quando
           * existe uma data válida.
           */
          if (
            cleanMetadata.expiry_date
          ) {
            await scheduleDocumentExpiryNotification(
              crypto.randomUUID(),
              formData.title.trim(),
              cleanMetadata.expiry_date,
              CATEGORIES[
                formData
                  .category_id
              ].name,
              30
            );
          }

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

  const SelectedTypeIcon =
    TYPE_ICONS[
      formData.type
    ] || Folder;

  return (
    <PageTransition>
      <main className="min-h-[100dvh] overflow-x-hidden bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={
            handleFileSelect
          }
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={
            handleCameraCapture
          }
        />

        <header className="sticky top-0 z-25 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
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
                  Vault Pessoal
                </p>

                <h1 className="mt-1 font-display text-lg font-semibold text-ink-primary">
                  {currentStep ===
                    1 &&
                    "Identificação"}

                  {currentStep ===
                    2 &&
                    "Campos Específicos"}

                  {currentStep ===
                    3 &&
                    "Anexos & Notas"}
                </h1>
              </div>
            </div>

            <div className="shrink-0 rounded-full border border-surface-border/40 bg-surface-raised px-3 py-1 text-xs font-mono font-medium text-ink-muted">
              {currentStep} / 3
            </div>
          </div>

          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-border/40">
            <motion.div
              className="h-full bg-ice"
              initial={{
                width: "33%",
              }}
              animate={{
                width: `${
                  (currentStep /
                    3) *
                  100
                }%`,
              }}
              transition={{
                duration: 0.3,
              }}
            />
          </div>
        </header>

        <section className="relative h-full px-5 pt-6">
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
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ice/10 text-ice">
                      <CheckCircle2
                        size={16}
                      />
                    </div>

                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                        Vinculado ao perfil
                      </p>

                      <p className="text-xs font-bold text-ink-primary">
                        {activePersonObj?.name ||
                          "Perfil Padrão"}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-lg bg-ice/10 px-2 py-1 text-[10px] font-medium text-ice">
                    Automático
                  </span>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <p className="mb-3 text-sm font-medium text-ink-primary">
                    Categoria{" "}
                    <span className="text-coral">
                      *
                    </span>
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {VAULT_CATEGORIES.map(
                      (
                        categoryId
                      ) => {
                        const category =
                          CATEGORIES[
                            categoryId
                          ];

                        if (
                          !category
                        ) {
                          return null;
                        }

                        const isActive =
                          formData.category_id ===
                          category.id;

                        return (
                          <button
                            type="button"
                            key={
                              category.id
                            }
                            onClick={() => {
                              trigger(
                                "vibrate"
                              );

                              handleChange(
                                "category_id",
                                category.id
                              );

                              const validTypes =
                                (
                                  Object.keys(
                                    VAULT_TYPE_CATEGORY_MAP
                                  ) as DocumentType[]
                                ).filter(
                                  (
                                    type
                                  ) =>
                                    VAULT_TYPE_CATEGORY_MAP[
                                      type
                                    ]?.includes(
                                      category.id
                                    )
                                );

                              if (
                                !validTypes.includes(
                                  formData.type
                                ) &&
                                validTypes[0]
                              ) {
                                handleChange(
                                  "type",
                                  validTypes[0]
                                );
                              }
                            }}
                            className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                              isActive
                                ? "border-ice bg-ice/12 text-ice"
                                : "border-surface-border/50 bg-surface-raised text-ink-muted"
                            }`}
                          >
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
                  <label className="mb-2 block text-sm font-medium text-ink-primary">
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
                    className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left text-ink-primary transition-colors hover:border-ice/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        <SelectedTypeIcon
                          size={18}
                        />
                      </div>

                      <span className="font-semibold">
                        {DOCUMENT_TYPE_LABELS[
                          formData
                            .type
                        ] ||
                          "Selecionar tipo..."}
                      </span>
                    </div>

                    <ChevronRight
                      size={16}
                      className="text-ink-muted"
                    />
                  </button>
                </div>

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <Input
                    label="Título do documento *"
                    placeholder="Ex: Minha CNH, RG, Contrato de Aluguel..."
                    value={
                      formData.title
                    }
                    onChange={(
                      event
                    ) =>
                      handleChange(
                        "title",
                        event.target
                          .value
                      )
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
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice">
                      <Layers3
                        size={18}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-ink-primary">
                        Metadados e Campos Obrigatórios
                      </p>

                      <p className="text-xs text-ink-muted">
                        Preencha conforme o documento oficial.
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
                        size={20}
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
                      (field) => {
                        if (
                          formData.type ===
                            "rg" &&
                          field.key ===
                            "rg_number" &&
                          formData
                            .metadata
                            .modelo ===
                            "C.I.N (Nova Identidade)"
                        ) {
                          return null;
                        }

                        if (
                          field.type ===
                            "select" &&
                          field.options
                        ) {
                          return (
                            <div
                              key={
                                field.key
                              }
                            >
                              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                                {
                                  field.label
                                }
                              </label>

                              <div className="flex flex-wrap gap-2">
                                {field.options.map(
                                  (
                                    option: string
                                  ) => {
                                    const isActive =
                                      formData
                                        .metadata[
                                        field
                                          .key
                                      ] ===
                                      option;

                                    return (
                                      <button
                                        type="button"
                                        key={
                                          option
                                        }
                                        onClick={() =>
                                          handleMetadataChange(
                                            field.key,
                                            option
                                          )
                                        }
                                        className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all ${
                                          isActive
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
                                field
                                  .key
                              ] && (
                                <p className="mt-1 text-xs text-coral">
                                  {
                                    errors[
                                      field
                                        .key
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
                                  field.label
                                }{" "}
                                {field.required && (
                                  <span className="text-coral">
                                    *
                                  </span>
                                )}
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
                                  placeholder="DD/MM/AAAA"
                                  maxLength={
                                    10
                                  }
                                  value={
                                    formData
                                      .metadata[
                                      field
                                        .key
                                    ] ||
                                    ""
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
                                      field
                                        .key
                                    ]
                                      ? "border-coral/50"
                                      : "border-surface-border/50"
                                  } bg-surface-raised py-3.5 pl-10 pr-4 font-mono text-sm text-ink-primary outline-none focus:border-ice/50`}
                                />
                              </div>

                              {errors[
                                field.key
                              ] && (
                                <p className="ml-1 text-xs text-coral">
                                  {
                                    errors[
                                      field
                                        .key
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
                              field.label
                            }
                            type="text"
                            value={
                              formData
                                .metadata[
                                field
                                  .key
                              ] ||
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              handleMetadataChange(
                                field.key,
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder={`Digite ${field.label.toLowerCase()}...`}
                            required={
                              field.required
                            }
                            error={
                              errors[
                                field
                                  .key
                              ]
                            }
                          />
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">
                        Campos Adicionais
                      </p>

                      <p className="text-xs text-ink-muted">
                        Adicione até 5 campos customizados (
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
                          size={14}
                        />
                        Novo Campo
                      </button>
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {customFields.map(
                      (field) => (
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
                            height: "auto",
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
                              placeholder="Título (ex: Órgão)"
                              value={
                                field.label
                              }
                              onChange={(
                                event
                              ) =>
                                updateCustomField(
                                  field.id,
                                  "label",
                                  event
                                    .target
                                    .value
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
                                  event
                                    .target
                                    .value
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
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="space-y-4"
              >
                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-ink-primary">
                      Anexos Físicos
                    </label>

                    <p className="mt-1 text-xs text-ink-muted">
                      Digitalize pela câmera ou envie um arquivo em PDF/Imagem.
                    </p>
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
                        size={16}
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
                        size={16}
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
                          className="mt-4 flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3.5 py-3"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-border/40 bg-surface">
                            {attachment.type ===
                            "image" ? (
                              <ImageIcon
                                className="text-ice"
                                size={
                                  16
                                }
                              />
                            ) : (
                              <FileText
                                className="text-ice"
                                size={
                                  16
                                }
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
                            onClick={() =>
                              removeAttachment(
                                attachment.id
                              )
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink-primary"
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

                <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <TextArea
                    label="Notas extras / Observações (Opcional)"
                    placeholder="Ex: Cópia autenticada guardada na pasta principal..."
                    value={
                      formData.description
                    }
                    onChange={(
                      event
                    ) =>
                      handleChange(
                        "description",
                        event
                          .target
                          .value
                      )
                    }
                  />
                </div>

                {userVaults.length >
                  0 && (
                  <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                    <label className="mb-3 block text-sm font-medium text-ink-primary">
                      Compartilhar com cofre (Opcional)
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );

                          handleChange(
                            "vault_id",
                            undefined
                          );
                        }}
                        className={`rounded-full border px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                          formData.vault_id ===
                          undefined
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted"
                        }`}
                      >
                        Nenhum
                      </button>

                      {userVaults.map(
                        (
                          vault: Vault
                        ) => {
                          const isSelected =
                            formData.vault_id ===
                            vault.id;

                          return (
                            <button
                              type="button"
                              key={
                                vault.id
                              }
                              onClick={() => {
                                trigger(
                                  "vibrate"
                                );

                                if (
                                  vault.id
                                ) {
                                  handleChange(
                                    "vault_id",
                                    vault.id
                                  );
                                }
                              }}
                              className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                                isSelected
                                  ? "border-ice bg-ice/12 text-ice"
                                  : "border-surface-border/50 bg-surface-raised text-ink-muted"
                              }`}
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
          <p className="mb-4 px-1 text-sm text-ink-muted">
            Escolha o tipo para carregar os campos específicos corretos
          </p>

          <div className="grid grid-cols-2 gap-3 px-1 pb-4">
            {availableTypes.map(
              (type) => {
                const Icon =
                  TYPE_ICONS[
                    type
                  ] || Folder;

                const isActive =
                  formData.type ===
                  type;

                return (
                  <motion.button
                    type="button"
                    whileTap={{
                      scale: 0.95,
                    }}
                    key={type}
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      handleChange(
                        "type",
                        type
                      );

                      setIsTypeModalOpen(
                        false
                      );
                    }}
                    className={`relative flex flex-col items-start rounded-[22px] border p-4 text-left transition-all ${
                      isActive
                        ? "border-ice bg-ice/10"
                        : "border-surface-border/50 bg-surface hover:bg-surface-raised"
                    }`}
                  >
                    <div
                      className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${
                        isActive
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
                      className={`mb-1 text-sm font-semibold ${
                        isActive
                          ? "text-ice"
                          : "text-ink-primary"
                      }`}
                    >
                      {
                        DOCUMENT_TYPE_LABELS[
                          type
                        ]
                      }
                    </span>

                    <span className="line-clamp-2 text-[11px] leading-tight text-ink-muted">
                      {
                        TYPE_DESCRIPTIONS[
                          type
                        ]
                      }
                    </span>
                  </motion.button>
                );
              }
            )}
          </div>
        </BottomSheet>

        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
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
                size={20}
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
                size={18}
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
                    size={16}
                    className="animate-spin"
                  />
                  Salvando...
                </>
              ) : (
                <>
                  <Save
                    size={16}
                  />
                  Finalizar Documento
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </PageTransition>
  );
}