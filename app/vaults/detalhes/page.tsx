"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, Plus, Edit, Trash2, Lock, Home, Heart, Briefcase, BookOpen, Plane, Car, PawPrint, LucideIcon } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useEffect, useState } from "react";

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

export default function VaultDetailPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || ""; // ← string
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const vault = useLiveQuery(
    () => db.vaults.get(id),
    [id],
    null
  );

  const members = useLiveQuery(
    () => db.vaultMembers.where('vault_id').equals(id).toArray(),
    [id],
    []
  );

  const documents = useLiveQuery(
    () => db.documents.where('vault_id').equals(id).toArray(),
    [id],
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!vault) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void flex items-center justify-center">
          <div className="text-center">
            <p className="text-ink-muted">Cofre não encontrado</p>
            <Button variant="primary" onClick={() => router.push("/vaults")} className="mt-4">
              Voltar
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  const isOwner = vault.user_id === user?.id;
  const Icon = ICON_MAP[vault.icon] || Home;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-[0.98]"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate max-w-[200px]">
                {vault.name}
              </h1>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          <div className="rounded-card border border-surface-border/50 bg-surface p-6 shadow-vault">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${vault.color || '#7DD3FC'}22` }}
              >
                <Icon size={28} style={{ color: vault.color || '#7DD3FC' }} />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink-primary">
                  {vault.name}
                </h2>
                {vault.description && (
                  <p className="text-sm text-ink-muted">{vault.description}</p>
                )}
                <p className="text-xs text-ink-muted mt-1">
                  {members?.length || 0} membros · {documents?.length || 0} documentos
                </p>
              </div>
            </div>

            <div className="border-t border-surface-border/50 pt-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`/vaults/membros?cofre_id=${vault.id}`);
                  }}
                >
                  <Users size={14} />
                  Gerenciar membros
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    trigger("vibrate");
                  }}
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
                    onClick={() => {
                      if (confirm("Tem certeza que deseja excluir este cofre?")) {
                        trigger("vibrate");
                      }
                    }}
                  >
                    <Trash2 size={14} />
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-medium text-ink-primary mb-3">
              Documentos neste cofre
            </h3>
            {documents && documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/detalhes?id=${doc.id}`);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-raised border border-surface-border/50 cursor-pointer hover:border-surface-border transition-colors active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <Lock size={14} className="text-ink-muted" />
                      <span className="text-sm text-ink-primary">{doc.title}</span>
                    </div>
                    <span className="text-xs text-ink-muted capitalize">{doc.type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted text-center py-4">
                Nenhum documento compartilhado neste cofre
              </p>
            )}
          </div>
        </section>
      </main>
    </PageTransition>
  );
}