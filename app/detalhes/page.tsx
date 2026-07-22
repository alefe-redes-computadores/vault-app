"use client";

import { useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Trash2,
  Edit,
  Calendar,
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
  if (type.startsWith("image/")) return ImageIcon;
  if (type === "application/pdf") return FileText;
  if (type.includes("word") || type.includes("document")) return FileText;
  if (type.includes("sheet") || type.includes("excel")) return FileText;
  return File;
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

  const cardRef = useRef<HTMLDivElement>(null);

  const handleDelete = useCallback(async () => {
    if (!doc || !doc.id) {
      showToast("Documento não encontrado", "error");
      return;
    }

    const toastId = showSuccess(
      `"${doc.title}" foi excluído`,
      5000,
      {
        label: "Desfazer",
        onClick: () => {
          showToast("Restauração em breve...", "info");
        }
      }
    );

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
    showToast(doc.is_favorite ? "Removido dos favoritos" : "Adicionado aos favoritos", "info");
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

  const openAttachment = useCallback((attachment: Attachment) => {
    setSelectedAttachment(attachment);
    setIsRenaming(false);
    setZoomLevel(1);
    setIsModalOpen(true);
    trigger("vibrate");
  }, [trigger]);

  const downloadAttachment = useCallback(async (attachment: Attachment) => {
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
  }, [trigger, showToast]);

  const updateAttachmentName = useCallback((newName: string) => {
    if (!selectedAttachment || !doc) return;
    // Atualiza o attachment no documento local
    const updatedAttachments = doc.attachments.map((att) =>
      att.id === selectedAttachment.id ? { ...att, name: newName } : att
    );
    // Salva no banco
    // TODO: adicionar função de atualização de attachment
    setSelectedAttachment({ ...selectedAttachment, name: newName });
    setIsRenaming(false);
    trigger("success");
    showToast("Nome atualizado com sucesso!", "success");
  }, [selectedAttachment, doc, trigger, showToast]);

  if (!doc) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void flex items-center justify-center">
          <div className="text-center">
            <p className="text-ink-muted">Documento não encontrado</p>
            <Button variant="primary" onClick={() => router.push("/")} className="mt-4">
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
  const FileIcon = selectedAttachment
    ? getFileIcon(selectedAttachment.type)
    : File;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="glass-header sticky top-0 z-10 px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
                <h1 className="font-display text-lg font-semibold text-ink-primary truncate max-w-[200px]">
                  {doc.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFavoriteToggle}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
              >
                <Star
                  size={18}
                  className={doc.is_favorite ? "fill-ice text-ice" : "text-ink-muted"}
                />
              </button>
              <button
                onClick={handleShare}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
              >
                <Share2 size={18} className="text-ink-muted" />
              </button>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          {/* CARD PRINCIPAL */}
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border p-6 shadow-vault bg-surface"
            style={{ borderColor: `${category?.color || '#6B7280'}25` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${category?.color || '#6B7280'}15` }}
              >
                <CategoryIcon size={22} style={{ color: category?.color || '#6B7280' }} />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink-primary">
                  {doc.title}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-ink-muted">{category?.name || 'Outros'}</span>
                  <span className="w-1 h-1 rounded-full bg-ink-faint" />
                  <span className="text-xs text-ink-muted capitalize">{doc.type}</span>
                  {doc.vault_id && (
                    <span className="text-xs text-ice flex items-center gap-1">
                      <User size={10} />
                      Compartilhado
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Metadados */}
            {hasMetadata && (
              <div className="border-t border-surface-border/50 pt-4 space-y-2">
                {Object.entries(doc.metadata || {}).map(([key, value]) => {
                  if (!value) return null;
                  let displayValue: string = String(value);
                  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
                    displayValue = formatDate(value);
                  }
                  return (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-ink-muted">
                        {key.replace(/_/g, " ").toUpperCase()}:
                      </span>
                      <span className="text-sm text-ink-primary font-medium">
                        {displayValue}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Descrição */}
            {doc.description && (
              <div className="mt-4 border-t border-surface-border/50 pt-4">
                <p className="text-sm font-medium text-ink-muted mb-1">Notas</p>
                <p className="text-sm text-ink-primary">{doc.description}</p>
              </div>
            )}

            {/* Status */}
            <div className="mt-4 border-t border-surface-border/50 pt-4 flex justify-between items-center">
              <p className="text-xs text-ink-muted">
                {doc.synced ? (
                  <span className="text-green-400">✓ Sincronizado</span>
                ) : (
                  <span className="text-coral animate-pulse">↻ Pendente</span>
                )}
              </p>
              <p className="text-xs text-ink-muted">Criado em {formatDate(doc.created_at)}</p>
            </div>
          </motion.div>

          {/* ANEXOS */}
          {hasAttachments && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-ink-muted flex items-center gap-2">
                  <Paperclip size={14} />
                  Anexos ({doc.attachments.length})
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {doc.attachments.map((attachment: any) => {
                  const Icon = getFileIcon(attachment.type);
                  return (
                    <button
                      key={attachment.id}
                      onClick={() => openAttachment(attachment)}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-surface-raised border border-surface-border/50 hover:border-surface-border transition-colors active:scale-95"
                    >
                      <Icon size={24} className="text-ink-muted" />
                      <span className="text-xs text-ink-muted truncate w-full text-center mt-1">
                        {attachment.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* AÇÕES */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
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

        {/* MODAL DE ANEXO - CORRIGIDO */}
        {isModalOpen && selectedAttachment && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-4xl w-full rounded-2xl bg-surface-raised border border-surface-border shadow-vault p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {isRenaming ? (
                    <input
                      type="text"
                      value={selectedAttachment.name}
                      onChange={(e) =>
                        setSelectedAttachment({
                          ...selectedAttachment,
                          name: e.target.value,
                        })
                      }
                      className="flex-1 bg-transparent text-ink-primary font-medium focus:outline-none border-b border-ice/30 focus:border-ice transition-colors"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateAttachmentName(selectedAttachment.name);
                        }
                        if (e.key === 'Escape') {
                          setIsRenaming(false);
                        }
                      }}
                    />
                  ) : (
                    <p className="text-ink-primary font-medium truncate">{selectedAttachment.name}</p>
                  )}
                  <button
                    onClick={() => {
                      if (isRenaming) {
                        updateAttachmentName(selectedAttachment.name);
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
                    className="p-1.5 rounded-full hover:bg-surface-border transition-colors flex-shrink-0"
                    title={isRenaming ? "Salvar nome" : "Renomear"}
                  >
                    <Pencil size={16} className="text-ink-muted" />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedAttachment.type.startsWith("image/") && (
                    <>
                      <button
                        onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                        className="p-1.5 rounded-full hover:bg-surface-border transition-colors"
                      >
                        <ZoomOut size={16} className="text-ink-muted" />
                      </button>
                      <span className="text-xs text-ink-muted">{Math.round(zoomLevel * 100)}%</span>
                      <button
                        onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
                        className="p-1.5 rounded-full hover:bg-surface-border transition-colors"
                      >
                        <ZoomIn size={16} className="text-ink-muted" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 rounded-full hover:bg-surface-border transition-colors"
                  >
                    <X size={20} className="text-ink-muted" />
                  </button>
                </div>
              </div>

              {/* Visualização - CORRIGIDO para PDFs */}
              <div className="flex items-center justify-center min-h-[300px] bg-surface rounded-xl border border-surface-border/50 p-4 overflow-auto">
                {selectedAttachment.type.startsWith("image/") ? (
                  <img
                    src={selectedAttachment.url}
                    alt={selectedAttachment.name}
                    className="max-h-[70vh] max-w-full object-contain transition-transform duration-200 rounded-lg"
                    style={{ transform: `scale(${zoomLevel})` }}
                    loading="lazy"
                  />
                ) : selectedAttachment.type === "pdf" ? (
                  <div className="flex flex-col items-center gap-4 text-ink-muted w-full">
                    <FileText size={64} className="text-ice/30" />
                    <p className="text-sm text-ink-primary">📄 {selectedAttachment.name}</p>
                    <div className="flex gap-4 text-xs text-ink-muted/60">
                      <span>Clique em "Baixar" para visualizar</span>
                      <span>•</span>
                      <span>PDF</span>
                    </div>
                    {selectedAttachment.url && (
                      <object
                        data={selectedAttachment.url}
                        type="application/pdf"
                        className="w-full h-[500px] rounded-lg border border-surface-border/30"
                        style={{ minHeight: '300px' }}
                      >
                        <p className="text-center text-ink-muted p-4">
                          Seu navegador não suporta visualização de PDF.
                          <br />
                          <button
                            onClick={() => downloadAttachment(selectedAttachment)}
                            className="text-ice hover:text-ice/80 transition-colors mt-2"
                          >
                            Baixar para visualizar
                          </button>
                        </p>
                      </object>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-ink-muted">
                    <FileIcon size={64} />
                    <p className="text-sm">Pré-visualização não disponível</p>
                    <p className="text-xs text-ink-muted/60">Clique em "Baixar" para visualizar</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 mt-4">
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
                <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
                  Fechar
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        <ScrollToTop threshold={300} />
      </main>
    </PageTransition>
  );
}