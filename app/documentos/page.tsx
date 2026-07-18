"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, X, Calendar, FileText, ChevronDown } from "lucide-react";
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

// Lista de tipos de documento para filtro
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

  // Refs para capturar os cards
  const cardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(
    persons[0]?.id || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "all">("all");
  const [selectedType, setSelectedType] = useState<DocumentType | "all">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "expiring" | "expired">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const documents = useDocuments(selectedPersonId || undefined);

  // Aplica todos os filtros
  const filteredDocs = useMemo(() => {
    let result = documents;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((doc) => doc.category_id === selectedCategory);
    }

    if (selectedType !== "all") {
      result = result.filter((doc) => doc.type === selectedType);
    }

    if (dateFilter === "expiring") {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      result = result.filter((doc) => {
        const expiry = doc.metadata?.expiry_date || doc.metadata?.renewal_date;
        if (!expiry) return false;
        const expiryDate = new Date(expiry);
        return expiryDate > now && expiryDate <= sevenDaysFromNow;
      });
    } else if (dateFilter === "expired") {
      const now = new Date();
      result = result.filter((doc) => {
        const expiry = doc.metadata?.expiry_date || doc.metadata?.renewal_date;
        if (!expiry) return false;
        return new Date(expiry) < now;
      });
    }

    return result;
  }, [documents, searchQuery, selectedCategory, selectedType, dateFilter]);

  const handleFavoriteToggle = async (id: number) => {
    await favorite(id);
    trigger("vibrate");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedType("all");
    setDateFilter("all");
    trigger("vibrate");
  };

  const hasActiveFilters = selectedCategory !== "all" || selectedType !== "all" || dateFilter !== "all";

  // Monta lista de refs para exportação
  const getExportCards = () => {
    return filteredDocs.map((doc) => ({
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
        <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-xl font-semibold text-ink-primary">
              Todos os documentos
            </h1>
            <div className="flex items-center gap-2">
              <ExportCardButton
                cards={getExportCards()}
                title="Meus Documentos"
                variant="secondary"
                size="sm"
                label="📄 Exportar"
              />
              <button
                onClick={() => {
                  trigger("vibrate");
                  setShowFilters(!showFilters);
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                  hasActiveFilters ? "border-ice bg-ice/10 text-ice" : "border-surface-border bg-surface-raised text-ink-muted"
                } active:scale-[0.98] transition-all`}
              >
                <Filter size={18} />
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors"
                >
                  <X size={14} />
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <Input
              placeholder="Buscar documentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {showFilters && (
            <div className="mt-4 p-4 rounded-xl bg-surface-raised border border-surface-border space-y-4 animate-in fade-in slide-in-from-top duration-200">
              <div>
                <label className="block text-xs text-ink-muted mb-1.5">Pessoa</label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => {
                      trigger("vibrate");
                      setSelectedPersonId(null);
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-[0.98] ${
                      selectedPersonId === null
                        ? "border-ice bg-ice/10 text-ice"
                        : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
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
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-[0.98] whitespace-nowrap ${
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

              <div>
                <label className="block text-xs text-ink-muted mb-1.5">Categoria</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      trigger("vibrate");
                      setSelectedCategory("all");
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-[0.98] ${
                      selectedCategory === "all"
                        ? "border-ice bg-ice/10 text-ice"
                        : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    Todas
                  </button>
                  {Object.values(CATEGORIES).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        trigger("vibrate");
                        setSelectedCategory(cat.id);
                      }}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-[0.98] ${
                        selectedCategory === cat.id
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                      }`}
                      style={{
                        borderColor: selectedCategory === cat.id ? cat.color : undefined,
                      }}
                    >
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-ink-muted mb-1.5">Tipo</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      trigger("vibrate");
                      setSelectedType("all");
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-[0.98] ${
                      selectedType === "all"
                        ? "border-ice bg-ice/10 text-ice"
                        : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    Todos
                  </button>
                  {DOCUMENT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => {
                        trigger("vibrate");
                        setSelectedType(type.id);
                      }}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-[0.98] ${
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

              <div>
                <label className="block text-xs text-ink-muted mb-1.5">Data de validade</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      trigger("vibrate");
                      setDateFilter("all");
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-[0.98] ${
                      dateFilter === "all"
                        ? "border-ice bg-ice/10 text-ice"
                        : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => {
                      trigger("vibrate");
                      setDateFilter("expiring");
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-[0.98] flex items-center gap-1 ${
                      dateFilter === "expiring"
                        ? "border-ice bg-ice/10 text-ice"
                        : "border-surface-border bg-surface text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    <Calendar size={12} />
                    Vencendo (7 dias)
                  </button>
                  <button
                    onClick={() => {
                      trigger("vibrate");
                      setDateFilter("expired");
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-all active:scale-[0.98] flex items-center gap-1 ${
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
            </div>
          )}
        </header>

        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <p className="text-sm text-ink-muted">
            {filteredDocs.length} documento{filteredDocs.length !== 1 ? "s" : ""}
            {hasActiveFilters && " (filtrado)"}
          </p>
          {hasActiveFilters && (
            <span className="text-xs text-ice">{filteredDocs.length} resultados</span>
          )}
        </div>

        <section className="px-5 pt-2 space-y-3">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-ink-muted">
                {searchQuery
                  ? "Nenhum documento encontrado para sua busca"
                  : hasActiveFilters
                  ? "Nenhum documento com os filtros selecionados"
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
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                ref={(el) => { cardRefs.current[doc.id!] = el; }}
              >
                <DocumentCard
                  document={doc}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              </div>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}