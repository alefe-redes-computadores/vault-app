"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Plus, ChevronRight, Building2, Calendar, FileWarning } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LocaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const locais = useLiveQuery(() => db.table("locais").toArray(), []) || [];
  const renovacoes = useLiveQuery(() => db.renovacoes.toArray(), []) || [];

  const locaisEnriquecidos = useMemo(() => {
    return locais.map((local: any) => {
      // Cruza com renovações realizadas neste local (assumindo que salvamos farmacia_id ou local_id)
      const historico = renovacoes.filter((r: any) => r.local_id === local.id);
      const ultimaRenovacao = historico.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];

      return { ...local, ultimaRenovacao };
    });
  }, [locais, renovacoes]);

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Clínicas e Postos</h1>
            </div>
          </div>
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="mt-4 bg-surface-raised" />
        </header>

        <section className="px-5 pt-5 space-y-3">
          {locaisEnriquecidos.map((local: any) => (
            <motion.button
              key={local.id}
              onClick={() => router.push(`/saude/locais/detalhes?id=${local.id}`)}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface p-4 text-left shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="font-semibold">{local.nome}</p>
                <p className="text-xs text-ink-muted mt-1 flex items-center gap-1">
                  <Calendar size={12} /> {local.ultimaRenovacao ? `Última renovação: ${local.ultimaRenovacao.data}` : "Sem renovações"}
                </p>
              </div>
              <ChevronRight size={16} />
            </motion.button>
          ))}
          <Button fullWidth onClick={() => router.push("/saude/locais/novo")}>
            <Plus size={16} className="mr-2" /> Cadastrar Local
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}
