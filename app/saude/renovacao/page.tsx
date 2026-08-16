"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Search, ChevronRight, Calendar, 
  DollarSign, FileWarning, Pill, Filter, X, Clock,
  AlertCircle, CheckCircle2
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Input } from "@/components/ui/Input";
import { isReceitaVencidaSegura } from "@/lib/health-insights";
import { getDaysUntil } from "@/lib/health-utils";

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export default function RenovacoesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "30dias" | "60dias">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "vencida" | "valida">("todos");

  const renovacoes = useLiveQuery(() => db.renovacoes.toArray(), []) || [];
  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];

  const medicamentoMap = useMemo(() => new Map(medicamentos.map((m: any) => [m.id, m])), [medicamentos]);

  const renovacoesEnriquecidas = useMemo(() => {
    return renovacoes.map((r: any) => {
      const med = medicamentoMap.get(r.medicamento_id);
      const vencida = isReceitaVencidaSegura(r.data); // usa data da renovação como referência
      const diasRestantes = getDaysUntil(r.data);
      return {
        ...r,
        medicamentoNome: med?.nome || "Medicamento não encontrado",
        medicamentoDosagem: med?.dosagem || "",
        vencida,
        diasRestantes,
      };
    });
  }, [renovacoes, medicamentoMap]);

  const filteredRenovacoes = useMemo(() => {
    let result = renovacoesEnriquecidas;

    // Busca
    if (search) {
      result = result.filter((r: any) =>
        r.medicamentoNome.toLowerCase().includes(search.toLowerCase()) ||
        (r.observacoes && r.observacoes.toLowerCase().includes(search.toLowerCase()))
      );
    }

    // Filtro por período
    if (filtroPeriodo === "30dias") {
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      result = result.filter((r: any) => new Date(r.data) >= trintaDiasAtras);
    } else if (filtroPeriodo === "60dias") {
      const sessentaDiasAtras = new Date();
      sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);
      result = result.filter((r: any) => new Date(r.data) >= sessentaDiasAtras);
    }

    // Filtro por status
    if (filtroStatus === "vencida") {
      result = result.filter((r: any) => r.vencida);
    } else if (filtroStatus === "valida") {
      result = result.filter((r: any) => !r.vencida);
    }

    // Ordenação (mais recente primeiro)
    return result.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [renovacoesEnriquecidas, search, filtroPeriodo, filtroStatus]);

  if (!renovacoes) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">Vault Saúde</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">Histórico de Renovações</h1>
            </div>
          </div>

          <div className="relative mt-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Buscar por medicamento ou notas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9"
            />
          </div>

          {/* 🔧 FILTROS */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Filter size={14} className="text-ink-muted" />
            
            <button
              onClick={() => { trigger("vibrate"); setFiltroPeriodo(filtroPeriodo === "30dias" ? "todos" : "30dias"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroPeriodo === "30dias"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Últimos 30 dias
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroPeriodo(filtroPeriodo === "60dias" ? "todos" : "60dias"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroPeriodo === "60dias"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Últimos 60 dias
            </button>

            <div className="w-px h-5 bg-surface-border/40 mx-1" />

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "vencida" ? "todos" : "vencida"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "vencida"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Vencidas
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "valida" ? "todos" : "valida"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "valida"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Válidas
            </button>

            {(filtroPeriodo !== "todos" || filtroStatus !== "todos") && (
              <button
                onClick={() => { trigger("vibrate"); setFiltroPeriodo("todos"); setFiltroStatus("todos"); }}
                className="text-[10px] font-medium text-coral bg-coral/10 px-2.5 py-1 rounded-full flex items-center gap-1"
              >
                <X size={12} /> Limpar
              </button>
            )}
          </div>
        </header>

        <section className="px-5 pt-5 space-y-3">
          {filteredRenovacoes.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-ice/10 text-ice">
                <FileWarning size={24} />
              </div>
              <p className="text-sm font-medium text-ink-primary">Nenhuma renovação encontrada</p>
              <p className="mt-1 text-xs text-ink-muted">
                {search || filtroPeriodo !== "todos" || filtroStatus !== "todos" 
                  ? "Tente ajustar os filtros aplicados." 
                  : "Registre receitas renovadas para acompanhar custos e validades."}
              </p>
            </div>
          ) : (
            filteredRenovacoes.map((renovacao: any) => (
              <motion.div
                key={renovacao.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/detalhes?id=${renovacao.id}`); }}
                className="flex w-full items-start gap-3.5 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden cursor-pointer"
                style={{ borderLeft: `6px solid ${renovacao.vencida ? '#EF4444' : '#38BDF8'}` }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-raised border border-surface-border/50 ml-1">
                  <Pill size={22} className={renovacao.vencida ? 'text-coral' : 'text-ice'} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-base font-semibold text-ink-primary">{renovacao.medicamentoNome}</p>
                    <span className="shrink-0 text-xs font-mono font-medium text-emerald-400">
                      {renovacao.preco ? formatCurrency(renovacao.preco) : "SUS / Gratuito"}
                    </span>
                  </div>

                  <p className="text-xs text-ink-muted mt-0.5">{renovacao.medicamentoDosagem}</p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar size={12} className="text-ice" /> {formatDateDisplay(renovacao.data)}
                    </span>
                    
                    {/* 🔧 Badge de status */}
                    {renovacao.vencida ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-coral/20 text-coral px-2 py-0.5 rounded-full border border-coral/30">
                        <AlertCircle size={10} /> Vencida
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-400/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-400/30">
                        <CheckCircle2 size={10} /> Válida
                      </span>
                    )}

                    {/* 🔧 Dias restantes */}
                    {renovacao.diasRestantes !== null && !renovacao.vencida && (
                      <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        renovacao.diasRestantes <= 7 
                          ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' 
                          : 'bg-surface-raised text-ink-muted border border-surface-border/40'
                      }`}>
                        <Clock size={10} /> {renovacao.diasRestantes} dias restantes
                      </span>
                    )}

                    {renovacao.observacoes && (
                      <span className="truncate max-w-[150px] text-ink-muted">
                        💬 {renovacao.observacoes}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight size={16} className="mt-2 shrink-0 text-ink-faint" />
              </motion.div>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}