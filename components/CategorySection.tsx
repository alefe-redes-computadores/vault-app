"use client";

import { memo } from "react";
import { CATEGORIES, type CategoryId, type Document } from "@/lib/types";
import { DocumentCard } from "./DocumentCard";
import { ChevronRight } from "lucide-react";

interface CategorySectionProps {
  categoryId: CategoryId;
  documents: Document[];
  total: number;
  hasMore: boolean;
  onFavoriteToggle: (id: string) => void;
  onSeeAll: () => void;
}

function CategorySectionComponent({
  categoryId,
  documents,
  total,
  hasMore,
  onFavoriteToggle,
  onSeeAll,
}: CategorySectionProps) {
  const category = CATEGORIES[categoryId];

  if (documents.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <h2 className="font-display text-sm font-semibold text-ink-primary">
              {category.name}
            </h2>
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] text-ink-muted">
              {total}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Documentos recentes desta categoria
          </p>
        </div>

        {hasMore && (
          <button
            onClick={onSeeAll}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-ink-muted transition-colors hover:text-ink-primary"
          >
            Ver mais
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onFavoriteToggle={onFavoriteToggle}
          />
        ))}
      </div>
    </section>
  );
}

export const CategorySection = memo(CategorySectionComponent);