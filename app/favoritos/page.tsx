"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, User, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFavorites } from "@/hooks/useDocuments";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { DocumentCard } from "@/components/DocumentCard";
import { PersonCard } from "@/components/PersonCard";
import { AreaTabs } from "@/components/AreaTabs";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { EmptyState } from "@/components/EmptyState";

export default function FavoritesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { favorite } = useSafeDb();
  const persons = usePersons();

  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (persons.length > 0 && selectedPersonId === null) {
      setSelectedPersonId(persons[0]?.id || null);
    }
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [persons]);

  const favorites = useFavorites(selectedPersonId || undefined);

  const filtered = favorites.filter(doc => {
    const matchCategory = selectedCategory === "todos" || doc.category_id === selectedCategory;
    return matchCategory;
  });

  const handleFavoriteToggle = useCallback(async (id: number) => {
    await favorite(id);
    trigger("vibrate");
  }, [favorite, trigger]);

  const hasFavorites = filtered && filtered.length > 0;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        {/* HEADER */}
        <header className="sticky top-0 z-10 bg-void/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="flex items-center gap-2">
              <Star size={22} className="fill-ice text-ice" />
              <div>
                <h1 className="font-display text-xl font-semibold text-ink-primary">
                  Favoritos
                </h1>
                <p className="text-sm text-ink-muted">
                  {hasFavorites ? `${filtered.length} documento${filtered.length !== 1 ? "s" : ""}` : "Nenhum favorito"}
                </p>
              </div>
            </div>
          </div>

          {/* Filtro por pessoa */}
          <div className="mt-4">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => {
                  trigger("vibrate");
                  setSelectedPersonId(null);
                }}
                className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 whitespace-nowrap ${
                  selectedPersonId === null
                    ? "border-ice bg-ice/10 text-ice"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                }`}
              >
                Todas pessoas
              </button>
              {persons.map((person) => (
                <button
                  key={person.id}
                  onClick={() => {
                    trigger("vibrate");
                    setSelectedPersonId(person.id!);
                  }}
                  className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 whitespace-nowrap flex items-center gap-1 ${
                    selectedPersonId === person.id
                      ? "border-ice bg-ice/10 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  {person.avatar_url ? (
                    <img
                      src={person.avatar_url}
                      alt={person.name}
                      className="w-4 h-4 rounded-full"
                    />
                  ) : (
                    <User size={12} />
                  )}
                  {person.name}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro por categoria */}
          <div className="mt-3">
            <AreaTabs selected={selectedCategory} onChange={setSelectedCategory} />
          </div>
        </header>

        {/* CONTEÚDO */}
        <section className="px-5 pt-5 space-y-3">
          <AnimatePresence mode="wait">
            {!hasFavorites ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-24 h-24 rounded-full bg-surface-raised flex items-center justify-center mb-6 border border-surface-border/50">
                  <Heart size={36} className="text-ink-muted/30" />
                </div>
                <h3 className="font-display text-xl text-ink-primary">Nenhum favorito</h3>
                <p className="text-sm text-ink-muted mt-2 max-w-xs">
                  Marque documentos como favoritos para acessá-los rapidamente.
                  <br />
                  Basta clicar na estrela ⭐ em qualquer documento.
                </p>
                <button
                  onClick={() => {
                    trigger("vibrate");
                    router.push("/");
                  }}
                  className="mt-6 flex items-center gap-2 rounded-full bg-ice px-6 py-3 text-void font-medium text-sm active:scale-95 transition-all"
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
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                {filtered.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <DocumentCard
                      document={doc}
                      onFavoriteToggle={handleFavoriteToggle}
                      personName={persons.find(p => p.id === doc.person_id)?.name}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ScrollToTop */}
        <ScrollToTop threshold={400} />
      </main>
    </PageTransition>
  );
}