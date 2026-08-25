// app/saude/farmacias/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
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
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { analisarMelhorFarmacia } from "@/lib/health-insights";
import {
  ListPageHeader,
  ListSearch,
  ListFilters,
  ListCard,
} from "@/components/list";
import type { Farmacia, Medicamento, Renovacao } from "@/lib/types";

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

type RankingFarmacia = { farmacia_id: string; media_preco: number; total_compras: number };
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
      media_preco: item.media_preco,
      total_compras: item.total_compras,
    }));
  }, [renovacoes]);

  const rankingMap = useMemo(() => {
    const map = new Map<string, RankingFarmacia & { posicao: number }>();
    rankingFarmacias.forEach((r, index) => {
      map.set(r.farmacia_id, { ...r, posicao: index + 1 });
    });
    return map;
  }, [rankingFarmacias]);

  const farmaciasComAnalise = useMemo<FarmaciaComAnalise[]>(() => {
    return farmacias.map((farmacia) => {
      const medsDaFarmacia = medicamentos.filter((m: Medicamento) => m.farmacia_id === farmacia.id);
      const renovacoesDaFarmacia = renovacoes.filter((r: Renovacao) => r.farmacia_id === farmacia.id);
      
      const ultimaCompra = renovacoesDaFarmacia.length > 0
        ? [...renovacoesDaFarmacia].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0]
        : null;
        
      const ultimosMedicamentos = renovacoesDaFarmacia
        .slice()
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .map((r) => {
          const med = medicamentos.find((m) => m.id === r.medicamento_id);
          return med ? med.nome : null;
        })
        .filter((nome): nome is string => Boolean(nome));

      let totalGasto = renovacoesDaFarmacia.reduce((acc, r) => {
        if (typeof r.preco === "number" && r.preco > 0) return acc + r.preco;
        return acc;
      }, 0);

      medsDaFarmacia.forEach((m) => {
        if (typeof m.preco === "number" && m.preco > 0) {
          const jaTemRenovacaoIgual = renovacoesDaFarmacia.some(r => r.medicamento_id === m.id && r.preco === m.preco && (r.data === m.data_receita || r.data === m.estoque_data_referencia));
          if (!jaTemRenovacaoIgual) {
             totalGasto += m.preco;
             if (!ultimosMedicamentos.includes(m.nome)) {
               ultimosMedicamentos.push(m.nome);
             }
          }
        }
      });

      const estatisticaEconomia = rankingMap.get(farmacia.id!) || null;
      const isMaisEconomica = estatisticaEconomia?.posicao === 1;
      
      return {
        ...farmacia,
        medicamentosCount: medsDaFarmacia.length,
        totalGasto,
        estatisticaEconomia,
        isMaisEconomica,
        ultimaCompra,
        ultimosMedicamentos: ultimosMedicamentos.slice(0, 3),
      };
    });
  }, [farmacias, medicamentos, renovacoes, rankingMap]);

  const filteredFarmacias = useMemo(() => {
    let result = farmaciasComAnalise;
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (f) => f.nome.toLowerCase().includes(term) || (f.endereco && f.endereco.toLowerCase().includes(term))
      );
    }
    if (filtroStatus === "com_medicamentos") {
      result = result.filter((f) => f.medicamentosCount > 0);
    } else if (filtroStatus === "mais_economica") {
      result = result.filter((f) => f.isMaisEconomica);
    }
    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [farmaciasComAnalise, search, filtroStatus]);

  const handleClearFilters = () => {
    trigger("vibrate");
    setFiltroStatus("todos");
  };

  if (!farmacias && !medicamentos) return <CardListSkeleton />;

  const corBase = "#F59E0B";

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Farmácias"
          badgeLabel="Farmácias"
          badgeColor="text-amber-400"
          icon={<Store size={14} />}
          iconColor="text-amber-400"
        >
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome ou endereço..."
          />

          <ListFilters onClear={handleClearFilters}>
            <button
              type="button"
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "com_medicamentos" ? "todos" : "com_medicamentos"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "com_medicamentos"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Com Medicamentos
            </button>

            <button
              type="button"
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "mais_economica" ? "todos" : "mais_economica"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "mais_economica"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Mais Econômica
            </button>
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {filteredFarmacias.length === 0 ? (
            <EmptyState
              icon={Store}
              title="Nenhuma farmácia encontrada"
              description={
                search || filtroStatus !== "todos"
                  ? "Tente ajustar os filtros aplicados."
                  : "Cadastre farmácias para acompanhar histórico de preços e renovações."
              }
            />
          ) : (
            filteredFarmacias.map((farmacia, index) => {
              const cor = farmacia.isMaisEconomica ? "#34D399" : corBase;

              return (
                <ListCard
                  key={farmacia.id}
                  id={farmacia.id!}
                  color={cor}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`/saude/farmacias/detalhes?id=${farmacia.id}`);
                  }}
                  delay={index * 0.025}
                  icon={<Store size={22} />}
                  actions={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        trigger("vibrate");
                        router.push(`/saude/farmacias/editar?id=${farmacia.id}`);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-muted transition-colors hover:text-amber-400 active:scale-95"
                      aria-label={`Editar ${farmacia.nome}`}
                    >
                      <Edit3 size={14} />
                    </button>
                  }
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold uppercase text-ink-primary">
                      {farmacia.nome}
                    </h3>
                    {farmacia.isMaisEconomica && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-bold uppercase text-void">
                        <Award size={10} /> Melhor Preço
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-0.5 text-xs text-ink-muted">
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

                  {farmacia.ultimosMedicamentos.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-medium text-ink-muted uppercase tracking-wide">Últimas compras:</span>
                      {farmacia.ultimosMedicamentos.map((nome, idx) => (
                        <span key={idx} className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-surface-raised border border-surface-border/40 text-ink-muted max-w-[100px] truncate">
                          {nome}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-surface-border/40">
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
                </ListCard>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}