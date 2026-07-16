"use client";

import { VaultDocument, AREAS, CATEGORY_META } from "@/lib/types";
import { useHapticFeedback } from "@/lib/haptics";
import { Star, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";

interface DocumentCardProps {
  document: VaultDocument;
  onFavoriteToggle?: (id: number) => void;
  compact?: boolean;
}

export function DocumentCard({ document, onFavoriteToggle, compact = false }: DocumentCardProps) {
  const { trigger } = useHapticFeedback();
  const router = useRouter();

  const area = AREAS.find(a => a.id === document.areaId);
  const category = CATEGORY_META[document.category];

  const handlePress = () => {
    trigger("vibrate");
    router.push(`/${document.id}`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger("vibrate");
    onFavoriteToggle?.(document.id!);
  };

  const formatDate = (date?: string) => {
    if (!date) return null;
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return null;
    }
  };

  const isExpiring = document.expiryDate && new Date(document.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isExpired = document.expiryDate && new Date(document.expiryDate) < new Date();

  return (
    <div
      onClick={handlePress}
      className="relative overflow-hidden rounded-card border border-surface-border bg-surface p-4 shadow-vault active:scale-[0.98] transition-all duration-150 cursor-pointer"
    >
      <span className="rivet rivet-tl" />
      <span className="rivet rivet-br" />

      <div className="flex items-start gap-3">
        {/* Ícone da área */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-steel-dark/40">
          <FileText size={18} className="text-steel-light" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-[15px] font-medium text-ink-primary truncate">
                {document.title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-ink-muted">{area?.name}</span>
                <span className="w-1 h-1 rounded-full bg-ink-faint" />
                <span className="text-xs text-ink-muted">{category?.label}</span>
              </div>
            </div>

            {/* Favorito */}
            <button
              onClick={handleFavorite}
              className="flex-shrink-0 p-1 rounded-full hover:bg-surface-border transition-colors"
            >
              <Star
                size={18}
                className={document.isFavorite ? "fill-ice text-ice" : "text-ink-muted"}
              />
            </button>
          </div>

          {/* Datas */}
          <div className="flex items-center gap-3 mt-2">
            {document.documentDate && (
              <div className="flex items-center gap-1 text-xs text-ink-muted">
                <Calendar size={12} />
                <span>{formatDate(document.documentDate)}</span>
              </div>
            )}

            {document.expiryDate && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  isExpired
                    ? "text-coral"
                    : isExpiring
                    ? "text-ice"
                    : "text-ink-muted"
                }`}
              >
                <Calendar size={12} />
                <span>Vence: {formatDate(document.expiryDate)}</span>
              </div>
            )}
          </div>

          {/* Notas (se houver) */}
          {document.notes && !compact && (
            <p className="mt-2 text-sm text-ink-muted line-clamp-2">{document.notes}</p>
          )}
        </div>
      </div>

      {/* Badge de sincronização */}
      {!document.synced && (
        <div className="absolute top-3 right-12">
          <div className="w-2 h-2 rounded-full bg-coral animate-pulse" />
        </div>
      )}
    </div>
  );
}