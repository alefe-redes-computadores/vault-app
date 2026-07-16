"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { useDocuments, useFavorites } from "@/hooks/useLocalData";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { AreaTabs } from "@/components/AreaTabs";
import { DocumentList } from "@/components/DocumentList";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function HomePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { favorite } = useSafeDb();

  const [activeProfileId, setActiveProfileId] = useState<number>(1);
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Busca documentos com filtros
  const allDocs = useDocuments(activeProfileId, activeArea || undefined) ?? [];
  const favorites = useFavorites(activeProfileId) ?? [];

  // Filtra por busca
  const filteredDocs = allDocs.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFavoriteToggle = async (id: number) => {
    await favorite(id);
  };

  const total = allDocs.length;
  const favCount = favorites.length;

  return (
    <main className="min-h-screen bg-void pb-28">
      {/* Header */}
      <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
            <h1 className="font-display text-2xl font-semibold text-ink-primary">
              Seus documentos
            </h1>
          </div>
          <button
            onClick={() => {
              trigger("vibrate");
              setIsSearchOpen(true);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98] transition-all"
            aria-label="Buscar documento"
          >
            <Search size={18} className="text-ink-muted" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-ink-muted">
            {total === 0
              ? "Nenhum documento guardado ainda"
              : `${total} documento${total > 1 ? "s" : ""} guardado${total > 1 ? "s" : ""}`}
            {favCount > 0 && ` · ${favCount} favorito${favCount > 1 ? "s" : ""}`}
          </p>
          <button
            onClick={() => router.push("/favoritos")}
            className="text-sm text-ice hover:text-ice/80 transition-colors"
          >
            Ver favoritos
          </button>
        </div>

        {/* Profile Switcher */}
        <div className="mt-4">
          <ProfileSwitcher
            activeProfileId={activeProfileId}
            onProfileChange={setActiveProfileId}
          />
        </div>
      </header>

      {/* Áreas */}
      <div className="px-5 pt-5">
        <AreaTabs
          activeArea={activeArea}
          onAreaChange={setActiveArea}
        />
      </div>

      {/* Lista de Documentos */}
      <section className="px-5 pt-5">
        <DocumentList
          documents={filteredDocs}
          onFavoriteToggle={handleFavoriteToggle}
          profileId={activeProfileId}
          areaId={activeArea}
        />
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
      <BottomSheet
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="Buscar documentos"
      >
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
                  {doc.areaId} · {doc.category}
                </p>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>
    </main>
  );
}