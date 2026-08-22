// app/categorias/page.tsx
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User, FolderOpen } from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useDocuments } from "@/hooks/useDocuments";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, type CategoryId, type Document, type Person } from "@/lib/types";
import { DocumentCard } from "@/components/DocumentCard";
import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";

export default function CategoryPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("nome") as CategoryId | null;
  const { activePersonId } = useActivePersonId();

  const persons = usePersons() as Person[];
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  useEffect(() => {
    if (activePersonId && selectedPersonId === null) {
      setSelectedPersonId(activePersonId);
    } else if (persons.length > 0 && selectedPersonId === null) {
      setSelectedPersonId(persons[0]?.id || null);
    }
  }, [persons, selectedPersonId, activePersonId]);

  const allDocsRaw = useDocuments();

  const documents = useMemo(() => {
    const docs = allDocsRaw || [];
    const catDocs = docs.filter((doc: Document) => doc.category_id === categoryId);
    if (!selectedPersonId) return catDocs;
    return catDocs.filter((doc: Document) => doc.person_id === selectedPersonId);
  }, [allDocsRaw, categoryId, selectedPersonId]);

  const { favorite } = useSafeDb();
  const category = categoryId ? CATEGORIES[categoryId] : undefined;

  const handleFavoriteToggle = useCallback(
    async (id: string) => {
      await favorite(id);
      trigger("vibrate");
    },
    [favorite, trigger]
  );

  if (!category) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-6 py-8 text-center shadow-sm">
            <p className="text-sm text-ink-muted">Categoria não encontrada</p>
          </div>
        </main>
      </PageTransition>
    );
  }

  const totalDocs = documents?.length || 0;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/5"
                  style={{ backgroundColor: `${category.color}18` }}
                >
                  <FolderOpen size={18} style={{ color: category.color }} />
                </div>

                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                    Vault
                  </p>
                  <h1 className="truncate font-display text-xl font-semibold text-ink-primary">
                    {category.name}
                  </h1>
                  <p className="text-sm text-ink-muted">
                    {totalDocs} documento{totalDocs !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
                <button
                  onClick={() => {
                    trigger("vibrate");
                    setSelectedPersonId(null);
                  }}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                    selectedPersonId === null
                      ? "border-ice bg-ice/12 text-ice shadow-[0_0_0_1px_rgba(125,211,252,0.08)]"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  Todos
                </button>

                {persons.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => {
                      trigger("vibrate");
                      setSelectedPersonId(person.id!);
                    }}
                    className={`shrink-0 flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                      selectedPersonId === person.id
                        ? "border-ice bg-ice/12 text-ice shadow-[0_0_0_1px_rgba(125,211,252,0.08)]"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {person.avatar_url ? (
                      <img
                        src={person.avatar_url}
                        alt={person.name}
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : (
                      <User size={12} />
                    )}
                    <span>{person.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="px-5 pt-5">
          {!documents?.length ? (
            <EmptyState
              icon={FolderOpen}
              title={`Nenhum documento em ${category.name}`}
              description="Comece adicionando documentos nesta categoria para deixar tudo centralizado e fácil de encontrar."
              actionLabel="Adicionar documento"
              onAction={() => router.push("/documentos/novo")}
            />
          ) : (
            <div className="space-y-4">
              {documents.map((doc, index) => (
                <motion.div 
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: index * 0.03 }}
                >
                  <DocumentCard
                    document={doc}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
