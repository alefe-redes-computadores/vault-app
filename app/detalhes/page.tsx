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
  if (type === 'image') return ImageIcon;
  if (type === 'pdf') return FileText;
  return File;
};

// ============================================================
// FUNÇÕES PARA EXTRAIR NOME BASE E EXTENSÃO
// ============================================================
const getBaseName = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return filename;
  return filename.substring(0, lastDot);
};

const getExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
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

  // ============================================================
  // EXCLUIR DOCUMENTO
  // ============================================================
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

  // ============================================================
  // FAVORITAR
  // ============================================================
  const handleFavoriteToggle = useCallback(async () => {
    if (!doc || !doc.id) return;
    await favorite(doc.id);
    trigger("vibrate");
    showToast(doc.is_favorite ? "Removido dos favoritos" : "Adicionado aos favoritos", "info");
  }, [doc, favorite, trigger, showToast]);

  // ============================================================
  // COMPARTILHAR
  // ============================================================
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

  // ============================================================
  // ABRIR ANEXO
  // ============================================================
  const openAttachment = useCallback((attachment: Attachment) => {
    setSelectedAttachment(attachment);
    setIsRenaming(false);
    setZoomLevel(1);
    setImageError(false);
    setIsModalOpen(true);
    trigger("vibrate");
  }, [trigger]);

  // ============================================================
  // BAIXAR ANEXO
  // ============================================================
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

  // ============================================================
  // RENOMEAR ANEXO - CORRIGIDO (salva no banco)
  // ============================================================
  const updateAttachmentName = useCallback(async (newBaseName: string) => {
    if (!selectedAttachment || !doc || !doc.id) return;

    // Pega a extensão original do arquivo
    const extension = getExtension(selectedAttachment.name);
    const newFullName = buildFullName(newBaseName, extension);

    // Atualiza o attachment no array
    const updatedAttachments = doc.attachments.map((att) =>
      att.id === selectedAttachment.id 
        ? { ...att, name: newFullName } 
        : att
    );

    try {
      // Salva no banco local (Dexie)
      await db.documents.update(doc.id, {
        attachments: updatedAttachments,
        updated_at: new Date().toISOString(),
        synced: false, // Marca como não sincronizado para enviar para a nuvem
      });

      // Atualiza o estado local
      setSelectedAttachment({ ...selectedAttachment, name: newFullName });
      
      // Atualiza o documento no cache local (opcional)
      // O useDocument vai revalidar sozinho

      setIsRenaming(false);
      trigger("success");
      showToast("Nome atualizado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao renomear anexo:", error);
      trigger("error");
      showToast("Erro ao renomear anexo", "error");
    }
  }, [selectedAttachment, doc, trigger, showToast]);

  // ============================================================
  // RENDER
  // ============================================================
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

            {/* Metadados - TRADUZIDOS */}
            {hasMetadata && (
              <div className="border-t border-surface-border/50 pt-4 space-y-2">
                {Object.entries(doc.metadata || {}).map(([key, value]) => {
                  if (!value) return null;
                  let displayValue: string = String(value);
                  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
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
                  
                  const label = labels[key] || key.replace(/_/g, " ").toUpperCase();
                  
                  return (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-ink-muted">{label}:</span>
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

          {/* ANEXOS COM MINIATURA */}
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
                  const isImage = attachment.type === 'image';
                  
                  return (
                    <button
                      key={attachment.id}
                      onClick={() => openAttachment(attachment)}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-surface-raised border border-surface-border/50 hover:border-surface-border transition-colors active:scale-95 relative overflow-hidden"
                    >
                      {isImage ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="w-full h-20 object-cover rounded-lg"
                          loading="lazy"
                          onError={(e) => {
                            // Se a imagem falhar, mostra ícone
                            (e.target as HTMLImageElement).style.display = 'none';
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                              const icon = document.createElement('div');
                              icon.className = 'flex items-center justify-center w-full h-20';
                              icon.innerHTML = `<svg class="w-8 h-8 text-ink-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`;
                              parent.prepend(icon);
                            }
                          }}
                        />
                      ) : (
                        <Icon size={24} className="text-ink-muted" />
                      )}
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

        {/* MODAL DE ANEXO - CORRIGIDO (rename com extensão preservada) */}
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
                      value={getBaseName(selectedAttachment.name)}
                      onChange={(e) =>
                        setSelectedAttachment({
                          ...selectedAttachment,
                          name: buildFullName(e.target.value, getExtension(selectedAttachment.name)),
                        })
                      }
                      className="flex-1 bg-transparent text-ink-primary font-medium focus:outline-none border-b border-ice/30 focus:border-ice transition-colors"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateAttachmentName(getBaseName(selectedAttachment.name));
                        }
                        if (e.key === 'Escape') {
                          setIsRenaming(false);
                        }
                      }}
                    />
                  ) : (
                    <p className="text-ink-primary font-medium truncate">{getBaseName(selectedAttachment.name)}</p>
                  )}
                  <span className="text-xs text-ink-muted/50 flex-shrink-0">
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
                    className="p-1.5 rounded-full hover:bg-surface-border transition-colors flex-shrink-0"
                    title={isRenaming ? "Salvar nome" : "Renomear"}
                  >
                    <Pencil size={16} className="text-ink-muted" />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedAttachment.type === 'image' && (
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

              {/* Visualização */}
              <div className="flex items-center justify-center min-h-[300px] bg-surface rounded-xl border border-surface-border/50 p-4 overflow-auto">
                {selectedAttachment.type === 'image' ? (
                  !imageError ? (
                    <img
                      src={selectedAttachment.url}
                      alt={selectedAttachment.name}
                      className="max-h-[70vh] max-w-full object-contain transition-transform duration-200 rounded-lg"
                      style={{ transform: `scale(${zoomLevel})` }}
                      loading="lazy"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-ink-muted">
                      <ImageIcon size={64} className="text-ink-muted/30" />
                      <p className="text-sm text-ink-primary">Imagem não disponível</p>
                      <button
                        onClick={() => downloadAttachment(selectedAttachment)}
                        className="text-ice hover:text-ice/80 transition-colors text-sm"
                      >
                        Baixar imagem
                      </button>
                    </div>
                  )
                ) : selectedAttachment.type === 'pdf' ? (
                  <div className="flex flex-col items-center gap-4 text-ink-muted w-full">
                    <FileText size={64} className="text-ice/30" />
                    <p className="text-sm text-ink-primary">📄 {selectedAttachment.name}</p>
                    <div className="flex gap-4 text-xs text-ink-muted/60">
                      <span>Clique em "Baixar" para visualizar</span>
                      <span>•</span>
                      <span>PDF</span>
                    </div>
                    <button
                      onClick={() => downloadAttachment(selectedAttachment)}
                      className="text-ice hover:text-ice/80 transition-colors text-sm"
                    >
                      Baixar PDF
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-ink-muted">
                    <FileIcon size={64} className="text-ink-muted/30" />
                    <p className="text-sm text-ink-primary">{selectedAttachment.name}</p>
                    <p className="text-xs text-ink-muted/60">Pré-visualização não disponível</p>
                    <button
                      onClick={() => downloadAttachment(selectedAttachment)}
                      className="text-ice hover:text-ice/80 transition-colors text-sm"
                    >
                      Baixar arquivo
                    </button>
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