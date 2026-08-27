"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Calendar,
  SlidersHorizontal,
  ArrowLeft,
  Pill,
  FileText,
  FlaskConical,
  ChevronRight,
  Paperclip,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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
import { ExportCardButton } from "@/components/ExportCardButton";
import { ScrollToTop } from "@/components/ScrollToTop";

import { type CategoryId } from "@/lib/types";
import {
  isReceitaVencidaSegura,
} from "@/lib/health-insights";
import { getDaysUntil } from "@/lib/health-utils";

type TabType = "receitas" | "prontuarios" | "exames";

type FiltroStatus =
  | "todos"
  | "valida"
  | "vencida"
  | "proxima"
  | "renovada_historico";

interface GroupData {
  groupKey: string;
  groupName: string;
  documents: HealthDocumentViewModel[];
  count: number;
}

interface HealthDocument {
  id?: string;
  person_id?: string | null;
  category_id?: string;
  type?: string;
  title?: string;
  created_at?: string;
  metadata?: {
    prescription_date?: string;
    date?: string;
    medication_id?: string;
    medication?: string;
    dosage?: string;
    expiration_date?: string;
    renewal_date?: string;
    [key: string]: unknown;
  };
  attachments?: Array<{
    type?: string;
    url?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface HealthDocumentViewModel extends HealthDocument {
  resolvedMedName: string;
  alerta: AlertData | null;
  personColor: string;
  personName: string;
}

interface AlertData {
  status: Exclude<FiltroStatus, "todos">;
  label: string;
  color: string;
}

function useDebounce(value: string, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function getDocumentDate(document: HealthDocument): string | null {
  return (
    document.metadata?.prescription_date ||
    document.metadata?.date ||
    document.created_at ||
    null
  );
}

function formatMonthYear(dateString: string): string {
  try {
    const parsed = parseISO(dateString);
    const value = format(parsed, "MMMM 'de' yyyy", {
      locale: ptBR,
    });

    return value.charAt(0).toUpperCase() + value.slice(1);
  } catch {
    return "Geral";
  }
}

function formatFullDate(dateString: string): string {
  try {
    return format(parseISO(dateString), "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    });
  } catch {
    return dateString;
  }
}

function formatShortDate(dateString: string): string {
  try {
    return format(parseISO(dateString), "dd 'de' MMMM", {
      locale: ptBR,
    });
  } catch {
    return dateString;
  }
}

function getMedicationName(
  document: HealthDocument,
  medicationMap: Map<string, string>
): string {
  const medicationId = document.metadata?.medication_id;

  const fromMap = medicationId
    ? medicationMap.get(medicationId)
    : undefined;

  if (fromMap) {
    return fromMap;
  }

  const fromMetadata = document.metadata?.medication;

  if (typeof fromMetadata === "string" && fromMetadata.trim()) {
    return fromMetadata.trim();
  }

  if (document.title) {
    const parts = document.title.split("—");

    if (parts.length > 1) {
      const extracted = parts.slice(1).join("—").trim();

      if (extracted) {
        return extracted;
      }
    }

    const fallback = document.title
      .replace(/receita/gi, "")
      .trim();

    if (fallback) {
      return fallback;
    }
  }

  return "Geral";
}

function getAlertData(
  document: HealthDocument,
  renovacoesPorMedicamento: Map<string, Array<{ data?: string }>>
): AlertData | null {
  if (document.type !== "receita") {
    return null;
  }

  const medicationId = document.metadata?.medication_id;

  if (!medicationId) {
    return null;
  }

  const dataReceita = getDocumentDate(document);

  if (!dataReceita) {
    return null;
  }

  const renovacoes =
    renovacoesPorMedicamento.get(medicationId) || [];

  const renovacaoRecent = renovacoes.some(
    (renovacao) =>
      Boolean(renovacao.data) &&
      renovacao.data! >= dataReceita
  );

  if (renovacaoRecent) {
    return {
      status: "renovada_historico",
      label: "Renovada",
      color: "#38BDF8",
    };
  }

  const expirationDate =
    document.metadata?.expiration_date ||
    document.metadata?.renewal_date;

  if (!expirationDate) {
    return null;
  }

  const vencida = isReceitaVencidaSegura(expirationDate);
  const dias = getDaysUntil(expirationDate);

  if (vencida) {
    return {
      status: "vencida",
      label: "Vencida",
      color: "#EF4444",
    };
  }

  if (dias !== null && dias <= 7) {
    return {
      status: "proxima",
      label: "Próxima ao vencimento",
      color: "#F59E0B",
    };
  }

  return {
    status: "valida",
    label: "Válida",
    color: "#10B981",
  };
}

export default function DocumentsPage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { favorite } = useSafeDb();

  const persons = usePersons();
  const { medicamentos } = useMedicamentos();
  const { renovacoes } = useRenovacoes();
  const { activePersonId } = useActivePersonId();

  const cardRefs = useRef<
    Record<string, HTMLDivElement | null>
  >({});

  const [activeTab, setActiveTab] =
    useState<TabType>("receitas");

  /*
   * IMPORTANTE:
   * A pessoa ativa é o perfil padrão.
   *
   * selectedPersonId pode ser alterado futuramente por um
   * seletor explícito, mas nunca devemos misturar pessoas
   * quando existe uma pessoa ativa.
   */
  const [selectedPersonId, setSelectedPersonId] =
    useState<string | null>(activePersonId || null);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedCategory, setSelectedCategory] =
    useState<CategoryId | "all">("all");

  const [filtroStatus, setFiltroStatus] =
    useState<FiltroStatus>("todos");

  const [selectedMonth, setSelectedMonth] =
    useState<string>(
      format(new Date(), "yyyy-MM")
    );

  const [showFilters, setShowFilters] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [expandedGroups, setExpandedGroups] =
    useState<Set<string>>(new Set());

  const debouncedSearch =
    useDebounce(searchQuery);

  /*
   * Sempre que o perfil ativo mudar, o acervo acompanha
   * automaticamente esse perfil.
   */
  useEffect(() => {
    setSelectedPersonId(activePersonId || null);
  }, [activePersonId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 350);

    return () => window.clearTimeout(timer);
  }, []);

  const {
    documents: paginatedDocs,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedDocuments({
    personId: selectedPersonId || undefined,
    categoryId:
      selectedCategory !== "all"
        ? selectedCategory
        : undefined,
    searchQuery: debouncedSearch,
  });

  const medicamentoMap = useMemo(() => {
    const map = new Map<string, string>();

    for (const medicamento of medicamentos || []) {
      if (medicamento.id) {
        map.set(
          medicamento.id,
          medicamento.nome
        );
      }
    }

    return map;
  }, [medicamentos]);

  const renovacoesPorMedicamento = useMemo(() => {
    const map = new Map<
      string,
      Array<{ data?: string }>
    >();

    for (const renovacao of renovacoes || []) {
      if (!renovacao.medicamento_id) {
        continue;
      }

      const existing =
        map.get(renovacao.medicamento_id) || [];

      existing.push(renovacao);

      map.set(
        renovacao.medicamento_id,
        existing
      );
    }

    return map;
  }, [renovacoes]);

  const filteredDocsBase = useMemo(() => {
    let result = (
      (paginatedDocs || []) as HealthDocument[]
    ).filter((document) => {
      /*
       * Segurança adicional:
       * mesmo que o hook retorne algum documento fora
       * do perfil, a página nunca o apresenta.
       */
      const pertenceAoPerfil =
        !selectedPersonId ||
        !document.person_id ||
        document.person_id === selectedPersonId;

      return (
        pertenceAoPerfil &&
        document.category_id === "saude"
      );
    });

    if (activeTab === "receitas") {
      result = result.filter(
        (document) =>
          document.type === "receita"
      );
    }

    if (activeTab === "prontuarios") {
      result = result.filter((document) =>
        [
          "prontuario",
          "laudo",
          "encaminhamento",
          "cirurgia",
        ].includes(document.type || "")
      );
    }

    if (activeTab === "exames") {
      result = result.filter((document) =>
        document.type?.includes("exame")
      );
    }

    if (selectedMonth !== "all") {
      result = result.filter((document) => {
        const dateString =
          getDocumentDate(document);

        return Boolean(
          dateString &&
          dateString.startsWith(selectedMonth)
        );
      });
    }

    return result;
  }, [
    paginatedDocs,
    activeTab,
    selectedMonth,
    selectedPersonId,
  ]);

  const docsComAlertas = useMemo(() => {
    return filteredDocsBase.map(
      (document): HealthDocumentViewModel => {
        const person = persons.find(
          (item) =>
            item.id === document.person_id
        );

        return {
          ...document,
          resolvedMedName:
            getMedicationName(
              document,
              medicamentoMap
            ),
          alerta: getAlertData(
            document,
            renovacoesPorMedicamento
          ),
          personColor:
            person?.color || "#6B7280",
          personName:
            person?.name || "Pessoa",
        };
      }
    );
  }, [
    filteredDocsBase,
    medicamentoMap,
    renovacoesPorMedicamento,
    persons,
  ]);

  const filteredDocs = useMemo(() => {
    if (filtroStatus === "todos") {
      return docsComAlertas;
    }

    return docsComAlertas.filter(
      (document) =>
        document.alerta?.status ===
        filtroStatus
    );
  }, [
    docsComAlertas,
    filtroStatus,
  ]);

  const sortedDocs = useMemo(() => {
    return [...filteredDocs].sort(
      (a, b) => {
        const dateA = new Date(
          getDocumentDate(a) || 0
        ).getTime();

        const dateB = new Date(
          getDocumentDate(b) || 0
        ).getTime();

        return dateB - dateA;
      }
    );
  }, [filteredDocs]);

  const groupedReceitas = useMemo((): GroupData[] => {
    if (activeTab !== "receitas") {
      return [];
    }

    const groups =
      new Map<string, GroupData>();

    for (const document of sortedDocs) {
      const groupName =
        document.resolvedMedName ||
        "Outros Medicamentos";

      const groupKey =
        `med-${groupName
          .toLowerCase()
          .replace(/\s+/g, "-")}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          groupKey,
          groupName,
          documents: [],
          count: 0,
        });
      }

      const group =
        groups.get(groupKey)!;

      group.documents.push(document);
      group.count += 1;
    }

    return Array.from(groups.values());
  }, [sortedDocs, activeTab]);

  const timelineGroups = useMemo(() => {
    if (activeTab === "receitas") {
      return [];
    }

    const groups =
      new Map<string, HealthDocumentViewModel[]>();

    for (const document of sortedDocs) {
      const dateString =
        getDocumentDate(document);

      const monthYear =
        dateString
          ? formatMonthYear(dateString)
          : "Geral";

      const existing =
        groups.get(monthYear) || [];

      existing.push(document);
      groups.set(monthYear, existing);
    }

    return Array.from(groups.entries());
  }, [sortedDocs, activeTab]);

  const toggleGroup = useCallback(
    (groupKey: string) => {
      setExpandedGroups((previous) => {
        const next = new Set(previous);

        if (next.has(groupKey)) {
          next.delete(groupKey);
        } else {
          next.add(groupKey);
        }

        return next;
      });

      trigger("vibrate");
    },
    [trigger]
  );

  useEffect(() => {
    if (
      groupedReceitas.length > 0 &&
      expandedGroups.size === 0
    ) {
      setExpandedGroups(
        new Set(
          groupedReceitas.map(
            (group) => group.groupKey
          )
        )
      );
    }
  }, [groupedReceitas, expandedGroups.size]);

  const hasActiveFilters =
    selectedPersonId !== null ||
    selectedCategory !== "all" ||
    selectedMonth !== "all" ||
    filtroStatus !== "todos";

  const getExportCards = useCallback(() => {
    return sortedDocs
      .filter((document) => Boolean(document.id))
      .map((document) => ({
        ref: {
          current:
            cardRefs.current[
              document.id!
            ],
        },
        id: document.id!,
      }));
  }, [sortedDocs]);

  const formattedSelectedMonthLabel =
    useMemo(() => {
      if (selectedMonth === "all") {
        return "Todos os meses";
      }

      try {
        const [year, month] =
          selectedMonth.split("-");

        const parsed = new Date(
          Number(year),
          Number(month) - 1,
          1
        );

        const value = format(
          parsed,
          "MMMM 'de' yyyy",
          { locale: ptBR }
        );

        return (
          value.charAt(0).toUpperCase() +
          value.slice(1)
        );
      } catch {
        return selectedMonth;
      }
    }, [selectedMonth]);

  const openDocument = useCallback(
    (id?: string) => {
      if (!id) return;

      trigger("vibrate");
      router.push(`/detalhes?id=${id}`);
    },
    [router, trigger]
  );

  if (isLoading) {
    return <CardListSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-12">
        <header className="sticky top-0 z-30 border-b border-surface-border/40 bg-void/90 px-5 pt-4 pb-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
                aria-label="Voltar"
              >
                <ArrowLeft
                  size={18}
                  className="text-ink-primary"
                />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400">
                  REGISTROS CLÍNICOS
                </p>

                <h1 className="truncate font-display text-base font-semibold text-ink-primary">
                  Acervo de Documentos
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
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
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setShowFilters(
                    (previous) => !previous
                  );
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all active:scale-95 ${
                  hasActiveFilters ||
                  showFilters
                    ? "border-emerald-400 bg-emerald-400/12 text-emerald-400"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
                aria-label="Abrir filtros"
                aria-pressed={showFilters}
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-surface-raised/80 p-1">
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setActiveTab("receitas");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                activeTab === "receitas"
                  ? "bg-surface text-ink-primary shadow-sm"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
              aria-pressed={
                activeTab === "receitas"
              }
            >
              <Pill
                size={13}
                className="text-amber-400"
              />
              Receitas
            </button>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setActiveTab("prontuarios");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                activeTab === "prontuarios"
                  ? "bg-surface text-ink-primary shadow-sm"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
              aria-pressed={
                activeTab === "prontuarios"
              }
            >
              <FileText
                size={13}
                className="text-violet-400"
              />
              Prontuários
            </button>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setActiveTab("exames");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                activeTab === "exames"
                  ? "bg-surface text-ink-primary shadow-sm"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
              aria-pressed={
                activeTab === "exames"
              }
            >
              <FlaskConical
                size={13}
                className="text-emerald-400"
              />
              Exames
            </button>
          </div>

          <div className="relative mt-3">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />

            <Input
              placeholder={`Pesquisar em ${activeTab}...`}
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              className="border-surface-border/50 bg-surface-raised pl-9 text-sm"
            />
          </div>
        </header>

        <section className="px-5 pt-4">
          {selectedMonth !== "all" && (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-surface-border/40 bg-surface px-3.5 py-2 text-xs">
              <span className="text-ink-muted">
                Exibindo período:{" "}
                <strong className="text-ink-primary">
                  {formattedSelectedMonthLabel}
                </strong>
              </span>

              <button
                type="button"
                onClick={() =>
                  setSelectedMonth("all")
                }
                className="font-medium text-emerald-400"
              >
                Mostrar todos
              </button>
            </div>
          )}

          {sortedDocs.length === 0 ? (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="mt-2 flex flex-col items-center justify-center rounded-[24px] border border-surface-border/50 bg-surface px-6 py-12 text-center shadow-sm"
            >
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/15 bg-surface-raised text-emerald-400/70">
                <Search size={24} />
              </div>

              <h3 className="font-display text-base font-semibold text-ink-primary">
                Nenhum registro para este período
              </h3>

              <p className="mt-1 max-w-xs text-xs text-ink-muted">
                {hasActiveFilters
                  ? "Tente ajustar os filtros ou verificar outros períodos."
                  : "Não há documentos cadastrados."}
              </p>
            </motion.div>
          ) : (
            <div>
              {activeTab === "receitas" && (
                <div className="space-y-3.5">
                  {groupedReceitas.map(
                    (group) => {
                      const isExpanded =
                        expandedGroups.has(
                          group.groupKey
                        );

                      return (
                        <div
                          key={group.groupKey}
                          className="overflow-hidden rounded-[20px] border border-surface-border/50 bg-surface shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              toggleGroup(
                                group.groupKey
                              )
                            }
                            className="flex w-full items-center justify-between p-3.5 text-left transition-all hover:bg-surface-raised/40"
                            aria-expanded={
                              isExpanded
                            }
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                                <Pill size={16} />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink-primary">
                                  {group.groupName}
                                </p>

                                <p className="text-[11px] text-ink-muted">
                                  {group.count}{" "}
                                  receita(s) no
                                  histórico
                                </p>
                              </div>
                            </div>

                            <span className="text-xs font-medium text-amber-400">
                              {isExpanded
                                ? "Recolher"
                                : "Expandir"}
                            </span>
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{
                                  opacity: 0,
                                  height: 0,
                                }}
                                animate={{
                                  opacity: 1,
                                  height: "auto",
                                }}
                                exit={{
                                  opacity: 0,
                                  height: 0,
                                }}
                                className="space-y-2 overflow-hidden px-3.5 pb-3.5"
                              >
                                {group.documents.map(
                                  (document) => {
                                    const dateString =
                                      getDocumentDate(
                                        document
                                      );

                                    const dataFormatada =
                                      dateString
                                        ? formatFullDate(
                                            dateString
                                          )
                                        : "Data não informada";

                                    const mesEtiqueta =
                                      dateString
                                        ? formatMonthYear(
                                            dateString
                                          )
                                        : "";

                                    return (
                                      <div
                                        key={
                                          document.id
                                        }
                                        ref={(element) => {
                                          if (
                                            document.id
                                          ) {
                                            cardRefs.current[
                                              document.id
                                            ] =
                                              element;
                                          }
                                        }}
                                        onClick={() =>
                                          openDocument(
                                            document.id
                                          )
                                        }
                                        className="group flex cursor-pointer items-center justify-between rounded-xl border border-surface-border/40 bg-surface-raised/60 p-3 transition-all hover:border-amber-400/40 active:scale-[0.99]"
                                      >
                                        <div className="flex min-w-0 items-center gap-3">
                                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
                                            <FileText
                                              size={15}
                                            />
                                          </div>

                                          <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="text-xs font-bold text-ink-primary">
                                                {
                                                  dataFormatada
                                                }
                                              </span>

                                              {mesEtiqueta && (
                                                <span className="rounded-md border border-surface-border/50 bg-surface px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-400">
                                                  {
                                                    mesEtiqueta
                                                  }
                                                </span>
                                              )}
                                            </div>

                                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-muted">
                                              {document
                                                .metadata
                                                ?.dosage && (
                                                <span>
                                                  Dosagem:{" "}
                                                  <strong className="text-ink-primary">
                                                    {
                                                      document
                                                        .metadata
                                                        .dosage
                                                    }
                                                  </strong>
                                                </span>
                                              )}

                                              {document
                                                .attachments
                                                ?.length ? (
                                                <span className="flex items-center gap-1 text-ice">
                                                  <Paperclip
                                                    size={
                                                      11
                                                    }
                                                  />
                                                  {
                                                    document
                                                      .attachments
                                                      .length
                                                  }{" "}
                                                  anexo(s)
                                                </span>
                                              ) : null}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                          {document.alerta && (
                                            <span
                                              className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                                              style={{
                                                backgroundColor: `${document.alerta.color}20`,
                                                color:
                                                  document
                                                    .alerta
                                                    .color,
                                              }}
                                            >
                                              {
                                                document
                                                  .alerta
                                                  .label
                                              }
                                            </span>
                                          )}

                                          <ChevronRight
                                            size={14}
                                            className="text-ink-muted transition-colors group-hover:text-ink-primary"
                                          />
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

              {activeTab !== "receitas" && (
                <div className="space-y-5">
                  {timelineGroups.map(
                    ([monthYear, documents]) => (
                      <div
                        key={monthYear}
                        className="space-y-2.5"
                      >
                        <div className="flex items-center gap-2 pt-1">
                          <Calendar
                            size={13}
                            className="text-violet-400"
                          />

                          <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-violet-400/90">
                            {monthYear}
                          </h2>

                          <div className="ml-2 h-px flex-1 bg-surface-border/40" />
                        </div>

                        <div className="space-y-2">
                          {documents.map(
                            (document) => {
                              const dateString =
                                getDocumentDate(
                                  document
                                );

                              const dataFormatada =
                                dateString
                                  ? formatShortDate(
                                      dateString
                                    )
                                  : "";

                              return (
                                <div
                                  key={
                                    document.id
                                  }
                                  ref={(element) => {
                                    if (
                                      document.id
                                    ) {
                                      cardRefs.current[
                                        document.id
                                      ] =
                                        element;
                                    }
                                  }}
                                  onClick={() =>
                                    openDocument(
                                      document.id
                                    )
                                  }
                                  className="group flex cursor-pointer items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 transition-all hover:border-violet-400/40 active:scale-[0.99]"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                                      <FileText
                                        size={16}
                                      />
                                    </div>

                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-semibold text-ink-primary">
                                        {
                                          document.title
                                        }
                                      </p>

                                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-muted">
                                        {dataFormatada && (
                                          <span>
                                            {
                                              dataFormatada
                                            }
                                          </span>
                                        )}

                                        {document
                                          .attachments
                                          ?.length ? (
                                          <span className="flex items-center gap-1 text-ice">
                                            <Paperclip
                                              size={
                                                11
                                              }
                                            />
                                            {
                                              document
                                                .attachments
                                                .length
                                            }{" "}
                                            anexo(s)
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>

                                  <ChevronRight
                                    size={15}
                                    className="text-ink-muted transition-colors group-hover:text-ink-primary"
                                  />
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )
                  )}
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

        <ScrollToTop threshold={400} />
      </main>
    </PageTransition>
  );
}