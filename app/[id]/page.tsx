"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import { useDocument } from "@/hooks/useDocuments";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, DOCUMENT_FIELDS, type Attachment } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mapeamento de ícones por categoria
const CATEGORY_ICONS: Record<string, typeof Heart> = {
  saude: Heart,
  pessoal: User,
  empresa: Building2,
  outros: FolderOpen,
};

// Helper para formatar data
const formatDate = (date?: string) => {
  if (!date) return null;
  try {
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return date;
  }
};

// Helper para obter o label do campo
const getFieldLabel = (type: string, key: string): string => {
  const fields = DOCUMENT_FIELDS[type as keyof typeof DOCUMENT_FIELDS] || [];
  const field = fields.find((f) => f.key === key);
  return field?.label || key.replace("_", " ").toUpperCase();
};

export default function DocumentDetailPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const document = useDocument(id);
  const { deleteDocument, favorite } = useSafeDb();
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!document) {
    return (
      <main className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-muted">Documento não encontrado</p>
          <Button
            variant="primary"
            onClick={() => router.push("/")}
            className="mt-4"
          >
            Voltar
          </Button>
        </div>
      </main>
    );
  }

  const category = CATEGORIES[document.category_id];
  const CategoryIcon = CATEGORY_ICONS[document.category_id] || FolderOpen;
  const fields = DOCUMENT_FIELDS[document.type as keyof typeof DOCUMENT_FIELDS] || [];
  const hasMetadata = Object.keys(document.metadata || {}).length > 0;

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      await deleteDocument(document.id!);
      trigger("success");
      router.push("/");
    }
  };

  const handleFavoriteToggle = async () => {
    await favorite(document.id!);
    trigger("vibrate");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: document.title,
          text: document.description || "",
        })
        .catch(() => {});
    }
  };

  const openAttachment = (attachment: Attachment) => {
    setSelectedAttachment(attachment);
    setIsModalOpen(true);
    trigger("vibrate");
  };

  const downloadAttachment = (attachment: Attachment) => {
    // Simula download (em produção, usaria Filesystem do Capacitor)
    const a = document.createElement("a");
    a.href = attachment.url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    trigger("vibrate");
  };

  return (
    <main className="min-h-screen bg-void pb-28">
      {/* Header */}
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
                {document.title}
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
                className={document.is_favorite ? "fill-ice text-ice" : "text-ink-muted"}
              />
            </button>
            <button
              onClick={handleShare}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
            >
              <Share2 size={18} className="text-ink-muted" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <section className="px-5 pt-6 space-y-6">
        {/* Info Card */}
        <div
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
                {document.title}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-ink-muted">{category.name}</span>
                <span className="w-1 h-1 rounded-full bg-ink-faint" />
                <span className="text-xs text-ink-muted capitalize">{document.type}</span>
              </div>
            </div>
          </div>

          {/* Metadados específicos */}
          {hasMetadata && (
            <div className="border-t border-surface-border pt-4 space-y-2">
              {fields.map((field) => {
                const value = document.metadata?.[field.key];
                if (!value) return null;
                return (
                  <div key={field.key} className="flex justify-between items-center">
                    <span className="text-sm text-ink-muted">{field.label}:</span>
                    <span className="text-sm text-ink-primary font-medium">
                      {field.type === "date" ? formatDate(value) : value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Descrição/Notas */}
          {document.description && (
            <div className="mt-4 border-t border-surface-border pt-4">
              <p className="text-sm font-medium text-ink-muted mb-1">Notas</p>
              <p className="text-sm text-ink-primary">{document.description}</p>
            </div>
          )}

          {/* Status de sincronização */}
          <div className="mt-4 border-t border-surface-border pt-4 flex justify-between items-center">
            <p className="text-xs text-ink-muted">
              {document.synced ? (
                <span className="text-green-400">✓ Sincronizado</span>
              ) : (
                <span className="text-coral animate-pulse">↻ Pendente</span>
              )}
            </p>
            <p className="text-xs text-ink-muted">
              Criado em {formatDate(document.created_at)}
            </p>
          </div>
        </div>

        {/* Anexos */}
        {document.attachments && document.attachments.length > 0 && (
          <div>
            <p className="text-sm font-medium text-ink-muted mb-2">Anexos</p>
            <div className="grid grid-cols-2 gap-2">
              {document.attachments.map((attachment) => (
                <button
                  key={attachment.id}
                  onClick={() => openAttachment(attachment)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-raised border border-surface-border hover:border-steel-light transition-colors active:scale-[0.98]"
                >
                  {attachment.type === "image" ? (
                    <ImageIcon size={24} className="text-steel-light" />
                  ) : (
                    <File size={24} className="text-steel-light" />
                  )}
                  <span className="text-xs text-ink-muted truncate w-full text-center mt-1">
                    {attachment.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            className="flex items-center justify-center gap-2"
            onClick={() => {
              trigger("vibrate");
              router.push(`/${document.id}/editar`);
            }}
          >
            <Edit size={16} />
            Editar documento
          </Button>

          <Button
            variant="danger"
            className="flex items-center justify-center gap-2"
            onClick={handleDelete}
          >
            <Trash2 size={16} />
            Excluir documento
          </Button>
        </div>
      </section>

      {/* Modal de Anexo */}
      {isModalOpen && selectedAttachment && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full rounded-2xl bg-surface-raised border border-surface-border shadow-vault p-4 animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={selectedAttachment.name}
                  onChange={(e) => {
                    setSelectedAttachment({
                      ...selectedAttachment,
                      name: e.target.value,
                    });
                  }}
                  className="w-full bg-transparent text-ink-primary font-medium focus:outline-none border-b border-transparent focus:border-steel-light transition-colors"
                />
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-surface-border transition-colors"
              >
                <X size={20} className="text-ink-muted" />
              </button>
            </div>

            {/* Visualização */}
            <div className="flex items-center justify-center min-h-[300px] bg-surface rounded-xl border border-surface-border p-4">
              {selectedAttachment.type === "image" ? (
                <img
                  src={selectedAttachment.url}
                  alt={selectedAttachment.name}
                  className="max-h-[500px] max-w-full object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-ink-muted">
                  <File size={48} />
                  <p>Pré-visualização não disponível para PDF</p>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => downloadAttachment(selectedAttachment)}
              >
                <Download size={14} className="mr-1" />
                Baixar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}