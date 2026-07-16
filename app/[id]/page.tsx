"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Trash2, Edit, Calendar, FileText, Share2 } from "lucide-react";
import { useDocument } from "@/hooks/useLocalData";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { AREAS, CATEGORY_META } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DocumentDetailPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const document = useDocument(id);
  const { remove, favorite } = useSafeDb();

  if (!document) {
    return (
      <main className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-muted">Documento não encontrado</p>
          <Button
            variant="primary"
            onClick={() => router.push("/")}
            className="mt-4"
          >
            Voltar
          </Button>
        </div>
      </main>
    );
  }

  const area = AREAS.find(a => a.id === document.areaId);
  const category = CATEGORY_META[document.category];

  const formatDate = (date?: string) => {
    if (!date) return null;
    try {
      return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return null;
    }
  };

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      await remove(document.id!);
      trigger("success");
      router.push("/");
    }
  };

  const handleFavoriteToggle = async () => {
    await favorite(document.id!);
    trigger("vibrate");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        text: document.notes || "",
      }).catch(() => {});
    }
  };

  return (
    <main className="min-h-screen bg-void pb-28">
      {/* Header */}
      <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98] transition-all"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate max-w-[200px]">
                {document.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFavoriteToggle}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98] transition-all"
            >
              <Star
                size={18}
                className={document.isFavorite ? "fill-ice text-ice" : "text-ink-muted"}
              />
            </button>
            <button
              onClick={handleShare}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98] transition-all"
            >
              <Share2 size={18} className="text-ink-muted" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <section className="px-5 pt-6 space-y-6">
        {/* Info Card */}
        <div className="rounded-card border border-surface-border bg-surface p-6 shadow-vault">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-steel-dark/40">
              <FileText size={22} className="text-steel-light" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink-primary">
                {document.title}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-ink-muted">{area?.name}</span>
                <span className="w-1 h-1 rounded-full bg-ink-faint" />
                <span className="text-xs text-ink-muted">{category?.label}</span>
              </div>
            </div>
          </div>

          {/* Datas */}
          <div className="space-y-2 border-t border-surface-border pt-4">
            {document.documentDate && (
              <div className="flex items-center gap-2 text-sm text-ink-muted">
                <Calendar size={14} className="text-steel-light" />
                <span>Data do documento: {formatDate(document.documentDate)}</span>
              </div>
            )}
            {document.expiryDate && (
              <div className="flex items-center gap-2 text-sm text-ink-muted">
                <Calendar size={14} className="text-steel-light" />
                <span>Validade: {formatDate(document.expiryDate)}</span>
              </div>
            )}
          </div>

          {/* Notas */}
          {document.notes && (
            <div className="mt-4 border-t border-surface-border pt-4">
              <p className="text-sm font-medium text-ink-muted mb-1">Notas</p>
              <p className="text-sm text-ink-primary">{document.notes}</p>
            </div>
          )}

          {/* Status de sincronização */}
          <div className="mt-4 border-t border-surface-border pt-4">
            <p className="text-xs text-ink-muted">
              {document.synced ? (
                <span className="text-green-400">✓ Sincronizado</span>
              ) : (
                <span className="text-coral animate-pulse">↻ Pendente de sincronização</span>
              )}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            className="flex items-center justify-center gap-2"
            onClick={() => {
              trigger("vibrate");
              router.push(`/${document.id}/editar`);
            }}
          >
            <Edit size={16} />
            Editar documento
          </Button>


          <Button
            variant="danger"
            className="flex items-center justify-center gap-2"
            onClick={handleDelete}
          >
            <Trash2 size={16} />
            Excluir documento
          </Button>
        </div>
      </section>
    </main>
  );
}