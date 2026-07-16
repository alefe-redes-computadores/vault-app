"use client";

import { Document, CATEGORIES } from "@/lib/types";
import { useHapticFeedback } from "@/lib/haptics";
import { Star, Calendar, FileText, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";

interface DocumentCardProps {
  document: Document;
  onFavoriteToggle?: (id: number) => void;
  compact?: boolean;
}

const formatDate = (date?: string) => {
  if (!date) return null;
  try {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return null;
  }
};

export function DocumentCard({ document, onFavoriteToggle, compact = false }: DocumentCardProps) {
  const { trigger } = useHapticFeedback();
  const router = useRouter();

  const category = CATEGORIES[document.category_id];
  const color = category?.color || "#6B7280";

  const handlePress = () => {
    trigger("vibrate");
    router.push(`/${document.id}`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger("vibrate");
    onFavoriteToggle?.(document.id!);
  };

  const hasAttachments = document.attachments && document.attachments.length > 0;
  const isExpiring = document.metadata?.renewal_date &&
    new Date(document.metadata.renewal_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Pega o primeiro campo de metadata para exibir como destaque
  const metadataKeys = Object.keys(document.metadata || {}).filter(
    (key) => !["issue_date", "expiry_date", "renewal_date", "prescription_date", "date"].includes(key)
  );
  const firstMetadata = metadataKeys.length > 0 ? document.metadata[metadataKeys[0]] : null;

  return (
    <div
      onClick={handlePress}
      className="relative overflow-hidden rounded-card border p-4 shadow-vault active:scale-[0.98] transition-all duration-150 cursor-pointer bg-surface"
      style={{ borderColor: `${color}33` }}
    >
      {/* Rebites */}
      <span className="rivet rivet-tl" />
      <span className="rivet rivet-br" />

      <div className="flex items-start gap-3">
        {/* Ícone da categoria com cor */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${color}22` }}
        >
          <FileText size={18} style={{ color }} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-[15px] font-medium text-ink-primary truncate">
                {document.title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-ink-muted">{category?.name}</span>
                <span className="w-1 h-1 rounded-full bg-ink-faint" />
                <span className="text-xs text-ink-muted capitalize">{document.type}</span>
              </div>
            </div>

            {/* Favorito */}
            <button
              onClick={handleFavorite}
              className="flex-shrink-0 p-1 rounded-full hover:bg-surface-border transition-colors"
            >
              <Star
                size={18}
                className={document.is_favorite ? "fill-ice text-ice" : "text-ink-muted"}
              />
            </button>
          </div>

          {/* Destaque do primeiro campo de metadata */}
          {firstMetadata && (
            <p className="text-sm text-ink-primary font-medium mt-1 truncate">
              {firstMetadata}
            </p>
          )}

          {/* Datas */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {document.metadata?.issue_date && (
              <div className="flex items-center gap-1 text-xs text-ink-muted">
                <Calendar size={12} />
                <span>Emissão: {formatDate(document.metadata.issue_date)}</span>
              </div>
            )}

            {document.metadata?.expiry_date && (
              <div className="flex items-center gap-1 text-xs text-coral">
                <Calendar size={12} />
                <span>Vence: {formatDate(document.metadata.expiry_date)}</span>
              </div>
            )}

            {document.metadata?.renewal_date && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  isExpiring ? "text-coral" : "text-ink-muted"
                }`}
              >
                <Calendar size={12} />
                <span>Renovação: {formatDate(document.metadata.renewal_date)}</span>
              </div>
            )}
          </div>

          {/* Notas (se houver) */}
          {document.description && !compact && (
            <p className="mt-2 text-sm text-ink-muted line-clamp-2">{document.description}</p>
          )}
        </div>
      </div>

      {/* Badge de anexo */}
      {hasAttachments && (
        <div className="absolute bottom-3 right-3">
          <Paperclip size={14} className="text-ink-muted" />
        </div>
      )}

      {/* Badge de sincronização */}
      {!document.synced && (
        <div className="absolute top-3 right-12">
          <div className="w-2 h-2 rounded-full bg-coral animate-pulse" />
        </div>
      )}
    </div>
  );
}