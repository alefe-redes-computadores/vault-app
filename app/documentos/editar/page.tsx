// app/documentos/editar/page.tsx
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
import {
  ArrowLeft,
  Building2,
  Camera,
  Check,
  ChevronDown,
  FileText,
  FolderOpen,
  Layers3,
  Loader2,
  Paperclip,
  Save,
  Upload,
  User,
  UserRound,
  X,
} from "lucide-react";

import { uploadFile } from "@/lib/supabase/storage";

import { useAuth } from "@/hooks/useAuth";
import { usePersons } from "@/hooks/usePersons";
import {
  useDocument,
  useDocumentActions,
} from "@/hooks/useDocuments";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";

import {
  CATEGORIES,
  DOCUMENT_FIELDS,
  TYPE_CATEGORY_MAP,
  type Attachment,
  type CategoryId,
  type DocumentField,
  type DocumentType,
  type Person,
} from "@/lib/types";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";

// ============================================================
// DOMÍNIO — DOCUMENTOS PESSOAIS
// ============================================================

const GENERAL_CATEGORIES = [
  "pessoal",
  "empresa",
  "outros",
] as const satisfies readonly CategoryId[];

type GeneralCategoryId =
  (typeof GENERAL_CATEGORIES)[number];

const GENERAL_TYPES = [
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
] as const satisfies readonly DocumentType[];

type GeneralDocumentType =
  (typeof GENERAL_TYPES)[number];

// ============================================================
// TIPOS LOCAIS
// ============================================================

interface SelectItem {
  id: string;
  label: string;
  description?: string;
}

interface FormData {
  category_id: GeneralCategoryId;
  type: GeneralDocumentType;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  attachments: Attachment[];
}

interface PendingUpload {
  attachmentId: string;
  file: File;
  objectUrl: string;
}

// ============================================================
// LABELS
// ============================================================

const DOCUMENT_TYPE_LABELS: Record<
  GeneralDocumentType,
  string
> = {
  rg: "C.I.N / RG",
  cpf: "CPF",
  cnh: "CNH",
  certidao_nascimento:
    "Certidão de Nascimento",
  titulo_eleitor:
    "Título de Eleitor",
  certificado: "Certificado",
  carteira_trabalho:
    "Carteira de Trabalho",
  passaporte: "Passaporte",
  dispensa_militar:
    "Dispensa Militar",
  credencial:
    "Credencial / Carteirinha",
  outro: "Outro",
};

const CATEGORY_ICONS: Record<
  GeneralCategoryId,
  typeof User
> = {
  pessoal: User,
  empresa: Building2,
  outros: FolderOpen,
};

const sectionMotion = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
};

// ============================================================
// HELPERS
// ============================================================

function isGeneralCategory(
  value: CategoryId
): value is GeneralCategoryId {
  return (
    GENERAL_CATEGORIES as readonly CategoryId[]
  ).includes(value);
}

function isGeneralDocumentType(
  value: DocumentType
): value is GeneralDocumentType {
  return (
    GENERAL_TYPES as readonly DocumentType[]
  ).includes(value);
}

function getMetadataString(
  metadata: Record<string, unknown>,
  key: string
): string {
  const value = metadata[key];

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

function changeMetadataType(
  metadata: Record<string, unknown>,
  previousType: GeneralDocumentType,
  nextType: GeneralDocumentType
): Record<string, unknown> {
  if (previousType === nextType) {
    return {
      ...metadata,
    };
  }

  const result = {
    ...metadata,
  };

  const previousFields =
    DOCUMENT_FIELDS[previousType];

  const nextFieldKeys = new Set(
    DOCUMENT_FIELDS[nextType].map(
      (field) => field.key
    )
  );

  /*
   * Remove somente campos estruturais pertencentes
   * ao tipo anterior.
   *
   * Campos personalizados adicionados pelo usuário
   * continuam preservados.
   */
  for (const field of previousFields) {
    if (!nextFieldKeys.has(field.key)) {
      delete result[field.key];
    }
  }

  return result;
}

function isSupportedAttachment(
  file: File
): boolean {
  return (
    file.type.startsWith("image/") ||
    file.type === "application/pdf"
  );
}

function getAttachmentType(
  file: File
): Attachment["type"] {
  return file.type.startsWith("image/")
    ? "image"
    : "pdf";
}

// ============================================================
// PÁGINA
// ============================================================

export default function EditarDocumentoPage() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const { user } = useAuth();

  const { trigger } =
    useHapticFeedback();

  const { showToast } =
    useToast();

  const {
    updateDocument,
  } = useDocumentActions();

  const persons =
    usePersons() as Person[];

  const id =
    searchParams.get("id") || "";

  /*
   * Contrato do hook:
   *
   * null      = carregando
   * undefined = não encontrado para a pessoa ativa
   * Document  = documento válido da pessoa ativa
   */
  const doc =
    useDocument(id);

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const cameraInputRef =
    useRef<HTMLInputElement>(
      null
    );

  /*
   * URLs blob criadas somente nesta tela.
   * Nunca devem ser persistidas no documento.
   */
  const objectUrlsRef =
    useRef<Set<string>>(
      new Set()
    );

  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errors,
    setErrors,
  ] = useState<
    Record<string, string>
  >({});

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
    pendingUploads,
    setPendingUploads,
  ] = useState<PendingUpload[]>(
    []
  );

  const [
    formData,
    setFormData,
  ] = useState<FormData>({
    category_id: "pessoal",
    type: "rg",
    title: "",
    description: "",
    metadata: {},
    attachments: [],
  });

  // ==========================================================
  // LIMPEZA DE OBJECT URLS
  // ==========================================================

  useEffect(() => {
    const objectUrls =
      objectUrlsRef.current;

    return () => {
      objectUrls.forEach(
        (url) => {
          URL.revokeObjectURL(
            url
          );
        }
      );

      objectUrls.clear();
    };
  }, []);

  // ==========================================================
  // POPULA O FORMULÁRIO
  // ==========================================================

  useEffect(() => {
    if (!doc) {
      return;
    }

    /*
     * Documento clínico não é transformado silenciosamente
     * em documento pessoal.
     *
     * O guard de renderização abaixo cuida da navegação.
     */
    if (
      !isGeneralCategory(
        doc.category_id
      ) ||
      !isGeneralDocumentType(
        doc.type
      )
    ) {
      return;
    }

    setFormData({
      category_id:
        doc.category_id,

      type:
        doc.type,

      title:
        doc.title,

      description:
        doc.description || "",

      metadata: {
        ...(doc.metadata || {}),
      },

      attachments:
        doc.attachments || [],
    });

    /*
     * Se por qualquer motivo o ID mudar enquanto esta tela
     * permanece montada, descartamos uploads locais antigos.
     */
    setPendingUploads(
      (previous) => {
        previous.forEach(
          (pending) => {
            URL.revokeObjectURL(
              pending.objectUrl
            );

            objectUrlsRef.current.delete(
              pending.objectUrl
            );
          }
        );

        return [];
      }
    );

    setErrors({});
  }, [doc]);

  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const fields =
    useMemo(
      () =>
        DOCUMENT_FIELDS[
          formData.type
        ] || [],
      [formData.type]
    );

  const allowedDocumentTypes =
    useMemo<SelectItem[]>(
      () =>
        GENERAL_TYPES
          .filter((type) =>
            TYPE_CATEGORY_MAP[
              type
            ].includes(
              formData.category_id
            )
          )
          .map((type) => ({
            id: type,
            label:
              DOCUMENT_TYPE_LABELS[
                type
              ],
          })),
      [
        formData.category_id,
      ]
    );

  const selectedTypeLabel =
    DOCUMENT_TYPE_LABELS[
      formData.type
    ];

  const selectedPerson =
    useMemo(
      () => {
        if (!doc) {
          return undefined;
        }

        return persons.find(
          (person) =>
            person.id ===
            doc.person_id
        );
      },
      [
        doc,
        persons,
      ]
    );

  const personColor =
    selectedPerson?.color ||
    "#38BDF8";

  const CategoryIcon =
    CATEGORY_ICONS[
      formData.category_id
    ];

  const isHealthDocument =
    Boolean(
      doc &&
        (
          doc.category_id ===
            "saude" ||
          !isGeneralCategory(
            doc.category_id
          ) ||
          !isGeneralDocumentType(
            doc.type
          )
        )
    );

  // ==========================================================
  // SELECTS NATIVOS DOS CAMPOS
  //
  // No domínio pessoal não existem selects que precisem
  // consultar médicos, hospitais, medicamentos etc.
  //
  // SelectionModal continua sendo usado para campos do tipo
  // select definidos em DOCUMENT_FIELDS (ex.: opções fixas).
  // ==========================================================

  const selectItems =
    useMemo<SelectItem[]>(
      () => {
        if (
          !activeSelectField?.options
            ?.length
        ) {
          return [];
        }

        return activeSelectField.options.map(
          (option) => ({
            id: option,
            label: option,
          })
        );
      },
      [
        activeSelectField,
      ]
    );

  // ==========================================================
  // ERROS
  // ==========================================================

  const clearError = (
    key: string
  ) => {
    setErrors(
      (previous) => {
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
      }
    );
  };

  // ==========================================================
  // ALTERAÇÕES
  // ==========================================================

  const handleTitleChange = (
    value: string
  ) => {
    setFormData(
      (previous) => ({
        ...previous,
        title: value,
      })
    );

    clearError("title");
  };

  const handleDescriptionChange = (
    value: string
  ) => {
    setFormData(
      (previous) => ({
        ...previous,
        description: value,
      })
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
  };

  const handleCategoryChange = (
    categoryId: GeneralCategoryId
  ) => {
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
          currentTypeAllowed
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
            changeMetadataType(
              previous.metadata,
              previous.type,
              nextType
            ),
        };
      }
    );

    setErrors({});
  };

  const handleTypeChange = (
    nextType:
      GeneralDocumentType
  ) => {
    trigger("vibrate");

    setFormData(
      (previous) => ({
        ...previous,

        type:
          nextType,

        metadata:
          changeMetadataType(
            previous.metadata,
            previous.type,
            nextType
          ),
      })
    );

    setErrors({});
    setIsTypeModalOpen(false);
  };

  // ==========================================================
  // ANEXOS
  // ==========================================================

  const addFiles = (
    files: File[],
    source:
      | "file"
      | "camera"
  ) => {
    if (
      files.length === 0
    ) {
      return;
    }

    const supported =
      files.filter(
        (file) => {
          if (
            !isSupportedAttachment(
              file
            )
          ) {
            return false;
          }

          if (
            file.size >
            10 *
              1024 *
              1024
          ) {
            return false;
          }

          return true;
        }
      );

    if (
      supported.length ===
      0
    ) {
      trigger("error");

      showToast(
        "Selecione imagens ou PDFs de até 10 MB.",
        "error"
      );

      return;
    }

    if (
      supported.length !==
      files.length
    ) {
      showToast(
        "Alguns arquivos foram ignorados. O Vault aceita imagens e PDFs de até 10 MB.",
        "info"
      );
    }

    const newAttachments:
      Attachment[] = [];

    const newPendingUploads:
      PendingUpload[] = [];

    supported.forEach(
      (
        file,
        index
      ) => {
        const attachmentId =
          crypto.randomUUID();

        const objectUrl =
          URL.createObjectURL(
            file
          );

        objectUrlsRef.current.add(
          objectUrl
        );

        const attachmentName =
          source ===
          "camera"
            ? `foto_${Date.now()}_${index + 1}.jpg`
            : file.name;

        newAttachments.push({
          id:
            attachmentId,

          url:
            objectUrl,

          name:
            attachmentName,

          type:
            getAttachmentType(
              file
            ),

          uploaded_at:
            new Date().toISOString(),
        });

        newPendingUploads.push({
          attachmentId,
          file,
          objectUrl,
        });
      }
    );

    setFormData(
      (previous) => ({
        ...previous,

        attachments: [
          ...previous.attachments,
          ...newAttachments,
        ],
      })
    );

    setPendingUploads(
      (previous) => [
        ...previous,
        ...newPendingUploads,
      ]
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

    if (
      files.length >
      0
    ) {
      addFiles(
        files,
        "file"
      );
    }

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
      addFiles(
        [file],
        "camera"
      );
    }

    event.target.value =
      "";
  };

  const removeAttachment = (
    attachmentId:
      string
  ) => {
    const pending =
      pendingUploads.find(
        (item) =>
          item.attachmentId ===
          attachmentId
      );

    if (pending) {
      URL.revokeObjectURL(
        pending.objectUrl
      );

      objectUrlsRef.current.delete(
        pending.objectUrl
      );

      setPendingUploads(
        (previous) =>
          previous.filter(
            (item) =>
              item.attachmentId !==
              attachmentId
          )
      );
    }

    setFormData(
      (previous) => ({
        ...previous,

        attachments:
          previous.attachments.filter(
            (attachment) =>
              attachment.id !==
              attachmentId
          ),
      })
    );

    trigger("vibrate");
  };

  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  const validate =
    (): boolean => {
      const newErrors: Record<
        string,
        string
      > = {};

      if (
        !formData.title.trim()
      ) {
        newErrors.title =
          "Título é obrigatório";
      }

      const typeAllowed =
        TYPE_CATEGORY_MAP[
          formData.type
        ].includes(
          formData.category_id
        );

      if (
        !typeAllowed
      ) {
        newErrors.type =
          "O tipo selecionado não pertence a esta categoria";
      }

      for (
        const field of
        fields
      ) {
        if (
          !field.required
        ) {
          continue;
        }

        const value =
          getMetadataString(
            formData.metadata,
            field.key
          ).trim();

        if (
          !value
        ) {
          newErrors[
            field.key
          ] =
            `${field.label} é obrigatório`;
        }
      }

      setErrors(
        newErrors
      );

      if (
        Object.keys(
          newErrors
        ).length >
        0
      ) {
        showToast(
          "Revise os campos obrigatórios.",
          "error"
        );

        return false;
      }

      return true;
    };

  // ==========================================================
  // UPLOAD DOS NOVOS ANEXOS
  // ==========================================================

  const uploadPendingAttachments =
    async (): Promise<
      Attachment[]
    > => {
      if (
        pendingUploads.length ===
        0
      ) {
        return [
          ...formData.attachments,
        ];
      }

      if (
        !user?.id
      ) {
        throw new Error(
          "Usuário não autenticado para upload."
        );
      }

      const finalAttachments = [
        ...formData.attachments,
      ];

      for (
        const pending of
        pendingUploads
      ) {
        /*
         * O anexo pode ter sido removido depois de entrar
         * na fila local.
         */
        const attachmentIndex =
          finalAttachments.findIndex(
            (attachment) =>
              attachment.id ===
              pending.attachmentId
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
            pending.file,
            formData.category_id
          );

        if (
          error ||
          !url
        ) {
          throw new Error(
            `Falha ao enviar ${pending.file.name}.`
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
      }

      /*
       * Defesa final: o repository nunca deve receber blob:.
       */
      if (
        finalAttachments.some(
          (attachment) =>
            attachment.url.startsWith(
              "blob:"
            )
        )
      ) {
        throw new Error(
          "Existem anexos que ainda não foram enviados."
        );
      }

      return finalAttachments;
    };

  const clearUploadedBlobUrls =
    () => {
      pendingUploads.forEach(
        (pending) => {
          URL.revokeObjectURL(
            pending.objectUrl
          );

          objectUrlsRef.current.delete(
            pending.objectUrl
          );
        }
      );

      setPendingUploads([]);
    };

  // ==========================================================
  // SALVAR
  // ==========================================================

  const handleSubmit =
    async () => {
      if (
        loading ||
        !doc ||
        !id
      ) {
        return;
      }

      if (
        isHealthDocument
      ) {
        trigger("error");

        showToast(
          "Documentos clínicos devem ser editados pela área de Saúde.",
          "error"
        );

        return;
      }

      if (
        !validate()
      ) {
        trigger("error");
        return;
      }

      setLoading(true);

      try {
        /*
         * Novos arquivos são enviados primeiro.
         * Assim URLs blob nunca chegam ao repository.
         */
        const finalAttachments =
          await uploadPendingAttachments();

        await updateDocument(
          id,
          {
            category_id:
              formData.category_id,

            type:
              formData.type,

            title:
              formData.title.trim(),

            /*
             * null é proposital aqui:
             * permite realmente limpar uma descrição antiga,
             * em vez de tratar campo vazio como "não alterar".
             */
            description:
              formData.description.trim() ||
              null,

            metadata: {
              ...formData.metadata,
            },

            attachments:
              finalAttachments,
          }
        );

        clearUploadedBlobUrls();

        trigger("success");

        showToast(
          "Documento atualizado",
          "success"
        );

        router.replace(
          `/documentos/detalhes?id=${id}`
        );
      } catch (error) {
        console.error(
          "Erro ao atualizar documento:",
          error
        );

        trigger("error");

        showToast(
          error instanceof Error &&
            error.message
              ? error.message
              : "Erro ao atualizar documento",
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    doc === null
  ) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void">
          <header className="border-b border-surface-border/30 px-5 pb-4 pt-6">
            <div className="mx-auto max-w-3xl">
              <div className="h-11 w-11 animate-pulse rounded-full bg-surface-raised" />
            </div>
          </header>

          <div className="mx-auto max-w-3xl space-y-4 px-5 pt-6">
            <div className="h-32 animate-pulse rounded-[28px] bg-surface" />
            <div className="h-28 animate-pulse rounded-[28px] bg-surface" />
            <div className="h-44 animate-pulse rounded-[28px] bg-surface" />
            <div className="h-72 animate-pulse rounded-[28px] bg-surface" />
            <div className="h-52 animate-pulse rounded-[28px] bg-surface" />
          </div>
        </main>
      </PageTransition>
    );
  }

  // ==========================================================
  // NÃO ENCONTRADO / OUTRA PESSOA
  // ==========================================================

  if (
    !doc
  ) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-ink-muted">
              <FileText
                size={22}
              />
            </div>

            <p className="mt-4 text-sm font-medium text-ink-primary">
              Documento não encontrado
            </p>

            <p className="mt-1 text-xs leading-5 text-ink-muted">
              Ele pode ter sido removido, pertencer a outra pessoa ou ainda não estar disponível neste dispositivo.
            </p>

            <Button
              variant="primary"
              onClick={() =>
                router.push(
                  "/documentos"
                )
              }
              className="mt-5"
            >
              Voltar aos documentos
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  // ==========================================================
  // DOCUMENTO CLÍNICO
  // ==========================================================

  if (
    isHealthDocument
  ) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[30px] border border-surface-border/50 bg-surface px-6 py-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-ice/15 bg-ice/10 text-ice">
              <FileText
                size={24}
              />
            </div>

            <p className="mt-5 font-display text-lg font-semibold text-ink-primary">
              Documento clínico
            </p>

            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Este documento pertence ao Acervo Clínico. A edição de documentos de Saúde é mantida separada do Cofre Pessoal.
            </p>

            <div className="mt-6 space-y-3">
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.replace(
                    "/saude/documentos"
                  );
                }}
              >
                Abrir Acervo Clínico
              </Button>

              <Button
                variant="secondary"
                fullWidth
                onClick={() =>
                  router.replace(
                    "/documentos"
                  )
                }
              >
                Voltar ao Cofre Pessoal
              </Button>
            </div>
          </div>
        </main>
      </PageTransition>
    );
  }

  // ==========================================================
  // RENDER FIELD
  // ==========================================================

  const renderField = (
    field: DocumentField
  ) => {
    const label =
      field.required
        ? `${field.label} *`
        : field.label;

    if (
      field.type ===
      "select"
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
                ? "border-coral/60"
                : currentValue
                  ? "border-surface-border/60 hover:border-ice/30"
                  : "border-surface-border/50 hover:border-ice/30"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  currentValue
                    ? "bg-ice/10 text-ice"
                    : "bg-surface text-ink-muted"
                }`}
              >
                <Layers3
                  size={16}
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
                  {currentValue ||
                    "Selecionar"}
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
            <p className="px-1 text-xs text-coral">
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
        type={
          field.type ===
          "date"
            ? "date"
            : "text"
        }
        value={getMetadataString(
          formData.metadata,
          field.key
        )}
        onChange={(
          event
        ) =>
          handleMetadataChange(
            field.key,
            event.target.value
          )
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
      <main className="min-h-screen bg-void pb-28">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
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
                Cofre Pessoal
              </p>

              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Editar documento
              </h1>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-3xl space-y-4 px-5 pt-6">
          {/* ==================================================
              HERO
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
            }}
            className="relative overflow-hidden rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
            style={{
              borderLeft: `4px solid ${personColor}`,
            }}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.08] blur-3xl"
              style={{
                backgroundColor:
                  personColor,
              }}
            />

            <div className="relative flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised"
                style={{
                  boxShadow: `inset 0 0 0 1px ${personColor}20`,
                }}
              >
                <CategoryIcon
                  size={22}
                  className="text-ice"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    {
                      CATEGORIES[
                        formData.category_id
                      ].name
                    }
                  </span>

                  <span className="rounded-full border border-ice/20 bg-ice/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ice">
                    {
                      selectedTypeLabel
                    }
                  </span>
                </div>

                <h2 className="mt-3 truncate font-display text-lg font-semibold text-ink-primary">
                  {formData.title ||
                    "Sem título"}
                </h2>

                <p className="mt-1 text-xs leading-5 text-ink-faint">
                  Atualize os dados e anexos deste documento.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              PROPRIETÁRIO — SOMENTE LEITURA
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
              delay: 0.03,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-raised"
                style={{
                  boxShadow: `inset 0 0 0 1px ${personColor}25`,
                }}
              >
                <UserRound
                  size={18}
                  style={{
                    color:
                      personColor,
                  }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                  Pessoa vinculada
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-ink-primary">
                  {selectedPerson?.name ||
                    "Pessoa ativa"}
                </p>

                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  O proprietário deste documento não pode ser alterado durante a edição.
                </p>
              </div>

              <Check
                size={16}
                className="mt-1 shrink-0 text-ice"
              />
            </div>
          </motion.div>

          {/* ==================================================
              CATEGORIA
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
              delay: 0.06,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <p className="mb-2 text-sm font-medium text-ink-primary">
              Categoria
            </p>

            <p className="mb-3 text-xs leading-5 text-ink-faint">
              Documentos clínicos são gerenciados separadamente no Acervo Clínico.
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

                  const selected =
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
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                        selected
                          ? "border-ice bg-ice/12 text-ice"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
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

                      {selected && (
                        <Check
                          size={13}
                        />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </motion.div>

          {/* ==================================================
              TIPO
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
              delay: 0.09,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <label className="mb-2 block text-sm font-medium text-ink-primary">
              Tipo
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
              className={`flex w-full items-center justify-between rounded-2xl border bg-surface-raised px-4 py-3.5 text-left text-ink-primary transition-colors ${
                errors.type
                  ? "border-coral/60"
                  : "border-surface-border/50 hover:border-ice/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ice/10 text-ice">
                  <Layers3
                    size={16}
                  />
                </div>

                <div>
                  <span className="block text-sm font-medium">
                    {
                      selectedTypeLabel
                    }
                  </span>

                  <span className="mt-0.5 block text-[10px] text-ink-faint">
                    {
                      allowedDocumentTypes.length
                    }{" "}
                    tipo
                    {allowedDocumentTypes.length !==
                    1
                      ? "s"
                      : ""}{" "}
                    disponível
                    {allowedDocumentTypes.length !==
                    1
                      ? "is"
                      : ""}{" "}
                    nesta categoria
                  </span>
                </div>
              </div>

              <ChevronDown
                size={16}
                className="text-ink-muted"
              />
            </button>

            {errors.type && (
              <p className="mt-2 px-1 text-xs text-coral">
                {
                  errors.type
                }
              </p>
            )}
          </motion.div>

          {/* ==================================================
              DADOS
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
              delay: 0.12,
            }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <div className="mb-1">
              <p className="text-sm font-medium text-ink-primary">
                Dados do documento
              </p>

              <p className="mt-1 text-xs leading-5 text-ink-faint">
                Os campos abaixo são definidos automaticamente pelo tipo selecionado.
              </p>
            </div>

            <Input
              label="Título *"
              value={
                formData.title
              }
              onChange={(
                event
              ) =>
                handleTitleChange(
                  event.target.value
                )
              }
              error={
                errors.title
              }
            />

            {fields.map(
              renderField
            )}

            <TextArea
              label="Notas"
              value={
                formData.description
              }
              onChange={(
                event
              ) =>
                handleDescriptionChange(
                  event.target.value
                )
              }
            />
          </motion.div>

          {/* ==================================================
              ANEXOS
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
              delay: 0.15,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                <Paperclip
                  size={17}
                />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-primary">
                  Anexos
                </p>

                <p className="mt-0.5 text-xs leading-5 text-ink-faint">
                  Imagens e PDFs de até 10 MB. Novos arquivos são enviados quando você salva.
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
                type="button"
                disabled={
                  loading
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
                type="button"
                disabled={
                  loading
                }
              >
                <Camera
                  size={16}
                />

                Câmera
              </Button>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={
                  handleFileSelect
                }
                className="hidden"
              />

              <input
                ref={
                  cameraInputRef
                }
                type="file"
                accept="image/*"
                capture="environment"
                onChange={
                  handleCameraCapture
                }
                className="hidden"
              />
            </div>

            {formData.attachments
              .length === 0 ? (
              <div className="mt-4 rounded-[20px] border border-dashed border-surface-border/50 bg-surface-raised/30 px-4 py-6 text-center">
                <Paperclip
                  size={20}
                  className="mx-auto text-ink-faint"
                />

                <p className="mt-2 text-xs text-ink-muted">
                  Nenhum anexo neste documento.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                <AnimatePresence
                  initial={false}
                >
                  {formData.attachments.map(
                    (
                      attachment
                    ) => {
                      const isPending =
                        pendingUploads.some(
                          (
                            item
                          ) =>
                            item.attachmentId ===
                            attachment.id
                        );

                      return (
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
                                  attachment.thumbnail_url ||
                                  attachment.url
                                }
                                alt={
                                  attachment.name
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <FileText
                                size={17}
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

                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[10px] uppercase tracking-wider text-ink-faint">
                                {attachment.type ===
                                "image"
                                  ? "Imagem"
                                  : "PDF"}
                              </span>

                              {isPending && (
                                <span className="rounded-full bg-ice/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ice">
                                  Novo
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeAttachment(
                                attachment.id
                              )
                            }
                            disabled={
                              loading
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-coral/10 hover:text-coral disabled:opacity-40"
                            aria-label={`Remover anexo ${attachment.name}`}
                          >
                            <X
                              size={15}
                            />
                          </button>
                        </motion.div>
                      );
                    }
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* ==================================================
              SALVAR
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration: 0.22,
              delay: 0.18,
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
                loading
              }
              className="flex items-center justify-center gap-2"
            >
              {loading ? (
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

                  Salvar alterações
                </>
              )}
            </Button>
          </motion.div>
        </section>

        {/* ====================================================
            MODAL — TIPO
            ==================================================== */}

        <SelectionModal
          isOpen={
            isTypeModalOpen
          }
          onClose={() =>
            setIsTypeModalOpen(
              false
            )
          }
          onSelect={(
            item
          ) =>
            handleTypeChange(
              item.id as
                GeneralDocumentType
            )
          }
          items={
            allowedDocumentTypes
          }
          title="Tipo de Documento"
          placeholder="Buscar tipo..."
          renderItem={(
            item
          ) => (
            <div>
              <p className="font-medium text-ink-primary">
                {
                  item.label
                }
              </p>
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

        {/* ====================================================
            MODAL — SELECTS FIXOS DO TIPO
            ==================================================== */}

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
      </main>
    </PageTransition>
  );
}