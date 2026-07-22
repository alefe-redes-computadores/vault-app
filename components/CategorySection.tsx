"use client";

import { CATEGORIES, type CategoryId, type Document } from "@/lib/types";
import { DocumentCard } from "./DocumentCard";
import { ChevronRight } from "lucide-react";

interface CategorySectionProps {
  categoryId: CategoryId;
  documents: Document[];
  total: number;
  hasMore: boolean;
  onFavoriteToggle: (id: string) => void; // ← string
  onSeeAll: () => void;
}

export function CategorySection({
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <h2 className="font-display text-sm font-medium text-ink-primary">
            {category.name}
          </h2>
          <span className="text-xs text-ink-muted">({total})</span>
        </div>
        {hasMore && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors"
          >
            Ver mais
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onFavoriteToggle={onFavoriteToggle}
          />
        ))}
      </div>
    </div>
  );
}