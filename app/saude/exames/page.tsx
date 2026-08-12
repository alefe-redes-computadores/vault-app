"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  FlaskConical, 
  Search, 
  Plus, 
  Building2, 
  ChevronRight,
  Filter
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";

// Exemplo de estrutura de dados (isso virá do seu Dexie na próxima fase)
const EXAMES_MOCK = [
  { id: "1", nome: "Hemograma Completo", lab: "Sabin", data: "2026-08-01", status: "Normal" },
  { id: "2", nome: "Glicemia de Jejum", lab: "Sabin", data: "2026-07-15", status: "Alerta" },
];

export default function ExamesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-display text-xl font-semibold text-ink-primary">Exames e Laudos</h1>
              <p className="text-xs text-ink-muted">Histórico de laboratoriais</p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          {EXAMES_MOCK.map((exame) => (
            <motion.button
              key={exame.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => { trigger("vibrate"); router.push(`/saude/exames/detalhes?id=${exame.id}`); }}
              className="flex w-full items-center justify-between rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm active:scale-[0.985]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                  <FlaskConical size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-primary">{exame.nome}</p>
                  <p className="text-xs text-ink-muted flex items-center gap-1">
                    <Building2 size={10} /> {exame.lab} • {exame.data}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-ink-faint" />
            </motion.button>
          ))}

          <Button 
            variant="primary" 
            fullWidth 
            onClick={() => { trigger("vibrate"); router.push("/saude/exames/novo"); }}
            className="mt-6 flex items-center gap-2"
          >
            <Plus size={16} /> Cadastrar Novo Exame
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}
