"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, LogOut, User, ChevronRight } from "lucide-react";
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
  const { user, logout } = useAuth();
  const { favorite } = useSafeDb();

  const persons = usePersons();
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const debouncedSearch = useDebounce(searchQuery, 300);

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

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        {/* HEADER REFORMULADO */}
        <header className="sticky top-0 z-10 bg-void/80 backdrop-blur-xl border-b border-surface-border/50 px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-full border border-ice/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center text-ink-muted text-sm font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-display text-lg font-semibold text-ink-primary">
                  Olá, {displayName.split(" ")[0]}
                </h1>
                <p className="text-xs text-ink-muted">
                  {allDocs.length} documento{allDocs.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsSearchOpen(true);
              }}
              className="p-2 rounded-full bg-surface-raised border border-surface-border/50 hover:bg-surface-border transition-colors"
            >
              <Search size={18} className="text-ink-muted" />
            </button>
          </div>

          {/* PESSOAS (scroll horizontal) */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">
                Pessoas
              </span>
              <button
                onClick={() => router.push("/pessoas/novo")}
                className="text-xs text-ice/70 hover:text-ice transition-colors"
              >
                + Adicionar
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {persons.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  isActive={selectedPersonId === person.id}
                  onClick={() => {
                    trigger("vibrate");
                    setSelectedPersonId(person.id!);
                  }}
                />
              ))}
            </div>
          </div>
        </header>

        {/* CONTEÚDO */}
        <section className="px-5 pt-5 space-y-6">
          <FavoritesSection favorites={favorites} onFavoriteToggle={handleFavoriteToggle} />

          {Object.keys(CATEGORIES).map((categoryId) => {
            const preview = getCategoryPreview(categoryId as CategoryId);
            const total = (docsByCategory[categoryId as CategoryId] || []).length;

            if (preview.length === 0) return null;

            return (
              <CategorySection
                key={categoryId}
                categoryId={categoryId as CategoryId}
                documents={preview}
                total={total}
                hasMore={hasMore(categoryId as CategoryId)}
                onFavoriteToggle={handleFavoriteToggle}
                onSeeAll={() => {
                  router.push(`/categoria?nome=${categoryId}`);
                }}
              />
            );
          })}

          {allDocs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center mb-4">
                <User size={28} className="text-ink-muted" />
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
                className="mt-4 flex items-center gap-2 rounded-full bg-ice px-5 py-2.5 text-void font-medium text-sm active:scale-[0.98] transition-all"
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>
          )}
        </section>

        {/* BOTÃO FLUTUANTE (mais sutil) */}
        <button
          onClick={() => {
            trigger("success");
            router.push("/novo");
          }}
          className="fixed bottom-24 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-ice text-void shadow-lg shadow-ice/20 active:scale-[0.95] transition-all z-20"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>

        {/* BOTTOM SHEET DE BUSCA */}
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
                  className="w-full text-left p-3 rounded-xl bg-surface border border-surface-border hover:bg-surface-border transition-colors"
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
      </main>
    </PageTransition>
  );
}