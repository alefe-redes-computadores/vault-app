"use client";

import { VaultDocument } from "@/lib/types";
import { DocumentCard } from "./DocumentCard";
import { Plus, FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";

interface DocumentListProps {
  documents: VaultDocument[];
  onFavoriteToggle: (id: number) => void;
  profileId: number;
  areaId?: string | null;
}

export function DocumentList({ documents, onFavoriteToggle, profileId, areaId }: DocumentListProps) {
  const router = useRouter();

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center mb-4">
          <FolderOpen size={32} className="text-ink-muted" />
        </div>
        <h3 className="font-display text-lg text-ink-primary">Nenhum documento aqui</h3>
        <p className="text-sm text-ink-muted mt-1 max-w-xs">
          Comece guardando seu primeiro documento no Vault
        </p>
        <button
          onClick={() => router.push("/novo")}
          className="mt-6 flex items-center gap-2 rounded-full bg-ice px-6 py-3 text-void font-medium active:scale-[0.98] transition-all"
        >
          <Plus size={18} />
          Adicionar documento
        </button>
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
        />
      ))}
    </div>
  );
}