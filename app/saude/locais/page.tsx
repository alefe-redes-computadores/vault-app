// app/saude/locais/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  ChevronRight,
  MapPin,
  Calendar,
  FileText,
  DollarSign,
  Filter,
  X,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/EmptyState";
import { useLocais } from "@/hooks/useLocais";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import type { LocalSaude, Renovacao } from "@/lib/types";

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

type LocalComHistorico = LocalSaude & {
  historicoCount: number;
  totalGasto: number;
  ultimaRenovacao: Renovacao | null;
};

export default function LocaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { activePersonId } = useActivePersonId();
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "com_registros" | "sem_registros">("todos");

  const { locais } = useLocais();
  const { renovacoes } = useRenovacoes();

  const personAccent = activePersonId ? 'var(--person-accent, #34D399)' : '#34D399';

  const locaisEnriquecidos = useMemo<LocalComHistorico[]>(() => {
    if (!locais || !renovacoes) return [];
    return locais.map((local) => {
      const historico = renovacoes.filter((r: Renovacao) => r.local_id === local.id);

      const totalGasto = historico.reduce((acc, r) => {
        if (typeof r.preco === "number" && r.preco > 0) {
          return acc + r.preco;
        }
        return acc;
      }, 0);

      const ultimaRenovacao = historico.length > 0
        ? [...historico].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0]
        : null;

      return {
        ...local,
        historicoCount: historico.length,
        totalGasto,
        ultimaRenovacao,
      };
    });
  }, [locais, renovacoes]);

  const filteredLocais = useMemo(() => {
    let result = locaisEnriquecidos;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (local) =>
          local.nome?.toLowerCase().includes(term) ||
          (local.endereco && local.endereco.toLowerCase().includes(term))
      );
    }

    if (filtroStatus === "com_registros") {
      result = result.filter((local) => local.historicoCount > 0);
    } else if (filtroStatus === "sem_registros") {
      result = result.filter((local) => local.historicoCount === 0);
    }

    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [locaisEnriquecidos, search, filtroStatus]);

  if (!locais || !renovacoes) return <CardListSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">Rede de Apoio</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">Postos e Locais</h1>
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
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "com_registros" ? "todos" : "com_registros"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "com_registros"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Com Registros
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "sem_registros" ? "todos" : "sem_registros"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "sem_registros"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Sem Registros
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

        <section className="px-5 pt-5 space-y-3">
          {filteredLocais.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Nenhum local encontrado"
              description={
                search || filtroStatus !== "todos"
                  ? "Tente ajustar os filtros aplicados."
                  : "Cadastre postos do SUS, laboratórios ou clínicas para acompanhar retiradas e atendimentos."
              }
            />
          ) : (
            filteredLocais.map((local) => (
              <motion.div
                key={local.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { trigger("vibrate"); router.push(`/saude/locais/detalhes?id=${local.id}`); }}
                className="flex w-full items-start gap-3.5 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden cursor-pointer"
                style={{ borderLeft: `6px solid ${local.historicoCount > 0 ? personAccent : "#6B7280"}` }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-raised border border-surface-border/50 ml-1">
                  <MapPin size={22} className={local.historicoCount > 0 ? "text-emerald-400" : "text-ink-muted"} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-base text-ink-primary truncate">{local.nome}</p>
                    {local.tipo && (
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border border-surface-border/40 bg-surface-raised text-ink-muted">
                        {local.tipo}
                      </span>
                    )}
                  </div>
                  {local.endereco && <p className="text-xs text-ink-muted mt-1 truncate">{local.endereco}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {local.historicoCount > 0 ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-raised text-ink-muted border border-surface-border/40">
                          <FileText size={11} className="text-amber-400" /> {local.historicoCount} registro(s)
                        </span>
                        {local.totalGasto > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-raised text-ink-muted border border-surface-border/40">
                            <DollarSign size={11} className="text-emerald-400" /> {formatCurrency(local.totalGasto)}
                          </span>
                        )}
                        {local.ultimaRenovacao && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-raised text-ink-muted border border-surface-border/40">
                            <Calendar size={11} className="text-ice" /> {formatDateDisplay(local.ultimaRenovacao.data)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-ink-muted">Sem registros</span>
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