// app/documentos/page.tsx
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
  Images,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { usePaginatedDocuments } from "@/hooks/usePaginatedDocuments";
import { usePersons } from "@/hooks/usePersons";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useHapticFeedback } from "@/lib/haptics";
import { useActivePersonId } from "@/hooks/useActivePersonId";

import { DocumentCard } from "@/components/DocumentCard";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { Input } from "@/components/ui/Input";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { ExportCardButton } from "@/components/ExportCardButton";
import { ScrollToTop } from "@/components/ScrollToTop";
import { HealthDocsBanner } from "@/components/HealthDocsBanner";

import {
  CATEGORIES,
  type CategoryId,
  type Document,
  type DocumentType,
  type Person,
} from "@/lib/types";

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

// ============================================================
// TIPOS DE DOCUMENTOS DO COFRE PESSOAL
// Saúde fica separada do Cofre Pessoal.
// ============================================================

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
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
    },
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

  // ============================================================
  // ESTADO DOS FILTROS
  // ============================================================

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(
    activePersonId || null
  );

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<
    CategoryId | "all"
  >("all");

  const [selectedType, setSelectedType] = useState<DocumentType | "all">(
    "all"
  );

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const [showFilters, setShowFilters] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [isLoading, setIsLoading] = useState(true);

  // Guarda se o usuário realmente escolheu uma pessoa nesta tela.
  //
  // Isso evita considerar automaticamente a pessoa ativa global
  // como um "filtro ativo" visual.
  const [personFilterManuallySelected, setPersonFilterManuallySelected] =
    useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // ============================================================
  // LOADING INICIAL
  // ============================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 420);

    return () => clearTimeout(timer);
  }, []);

  // ============================================================
  // SINCRONIZAÇÃO COM A PESSOA ATIVA
  //
  // Quando a pessoa ativa global muda, a página acompanha.
  // ============================================================

  useEffect(() => {
    setSelectedPersonId(activePersonId || null);
    setPersonFilterManuallySelected(false);
  }, [activePersonId]);

  // ============================================================
  // DOCUMENTOS PAGINADOS
  // ============================================================

  const {
    documents: paginatedDocs,
    totalCount,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedDocuments({
    personId: selectedPersonId || undefined,
    categoryId:
      selectedCategory !== "all" ? selectedCategory : undefined,
    searchQuery: debouncedSearch,
    excludeCategories: ["saude"],
  });

  // ============================================================
  // FILTROS LOCAIS
  //
  // Tipo e validade são aplicados sobre os documentos já carregados.
  // ============================================================

  const filteredDocs = useMemo<Document[]>(() => {
    let result = paginatedDocs as Document[];

    // ----------------------------------------------------------
    // Tipo
    // ----------------------------------------------------------

    if (selectedType !== "all") {
      result = result.filter((doc) => doc.type === selectedType);
    }

    // ----------------------------------------------------------
    // Validade
    // ----------------------------------------------------------

    if (dateFilter !== "all") {
      const now = new Date();

      result = result.filter((doc) => {
        const metadata = doc.metadata as
          | {
              expiry_date?: string | Date;
              renewal_date?: string | Date;
              validade?: string | Date;
            }
          | undefined;

        const expiry =
          metadata?.expiry_date ||
          metadata?.renewal_date ||
          metadata?.validade;

        if (!expiry) {
          return false;
        }

        const expiryDate = new Date(expiry);

        if (Number.isNaN(expiryDate.getTime())) {
          return false;
        }

        // ------------------------------------------------------
        // Vencidos
        // ------------------------------------------------------

        if (dateFilter === "expired") {
          return expiryDate < now;
        }

        // ------------------------------------------------------
        // Vencendo nos próximos 7 dias
        // ------------------------------------------------------

        const sevenDaysFromNow = new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000
        );

        return expiryDate > now && expiryDate <= sevenDaysFromNow;
      });
    }

    return result;
  }, [paginatedDocs, selectedType, dateFilter]);

  // ============================================================
  // FAVORITO
  // ============================================================

  const handleFavoriteToggle = useCallback(
    async (id: string) => {
      await favorite(id);
      trigger("vibrate");
    },
    [favorite, trigger]
  );

  // ============================================================
  // LIMPAR FILTROS
  // ============================================================

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedType("all");
    setDateFilter("all");

    // Retorna para a pessoa ativa global.
    setSelectedPersonId(activePersonId || null);

    setPersonFilterManuallySelected(false);

    trigger("vibrate");
  }, [trigger, activePersonId]);

  // ============================================================
  // ESTADO DOS FILTROS
  // ============================================================

  const hasActiveFilters =
    personFilterManuallySelected ||
    selectedCategory !== "all" ||
    selectedType !== "all" ||
    dateFilter !== "all";

  const hasSearch = searchQuery.trim().length > 0;

  // ============================================================
  // EXPORTAÇÃO
  // ============================================================

  const getExportCards = useCallback(() => {
    return filteredDocs
      .filter((doc) => Boolean(doc.id))
      .map((doc) => ({
        ref: {
          current: cardRefs.current[doc.id!],
        },
        id: doc.id!,
      }));
  }, [filteredDocs]);

  // ============================================================
  // CATEGORIAS DO COFRE
  //
  // Saúde continua fora desta página.
  // ============================================================

  const vaultCategories = useMemo(() => {
    return Object.values(CATEGORIES).filter(
      (category) => category.id !== "saude"
    );
  }, []);

  // ============================================================
  // CONTAGEM EXIBIDA
  //
  // Quando não existem filtros locais, podemos utilizar o total
  // informado pela paginação.
  //
  // Quando existem filtros locais, usamos a quantidade efetivamente
  // filtrada que já foi carregada.
  // ============================================================

  const displayedCount =
    selectedType === "all" && dateFilter === "all"
      ? totalCount
      : filteredDocs.length;

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return <CardListSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl header-safe-top">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                COFRE PESSOAL
              </h1>

              <p className="mt-1 text-sm text-ink-muted">
                {displayedCount} documento
                {displayedCount !== 1 ? "s" : ""}
                {hasActiveFilters ? " filtrados" : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* ==================================================
                  GALERIA
              ================================================== */}

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

              {/* ==================================================
                  LISTA / GRID
              ================================================== */}

              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");

                  setViewMode((prev) =>
                    prev === "list" ? "grid" : "list"
                  );
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-all active:scale-95 hover:text-ink-primary"
                aria-label="Alternar visualização"
              >
                {viewMode === "list" ? (
                  <Grid3X3 size={18} />
                ) : (
                  <LayoutList size={18} />
                )}
              </button>

              {/* ==================================================
                  EXPORTAR
              ================================================== */}

              {filteredDocs.length > 0 && (
                <ExportCardButton
                  cards={getExportCards()}
                  title="Meus Documentos"
                  variant="secondary"
                  size="sm"
                  label="Exportar"
                />
              )}

              {/* ==================================================
                  FILTROS
              ================================================== */}

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

          {/* ======================================================
              BUSCA
          ====================================================== */}

          <div className="relative mt-4">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />

            <Input
              placeholder="Buscar documentos, números ou notas..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              className="border-surface-border/50 bg-surface-raised pl-9 transition-all"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-ink-muted transition-colors hover:text-ink-primary"
                aria-label="Limpar busca"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* ======================================================
              INDICADORES DE FILTRO
          ====================================================== */}

          {(hasActiveFilters || hasSearch) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-ice/20 bg-ice/10 px-3 py-1.5 text-xs font-medium text-ice">
                <Sparkles size={12} />

                {hasSearch && !hasActiveFilters
                  ? "Busca ativa"
                  : "Filtros ativos"}
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

          {/* ======================================================
              PAINEL DE FILTROS
          ====================================================== */}

          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                initial={{
                  opacity: 0,
                  height: 0,
                  y: -4,
                }}
                animate={{
                  opacity: 1,
                  height: "auto",
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                  y: -4,
                }}
                transition={{
                  duration: 0.24,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-4 rounded-[26px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm">
                  {/* ==================================================
                      PESSOA
                  ================================================== */}

                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-ink-faint">
                      Pessoa
                    </label>

                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPersonId(null);
                          setPersonFilterManuallySelected(true);
                        }}
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
                          onClick={() => {
                            if (!person.id) return;

                            setSelectedPersonId(person.id);
                            setPersonFilterManuallySelected(true);
                          }}
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

                  {/* ==================================================
                      CATEGORIA
                  ================================================== */}

                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-ink-faint">
                      Categoria
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCategory("all")
                        }
                        className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                          selectedCategory === "all"
                            ? "border-ice bg-ice/12 text-ice"
                            : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        Todas
                      </button>

                      {vaultCategories.map((category) => (
                        <button
                          type="button"
                          key={category.id}
                          onClick={() =>
                            setSelectedCategory(category.id)
                          }
                          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                            selectedCategory === category.id
                              ? "border-ice bg-ice/12 text-ice"
                              : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: category.color,
                            }}
                          />

                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ==================================================
                      TIPO
                  ================================================== */}

                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-ink-faint">
                      Tipo
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedType("all")
                        }
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
                          onClick={() =>
                            setSelectedType(type.id)
                          }
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

                  {/* ==================================================
                      VALIDADE
                  ================================================== */}

                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-ink-faint">
                      Validade
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDateFilter("all")
                        }
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
                        onClick={() =>
                          setDateFilter("expiring")
                        }
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
                        onClick={() =>
                          setDateFilter("expired")
                        }
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

        {/* ========================================================
            BANNER DE SAÚDE
        ======================================================== */}

        <HealthDocsBanner />

        {/* ========================================================
            CONTEÚDO
        ======================================================== */}

        <section className="px-5 pt-5">
          {filteredDocs.length === 0 ? (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.24,
              }}
              className="flex flex-col items-center justify-center rounded-[30px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="glow-ice mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-ice/15 bg-surface-raised">
                <Search
                  size={28}
                  className="text-ice/60"
                />
              </div>

              <h3 className="font-display text-lg font-semibold text-ink-primary">
                Nenhum documento encontrado
              </h3>

              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Seus documentos pessoais, de empresa e outros
                aparecerão aqui.
              </p>
            </motion.div>
          ) : viewMode === "list" ? (
            /* ======================================================
               LISTA
            ====================================================== */

            <InfiniteScrollTrigger
              onLoadMore={loadMore}
              hasMore={hasMore}
              isLoading={isLoadingMore}
            >
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {filteredDocs.map((doc) => (
                  <motion.div
                    key={doc.id}
                    variants={cardVariants}
                    ref={(element) => {
                      if (doc.id) {
                        cardRefs.current[doc.id] =
                          element;
                      }
                    }}
                  >
                    <DocumentCard
                      document={doc}
                      onFavoriteToggle={
                        handleFavoriteToggle
                      }
                    />
                  </motion.div>
                ))}
              </motion.div>
            </InfiniteScrollTrigger>
          ) : (
            /* ======================================================
               GRID
               Também utiliza InfiniteScrollTrigger.
            ====================================================== */

            <InfiniteScrollTrigger
              onLoadMore={loadMore}
              hasMore={hasMore}
              isLoading={isLoadingMore}
            >
              <div className="grid grid-cols-2 gap-3">
                {filteredDocs.map((doc) => {
                  const firstAttachment =
                    doc.attachments?.[0];

                  return (
                    <motion.div
                      key={doc.id}
                      variants={cardVariants}
                      initial="hidden"
                      animate="show"
                      ref={(element) => {
                        if (doc.id) {
                          cardRefs.current[doc.id] =
                            element;
                        }
                      }}
                      onClick={() => {
                        if (!doc.id) return;

                        trigger("vibrate");
                        router.push(
                          `/detalhes?id=${doc.id}`
                        );
                      }}
                      className="group relative cursor-pointer overflow-hidden rounded-[22px] border border-surface-border/50 bg-surface p-3 shadow-sm transition-all hover:border-ice/30 active:scale-[0.98]"
                    >
                      <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-surface-raised">
                        {firstAttachment?.type ===
                        "image" ? (
                          <img
                            src={firstAttachment.url}
                            alt={doc.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <FileText
                            size={32}
                            className="text-ice/50"
                          />
                        )}
                      </div>

                      <div className="mt-2.5 min-w-0">
                        <p className="truncate text-xs font-semibold text-ink-primary">
                          {doc.title}
                        </p>

                        <p className="text-[10px] capitalize text-ink-muted">
                          {doc.type.replace(
                            "_",
                            " "
                          )}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </InfiniteScrollTrigger>
          )}
        </section>

        {/* ========================================================
            VOLTAR AO TOPO
        ======================================================== */}

        <ScrollToTop threshold={400} />
      </main>
    </PageTransition>
  );
}