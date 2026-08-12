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
  Stethoscope,
  Activity,
  type LucideIcon,
  CheckCircle2,
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
  consulta: Stethoscope,
  cirurgia: Activity,
  exame_sangue: Activity,
  exame_imagem: Activity,
  credencial: Contact,
  outro: FolderOpen,
};

// Formatação blindada para não falhar nem sumir com a data
const formatDate = (dateString?: string) => {
  if (!dateString || dateString.trim() === "") return null;
  try {
    if (dateString.includes("-")) {
      const [year, month, day] = dateString.split("-").map(Number);
      return format(new Date(year, month - 1, day), "dd/MM/yyyy", { locale: ptBR });
    }
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString; 
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

  // Filtra dados desnecessários ou repetitivos para o subtítulo
  const metadataKeys = Object.keys(document.metadata || {}).filter(
    (key) =>
      ![
        "issue_date",
        "expiry_date",
        "renewal_date",
        "prescription_date",
        "date_exame",
        "data_exame",
        "data_nascimento",
        "date",
        "doctor",
        "hospital",
        "institution",
        "medication",
        "modelo", // Omitimos o "modelo" para evitar a sensação de título duplicado
      ].includes(key)
  );
  
  const firstMetadata = metadataKeys.length > 0 ? document.metadata[metadataKeys[0]] : null;

  // Lógica inteligente para buscar as datas conforme o tipo de documento
  const rawIssueDate = document.metadata?.issue_date || document.metadata?.data_nascimento || document.metadata?.data_exame || document.metadata?.date;
  const rawExpiryDate = document.metadata?.expiry_date || document.metadata?.renewal_date || document.metadata?.validade;
  
  const formattedIssue = formatDate(rawIssueDate);
  const formattedExpiry = formatDate(rawExpiryDate);

  const isExpiring = rawExpiryDate && new Date(rawExpiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isExpired = rawExpiryDate && new Date(rawExpiryDate) < new Date();

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
      className="group relative cursor-pointer overflow-hidden rounded-[22px] border border-surface-border/50 bg-surface shadow-sm transition-all duration-200 active:scale-[0.985] hover:border-ice/20 hover:shadow-lg"
    >
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: color }}
      />

      <div className="p-4 pl-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] transition-all duration-200"
            style={{
              background: `linear-gradient(135deg, ${color}26, ${color}0d)`,
            }}
          >
            <TypeIcon size={18} style={{ color }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* line-clamp-2 e break-words resolve o corte abrupto de letras no mobile */}
                <h3 className="line-clamp-2 break-words font-display text-[15px] font-semibold leading-tight text-ink-primary">
                  {document.title}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                  {personName ? (
                    <span>{personName}</span>
                  ) : (
                    <span className="capitalize">{document.type.replace('_', ' ')}</span>
                  )}

                  {category && (
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${color}14`,
                        borderColor: `${color}2c`,
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
                className={`shrink-0 rounded-full p-1.5 transition-all duration-150 active:scale-90 ${
                  document.is_favorite ? "bg-ice/12" : "hover:bg-surface-border/50"
                }`}
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
                        document.is_favorite ? "fill-ice text-ice" : "text-ink-muted/55"
                      }
                    />
                  </motion.div>
                </AnimatePresence>
              </button>
            </div>

            {firstMetadata && (
              <p className="mt-1.5 truncate text-sm font-medium text-ink-primary">
                {firstMetadata}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              {formattedIssue && (
                <div className="flex items-center gap-1 text-xs text-ink-muted">
                  <Calendar size={12} />
                  <span>
                    {document.type === "certidao_nascimento" ? "Nascimento:" : "Emissão:"} {formattedIssue}
                  </span>
                </div>
              )}

              {formattedExpiry && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium transition-colors duration-150 ${
                    isExpired
                      ? "text-coral"
                      : isExpiring
                      ? "text-coral/85"
                      : "text-ink-muted"
                  }`}
                >
                  <Calendar size={12} />
                  <span>
                    {isExpired ? "Vencido:" : isExpiring ? "Vence em:" : "Vence:"} {formattedExpiry}
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

        <div className="mt-3 flex items-center justify-between border-t border-surface-border/40 pt-3">
          <div className="flex items-center gap-2 text-xs text-ink-faint">
            {hasAttachments && (
              <span className="inline-flex items-center gap-1">
                {hasImageAttachment ? (
                  <ImageIcon size={13} />
                ) : (
                  <Paperclip size={13} />
                )}
                <span>
                  {document.attachments.length} anexo
                  {document.attachments.length !== 1 ? "s" : ""}
                </span>
              </span>
            )}
          </div>

          <div className="relative">
            <button
              onClick={handleSyncIconClick}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors duration-150 active:scale-95 ${
                document.synced
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "bg-coral/10 text-coral"
              }`}
              aria-label="Status de sincronização"
            >
              {document.synced ? (
                <CheckCircle2 size={11} />
              ) : (
                <Loader2 size={11} className="animate-spin" />
              )}
              {document.synced ? "Sincronizado" : "Pendente"}
            </button>

            {showSyncTooltip && (
              <span className="absolute right-0 top-[-1.9rem] whitespace-nowrap rounded-full border border-surface-border/50 bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted shadow-md">
                {document.synced ? "Sincronizado com a nuvem" : "Aguardando sincronização"}
              </span>
            )}
          </div>
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
