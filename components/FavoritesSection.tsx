"use client";

import { memo } from "react";
import { Document } from "@/lib/types";
import { DocumentCard } from "./DocumentCard";
import { ChevronRight, Star } from "lucide-react";
import { useRouter } from "next/navigation";

interface FavoritesSectionProps {
  favorites: Document[];
  onFavoriteToggle: (id: string) => void;
}

function FavoritesSectionComponent({
  favorites,
  onFavoriteToggle,
}: FavoritesSectionProps) {
  const router = useRouter();
  const preview = favorites.slice(0, 3);

  if (favorites.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ice/12">
              <Star size={14} className="fill-ice text-ice" />
            </div>
            <h2 className="font-display text-sm font-semibold text-ink-primary">
              Favoritos
            </h2>
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] text-ink-muted">
              {favorites.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Acesso rápido aos documentos mais importantes
          </p>
        </div>

        {favorites.length > 3 && (
          <button
            onClick={() => router.push("/favoritos")}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-ink-muted transition-colors hover:text-ink-primary"
          >
            Ver mais
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {preview.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onFavoriteToggle={onFavoriteToggle}
            compact
          />
        ))}
      </div>
    </section>
  );
}

export const FavoritesSection = memo(FavoritesSectionComponent);