"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, LogOut, User, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePersons } from "@/hooks/usePersons";
import { useDocuments, useFavorites } from "@/hooks/useDocuments";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, type CategoryId } from "@/lib/types";
import { PersonCard } from "@/components/PersonCard";
import { CategorySection } from "@/components/CategorySection";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function HomePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { favorite } = useSafeDb();

  const persons = usePersons();
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Seleciona a primeira pessoa automaticamente
  useEffect(() => {
    if (persons.length > 0 && selectedPersonId === null) {
      setSelectedPersonId(persons[0].id!);
    }
  }, [persons, selectedPersonId]);

  const allDocs = useDocuments(selectedPersonId || undefined);
  const favorites = useFavorites(selectedPersonId || undefined);

  // Filtra por busca
  const filteredDocs = allDocs.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFavoriteToggle = async (id: number) => {
    await favorite(id);
  };

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";

  // Agrupa documentos por categoria
  const docsByCategory = allDocs.reduce<Record<CategoryId, typeof allDocs>>(
    (acc, doc) => {
      if (!acc[doc.category_id]) acc[doc.category_id] = [];
      acc[doc.category_id].push(doc);
      return acc;
    },
    {} as Record<CategoryId, typeof allDocs>
  );

  // Pega os 3 primeiros de cada categoria
  const getCategoryPreview = (categoryId: CategoryId) => {
    const docs = docsByCategory[categoryId] || [];
    return docs.slice(0, 3);
  };

  const hasMore = (categoryId: CategoryId) => {
    return (docsByCategory[categoryId] || []).length > 3;
  };

  return (
    <main className="min-h-screen bg-void pb-28">
      {/* Header */}
      <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full border-2 border-ice/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-steel-dark/40 flex items-center justify-center text-ink-muted">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Olá, {displayName.split(" ")[0]}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                trigger("vibrate");
                setIsSearchOpen(true);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
            >
              <Search size={18} className="text-ink-muted" />
            </button>
            <button
              onClick={() => {
                trigger("vibrate");
                logout();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
            >
              <LogOut size={18} className="text-ink-muted" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-ink-muted">
            {allDocs.length} documento{allDocs.length !== 1 ? "s" : ""}
            {favorites.length > 0 && ` · ${favorites.length} favorito${favorites.length > 1 ? "s" : ""}`}
          </p>
          <button
            onClick={() => router.push("/favoritos")}
            className="text-sm text-ice hover:text-ice/80 transition-colors"
          >
            Ver favoritos
          </button>
        </div>
      </header>

      {/* Pessoas (horizontal) */}
      <section className="px-5 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-medium text-ink-muted">Pessoas</h2>
          <button
            onClick={() => router.push("/pessoas/novo")}
            className="text-xs text-ice hover:text-ice/80 transition-colors"
          >
            + Adicionar
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
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
      </section>

      {/* Cards por categoria */}
      <section className="px-5 pt-5 space-y-6">
        {Object.keys(CATEGORIES).map((categoryId) => {
          const preview = getCategoryPreview(categoryId as CategoryId);
          const more = hasMore(categoryId as CategoryId);
          const total = (docsByCategory[categoryId as CategoryId] || []).length;

          if (preview.length === 0) return null;

          return (
            <CategorySection
              key={categoryId}
              categoryId={categoryId as CategoryId}
              documents={preview}
              total={total}
              hasMore={more}
              onFavoriteToggle={handleFavoriteToggle}
              onSeeAll={() => {
                router.push(`/categoria/${categoryId}`);
              }}
            />
          );
        })}
      </section>

      {/* Botão flutuante */}
      <button
        onClick={() => {
          trigger("success");
          router.push("/novo");
        }}
        className="fixed bottom-8 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-ice text-void shadow-vault active:scale-[0.98] transition-all z-20"
        aria-label="Adicionar documento"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Bottom Sheet de Busca */}
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
                  router.push(`/${doc.id}`);
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
  );
}