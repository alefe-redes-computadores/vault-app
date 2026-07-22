"use client";

import { Document } from "@/lib/types";
import { DocumentCard } from "./DocumentCard";

interface DocumentListProps {
  documents: Document[];
  onFavoriteToggle: (id: string) => void; // ← string
  compact?: boolean;
  personName?: (doc: Document) => string;
}

export function DocumentList({
  documents,
  onFavoriteToggle,
  compact = false,
  personName,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-ink-muted text-sm">
        Nenhum documento encontrado
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onFavoriteToggle={onFavoriteToggle}
          compact={compact}
          personName={personName ? personName(doc) : undefined}
        />
      ))}
    </div>
  );
}