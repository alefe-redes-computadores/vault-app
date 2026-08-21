"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Calendar,
  SlidersHorizontal,
  Sparkles,
  LayoutList,
  Grid3X3,
  FileText,
  Images, // 🔥 NOVO: ícone da galeria
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePaginatedDocuments } from "@/hooks/usePaginatedDocuments";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { DocumentCard } from "@/components/DocumentCard";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { Input } from "@/components/ui/Input";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { PageTransition } from "@/components/PageTransition";
import {
  CATEGORIES,
  type CategoryId,
  type Document,
  type DocumentType,
  type Person,
} from "@/lib/types";
import { ExportCardButton } from "@/components/ExportCardButton";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { HealthDocsBanner } from "@/components/HealthDocsBanner"; // 🔥 NOVO: banner inteligente

function useDebounce(value: string, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Apenas tipos do Vault (excluindo saúde)
const DOCUMENT_TYPES: { id: DocumentType; label: string }[] = [
  { id: "rg", label: "RG" },
  { id: "cpf", label: "CPF" },
  { id: "cnh", label: "CNH" },
  { id: "certidao_nascimento", label: "Certidão" },
  { id: "titulo_eleitor", label: "Título Eleitor" },
  { id: "certificado", label: "Certificado" },
  { id: "carteira_trabalho", label: "Carteira Trabalho" },
  { id: "passaporte", label: "Passaporte" },
  { id: "dispensa_militar", label: "Dispensa Militar" },
  { id: "credencial", label: "Credencial" },
  { id: "outro", label: "Outro" },
];

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },
};

type DateFilter = "all" | "expiring" | "expired";
type ViewMode = "list" | "grid";

export default function DocumentsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { favorite } = useSafeDb();
  const persons = usePersons();
  const { activePersonId } = useActivePersonId();

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(
    activePersonId || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "all">("all");
  const [selectedType, setSelectedType] = useState<DocumentType | "all">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isLoading, setIsLoading] = useState(true);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 420);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setSelectedPersonId(activePersonId || null);
  }, [activePersonId]);

  const {
    documents: paginatedDocs,
    totalCount,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedDocuments({
    personId: selectedPersonId || undefined,
    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
    searchQuery: debouncedSearch,
    excludeCategories: ["saude"],
  });

  // Aplica filtros locais (tipo, validade)
  const filteredDocs = useMemo<Document[]>(() => {
    let result = paginatedDocs as Document[];

    if (selectedType !== "all") {
      result = result.filter((doc) => doc.type === selectedType);
    }

    if (dateFilter !== "all") {
      const now = new Date();
      result = result.filter((doc) => {
        const metadata = doc.metadata as
          | { expiry_date?: string | Date; renewal_date?: string | Date; validade?: string | Date }
          | undefined;

        const expiry = metadata?.expiry_date || metadata?.renewal_date || metadata?.validade;
        if (!expiry) return false;

        const expiryDate = new Date(expiry);
        if (Number.isNaN(expiryDate.getTime())) return false;

        if (dateFilter === "expired") return expiryDate < now;

        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return expiryDate > now && expiryDate <= sevenDaysFromNow;
      });
    }

    return result;
  }, [paginatedDocs, selectedType, dateFilter]);

  const handleFavoriteToggle = useCallback(
    async (id: string) => {
      await favorite(id);
      trigger("vibrate");
    },
    [favorite, trigger]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedType("all");
    setDateFilter("all");
    setSelectedPersonId(activePersonId || null);
    trigger("vibrate");
  }, [trigger, activePersonId]);

  const hasActiveFilters =
    selectedPersonId !== null ||
    selectedCategory !== "all" ||
    selectedType !== "all" ||
    dateFilter !== "all";

  const hasSearch = searchQuery.trim().length > 0;

  const getExportCards = useCallback(() => {
    return filteredDocs
      .filter((doc) => Boolean(doc.id))
      .map((doc) => ({
        ref: { current: cardRefs.current[doc.id!] },
        id: doc.id!,
      }));
  }, [filteredDocs]);

  if (isLoading) {
    return <CardListSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="bg-aurora sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                COFRE PESSOAL
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                {filteredDocs.length} documento{filteredDocs.length !== 1 ? "s" : ""}
                {hasActiveFilters ? " filtrados" : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* 🔥 NOVO: botão para a Galeria */}
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  router.push("/galeria");
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-all active:scale-95 hover:text-ink-primary"
                aria-label="Abrir galeria de imagens"
              >
                <Images size={18} />
              </button>

              {/* Alternância Lista ↔ Grid */}
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setViewMode((prev) => (prev === "list" ? "grid" : "list"));
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-all active:scale-95 hover:text-ink-primary"
                aria-label="Alternar visualização"
              >
                {viewMode === "list" ? <Grid3X3 size={18} /> : <LayoutList size={18} />}
              </button>

              {filteredDocs.length > 0 && (
                <ExportCardButton
                  cards={getExportCards()}
                  title="Meus Documentos"
                  variant="secondary"
                  size="sm"
                  label="Exportar"
                />
              )}

              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setShowFilters((prev) => !prev);
                }}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all active:scale-95 ${
                  hasActiveFilters || showFilters
                    ? "border-ice bg-ice/12 text-ice"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                }`}
                aria-label="Abrir filtros"
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </div>

          <div className="relative mt-4">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <Input
              placeholder="Buscar documentos, números ou notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-ink-muted transition-colors hover:text-ink-primary"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {(hasActiveFilters || hasSearch) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-ice/20 bg-ice/10 px-3 py-1.5 text-xs font-medium text-ice">
                <Sparkles size={12} />
                {hasSearch && !hasActiveFilters ? "Busca ativa" : "Filtros ativos"}
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1.5 text-xs text-ink-muted transition-colors active:scale-95 hover:text-ink-primary"
              >
                <X size={12} />
                Limpar
              </button>
            </div>
          )}

          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-4 rounded-[26px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm">
                  {/* Pessoa */}
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-ink-faint">
                      Pessoa
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      <button
                        type="button"
                        onClick={() => setSelectedPersonId(null)}
                        className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          selectedPersonId === null
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        Todos
                      </button>
                      {(persons as Person[]).map((person) => (
                        <button
                          type="button"
                          key={person.id}
                          onClick={() => setSelectedPersonId(person.id!)}
                          className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                            selectedPersonId === person.id
                              ? "border-ice bg-ice/12 text-ice"
                              : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                          }`}
                        >
                          {person.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categoria - apenas Vault */}
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-ink-faint">
                      Categoria
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("all")}
                        className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          selectedCategory === "all"
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        Todas
                      </button>
                      {Object.values(CATEGORIES)
                        .filter((cat: any) => cat.id !== "saude")
                        .map((cat) => (
                          <button
                            type="button"
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                              selectedCategory === cat.id
                                ? "border-ice bg-ice/12 text-ice"
                                : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                            }`}
                          >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Tipo */}
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-ink-faint">
                      Tipo
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedType("all")}
                        className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          selectedType === "all"
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        Todos
                      </button>
                      {DOCUMENT_TYPES.map((type) => (
                        <button
                          type="button"
                          key={type.id}
                          onClick={() => setSelectedType(type.id)}
                          className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                            selectedType === type.id
                              ? "border-ice bg-ice/12 text-ice"
                              : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Validade */}
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-ink-faint">
                      Validade
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDateFilter("all")}
                        className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          dateFilter === "all"
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        Todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateFilter("expiring")}
                        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          dateFilter === "expiring"
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        <Calendar size={12} />
                        Vencendo (7d)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateFilter("expired")}
                        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          dateFilter === "expired"
                            ? "border-coral bg-coral/10 text-coral"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        <Calendar size={12} />
                        Vencidos
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* 🔥 NOVO: Banner inteligente para documentos de saúde */}
        <HealthDocsBanner />

        <section className="px-5 pt-5">
          {filteredDocs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="flex flex-col items-center justify-center rounded-[30px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="glow-ice mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-ice/15 bg-surface-raised">
                <Search size={28} className="text-ice/60" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-primary">Nenhum documento encontrado</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Seus documentos pessoais, de empresa e outros aparecerão aqui.
              </p>
            </motion.div>
          ) : viewMode === "list" ? (
            <InfiniteScrollTrigger onLoadMore={loadMore} hasMore={hasMore} isLoading={isLoadingMore}>
              <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-4">
                {filteredDocs.map((doc) => (
                  <motion.div
                    key={doc.id}
                    variants={cardVariants}
                    ref={(el) => {
                      if (doc.id) cardRefs.current[doc.id] = el;
                    }}
                  >
                    <DocumentCard document={doc} onFavoriteToggle={handleFavoriteToggle} />
                  </motion.div>
                ))}
              </motion.div>
            </InfiniteScrollTrigger>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredDocs.map((doc) => {
                const firstAttachment = doc.attachments?.[0];
                return (
                  <motion.div
                    key={doc.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="show"
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/detalhes?id=${doc.id}`);
                    }}
                    className="group relative overflow-hidden rounded-[22px] border border-surface-border/50 bg-surface p-3 transition-all active:scale-[0.98] hover:border-ice/30 cursor-pointer shadow-sm"
                  >
                    <div className="h-28 w-full overflow-hidden rounded-xl bg-surface-raised flex items-center justify-center">
                      {firstAttachment?.type === "image" ? (
                        <img
                          src={firstAttachment.url}
                          alt={doc.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <FileText size={32} className="text-ice/50" />
                      )}
                    </div>
                    <div className="mt-2.5 min-w-0">
                      <p className="truncate text-xs font-semibold text-ink-primary">{doc.title}</p>
                      <p className="text-[10px] text-ink-muted capitalize">{doc.type.replace("_", " ")}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        <ScrollToTop threshold={400} />
      </main>
    </PageTransition>
  );
}