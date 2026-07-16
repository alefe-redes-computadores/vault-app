"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { useFavorites, useProfiles } from "@/hooks/useLocalData";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { DocumentCard } from "@/components/DocumentCard";
import { Button } from "@/components/ui/Button";

export default function FavoritesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { favorite } = useSafeDb();

  const [activeProfileId, setActiveProfileId] = useState<number>(1);
  const favorites = useFavorites(activeProfileId) ?? [];

  const handleFavoriteToggle = async (id: number) => {
    await favorite(id);
  };

  return (
    <main className="min-h-screen bg-void pb-28">
      {/* Header */}
      <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              trigger("vibrate");
              router.back();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98] transition-all"
          >
            <ArrowLeft size={18} className="text-ink-primary" />
          </button>
          <div className="flex items-center gap-2">
            <Star size={20} className="fill-ice text-ice" />
            <h1 className="font-display text-xl font-semibold text-ink-primary">
              Favoritos
            </h1>
          </div>
        </div>

        <div className="mt-4">
          <ProfileSwitcher
            activeProfileId={activeProfileId}
            onProfileChange={setActiveProfileId}
          />
        </div>
      </header>

      {/* Lista de favoritos */}
      <section className="px-5 pt-5">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center mb-4">
              <Star size={32} className="text-ink-muted" />
            </div>
            <h3 className="font-display text-lg text-ink-primary">Nenhum favorito</h3>
            <p className="text-sm text-ink-muted mt-1 max-w-xs">
              Marque documentos como favoritos para acessá-los rapidamente
            </p>
            <Button
              variant="primary"
              onClick={() => {
                trigger("vibrate");
                router.push("/");
              }}
              className="mt-6"
            >
              Voltar para documentos
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}