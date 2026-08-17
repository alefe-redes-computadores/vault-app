"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Brain, 
  ChevronRight, 
  HeartPulse, 
  Flame, 
  Activity 
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Input } from "@/components/ui/Input";
import { useCids } from "@/hooks/useCids";
import { getCidInsights } from "@/lib/health-insights";

const listVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function CidsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { cids } = useCids();
  const [search, setSearch] = useState("");

  const filteredCids = useMemo(() => {
    if (!cids) return [];
    const lowerSearch = search.toLowerCase();
    return cids.filter(
      (c) =>
        c.descricao.toLowerCase().includes(lowerSearch) ||
        c.codigo.toLowerCase().includes(lowerSearch)
    );
  }, [cids, search]);

  if (!cids) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Base de CIDs</h1>
              <p className="text-xs text-ink-muted">Diagnósticos registrados</p>
            </div>
          </div>

          <div className="mt-6 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Buscar por código ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-surface-raised"
            />
          </div>
        </header>

        <section className="px-5 pt-6">
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
            <AnimatePresence>
              {filteredCids.map((cid) => {
                const insight = getCidInsights(cid.codigo);
                return (
                  <motion.button
                    key={cid.id}
                    variants={cardVariants}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/cids/detalhes?id=${cid.id}`); }}
                    className="w-full flex items-center justify-between p-4 rounded-[24px] border border-surface-border/50 bg-surface shadow-sm hover:border-ice/30 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-raised border border-surface-border/50">
                        <Brain size={20} className="text-ice" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-semibold text-ink-primary truncate">{cid.descricao}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-ice bg-ice/10 px-1.5 py-0.5 rounded-md">
                            {cid.codigo}
                          </span>
                          <span className="text-[10px] text-ink-muted truncate">{insight.categoria}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-ink-faint ml-2 shrink-0" />
                  </motion.button>
                );
              })}
            </AnimatePresence>

            {filteredCids.length === 0 && (
              <div className="text-center py-20">
                <p className="text-ink-muted text-sm">Nenhum CID encontrado.</p>
              </div>
            )}
          </motion.div>
        </section>

        {/* Botão Flutuante de Novo */}
        <button
          onClick={() => { trigger("vibrate"); router.push("/saude/cids/novo"); }}
          className="fixed bottom-8 right-5 h-14 w-14 rounded-full bg-ice text-void shadow-lg shadow-ice/20 flex items-center justify-center active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </main>
    </PageTransition>
  );
}
