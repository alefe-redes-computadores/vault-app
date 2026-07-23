"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User, FolderOpen, Sparkles } from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useDocuments } from "@/hooks/useDocuments";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, type CategoryId } from "@/lib/types";
import { DocumentCard } from "@/components/DocumentCard";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function CategoryPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("nome") as CategoryId;
  const [isLoading, setIsLoading] = useState(true);

  const persons = usePersons();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  useEffect(() => {
    if (persons.length > 0 && selectedPersonId === null) {
      setSelectedPersonId(persons[0]?.id || null);
    }
  }, [persons, selectedPersonId]);

  const allDocs = useDocuments(selectedPersonId || undefined);

  const documents = useMemo(
    () => allDocs.filter((doc: any) => doc.category_id === categoryId),
    [allDocs, categoryId]
  );

  const { favorite } = useSafeDb();
  const category = CATEGORIES[categoryId];

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 420);
    return () => clearTimeout(timer);
  }, []);

  const handleFavoriteToggle = useCallback(
    async (id: string) => {
      await favorite(id);
      trigger("vibrate");
    },
    [favorite, trigger]
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

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
  const hasDocs = totalDocs > 0;

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
                  className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                    selectedPersonId === null
                      ? "border-ice bg-ice/12 text-ice shadow-[0_0_0_1px_rgba(125,211,252,0.08)]"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  Todos
                </button>

                {persons.map((person: any) => (
                  <button
                    key={person.id}
                    onClick={() => {
                      trigger("vibrate");
                      setSelectedPersonId(person.id!);
                    }}
                    className={`flex whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                      selectedPersonId === person.id
                        ? "border-ice bg-ice/12 text-ice shadow-[0_0_0_1px_rgba(125,211,252,0.08)]"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    <span className="flex items-center gap-2">
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
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="px-5 pt-5">
          {!hasDocs ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center rounded-[30px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div
                className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border"
                style={{
                  backgroundColor: `${category.color}14`,
                  borderColor: `${category.color}28`,
                }}
              >
                <FolderOpen size={34} style={{ color: category.color }} />
              </div>

              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-surface-border/40 bg-surface-raised px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-ink-muted">
                <Sparkles size={12} />
                Organize melhor
              </div>

              <h3 className="font-display text-xl font-semibold text-ink-primary">
                Nenhum documento em {category.name}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Comece adicionando documentos nesta categoria para deixar tudo centralizado e fácil de encontrar.
              </p>

              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/novo");
                }}
                className="mt-6 rounded-full bg-ice px-6 py-3 text-sm font-medium text-void transition-all active:scale-95"
              >
                Adicionar documento
              </button>
            </motion.div>
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {documents.map((doc: any) => (
                <motion.div key={doc.id} variants={itemVariants}>
                  <DocumentCard
                    document={doc}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}