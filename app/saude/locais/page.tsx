"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Plus, ChevronRight, Building2, Calendar } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useLocais } from "@/hooks/useLocais";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LocaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { locais } = useLocais();
  const renovacoes = useLiveQuery(() => db.renovacoes.toArray(), []) || [];

  const locaisEnriquecidos = useMemo(() => {
    if (!locais) return [];
    return locais.map((local: any) => {
      const historico = renovacoes.filter((r: any) => r.local_id === local.id);
      const ultimaRenovacao = historico.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];

      return { ...local, ultimaRenovacao };
    });
  }, [locais, renovacoes]);

  const filteredLocais = locaisEnriquecidos.filter((local: any) =>
    local.nome?.toLowerCase().includes(search.toLowerCase()) ||
    (local.endereco && local.endereco.toLowerCase().includes(search.toLowerCase()))
  );

  if (!locais) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { trigger("vibrate"); router.back(); }} 
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">Vault Saúde</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">Clínicas e Postos</h1>
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
        </header>

        <section className="px-5 pt-5 space-y-3">
          {filteredLocais.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-ice/10 text-ice">
                <Building2 size={24} />
              </div>
              <p className="text-sm font-medium text-ink-primary">Nenhum local encontrado</p>
              <p className="mt-1 text-xs text-ink-muted">Cadastre postos de saúde ou clínicas para gerenciar atendimentos.</p>
            </div>
          ) : (
            filteredLocais.map((local: any) => (
              <motion.div
                key={local.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { trigger("vibrate"); router.push(`/saude/locais/editar?id=${local.id}`); }}
                className="w-full rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm flex items-center justify-between cursor-pointer transition-all active:scale-[0.985] hover:bg-surface-raised/80"
                style={{ borderLeft: "6px solid #38BDF8" }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                    <Building2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-base text-ink-primary truncate">{local.nome}</p>
                    <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1.5 truncate">
                      <Calendar size={12} className="shrink-0 text-ink-faint" /> 
                      {local.ultimaRenovacao ? `Última renovação: ${local.ultimaRenovacao.data}` : "Nenhuma renovação recente"}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-faint" />
              </motion.div>
            ))
          )}

          <div className="pt-4">
            <Button 
              variant="primary"
              size="lg"
              fullWidth 
              onClick={() => { trigger("vibrate"); router.push("/saude/locais/novo"); }}
              className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
            >
              <Plus size={16} /> Cadastrar Novo Local
            </Button>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
