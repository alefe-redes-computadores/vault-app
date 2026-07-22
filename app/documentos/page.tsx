"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, X, Calendar, FileText, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDocuments } from "@/hooks/useDocuments";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { DocumentCard } from "@/components/DocumentCard";
import { PersonCard } from "@/components/PersonCard";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { CATEGORIES, type CategoryId, type DocumentType } from "@/lib/types";
import { ExportCardButton } from "@/components/ExportCardButton";
import { ScrollToTop } from "@/components/ScrollToTop";

// ✅ DEBOUNCE
function useDebounce(value: string, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const DOCUMENT_TYPES: { id: DocumentType; label: string }[] = [
  { id: "rg", label: "RG" },
  { id: "cpf", label: "CPF" },
  { id: "cnh", label: "CNH" },
  { id: "certificado", label: "Certificado" },
  { id: "receita", label: "Receita" },
  { id: "prontuario", label: "Prontuário" },
  { id: "laudo", label: "Laudo" },
  { id: "encaminhamento", label: "Encaminhamento" },
  { id: "outro", label: "Outro" },
];

export default function DocumentsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { favorite } = useSafeDb();
  const persons = usePersons();

  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({}); // ← string

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>( // ← string
    persons[0]?.id || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "all">("all");
  const [selectedType, setSelectedType] = useState<DocumentType | "all">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "expiring" | "expired">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const documents = useDocuments(selectedPersonId || undefined);

  const filteredDocs = useMemo(() => {
    let result = documents;

    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter((doc: any) =>
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((doc: any) => doc.category_id === selectedCategory);
    }

    if (selectedType !== "all") {
      result = result.filter((doc: any) => doc.type === selectedType);
    }

    if (dateFilter === "expiring") {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      result = result.filter((doc: any) => {
        const expiry = doc.metadata?.expiry_date || doc.metadata?.renewal_date;
        if (!expiry) return false;
        const expiryDate = new Date(expiry);
        return expiryDate > now && expiryDate <= sevenDaysFromNow;
      });
    } else if (dateFilter === "expired") {
      const now = new Date();
      result = result.filter((doc: any) => {
        const expiry = doc.metadata?.expiry_date || doc.metadata?.renewal_date;
        if (!expiry) return false;
        return new Date(expiry) < now;
      });
    }

    return result;
  }, [documents, debouncedSearch, selectedCategory, selectedType, dateFilter]);

  const handleFavoriteToggle = useCallback(async (id: string) => { // ← string
    await favorite(id);
    trigger("vibrate");
  }, [favorite, trigger]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedType("all");
    setDateFilter("all");
    trigger("vibrate");
  };

  const hasActiveFilters = selectedCategory !== "all" || selectedType !== "all" || dateFilter !== "all";

  const getExportCards = () => {
    return filteredDocs.map((doc: any) => ({
      ref: { current: cardRefs.current[doc.id!] },
      id: doc.id!,
    }));
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-4">
        <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Documentos
              </h1>
              <p className="text-sm text-ink-muted">
                {filteredDocs.length} documento{filteredDocs.length !== 1 ? "s" : ""}
                {hasActiveFilters && " filtrados"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {filteredDocs.length > 0 && (
                <ExportCardButton
                  cards={getExportCards()}
                  title="Meus Documentos"
                  variant="secondary"
                  size="sm"
                  label="📄 Exportar"
                />
              )}
              <button
                onClick={() => {
                  trigger("vibrate");
                  setShowFilters(!showFilters);
                }}
                className={`p-2 rounded-full border transition-colors ${
                  hasActiveFilters
                    ? "border-ice bg-ice/10 text-ice"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted hover:bg-surface-border"
                }`}
              >
                <Filter size={18} />
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-ink-muted hover:text-ink-primary transition-colors"
                >
                  <X size={14} /> Limpar
                </button>
              )}
            </div>
          </div>

          {/* Busca */}
          <div className="mt-4 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <Input
              placeholder="Buscar documentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-raised border-surface-border/50 focus:border-steel-light"
            />
          </div>

          {/* Filtros */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 p-4 rounded-xl bg-surface-raised border border-surface-border/50 space-y-4 overflow-hidden"
              >
                {/* Pessoa */}
                <div>
                  <label className="block text-xs text-ink-muted mb-1.5">Pessoa</label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                      onClick={() => setSelectedPersonId(null)}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 whitespace-nowrap ${
                        selectedPersonId === null
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      Todos
                    </button>
                    {persons.map((person: any) => (
                      <button
                        key={person.id}
                        onClick={() => setSelectedPersonId(person.id!)}
                        className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 whitespace-nowrap ${
                          selectedPersonId === person.id
                            ? "border-ice bg-ice/10 text-ice"
                            : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        {person.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-xs text-ink-muted mb-1.5">Categoria</label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 ${
                        selectedCategory === "all"
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      Todas
                    </button>
                    {Object.values(CATEGORIES).map((cat: any) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 flex items-center gap-1 ${
                          selectedCategory === cat.id
                            ? "border-ice bg-ice/10 text-ice"
                            : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-xs text-ink-muted mb-1.5">Tipo</label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedType("all")}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 ${
                        selectedType === "all"
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      Todos
                    </button>
                    {DOCUMENT_TYPES.map((type: any) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 ${
                          selectedType === type.id
                            ? "border-ice bg-ice/10 text-ice"
                            : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data */}
                <div>
                  <label className="block text-xs text-ink-muted mb-1.5">Validade</label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setDateFilter("all")}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 ${
                        dateFilter === "all"
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setDateFilter("expiring")}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 flex items-center gap-1 ${
                        dateFilter === "expiring"
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      <Calendar size={12} />
                      Vencendo (7d)
                    </button>
                    <button
                      onClick={() => setDateFilter("expired")}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-95 flex items-center gap-1 ${
                        dateFilter === "expired"
                          ? "border-coral bg-coral/10 text-coral"
                          : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      <Calendar size={12} />
                      Vencidos
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Lista */}
        <section className="px-5 pt-5 space-y-3">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-ink-muted">
                {searchQuery
                  ? "Nenhum documento encontrado"
                  : hasActiveFilters
                  ? "Nenhum documento com esses filtros"
                  : "Nenhum documento ainda"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-sm text-ice hover:text-ice/80 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            filteredDocs.map((doc: any, index: number) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                ref={(el) => { cardRefs.current[doc.id!] = el; }}
              >
                <DocumentCard
                  document={doc}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              </motion.div>
            ))
          )}
        </section>

        {/* ScrollToTop */}
        <ScrollToTop threshold={400} />
      </main>
    </PageTransition>
  );
}