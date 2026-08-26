// app/saude/documentos/page.tsx
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
  Filter,
  X,
  ChevronRight,
  Paperclip,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePaginatedDocuments } from "@/hooks/usePaginatedDocuments";
import { usePersons } from "@/hooks/usePersons";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { Input } from "@/components/ui/Input";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { CATEGORIES, type CategoryId } from "@/lib/types";
import { ExportCardButton } from "@/components/ExportCardButton";
import { ScrollToTop } from "@/components/ScrollToTop";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  isReceitaVencidaSegura,
} from "@/lib/health-insights";
import { getDaysUntil } from "@/lib/health-utils";

type TabType = "receitas" | "prontuarios" | "exames";
type FiltroStatus = "todos" | "valida" | "vencida" | "proxima" | "renovada_historico";

interface GroupData {
  groupKey: string;
  groupName: string;
  documents: any[];
  count: number;
}

function useDebounce(value: string, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function DocumentsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { favorite } = useSafeDb();
  const persons = usePersons();
  const { medicamentos } = useMedicamentos();
  const { renovacoes } = useRenovacoes();

  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const [activeTab, setActiveTab] = useState<TabType>("receitas");
  
  const { activePersonId } = useActivePersonId();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(activePersonId);

  useEffect(() => {
    setSelectedPersonId(activePersonId);
  }, [activePersonId]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "all">("all");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
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

  const medicamentoMap = useMemo(() => {
    const map = new Map();
    (medicamentos || []).forEach((m) => map.set(m.id, m.nome));
    return map;
  }, [medicamentos]);

  const renovacoesPorMedicamento = useMemo(() => {
    const map = new Map();
    (renovacoes || []).forEach((r) => {
      if (!map.has(r.medicamento_id)) map.set(r.medicamento_id, []);
      map.get(r.medicamento_id).push(r);
    });
    return map;
  }, [renovacoes]);

  const filteredDocsBase = useMemo(() => {
    let result = (paginatedDocs || []).filter((doc: any) => {
      const pertencePerfil = !selectedPersonId || !doc.person_id || doc.person_id === selectedPersonId;
      return pertencePerfil && doc.category_id === "saude";
    });

    if (activeTab === "receitas") {
      result = result.filter((doc: any) => doc.type === "receita");
    } else if (activeTab === "prontuarios") {
      result = result.filter((doc: any) =>
        ["prontuario", "laudo", "encaminhamento", "cirurgia"].includes(doc.type)
      );
    } else if (activeTab === "exames") {
      result = result.filter((doc: any) => doc.type?.includes("exame"));
    }

    if (selectedMonth !== "all") {
      result = result.filter((doc: any) => {
        const dateStr =
          doc.metadata?.prescription_date || doc.metadata?.date || doc.created_at;
        if (!dateStr) return false;
        return dateStr.startsWith(selectedMonth);
      });
    }

    return result;
  }, [paginatedDocs, activeTab, selectedMonth, selectedPersonId]);

  const docsComAlertas = useMemo(() => {
    return filteredDocsBase.map((doc: any) => {
      const medId = doc.metadata?.medication_id;
      const medNameFromMap = medId ? medicamentoMap.get(medId) : null;
      const renovacoesDoMed: any[] = medId
        ? renovacoesPorMedicamento.get(medId) || []
        : [];

      const dataReceita =
        doc.metadata?.prescription_date || doc.metadata?.date || doc.created_at;
      
      const renovacaoRecent = renovacoesDoMed.some(
        (r: any) => r.data && r.data >= dataReceita
      );

      let alerta = null;
      if (doc.type === "receita" && medId && !renovacaoRecent) {
        const expDate = doc.metadata?.expiration_date || doc.metadata?.renewal_date;
        const vencida = isReceitaVencidaSegura(expDate);
        const dias = getDaysUntil(expDate);
        if (vencida) {
          alerta = { status: "vencida", label: "Vencida", color: "#EF4444" };
        } else if (dias !== null && dias <= 7) {
          alerta = {
            status: "proxima",
            label: "Próxima ao vencimento",
            color: "#F59E0B",
          };
        } else {
          alerta = { status: "valida", label: "Válida", color: "#10B981" };
        }
      } else if (doc.type === "receita" && medId && renovacaoRecent) {
        alerta = { status: "renovada_historico", label: "Renovada", color: "#38BDF8" };
      }

      const person = persons.find((p) => p.id === doc.person_id);
      const personColor = person?.color || "#6B7280";

      let resolvedMedName = medNameFromMap || doc.metadata?.medication;
      if (!resolvedMedName && doc.title) {
        const parts = doc.title.split("—");
        if (parts.length > 1) {
          resolvedMedName = parts[1].trim();
        } else {
          resolvedMedName = doc.title.replace(/receita/gi, "").trim();
        }
      }

      return {
        ...doc,
        resolvedMedName: resolvedMedName || "Geral",
        alerta,
        personColor,
        personName: person?.name || "Pessoa",
      };
    });
  }, [filteredDocsBase, medicamentoMap, renovacoesPorMedicamento, persons]);

  const filteredDocs = useMemo(() => {
    if (filtroStatus === "todos") return docsComAlertas;
    return docsComAlertas.filter((doc) => doc.alerta?.status === filtroStatus);
  }, [docsComAlertas, filtroStatus]);

  const sortedDocs = useMemo(() => {
    return [...filteredDocs].sort((a, b) => {
      const dateA = new Date(
        a.metadata?.prescription_date || a.metadata?.date || a.created_at || 0
      ).getTime();
      const dateB = new Date(
        b.metadata?.prescription_date || b.metadata?.date || b.created_at || 0
      ).getTime();
      return dateB - dateA;
    });
  }, [filteredDocs]);

  const groupedReceitas = useMemo((): GroupData[] => {
    if (activeTab !== "receitas") return [];

    const groups = new Map<string, GroupData>();

    for (const doc of sortedDocs) {
      const groupName = doc.resolvedMedName || "Outros Medicamentos";
      const groupKey = `med-${groupName.toLowerCase().replace(/\s+/g, '-')}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          groupKey,
          groupName,
          documents: [],
          count: 0,
        });
      }

      const group = groups.get(groupKey)!;
      group.documents.push(doc);
      group.count += 1;
    }

    return Array.from(groups.values());
  }, [sortedDocs, activeTab]);

  const timelineGroups = useMemo(() => {
    if (activeTab === "receitas") return [];
    const groups: { [key: string]: any[] } = {};

    for (const doc of sortedDocs) {
      const dateStr =
        doc.metadata?.prescription_date || doc.metadata?.date || doc.created_at || "";
      let monthYearKey = "Geral";

      if (dateStr && typeof dateStr === "string") {
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
  }, [sortedDocs, activeTab]);

  const toggleGroup = useCallback(
    (groupKey: string) => {
      setExpandedGroups((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(groupKey)) newSet.delete(groupKey);
        else newSet.add(groupKey);
        return newSet;
      });
      trigger("vibrate");
    },
    [trigger]
  );

  useEffect(() => {
    if (groupedReceitas.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(groupedReceitas.map((g) => g.groupKey)));
    }
  }, [groupedReceitas]);

  const hasActiveFilters =
    selectedPersonId !== null ||
    selectedCategory !== "all" ||
    selectedMonth !== "all" ||
    filtroStatus !== "todos";

  const getExportCards = () => {
    return sortedDocs.map((doc: any) => ({
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
    return <CardListSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-12">
        <header className="sticky top-0 z-30 border-b border-surface-border/40 bg-void/90 px-5 pt-4 pb-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400">
                  REGISTROS CLÍNICOS
                </p>
                <h1 className="font-display text-base font-semibold text-ink-primary truncate">
                  Acervo de Documentos
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {sortedDocs.length > 0 && (
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
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all active:scale-95 ${
                  hasActiveFilters || showFilters
                    ? "border-emerald-400 bg-emerald-400/12 text-emerald-400"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-surface-raised/80 p-1">
            <button
              onClick={() => {
                trigger("vibrate");
                setActiveTab("receitas");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                activeTab === "receitas"
                  ? "bg-surface text-ink-primary shadow-sm"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
            >
              <Pill size={13} className="text-amber-400" />
              Receitas
            </button>
            <button
              onClick={() => {
                trigger("vibrate");
                setActiveTab("prontuarios");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                activeTab === "prontuarios"
                  ? "bg-surface text-ink-primary shadow-sm"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
            >
              <FileText size={13} className="text-violet-400" />
              Prontuários
            </button>
            <button
              onClick={() => {
                trigger("vibrate");
                setActiveTab("exames");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                activeTab === "exames"
                  ? "bg-surface text-ink-primary shadow-sm"
                  : "text-ink-muted hover:text-ink-primary"
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
        </header>

        <section className="px-5 pt-4">
          {selectedMonth !== "all" && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-surface px-3.5 py-2 border border-surface-border/40 text-xs">
              <span className="text-ink-muted">
                Exibindo período:{" "}
                <strong className="text-ink-primary">
                  {formattedSelectedMonthLabel}
                </strong>
              </span>
              <button
                onClick={() => setSelectedMonth("all")}
                className="text-emerald-400 font-medium"
              >
                Mostrar todos
              </button>
            </div>
          )}

          {sortedDocs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-[24px] border border-surface-border/50 bg-surface px-6 py-12 text-center shadow-sm mt-2"
            >
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/15 bg-surface-raised text-emerald-400/70">
                <Search size={24} />
              </div>
              <h3 className="font-display text-base font-semibold text-ink-primary">
                Nenhum registro para este período
              </h3>
              <p className="mt-1 text-xs text-ink-muted max-w-xs">
                {hasActiveFilters
                  ? "Tente ajustar os filtros ou verificar outros períodos."
                  : "Não há documentos cadastrados."}
              </p>
            </motion.div>
          ) : (
            <div>
              {activeTab === "receitas" && (
                <div className="space-y-3.5">
                  {groupedReceitas.map((group) => {
                    const isExpanded = expandedGroups.has(group.groupKey);
                    return (
                      <div
                        key={group.groupKey}
                        className="rounded-[20px] border border-surface-border/50 bg-surface overflow-hidden shadow-sm"
                      >
                        <button
                          onClick={() => toggleGroup(group.groupKey)}
                          className="flex w-full items-center justify-between p-3.5 text-left transition-all hover:bg-surface-raised/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                              <Pill size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink-primary">
                                {group.groupName}
                              </p>
                              <p className="text-[11px] text-ink-muted">
                                {group.count} receita(s) no histórico
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-amber-400">
                            {isExpanded ? "Recolher" : "Expandir"}
                          </span>
                        </button>

                        {/* LISTA COMPACTA DOS FILHOS (ETIQUETA DE MÊS/DATA E DOSAGEM) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-3.5 pb-3.5 space-y-2 overflow-hidden"
                            >
                              {group.documents.map((doc: any) => {
                                const dataStr = doc.metadata?.prescription_date || doc.metadata?.date || doc.created_at;
                                let dataFormatada = "Data não informada";
                                let mesEtiqueta = "";
                                if (dataStr) {
                                  try {
                                    const parsed = parseISO(dataStr);
                                    dataFormatada = format(parsed, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                                    mesEtiqueta = format(parsed, "MMMM / yyyy", { locale: ptBR });
                                    mesEtiqueta = mesEtiqueta.charAt(0).toUpperCase() + mesEtiqueta.slice(1);
                                  } catch {
                                    dataFormatada = dataStr;
                                  }
                                }

                                return (
                                  <div
                                    key={doc.id}
                                    ref={(el) => {
                                      cardRefs.current[doc.id!] = el;
                                    }}
                                    onClick={() => {
                                      trigger("vibrate");
                                      router.push(`/detalhes?id=${doc.id}`);
                                    }}
                                    className="group flex items-center justify-between p-3 rounded-xl bg-surface-raised/60 border border-surface-border/40 hover:border-amber-400/40 transition-all cursor-pointer active:scale-[0.99]"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
                                        <FileText size={15} />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-xs font-bold text-ink-primary">
                                            {dataFormatada}
                                          </span>
                                          {mesEtiqueta && (
                                            <span className="rounded-md bg-surface px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400 border border-surface-border/50">
                                              {mesEtiqueta}
                                            </span>
                                          )}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-muted">
                                          {doc.metadata?.dosage && (
                                            <span>Dosagem: <strong className="text-ink-primary">{doc.metadata.dosage}</strong></span>
                                          )}
                                          {doc.attachments?.length > 0 && (
                                            <span className="flex items-center gap-1 text-ice">
                                              <Paperclip size={11} /> {doc.attachments.length} anexo(s)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {doc.alerta && (
                                        <span 
                                          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                          style={{ backgroundColor: `${doc.alerta.color}20`, color: doc.alerta.color }}
                                        >
                                          {doc.alerta.label}
                                        </span>
                                      )}
                                      <ChevronRight size={14} className="text-ink-muted group-hover:text-ink-primary transition-colors" />
                                    </div>
                                  </div>
                                );
                              })}
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
                        {docs.map((doc: any) => {
                          const dataStr = doc.metadata?.prescription_date || doc.metadata?.date || doc.created_at;
                          let dataFormatada = "";
                          if (dataStr) {
                            try {
                              dataFormatada = format(parseISO(dataStr), "dd 'de' MMMM", { locale: ptBR });
                            } catch {
                              dataFormatada = dataStr;
                            }
                          }

                          return (
                            <div
                              key={doc.id}
                              ref={(el) => {
                                cardRefs.current[doc.id!] = el;
                              }}
                              onClick={() => {
                                trigger("vibrate");
                                router.push(`/detalhes?id=${doc.id}`);
                              }}
                              className="group flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-surface-border/50 hover:border-violet-400/40 transition-all cursor-pointer active:scale-[0.99]"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                                  <FileText size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-ink-primary truncate">
                                    {doc.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-[11px] text-ink-muted mt-0.5">
                                    {dataFormatada && <span>{dataFormatada}</span>}
                                    {doc.attachments?.length > 0 && (
                                      <span className="flex items-center gap-1 text-ice">
                                        <Paperclip size={11} /> {doc.attachments.length} anexo(s)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight size={15} className="text-ink-muted group-hover:text-ink-primary transition-colors" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <InfiniteScrollTrigger
                onLoadMore={loadMore}
                hasMore={hasMore}
                isLoading={isLoadingMore}
              />
            </div>
          )}
        </section>

        <ScrollToTop threshold= {400} />
      </main>
    </PageTransition>
  );
}
