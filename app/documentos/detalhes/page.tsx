
// app/documentos/detalhes/page.tsx
"use client";

import {
  useCallback,
  useMemo,
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
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  Edit,
  File,
  FileText,
  FolderOpen,
  Heart,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Pencil,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  User,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  format,
} from "date-fns";
import {
  ptBR,
} from "date-fns/locale";

import {
  CATEGORIES,
  DOCUMENT_FIELDS,
  type Attachment,
  type CategoryId,
  type Document,
  type DocumentField,
  type DocumentType,
  type Person,
} from "@/lib/types";

import {
  useDocument,
  useDocumentActions,
} from "@/hooks/useDocuments";
import {
  usePersons,
} from "@/hooks/usePersons";
import {
  useHapticFeedback,
} from "@/lib/haptics";
import {
  useMounted,
} from "@/hooks/useMounted";

import {
  Button,
} from "@/components/ui/Button";
import {
  PageTransition,
} from "@/components/PageTransition";
import {
  useToast,
} from "@/components/ToastProvider";
import {
  ExportCardButton,
} from "@/components/ExportCardButton";
import {
  ScrollToTop,
} from "@/components/ScrollToTop";
import {
  ConfirmationModal,
} from "@/components/ConfirmationModal";
import {
  DetailInfoRow,
  SectionTitle,
} from "@/components/detail/DetailComponents";

// ============================================================
// CONSTANTES
// ============================================================

const CATEGORY_ICONS: Record<
  CategoryId,
  typeof Heart
> = {
  saude:
    Heart,

  pessoal:
    User,

  empresa:
    Building2,

  outros:
    FolderOpen,
};

const DOCUMENT_TYPE_LABELS: Record<
  DocumentType,
  string
> = {
  rg:
    "C.I.N / Identidade",

  cpf:
    "CPF",

  cnh:
    "CNH",

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

  receita:
    "Receita",

  prontuario:
    "Prontuário",

  laudo:
    "Laudo",

  encaminhamento:
    "Encaminhamento",

  consulta:
    "Consulta",

  cirurgia:
    "Cirurgia",

  exame_sangue:
    "Exame de Sangue",

  exame_imagem:
    "Exame de Imagem",

  credencial:
    "Credencial / Carteirinha",

  outro:
    "Outro",
};

/*
 * Referências estruturais antigas não devem aparecer
 * como UUIDs crus na interface de Documentos Pessoais.
 *
 * Documentos clínicos possuem sua própria área.
 */
const INTERNAL_RELATION_KEYS =
  new Set([
    "medico_id",
    "from_medico_id",
    "to_medico_id",
    "hospital_id",
    "local_id",
    "laboratorio_id",
    "farmacia_id",
    "medicamento_id",
    "tratamento_id",
    "cid_id",
    "entidade_tipo",
    "entidade_id",
  ]);

const DATE_KEYS =
  new Set([
    "issue_date",
    "expiry_date",
    "prescription_date",
    "renewal_date",
    "date",
    "data_nascimento",
    "data_exame",
    "validade",
    "completion_date",
    "data_emissao",
    "data_validade",
  ]);

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

function getMetadataString(
  metadata: Record<
    string,
    unknown
  >,
  key: string
): string {
  const value =
    metadata[key];

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value
    );
  }

  return "";
}

function formatCreationDate(
  dateString?: string
): string {
  if (
    !dateString
  ) {
    return "";
  }

  try {
    const date =
      new Date(
        dateString
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return dateString;
    }

    return format(
      date,
      "dd/MM/yyyy 'às' HH:mm",
      {
        locale:
          ptBR,
      }
    );
  } catch {
    return dateString;
  }
}

function formatDateValue(
  dateString?: string
): string {
  if (
    !dateString?.trim()
  ) {
    return "";
  }

  try {
    if (
      /^\d{8}$/.test(
        dateString
      )
    ) {
      const day =
        dateString.substring(
          0,
          2
        );

      const month =
        dateString.substring(
          2,
          4
        );

      const year =
        dateString.substring(
          4,
          8
        );

      return `${day}/${month}/${year}`;
    }

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        dateString
      )
    ) {
      const [
        year,
        month,
        day,
      ] =
        dateString
          .split(
            "-"
          )
          .map(
            Number
          );

      const parsed =
        new Date(
          year,
          month - 1,
          day
        );

      if (
        parsed.getFullYear() !==
          year ||
        parsed.getMonth() !==
          month - 1 ||
        parsed.getDate() !==
          day
      ) {
        return dateString;
      }

      return format(
        parsed,
        "dd 'de' MMMM 'de' yyyy",
        {
          locale:
            ptBR,
        }
      );
    }

    const parsed =
      new Date(
        dateString
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return dateString;
    }

    return format(
      parsed,
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

function formatCPF(
  value: string
): string {
  const digits =
    value.replace(
      /\D/g,
      ""
    );

  if (
    digits.length !==
    11
  ) {
    return value;
  }

  return digits.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}

function formatMetadataValue(
  documentType: DocumentType,
  field: DocumentField,
  value: string
): string {
  if (
    !value
  ) {
    return "";
  }

  if (
    DATE_KEYS.has(
      field.key
    ) ||
    field.type ===
      "date"
  ) {
    return (
      formatDateValue(
        value
      ) ||
      value
    );
  }

  if (
    field.key ===
      "cpf" ||
    (
      documentType ===
        "cpf" &&
      field.key ===
        "number"
    )
  ) {
    return formatCPF(
      value
    );
  }

  return value;
}

function getFileIcon(
  type: string
) {
  if (
    type ===
    "image"
  ) {
    return ImageIcon;
  }

  if (
    type ===
    "pdf"
  ) {
    return FileText;
  }

  return File;
}

function getBaseName(
  filename: string
): string {
  const lastDot =
    filename.lastIndexOf(
      "."
    );

  if (
    lastDot ===
    -1
  ) {
    return filename;
  }

  return filename.substring(
    0,
    lastDot
  );
}

function getExtension(
  filename: string
): string {
  const lastDot =
    filename.lastIndexOf(
      "."
    );

  if (
    lastDot ===
    -1
  ) {
    return "";
  }

  return filename.substring(
    lastDot
  );
}

function buildFullName(
  baseName: string,
  extension: string
): string {
  return `${baseName}${extension}`;
}

function buildShareText(
  doc: Document
): string {
  const typeLabel =
    DOCUMENT_TYPE_LABELS[
      doc.type
    ];

  const category =
    CATEGORIES[
      doc.category_id
    ]?.name;

  return [
    doc.title,
    `${typeLabel} • ${category}`,
    doc.description ||
      "",
  ]
    .filter(
      Boolean
    )
    .join(
      "\n"
    );
}

function getFieldLabel(
  type: DocumentType,
  key: string
): string {
  const field =
    DOCUMENT_FIELDS[
      type
    ].find(
      (
        item
      ) =>
        item.key ===
        key
    );

  if (
    field
  ) {
    return field.label;
  }

  return key
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}

// ============================================================
// COMPONENTE
// ============================================================

export default function DocumentDetailPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const mounted =
    useMounted();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    showToast,
  } =
    useToast();

  const persons =
    usePersons() as Person[];

  const {
    deleteDocument,
    favoriteDocument,
    updateDocument,
  } =
    useDocumentActions();

  const id =
    searchParams.get(
      "id"
    ) ||
    "";

  /*
   * null      = carregando
   * undefined = não encontrado para a pessoa ativa
   * Document  = documento válido
   */
  const doc =
    useDocument(
      id
    );

  const cardRef =
    useRef<HTMLDivElement>(
      null
    );

  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [
    selectedAttachment,
    setSelectedAttachment,
  ] =
    useState<
      Attachment | null
    >(
      null
    );

  const [
    originalAttachmentName,
    setOriginalAttachmentName,
  ] =
    useState(
      ""
    );

  const [
    isModalOpen,
    setIsModalOpen,
  ] =
    useState(
      false
    );

  const [
    isRenaming,
    setIsRenaming,
  ] =
    useState(
      false
    );

  const [
    isDownloading,
    setIsDownloading,
  ] =
    useState(
      false
    );

  const [
    zoomLevel,
    setZoomLevel,
  ] =
    useState(
      1
    );

  const [
    imageError,
    setImageError,
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
    deleteModalOpen,
    setDeleteModalOpen,
  ] =
    useState(
      false
    );

  const [
    isFavoriteUpdating,
    setIsFavoriteUpdating,
  ] =
    useState(
      false
    );

  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const isLoading =
    !mounted ||
    doc ===
      null;

  const person =
    useMemo(
      () => {
        if (
          !doc
        ) {
          return undefined;
        }

        return persons.find(
          (
            item
          ) =>
            item.id ===
            doc.person_id
        );
      },
      [
        doc,
        persons,
      ]
    );

  const category =
    doc
      ? CATEGORIES[
          doc.category_id
        ]
      : undefined;

  const categoryColor =
    category?.color ||
    "#38BDF8";

  const personColor =
    person?.color ||
    categoryColor;

  const CategoryIcon =
    doc
      ? CATEGORY_ICONS[
          doc.category_id
        ] ||
        FolderOpen
      : FolderOpen;

  const typeFields =
    doc
      ? DOCUMENT_FIELDS[
          doc.type
        ] ||
        []
      : [];

  const genericMetadata =
    useMemo(
      () => {
        if (
          !doc
        ) {
          return [];
        }

        const canonicalKeys =
          new Set(
            typeFields.map(
              (
                field
              ) =>
                field.key
            )
          );

        const canonical =
          typeFields
            .filter(
              (
                field
              ) =>
                !INTERNAL_RELATION_KEYS.has(
                  field.key
                )
            )
            .map(
              (
                field
              ) => {
                const value =
                  getMetadataString(
                    doc.metadata ||
                      {},
                    field.key
                  );

                if (
                  !value
                ) {
                  return null;
                }

                return {
                  key:
                    field.key,

                  label:
                    field.label,

                  value:
                    formatMetadataValue(
                      doc.type,
                      field,
                      value
                    ),
                };
              }
            )
            .filter(
              (
                item
              ): item is {
                key: string;
                label: string;
                value: string;
              } =>
                Boolean(
                  item
                )
            );

        const extra =
          Object.entries(
            doc.metadata ||
              {}
          )
            .filter(
              (
                [
                  key,
                  value,
                ]
              ) =>
                !canonicalKeys.has(
                  key
                ) &&
                !INTERNAL_RELATION_KEYS.has(
                  key
                ) &&
                value !==
                  null &&
                value !==
                  undefined &&
                value !==
                  ""
            )
            .map(
              (
                [
                  key,
                  value,
                ]
              ) => ({
                key,

                label:
                  getFieldLabel(
                    doc.type,
                    key
                  ),

                value:
                  typeof value ===
                    "string" &&
                  (
                    /^\d{4}-\d{2}-\d{2}/.test(
                      value
                    ) ||
                    DATE_KEYS.has(
                      key
                    )
                  )
                    ? formatDateValue(
                        value
                      )
                    : String(
                        value
                      ),
              })
            );

        return [
          ...canonical,
          ...extra,
        ];
      },
      [
        doc,
        typeFields,
      ]
    );

  const hasAttachments =
    Boolean(
      doc?.attachments?.length
    );

  const isHealthDocument =
    doc?.category_id ===
    "saude";

  // ==========================================================
  // NAVEGAÇÃO
  // ==========================================================

  const goToDocuments =
    useCallback(
      () => {
        trigger(
          "vibrate"
        );

        router.push(
          "/documentos"
        );
      },
      [
        router,
        trigger,
      ]
    );

  const goToEdit =
    useCallback(
      () => {
        if (
          !doc?.id
        ) {
          return;
        }

        trigger(
          "vibrate"
        );

        router.push(
          `/documentos/editar?id=${doc.id}`
        );
      },
      [
        doc?.id,
        router,
        trigger,
      ]
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    useCallback(
      async () => {
        if (
          !doc?.id ||
          isDeleting
        ) {
          return;
        }

        setIsDeleting(
          true
        );

        try {
          await deleteDocument(
            doc.id
          );

          trigger(
            "success"
          );

          showToast(
            `"${doc.title}" foi excluído.`,
            "success"
          );

          setDeleteModalOpen(
            false
          );

          router.replace(
            "/documentos"
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao excluir documento:",
            error
          );

          trigger(
            "error"
          );

          showToast(
            "Erro ao excluir documento.",
            "error"
          );
        } finally {
          setIsDeleting(
            false
          );
        }
      },
      [
        doc,
        deleteDocument,
        isDeleting,
        router,
        showToast,
        trigger,
      ]
    );

  // ==========================================================
  // FAVORITO
  // ==========================================================

  const handleFavoriteToggle =
    useCallback(
      async () => {
        if (
          !doc?.id ||
          isFavoriteUpdating
        ) {
          return;
        }

        setIsFavoriteUpdating(
          true
        );

        try {
          const wasFavorite =
            doc.is_favorite;

          await favoriteDocument(
            doc.id
          );

          trigger(
            "success"
          );

          showToast(
            wasFavorite
              ? "Removido dos favoritos."
              : "Adicionado aos favoritos.",
            "success"
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao alterar favorito:",
            error
          );

          trigger(
            "error"
          );

          showToast(
            "Não foi possível alterar o favorito.",
            "error"
          );
        } finally {
          setIsFavoriteUpdating(
            false
          );
        }
      },
      [
        doc,
        favoriteDocument,
        isFavoriteUpdating,
        showToast,
        trigger,
      ]
    );

  // ==========================================================
  // COMPARTILHAR
  // ==========================================================

  const handleShare =
    useCallback(
      async () => {
        if (
          !doc
        ) {
          return;
        }

        const text =
          buildShareText(
            doc
          );

        try {
          if (
            typeof navigator !==
              "undefined" &&
            navigator.share
          ) {
            await navigator.share(
              {
                title:
                  doc.title,

                text,
              }
            );

            return;
          }

          if (
            typeof navigator !==
              "undefined" &&
            navigator.clipboard
          ) {
            await navigator.clipboard.writeText(
              text
            );

            trigger(
              "success"
            );

            showToast(
              "Resumo do documento copiado.",
              "success"
            );

            return;
          }

          showToast(
            "Compartilhamento indisponível neste dispositivo.",
            "info"
          );
        } catch (
          error
        ) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Erro ao compartilhar documento:",
            error
          );

          trigger(
            "error"
          );

          showToast(
            "Não foi possível compartilhar o documento.",
            "error"
          );
        }
      },
      [
        doc,
        showToast,
        trigger,
      ]
    );

  // ==========================================================
  // ANEXOS
  // ==========================================================

  const openAttachment =
    useCallback(
      (
        attachment:
          Attachment
      ) => {
        setSelectedAttachment(
          attachment
        );

        setOriginalAttachmentName(
          attachment.name
        );

        setIsRenaming(
          false
        );

        setZoomLevel(
          1
        );

        setImageError(
          false
        );

        setIsModalOpen(
          true
        );

        trigger(
          "vibrate"
        );
      },
      [
        trigger,
      ]
    );

  const closeAttachment =
    useCallback(
      () => {
        setIsModalOpen(
          false
        );

        setIsRenaming(
          false
        );

        setZoomLevel(
          1
        );

        setImageError(
          false
        );

        setSelectedAttachment(
          null
        );

        setOriginalAttachmentName(
          ""
        );
      },
      []
    );

  const downloadAttachment =
    useCallback(
      async (
        attachment:
          Attachment
      ) => {
        if (
          isDownloading
        ) {
          return;
        }

        setIsDownloading(
          true
        );

        try {
          const response =
            await fetch(
              attachment.url
            );

          if (
            !response.ok
          ) {
            throw new Error(
              `HTTP ${response.status}`
            );
          }

          const blob =
            await response.blob();

          const objectUrl =
            URL.createObjectURL(
              blob
            );

          const anchor =
            window.document.createElement(
              "a"
            );

          anchor.href =
            objectUrl;

          anchor.download =
            attachment.name;

          window.document.body.appendChild(
            anchor
          );

          anchor.click();
          anchor.remove();

          URL.revokeObjectURL(
            objectUrl
          );

          trigger(
            "success"
          );

          showToast(
            "Download concluído.",
            "success"
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao baixar anexo:",
            error
          );

          trigger(
            "error"
          );

          showToast(
            "Erro ao baixar o arquivo.",
            "error"
          );
        } finally {
          setIsDownloading(
            false
          );
        }
      },
      [
        isDownloading,
        showToast,
        trigger,
      ]
    );

  const cancelRename =
    useCallback(
      () => {
        if (
          !selectedAttachment
        ) {
          return;
        }

        setSelectedAttachment(
          {
            ...selectedAttachment,

            name:
              originalAttachmentName ||
              selectedAttachment.name,
          }
        );

        setIsRenaming(
          false
        );
      },
      [
        originalAttachmentName,
        selectedAttachment,
      ]
    );

  const updateAttachmentName =
    useCallback(
      async () => {
        if (
          !selectedAttachment ||
          !doc?.id
        ) {
          return;
        }

        const baseName =
          getBaseName(
            selectedAttachment.name
          ).trim();

        if (
          !baseName
        ) {
          showToast(
            "Informe um nome para o anexo.",
            "error"
          );

          return;
        }

        const extension =
          getExtension(
            originalAttachmentName ||
              selectedAttachment.name
          );

        const newFullName =
          buildFullName(
            baseName,
            extension
          );

        const updatedAttachments =
          (
            doc.attachments ||
            []
          ).map(
            (
              attachment
            ) =>
              attachment.id ===
              selectedAttachment.id
                ? {
                    ...attachment,

                    name:
                      newFullName,
                  }
                : attachment
          );

        try {
          await updateDocument(
            doc.id,
            {
              attachments:
                updatedAttachments,
            }
          );

          setSelectedAttachment(
            {
              ...selectedAttachment,

              name:
                newFullName,
            }
          );

          setOriginalAttachmentName(
            newFullName
          );

          setIsRenaming(
            false
          );

          trigger(
            "success"
          );

          showToast(
            "Nome do anexo atualizado.",
            "success"
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao renomear anexo:",
            error
          );

          trigger(
            "error"
          );

          showToast(
            "Erro ao renomear anexo.",
            "error"
          );
        }
      },
      [
        doc,
        originalAttachmentName,
        selectedAttachment,
        showToast,
        trigger,
        updateDocument,
      ]
    );

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    isLoading
  ) {
    return (
      <PageTransition>
        <main className="min-h-[100dvh] bg-void pb-28">
          <header className="border-b border-surface-border/30 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <div className="h-11 w-11 animate-pulse rounded-full bg-surface-raised" />

              <div className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-surface-border/40" />

                <div className="h-5 w-40 animate-pulse rounded bg-surface-border/40" />
              </div>
            </div>
          </header>

          <section className="mx-auto max-w-3xl space-y-4 px-5 pt-5">
            <div className="h-20 animate-pulse rounded-[20px] bg-surface" />

            <div className="h-52 animate-pulse rounded-[26px] bg-surface" />

            <div className="h-44 animate-pulse rounded-[24px] bg-surface" />

            <div className="h-52 animate-pulse rounded-[24px] bg-surface" />
          </section>
        </main>
      </PageTransition>
    );
  }

  // ==========================================================
  // NÃO ENCONTRADO / OWNERSHIP INVÁLIDO
  // ==========================================================

  if (
    !doc
  ) {
    return (
      <PageTransition>
        <main className="flex min-h-[100dvh] items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-ink-muted">
              <FileText
                size={
                  22
                }
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
              onClick={
                goToDocuments
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
  // DOCUMENTO DE SAÚDE
  // ==========================================================

  if (
    isHealthDocument
  ) {
    return (
      <PageTransition>
        <main className="flex min-h-[100dvh] items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[30px] border border-surface-border/50 bg-surface px-6 py-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-ice/15 bg-ice/10 text-ice">
              <Heart
                size={
                  24
                }
              />
            </div>

            <p className="mt-5 font-display text-lg font-semibold text-ink-primary">
              Documento clínico
            </p>

            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Este documento pertence ao Acervo Clínico e é gerenciado na área de Saúde do Vault.
            </p>

            <div className="mt-6 space-y-3">
              <Button
                variant="primary"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  router.replace(
                    "/saude/documentos"
                  );
                }}
                className="w-full"
              >
                <Heart
                  size={
                    16
                  }
                />

                Abrir Acervo Clínico
              </Button>

              <Button
                variant="secondary"
                onClick={
                  goToDocuments
                }
                className="w-full"
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
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft
                size={
                  18
                }
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ice/90">
                Cofre Pessoal
              </p>

              <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">
                Detalhes do documento
              </h1>
            </div>

            <button
              type="button"
              onClick={
                handleFavoriteToggle
              }
              disabled={
                isFavoriteUpdating
              }
              aria-label={
                doc.is_favorite
                  ? "Remover dos favoritos"
                  : "Adicionar aos favoritos"
              }
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 disabled:opacity-60 ${
                doc.is_favorite
                  ? "border-ice/20 bg-ice/12"
                  : "border-surface-border/50 bg-surface-raised"
              }`}
            >
              {isFavoriteUpdating ? (
                <Loader2
                  size={
                    16
                  }
                  className="animate-spin text-ice"
                />
              ) : (
                <Star
                  size={
                    17
                  }
                  className={
                    doc.is_favorite
                      ? "fill-ice text-ice"
                      : "text-ink-muted"
                  }
                />
              )}
            </button>

            <button
              type="button"
              onClick={
                handleShare
              }
              aria-label="Compartilhar documento"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <Share2
                size={
                  17
                }
                className="text-ink-muted"
              />
            </button>
          </div>
        </header>

        <section className="mx-auto max-w-3xl space-y-4 px-5 pt-5">
          {/* ==================================================
              PESSOA VINCULADA
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration:
                0.22,
            }}
            className="rounded-[20px] border border-surface-border/35 bg-surface/75 px-3.5 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised"
                style={{
                  boxShadow:
                    `inset 0 0 0 1px ${personColor}25`,
                }}
              >
                <UserRound
                  size={
                    17
                  }
                  style={{
                    color:
                      personColor,
                  }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="shrink-0 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
                    Pessoa vinculada
                  </p>

                  <span
                    className="h-1 w-1 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        personColor,
                    }}
                  />

                  <p className="truncate text-xs font-semibold text-ink-primary">
                    {person?.name ||
                      "Pessoa ativa"}
                  </p>
                </div>

                <p className="mt-1 text-[10px] leading-4 text-ink-muted">
                  Este documento pertence exclusivamente a esta pessoa.
                </p>
              </div>

              <ShieldCheck
                size={
                  15
                }
                className="shrink-0 text-ice"
              />
            </div>
          </motion.div>

          {/* ==================================================
              CARTEIRA / HERO
              ================================================== */}

          <motion.div
            ref={
              cardRef
            }
            {...sectionMotion}
            transition={{
              duration:
                0.26,

              delay:
                0.03,
            }}
            className="relative overflow-hidden rounded-[26px] border border-surface-border/40 bg-surface/95 p-5 shadow-sm"
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.1] blur-3xl"
              style={{
                backgroundColor:
                  categoryColor,
              }}
            />

            <div
              className="pointer-events-none absolute bottom-0 left-0 h-[3px] w-full opacity-70"
              style={{
                background:
                  `linear-gradient(90deg, ${categoryColor}, transparent)`,
              }}
            />

            <div className="relative">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border"
                  style={{
                    borderColor:
                      `${categoryColor}25`,

                    background:
                      `linear-gradient(135deg, ${categoryColor}22, ${categoryColor}08)`,
                  }}
                >
                  <CategoryIcon
                    size={
                      24
                    }
                    style={{
                      color:
                        categoryColor,
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em]"
                      style={{
                        backgroundColor:
                          `${categoryColor}12`,

                        borderColor:
                          `${categoryColor}28`,

                        color:
                          categoryColor,
                      }}
                    >
                      {category?.name ||
                        "Outros"}
                    </span>

                    <span className="rounded-full border border-surface-border/40 bg-surface-raised px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted">
                      {
                        DOCUMENT_TYPE_LABELS[
                          doc.type
                        ]
                      }
                    </span>

                    {doc.is_favorite && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-ice/20 bg-ice/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ice">
                        <Star
                          size={
                            9
                          }
                          className="fill-current"
                        />

                        Favorito
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 break-words font-display text-[22px] font-semibold leading-tight text-ink-primary">
                    {
                      doc.title
                    }
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-surface-border/40 pt-4">
                <div className="rounded-[18px] bg-surface-raised/65 px-3 py-3">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.13em] text-ink-faint">
                    <CalendarDays
                      size={
                        11
                      }
                    />

                    Criado
                  </div>

                  <p className="mt-1.5 text-[11px] font-medium leading-4 text-ink-primary">
                    {formatCreationDate(
                      doc.created_at
                    ) ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-[18px] bg-surface-raised/65 px-3 py-3">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.13em] text-ink-faint">
                    <CheckCircle2
                      size={
                        11
                      }
                    />

                    Status
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        doc.synced
                          ? "bg-emerald-400"
                          : "bg-coral"
                      }`}
                    />

                    <p
                      className={`text-[11px] font-medium ${
                        doc.synced
                          ? "text-emerald-400"
                          : "text-coral"
                      }`}
                    >
                      {doc.synced
                        ? "Sincronizado"
                        : "Pendente"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              INFORMAÇÕES
              ================================================== */}

          {genericMetadata.length >
            0 && (
            <motion.div
              {...sectionMotion}
              transition={{
                duration:
                  0.24,

                delay:
                  0.06,
              }}
              className="rounded-[24px] border border-surface-border/40 bg-surface/90 p-4 shadow-sm"
            >
              <SectionTitle
                icon={
                  <FileText
                    size={
                      15
                    }
                  />
                }
                title="Informações"
              />

              <div className="mt-4 space-y-2">
                {genericMetadata.map(
                  (
                    item
                  ) => (
                    <DetailInfoRow
                      key={
                        item.key
                      }
                      icon={
                        DATE_KEYS.has(
                          item.key
                        ) ? (
                          <CalendarDays
                            size={
                              14
                            }
                          />
                        ) : (
                          <FileText
                            size={
                              14
                            }
                          />
                        )
                      }
                      iconClassName="bg-surface-raised text-ink-muted"
                      label={
                        item.label
                      }
                    >
                      <span className="max-w-[58%] break-words text-right text-sm font-medium text-ink-primary">
                        {
                          item.value
                        }
                      </span>
                    </DetailInfoRow>
                  )
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              ANEXOS
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration:
                0.24,

              delay:
                0.09,
            }}
            className="rounded-[24px] border border-surface-border/40 bg-surface/90 p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                <Paperclip
                  size={
                    17
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink-primary">
                    Anexos
                  </p>

                  {hasAttachments && (
                    <span className="rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[9px] text-ink-muted">
                      {
                        doc.attachments.length
                      }
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  Arquivos que fazem parte deste documento.
                </p>
              </div>
            </div>

            {hasAttachments ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {doc.attachments.map(
                  (
                    attachment
                  ) => {
                    const Icon =
                      getFileIcon(
                        attachment.type
                      );

                    const isImage =
                      attachment.type ===
                      "image";

                    return (
                      <button
                        key={
                          attachment.id
                        }
                        type="button"
                        onClick={() =>
                          openAttachment(
                            attachment
                          )
                        }
                        className="group min-w-0 overflow-hidden rounded-[20px] border border-surface-border/45 bg-surface-raised/75 p-2.5 text-left transition-all active:scale-[0.985]"
                        aria-label={`Abrir anexo ${attachment.name}`}
                      >
                        {isImage ? (
                          <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-void/60">
                            <img
                              src={
                                attachment.thumbnail_url ||
                                attachment.url
                              }
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                              loading="lazy"
                            />

                            <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md">
                              <ZoomIn
                                size={
                                  12
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[14px] bg-void/50">
                            <div className="absolute inset-x-0 top-0 h-1 bg-ice/30" />

                            <Icon
                              size={
                                32
                              }
                              className="text-ice/55"
                            />
                          </div>
                        )}

                        <div className="px-1 pb-0.5 pt-2.5">
                          <p className="truncate text-xs font-semibold text-ink-primary">
                            {
                              attachment.name
                            }
                          </p>

                          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                            {attachment.type ===
                            "image"
                              ? "Imagem"
                              : attachment.type ===
                                  "pdf"
                                ? "PDF"
                                : "Arquivo"}
                          </p>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border border-dashed border-surface-border/55 bg-surface-raised/30 px-4 py-5 text-center">
                <Paperclip
                  size={
                    20
                  }
                  className="mx-auto text-ink-faint"
                />

                <p className="mt-2 text-xs font-medium text-ink-muted">
                  Nenhum anexo
                </p>

                <p className="mt-1 text-[10px] leading-4 text-ink-faint">
                  Você pode adicionar imagens ou PDFs pela edição do documento.
                </p>
              </div>
            )}
          </motion.div>

          {/* ==================================================
              NOTAS
              ================================================== */}

          {doc.description && (
            <motion.div
              {...sectionMotion}
              transition={{
                duration:
                  0.24,

                delay:
                  0.12,
              }}
              className="rounded-[24px] border border-surface-border/40 bg-surface/90 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted">
                  <FileText
                    size={
                      15
                    }
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-primary">
                    Notas
                  </p>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink-muted">
                    {
                      doc.description
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================
              REGISTRO TÉCNICO
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration:
                0.24,

              delay:
                0.15,
            }}
            className="rounded-[24px] border border-surface-border/40 bg-surface/75 p-4 shadow-sm"
          >
            <SectionTitle
              icon={
                <CalendarDays
                  size={
                    15
                  }
                />
              }
              title="Registro"
            />

            <div className="mt-4 space-y-2">
              <DetailInfoRow
                icon={
                  <CalendarDays
                    size={
                      14
                    }
                  />
                }
                iconClassName="bg-surface-raised text-ink-muted"
                label="Atualizado em"
              >
                <span className="text-right text-xs font-medium text-ink-primary">
                  {formatCreationDate(
                    doc.updated_at
                  ) ||
                    "—"}
                </span>
              </DetailInfoRow>

              <DetailInfoRow
                icon={
                  <CheckCircle2
                    size={
                      14
                    }
                  />
                }
                iconClassName={
                  doc.synced
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-coral/10 text-coral"
                }
                label="Sincronização"
              >
                <span
                  className={`text-xs font-medium ${
                    doc.synced
                      ? "text-emerald-400"
                      : "text-coral"
                  }`}
                >
                  {doc.synced
                    ? "Sincronizado"
                    : "Pendente"}
                </span>
              </DetailInfoRow>
            </div>
          </motion.div>

          {/* ==================================================
              AÇÕES SECUNDÁRIAS
              ================================================== */}

          <motion.div
            {...sectionMotion}
            transition={{
              duration:
                0.24,

              delay:
                0.18,
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <ExportCardButton
                cardRef={
                  cardRef
                }
                title={
                  doc.title
                }
                variant="secondary"
                size="sm"
                label="Exportar PDF"
              />

              <Button
                variant="secondary"
                size="sm"
                onClick={
                  handleShare
                }
                className="flex items-center justify-center gap-2"
              >
                <Share2
                  size={
                    15
                  }
                />

                Compartilhar
              </Button>
            </div>

            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setDeleteModalOpen(
                  true
                );
              }}
              className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-coral/20 bg-coral/5 px-4 py-3.5 text-sm font-medium text-coral transition-all active:scale-[0.99]"
            >
              <Trash2
                size={
                  16
                }
              />

              Excluir documento
            </button>
          </motion.div>
        </section>

        {/* ====================================================
            AÇÃO PRINCIPAL FIXA
            ==================================================== */}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/35 bg-void/92 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_32px_rgba(0,0,0,0.16)] backdrop-blur-xl">
          <div className="mx-auto max-w-3xl">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={
                goToEdit
              }
              className="flex items-center justify-center gap-2"
            >
              <Edit
                size={
                  16
                }
              />

              Editar documento
            </Button>
          </div>
        </div>

        {/* ====================================================
            MODAL DO ANEXO
            ==================================================== */}

        <AnimatePresence>
          {isModalOpen &&
            selectedAttachment && (
              <motion.div
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
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/90 backdrop-blur-md sm:items-center sm:p-4"
                onClick={
                  closeAttachment
                }
              >
                <motion.div
                  initial={{
                    opacity:
                      0,

                    y:
                      24,

                    scale:
                      0.98,
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
                      0.98,
                  }}
                  transition={{
                    duration:
                      0.2,
                  }}
                  className="relative flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] border border-surface-border bg-surface-raised shadow-2xl sm:rounded-[28px]"
                  onClick={(
                    event
                  ) =>
                    event.stopPropagation()
                  }
                >
                  {/* HEADER DO VISUALIZADOR */}

                  <div className="flex items-center gap-3 border-b border-surface-border/40 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <div className="flex min-w-0 flex-1 items-center rounded-xl border border-ice/30 bg-surface px-3 py-2">
                            <input
                              type="text"
                              value={getBaseName(
                                selectedAttachment.name
                              )}
                              onChange={(
                                event
                              ) => {
                                const extension =
                                  getExtension(
                                    originalAttachmentName ||
                                      selectedAttachment.name
                                  );

                                setSelectedAttachment(
                                  {
                                    ...selectedAttachment,

                                    name:
                                      buildFullName(
                                        event.target.value,
                                        extension
                                      ),
                                  }
                                );
                              }}
                              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink-primary outline-none"
                              autoFocus
                              onKeyDown={(
                                event
                              ) => {
                                if (
                                  event.key ===
                                  "Enter"
                                ) {
                                  void updateAttachmentName();
                                }

                                if (
                                  event.key ===
                                  "Escape"
                                ) {
                                  cancelRename();
                                }
                              }}
                            />

                            <span className="shrink-0 text-xs text-ink-faint">
                              {getExtension(
                                originalAttachmentName ||
                                  selectedAttachment.name
                              )}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void updateAttachmentName()
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice"
                            aria-label="Salvar nome"
                          >
                            <CheckCircle2
                              size={
                                16
                              }
                            />
                          </button>

                          <button
                            type="button"
                            onClick={
                              cancelRename
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-ink-muted"
                            aria-label="Cancelar renomeação"
                          >
                            <X
                              size={
                                16
                              }
                            />
                          </button>
                        </div>
                      ) : (
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink-primary">
                              {getBaseName(
                                selectedAttachment.name
                              )}
                            </p>

                            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                              {selectedAttachment.type ===
                              "image"
                                ? "Imagem"
                                : selectedAttachment.type ===
                                    "pdf"
                                  ? "PDF"
                                  : "Arquivo"}
                              {getExtension(
                                selectedAttachment.name
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setIsRenaming(
                                true
                              )
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-ink-muted transition-transform active:scale-95"
                            aria-label="Renomear anexo"
                          >
                            <Pencil
                              size={
                                15
                              }
                            />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={
                        closeAttachment
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted transition-transform active:scale-95"
                      aria-label="Fechar"
                    >
                      <X
                        size={
                          19
                        }
                      />
                    </button>
                  </div>

                  {/* CONTEÚDO */}

                  <div className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-auto bg-void/75 p-4 sm:min-h-[420px]">
                    {selectedAttachment.type ===
                    "image" ? (
                      imageError ? (
                        <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-surface">
                            <ImageIcon
                              size={
                                28
                              }
                              className="text-ink-faint"
                            />
                          </div>

                          <div>
                            <p className="text-sm font-medium text-ink-primary">
                              Imagem indisponível
                            </p>

                            <p className="mt-1 max-w-xs text-xs leading-5 text-ink-muted">
                              Não foi possível exibir a prévia deste arquivo.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void downloadAttachment(
                                selectedAttachment
                              )
                            }
                            className="text-sm font-medium text-ice"
                          >
                            Tentar baixar
                          </button>
                        </div>
                      ) : (
                        <img
                          src={
                            selectedAttachment.url
                          }
                          alt={
                            selectedAttachment.name
                          }
                          className="max-h-[68dvh] max-w-full rounded-xl object-contain transition-transform duration-200"
                          style={{
                            transform:
                              `scale(${zoomLevel})`,
                          }}
                          onError={() =>
                            setImageError(
                              true
                            )
                          }
                        />
                      )
                    ) : (
                      <div className="flex flex-col items-center px-5 py-16 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-ice/15 bg-ice/8">
                          <FileText
                            size={
                              36
                            }
                            className="text-ice/55"
                          />
                        </div>

                        <p className="mt-5 max-w-sm break-words text-sm font-semibold text-ink-primary">
                          {
                            selectedAttachment.name
                          }
                        </p>

                        <p className="mt-2 max-w-xs text-xs leading-5 text-ink-muted">
                          O Vault preserva este arquivo. Use o botão abaixo para baixá-lo e abrir no aplicativo compatível do dispositivo.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* CONTROLES */}

                  <div className="border-t border-surface-border/40 bg-surface-raised px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
                    <div className="flex items-center justify-between gap-3">
                      {selectedAttachment.type ===
                        "image" &&
                        !imageError ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setZoomLevel(
                                (
                                  current
                                ) =>
                                  Math.max(
                                    0.5,
                                    Number(
                                      (
                                        current -
                                        0.25
                                      ).toFixed(
                                        2
                                      )
                                    )
                                  )
                              )
                            }
                            disabled={
                              zoomLevel <=
                              0.5
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border/50 bg-surface text-ink-muted transition-all active:scale-95 disabled:opacity-30"
                            aria-label="Diminuir zoom"
                          >
                            <ZoomOut
                              size={
                                15
                              }
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setZoomLevel(
                                1
                              )
                            }
                            className="min-w-[58px] rounded-xl border border-surface-border/50 bg-surface px-3 py-2 font-mono text-[10px] text-ink-muted"
                          >
                            {Math.round(
                              zoomLevel *
                                100
                            )}
                            %
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setZoomLevel(
                                (
                                  current
                                ) =>
                                  Math.min(
                                    3,
                                    Number(
                                      (
                                        current +
                                        0.25
                                      ).toFixed(
                                        2
                                      )
                                    )
                                  )
                              )
                            }
                            disabled={
                              zoomLevel >=
                              3
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border/50 bg-surface text-ink-muted transition-all active:scale-95 disabled:opacity-30"
                            aria-label="Aumentar zoom"
                          >
                            <ZoomIn
                              size={
                                15
                              }
                            />
                          </button>
                        </div>
                      ) : (
                        <div />
                      )}

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          void downloadAttachment(
                            selectedAttachment
                          )
                        }
                        disabled={
                          isDownloading
                        }
                        className="flex items-center justify-center gap-1.5"
                      >
                        {isDownloading ? (
                          <Loader2
                            size={
                              14
                            }
                            className="animate-spin"
                          />
                        ) : (
                          <Download
                            size={
                              14
                            }
                          />
                        )}

                        {isDownloading
                          ? "Baixando..."
                          : "Baixar"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* ====================================================
            CONFIRMAÇÃO DE EXCLUSÃO
            ==================================================== */}

        <ConfirmationModal
          isOpen={
            deleteModalOpen
          }
          onClose={() => {
            if (
              !isDeleting
            ) {
              setDeleteModalOpen(
                false
              );
            }
          }}
          onConfirm={
            handleDelete
          }
          title="Excluir Documento"
          message={`Tem certeza que deseja excluir "${doc.title}"? O documento e seus anexos serão removidos.`}
        />

        <ScrollToTop
          threshold={
            300
          }
        />
      </main>
    </PageTransition>
  );
}