"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronRight,
  Sparkles,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { usePersons } from "@/hooks/usePersons";
import { usePaginatedDocuments } from "@/hooks/usePaginatedDocuments";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { CATEGORIES, type CategoryId, type Document } from "@/lib/types";
import { PersonCard } from "@/components/PersonCard";
import { CategorySection } from "@/components/CategorySection";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useToast } from "@/components/ToastProvider";
import { ExportButton } from "@/components/ExportButton";

function useDebounce(value: string, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const pageEnter = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { favorite } = useSafeDb();
  const { showToast } = useToast();

  const persons = usePersons();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [welcomeShown, setWelcomeShown] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!loading && user && !welcomeShown) {
      const hasSeenWelcome =
        typeof window !== "undefined"
          ? sessionStorage.getItem("vault_welcome_shown")
          : "true";

      if (!hasSeenWelcome) {
        const name =
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Usuário";

        setTimeout(() => {
          showToast(`👋 Bem-vindo de volta, ${name}!`, "info", 4000);
        }, 450);

        sessionStorage.setItem("vault_welcome_shown", "true");
        setWelcomeShown(true);
      } else {
        setWelcomeShown(true);
      }
    }
  }, [loading, user, showToast, welcomeShown]);

  useEffect(() => {
    if (persons.length > 0 && selectedPersonId === null) {
      setSelectedPersonId(persons[0].id!);
    }

    const timer = setTimeout(() => setIsLoading(false), 650);
    return () => clearTimeout(timer);
  }, [persons, selectedPersonId]);

  const { documents: allDocs } = usePaginatedDocuments({
    personId: selectedPersonId || undefined,
    searchQuery: debouncedSearch,
    initialPage: 1,
  });

  const handleFavoriteToggle = useCallback(
    async (id: string) => {
      await favorite(id);
      trigger("vibrate");
    },
    [favorite, trigger]
  );

  const docsByCategory = useMemo(() => {
    return allDocs.reduce<Record<CategoryId, Document[]>>(
      (acc: Record<CategoryId, Document[]>, doc: any) => {
        const categoryId = doc.category_id as CategoryId;
        if (!acc[categoryId]) acc[categoryId] = [];
        acc[categoryId].push(doc);
        return acc;
      },
      {} as Record<CategoryId, Document[]>
    );
  }, [allDocs]);

  const getCategoryPreview = useCallback(
    (categoryId: CategoryId) => {
      const docs = docsByCategory[categoryId] || [];
      return docs.slice(0, 3);
    },
    [docsByCategory]
  );

  const hasMore = useCallback(
    (categoryId: CategoryId) => {
      return (docsByCategory[categoryId] || []).length > 3;
    },
    [docsByCategory]
  );

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";

  const MAX_VISIBLE_PERSONS = 5;
  const visiblePersons = persons.slice(0, MAX_VISIBLE_PERSONS);
  const hasMorePersons = persons.length > MAX_VISIBLE_PERSONS;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[8.5rem]">
        {/* HEADER SEM pt-safe, puxando o conteúdo para cima na medida certa */}
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void px-5 pb-4 pt-3">
          <motion.div
            {...pageEnter}
            transition={{ duration: 0.24 }}
            className="flex items-start justify-between gap-3"
          >
            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/mais");
              }}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              {avatarUrl ? (
                <span className="glow-ice flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    loading="lazy"
                    className="h-full w-full rounded-full object-cover"
                  />
                </span>
              ) : (
                <div className="ring-gradient glow-ice flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-void">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
                <h1 className="mt-1 truncate font-display text-base font-semibold text-ink-primary">
                  Olá, {displayName.split(" ")[0]}
                </h1>
                <p className="text-xs text-ink-muted">
                  {allDocs.length} documento{allDocs.length !== 1 ? "s" : ""}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <ExportButton variant="icon" />
              <button
                onClick={() => {
                  trigger("vibrate");
                  setIsSearchOpen(true);
                }}
                aria-label="Buscar documentos"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-all duration-200 active:scale-95 hover:bg-surface-border hover:text-ink-primary"
              >
                <Search size={16} />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.04 }}
            className="mt-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
                Pessoas
              </span>

              {hasMorePersons && (
                <button
                  onClick={() => {
                    trigger("vibrate");
                    setIsPersonModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-ice/80 transition-colors hover:text-ice"
                >
                  Ver todos
                  <ChevronRight size={12} />
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {visiblePersons.map((person: any) => (
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

              {hasMorePersons && (
                <button
                  onClick={() => {
                    trigger("vibrate");
                    setIsPersonModalOpen(true);
                  }}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-xs font-medium text-ink-muted transition-all duration-200 active:scale-95 hover:bg-surface-border hover:text-ink-primary"
                >
                  +{persons.length - MAX_VISIBLE_PERSONS}
                </button>
              )}
            </div>
          </motion.div>
        </header>

        <section className="space-y-5 px-5 pt-5">
          <AnimatePresence mode="popLayout">
            {Object.keys(CATEGORIES).map((categoryId: any, index: number) => {
              const preview = getCategoryPreview(categoryId as CategoryId);
              const total = (docsByCategory[categoryId as CategoryId] || []).length;

              if (preview.length === 0) return null;

              return (
                <motion.div
                  key={categoryId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.28,
                    delay: Math.min(index * 0.05, 0.28),
                  }}
                >
                  <CategorySection
                    categoryId={categoryId as CategoryId}
                    documents={preview}
                    total={total}
                    hasMore={hasMore(categoryId as CategoryId)}
                    onFavoriteToggle={handleFavoriteToggle}
                    onSeeAll={() => {
                      trigger("vibrate");
                      router.push(`/categoria?nome=${categoryId}`);
                    }}
                  />
                </motion.div>
              );
            })}

            {allDocs.length === 0 && (
              <motion.div
                key="empty-docs"
                initial={{ opacity: 0, y: 12, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28 }}
                className="rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
              >
                <div className="ring-gradient mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
                  <FileText size={24} className="text-void" />
                </div>

                <h3 className="font-display text-lg font-semibold text-ink-primary">
                  Nenhum documento encontrado
                </h3>

                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                  {persons.length > 0
                    ? "Adicione o primeiro documento para começar a organizar este perfil."
                    : "Cadastre uma pessoa e comece a guardar documentos com segurança."}
                </p>

                <button
                  onClick={() => {
                    trigger("success");
                    router.push("/novo");
                  }}
                  className="glow-ice mt-6 inline-flex items-center gap-2 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void transition-all duration-200 active:scale-95"
                >
                  <Plus size={16} />
                  Adicionar documento
                </button>
              </motion.div>
            )}

            {allDocs.length > 0 && (
              <motion.div
                key="tip"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.08 }}
                className="relative overflow-hidden rounded-[22px] border border-ice/10 px-4 py-4"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(var(--ice-rgb) / 0.10), rgb(var(--violet-rgb) / 0.06))",
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="ring-gradient mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-void">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-primary">
                      Acesso rápido
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">
                      Toque no título de uma categoria para minimizá-la. Seus favoritos ficam a um toque no menu inferior.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

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
              className="transition-all duration-200"
            />

            <div className="text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
              {allDocs.length} resultado{allDocs.length !== 1 ? "s" : ""}
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {allDocs.length === 0 ? (
                <div className="rounded-2xl border border-surface-border/50 bg-surface px-4 py-5 text-center">
                  <p className="text-sm font-medium text-ink-primary">
                    Nada encontrado
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Tente outro nome, categoria ou tipo.
                  </p>
                </div>
              ) : (
                allDocs.map((doc: any) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      trigger("vibrate");
                      setIsSearchOpen(false);
                      router.push(`/detalhes?id=${doc.id}`);
                    }}
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface p-3 text-left transition-all duration-200 active:scale-[0.99] hover:bg-surface-border"
                  >
                    <p className="text-sm font-semibold text-ink-primary">
                      {doc.title}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {doc.category_id} · {doc.type}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </BottomSheet>

        <BottomSheet
          isOpen={isPersonModalOpen}
          onClose={() => setIsPersonModalOpen(false)}
          title="Todas as pessoas"
        >
          <div className="space-y-2">
            {persons.map((person: any) => (
              <button
                key={person.id}
                onClick={() => {
                  setSelectedPersonId(person.id!);
                  setIsPersonModalOpen(false);
                  trigger("vibrate");
                }}
                className={`w-full rounded-2xl border p-3 text-left transition-all duration-200 active:scale-[0.99] ${
                  selectedPersonId === person.id
                    ? "border-ice bg-ice/10"
                    : "border-surface-border/50 bg-surface hover:bg-surface-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  {person.avatar_url ? (
                    <img
                      src={person.avatar_url}
                      alt={person.name}
                      loading="lazy"
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-xs font-medium text-ink-muted">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-primary">
                      {person.name}
                    </p>
                  </div>

                  {person.id === selectedPersonId && (
                    <span className="ml-auto text-xs font-semibold text-ice">
                      Selecionado
                    </span>
                  )}
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
