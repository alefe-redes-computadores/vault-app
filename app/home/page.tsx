"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, User, ChevronRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { usePersons } from "@/hooks/usePersons";
import { useDocuments, useFavorites } from "@/hooks/useDocuments";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, type CategoryId, type Document } from "@/lib/types";
import { PersonCard } from "@/components/PersonCard";
import { CategorySection } from "@/components/CategorySection";
import { FavoritesSection } from "@/components/FavoritesSection";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useToast } from "@/components/ToastProvider";

function useDebounce(value: string, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function HomePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { favorite } = useSafeDb();
  const { showToast } = useToast();

  const persons = usePersons();
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!loading && user) {
      const hasSeenWelcome = sessionStorage.getItem('vault_welcome_shown');
      if (!hasSeenWelcome) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Usuário";
        showToast(`👋 Bem-vindo de volta, ${name}!`, "info");
        sessionStorage.setItem('vault_welcome_shown', 'true');
      }
    }
  }, [loading, user, showToast]);

  useEffect(() => {
    if (persons.length > 0 && selectedPersonId === null) {
      setSelectedPersonId(persons[0].id!);
    }
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [persons, selectedPersonId]);

  const allDocs = useDocuments(selectedPersonId || undefined) || [];
  const favorites = useFavorites(selectedPersonId || undefined) || [];

  const filteredDocs = useMemo(() => {
    if (!debouncedSearch.trim()) return allDocs;
    const query = debouncedSearch.toLowerCase();
    return allDocs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
    );
  }, [allDocs, debouncedSearch]);

  const handleFavoriteToggle = useCallback(async (id: number) => {
    await favorite(id);
  }, [favorite]);

  const docsByCategory = useMemo(() => {
    return allDocs.reduce<Record<CategoryId, Document[]>>(
      (acc, doc) => {
        if (!acc[doc.category_id]) acc[doc.category_id] = [];
        acc[doc.category_id].push(doc);
        return acc;
      },
      {} as Record<CategoryId, Document[]>
    );
  }, [allDocs]);

  const getCategoryPreview = useCallback((categoryId: CategoryId) => {
    const docs = docsByCategory[categoryId] || [];
    return docs.slice(0, 3);
  }, [docsByCategory]);

  const hasMore = useCallback((categoryId: CategoryId) => {
    return (docsByCategory[categoryId] || []).length > 3;
  }, [docsByCategory]);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const selectedPerson = persons.find(p => p.id === selectedPersonId);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-10 bg-void/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/mais");
                }}
                className="flex items-center gap-2"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-8 h-8 rounded-full border border-ice/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-ink-muted text-xs font-medium">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <h1 className="font-display text-base font-semibold text-ink-primary">
                    Olá, {displayName.split(" ")[0]}
                  </h1>
                  <p className="text-xs text-ink-muted">
                    {allDocs.length} documento{allDocs.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            </div>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsSearchOpen(true);
              }}
              className="p-2 rounded-full bg-surface-raised border border-surface-border/50 hover:bg-surface-border transition-colors"
            >
              <Search size={16} className="text-ink-muted" />
            </button>
          </div>

          {/* Seletor de pessoa - agora um botão que abre BottomSheet */}
          <div className="mt-3">
            <button
              onClick={() => {
                trigger("vibrate");
                setIsPersonModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-raised border border-surface-border/50 text-ink-primary text-sm active:scale-95 transition-all"
            >
              <User size={16} />
              {selectedPerson?.name || "Selecionar pessoa"}
              <ChevronDown size={14} className="text-ink-muted" />
            </button>
          </div>
        </header>

        <section className="px-5 pt-5 space-y-6">
          <AnimatePresence mode="wait">
            {favorites.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <FavoritesSection favorites={favorites} onFavoriteToggle={handleFavoriteToggle} />
              </motion.div>
            )}

            {Object.keys(CATEGORIES).map((categoryId, index) => {
              const preview = getCategoryPreview(categoryId as CategoryId);
              const total = (docsByCategory[categoryId as CategoryId] || []).length;

              if (preview.length === 0) return null;

              return (
                <motion.div
                  key={categoryId}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <CategorySection
                    categoryId={categoryId as CategoryId}
                    documents={preview}
                    total={total}
                    hasMore={hasMore(categoryId as CategoryId)}
                    onFavoriteToggle={handleFavoriteToggle}
                    onSeeAll={() => {
                      router.push(`/categoria?nome=${categoryId}`);
                    }}
                  />
                </motion.div>
              );
            })}

            {allDocs.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center mb-4 border border-surface-border/50">
                  <User size={24} className="text-ink-muted" />
                </div>
                <h3 className="font-display text-base text-ink-primary">Nenhum documento</h3>
                <p className="text-sm text-ink-muted mt-1 max-w-xs">
                  Comece guardando seu primeiro documento no Vault
                </p>
                <button
                  onClick={() => {
                    trigger("success");
                    router.push("/novo");
                  }}
                  className="mt-6 flex items-center gap-2 rounded-full bg-ice px-5 py-2 text-void font-medium text-sm active:scale-[0.98] transition-all"
                >
                  <Plus size={16} />
                  Adicionar documento
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <button
          onClick={() => {
            trigger("success");
            router.push("/novo");
          }}
          className="fixed bottom-24 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/20 active:scale-95 transition-all z-20"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>

        {/* BottomSheet - Busca */}
        <BottomSheet isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} title="Buscar documentos">
          <div className="space-y-4">
            <Input
              placeholder="Digite para buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div className="text-sm text-ink-muted">
              {filteredDocs.length} resultado{filteredDocs.length !== 1 ? "s" : ""}
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {filteredDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    trigger("vibrate");
                    setIsSearchOpen(false);
                    router.push(`/detalhes?id=${doc.id}`);
                  }}
                  className="w-full text-left p-3 rounded-xl bg-surface border border-surface-border/50 hover:bg-surface-border transition-colors"
                >
                  <p className="text-sm font-medium text-ink-primary">{doc.title}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {doc.category_id} · {doc.type}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </BottomSheet>

        {/* BottomSheet - Selecionar pessoa */}
        <BottomSheet
          isOpen={isPersonModalOpen}
          onClose={() => setIsPersonModalOpen(false)}
          title="Selecionar pessoa"
        >
          <div className="space-y-2">
            {persons.map((person) => (
              <button
                key={person.id}
                onClick={() => {
                  setSelectedPersonId(person.id!);
                  setIsPersonModalOpen(false);
                  trigger("vibrate");
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedPersonId === person.id
                    ? "border-ice bg-ice/10"
                    : "border-surface-border/50 bg-surface hover:bg-surface-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt={person.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-xs font-medium text-ink-muted">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-ink-primary font-medium">{person.name}</span>
                </div>
              </button>
            ))}
          </div>
        </BottomSheet>

        <ScrollToTop threshold={400} />
      </main>
    </PageTransition>
  );
}