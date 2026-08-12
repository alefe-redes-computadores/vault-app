"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Calendar,
  SlidersHorizontal,
  Sparkles,
  Pill,
  Building2,
  Stethoscope,
  FolderHeart,
  ChevronRight,
  Filter,
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

function useDebounce(value: string, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const DOCUMENT_TYPES: { id: DocumentType; label: string }[] = [
  { id: "receita", label: "Receita" },
  { id: "prontuario", label: "Prontuário" },
  { id: "laudo", label: "Laudo" },
  { id: "encaminhamento", label: "Encaminhamento" },
  { id: "cirurgia", label: "Cirurgia" },
  { id: "exame_sangue", label: "Exame Sangue" },
  { id: "exame_imagem", label: "Exame Imagem" },
];

interface GroupedDocument {
  groupKey: string;
  groupType: 'medication' | 'hospital' | 'doctor' | 'other';
  groupIcon: any;
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

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "all">("all");
  const [selectedType, setSelectedType] = useState<DocumentType | "all">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "expiring" | "expired">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
    let result = paginatedDocs;

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
  }, [paginatedDocs, selectedType, dateFilter]);

  // Lógica de Agrupamento Automático (Pai/Filho) refinada
  const groupedDocuments = useMemo(() => {
    const groups: Map<string, GroupedDocument> = new Map();
    const saudeDocs = filteredDocs.filter((doc: any) => doc.category_id === 'saude');

    for (const doc of saudeDocs) {
      let groupKey = '';
      let groupType: 'medication' | 'hospital' | 'doctor' | 'other' = 'other';
      let groupIcon = FolderHeart;
      let groupName = 'Outros documentos';

      const medication = doc.metadata?.medication;
      if (medication) {
        groupKey = `med-${medication}`;
        groupType = 'medication';
        groupIcon = Pill;
        groupName = medication;
      } else if (doc.metadata?.hospital || doc.metadata?.institution) {
        const hospitalName = doc.metadata?.hospital || doc.metadata?.institution;
        groupKey = `hospital-${hospitalName}`;
        groupType = 'hospital';
        groupIcon = Building2;
        groupName = hospitalName;
      } else if (doc.metadata?.doctor) {
        groupKey = `doctor-${doc.metadata.doctor}`;
        groupType = 'doctor';
        groupIcon = Stethoscope;
        groupName = doc.metadata.doctor;
      } else {
        groupKey = 'other';
        groupType = 'other';
        groupIcon = FolderHeart;
        groupName = 'Geral / Outros';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          groupKey,
          groupType,
          groupIcon,
          groupName,
          documents: [],
          count: 0,
        });
      }

      groups.get(groupKey)!.documents.push(doc);
      groups.get(groupKey)!.count += 1;
    }

    // Ordenação inteligente interna dos documentos filhos por data mais recente
    for (const group of groups.values()) {
      group.documents.sort((a: any, b: any) => {
        const dateA = new Date(a.metadata?.prescription_date || a.metadata?.date || a.created_at || 0).getTime();
        const dateB = new Date(b.metadata?.prescription_date || b.metadata?.date || b.created_at || 0).getTime();
        return dateB - dateA;
      });
    }

    const order = { medication: 0, hospital: 1, doctor: 2, other: 3 };
    return Array.from(groups.values()).sort(
      (a, b) => order[a.groupType] - order[b.groupType]
    );
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

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
    trigger("vibrate");
  }, [trigger]);

  useEffect(() => {
    if (groupedDocuments.length > 0 && expandedGroups.size === 0) {
      const allKeys = groupedDocuments.map(g => g.groupKey);
      setExpandedGroups(new Set(allKeys));
    }
  }, [groupedDocuments]);

  const hasActiveFilters =
    selectedPersonId !== null ||
    selectedCategory !== "all" ||
    selectedType !== "all" ||
    dateFilter !== "all";

  const getExportCards = () => {
    return filteredDocs.map((doc: any) => ({
      ref: { current: cardRefs.current[doc.id!] },
      id: doc.id!,
    }));
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const saudeCount = filteredDocs.filter((d: any) => d.category_id === 'saude').length;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-6">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Acervo de Documentos
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                {saudeCount} documento{saudeCount !== 1 ? "s" : ""} na saúde
                {hasActiveFilters ? " filtrados" : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
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
              placeholder="Buscar por nome, medicamento ou médico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9 transition-all"
            />
          </div>

          {/* Chips de Acesso Rápido (Filtros de Tipo) */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => { trigger("vibrate"); setSelectedType("all"); }}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                selectedType === "all"
                  ? "border-ice bg-ice/12 text-ice"
                  : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
              }`}
            >
              Todos os Tipos
            </button>
            {DOCUMENT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => { trigger("vibrate"); setSelectedType(selectedType === t.id ? "all" : t.id); }}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
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
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        Todas
                      </button>
                      <button
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

        <section className="px-5 pt-5">
          {groupedDocuments.length === 0 ? (
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
                Tente ajustar os termos de busca ou limpar os filtros para visualizar o acervo completo.
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
            <div className="space-y-4">
              {groupedDocuments.map((group, index) => {
                const Icon = group.groupIcon;
                const isExpanded = expandedGroups.has(group.groupKey);

                return (
                  <motion.div
                    key={group.groupKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.3) }}
                    className="rounded-[22px] border border-surface-border/50 bg-surface overflow-hidden shadow-sm"
                  >
                    {/* Cabeçalho do Grupo (Pai) */}
                    <button
                      onClick={() => toggleGroup(group.groupKey)}
                      className="flex w-full items-center justify-between p-4 text-left transition-all hover:bg-surface-raised/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {group.groupName}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {group.count} documento{group.count !== 1 ? "s" : ""} vinculados
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-ice">
                          {isExpanded ? "Recolher" : "Expandir"}
                        </span>
                      </div>
                    </button>

                    {/* Conteúdo do Grupo (Filhos usando o próprio DocumentCard compacto) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2.5">
                            {group.documents.map((doc: any) => (
                              <div
                                key={doc.id}
                                ref={(el) => {
                                  cardRefs.current[doc.id!] = el;
                                }}
                              >
                                <DocumentCard
                                  document={doc}
                                  compact
                                  onFavoriteToggle={handleFavoriteToggle}
                                />
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

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
