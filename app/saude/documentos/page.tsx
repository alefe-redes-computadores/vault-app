"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Calendar,
  SlidersHorizontal,
  ArrowLeft,
  Pill,
  FileText,
  FlaskConical,
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

type TabType = "receitas" | "prontuarios" | "exames";

// ✅ Interface explícita para os grupos
interface GroupData {
  groupKey: string;
  groupName: string;
  documents: any[];
  count: number;
}

export default function DocumentsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { favorite } = useSafeDb();
  const persons = usePersons();

  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const [activeTab, setActiveTab] = useState<TabType>("receitas");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "all">("all");

  const currentMonthDefault = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthDefault);

  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const {
    documents: paginatedDocs,
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

    if (activeTab === "receitas") {
      result = result.filter((doc: any) => doc.type === 'receita');
    } else if (activeTab === "prontuarios") {
      result = result.filter((doc: any) => ['prontuario', 'laudo', 'encaminhamento', 'cirurgia'].includes(doc.type));
    } else if (activeTab === "exames") {
      result = result.filter((doc: any) => doc.type?.includes('exame'));
    }

    if (selectedMonth !== "all") {
      result = result.filter((doc: any) => {
        const dateStr = doc.metadata?.prescription_date || doc.metadata?.date || doc.created_at;
        if (!dateStr) return false;
        return dateStr.startsWith(selectedMonth);
      });
    }

    return result.sort((a: any, b: any) => {
      const dateA = new Date(a.metadata?.prescription_date || a.metadata?.date || a.created_at || 0).getTime();
      const dateB = new Date(b.metadata?.prescription_date || b.metadata?.date || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [paginatedDocs, activeTab, selectedMonth]);

  // ✅ CORRIGIDO: Tipagem explícita e uso de tipos
  const groupedReceitas = useMemo((): GroupData[] => {
    if (activeTab !== "receitas") return [];

    const groups = new Map<string, GroupData>();

    for (const doc of filteredDocs) {
      const medName = doc.metadata?.medication || "Medicamento Geral";
      const groupKey = `med-${medName}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          groupKey,
          groupName: String(medName), // ✅ Força a ser string
          documents: [],
          count: 0,
        });
      }

      const group = groups.get(groupKey)!;
      group.documents.push(doc);
      group.count += 1;
    }

    return Array.from(groups.values());
  }, [filteredDocs, activeTab]);

  const timelineGroups = useMemo(() => {
    if (activeTab === "receitas") return [];
    const groups: { [key: string]: any[] } = {};

    for (const doc of filteredDocs) {
      const dateStr = doc.metadata?.prescription_date || doc.metadata?.date || doc.created_at;
      let monthYearKey = "Geral";
      if (dateStr) {
        try {
          const parsed = parseISO(dateStr);
          monthYearKey = format(parsed, "MMMM 'de' yyyy", { locale: ptBR });
          monthYearKey = monthYearKey.charAt(0).toUpperCase() + monthYearKey.slice(1);
        } catch {
          monthYearKey = "Geral";
        }
      }
      if (!groups[monthYearKey]) groups[monthYearKey] = [];
      groups[monthYearKey].push(doc);
    }
    return Object.entries(groups);
  }, [filteredDocs, activeTab]);

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
    setSelectedMonth("all");
    setSelectedPersonId(null);
    trigger("vibrate");
  }, [trigger]);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) newSet.delete(groupKey);
      else newSet.add(groupKey);
      return newSet;
    });
    trigger("vibrate");
  }, [trigger]);

  useEffect(() => {
    if (groupedReceitas.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(groupedReceitas.map(g => g.groupKey)));
    }
  }, [groupedReceitas]);

  const hasActiveFilters = selectedPersonId !== null || selectedCategory !== "all" || selectedMonth !== "all";

  const getExportCards = () => {
    return filteredDocs.map((doc: any) => ({
      ref: { current: cardRefs.current[doc.id!] },
      id: doc.id!,
    }));
  };

  const formattedSelectedMonthLabel = useMemo(() => {
    if (selectedMonth === "all") return "Todos os meses";
    try {
      const [year, month] = selectedMonth.split("-");
      const parsed = new Date(Number(year), Number(month) - 1, 1);
      const str = format(parsed, "MMMM 'de' yyyy", { locale: ptBR });
      return str.charAt(0).toUpperCase() + str.slice(1);
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-12">
        <header className="sticky top-0 z-30 border-b border-surface-border/40 bg-void/90 px-5 pt-4 pb-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => { trigger("vibrate"); router.back(); }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ice/90">
                  Vault
                </p>
                <h1 className="font-display text-base font-semibold text-ink-primary truncate">
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
                onClick={() => { trigger("vibrate"); setShowFilters((prev) => !prev); }}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all active:scale-95 ${
                  hasActiveFilters || showFilters
                    ? "border-ice bg-ice/12 text-ice"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-surface-raised/80 p-1">
            <button
              onClick={() => { trigger("vibrate"); setActiveTab("receitas"); }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                activeTab === "receitas" ? "bg-surface text-ink-primary shadow-sm" : "text-ink-muted hover:text-ink-primary"
              }`}
            >
              <Pill size={13} className="text-amber-400" />
              Receitas
            </button>
            <button
              onClick={() => { trigger("vibrate"); setActiveTab("prontuarios"); }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                activeTab === "prontuarios" ? "bg-surface text-ink-primary shadow-sm" : "text-ink-muted hover:text-ink-primary"
              }`}
            >
              <FileText size={13} className="text-violet-400" />
              Prontuários
            </button>
            <button
              onClick={() => { trigger("vibrate"); setActiveTab("exames"); }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                activeTab === "exames" ? "bg-surface text-ink-primary shadow-sm" : "text-ink-muted hover:text-ink-primary"
              }`}
            >
              <FlaskConical size={13} className="text-emerald-400" />
              Exames
            </button>
          </div>

          <div className="relative mt-3">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder={`Pesquisar em ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9 text-sm"
            />
          </div>

          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3 rounded-2xl border border-surface-border/50 bg-surface p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-ink-faint font-medium">Filtrar por Período (Mês)</span>
                    {selectedMonth !== "all" && (
                      <button 
                        onClick={() => setSelectedMonth("all")} 
                        className="text-[11px] text-ice hover:underline"
                      >
                        Ver todos os meses
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={selectedMonth === "all" ? "" : selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value || "all")}
                      className="w-full rounded-xl border border-surface-border/50 bg-surface-raised px-3 py-2 text-xs text-ink-primary outline-none"
                    />
                    <button
                      onClick={() => setSelectedMonth(currentMonthDefault)}
                      className="whitespace-nowrap rounded-xl border border-surface-border/50 bg-surface-raised px-3 py-2 text-xs text-ink-muted hover:text-ink-primary"
                    >
                      Mês Atual
                    </button>
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full rounded-xl border border-ice/20 bg-ice/10 py-2 text-xs font-medium text-ice transition-all active:scale-95"
                    >
                      Limpar todos os filtros
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <section className="px-5 pt-4">
          {selectedMonth !== "all" && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-surface px-3.5 py-2 border border-surface-border/40 text-xs">
              <span className="text-ink-muted">Exibindo período: <strong className="text-ink-primary">{formattedSelectedMonthLabel}</strong></span>
              <button onClick={() => setSelectedMonth("all")} className="text-ice font-medium">Mostrar todos</button>
            </div>
          )}

          {filteredDocs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-[24px] border border-surface-border/50 bg-surface px-6 py-12 text-center shadow-sm mt-2"
            >
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-ice/15 bg-surface-raised text-ice/70">
                <Search size={24} />
              </div>
              <h3 className="font-display text-base font-semibold text-ink-primary">Nenhum registro para este período</h3>
              <p className="mt-1 text-xs text-ink-muted max-w-xs">
                Não há documentos em {formattedSelectedMonthLabel}. Tente alterar o mês no botão de filtros acima.
              </p>
              {selectedMonth !== "all" && (
                <button
                  onClick={() => setSelectedMonth("all")}
                  className="mt-4 rounded-full border border-ice/20 bg-ice/10 px-4 py-2 text-xs font-medium text-ice active:scale-95"
                >
                  Ver todos os meses
                </button>
              )}
            </motion.div>
          ) : (
            <div>
              {activeTab === "receitas" && (
                <div className="space-y-3.5">
                  {groupedReceitas.map((group) => {
                    const isExpanded = expandedGroups.has(group.groupKey);
                    return (
                      <div key={group.groupKey} className="rounded-[20px] border border-surface-border/50 bg-surface overflow-hidden shadow-sm">
                        <button
                          onClick={() => toggleGroup(group.groupKey)}
                          className="flex w-full items-center justify-between p-3.5 text-left transition-all hover:bg-surface-raised/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                              <Pill size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink-primary">{group.groupName}</p>
                              <p className="text-[11px] text-ink-muted">{group.count} receita(s) no período</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-amber-400">
                            {isExpanded ? "Recolher" : "Expandir"}
                          </span>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-3.5 pb-3.5 space-y-2 overflow-hidden"
                            >
                              {group.documents.map((doc: any) => (
                                <div key={doc.id} ref={(el) => { cardRefs.current[doc.id!] = el; }}>
                                  <DocumentCard document={doc} compact onFavoriteToggle={handleFavoriteToggle} />
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab !== "receitas" && (
                <div className="space-y-5">
                  {timelineGroups.map(([monthYear, docs]) => (
                    <div key={monthYear} className="space-y-2.5">
                      <div className="flex items-center gap-2 pt-1">
                        <Calendar size={13} className="text-violet-400" />
                        <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-violet-400/90">
                          {monthYear}
                        </h2>
                        <div className="h-[1px] flex-1 bg-surface-border/40 ml-2"></div>
                      </div>

                      <div className="space-y-2">
                        {docs.map((doc: any) => (
                          <div key={doc.id} ref={(el) => { cardRefs.current[doc.id!] = el; }}>
                            <DocumentCard document={doc} onFavoriteToggle={handleFavoriteToggle} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <InfiniteScrollTrigger onLoadMore={loadMore} hasMore={hasMore} isLoading={isLoadingMore} />
            </div>
          )}
        </section>

        <ScrollToTop threshold={400} />
      </main>
    </PageTransition>
  );
}