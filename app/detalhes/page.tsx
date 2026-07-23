"use client";

import { useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Trash2,
  Edit,
  FileText,
  Share2,
  Download,
  X,
  Image as ImageIcon,
  File,
  User,
  Building2,
  Heart,
  FolderOpen,
  Pencil,
  Loader2,
  ZoomIn,
  ZoomOut,
  Paperclip,
  ChevronRight,
} from "lucide-react";
import { useDocument } from "@/hooks/useDocuments";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, type Attachment, type CategoryId } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { ExportCardButton } from "@/components/ExportCardButton";
import { ScrollToTop } from "@/components/ScrollToTop";
import { db } from "@/lib/db";

const CATEGORY_ICONS: Record<string, typeof Heart> = {
  saude: Heart,
  pessoal: User,
  empresa: Building2,
  outros: FolderOpen,
};

const formatDate = (date?: string): string => {
  if (!date) return "Data inválida";
  try {
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return date;
  }
};

const getFileIcon = (type: string) => {
  if (type === "image") return ImageIcon;
  if (type === "pdf") return FileText;
  return File;
};

const getBaseName = (filename: string): string => {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return filename;
  return filename.substring(0, lastDot);
};

const getExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.substring(lastDot);
};

const buildFullName = (baseName: string, extension: string): string => {
  return baseName + extension;
};

export default function DocumentDetailPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { showToast, showSuccess } = useToast();

  const doc = useDocument(id || "");
  const { deleteDocument, favorite } = useSafeDb();

  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  const handleDelete = useCallback(async () => {
    if (!doc || !doc.id) {
      showToast("Documento não encontrado", "error");
      return;
    }

    showSuccess(`"${doc.title}" foi excluído`, 5000, {
      label: "Desfazer",
      onClick: () => {
        showToast("Restauração em breve...", "info");
      },
    });

    setIsDeleting(true);

    try {
      await deleteDocument(doc.id);
      trigger("success");
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error) {
      showToast("Erro ao excluir documento", "error");
      trigger("error");
    } finally {
      setIsDeleting(false);
    }
  }, [doc, deleteDocument, trigger, showToast, showSuccess, router]);

  const handleFavoriteToggle = useCallback(async () => {
    if (!doc || !doc.id) return;
    await favorite(doc.id);
    trigger("vibrate");
    showToast(
      doc.is_favorite ? "Removido dos favoritos" : "Adicionado aos favoritos",
      "info"
    );
  }, [doc, favorite, trigger, showToast]);

  const handleShare = useCallback(() => {
    if (!doc) return;

    if (navigator.share) {
      navigator
        .share({
          title: doc.title,
          text: doc.description || "",
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(doc.title).then(() => {
        showToast("Link copiado para a área de transferência!", "success");
      });
    }
  }, [doc, showToast]);

  const openAttachment = useCallback(
    (attachment: Attachment) => {
      setSelectedAttachment(attachment);
      setIsRenaming(false);
      setZoomLevel(1);
      setImageError(false);
      setIsModalOpen(true);
      trigger("vibrate");
    },
    [trigger]
  );

  const downloadAttachment = useCallback(
    async (attachment: Attachment) => {
      setIsDownloading(true);
      try {
        const response = await fetch(attachment.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        trigger("success");
        showToast("Download concluído!", "success");
      } catch (error) {
        console.error("Erro ao baixar:", error);
        trigger("error");
        showToast("Erro ao baixar o arquivo", "error");
      } finally {
        setIsDownloading(false);
      }
    },
    [trigger, showToast]
  );

  const updateAttachmentName = useCallback(
    async (newBaseName: string) => {
      if (!selectedAttachment || !doc || !doc.id) return;

      const extension = getExtension(selectedAttachment.name);
      const newFullName = buildFullName(newBaseName, extension);

      const updatedAttachments = doc.attachments.map((att) =>
        att.id === selectedAttachment.id ? { ...att, name: newFullName } : att
      );

      try {
        await db.documents.update(doc.id, {
          attachments: updatedAttachments,
          updated_at: new Date().toISOString(),
          synced: false,
        });

        setSelectedAttachment({ ...selectedAttachment, name: newFullName });
        setIsRenaming(false);
        trigger("success");
        showToast("Nome atualizado com sucesso!", "success");
      } catch (error) {
        console.error("Erro ao renomear anexo:", error);
        trigger("error");
        showToast("Erro ao renomear anexo", "error");
      }
    },
    [selectedAttachment, doc, trigger, showToast]
  );

  if (!doc) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-6 py-10 text-center shadow-sm">
            <p className="text-sm text-ink-muted">Documento não encontrado</p>
            <Button
              variant="primary"
              onClick={() => router.push("/")}
              className="mt-4"
            >
              Voltar
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  const categoryId = doc.category_id as CategoryId;
  const category = CATEGORIES[categoryId];
  const CategoryIcon = CATEGORY_ICONS[doc.category_id] || FolderOpen;
  const hasMetadata = Object.keys(doc.metadata || {}).length > 0;
  const hasAttachments = doc.attachments && doc.attachments.length > 0;
  const FileIcon = selectedAttachment ? getFileIcon(selectedAttachment.type) : File;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                aria-label="Voltar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
                <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary sm:text-xl">
                  {doc.title}
                </h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Detalhes do documento
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFavoriteToggle}
                aria-label="Favoritar documento"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <Star
                  size={18}
                  className={
                    doc.is_favorite ? "fill-ice text-ice" : "text-ink-muted"
                  }
                />
              </button>

              <button
                onClick={handleShare}
                aria-label="Compartilhar documento"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <Share2 size={18} className="text-ink-muted" />
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="rounded-[28px] border bg-surface p-5 shadow-sm"
            style={{ borderColor: `${category?.color || "#6B7280"}25` }}
          >
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${category?.color || "#6B7280"}15` }}
              >
                <CategoryIcon
                  size={24}
                  style={{ color: category?.color || "#6B7280" }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-lg font-semibold text-ink-primary">
                  {doc.title}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                  <span>{category?.name || "Outros"}</span>
                  <span className="h-1 w-1 rounded-full bg-ink-faint" />
                  <span className="capitalize">{doc.type}</span>
                  {doc.vault_id && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-ink-faint" />
                      <span className="inline-flex items-center gap-1 text-ice">
                        <User size={10} />
                        Compartilhado
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {hasMetadata && (
              <div className="mt-5 border-t border-surface-border/50 pt-5">
                <div className="mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-ice" />
                  <p className="text-sm font-medium text-ink-primary">
                    Informações
                  </p>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(doc.metadata || {}).map(([key, value]) => {
                    if (!value) return null;

                    let displayValue: string = String(value);
                    if (
                      typeof value === "string" &&
                      value.match(/^d{4}-d{2}-d{2}/)
                    ) {
                      displayValue = formatDate(value);
                    }

                    const labels: Record<string, string> = {
                      number: "Número",
                      issue_date: "Data de emissão",
                      expiry_date: "Data de validade",
                      issuer: "Órgão emissor",
                      category: "Categoria",
                      institution: "Instituição",
                      course: "Curso",
                      duration: "Duração",
                      completion_date: "Data de conclusão",
                      medication: "Medicamento",
                      dosage: "Dosagem",
                      doctor: "Médico",
                      pharmacy: "Farmácia",
                      prescription_date: "Data da receita",
                      renewal_date: "Próxima renovação",
                      hospital: "Hospital",
                      specialty: "Especialidade",
                      date: "Data",
                      from: "Quem encaminhou",
                      to: "Para quem",
                      reason: "Motivo",
                      custom_field_1: "Campo 1",
                      custom_field_2: "Campo 2",
                    };

                    const label =
                      labels[key] || key.replace(/_/g, " ").toUpperCase();

                    return (
                      <div
                        key={key}
                        className="flex items-start justify-between gap-4 rounded-2xl bg-surface-raised/55 px-3.5 py-3"
                      >
                        <span className="text-sm text-ink-muted">{label}</span>
                        <span className="text-right text-sm font-medium text-ink-primary">
                          {displayValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {doc.description && (
              <div className="mt-5 border-t border-surface-border/50 pt-5">
                <p className="mb-2 text-sm font-medium text-ink-primary">Notas</p>
                <p className="text-sm leading-6 text-ink-muted">
                  {doc.description}
                </p>
              </div>
            )}

            <div className="mt-5 border-t border-surface-border/50 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <p className="text-ink-muted">
                  {doc.synced ? (
                    <span className="text-emerald-400">✓ Sincronizado</span>
                  ) : (
                    <span className="animate-pulse text-coral">↻ Pendente</span>
                  )}
                </p>
                <p className="text-ink-muted">
                  Criado em {formatDate(doc.created_at)}
                </p>
              </div>
            </div>
          </motion.div>

          {hasAttachments && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.06 }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-medium text-ink-primary">
                  <Paperclip size={14} className="text-ice" />
                  Anexos ({doc.attachments.length})
                </p>
                <ChevronRight size={16} className="text-ink-faint" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {doc.attachments.map((attachment: any) => {
                  const Icon = getFileIcon(attachment.type);
                  const isImage = attachment.type === "image";

                  return (
                    <button
                      key={attachment.id}
                      onClick={() => openAttachment(attachment)}
                      className="group relative overflow-hidden rounded-[22px] border border-surface-border/50 bg-surface-raised p-3 text-left transition-all active:scale-[0.985]"
                    >
                      {isImage ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="h-24 w-full rounded-xl object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                              const icon = document.createElement("div");
                              icon.className =
                                "flex items-center justify-center w-full h-24 rounded-xl bg-surface";
                              icon.innerHTML = `<svg class="w-8 h-8 text-gray-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`;
                              parent.prepend(icon);
                            }
                          }}
                        />
                      ) : (
                        <div className="flex h-24 items-center justify-center rounded-xl bg-surface">
                          <Icon size={26} className="text-ink-muted" />
                        </div>
                      )}

                      <span className="mt-2 block truncate text-xs text-ink-muted group-hover:text-ink-primary">
                        {attachment.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.12 }}
            className="flex flex-wrap gap-3"
          >
            <ExportCardButton
              cardRef={cardRef}
              title={doc.title}
              variant="secondary"
              size="sm"
              label="Exportar PDF"
            />

            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2"
              onClick={() => {
                trigger("vibrate");
                router.push(`/detalhes/editar?id=${doc.id}`);
              }}
            >
              <Edit size={16} />
              Editar
            </Button>

            <Button
              variant="danger"
              className="flex items-center justify-center gap-2"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </motion.div>
        </section>

        <AnimatePresence>
          {isModalOpen && selectedAttachment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 8 }}
                transition={{ duration: 0.22 }}
                className="relative w-full max-w-4xl rounded-[28px] border border-surface-border bg-surface-raised p-4 shadow-vault"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {isRenaming ? (
                      <input
                        type="text"
                        value={getBaseName(selectedAttachment.name)}
                        onChange={(e) =>
                          setSelectedAttachment({
                            ...selectedAttachment,
                            name: buildFullName(
                              e.target.value,
                              getExtension(selectedAttachment.name)
                            ),
                          })
                        }
                        className="flex-1 border-b border-ice/30 bg-transparent font-medium text-ink-primary outline-none transition-colors focus:border-ice"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateAttachmentName(
                              getBaseName(selectedAttachment.name)
                            );
                          }
                          if (e.key === "Escape") {
                            setIsRenaming(false);
                          }
                        }}
                      />
                    ) : (
                      <p className="truncate font-medium text-ink-primary">
                        {getBaseName(selectedAttachment.name)}
                      </p>
                    )}

                    <span className="shrink-0 text-xs text-ink-muted/50">
                      {getExtension(selectedAttachment.name)}
                    </span>

                    <button
                      onClick={() => {
                        if (isRenaming) {
                          updateAttachmentName(getBaseName(selectedAttachment.name));
                        } else {
                          setIsRenaming(true);
                          setTimeout(() => {
                            const input = document.querySelector(
                              'input[type="text"]'
                            ) as HTMLInputElement;
                            if (input) input.focus();
                          }, 100);
                        }
                      }}
                      className="rounded-full p-1.5 transition-colors hover:bg-surface-border"
                      title={isRenaming ? "Salvar nome" : "Renomear"}
                    >
                      <Pencil size={16} className="text-ink-muted" />
                    </button>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {selectedAttachment.type === "image" && (
                      <>
                        <button
                          onClick={() =>
                            setZoomLevel(Math.max(0.5, zoomLevel - 0.25))
                          }
                          className="rounded-full p-1.5 transition-colors hover:bg-surface-border"
                        >
                          <ZoomOut size={16} className="text-ink-muted" />
                        </button>

                        <span className="text-xs text-ink-muted">
                          {Math.round(zoomLevel * 100)}%
                        </span>

                        <button
                          onClick={() =>
                            setZoomLevel(Math.min(3, zoomLevel + 0.25))
                          }
                          className="rounded-full p-1.5 transition-colors hover:bg-surface-border"
                        >
                          <ZoomIn size={16} className="text-ink-muted" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-full p-1.5 transition-colors hover:bg-surface-border"
                    >
                      <X size={20} className="text-ink-muted" />
                    </button>
                  </div>
                </div>

                <div className="flex min-h-[320px] items-center justify-center overflow-auto rounded-[22px] border border-surface-border/50 bg-surface p-4">
                  {selectedAttachment.type === "image" ? (
                    !imageError ? (
                      <img
                        src={selectedAttachment.url}
                        alt={selectedAttachment.name}
                        className="max-h-[70vh] max-w-full rounded-xl object-contain transition-transform duration-200"
                        style={{ transform: `scale(${zoomLevel})` }}
                        loading="lazy"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-ink-muted">
                        <ImageIcon size={64} className="text-ink-muted/30" />
                        <p className="text-sm text-ink-primary">
                          Imagem não disponível
                        </p>
                        <button
                          onClick={() => downloadAttachment(selectedAttachment)}
                          className="text-sm text-ice transition-colors hover:text-ice/80"
                        >
                          Baixar imagem
                        </button>
                      </div>
                    )
                  ) : selectedAttachment.type === "pdf" ? (
                    <div className="flex w-full flex-col items-center gap-4 text-ink-muted">
                      <FileText size={64} className="text-ice/30" />
                      <p className="text-sm text-ink-primary">
                        📄 {selectedAttachment.name}
                      </p>
                      <div className="flex gap-4 text-xs text-ink-muted/60">
                        <span>Clique em "Baixar" para visualizar</span>
                        <span>•</span>
                        <span>PDF</span>
                      </div>
                      <button
                        onClick={() => downloadAttachment(selectedAttachment)}
                        className="text-sm text-ice transition-colors hover:text-ice/80"
                      >
                        Baixar PDF
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-ink-muted">
                      <FileIcon size={64} className="text-ink-muted/30" />
                      <p className="text-sm text-ink-primary">
                        {selectedAttachment.name}
                      </p>
                      <p className="text-xs text-ink-muted/60">
                        Pré-visualização não disponível
                      </p>
                      <button
                        onClick={() => downloadAttachment(selectedAttachment)}
                        className="text-sm text-ice transition-colors hover:text-ice/80"
                      >
                        Baixar arquivo
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadAttachment(selectedAttachment)}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 size={14} className="mr-1 animate-spin" />
                    ) : (
                      <Download size={14} className="mr-1" />
                    )}
                    {isDownloading ? "Baixando..." : "Baixar"}
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ScrollToTop threshold={300} />
      </main>
    </PageTransition>
  );
}