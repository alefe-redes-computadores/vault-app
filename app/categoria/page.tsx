"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, User, FolderOpen, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePersons } from "@/hooks/usePersons";
import { useDocuments } from "@/hooks/useDocuments";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, type CategoryId } from "@/lib/types";
import { DocumentCard } from "@/components/DocumentCard";
import { PersonCard } from "@/components/PersonCard";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useEffect, useState } from "react";

export default function CategoryPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("nome") as CategoryId;
  const [isLoading, setIsLoading] = useState(true);

  const persons = usePersons();
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(
    persons[0]?.id || null
  );

  const documents = useDocuments(selectedPersonId || undefined, categoryId);
  const { favorite } = useSafeDb();

  const category = CATEGORIES[categoryId];

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleFavoriteToggle = useCallback(async (id: number) => {
    await favorite(id);
    trigger("vibrate");
  }, [favorite, trigger]);

  const totalDocs = documents?.length || 0;
  const hasDocs = totalDocs > 0;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!category) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void flex items-center justify-center">
          <div className="text-center">
            <p className="text-ink-muted">Categoria não encontrada</p>
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="mt-4 text-sm text-ice hover:text-ice/80 transition-colors"
            >
              Voltar
            </button>
          </div>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        {/* HEADER COM COR DA CATEGORIA */}
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
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <FolderOpen size={18} style={{ color: category.color }} />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold text-ink-primary">
                  {category.name}
                </h1>
                <p className="text-sm text-ink-muted">
                  {totalDocs} documento{totalDocs !== 1 ? "s" : ""}
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
                Todos
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
        </header>

        {/* CONTEÚDO */}
        <section className="px-5 pt-5 space-y-3">
          <AnimatePresence mode="wait">
            {!hasDocs ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center mb-6 border"
                  style={{
                    backgroundColor: `${category.color}15`,
                    borderColor: `${category.color}30`,
                  }}
                >
                  <FolderOpen size={36} style={{ color: category.color }} />
                </div>
                <h3 className="font-display text-xl text-ink-primary">
                  Nenhum documento em {category.name}
                </h3>
                <p className="text-sm text-ink-muted mt-2 max-w-xs">
                  Comece adicionando documentos nesta categoria.
                </p>
                <button
                  onClick={() => {
                    trigger("vibrate");
                    router.push("/novo");
                  }}
                  className="mt-6 flex items-center gap-2 rounded-full bg-ice px-6 py-3 text-void font-medium text-sm active:scale-95 transition-all"
                >
                  Adicionar documento
                  <ChevronRight size={16} />
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
                {documents.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <DocumentCard
                      document={doc}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </PageTransition>
  );
}