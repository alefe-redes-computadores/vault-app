// app/vaults/detalhes/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Users, Edit, Trash2, Lock, Home, Heart, Briefcase, BookOpen,
  Plane, Car, PawPrint, LucideIcon, Shield, FileText, ChevronRight,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useVaults } from "@/hooks/useVaults";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  heart: Heart,
  briefcase: Briefcase,
  "book-open": BookOpen,
  plane: Plane,
  car: Car,
  "paw-print": PawPrint,
  users: Users,
};

function VaultDetailContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { user } = useAuth();
  const { deleteVault } = useVaults();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const vault = useLiveQuery(() => db.vaults.get(id), [id], null);
  const members = useLiveQuery(() => db.vaultMembers.where("vault_id").equals(id).toArray(), [id], []);
  const documents = useLiveQuery(() => db.documents.where("vault_id").equals(id).toArray(), [id], []);

  if (vault === undefined) {
    return <DetailSkeleton />;
  }

  if (!vault) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
              <Lock size={24} className="text-ink-muted" />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink-primary">Cofre não encontrado</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">Este cofre pode ter sido removido ou não está mais disponível.</p>
            <Button variant="primary" onClick={() => router.push("/vaults")} className="mt-6">Voltar para cofres</Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  const isOwner = vault.user_id === user?.id;
  const Icon = ICON_MAP[vault.icon] || Home;
  const vaultColor = vault.color || "#7DD3FC";

  const handleDelete = async () => {
    if (!vault.id) return;
    trigger("vibrate");
    setIsDeleting(true);
    try {
      await deleteVault(vault.id);
      trigger("success");
      showToast("Cofre excluído", "success");
      router.replace("/vaults");
    } catch (error) {
      trigger("error");
      showToast("Erro ao excluir cofre", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} aria-label="Voltar" className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
              <h1 className="mt-1 max-w-[220px] truncate font-display text-xl font-semibold text-ink-primary">{vault.name}</h1>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px]" style={{ backgroundColor: `${vaultColor}22` }}>
                <Icon size={28} style={{ color: vaultColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-display text-lg font-semibold text-ink-primary">{vault.name}</h2>
                  {isOwner && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ice/10 px-2.5 py-1 text-[11px] font-semibold text-ice">
                      <Shield size={11} />
                      Proprietário
                    </span>
                  )}
                </div>
                {vault.description && <p className="mt-2 text-sm leading-6 text-ink-muted">{vault.description}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1 text-xs text-ink-muted">
                    {members?.length || 0} membro{(members?.length || 0) !== 1 ? "s" : ""}
                  </span>
                  <span className="rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1 text-xs text-ink-muted">
                    {documents?.length || 0} documento{(documents?.length || 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-surface-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => { trigger("vibrate"); router.push(`/vaults/membros?cofre_id=${vault.id}`); }}
                >
                  <Users size={14} />
                  Gerenciar membros
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => { trigger("vibrate"); showToast("Edição de cofre em breve", "info"); }}
                  disabled={!isOwner}
                >
                  <Edit size={14} />
                  Editar
                </Button>
                {isOwner && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
                  >
                    <Trash2 size={14} />
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-ink-primary">Documentos neste cofre</h3>
              <span className="text-xs text-ink-muted">{documents?.length || 0} item{(documents?.length || 0) !== 1 ? "s" : ""}</span>
            </div>
            {documents && documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => { trigger("vibrate"); router.push(`/detalhes?id=${doc.id}`); }}
                    className="flex w-full items-center justify-between rounded-[22px] border border-surface-border/50 bg-surface px-4 py-3 text-left transition-all duration-200 active:scale-[0.99] hover:bg-surface-raised"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted">
                        <Lock size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-primary">{doc.title}</p>
                        <p className="mt-0.5 text-xs text-ink-muted capitalize">{doc.type}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-ink-faint" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface px-5 py-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-ink-muted">
                  <FileText size={20} />
                </div>
                <p className="text-sm font-medium text-ink-primary">Nenhum documento compartilhado</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">Quando documentos forem vinculados a este cofre, eles aparecerão aqui.</p>
              </div>
            )}
          </div>
        </section>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir cofre"
          message="Tem certeza que deseja excluir este cofre? Os documentos não serão apagados, apenas desvinculados."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={isDeleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function VaultDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <VaultDetailContent />
    </Suspense>
  );
}