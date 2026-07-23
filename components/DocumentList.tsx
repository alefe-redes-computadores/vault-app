"use client";

import { Document } from "@/lib/types";
import { DocumentCard } from "./DocumentCard";
import { FileText } from "lucide-react";

interface DocumentListProps {
  documents: Document[];
  onFavoriteToggle: (id: string) => void;
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
      <div className="rounded-[24px] border border-surface-border/50 bg-surface px-5 py-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
          <FileText size={26} className="text-ink-muted/45" />
        </div>
        <p className="font-display text-base font-semibold text-ink-primary">
          Nenhum documento encontrado
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Ajuste os filtros ou adicione novos documentos para continuar.
        </p>
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