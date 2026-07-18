"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Users,
  Check,
} from "lucide-react";
import { useDocument } from "@/hooks/useDocuments";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, type Attachment, type Vault } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { ExportCardButton } from "@/components/ExportCardButton";
import { db, shareDocumentWithVault } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";

const CATEGORY_ICONS: Record<string, typeof Heart> = {
  saude: Heart,
  pessoal: User,
  empresa: Building2,
  outros: FolderOpen,
};

const formatDate = (date?: string) => {
  if (!date) return null;
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
  const id = Number(searchParams.get("id"));
  const { showToast } = useToast();
  const { user } = useAuth();

  const doc = useDocument(id);
  const { deleteDocument, favorite } = useSafeDb();
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedVaultId, setSelectedVaultId] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // Busca os cofres do usuário
  const userVaults = useLiveQuery(
    () => db.vaults.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );

  // Verifica se o documento já está em algum cofre
  const isShared = doc?.vault_id !== undefined && doc?.vault_id !== null && doc?.vault_id > 0;

  useEffect(() => {
    if (doc?.vault_id) {
      setSelectedVaultId(doc.vault_id);
    }
  }, [doc]);

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

  const category = CATEGORIES[doc.category_id];
  const CategoryIcon = CATEGORY_ICONS[doc.category_id] || FolderOpen;
  const hasMetadata = Object.keys(doc.metadata || {}).length > 0;

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      setIsDeleting(true);
      try {
        await deleteDocument(doc.id!);
        trigger("success");
        showToast("Documento excluído com sucesso!", "success");
        router.push("/");
      } catch {
        showToast("Erro ao excluir documento", "error");
        trigger("error");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleFavoriteToggle = async () => {
    await favorite(doc.id!);
    trigger("vibrate");
    showToast(doc.is_favorite ? "Removido dos favoritos" : "Adicionado aos favoritos", "info");
  };

  const handleShareNative = () => {
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
  };

  const handleShareToVault = async () => {
    if (!selectedVaultId || !doc.id) {
      trigger("error");
      showToast("Selecione um cofre", "error");
      return;
    }

    setIsSharing(true);
    try {
      await shareDocumentWithVault(doc.id, selectedVaultId);
      trigger("success");
      showToast("Documento compartilhado com o cofre!", "success");
      setIsShareModalOpen(false);
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
      trigger("error");
      showToast("Erro ao compartilhar documento", "error");
    } finally {
      setIsSharing(false);
    }
  };

  const openAttachment = (attachment: Attachment) => {
    setSelectedAttachment(attachment);
    setIsRenaming(false);
    setZoomLevel(1);
    setIsModalOpen(true);
    trigger("vibrate");
  };

  const downloadAttachment = async (attachment: Attachment) => {
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
  };

  const updateAttachmentName = (newName: string) => {
    if (!selectedAttachment || !doc) return;
    setSelectedAttachment({ ...selectedAttachment, name: newName });
    setIsRenaming(false);
    trigger("success");
    showToast("Nome atualizado com sucesso!", "success");
  };

  const FileIcon = selectedAttachment
    ? getFileIcon(selectedAttachment.type)
    : File;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
                <h1 className="font-display text-xl font-semibold text-ink-primary truncate max-w-[200px]">
                  {doc.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFavoriteToggle}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
              >
                <Star
                  size={18}
                  className={doc.is_favorite ? "fill-ice text-ice" : "text-ink-muted"}
                />
              </button>
              <button
                onClick={handleShareNative}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
              >
                <Share2 size={18} className="text-ink-muted" />
              </button>
              <button
                onClick={() => {
                  trigger("vibrate");
                  setIsShareModalOpen(true);
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                  isShared ? "border-ice bg-ice/10 text-ice" : "border-surface-border bg-surface-raised text-ink-muted"
                } active:scale-[0.98] transition-all`}
              >
                <Users size={18} />
              </button>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          <div
            ref={cardRef}
            className="rounded-card border p-6 shadow-vault"
            style={{ borderColor: `${category.color}33`, backgroundColor: "rgba(20, 24, 29, 0.8)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${category.color}22` }}
              >
                <CategoryIcon size={22} style={{ color: category.color }} />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink-primary">
                  {doc.title}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-ink-muted">{category.name}</span>
                  <span className="w-1 h-1 rounded-full bg-ink-faint" />
                  <span className="text-xs text-ink-muted capitalize">{doc.type}</span>
                  {isShared && (
                    <span className="text-xs text-ice flex items-center gap-1">
                      <Users size={12} />
                      Compartilhado
                    </span>
                  )}
                </div>
              </div>
            </div>

            {hasMetadata && (
              <div className="border-t border-surface-border pt-4 space-y-2">
                {Object.entries(doc.metadata || {}).map(([key, value]) => {
                  if (!value) return null;
                  return (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-ink-muted">
                        {key.replace(/_/g, " ").toUpperCase()}:
                      </span>
                      <span className="text-sm text-ink-primary font-medium">
                        {typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)
                          ? formatDate(value)
                          : value}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {doc.description && (
              <div className="mt-4 border-t border-surface-border pt-4">
                <p className="text-sm font-medium text-ink-muted mb-1">Notas</p>
                <p className="text-sm text-ink-primary">{doc.description}</p>
              </div>
            )}

            <div className="mt-4 border-t border-surface-border pt-4 flex justify-between items-center">
              <p className="text-xs text-ink-muted">
                {doc.synced ? (
                  <span className="text-green-400">✓ Sincronizado</span>
                ) : (
                  <span className="text-coral animate-pulse">↻ Pendente</span>
                )}
              </p>
              <p className="text-xs text-ink-muted">Criado em {formatDate(doc.created_at)}</p>
            </div>
          </div>

          {doc.attachments && doc.attachments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-ink-muted">
                  Anexos ({doc.attachments.length})
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {doc.attachments.map((attachment) => {
                  const Icon = getFileIcon(attachment.type);
                  return (
                    <button
                      key={attachment.id}
                      onClick={() => openAttachment(attachment)}
                      className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-raised border border-surface-border hover:border-steel-light transition-colors active:scale-[0.98]"
                    >
                      <Icon size={24} className="text-steel-light" />
                      <span className="text-xs text-ink-muted truncate w-full text-center mt-1">
                        {attachment.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <ExportCardButton
              cardRef={cardRef}
              title={doc.title}
              variant="secondary"
              size="sm"
              label="📄 Exportar PDF"
            />

            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2"
              onClick={() => {
                trigger("vibrate");
                router.push(`/editar?id=${doc.id}`);
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
          </div>
        </section>

        {/* Modal de Anexo */}
        {isModalOpen && selectedAttachment && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="relative max-w-4xl w-full rounded-2xl bg-surface-raised border border-surface-border shadow-vault p-4 animate-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
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
                      }
                    }}
                    className="p-1.5 rounded-full hover:bg-surface-border transition-colors flex-shrink-0"
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

              <div className="flex items-center justify-center min-h-[300px] bg-surface rounded-xl border border-surface-border p-4 overflow-auto">
                {selectedAttachment.type.startsWith("image/") ? (
                  <img
                    src={selectedAttachment.url}
                    alt={selectedAttachment.name}
                    className="max-h-[70vh] max-w-full object-contain transition-transform duration-200 rounded-lg"
                    style={{ transform: `scale(${zoomLevel})` }}
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-ink-muted">
                    <FileIcon size={64} />
                    <p className="text-sm">Pré-visualização não disponível</p>
                    <p className="text-xs text-ink-muted/60">Clique em "Baixar" para visualizar</p>
                  </div>
                )}
              </div>

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
            </div>
          </div>
        )}

        {/* Modal de Compartilhamento com Cofre */}
        {isShareModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setIsShareModalOpen(false)}
          >
            <div
              className="relative max-w-md w-full rounded-2xl bg-surface-raised border border-surface-border shadow-vault p-6 animate-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold text-ink-primary">
                  Compartilhar com cofre
                </h2>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1 rounded-full hover:bg-surface-border transition-colors"
                >
                  <X size={20} className="text-ink-muted" />
                </button>
              </div>

              <p className="text-sm text-ink-muted mb-4">
                Selecione um cofre para compartilhar este documento.
              </p>

              {userVaults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-ink-muted text-sm">Você não tem nenhum cofre criado.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setIsShareModalOpen(false);
                      router.push("/vaults/novo");
                    }}
                  >
                    Criar cofre
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {userVaults.map((vault) => {
                    const isSelected = selectedVaultId === vault.id;
                    const isVaultShared = doc?.vault_id === vault.id;

                    return (
                      <button
                        key={vault.id}
                        onClick={() => setSelectedVaultId(vault.id!)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${
                          isSelected
                            ? "border-ice bg-ice/10 text-ice"
                            : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                        } ${isVaultShared ? "border-green-500/50 bg-green-500/10" : ""}`}
                      >
                        <span className="text-2xl">{vault.icon || '🔒'}</span>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{vault.name}</p>
                          {isVaultShared && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <Check size={12} />
                              Compartilhado
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-3 h-3 rounded-full bg-ice" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsShareModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleShareToVault}
                  disabled={!selectedVaultId || isSharing}
                >
                  {isSharing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : doc?.vault_id === selectedVaultId ? (
                    "Atualizar"
                  ) : (
                    "Compartilhar"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}