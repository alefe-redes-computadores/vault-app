"use client";

import { memo } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";

interface DocumentCardProps {
  document: Document;
  onFavoriteToggle?: (id: number) => void;
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

function DocumentCardComponent({ document, onFavoriteToggle, compact = false }: DocumentCardProps) {
  const { trigger } = useHapticFeedback();
  const router = useRouter();

  const category = CATEGORIES[document.category_id];
  const color = category?.color || "#6B7280";
  const TypeIcon = TYPE_ICONS[document.type] || FileText;

  const handlePress = () => {
    trigger("vibrate");
    router.push(`/detalhes?id=${document.id}`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger("vibrate");
    onFavoriteToggle?.(document.id!);
  };

  const hasAttachments = document.attachments && document.attachments.length > 0;

  const metadataKeys = Object.keys(document.metadata || {}).filter(
    (key) => !["issue_date", "expiry_date", "renewal_date", "prescription_date", "date"].includes(key)
  );
  const firstMetadata = metadataKeys.length > 0 ? document.metadata[metadataKeys[0]] : null;

  const expiryDate = document.metadata?.expiry_date || document.metadata?.renewal_date;
  const isExpiring = expiryDate && new Date(expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isExpired = expiryDate && new Date(expiryDate) < new Date();

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={handlePress}
      className="relative overflow-hidden rounded-xl border p-4 shadow-sm cursor-pointer bg-surface hover:shadow-md transition-shadow"
      style={{ borderColor: `${color}25` }}
    >
      {/* Rebites */}
      <span className="rivet rivet-tl" />
      <span className="rivet rivet-br" />

      <div className="flex items-start gap-3">
        {/* Ícone com cor da categoria */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15` }}
        >
          <TypeIcon size={18} style={{ color }} />
        </div>

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

            <button
              onClick={handleFavorite}
              className="flex-shrink-0 p-1 rounded-full hover:bg-surface-border transition-colors"
            >
              <Star
                size={16}
                className={document.is_favorite ? "fill-ice text-ice" : "text-ink-muted/50"}
              />
            </button>
          </div>

          {/* Destaque do metadata */}
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

            {expiryDate && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  isExpired ? "text-coral" : isExpiring ? "text-coral/80" : "text-ink-muted"
                }`}
              >
                <Calendar size={12} />
                <span>{isExpired ? "Vencido:" : isExpiring ? "Vence em:" : "Vence:"} {formatDate(expiryDate)}</span>
              </div>
            )}
          </div>

          {document.description && !compact && (
            <p className="mt-2 text-sm text-ink-muted line-clamp-2">{document.description}</p>
          )}
        </div>
      </div>

      {/* Badges */}
      {hasAttachments && (
        <div className="absolute bottom-3 right-3">
          <Paperclip size={14} className="text-ink-muted/50" />
        </div>
      )}

      {!document.synced && (
        <div className="absolute top-3 right-12">
          <div className="w-2 h-2 rounded-full bg-coral animate-pulse" />
        </div>
      )}
    </motion.div>
  );
}

export const DocumentCard = memo(DocumentCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.document.id === nextProps.document.id &&
    prevProps.document.is_favorite === nextProps.document.is_favorite &&
    prevProps.document.synced === nextProps.document.synced &&
    prevProps.compact === nextProps.compact
  );
});