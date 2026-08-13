"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, FlaskConical, Search, Plus, Building2, 
  ChevronRight, Calendar, Activity, Brain, Flame, HeartPulse, ShieldAlert 
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

export default function ExamesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const exames = useLiveQuery(() => db.table("exames").toArray(), []) || [];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const vinculos = useLiveQuery(() => db.exame_tratamentos.toArray(), []) || [];
  const persons = useLiveQuery(() => db.persons.toArray(), []) || [];

  const tratamentoMap = useMemo(() => new Map(tratamentos.map(t => [t.id, t])), [tratamentos]);
  const personMap = useMemo(() => new Map(persons.map(p => [p.id, p.name])), [persons]);
  
  const vinculosMap = useMemo(() => {
    const map = new Map<string, string[]>();
    vinculos.forEach(v => {
      if (!map.has(v.exame_id)) map.set(v.exame_id, []);
      map.get(v.exame_id)!.push(v.tratamento_id);
    });
    return map;
  }, [vinculos]);

  const filteredExames = exames.filter((exame: any) => 
    exame.nome?.toLowerCase().includes(search.toLowerCase()) ||
    exame.laboratorio?.toLowerCase().includes(search.toLowerCase())
  );

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
        </header>

        <section className="px-5 pt-5 space-y-3">
          {filteredExames.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400"><FlaskConical size={24} /></div>
              <p className="text-sm font-medium text-ink-primary">Nenhum exame encontrado</p>
            </div>
          ) : (
            filteredExames.map((exame: any) => {
              const personName = personMap.get(exame.person_id);
              const tIds = vinculosMap.get(exame.id) || [];
              const primeiroTratamento = tIds.length > 0 ? tratamentoMap.get(tIds[0]) : null;
              const corTratamento = primeiroTratamento?.cor || "#10B981"; // Verde padrão se não tiver cor

              return (
                <motion.button
                  key={exame.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => { trigger("vibrate"); router.push(`/saude/exames/detalhes?id=${exame.id}`); }}
                  className="flex w-full items-start gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden"
                >
                  {/* BARRINHA LATERAL DINÂMICA PELA COR DO TRATAMENTO */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: corTratamento }} />

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-raised border border-surface-border/50 ml-1">
                    <FlaskConical size={20} className="text-emerald-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="truncate text-sm font-semibold text-ink-primary">{exame.nome}</p>
                      {personName && <span className="shrink-0 rounded-full border border-surface-border/50 bg-surface-raised px-2 py-0.5 text-[9px] font-semibold text-ink-muted uppercase tracking-wide">👤 {personName}</span>}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      {exame.laboratorio && <span className="flex items-center gap-1 truncate"><Building2 size={12} className="text-ink-faint" /> {exame.laboratorio}</span>}
                      {exame.data && <span className="flex items-center gap-1"><Calendar size={12} className="text-ink-faint" /> {exame.data}</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
                </motion.button>
              );
            })
          )}

          <div className="pt-4">
            <Button variant="primary" fullWidth onClick={() => { trigger("vibrate"); router.push("/saude/exames/novo"); }} className="flex items-center justify-center gap-2 shadow-lg shadow-emerald-400/10">
              <Plus size={16} /> Cadastrar Novo Exame
            </Button>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
