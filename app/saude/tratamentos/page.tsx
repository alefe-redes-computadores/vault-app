"use client";

import { useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, ChevronRight, Activity, Brain, Flame, HeartPulse, ShieldAlert, Pill, Stethoscope } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
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
  
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];

  const listaEnriquecida = useMemo(() => {
    return tratamentos.map(t => {
      // ✅ CORRIGIDO: usa apenas tratamento_ids
      const meds = medicamentos.filter(m => {
        if (!t.id) return false;
        return m.tratamento_ids && m.tratamento_ids.includes(t.id);
      });
      return { ...t, medicamentosCount: meds.length };
    });
  }, [tratamentos, medicamentos]);

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
              <p className="text-xs text-ink-muted">{tratamentos.length} em acompanhamento</p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-3">
          {listaEnriquecida.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-surface-border p-10 text-center">
              <p className="text-sm text-ink-muted">Nenhum tratamento cadastrado ainda.</p>
            </div>
          ) : (
            listaEnriquecida.map((t: any) => {
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
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Pill size={10} className="text-ice" /> {t.medicamentosCount} med(s)
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-ink-faint" />
                </motion.button>
              );
            })
          )}
          
          <Button variant="primary" fullWidth onClick={() => { trigger("vibrate"); router.push("/saude/tratamentos/novo"); }} className="mt-4">
            <Plus size={16} className="mr-2" /> Novo Tratamento
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}

export default function TratamentosPage() {
  return <Suspense fallback={<LoadingSkeleton />}><TratamentoListContent /></Suspense>;
}