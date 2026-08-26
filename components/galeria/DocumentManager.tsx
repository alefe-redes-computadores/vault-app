// components/galeria/DocumentManager.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";
import type { Document } from "@/lib/types";
import { useHapticFeedback } from "@/lib/haptics";
import { FileText, Trash2, ExternalLink } from "lucide-react";

interface DocumentManagerProps {
  entidadeTipo: string;
  entidadeId: string;
  tituloSecao?: string;
}

export function DocumentManager({ entidadeTipo, entidadeId, tituloSecao }: DocumentManagerProps) {
  const { trigger } = useHapticFeedback();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const docs = await db.documents
        .where("[entidade_tipo+entidade_id]")
        .equals([entidadeTipo, entidadeId])
        .toArray();

      const sorted = docs.sort((a: Document, b: Document) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeB - timeA;
      });

      setDocuments(sorted);
    } catch (error) {
      console.error("Erro ao carregar documentos da entidade:", error);
    } finally {
      setIsLoading(false);
    }
  }, [entidadeTipo, entidadeId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleDelete = async (id?: string) => {
    if (!id) return;
    trigger("vibrate");
    try {
      await db.documents.delete(id);
      await loadDocuments();
    } catch (error) {
      console.error("Erro ao deletar documento:", error);
    }
  };

  if (isLoading) {
    return <div className="py-4 text-center text-xs text-ink-muted">Carregando anexos...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          {tituloSecao || "Anexos e Documentos Vinculados"}
        </h3>
      </div>

      {documents.length === 0 ? (
        <p className="text-xs text-ink-faint">Nenhum documento anexado a este item.</p>
      ) : (
        documents.map((doc: Document) => (
          <div key={doc.id} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink-primary">{doc.title}</p>
                <p className="text-[10px] uppercase text-ink-muted">{doc.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {doc.attachments?.[0]?.url && (
                <a
                  href={doc.attachments[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-ink-muted hover:text-ink-primary transition-colors"
                >
                  <ExternalLink size={16} />
                </a>
              )}
              <button
                onClick={() => handleDelete(doc.id)}
                className="p-2 text-coral/70 hover:text-coral transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
