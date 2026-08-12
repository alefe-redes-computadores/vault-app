"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  FlaskConical, 
  Search, 
  Plus, 
  Building2, 
  ChevronRight,
  Stethoscope,
  Calendar
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ExamesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Busca exames reais salvos no banco local Dexie
  const exames = useLiveQuery(() => db.table("exames").toArray(), []) || [];

  const filteredExames = exames.filter((exame: any) => 
    exame.nome?.toLowerCase().includes(search.toLowerCase()) ||
    exame.laboratorio?.toLowerCase().includes(search.toLowerCase())
  );

  if (!exames) {
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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">
                Vault
              </p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">
                Exames e Laudos
              </h1>
              <p className="text-xs text-ink-muted">
                {exames.length} exame{exames.length !== 1 ? "s" : ""} registrado{exames.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="relative mt-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Buscar por nome do exame ou laboratório..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9"
            />
          </div>
        </header>

        <section className="px-5 pt-5 space-y-3">
          {filteredExames.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                <FlaskConical size={24} />
              </div>
              <p className="text-sm font-medium text-ink-primary">Nenhum exame cadastrado</p>
              <p className="mt-1 text-xs text-ink-muted">Cadastre seus exames laboratoriais e resultados para cruzamento de dados.</p>
            </div>
          ) : (
            filteredExames.map((exame: any) => (
              <motion.button
                key={exame.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { trigger("vibrate"); router.push(`/saude/exames/detalhes?id=${exame.id}`); }}
                className="flex w-full items-center justify-between rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                    <FlaskConical size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-primary">{exame.nome}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      {exame.laboratorio && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 size={12} className="text-ink-faint" /> {exame.laboratorio}
                        </span>
                      )}
                      {exame.data && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-ink-faint" /> {exame.data}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-faint" />
              </motion.button>
            ))
          )}

          <div className="pt-4">
            <Button 
              variant="primary" 
              fullWidth 
              onClick={() => { trigger("vibrate"); router.push("/saude/exames/novo"); }}
              className="flex items-center justify-center gap-2 shadow-lg shadow-emerald-400/10"
            >
              <Plus size={16} /> Cadastrar Novo Exame
            </Button>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
