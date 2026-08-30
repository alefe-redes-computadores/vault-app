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
  Star,
  Trash2,
  User,
  Users,
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
  SectionTitle,
  DetailInfoRow,
} from "@/components/detail/DetailComponents";

// ============================================================
// CONSTANTES
// ============================================================

const CATEGORY_ICONS: Record<
  CategoryId,
  typeof Heart
> = {
  saude: Heart,
  pessoal: User,
  empresa: Building2,
  outros: FolderOpen,
};

const DOCUMENT_TYPE_LABELS: Record<
  DocumentType,
  string
> = {
  rg:
    "C.I.N / RG",

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
 * Esses campos representam referências estruturais antigas.
 *
 * Na área de Documentos Pessoais não exibimos IDs crus como
 * metadados para o usuário.
 *
 * Documentos clínicos possuem seu próprio acervo.
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

// ============================================================
// HELPERS
// ============================================================

function getMetadataString(
  metadata:
    Record<
      string,
      unknown
    >,
  key:
    string
): string {
  const value =
    metadata[
      key
    ];

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
  dateString?:
    string
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
  dateString?:
    string
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

      return format(
        new Date(
          year,
          month - 1,
          day
        ),
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
  value:
    string
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
  documentType:
    DocumentType,
  field:
    DocumentField,
  value:
    string
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
  type:
    string
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
  filename:
    string
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
  filename:
    string
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
  baseName:
    string,
  extension:
    string
): string {
  return `${baseName}${extension}`;
}

function buildShareText(
  doc:
    Document
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
  type:
    DocumentType,
  key:
    string
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
    usePersons() as
      Person[];

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
    "#6B7280";

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
                key:
                  string;

                label:
                  string;

                value:
                  string;
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
        <main className="min-h-screen bg-void pb-28">
          <header className="border-b border-surface-border/30 px-5 pb-4 pt-6">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <div className="h-11 w-11 animate-pulse rounded-full bg-surface-raised" />

              <div className="space-y-2">
                <div className="h-3 w-16 animate-pulse rounded bg-surface-border/40" />

                <div className="h-5 w-40 animate-pulse rounded bg-surface-border/40" />
              </div>
            </div>
          </header>

          <section className="mx-auto max-w-3xl space-y-5 px-5 pt-6">
            <div className="h-48 animate-pulse rounded-[28px] bg-surface" />

            <div className="h-40 animate-pulse rounded-[28px] bg-surface" />

            <div className="h-56 animate-pulse rounded-[28px] bg-surface" />
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
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
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
  //
  // Esta rota pertence ao Cofre Pessoal.
  // Não duplicamos a UI clínica nem voltamos a carregar
  // tabelas de Saúde nesta página.
  // ==========================================================

  if (
    isHealthDocument
  ) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
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
      <main className="min-h-screen bg-void pb-28">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
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

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Cofre Pessoal
                </p>

                <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary sm:text-xl">
                  {
                    doc.title
                  }
                </h1>

                <p className="mt-0.5 text-xs text-ink-muted">
                  Detalhes do documento
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
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
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all active:scale-95 disabled:opacity-60 ${
                  doc.is_favorite
                    ? "border-ice/20 bg-ice/12"
                    : "border-surface-border/50 bg-surface-raised"
                }`}
              >
                {isFavoriteUpdating ? (
                  <Loader2
                    size={
                      17
                    }
                    className="animate-spin text-ice"
                  />
                ) : (
                  <Star
                    size={
                      18
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
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <Share2
                  size={
                    18
                  }
                  className="text-ink-muted"
                />
              </button>

              <button
                type="button"
                onClick={
                  goToEdit
                }
                aria-label="Editar documento"
                className="hidden h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95 sm:flex"
              >
                <Edit
                  size={
                    17
                  }
                  className="text-ink-muted"
                />
              </button>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-3xl space-y-5 px-5 pt-6">
          {/* ==================================================
              HERO
              ================================================== */}

          <motion.div
            ref={
              cardRef
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
              duration:
                0.28,
            }}
            className="relative overflow-hidden rounded-[30px] border border-surface-border/50 bg-surface p-5 shadow-sm"
            style={{
              borderLeft: `4px solid ${categoryColor}`,
            }}
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-[0.08] blur-3xl"
              style={{
                backgroundColor:
                  categoryColor,
              }}
            />

            <div className="relative flex items-start gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-surface-border/50"
                style={{
                  background: `linear-gradient(135deg, ${categoryColor}28, ${categoryColor}0A)`,
                }}
              >
                <CategoryIcon
                  size={
                    27
                  }
                  style={{
                    color:
                      categoryColor,
                  }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${categoryColor}12`,

                      borderColor: `${categoryColor}28`,

                      color:
                        categoryColor,
                    }}
                  >
                    {category?.name ||
                      "Outros"}
                  </span>

                  <span className="rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    {
                      DOCUMENT_TYPE_LABELS[
                        doc.type
                      ]
                    }
                  </span>

                  {doc.is_favorite && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-ice/20 bg-ice/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ice">
                      <Star
                        size={
                          10
                        }
                        className="fill-current"
                      />

                      Favorito
                    </span>
                  )}
                </div>

                <h2 className="mt-3 font-display text-xl font-semibold leading-tight text-ink-primary">
                  {
                    doc.title
                  }
                </h2>

                {person && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          person.color,
                      }}
                    />

                    <Users
                      size={
                        13
                      }
                    />

                    <span>
                      {
                        person.name
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-2 gap-2 border-t border-surface-border/50 pt-4">
              <div className="rounded-2xl bg-surface-raised/60 px-3 py-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-ink-faint">
                  <CalendarDays
                    size={
                      12
                    }
                  />

                  Criado
                </div>

                <p className="mt-1 text-xs font-medium text-ink-primary">
                  {formatCreationDate(
                    doc.created_at
                  ) ||
                    "—"}
                </p>
              </div>

              <div className="rounded-2xl bg-surface-raised/60 px-3 py-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-ink-faint">
                  <CheckCircle2
                    size={
                      12
                    }
                  />

                  Sincronização
                </div>

                <p
                  className={`mt-1 text-xs font-medium ${
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
          </motion.div>

          {/* ==================================================
              INFORMAÇÕES
              ================================================== */}

          {genericMetadata.length >
            0 && (
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
              transition={{
                duration:
                  0.28,

                delay:
                  0.03,
              }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm"
            >
              <SectionTitle
                icon={
                  <FileText
                    size={
                      15
                    }
                  />
                }
                title="Informações do documento"
              />

              <div className="mt-4 space-y-2.5">
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
                      <span className="text-right text-sm font-medium text-ink-primary">
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
              NOTAS
              ================================================== */}

          {doc.description && (
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
              transition={{
                duration:
                  0.28,

                delay:
                  0.06,
              }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm"
            >
              <SectionTitle
                icon={
                  <FileText
                    size={
                      15
                    }
                  />
                }
                title="Notas"
              />

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
                {
                  doc.description
                }
              </p>
            </motion.div>
          )}

          {/* ==================================================
              ANEXOS
              ================================================== */}

          {hasAttachments ? (
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
              transition={{
                duration:
                  0.28,

                delay:
                  0.09,
              }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm"
            >
              <SectionTitle
                icon={
                  <Paperclip
                    size={
                      15
                    }
                  />
                }
                title={`Anexos (${doc.attachments.length})`}
              />

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
                        className="group relative overflow-hidden rounded-[22px] border border-surface-border/50 bg-surface-raised p-3 text-left transition-all hover:border-ice/25 active:scale-[0.985]"
                        aria-label={`Abrir anexo ${attachment.name}`}
                      >
                        {isImage ? (
                          <div className="relative h-28 overflow-hidden rounded-xl bg-surface">
                            <img
                              src={
                                attachment.thumbnail_url ||
                                attachment.url
                              }
                              alt={
                                attachment.name
                              }
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="flex h-28 items-center justify-center rounded-xl bg-surface">
                            <Icon
                              size={
                                30
                              }
                              className="text-ice/50"
                            />
                          </div>
                        )}

                        <span className="mt-2 block truncate text-xs font-medium text-ink-muted group-hover:text-ink-primary">
                          {
                            attachment.name
                          }
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </motion.div>
          ) : (
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
              transition={{
                duration:
                  0.28,

                delay:
                  0.09,
              }}
              className="rounded-[24px] border border-dashed border-surface-border/50 bg-surface/50 px-5 py-6 text-center"
            >
              <Paperclip
                size={
                  20
                }
                className="mx-auto text-ink-faint"
              />

              <p className="mt-2 text-xs text-ink-muted">
                Nenhum anexo neste documento.
              </p>
            </motion.div>
          )}

          {/* ==================================================
              REGISTRO
              ================================================== */}

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
            transition={{
              duration:
                0.28,

              delay:
                0.12,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm"
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

            <div className="mt-4 space-y-2.5">
              <DetailInfoRow
                icon={
                  <CalendarDays
                    size={
                      14
                    }
                  />
                }
                iconClassName="bg-surface-raised text-ink-muted"
                label="Criado em"
              >
                <span className="text-right text-sm font-medium text-ink-primary">
                  {formatCreationDate(
                    doc.created_at
                  ) ||
                    "—"}
                </span>
              </DetailInfoRow>

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
                <span className="text-right text-sm font-medium text-ink-primary">
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
                  className={`text-sm font-medium ${
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
              AÇÕES
              ================================================== */}

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
            transition={{
              duration:
                0.28,

              delay:
                0.15,
            }}
            className="space-y-3"
          >
            <div className="flex flex-wrap gap-3">
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
                className="flex items-center justify-center gap-2"
                onClick={
                  goToEdit
                }
              >
                <Edit
                  size={
                    16
                  }
                />

                Editar
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-coral/20 bg-coral/5 px-4 py-3.5 text-sm font-medium text-coral transition-all hover:bg-coral/10 active:scale-[0.99]"
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
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
                onClick={
                  closeAttachment
                }
              >
                <motion.div
                  initial={{
                    scale:
                      0.94,

                    opacity:
                      0,

                    y:
                      10,
                  }}
                  animate={{
                    scale:
                      1,

                    opacity:
                      1,

                    y:
                      0,
                  }}
                  exit={{
                    scale:
                      0.96,

                    opacity:
                      0,

                    y:
                      8,
                  }}
                  transition={{
                    duration:
                      0.22,
                  }}
                  className="shadow-vault relative w-full max-w-4xl rounded-[28px] border border-surface-border bg-surface-raised p-4"
                  onClick={(
                    event
                  ) =>
                    event.stopPropagation()
                  }
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {isRenaming ? (
                        <>
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
                            className="min-w-0 flex-1 border-b border-ice/30 bg-transparent font-medium text-ink-primary outline-none transition-colors focus:border-ice"
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

                          <button
                            type="button"
                            onClick={() =>
                              void updateAttachmentName()
                            }
                            className="rounded-full p-1.5 text-ice transition-colors hover:bg-surface-border"
                            aria-label="Salvar nome"
                          >
                            <CheckCircle2
                              size={
                                17
                              }
                            />
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="truncate font-medium text-ink-primary">
                            {getBaseName(
                              selectedAttachment.name
                            )}
                          </p>

                          <span className="shrink-0 text-xs text-ink-muted/50">
                            {getExtension(
                              selectedAttachment.name
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setIsRenaming(
                                true
                              )
                            }
                            className="rounded-full p-1.5 transition-colors hover:bg-surface-border"
                            aria-label="Renomear anexo"
                          >
                            <Pencil
                              size={
                                16
                              }
                              className="text-ink-muted"
                            />
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={
                        closeAttachment
                      }
                      className="shrink-0 rounded-full p-2 transition-colors hover:bg-surface-border"
                      aria-label="Fechar"
                    >
                      <X
                        size={
                          20
                        }
                        className="text-ink-muted"
                      />
                    </button>
                  </div>

                  <div className="relative flex min-h-[320px] items-center justify-center overflow-auto rounded-[22px] border border-surface-border/50 bg-surface p-4">
                    {selectedAttachment.type ===
                    "image" ? (
                      imageError ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                          <ImageIcon
                            size={
                              48
                            }
                            className="text-ink-faint"
                          />

                          <p className="text-sm text-ink-muted">
                            Não foi possível carregar esta imagem.
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              void downloadAttachment(
                                selectedAttachment
                              )
                            }
                            className="text-sm font-medium text-ice"
                          >
                            Baixar arquivo
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
                          className="max-h-[70vh] max-w-full rounded-xl object-contain transition-transform duration-200"
                          style={{
                            transform: `scale(${zoomLevel})`,
                          }}
                          onError={() =>
                            setImageError(
                              true
                            )
                          }
                        />
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-16 text-ink-muted">
                        <FileText
                          size={
                            64
                          }
                          className="text-ice/30"
                        />

                        <div className="text-center">
                          <p className="text-sm font-medium text-ink-primary">
                            {
                              selectedAttachment.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-ink-muted">
                            Abra o arquivo fazendo o download.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    {selectedAttachment.type ===
                      "image" &&
                      !imageError && (
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
                                16
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
                            className="min-w-[58px] rounded-xl border border-surface-border/50 bg-surface px-3 py-2 font-mono text-[11px] text-ink-muted"
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
                                16
                              }
                            />
                          </button>
                        </div>
                      )}

                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          void downloadAttachment(
                            selectedAttachment
                          )
                        }
                        disabled={
                          isDownloading
                        }
                      >
                        {isDownloading ? (
                          <Loader2
                            size={
                              14
                            }
                            className="mr-1 animate-spin"
                          />
                        ) : (
                          <Download
                            size={
                              14
                            }
                            className="mr-1"
                          />
                        )}

                        {isDownloading
                          ? "Baixando..."
                          : "Baixar"}
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={
                          closeAttachment
                        }
                      >
                        Fechar
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