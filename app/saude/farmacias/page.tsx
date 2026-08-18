// app/saude/farmacias/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Search,
  ChevronRight,
  MapPin,
  Phone,
  Pill,
  DollarSign,
  Edit3,
  Filter,
  X,
  Award,
  Clock,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/EmptyState";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { analisarMelhorFarmacia } from "@/lib/health-insights";
import type { Farmacia, Medicamento, Renovacao } from "@/lib/types";

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

type RankingFarmacia = {
  farmacia_id: string;
  media_preco: number;
  total_compras: number;
  economia_estimada?: number;
  percentual_economia?: number;
};

type FarmaciaComAnalise = Farmacia & {
  medicamentosCount: number;
  totalGasto: number;
  estatisticaEconomia: RankingFarmacia | null;
  isMaisEconomica: boolean;
  ultimaCompra: Renovacao | null;
  ultimosMedicamentos: string[];
};

export default function FarmaciasPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "com_medicamentos" | "mais_economica">("todos");

  const { farmacias = [] } = useFarmacias();
  const { medicamentos = [] } = useMedicamentos();
  const { renovacoes = [] } = useRenovacoes();

  const rankingFarmacias = useMemo<RankingFarmacia[]>(() => {
    const resultado = analisarMelhorFarmacia(renovacoes);
    return resultado.map((item) => ({
      farmacia_id: item.farmacia_id,
      media_preco: item.media,
      total_compras: item.total_compras,
    }));
  }, [renovacoes]);

  const rankingMap = useMemo(() => {
    const map = new Map<string, { posicao: number; farmacia_id: string; media_preco?: number }>();
    rankingFarmacias.forEach((r, index) => {
      map.set(r.farmacia_id, { ...r, posicao: index + 1 });
    });
    return map;
  }, [rankingFarmacias]);

  const farmaciasComAnalise = useMemo<FarmaciaComAnalise[]>(() => {
    return farmacias.map((farmacia) => {
      const medsDaFarmacia = medicamentos.filter((m: Medicamento) => m.farmacia_id === farmacia.id);
      const medIds = new Set(medsDaFarmacia.map((m) => m.id));

      const renovacoesDaFarmacia = renovacoes.filter((r: Renovacao) => medIds.has(r.medicamento_id));

      const ultimaCompra = renovacoesDaFarmacia.length > 0
        ? [...renovacoesDaFarmacia].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0]
        : null;

      const ultimosMedicamentos = renovacoesDaFarmacia
        .slice()
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 3)
        .map((r) => {
          const med = medicamentos.find((m) => m.id === r.medicamento_id);
          return med ? med.nome : null;
        })
        .filter((nome): nome is string => Boolean(nome));

      const totalGasto = renovacoesDaFarmacia.reduce((acc, r) => {
        if (typeof r.preco === "number" && r.preco > 0) {
          return acc + r.preco;
        }
        return acc;
      }, 0);

      const estatisticaEconomia = rankingMap.get(farmacia.id!) || null;
      const isMaisEconomica = estatisticaEconomia?.posicao === 1;

      return {
        ...farmacia,
        medicamentosCount: medsDaFarmacia.length,
        totalGasto,
        estatisticaEconomia,
        isMaisEconomica,
        ultimaCompra,
        ultimosMedicamentos,
      };
    });
  }, [farmacias, medicamentos, renovacoes, rankingMap]);

  const filteredFarmacias = useMemo(() => {
    let result = farmaciasComAnalise;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.nome.toLowerCase().includes(term) ||
          (f.endereco && f.endereco.toLowerCase().includes(term))
      );
    }

    if (filtroStatus === "com_medicamentos") {
      result = result.filter((f) => f.medicamentosCount > 0);
    } else if (filtroStatus === "mais_economica") {
      result = result.filter((f) => f.isMaisEconomica);
    }

    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [farmaciasComAnalise, search, filtroStatus]);

  if (!farmacias.length && !medicamentos.length && !renovacoes.length) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-400">Vault Saúde</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">Farmácias e Custo de Retirada</h1>
            </div>
          </div>

          <div className="relative mt-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Buscar por nome ou endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Filter size={14} className="text-ink-muted" />

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "com_medicamentos" ? "todos" : "com_medicamentos"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "com_medicamentos"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Com Medicamentos
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "mais_economica" ? "todos" : "mais_economica"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "mais_economica"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Mais Econômica
            </button>

            {filtroStatus !== "todos" && (
              <button
                onClick={() => { trigger("vibrate"); setFiltroStatus("todos"); }}
                className="text-[10px] font-medium text-coral bg-coral/10 px-2.5 py-1 rounded-full flex items-center gap-1"
              >
                <X size={12} /> Limpar
              </button>
            )}
          </div>
        </header>

        <section className="px-5 pt-5 space-y-3.5">
          {filteredFarmacias.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhuma farmácia encontrada"
              description={
                search || filtroStatus !== "todos"
                  ? "Tente ajustar os filtros aplicados."
                  : "Cadastre farmácias para acompanhar histórico de preços e renovações."
              }
              actionLabel="Nova Farmácia"
              onAction={() => router.push("/saude/farmacias/novo")}
            />
          ) : (
            filteredFarmacias.map((farmacia) => (
              <motion.div
                key={farmacia.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { trigger("vibrate"); router.push(`/saude/farmacias/detalhes?id=${farmacia.id}`); }}
                className="flex w-full flex-col gap-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden cursor-pointer"
                style={{ borderLeft: `6px solid ${farmacia.isMaisEconomica ? '#34D399' : '#F59E0B'}` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400 relative">
                      <Building2 size={20} />
                      {farmacia.isMaisEconomica && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 text-void shadow">
                          <DollarSign size={9} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-base font-semibold text-ink-primary">{farmacia.nome}</p>
                        {farmacia.isMaisEconomica && (
                          <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                            <Award size={10} /> Melhor Preço
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 space-y-0.5 text-xs text-ink-muted">
                        {farmacia.endereco && (
                          <p className="flex items-center gap-1 truncate">
                            <MapPin size={11} className="shrink-0 text-ink-faint" /> {farmacia.endereco}
                          </p>
                        )}
                        {farmacia.telefone && (
                          <p className="flex items-center gap-1">
                            <Phone size={11} className="shrink-0 text-ink-faint" /> {farmacia.telefone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        trigger("vibrate");
                        router.push(`/saude/farmacias/editar?id=${farmacia.id}`);
                      }}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-muted hover:text-amber-400 transition-colors"
                      aria-label="Editar farmácia"
                    >
                      <Edit3 size={14} />
                    </button>
                    <ChevronRight size={16} className="text-ink-faint" />
                  </div>
                </div>

                {farmacia.ultimosMedicamentos.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-medium text-ink-muted uppercase tracking-wide">Últimas compras:</span>
                    {farmacia.ultimosMedicamentos.map((nome, idx) => (
                      <span key={idx} className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-surface-raised border border-surface-border/40 text-ink-muted">
                        {nome}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border/40">
                  <div className="rounded-xl bg-surface-raised/60 p-2.5">
                    <p className="text-[10px] uppercase font-mono text-ink-muted flex items-center gap-1">
                      <Pill size={11} className="text-ice" /> Medicamentos
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                      {farmacia.medicamentosCount} vinculado{farmacia.medicamentosCount !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="rounded-xl bg-surface-raised/60 p-2.5">
                    <p className="text-[10px] uppercase font-mono text-ink-muted flex items-center gap-1">
                      <DollarSign size={11} className="text-emerald-400" /> Total Gasto
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                      {farmacia.totalGasto > 0 ? `R$ ${farmacia.totalGasto.toFixed(2).replace(".", ",")}` : "R$ 0,00"}
                    </p>
                  </div>
                </div>

                {farmacia.ultimaCompra && (
                  <div className="flex items-center gap-1.5 text-[10px] text-ink-muted pt-1 border-t border-surface-border/30">
                    <Clock size={12} className="text-ink-faint" />
                    Última compra: {formatDateDisplay(farmacia.ultimaCompra.data)}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}