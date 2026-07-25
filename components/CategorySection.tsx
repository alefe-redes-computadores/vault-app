"use client";

import { memo } from "react";
import { CATEGORIES, type CategoryId, type Document } from "@/lib/types";
import { DocumentCard } from "./DocumentCard";
import { CollapsibleCard } from "./CollapsibleCard";
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

  const header = (
    <div>
      <div className="flex items-center gap-2">
        <div
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: category.color }}
        />
        <h2 className="truncate font-display text-sm font-semibold text-ink-primary">
          {category.name}
        </h2>
        <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-[11px] text-ink-muted">
          {total}
        </span>

        {hasMore && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSeeAll();
            }}
            className="ml-auto flex shrink-0 items-center gap-1 text-xs font-medium text-ink-muted transition-colors hover:text-ink-primary"
          >
            Ver mais
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      <p className="mt-1 text-xs text-ink-muted">
        Documentos recentes desta categoria
      </p>
    </div>
  );

  return (
    <section>
      <CollapsibleCard storageKey={`categoria-${categoryId}`} header={header}>
        <div className="space-y-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onFavoriteToggle={onFavoriteToggle}
            />
          ))}
        </div>
      </CollapsibleCard>
    </section>
  );
}

export const CategorySection = memo(CategorySectionComponent);
