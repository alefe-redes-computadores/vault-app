"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { DocumentCard } from "@/components/DocumentCard";
import { PersonCard } from "@/components/PersonCard";
import { Input } from "@/components/ui/Input";

export default function DocumentsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { favorite } = useSafeDb();
  const persons = usePersons();

  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(
    persons[0]?.id || null
  );
  const [searchQuery, setSearchQuery] = useState("");

  const documents = useDocuments(selectedPersonId || undefined);

  const filteredDocs = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFavoriteToggle = async (id: number) => {
    await favorite(id);
    trigger("vibrate");
  };

  return (
    <main className="min-h-screen bg-void pb-4">
      <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-xl font-semibold text-ink-primary">
            Todos os documentos
          </h1>
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

        <div className="mt-4">
          <Input
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={16} className="text-ink-muted" />}
          />
        </div>
      </header>

      <section className="px-5 pt-5 space-y-3">
        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-ink-muted">
              {searchQuery ? "Nenhum documento encontrado" : "Nenhum documento ainda"}
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onFavoriteToggle={handleFavoriteToggle}
            />
          ))
        )}
      </section>
    </main>
  );
}