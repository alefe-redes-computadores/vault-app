"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User } from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useDocuments } from "@/hooks/useDocuments";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, type CategoryId } from "@/lib/types";
import { DocumentCard } from "@/components/DocumentCard";
import { PersonCard } from "@/components/PersonCard";
import { PageTransition } from "@/components/PageTransition";

export default function CategoryPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as CategoryId;

  const persons = usePersons();
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(
    persons[0]?.id || null
  );

  const documents = useDocuments(selectedPersonId || undefined, categoryId);
  const { favorite } = useSafeDb();

  const category = CATEGORIES[categoryId];

  const handleFavoriteToggle = async (id: number) => {
    await favorite(id);
    trigger("vibrate");
  };

  if (!category) {
    return (
      <main className="min-h-screen bg-void flex items-center justify-center">
        <p className="text-ink-muted">Categoria não encontrada</p>
      </main>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                {category.name}
              </h1>
              <p className="text-sm text-ink-muted">
                {documents.length} documento{documents.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
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
        </header>

        <section className="px-5 pt-5 space-y-3">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${category.color}22` }}
              >
                <User size={32} style={{ color: category.color }} />
              </div>
              <h3 className="font-display text-lg text-ink-primary">Nenhum documento</h3>
              <p className="text-sm text-ink-muted mt-1">
                Nenhum documento encontrado nesta categoria para esta pessoa
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User } from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useDocuments } from "@/hooks/useDocuments";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, type CategoryId } from "@/lib/types";
import { DocumentCard } from "@/components/DocumentCard";
import { PersonCard } from "@/components/PersonCard";
import { PageTransition } from "@/components/PageTransition";

export default function CategoryPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as CategoryId;

  const persons = usePersons();
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(
    persons[0]?.id || null
  );

  const documents = useDocuments(selectedPersonId || undefined, categoryId);
  const { favorite } = useSafeDb();

  const category = CATEGORIES[categoryId];

  const handleFavoriteToggle = async (id: number) => {
    await favorite(id);
    trigger("vibrate");
  };

  if (!category) {
    return (
      <main className="min-h-screen bg-void flex items-center justify-center">
        <p className="text-ink-muted">Categoria não encontrada</p>
      </main>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                {category.name}
              </h1>
              <p className="text-sm text-ink-muted">
                {documents.length} documento{documents.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
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
        </header>

        <section className="px-5 pt-5 space-y-3">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${category.color}22` }}
              >
                <User size={32} style={{ color: category.color }} />
              </div>
              <h3 className="font-display text-lg text-ink-primary">Nenhum documento</h3>
              <p className="text-sm text-ink-muted mt-1">
                Nenhum documento encontrado nesta categoria para esta pessoa
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}