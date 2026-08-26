// app/saude/medicamentos/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pill,
  Circle,
  Droplet,
  Syringe,
  StickyNote,
  Calendar,
  Zap,
  EyeOff,
  Eye,
  FileWarning,
  Store,
  Building2,
  Stethoscope,
} from "lucide-react";

import { useMedicamentos } from "@/hooks/useMedicamentos";
import { usePersons } from "@/hooks/usePersons";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  computeEstoqueInfo,
  getDaysUntil,
} from "@/lib/health-utils";
import {
  sugerirRenovacao,
  isReceitaVencidaSegura,
} from "@/lib/health-insights";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Medicamento, Person } from "@/lib/types";
import { QuickDoseModal } from "@/components/saude/QuickDoseModal";

// Componentes de listagem
import {
  ListPageHeader,
  ListSearch,
  ListSort,
  ListFilters,
  ListCard,
} from "@/components/list";

/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

const FORMATOS = [
  { id: "inteiro", label: "Inteiro", icon: Circle },
  { id: "comprimido", label: "Comprimido", icon: Pill },
  { id: "partido", label: "Partido", icon: Pill },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gota", icon: Droplet },
  { id: "gotas", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
] as const;

type SortOption = "urgency" | "renewal" | "name";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "urgency", label: "Urgência" },
  { value: "renewal", label: "Renovação" },
  { value: "name", label: "Nome" },
];

/* ============================================================
   HELPERS
   ============================================================ */

function formatDate(date?: string) {
  if (!date) return null;
  try {
    return format(new Date(date), "dd MMM", { locale: ptBR });
  } catch {
    return null;
  }
}

function getTratamentoStyle(nome: string, cor?: string) {
  if (cor) {
    return {
      backgroundColor: `${cor}18`,
      borderColor: `${cor}38`,
      color: cor,
    };
  }
  const n = (nome || "").toLowerCase();
  if (n.includes("tdah")) {
    return {
      backgroundColor: "rgb(16 185 129 / 0.10)",
      borderColor: "rgb(16 185 129 / 0.20)",
      color: "rgb(52 211 153)",
    };
  }
  if (n.includes("dor")) {
    return {
      backgroundColor: "rgb(255 107 107 / 0.10)",
      borderColor: "rgb(255 107 107 / 0.20)",
      color: "var(--color-coral, #ff6b6b)",
    };
  }
  if (n.includes("depress")) {
    return {
      backgroundColor: "rgb(59 130 246 / 0.10)",
      borderColor: "rgb(59 130 246 / 0.20)",
      color: "rgb(96 165 250)",
    };
  }
  if (n.includes("ansied")) {
    return {
      backgroundColor: "rgb(251 191 36 / 0.10)",
      borderColor: "rgb(251 191 36 / 0.20)",
      color: "rgb(251 191 36)",
    };
  }
  return {
    backgroundColor: "rgb(139 92 246 / 0.10)",
    borderColor: "rgb(139 92 246 / 0.20)",
    color: "rgb(167 139 250)",
  };
}

// 🛡️ NOVO HELPER: Cores exatas para cada tipo de receita
function getReceitaBadgeProps(tipo?: string) {
  if (!tipo || tipo === "comum") return null;

  const map: Record<string, { label: string; colorClass: string }> = {
    amarela: { label: "Receita Amarela", colorClass: "border-amber-400/30 bg-amber-400/10 text-amber-400" },
    azul: { label: "Receita Azul", colorClass: "border-blue-400/30 bg-blue-400/10 text-blue-400" },
    branca_controle: { label: "Receita Branca (C)", colorClass: "border-slate-300/30 bg-slate-400/10 text-slate-300" },
    branca: { label: "Receita Branca", colorClass: "border-slate-300/30 bg-slate-400/10 text-slate-300" },
    especial: { label: "Receita Especial", colorClass: "border-purple-400/30 bg-purple-400/10 text-purple-400" },
  };

  return map[tipo] || { label: "Controlado", colorClass: "border-blue-400/30 bg-blue-400/10 text-blue-400" };
}

/* ============================================================
   PÁGINA
   ============================================================ */

export default function MedicamentosListPage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();

  const { medicamentos: medicamentosTodas } = useMedicamentos();
  const { activePersonId } = useActivePersonId();
  const persons = usePersons() as Person[];
  const { tratamentos = [] } = useTratamentos();

  const [searchQuery, setSearchQuery] = useState("");
  const [showDescontinuados, setShowDescontinuados] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("urgency");
  const [quickDoseMedId, setQuickDoseMedId] = useState<string | null>(null);

  /* ============================================================
     DADOS PROCESSADOS
     ============================================================ */

  const medicamentos = useMemo(() => {
    if (!activePersonId) return [];
    return (medicamentosTodas || []).filter(
      (medicamento) => medicamento.person_id === activePersonId
    );
  }, [medicamentosTodas, activePersonId]);

  const tratamentoMap = useMemo(() => {
    const map = new Map<string, { nome: string; cor?: string }>();
    (tratamentos || []).forEach((tratamento) => {
      if (tratamento.id) map.set(tratamento.id, { nome: tratamento.nome, cor: tratamento.cor });
    });
    return map;
  }, [tratamentos]);

  const activePerson = (persons || []).find((p) => p.id === activePersonId);
  const activePersonColor = activePerson?.color || "#38BDF8";

  const filteredAndSorted = useMemo(() => {
    if (!medicamentos) return [];
    let list = [...medicamentos];

    if (!showDescontinuados) {
      list = list.filter((med) => med.status !== "descontinuado");
    }

    const query = searchQuery.toLowerCase().trim();
    if (query) {
      list = list.filter((med) => {
        const nome = med.nome?.toLowerCase() || "";
        const medico = med.medico?.toLowerCase() || "";
        const farmacia = med.farmacia?.toLowerCase() || "";
        return nome.includes(query) || medico.includes(query) || farmacia.includes(query);
      });
    }

    return list.sort((a, b) => {
      if (sortBy === "name") {
        return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
      }
      if (sortBy === "renewal") {
        const aRenovacao = getDaysUntil(a.proxima_renovacao) ?? 9999;
        const bRenovacao = getDaysUntil(b.proxima_renovacao) ?? 9999;
        const aVencida = aRenovacao < 0;
        const bVencida = bRenovacao < 0;
        if (aVencida && !bVencida) return -1;
        if (!aVencida && bVencida) return 1;
        return aRenovacao - bRenovacao;
      }

      // Urgência
      const aVencida = isReceitaVencidaSegura(a.proxima_renovacao);
      const bVencida = isReceitaVencidaSegura(b.proxima_renovacao);
      if (aVencida && !bVencida) return -1;
      if (!aVencida && bVencida) return 1;

      const isSOSA = a.tipo_uso !== "continuo";
      const isSOSB = b.tipo_uso !== "continuo";
      const estoqueA = isSOSA
        ? a.estoque_quantidade ?? 9999
        : computeEstoqueInfo(a)?.quantidadeRestante ?? a.estoque_quantidade ?? 9999;
      const estoqueB = isSOSB
        ? b.estoque_quantidade ?? 9999
        : computeEstoqueInfo(b)?.quantidadeRestante ?? b.estoque_quantidade ?? 9999;
      const isCriticoA = estoqueA < 10;
      const isCriticoB = estoqueB < 10;
      if (isCriticoA && !isCriticoB) return -1;
      if (!isCriticoA && isCriticoB) return 1;

      const diasA = getDaysUntil(a.proxima_renovacao) ?? 9999;
      const diasB = getDaysUntil(b.proxima_renovacao) ?? 9999;
      return diasA - diasB;
    });
  }, [medicamentos, searchQuery, showDescontinuados, sortBy]);

  const handleSortChange = (value: string) => {
    trigger("vibrate");
    setSortBy(value as SortOption);
  };

  const handleToggleSuspensos = () => {
    trigger("vibrate");
    setShowDescontinuados((prev) => !prev);
  };

  if (medicamentosTodas === undefined) {
    return <CardListSkeleton />;
  }

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        {/* ===== HEADER ===== */}
        <ListPageHeader
          title="Meus medicamentos"
          subtitle={`${filteredAndSorted.length} ${filteredAndSorted.length === 1 ? "ativo" : "ativos"}`}
          rightAction={
            <button
              type="button"
              onClick={handleToggleSuspensos}
              aria-label={
                showDescontinuados
                  ? "Ocultar medicamentos suspensos"
                  : "Mostrar medicamentos suspensos"
              }
              aria-pressed={showDescontinuados}
              className={`
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-full
                border
                transition-all
                active:scale-95
                ${
                  showDescontinuados
                    ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }
              `}
            >
              {showDescontinuados ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          }
        >
          {/* Busca e ordenação */}
          <div className="flex items-center gap-2">
            <ListSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar remédio ou médico..."
            />
            <ListSort
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={handleSortChange}
            />
          </div>

          {/* Filtros adicionais */}
          <ListFilters
            onClear={
              showDescontinuados
                ? () => {
                    setShowDescontinuados(false);
                    trigger("vibrate");
                  }
                : undefined
            }
            clearLabel="Limpar"
          >
            {null}
          </ListFilters>
        </ListPageHeader>

        {/* ===== LISTA ===== */}
        <section className="space-y-3.5 px-5 pt-4">
          {filteredAndSorted.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="Nenhum medicamento encontrado"
              description={
                searchQuery.trim()
                  ? "Não encontramos medicamentos para essa busca."
                  : showDescontinuados
                    ? "Não há medicamentos suspensos cadastrados."
                    : "Cadastre um medicamento para começar a acompanhar seu tratamento."
              }
              actionLabel={searchQuery.trim() || showDescontinuados ? "Limpar filtros" : undefined}
              onAction={
                searchQuery.trim() || showDescontinuados
                  ? () => {
                      setSearchQuery("");
                      setShowDescontinuados(false);
                      trigger("vibrate");
                    }
                  : undefined
              }
            />
          ) : (
            filteredAndSorted.map((med, index) => {
              const isSOS = med.tipo_uso !== "continuo";
              const estoqueInfo = computeEstoqueInfo(med);
              
              const tratamentoIds = med.tratamento_ids || [];
              const isSuspenso = med.status === "descontinuado";
              
              // 🛡️ SUBSTITUIÇÃO: Tag Controlado pela Tag Específica da Receita
              const receitaBadge = getReceitaBadgeProps(med.tipo_receita);
              
              const insight = isSuspenso ? null : sugerirRenovacao(med);
              const receitaVencida = isReceitaVencidaSegura(med.proxima_renovacao);

              const formatoBanco = med.formato?.toLowerCase().trim() || "inteiro";
              const itemFormato = FORMATOS.find((f) => f.id === formatoBanco) || FORMATOS[0];
              const SelectedFormatIcon = itemFormato.icon;

              const cor1 = med.cores && med.cores.length > 0 ? med.cores[0] : "#60A5FA";
              const cardColor = activePersonColor || cor1;

              const dosesParaAcabar = estoqueInfo ? estoqueInfo.dosesRestantes : (med.estoque_quantidade ?? 0);
              const estoqueCritico = dosesParaAcabar > 0 && dosesParaAcabar < 10;
              const estoqueZerado = dosesParaAcabar <= 0;
              const temEstoque = med.estoque_quantidade !== undefined && med.estoque_quantidade !== null;

              // 🛡️ LÓGICA DE TEXTO DE EXIBIÇÃO APRIMORADA PARA ML E GOTAS
              let textoExibicao = estoqueInfo 
                ? estoqueInfo.textoEstoque 
                : temEstoque 
                  ? `${med.estoque_quantidade} ${med.estoque_unidade_medida || 'unidades'}` 
                  : "Sem estoque";

              // Se a unidade de medida do app estiver gravada como gota(s), converter o montante de gotas para mililitros.
              if (temEstoque && med.estoque_unidade_medida?.toLowerCase().includes("gota") && med.estoque_quantidade) {
                const gotas = med.estoque_quantidade;
                const gotasPorMl = med.estoque_gotas_por_ml || 20; // Default para 20 gotas = 1 ml
                const mlAprox = (gotas / gotasPorMl).toFixed(1).replace(".0", "");
                textoExibicao = `${mlAprox} ml (~${gotas} gotas)`;
              }

              return (
                <ListCard
                  key={med.id!}
                  id={med.id!}
                  color={cardColor}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`/saude/medicamentos/detalhes?id=${med.id}`);
                  }}
                  isDisabled={isSuspenso}
                  delay={index * 0.025}
                  icon={
                    <SelectedFormatIcon
                      size={24}
                      style={{ color: cor1 }}
                      strokeWidth={2.4}
                    />
                  }
                  actions={
                    <>
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`
                            truncate
                            text-[11px]
                            font-bold
                            ${estoqueZerado ? "text-coral" : estoqueCritico ? "text-amber-400" : "text-emerald-400"}
                          `}
                        >
                          {textoExibicao}
                        </span>

                        {temEstoque && !estoqueZerado && !isSuspenso && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              trigger("vibrate");
                              setQuickDoseMedId(med.id!);
                            }}
                            className="
                              flex shrink-0
                              items-center gap-1
                              rounded-lg
                              border border-emerald-500/30
                              bg-emerald-500/10
                              px-2.5 py-1
                              text-[10px]
                              font-bold
                              text-emerald-400
                              transition-all
                              hover:bg-emerald-500/20
                              active:scale-95
                            "
                          >
                            <Zap size={10} fill="currentColor" />
                            Tomar
                          </button>
                        )}
                      </div>

                      {!isSuspenso && (
                        <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              trigger("vibrate");
                              router.push(`/saude/renovacao/nova?medicamento_id=${med.id}`);
                            }}
                            className="
                              flex items-center
                              gap-1
                              px-2.5 py-1
                              text-[10px]
                              font-bold
                              text-ink-muted
                              transition-colors
                              hover:text-ink-primary
                              active:bg-surface-border
                            "
                          >
                            <Calendar
                              size={10}
                              className={insight?.urgencia === "alta" ? "text-coral" : "text-amber-400"}
                            />
                            Renovar
                          </button>

                          {med.proxima_renovacao && (
                            <span className="
                              border-l
                              border-surface-border
                              bg-surface
                              px-2 py-1
                              text-[9px]
                              font-bold
                              text-ink-muted
                              whitespace-nowrap
                            ">
                              {formatDate(med.proxima_renovacao)}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  }
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold uppercase text-ink-primary">
                      {med.nome}
                    </h3>
                    {med.dosagem && (
                      <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-ink-muted">
                        {med.dosagem}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {isSOS && (
                      <span className="flex shrink-0 items-center gap-0.5 rounded-md border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                        <Zap size={8} fill="currentColor" /> SOS
                      </span>
                    )}
                    {/* 🛡️ RENDER DA ETIQUETA DE RECEITA */}
                    {receitaBadge && (
                      <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase ${receitaBadge.colorClass}`}>
                        {receitaBadge.label}
                      </span>
                    )}
                    {receitaVencida && !isSuspenso && (
                      <span className="shrink-0 rounded-md border border-coral/20 bg-coral/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-coral">
                        Vencida
                      </span>
                    )}
                    {isSuspenso && (
                      <span className="shrink-0 rounded-md border border-coral/20 bg-coral/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-coral">
                        Suspenso
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="flex max-w-[170px] items-center gap-1.5 truncate text-xs font-medium text-ink-muted">
                      <Stethoscope size={11} className="shrink-0 text-ink-faint" />
                      <span className="truncate">{med.medico || "Médico não informado"}</span>
                    </p>
                    {med.farmacia && (
                      <span className="flex max-w-[140px] items-center gap-1 truncate border-l border-surface-border/60 pl-2 text-[10px] text-ink-muted">
                        <Store size={10} className="shrink-0 text-emerald-400/80" />
                        <span className="truncate">{med.farmacia}</span>
                      </span>
                    )}
                    {med.hospital_id && !med.farmacia && (
                      <span className="flex items-center gap-1 border-l border-surface-border/60 pl-2 text-[10px] text-ink-muted">
                        <Building2 size={10} className="text-violet-400/80" />
                        Hospital
                      </span>
                    )}
                  </div>

                  {tratamentoIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tratamentoIds.slice(0, 3).map((tratamentoId) => {
                        const tratamento = tratamentoMap.get(tratamentoId);
                        if (!tratamento) return null;
                        const style = getTratamentoStyle(tratamento.nome, tratamento.cor);
                        return (
                          <span
                            key={tratamentoId}
                            className="max-w-[100px] truncate rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                            style={style}
                          >
                            {tratamento.nome}
                          </span>
                        );
                      })}
                      {tratamentoIds.length > 3 && (
                        <span className="flex items-center text-[9px] font-medium text-ink-faint">
                          +{tratamentoIds.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {insight?.deveRenovar && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        trigger("vibrate");
                        router.push(`/saude/renovacao/nova?medicamento_id=${med.id}`);
                      }}
                      className={`
                        mt-3
                        flex w-fit
                        items-center gap-1.5
                        rounded-xl
                        border
                        px-2.5 py-1.5
                        text-[10px]
                        font-semibold
                        transition-all
                        active:scale-[0.98]
                        ${
                          insight.urgencia === "alta"
                            ? "border-coral/30 bg-coral/15 text-coral-200"
                            : "border-amber-400/30 bg-amber-400/15 text-amber-200"
                        }
                      `}
                    >
                      <FileWarning size={12} />
                      <span className="text-left">{insight.mensagem}</span>
                    </button>
                  )}
                </ListCard>
              );
            })
          )}
        </section>

        {/* ===== QUICK DOSE ===== */}
        <QuickDoseModal
          isOpen={!!quickDoseMedId}
          onClose={() => setQuickDoseMedId(null)}
          preselectedMedicamentoId={quickDoseMedId || undefined}
          onSuccess={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("sync:process"));
            }
          }}
        />
      </main>
    </PageTransition>
  );
}
