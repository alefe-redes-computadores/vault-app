"use client";

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Document, CATEGORIES } from "@/lib/types";
import { useHapticFeedback } from "@/lib/haptics";
import {
  Star,
  Calendar,
  FileText,
  Paperclip,
  Contact,
  Pill,
  Heart,
  ClipboardList,
  File,
  Building2,
  FolderOpen,
  type LucideIcon,
  CheckCircle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

interface DocumentCardProps {
  document: Document;
  personName?: string;
  onFavoriteToggle?: (id: string) => void;
  compact?: boolean;
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  rg: Contact,
  cpf: FileText,
  cnh: FileText,
  certificado: File,
  receita: Pill,
  prontuario: Heart,
  laudo: ClipboardList,
  encaminhamento: Building2,
  outro: FolderOpen,
};

const formatDate = (date?: string) => {
  if (!date) return null;
  try {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return null;
  }
};

function DocumentCardComponent({
  document,
  personName,
  onFavoriteToggle,
  compact = false,
}: DocumentCardProps) {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { showToast } = useToast();

  const [showSyncTooltip, setShowSyncTooltip] = useState(false);
  const [isFavoriteAnimating, setIsFavoriteAnimating] = useState(false);

  const category = CATEGORIES[document.category_id];
  const color = category?.color || "#6B7280";
  const TypeIcon = TYPE_ICONS[document.type] || FileText;

  const handlePress = useCallback(() => {
    trigger("vibrate");
    router.push(`/detalhes?id=${document.id}`);
  }, [trigger, router, document.id]);

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      trigger("success");
      setIsFavoriteAnimating(true);
      setTimeout(() => setIsFavoriteAnimating(false), 420);
      showToast(
        document.is_favorite
          ? "Removido dos favoritos"
          : "Adicionado aos favoritos",
        "info"
      );
      onFavoriteToggle?.(document.id!);
    },
    [trigger, document.is_favorite, document.id, onFavoriteToggle, showToast]
  );

  const hasAttachments = document.attachments && document.attachments.length > 0;
  const hasImageAttachment = document.attachments?.some((a) => a.type === "image");

  const metadataKeys = Object.keys(document.metadata || {}).filter(
    (key) =>
      !["issue_date", "expiry_date", "renewal_date", "prescription_date", "date"].includes(key)
  );
  const firstMetadata =
    metadataKeys.length > 0 ? document.metadata[metadataKeys[0]] : null;

  const expiryDate = document.metadata?.expiry_date || document.metadata?.renewal_date;
  const isExpiring =
    expiryDate &&
    new Date(expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isExpired = expiryDate && new Date(expiryDate) < new Date();

  const syncIcon = document.synced ? (
    <CheckCircle size={12} className="text-emerald-400" />
  ) : (
    <Loader2 size={12} className="animate-spin text-coral" />
  );
  const syncLabel = document.synced ? "Sincronizado" : "Pendente de sincronização";

  const handleSyncIconClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowSyncTooltip((prev) => !prev);
      trigger("vibrate");
    },
    [trigger]
  );

  return (
    <div
      onClick={handlePress}
      className="relative cursor-pointer overflow-hidden rounded-[24px] border bg-surface p-4 shadow-sm transition-all duration-200 active:scale-[0.985] hover:border-ice/15 hover:shadow-lg"
      style={{ borderColor: `${color}22` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-200"
          style={{ backgroundColor: `${color}15` }}
        >
          <TypeIcon size={18} style={{ color }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-[15px] font-semibold text-ink-primary">
                {document.title}
              </h3>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                <span>{category?.name}</span>
                <span className="h-1 w-1 rounded-full bg-ink-faint" />
                {personName ? (
                  <span>{personName}</span>
                ) : (
                  <span className="capitalize">{document.type}</span>
                )}

                {category && (
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${color}12`,
                      borderColor: `${color}28`,
                      color,
                    }}
                  >
                    {category.name}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleFavorite}
              className="shrink-0 rounded-full p-1.5 transition-colors duration-150 active:scale-90 hover:bg-surface-border/50"
            >
              <AnimatePresence>
                <motion.div
                  animate={
                    isFavoriteAnimating
                      ? { scale: 1.22, rotate: 16 }
                      : { scale: 1, rotate: 0 }
                  }
                  transition={{ duration: 0.18 }}
                >
                  <Star
                    size={16}
                    className={
                      document.is_favorite
                        ? "fill-ice text-ice"
                        : "text-ink-muted/55"
                    }
                  />
                </motion.div>
              </AnimatePresence>
            </button>
          </div>

          {firstMetadata && (
            <p className="mt-1 truncate text-sm font-medium text-ink-primary">
              {firstMetadata}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            {document.metadata?.issue_date && (
              <div className="flex items-center gap-1 text-xs text-ink-muted">
                <Calendar size={12} />
                <span>Emissão: {formatDate(document.metadata.issue_date)}</span>
              </div>
            )}

            {expiryDate && (
              <div
                className={`flex items-center gap-1 text-xs transition-colors duration-150 ${
                  isExpired
                    ? "text-coral"
                    : isExpiring
                    ? "text-coral/80"
                    : "text-ink-muted"
                }`}
              >
                <Calendar size={12} />
                <span>
                  {isExpired ? "Vencido:" : isExpiring ? "Vence em:" : "Vence:"}{" "}
                  {formatDate(expiryDate)}
                </span>
              </div>
            )}
          </div>

          {document.description && !compact && (
            <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
              {document.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-ink-faint">
          {hasAttachments && (
            <span className="inline-flex items-center gap-1">
              {hasImageAttachment ? (
                <ImageIcon size={13} />
              ) : (
                <Paperclip size={13} />
              )}
              <span>Anexo</span>
            </span>
          )}
        </div>

        <div className="relative">
          <button
            onClick={handleSyncIconClick}
            className="flex items-center gap-1 rounded-full p-1 transition-colors duration-150 active:scale-90 hover:bg-surface-border/50"
            aria-label="Status de sincronização"
          >
            {syncIcon}
          </button>

          {showSyncTooltip && (
            <span className="absolute right-0 top-[-1.9rem] whitespace-nowrap rounded-full border border-surface-border/50 bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted shadow-md">
              {syncLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const DocumentCard = memo(DocumentCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.document.id === nextProps.document.id &&
    prevProps.document.is_favorite === nextProps.document.is_favorite &&
    prevProps.document.synced === nextProps.document.synced &&
    prevProps.compact === nextProps.compact &&
    prevProps.personName === nextProps.personName
  );
});