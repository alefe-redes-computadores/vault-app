"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Calendar,
  SlidersHorizontal,
  Sparkles,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePaginatedDocuments } from "@/hooks/usePaginatedDocuments";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { DocumentCard } from "@/components/DocumentCard";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { CATEGORIES, type CategoryId, type DocumentType } from "@/lib/types";
import { ExportCardButton } from "@/components/ExportCardButton";
import { ScrollToTop } from "@/components/ScrollToTop";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function useDebounce(value: string, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const DOCUMENT_TYPES: { id: DocumentType | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "receita", label: "Receitas" },
  { id: "prontuario", label: "Prontuários" },
  { id: "laudo", label: "Laudos" },
  { id: "encaminhamento", label: "Encaminhamentos" },
  { id: "cirurgia", label: "Cirurgias" },
];

export default function DocumentsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { favorite } = useSafeDb();
  const persons = usePersons();

  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "all">("all");
  const [selectedType, setSelectedType] = useState<DocumentType | "all">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "expiring" | "expired">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 420);
    return () => clearTimeout(timer);
  }, []);

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
  });

  const filteredDocs = useMemo(() => {
    let result = paginatedDocs.filter((doc: any) => doc.category_id === 'saude');

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

    // Ordenação do mais recente para o mais antigo
    return result.sort((a: any, b:any) => {
      const dateA = new Date(a.metadata?.prescription_date || a.metadata?.date || a.created_at || 0).getTime();
      const dateB = new Date(b.metadata?.prescription_date || b.metadata?.date || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [paginatedDocs, selectedType, dateFilter]);

  // Agrupamento por Mês/Ano para a Linha do Tempo
  const timelineGroups = useMemo(() => {
    const groups: { [key: string]: any[] } = {};

    for (const doc of filteredDocs) {
      const dateStr = doc.metadata?.prescription_date || doc.metadata?.date || doc.created_at;
      let monthYearKey = "Outros Períodos";
      
      if (dateStr) {
        try {
          const parsed = parseISO(dateStr);
          monthYearKey = format(parsed, "MMMM 'de' yyyy", { locale: ptBR });
          // Capitaliza o mês
          monthYearKey = monthYearKey.charAt(0).toUpperCase() + monthYearKey.slice(1);
        } catch {
          monthYearKey = "Geral";
        }
      }

      if (!groups[monthYearKey]) {
        groups[monthYearKey] = [];
      }
      groups[monthYearKey].push(doc);
    }

    return Object.entries(groups);
  }, [filteredDocs]);

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
    setSelectedPersonId(null);
    trigger("vibrate");
  }, [trigger]);

  const hasActiveFilters =
    selectedPersonId !== null ||
    selectedCategory !== "all" ||
    selectedType !== "all" ||
    dateFilter !== "all" ||
    selectedType !== "all";

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
      <main className="min-h-screen bg-void pb-6">
        <header className="sticky top-0 z-25 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
                <h1 className="mt-0.5 font-display text-lg font-semibold text-ink-primary truncate">
                  Acervo de Documentos
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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
              placeholder="Buscar por nome, remédio, hospital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9 transition-all"
            />
          </div>

          {/* Abas Rápidas de Tipo (Substituiu os chips longos) */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {DOCUMENT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  trigger("vibrate");
                  setSelectedType(t.id);
                }}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                  selectedType === t.id
                    ? "border-ice bg-ice/12 text-ice"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

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
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-ink-faint">
                      Validade
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setDateFilter("all")}
                        className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          dateFilter === "all"
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted"
                        }`}
                      >
                        Todas
                      </button>
                      <button
                        onClick={() => setDateFilter("expiring")}
                        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          dateFilter === "expiring"
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted"
                        }`}
                      >
                        <Calendar size={12} />
                        Vencendo (7d)
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

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
              <h3 className="font-display text-lg font-semibold text-ink-primary">
                Nenhum documento encontrado
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Tente ajustar os termos de busca ou filtros aplicados.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-5 rounded-full border border-ice/20 bg-ice/10 px-4 py-2 text-sm font-medium text-ice transition-all active:scale-95"
                >
                  Limpar filtros
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-6">
              {timelineGroups.map(([monthYear, docs], groupIndex) => (
                <div key={monthYear} className="space-y-3">
                  {/* Marcador da Linha do Tempo (Mês/Ano) */}
                  <div className="flex items-center gap-2 pt-2">
                    <Clock size={14} className="text-amber-400" />
                    <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-amber-400/90">
                      {monthYear}
                    </h2>
                    <div className="h-[1px] flex-1 bg-surface-border/40 ml-2"></div>
                  </div>

                  {/* Lista de documentos daquele mês */}
                  <div className="space-y-2.5">
                    {docs.map((doc: any, index: number) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
                        ref={(el) => {
                          cardRefs.current[doc.id!] = el;
                        }}
                      >
                        <DocumentCard
                          document={doc}
                          onFavoriteToggle={handleFavoriteToggle}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}

              <InfiniteScrollTrigger
                onLoadMore={loadMore}
                hasMore={hasMore}
                isLoading={isLoadingMore}
              />
            </div>
          )}
        </section>

        <ScrollToTop threshold={400} />
      </main>
    </PageTransition>
  );
}
