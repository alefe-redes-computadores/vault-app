"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, User, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePaginatedFavorites } from "@/hooks/usePaginatedFavorites";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { DocumentCard } from "@/components/DocumentCard";
import { AreaTabs } from "@/components/AreaTabs";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import type { CategoryId } from "@/lib/types";

export default function FavoritesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { favorite } = useSafeDb();
  const persons = usePersons();

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (persons.length > 0 && selectedPersonId === null) {
      setSelectedPersonId(persons[0]?.id || null);
    }

    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [persons, selectedPersonId]);

  const { favorites, hasMore, isLoadingMore, loadMore } = usePaginatedFavorites({
    personId: selectedPersonId || undefined,
    categoryId: selectedCategory || undefined,
  });

  const handleFavoriteToggle = useCallback(
    async (id: string) => {
      await favorite(id);
      trigger("vibrate");
    },
    [favorite, trigger]
  );

  const hasFavorites = favorites && favorites.length > 0;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Star size={18} className="fill-ice text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
              </div>

              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Favoritos
              </h1>

              <p className="mt-1 text-sm text-ink-muted">
                {hasFavorites
                  ? `${favorites.length} documento${favorites.length !== 1 ? "s" : ""}`
                  : "Nenhum favorito"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-surface-border/40 bg-surface/70 px-4 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
                Pessoa
              </p>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => {
                    trigger("vibrate");
                    setSelectedPersonId(null);
                  }}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-all active:scale-95 ${
                    selectedPersonId === null
                      ? "border-ice bg-ice/10 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  Todas pessoas
                </button>

                {persons.map((person: any) => (
                  <button
                    key={person.id}
                    onClick={() => {
                      trigger("vibrate");
                      setSelectedPersonId(person.id!);
                    }}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-all active:scale-95 ${
                      selectedPersonId === person.id
                        ? "border-ice bg-ice/10 text-ice"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {person.avatar_url ? (
                      <img
                        src={person.avatar_url}
                        alt={person.name}
                        className="h-4 w-4 rounded-full"
                      />
                    ) : (
                      <User size={12} />
                    )}
                    {person.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
                Categoria
              </p>

              <AreaTabs
                activeArea={selectedCategory}
                onAreaChange={setSelectedCategory}
              />
            </div>
          </div>
        </header>

        <section className="px-5 pt-5">
          <AnimatePresence mode="wait">
            {!hasFavorites ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.28 }}
                className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-16 text-center shadow-sm"
              >
                <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                  <Heart size={36} className="text-ink-muted/40" />
                </div>

                <h3 className="font-display text-xl font-semibold text-ink-primary">
                  Nenhum favorito
                </h3>

                <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                  Marque documentos como favoritos para acessá-los rapidamente.
                  Basta tocar na estrela em qualquer documento.
                </p>

                <button
                  onClick={() => {
                    trigger("vibrate");
                    router.push("/");
                  }}
                  className="mt-6 flex items-center gap-2 rounded-full bg-ice px-6 py-3 text-sm font-medium text-void transition-all active:scale-95"
                >
                  <ArrowLeft size={16} />
                  Voltar para a Home
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <InfiniteScrollTrigger
                  onLoadMore={loadMore}
                  hasMore={hasMore}
                  isLoading={isLoadingMore}
                >
                  <div className="space-y-4">
                    {favorites.map((doc: any, index: number) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.22,
                          delay: Math.min(index * 0.04, 0.4),
                        }}
                      >
                        <DocumentCard
                          document={doc}
                          onFavoriteToggle={handleFavoriteToggle}
                          personName={persons.find((p: any) => p.id === doc.person_id)?.name}
                        />
                      </motion.div>
                    ))}
                  </div>
                </InfiniteScrollTrigger>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <ScrollToTop threshold={400} />
      </main>
    </PageTransition>
  );
}