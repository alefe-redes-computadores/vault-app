"use client";

import { useMemo, Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, ChevronRight, Activity, Brain, Flame, HeartPulse, 
  ShieldAlert, Pill, Filter, X, DollarSign
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

function TratamentoListContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "concluido" | "suspenso">("todos");
  
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];
  const renovacoes = useLiveQuery(() => db.renovacoes.toArray(), []) || [];

  const listaEnriquecida = useMemo(() => {
    return tratamentos.map(t => {
      const meds = medicamentos.filter(m => {
        if (!t.id) return false;
        return m.tratamento_ids && m.tratamento_ids.includes(t.id);
      });
      
      // Custo total do tratamento (via renovações)
      const medIds = new Set(meds.map(m => m.id));
      let totalGasto = 0;
      renovacoes.forEach(r => {
        if (medIds.has(r.medicamento_id) && typeof r.preco === "number" && r.preco > 0) {
          totalGasto += r.preco;
        }
      });

      return { 
        ...t, 
        medicamentosCount: meds.length,
        totalGasto,
      };
    });
  }, [tratamentos, medicamentos, renovacoes]);

  const filteredList = useMemo(() => {
    let result = listaEnriquecida;
    if (filtroStatus !== "todos") {
      result = result.filter(t => t.status === filtroStatus);
    }
    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [listaEnriquecida, filtroStatus]);

  if (tratamentos === undefined) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Seus Tratamentos</h1>
              <p className="text-xs text-ink-muted">{filteredList.length} em acompanhamento</p>
            </div>
          </div>

          {/* 🔧 FILTROS */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Filter size={14} className="text-ink-muted" />
            
            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "ativo" ? "todos" : "ativo"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "ativo"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Em andamento
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "concluido" ? "todos" : "concluido"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "concluido"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Concluído
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "suspenso" ? "todos" : "suspenso"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "suspenso"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Suspenso
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

        <section className="px-5 pt-6 space-y-3">
          {filteredList.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-surface-border p-10 text-center">
              <p className="text-sm text-ink-muted">
                {filtroStatus !== "todos" 
                  ? "Nenhum tratamento com esse status." 
                  : "Nenhum tratamento cadastrado ainda."}
              </p>
            </div>
          ) : (
            filteredList.map((t: any) => {
              const IconComp = getTratamentoIcon(t.nome);
              const cor = t.cor || "#8B5CF6";
              return (
                <motion.button
                  key={t.id}
                  variants={fadeUp}
                  initial="initial"
                  animate="animate"
                  onClick={() => { trigger("vibrate"); router.push(`/saude/tratamentos/detalhes?id=${t.id}`); }}
                  className="relative w-full flex items-center gap-4 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm transition-all active:scale-[0.98] hover:bg-surface-raised overflow-hidden"
                  style={{ borderLeft: `6px solid ${cor}` }}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${cor}15`, color: cor }}>
                    <IconComp size={22} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-semibold text-ink-primary truncate">{t.nome}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Pill size={10} className="text-ice" /> {t.medicamentosCount} med(s)
                      </span>
                      {t.totalGasto > 0 && (
                        <span className="text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-md flex items-center gap-1">
                          <DollarSign size={10} className="text-emerald-400" /> R$ {t.totalGasto.toFixed(2).replace(".", ",")}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        t.status === "ativo" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" :
                        t.status === "concluido" ? "bg-ice/10 text-ice border border-ice/20" :
                        "bg-coral/10 text-coral border border-coral/20"
                      }`}>
                        {t.status === "ativo" ? "Ativo" : t.status === "concluido" ? "Concluído" : "Suspenso"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-ink-faint" />
                </motion.button>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}

export default function TratamentosPage() {
  return <Suspense fallback={<LoadingSkeleton />}><TratamentoListContent /></Suspense>;
}