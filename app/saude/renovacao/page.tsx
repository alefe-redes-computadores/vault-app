// app/saude/renovacao/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  FileWarning,
  Pill,
  Filter,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { isReceitaVencidaSegura } from "@/lib/health-insights";
import { getDaysUntil, getClinicalTheme } from "@/lib/health-utils";
import {
  ListPageHeader,
  ListSearch,
  ListFilters,
  ListCard,
} from "@/components/list";
import type { Renovacao, Medicamento } from "@/lib/types";

/* ============================================================
   HELPERS
   ============================================================ */

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(value: number | string): string {
  const numericValue = Number(value);
  if (isNaN(numericValue)) return "R$ 0,00";
  return `R$ ${numericValue.toFixed(2).replace(".", ",")}`;
}

type RenovacaoEnriquecida = Renovacao & {
  medicamentoNome: string;
  medicamentoDosagem: string;
  vencida: boolean;
  diasRestantes: number | null;
};

/* ============================================================
   PÁGINA
   ============================================================ */

export default function RenovacoesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { activePersonId } = useActivePersonId();
  const [search, setSearch] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "30dias" | "60dias">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "vencida" | "valida">("todos");

  const { renovacoes: rawRenovacoes } = useRenovacoes();
  const { medicamentos: rawMedicamentos } = useMedicamentos();
  const renovacoes = rawRenovacoes ?? [];
  const medicamentos = rawMedicamentos ?? [];

  const medicamentoMap = useMemo(
    () => new Map(medicamentos.map((m) => [m.id, m])),
    [medicamentos]
  );

  const renovacoesEnriquecidas = useMemo<RenovacaoEnriquecida[]>(() => {
    const renovacoesFiltradas = renovacoes.filter((r) => {
      return !activePersonId || !r.person_id || r.person_id === activePersonId;
    });

    return renovacoesFiltradas.map((r) => {
      const med = medicamentoMap.get(r.medicamento_id);

      const vencida = med?.proxima_renovacao
        ? isReceitaVencidaSegura(med.proxima_renovacao)
        : false;
      const diasRestantes = med?.proxima_renovacao
        ? getDaysUntil(med.proxima_renovacao)
        : null;

      return {
        ...r,
        medicamentoNome: med?.nome || "Medicamento não encontrado",
        medicamentoDosagem: med?.dosagem || "",
        vencida,
        diasRestantes,
      };
    });
  }, [renovacoes, medicamentoMap, activePersonId]);

  const filteredRenovacoes = useMemo(() => {
    let result = renovacoesEnriquecidas;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.medicamentoNome.toLowerCase().includes(term) ||
          (r.observacoes && r.observacoes.toLowerCase().includes(term))
      );
    }

    if (filtroPeriodo === "30dias") {
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      result = result.filter((r) => r.data && new Date(r.data) >= trintaDiasAtras);
    } else if (filtroPeriodo === "60dias") {
      const sessentaDiasAtras = new Date();
      sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);
      result = result.filter((r) => r.data && new Date(r.data) >= sessentaDiasAtras);
    }

    if (filtroStatus === "vencida") {
      result = result.filter((r) => r.vencida);
    } else if (filtroStatus === "valida") {
      result = result.filter((r) => !r.vencida);
    }

    return result.sort((a, b) => {
      let dateA = 0;
      let dateB = 0;

      if (a.data) {
        dateA = a.data.includes("/")
          ? new Date(a.data.split("/").reverse().join("-")).getTime()
          : new Date(a.data).getTime();
      }
      if (b.data) {
        dateB = b.data.includes("/")
          ? new Date(b.data.split("/").reverse().join("-")).getTime()
          : new Date(b.data).getTime();
      }

      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });
  }, [renovacoesEnriquecidas, search, filtroPeriodo, filtroStatus]);

  const handleClearFilters = () => {
    trigger("vibrate");
    setFiltroPeriodo("todos");
    setFiltroStatus("todos");
  };

  if (!rawRenovacoes && renovacoes.length === 0) return <CardListSkeleton />;

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Histórico de Renovações"
          badgeLabel="HISTÓRICO FINANCEIRO"
          badgeColor="text-ice"
        >
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar por medicamento ou notas..."
          />

          <ListFilters onClear={handleClearFilters}>
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroPeriodo(filtroPeriodo === "30dias" ? "todos" : "30dias");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroPeriodo === "30dias"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Últimos 30 dias
            </button>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroPeriodo(filtroPeriodo === "60dias" ? "todos" : "60dias");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroPeriodo === "60dias"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Últimos 60 dias
            </button>

            <div className="w-px h-5 bg-surface-border/40 mx-1" />

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroStatus(filtroStatus === "vencida" ? "todos" : "vencida");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "vencida"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Receita Vencida
            </button>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setFiltroStatus(filtroStatus === "valida" ? "todos" : "valida");
              }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "valida"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Receita Válida
            </button>
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {filteredRenovacoes.length === 0 ? (
            <EmptyState
              icon={FileWarning}
              title="Nenhuma renovação encontrada"
              description={
                search || filtroPeriodo !== "todos" || filtroStatus !== "todos"
                  ? "Tente ajustar os filtros aplicados."
                  : "Registre receitas renovadas para acompanhar custos e validades."
              }
            />
          ) : (
            filteredRenovacoes.map((renovacao, index) => {
              const theme = getClinicalTheme(renovacao.medicamentoNome);
              const borderColor = renovacao.vencida ? "#EF4444" : theme.hex;

              return (
                <ListCard
                  key={renovacao.id}
                  id={renovacao.id!}
                  color={borderColor}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`/saude/renovacao/detalhes?id=${renovacao.id}`);
                  }}
                  delay={index * 0.025}
                  icon={<Pill size={22} />}
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                      {renovacao.medicamentoNome}
                    </h3>
                    <span className="shrink-0 whitespace-nowrap text-xs font-mono font-medium text-emerald-400">
                      {renovacao.preco ? formatCurrency(renovacao.preco) : "SUS / Gratuito"}
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs text-ink-muted">{renovacao.medicamentoDosagem}</p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar size={12} className="text-ice" /> {formatDateDisplay(renovacao.data)}
                    </span>

                    {renovacao.vencida ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-coral/20 text-coral px-2 py-0.5 rounded-full border border-coral/30">
                        <AlertCircle size={10} /> Rec. Vencida
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-400/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-400/30">
                        <CheckCircle2 size={10} /> Rec. Válida
                      </span>
                    )}

                    {renovacao.diasRestantes !== null &&
                      !renovacao.vencida &&
                      renovacao.diasRestantes >= 0 && (
                        <span
                          className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            renovacao.diasRestantes <= 7
                              ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
                              : "bg-surface-raised text-ink-muted border border-surface-border/40"
                          }`}
                        >
                          <Clock size={10} /> Faltam {renovacao.diasRestantes} dias
                        </span>
                      )}

                    {renovacao.observacoes && (
                      <span className="truncate max-w-[150px] text-ink-muted flex items-center gap-1">
                        <MessageCircle size={11} className="shrink-0" />
                        {renovacao.observacoes}
                      </span>
                    )}
                  </div>
                </ListCard>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}