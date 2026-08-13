"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Building2, Search, Plus, ChevronRight, 
  MapPin, Phone, Pill, DollarSign, TrendingUp, Calendar 
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function FarmaciasPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Buscas relacionais em tempo real via Dexie
  const farmacias = useLiveQuery(() => db.farmacias.toArray(), []) || [];
  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];
  const renovacoes = useLiveQuery(() => db.renovacoes.toArray(), []) || [];

  // Cruzando dados: medicamentos vinculados e cálculo analítico de preços por farmácia
  const farmaciasComAnalise = useMemo(() => {
    return farmacias.map((farmacia) => {
      // Medicamentos associados a esta farmácia
      const medsDaFarmacia = medicamentos.filter(
        (m: any) => m.farmacia_id === farmacia.id || m.farmacia?.toLowerCase() === farmacia.nome.toLowerCase()
      );

      const medIds = new Set(medsDaFarmacia.map((m: any) => m.id));

      // Renovações ligadas aos remédios desta farmácia
      const renovacoesDaFarmacia = renovacoes.filter((r: any) => medIds.has(r.medicamento_id));

      // Calcular o total gasto e média de preços
      let totalGasto = 0;
      let totalRenovacoesComPreco = 0;

      renovacoesDaFarmacia.forEach((r: any) => {
        if (typeof r.preco === "number" && r.preco > 0) {
          totalGasto += r.preco;
          totalRenovacoesComPreco++;
        }
      });

      const mediaPreco = totalRenovacoesComPreco > 0 ? totalGasto / totalRenovacoesComPreco : 0;

      return {
        ...farmacia,
        medicamentosCount: medsDaFarmacia.length,
        totalGasto,
        mediaPreco,
        renovacoesCount: renovacoesDaFarmacia.length,
      };
    });
  }, [farmacias, medicamentos, renovacoes]);

  const filteredFarmacias = farmaciasComAnalise.filter((f) =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    (f.endereco && f.endereco.toLowerCase().includes(search.toLowerCase()))
  );

  if (!farmacias) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-400">Vault Saúde</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">Farmácias e Custo de Retirada</h1>
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

        <section className="px-5 pt-5 space-y-3.5">
          {filteredFarmacias.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
                <Building2 size={24} />
              </div>
              <p className="text-sm font-medium text-ink-primary">Nenhuma farmácia cadastrada</p>
              <p className="mt-1 text-xs text-ink-muted">Cadastre farmácias para acompanhar histórico de preços e renovações.</p>
            </div>
          ) : (
            filteredFarmacias.map((farmacia) => (
              <motion.div
                key={farmacia.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { trigger("vibrate"); router.push(`/saude/farmacias/editar?id=${farmacia.id}`); }}
                className="flex w-full flex-col gap-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden cursor-pointer"
                style={{ borderLeft: "6px solid #F59E0B" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-ink-primary">{farmacia.nome}</p>
                      <div className="mt-0.5 space-y-0.5 text-xs text-ink-muted">
                        {farmacia.endereco && (
                          <p className="flex items-center gap-1 truncate">
                            <MapPin size={11} className="shrink-0 text-ink-faint" /> {farmacia.endereco}
                          </p>
                        )}
                        {farmacia.telefone && (
                          <p className="flex items-center gap-1">
                            <Phone size={11} className="shrink-0 text-ink-faint" /> {farmacia.telefone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-ink-faint self-center" />
                </div>

                {/* Bloco Analítico Relacional de Preços e Vínculos */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border/40">
                  <div className="rounded-xl bg-surface-raised/60 p-2.5">
                    <p className="text-[10px] uppercase font-mono text-ink-muted flex items-center gap-1">
                      <Pill size={11} className="text-ice" /> Medicamentos
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                      {farmacia.medicamentosCount} vinculado{farmacia.medicamentosCount !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="rounded-xl bg-surface-raised/60 p-2.5">
                    <p className="text-[10px] uppercase font-mono text-ink-muted flex items-center gap-1">
                      <DollarSign size={11} className="text-emerald-400" /> Total Histórico Gasto
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                      {farmacia.totalGasto > 0 ? `R$ ${farmacia.totalGasto.toFixed(2).replace(".", ",")}` : "Nenhum preço reg."}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          )}

          <div className="pt-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => { trigger("vibrate"); router.push("/saude/farmacias/novo"); }}
              className="flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
            >
              <Plus size={16} /> Cadastrar Nova Farmácia
            </Button>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
