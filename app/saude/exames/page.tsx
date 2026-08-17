"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, FlaskConical, Search, Building2, 
  ChevronRight, Calendar, Filter, X, AlertTriangle, CheckCircle2, Clock
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Input } from "@/components/ui/Input";
import { useExames } from "@/hooks/useExames";
import { isReceitaVencidaSegura } from "@/lib/health-insights";
// 🧠 Importado para o cálculo exato do status 'próximo'
import { getDaysUntil } from "@/lib/health-utils";

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function ExamesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "vencido" | "valido" | "proximo">("todos");

  const { exames } = useExames();
  const persons = useLiveQuery(() => db.persons.toArray(), []) || [];

  const personMap = useMemo(() => new Map(persons.map(p => [p.id, p.name])), [persons]);

  const examesComStatus = useMemo(() => {
    return (exames || []).map((exame: any) => {
      const dias = exame.data_retorno ? getDaysUntil(exame.data_retorno) : null;
      const vencido = exame.data_retorno ? isReceitaVencidaSegura(exame.data_retorno) : false;
      const proximo = dias !== null && dias >= 0 && dias <= 7 && !vencido;
      
      return { ...exame, vencido, proximo };
    });
  }, [exames]);

  const filteredExames = useMemo(() => {
    let result = examesComStatus;

    if (search) {
      result = result.filter((exame: any) =>
        exame.nome?.toLowerCase().includes(search.toLowerCase()) ||
        exame.laboratorio?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filtroStatus === "vencido") {
      result = result.filter((exame: any) => exame.vencido);
    } else if (filtroStatus === "valido") {
      result = result.filter((exame: any) => !exame.vencido && !exame.proximo);
    } else if (filtroStatus === "proximo") {
      result = result.filter((exame: any) => exame.proximo);
    }

    return result.sort((a: any, b: any) => (b.data || "").localeCompare(a.data || ""));
  }, [examesComStatus, search, filtroStatus]);

  if (!exames) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">Exames e Laudos</h1>
            </div>
          </div>

          <div className="relative mt-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input placeholder="Buscar exame ou laboratório..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-surface-border/50 bg-surface-raised pl-9" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Filter size={14} className="text-ink-muted" />
            
            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "vencido" ? "todos" : "vencido"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "vencido"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Vencidos
            </button>
            
            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "proximo" ? "todos" : "proximo"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "proximo"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Próximos
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "valido" ? "todos" : "valido"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "valido"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Válidos
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
          {filteredExames.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400"><FlaskConical size={24} /></div>
              <p className="text-sm font-medium text-ink-primary">
                {search || filtroStatus !== "todos" ? "Nenhum exame encontrado com esses filtros." : "Nenhum exame cadastrado ainda."}
              </p>
            </div>
          ) : (
            filteredExames.map((exame: any) => {
              const personName = personMap.get(exame.person_id);
              return (
                <motion.button
                  key={exame.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => { trigger("vibrate"); router.push(`/saude/exames/detalhes?id=${exame.id}`); }}
                  className="flex w-full items-start gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: exame.vencido ? '#EF4444' : exame.proximo ? '#F59E0B' : '#10B981' }} />

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-raised border border-surface-border/50 ml-1">
                    <FlaskConical size={20} className="text-emerald-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="truncate text-sm font-semibold text-ink-primary">{exame.nome}</p>
                      {personName && <span className="shrink-0 rounded-full border border-surface-border/50 bg-surface-raised px-2 py-0.5 text-[9px] font-semibold text-ink-muted uppercase tracking-wide">👤 {personName}</span>}
                      {exame.vencido ? (
                        <span className="flex items-center gap-1 text-[8px] font-bold uppercase bg-coral/20 text-coral px-1.5 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> Vencido
                        </span>
                      ) : exame.proximo ? (
                        <span className="flex items-center gap-1 text-[8px] font-bold uppercase bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                          <Clock size={10} /> Próximo
                        </span>
                      ) : exame.data_retorno ? (
                        <span className="flex items-center gap-1 text-[8px] font-bold uppercase bg-emerald-400/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> Válido
                        </span>
                      ) : null}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      {exame.laboratorio && <span className="flex items-center gap-1 truncate"><Building2 size={12} className="text-ink-faint" /> {exame.laboratorio}</span>}
                      {exame.data && <span className="flex items-center gap-1"><Calendar size={12} className="text-ink-faint" /> {formatDateDisplay(exame.data)}</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
                </motion.button>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}
