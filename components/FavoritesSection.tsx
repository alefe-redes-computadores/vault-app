"use client";

import { Document } from "@/lib/types";
import { DocumentCard } from "./DocumentCard";
import { ChevronRight, Star } from "lucide-react";
import { useRouter } from "next/navigation";

interface FavoritesSectionProps {
  favorites: Document[];
  onFavoriteToggle: (id: string) => void; // ← string
}

export function FavoritesSection({ favorites, onFavoriteToggle }: FavoritesSectionProps) {
  const router = useRouter();
  const preview = favorites.slice(0, 3);

  if (favorites.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-yellow-400 fill-yellow-400" />
          <h2 className="font-display text-sm font-medium text-ink-primary">Favoritos</h2>
          <span className="text-xs text-ink-muted">({favorites.length})</span>
        </div>
        {favorites.length > 3 && (
          <button
            onClick={() => router.push("/favoritos")}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors"
          >
            Ver mais
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {preview.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onFavoriteToggle={onFavoriteToggle}
            compact
          />
        ))}
      </div>
    </div>
  );
}