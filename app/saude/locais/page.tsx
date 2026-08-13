"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Search, Plus, ChevronRight, MapPin, Calendar, FileText 
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function LocaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Usando Dexie direto para garantir reatividade total
  const locais = useLiveQuery(() => db.table("locais").toArray(), []) || [];
  const renovacoes = useLiveQuery(() => db.table("renovacoes").toArray(), []) || [];

  const locaisEnriquecidos = useMemo(() => {
    if (!locais) return [];
    return locais.map((local: any) => {
      // Puxa o histórico de retiradas/renovações neste local
      const historico = renovacoes.filter((r: any) => r.local_id === local.id);
      
      // Ordena para pegar a mais recente
      const ultimaRenovacao = historico.sort((a: any, b: any) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )[0];

      return { 
        ...local, 
        historicoCount: historico.length,
        ultimaRenovacao 
      };
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
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
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
        </header>

        <section className="px-5 pt-5 space-y-3">
          {filteredLocais.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                <MapPin size={24} />
              </div>
              <p className="text-sm font-medium text-ink-primary">Nenhum local encontrado</p>
              <p className="mt-1 text-xs text-ink-muted">Cadastre postos do SUS ou clínicas para gerenciar retiradas e atendimentos.</p>
            </div>
          ) : (
            filteredLocais.map((local: any) => (
              <motion.div
                key={local.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { trigger("vibrate"); router.push(`/saude/locais/detalhes?id=${local.id}`); }}
                className="flex w-full items-start gap-3.5 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden cursor-pointer"
                style={{ borderLeft: "6px solid #34d399" }} // emerald-400
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-raised border border-surface-border/50 ml-1">
                  <MapPin size={22} className="text-emerald-400" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base text-ink-primary truncate">{local.nome}</p>
                  
                  {local.endereco && (
                    <p className="text-xs text-ink-muted mt-1 truncate">
                      {local.endereco}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {local.historicoCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-raised text-ink-muted border border-surface-border/40">
                        <FileText size={11} className="text-amber-400" /> {local.historicoCount} registro(s)
                      </span>
                    )}

                    {local.ultimaRenovacao && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-raised text-ink-muted border border-surface-border/40">
                        <Calendar size={11} className="text-ice" /> Última: {formatDateDisplay(local.ultimaRenovacao.data)}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight size={16} className="mt-2 shrink-0 text-ink-faint" />
              </motion.div>
            ))
          )}

          <div className="pt-4">
            <Button 
              variant="primary"
              size="lg"
              fullWidth 
              onClick={() => { trigger("vibrate"); router.push("/saude/locais/novo"); }}
              className="flex items-center justify-center gap-2 shadow-lg shadow-emerald-400/10 bg-emerald-500 text-void border-none hover:bg-emerald-400"
            >
              <Plus size={16} /> Cadastrar Novo Local
            </Button>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
